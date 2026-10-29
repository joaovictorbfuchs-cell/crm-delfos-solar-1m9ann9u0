// Helper para localizar ou criar conversa em whatsapp_conversas e vincular à mensagem WhatsApp
// Utilizado por todos os hooks de envio (manual, OS, proposta, automações, cron)

function ensureConversaForMessage(app, clienteId, telefoneDestino, previewTexto, atendenteUser) {
  try {
    const convCol = app.findCollectionByNameOrId('whatsapp_conversas')
    const nowIso = new Date().toISOString()
    const cleanPhone = (telefoneDestino || '').replace(/\D/g, '')
    const last8 = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone

    let conversaRecord = null

    // 1. Tentar buscar por cliente_id se fornecido
    if (clienteId) {
      try {
        const clientConvs = app.findRecordsByFilter(
          convCol.id,
          `cliente_id = '${clienteId}'`,
          '-updated',
          1,
          0,
        )
        if (clientConvs && clientConvs.length > 0) {
          conversaRecord = clientConvs[0]
        }
      } catch (_) {}
    }

    // 2. Se não achou por cliente_id e temos dígitos do telefone, buscar por número com critério estrito
    // (igualdade exata de dígitos com/sem 55 e com/sem 9º dígito).
    // NUNCA fazer fallback para phoneConvs[0] para não misturar números diferentes!
    const isLid = cleanPhone.length === 14 && !cleanPhone.startsWith('55')
    if (!conversaRecord && cleanPhone) {
      try {
        // Gerar variantes exatas válidas
        let nac = cleanPhone
        if (nac.startsWith('55') && (nac.length === 12 || nac.length === 13)) {
          nac = nac.slice(2)
        }
        if (nac.length === 8 || nac.length === 9) {
          nac = '54' + nac
        }

        const variantes = new Set()
        variantes.add(cleanPhone)
        if (nac) {
          variantes.add(nac)
          variantes.add('55' + nac)
        }
        if (nac.length === 10) {
          const ddd = nac.slice(0, 2)
          const resto8 = nac.slice(2)
          const com9 = ddd + '9' + resto8
          variantes.add(com9)
          variantes.add('55' + com9)
        } else if (nac.length === 11 && nac.charAt(2) === '9') {
          const ddd = nac.slice(0, 2)
          const sem9 = nac.slice(0, 2) + nac.slice(3)
          variantes.add(sem9)
          variantes.add('55' + sem9)
        }

        const conds = Array.from(variantes).map((v) => `numero = '${v}'`)
        const phoneConvs = app.findRecordsByFilter(
          convCol.id,
          conds.join(' || '),
          '-updated',
          10,
          0,
        )
        if (phoneConvs && phoneConvs.length > 0) {
          for (let i = 0; i < phoneConvs.length; i++) {
            const cNum = (phoneConvs[i].getString('numero') || '').replace(/\D/g, '')
            if (variantes.has(cNum)) {
              conversaRecord = phoneConvs[i]
              break
            }
          }
        }
      } catch (_) {}
    }

    // 3. Se não temos cliente_id mas temos cleanPhone, tentar auto-vincular ao cliente único compatível
    // (com tolerância ao 9º dígito e busca em whatsapp/telefone)
    if (!clienteId && !isLid && cleanPhone && cleanPhone.length >= 8) {
      try {
        const last8 = cleanPhone.slice(-8)
        const candidatos = app.findRecordsByFilter(
          'clientes',
          `whatsapp ~ '${last8}' || telefone ~ '${last8}' || telefone_secundario ~ '${last8}' || titular_telefone ~ '${last8}'`,
          '-updated',
          25,
          0,
        )
        const compativeis = []
        const vistos = {}
        for (let i = 0; i < candidatos.length; i++) {
          const c = candidatos[i]
          const id = c.id
          if (vistos[id]) continue
          const campos = [
            c.getString('whatsapp'),
            c.getString('telefone'),
            c.getString('telefone_secundario'),
            c.getString('titular_telefone'),
          ]
          let matched = false
          for (let f = 0; f < campos.length; f++) {
            const num = (campos[f] || '').replace(/\D/g, '')
            if (!num || num.length < 8) continue
            // Compara os últimos 8 dígitos + DDD se disponível
            if (num.slice(-8) === last8) {
              const dddCand = num.length >= 10 ? num.slice(-10, -8) : ''
              const dddDest = cleanPhone.length >= 10 ? cleanPhone.slice(-10, -8) : ''
              if (!dddCand || !dddDest || dddCand === dddDest) {
                matched = true
                break
              }
            }
          }
          if (matched) {
            vistos[id] = true
            compativeis.push(c)
          }
        }
        if (compativeis.length === 1) {
          clienteId = compativeis[0].id
        }
      } catch (_) {}
    }

    // 4. Se ainda não achou conversa mas temos cliente_id, checar se o cliente tem telefone/whatsapp cadastrado
    let clienteRec = null
    if (clienteId) {
      try {
        clienteRec = app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)[0]
      } catch (_) {}
    }

    const preview = previewTexto ? previewTexto.substring(0, 100) : ''

    if (conversaRecord) {
      // Conversa existente: vincular cliente_id se faltar, atualizar status e preview
      if (clienteId && !conversaRecord.getString('cliente_id')) {
        conversaRecord.set('cliente_id', clienteId)
        conversaRecord.set('vinculada_em', nowIso)
      }
      conversaRecord.set('status', 'aguardando_cliente')
      if (preview) {
        conversaRecord.set('ultima_mensagem_preview', preview)
      }
      conversaRecord.set('ultima_mensagem_em', nowIso)
      conversaRecord.set('nao_lidas', 0)
      if (atendenteUser && !conversaRecord.getString('atendente')) {
        conversaRecord.set('atendente', atendenteUser.getString('name') || 'Atendente')
        conversaRecord.set('atendente_id', atendenteUser.id)
      }
      app.save(conversaRecord)
      return conversaRecord
    } else {
      // Criar nova conversa em_atendimento
      let numParaConversa = cleanPhone
      if (
        numParaConversa.length >= 10 &&
        numParaConversa.length <= 11 &&
        !numParaConversa.startsWith('55')
      ) {
        numParaConversa = '55' + numParaConversa
      }
      if (!numParaConversa && clienteRec) {
        const cTel = (
          clienteRec.getString('whatsapp') ||
          clienteRec.getString('telefone') ||
          ''
        ).replace(/\D/g, '')
        if (cTel) {
          numParaConversa =
            cTel.length >= 10 && cTel.length <= 11 && !cTel.startsWith('55') ? '55' + cTel : cTel
        }
      }
      if (!numParaConversa) {
        numParaConversa = cleanPhone || 'desconhecido'
      }

      const novaConv = new Record(convCol)
      novaConv.set('numero', numParaConversa)
      if (clienteId) {
        novaConv.set('cliente_id', clienteId)
        novaConv.set('vinculada_em', nowIso)
      }
      novaConv.set('status', 'em_atendimento')
      if (preview) {
        novaConv.set('ultima_mensagem_preview', preview)
      }
      novaConv.set('ultima_mensagem_em', nowIso)
      novaConv.set('nao_lidas', 0)
      if (atendenteUser) {
        novaConv.set('atendente', atendenteUser.getString('name') || 'Atendente')
        novaConv.set('atendente_id', atendenteUser.id)
      }
      app.save(novaConv)
      return novaConv
    }
  } catch (err) {
    console.log('[CONVERSA HELPER ERRO]', err)
    return null
  }
}

module.exports = {
  ensureConversaForMessage: ensureConversaForMessage,
}
