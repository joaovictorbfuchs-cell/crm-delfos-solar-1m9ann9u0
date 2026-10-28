// Hook para processar e disparar mensagens WhatsApp manualmente e testar gateway
routerAdd('POST', '/backend/v1/whatsapp/send', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const clienteId = (body.cliente_id || '').trim()
    const conversaId = (body.conversa_id || '').trim()
    const templateId = body.template_id || ''
    const telefoneDestino = (body.telefone_destino || '').trim()
    const conteudoFinal = (body.conteudo_final || '').trim()
    const agendadoPara = body.agendado_para || null
    const tipoDisparo = body.tipo_disparo || 'manual'
    const referenciaId = body.referencia_id || ''

    if (!clienteId && !conversaId) {
      return e.json(400, { error: 'cliente_id ou conversa_id é obrigatório', ok: false })
    }
    if (!telefoneDestino) {
      return e.json(400, { error: 'Telefone de destino é obrigatório', ok: false })
    }
    if (!conteudoFinal) {
      return e.json(400, { error: 'Conteúdo da mensagem não pode ser vazio', ok: false })
    }

    // Regra de ouro: se a requisição tem conversa_id, o destino é ESTRITAMENTE o campo
    // numero da whatsapp_conversa correspondente — NUNCA redirecionar para número do cadastro
    // e NUNCA mutar o campo 'numero' da conversa existente.
    // Se não há conversa_id (envio avulso por cliente), resolver pelo cliente (whatsapp || telefone).
    let resolvedTelefoneDestino = telefoneDestino
    let finalConversaId = conversaId
    let effectiveClienteId = clienteId
    let convRec = null

    if (finalConversaId) {
      try {
        const convCol = $app.findCollectionByNameOrId('whatsapp_conversas')
        convRec = $app.findRecordsByFilter(convCol.id, `id = '${finalConversaId}'`, '', 1, 0)[0]
        if (convRec) {
          if (!effectiveClienteId && convRec.getString('cliente_id')) {
            effectiveClienteId = convRec.getString('cliente_id')
          }
          const numConv = (convRec.getString('numero') || '').trim()
          let digitsConv = numConv.replace(/\D/g, '')
          if (digitsConv.length >= 10 && digitsConv.length <= 11 && !digitsConv.startsWith('55')) {
            digitsConv = '55' + digitsConv
          }
          if (digitsConv) {
            resolvedTelefoneDestino = digitsConv
          }
        }
      } catch (errConvFind) {
        console.log('[WHATSAPP SEND CONV FIND AVISO]', errConvFind)
      }
    } else if (effectiveClienteId) {
      // Envio avulso por cliente (sem conversa_id): resolver pelo cadastro do cliente
      try {
        const cliRec = $app.findRecordsByFilter(
          'clientes',
          `id = '${effectiveClienteId}'`,
          '',
          1,
          0,
        )[0]
        if (cliRec) {
          const cliWhats = (cliRec.getString('whatsapp') || '').trim()
          const cliTel = (cliRec.getString('telefone') || '').trim()
          const numeroAtualCli = cliWhats || cliTel
          if (numeroAtualCli) {
            let digitsAtual = numeroAtualCli.replace(/\D/g, '')
            if (
              digitsAtual.length >= 10 &&
              digitsAtual.length <= 11 &&
              !digitsAtual.startsWith('55')
            ) {
              digitsAtual = '55' + digitsAtual
            }
            if (digitsAtual && digitsAtual.length >= 10) {
              resolvedTelefoneDestino = digitsAtual
            }
          }
        }
      } catch (errResolveCli) {
        console.log('[WHATSAPP SEND RESOLVE CLI AVISO]', errResolveCli)
      }
    }

    // Normalizar número de destino (apenas dígitos, garantindo prefixo 55 se BR)
    let cleanPhone = (resolvedTelefoneDestino || '').replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }
    resolvedTelefoneDestino = cleanPhone

    // Atualizar conversa existente ou localizar/criar conversa para envio avulso
    try {
      if (finalConversaId && convRec) {
        if (effectiveClienteId && !convRec.getString('cliente_id')) {
          convRec.set('cliente_id', effectiveClienteId)
        }
        // Conversa existente nunca tem o campo 'numero' mutado
        convRec.set('status', 'aguardando_cliente')
        convRec.set('ultima_mensagem_preview', conteudoFinal.substring(0, 100))
        convRec.set('ultima_mensagem_em', new Date().toISOString())
        convRec.set('nao_lidas', 0)
        if (authUser && !convRec.getString('atendente')) {
          convRec.set('atendente', authUser.getString('name') || 'Atendente')
          convRec.set('atendente_id', authUser.id)
        }
        $app.save(convRec)
      } else {
        const conv = ensureConversaForMessageSend(
          $app,
          effectiveClienteId || clienteId,
          resolvedTelefoneDestino,
          conteudoFinal,
          authUser,
        )
        if (conv) {
          finalConversaId = conv.id
        }
      }
    } catch (errConvHelper) {
      console.log('[WHATSAPP SEND CONV HELPER AVISO]', errConvHelper)
    }

    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    const msgRecord = new Record(msgsCol)
    if (effectiveClienteId || clienteId)
      msgRecord.set('cliente_id', effectiveClienteId || clienteId)
    if (finalConversaId) msgRecord.set('conversa_id', finalConversaId)
    if (templateId) msgRecord.set('template_id', templateId)
    msgRecord.set('telefone_destino', cleanPhone)
    msgRecord.set('conteudo_final', conteudoFinal)
    msgRecord.set('tipo_disparo', tipoDisparo)
    msgRecord.set('direcao', 'enviada')
    if (referenciaId) msgRecord.set('referencia_id', referenciaId)
    if (authUser) {
      const nomeAutor = authUser.getString('name') || authUser.getString('email') || 'Atendente'
      msgRecord.set('autor', nomeAutor)
      msgRecord.set('autor_id', authUser.id)
    }

    // Se tiver agendamento futuro (> agora + 1 min), grava status 'agendada'
    const now = new Date()
    let isScheduled = false
    if (agendadoPara) {
      const scheduleDate = new Date(agendadoPara)
      if (scheduleDate.getTime() > now.getTime() + 60 * 1000) {
        isScheduled = true
        msgRecord.set('agendado_para', scheduleDate.toISOString())
        msgRecord.set('status', 'agendada')
      }
    }

    if (isScheduled) {
      $app.save(msgRecord)
      return e.json(200, {
        ok: true,
        scheduled: true,
        message: 'Mensagem agendada com sucesso para envio na fila',
        data: msgRecord,
      })
    }

    // Envio imediato via Gateway HTTP configurável através de Secrets
    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim()
    // Remover quebras de linha acidentais ou espaços
    rawApiUrl = rawApiUrl.replace(/[\r\n\t]/g, '').trim()

    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim()
    apiKey = apiKey.replace(/[\r\n\t]/g, '').trim()

    let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim()
    originNumber = originNumber.replace(/[\r\n\t]/g, '').trim()

    if (!rawApiUrl) {
      // Secrets ainda não preenchidos pelo usuário — deixar como falha/não configurado de forma graciosa
      msgRecord.set('status', 'falha')
      msgRecord.set(
        'log_erro',
        'Gateway não configurado: adicione WHATSAPP_API_URL e WHATSAPP_API_KEY aos Secrets do backend.',
      )
      $app.save(msgRecord)

      return e.json(200, {
        ok: true,
        gatewayConfigured: false,
        sent: false,
        status: 'falha',
        message:
          'Mensagem salva no histórico como "falha" pois os Secrets WHATSAPP_API_URL e WHATSAPP_API_KEY não foram preenchidos no ambiente.',
        data: msgRecord,
      })
    }

    // Chamar gateway configurado
    try {
      let cleanUrl = rawApiUrl.replace(/\/+$/, '')
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl
      }

      const lowerUrl = cleanUrl.toLowerCase()
      const isZApi = lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1

      let targetUrl = cleanUrl
      let payloadGateway = {}
      const headers = {
        'Content-Type': 'application/json',
      }

      let maskedTargetUrl = ''
      let isWellFormedZApi = true

      if (isZApi) {
        // Remover qualquer sufixo /send-text (case-insensitive, com barras redundantes)
        let baseWithoutSuffix = cleanUrl.replace(/\/+send-text\/?$/i, '').replace(/\/+$/, '')

        // Verificar estrutura canônica /instances/{id}/token/{token}
        const zapiMatch = baseWithoutSuffix.match(
          /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
        )

        if (zapiMatch) {
          const hostPrefix = zapiMatch[1]
          const instanceId = zapiMatch[2]
          const token = zapiMatch[3]
          targetUrl = hostPrefix + '/instances/' + instanceId + '/token/' + token + '/send-text'

          const tokenMasked = token.length > 4 ? '••••' + token.slice(-4) : '••••'
          maskedTargetUrl =
            hostPrefix + '/instances/' + instanceId + '/token/' + tokenMasked + '/send-text'
        } else {
          isWellFormedZApi = false
          // Tentar normalizar mesmo se houver paths extras ou barra
          targetUrl = baseWithoutSuffix + '/send-text'
          maskedTargetUrl = targetUrl.replace(/\/token\/[^/?#]+/i, '/token/••••••••')
          console.log(
            '[Z-API AVISO] Formato de WHATSAPP_API_URL não possui padrão exato /instances/{id}/token/{token}. URL mascarada:',
            maskedTargetUrl,
          )
        }

        // A Z-API requer Client-Token no header quando a conta exigir ou se fornecido no apiKey
        if (apiKey) {
          headers['Client-Token'] = apiKey
        }

        payloadGateway = {
          phone: cleanPhone,
          message: conteudoFinal,
        }
      } else {
        // Formato Genérico / Evolution API
        maskedTargetUrl = cleanUrl.length > 45 ? cleanUrl.substring(0, 40) + '...' : cleanUrl
        if (apiKey) {
          headers['apikey'] = apiKey
          headers['Authorization'] = 'Bearer ' + apiKey
          headers['X-Api-Key'] = apiKey
        }

        payloadGateway = {
          number: cleanPhone,
          phone: cleanPhone,
          message: conteudoFinal,
          text: conteudoFinal,
          sender: originNumber,
        }
      }

      console.log(
        '[WHATSAPP SEND INICIADO]',
        JSON.stringify({
          provider: isZApi ? 'z-api' : 'generico',
          targetUrlMasked: maskedTargetUrl,
          isWellFormedZApi: isWellFormedZApi,
          hasClientTokenHeader: Boolean(headers['Client-Token']),
          cleanPhone: cleanPhone,
          tipoDisparo: tipoDisparo,
        }),
      )

      const res = $http.send({
        url: targetUrl,
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payloadGateway),
        timeout: 15,
      })

      console.log(
        '[WHATSAPP SEND RESPOSTA]',
        JSON.stringify({
          statusCode: res.statusCode,
          targetUrlMasked: maskedTargetUrl,
          hasRaw: Boolean(res.raw),
        }),
      )

      if (res.statusCode >= 200 && res.statusCode < 300) {
        let externalId = ''
        try {
          if (res.json) {
            if (res.json.messageId) externalId = String(res.json.messageId)
            else if (res.json.id) externalId = String(res.json.id)
            else if (res.json.zaapId) externalId = String(res.json.zaapId)
            else if (res.json.key && res.json.key.id) externalId = String(res.json.key.id)
          }
        } catch (_) {}

        msgRecord.set('status', 'enviada')
        msgRecord.set('enviado_em', new Date().toISOString())
        if (externalId) msgRecord.set('id_externo_gateway', externalId)
        msgRecord.set('log_erro', '')
        $app.save(msgRecord)

        // Se houver conversa associada, atualizar conversa: status 'aguardando_cliente'
        if (conversaId) {
          try {
            const convCol = $app.findCollectionByNameOrId('whatsapp_conversas')
            const convRec = $app.findRecordsByFilter(
              convCol.id,
              `id = '${conversaId}'`,
              '',
              1,
              0,
            )[0]
            if (convRec) {
              convRec.set('status', 'aguardando_cliente')
              convRec.set('ultima_mensagem_preview', conteudoFinal.substring(0, 100))
              convRec.set('ultima_mensagem_em', new Date().toISOString())
              convRec.set('nao_lidas', 0)
              if (authUser && !convRec.getString('atendente')) {
                convRec.set('atendente', authUser.getString('name') || 'Atendente')
                convRec.set('atendente_id', authUser.id)
              }
              $app.save(convRec)
            }
          } catch (errConv) {
            console.log('[CONV UPDATE AVISO]', errConv)
          }
        }

        return e.json(200, {
          ok: true,
          gatewayConfigured: true,
          sent: true,
          status: 'enviada',
          message: 'Mensagem enviada com sucesso ao gateway WhatsApp',
          data: msgRecord,
        })
      } else {
        const errorText = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
        let contextualHint = ''

        if (res.statusCode === 404 && errorText.indexOf('Instance not found') !== -1) {
          contextualHint =
            ' (Instância não encontrada na Z-API: verifique se a WHATSAPP_API_URL está no formato https://api.z-api.io/instances/{instanceId}/token/{token} ou se a instância está ativa no painel)'
        } else if (res.statusCode === 400 && errorText.indexOf('client-token') !== -1) {
          contextualHint =
            ' (Client-Token ausente ou inválido: configure WHATSAPP_API_KEY com o seu Client-Token de segurança da Z-API)'
        }

        const logMsg = `Gateway retornou erro HTTP ${res.statusCode}: ${errorText}${contextualHint}`
        console.log('[WHATSAPP SEND FALHA HTTP]', logMsg)

        msgRecord.set('status', 'falha')
        msgRecord.set('log_erro', logMsg)
        $app.save(msgRecord)

        return e.json(200, {
          ok: true,
          gatewayConfigured: true,
          sent: false,
          status: 'falha',
          message: `Falha no retorno do gateway (${res.statusCode})${contextualHint}`,
          data: msgRecord,
        })
      }
    } catch (httpErr) {
      const errMsg = httpErr && httpErr.message ? httpErr.message : String(httpErr)
      console.log('[WHATSAPP SEND EXCECAO HTTP]', errMsg)

      msgRecord.set('status', 'falha')
      msgRecord.set('log_erro', `Erro de conexão com gateway: ${errMsg}`)
      $app.save(msgRecord)

      return e.json(200, {
        ok: true,
        gatewayConfigured: true,
        sent: false,
        status: 'falha',
        message: 'Erro de conexão com gateway: ' + errMsg,
        data: msgRecord,
      })
    }
  } catch (err) {
    let msg = 'Erro interno ao processar mensagem'
    if (err && err.message) msg = err.message
    console.log('[WHATSAPP SEND ERRO INTERNO]', msg)
    return e.json(500, { error: msg, ok: false })
  }
})

// ============================================================================
// HELPER AUTOCONTIDO PARA LOCALIZAR/CRIAR CONVERSA (SEM REQUIRE EXTERNO)
// ============================================================================

function ensureConversaForMessageSend(
  app,
  clienteId,
  telefoneDestino,
  previewTexto,
  atendenteUser,
) {
  try {
    const convCol = app.findCollectionByNameOrId('whatsapp_conversas')
    const nowIso = new Date().toISOString()
    const cleanPhone = (telefoneDestino || '').replace(/\D/g, '')
    const last8 = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone

    let conversaRecord = null

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

    const isLid = cleanPhone.length === 14 && cleanPhone.startsWith('24')
    if (!conversaRecord && cleanPhone) {
      try {
        const filterPhone = isLid ? `numero = '${cleanPhone}'` : `numero ~ '${last8}'`
        const phoneConvs = app.findRecordsByFilter(convCol.id, filterPhone, '-updated', 10, 0)
        if (phoneConvs && phoneConvs.length > 0) {
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
          if (!conversaRecord && !isLid) {
            conversaRecord = phoneConvs[0]
          }
        }
      } catch (_) {}
    }

    if (!clienteId && !isLid && cleanPhone && cleanPhone.length >= 8) {
      try {
        const last8Digits = cleanPhone.slice(-8)
        const candidatos = app.findRecordsByFilter(
          'clientes',
          `whatsapp ~ '${last8Digits}' || telefone ~ '${last8Digits}' || telefone_secundario ~ '${last8Digits}' || titular_telefone ~ '${last8Digits}'`,
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
            if (num.slice(-8) === last8Digits) {
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

    let clienteRec = null
    if (clienteId) {
      try {
        clienteRec = app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)[0]
      } catch (_) {}
    }

    const preview = previewTexto ? previewTexto.substring(0, 100) : ''

    if (conversaRecord) {
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
    console.log('[CONVERSA SEND HELPER ERRO]', err)
    return null
  }
}
