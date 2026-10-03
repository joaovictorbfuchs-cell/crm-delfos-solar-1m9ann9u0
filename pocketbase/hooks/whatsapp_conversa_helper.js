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

    // 2. Se não achou por cliente_id e temos dígitos do telefone, buscar por número com tolerância ao 9º dígito
    if (!conversaRecord && last8) {
      try {
        const phoneConvs = app.findRecordsByFilter(
          convCol.id,
          `numero ~ '${last8}'`,
          '-updated',
          10,
          0,
        )
        if (phoneConvs && phoneConvs.length > 0) {
          // Prioridade para casamento exato dos dígitos essenciais
          for (let i = 0; i < phoneConvs.length; i++) {
            const cNum = (phoneConvs[i].getString('numero') || '').replace(/\D/g, '')
            if (
              cNum === cleanPhone ||
              (cNum.startsWith('55') && cNum.slice(2) === cleanPhone) ||
              (cleanPhone.startsWith('55') && cleanPhone.slice(2) === cNum)
            ) {
              conversaRecord = phoneConvs[i]
              break
            }
          }
          if (!conversaRecord) {
            conversaRecord = phoneConvs[0]
          }
        }
      } catch (_) {}
    }

    // 3. Se ainda não achou conversa mas temos cliente_id, checar se o cliente tem telefone/whatsapp cadastrado
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
  ensureConversaForMessage,
}
