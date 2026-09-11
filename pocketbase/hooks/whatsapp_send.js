// Hook para processar e disparar mensagens WhatsApp manualmente e testar gateway
routerAdd('POST', '/backend/v1/whatsapp/send', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const clienteId = body.cliente_id
    const templateId = body.template_id || ''
    const telefoneDestino = (body.telefone_destino || '').trim()
    const conteudoFinal = (body.conteudo_final || '').trim()
    const agendadoPara = body.agendado_para || null
    const tipoDisparo = body.tipo_disparo || 'manual'
    const referenciaId = body.referencia_id || ''

    if (!clienteId) {
      return e.json(400, { error: 'cliente_id é obrigatório', ok: false })
    }
    if (!telefoneDestino) {
      return e.json(400, { error: 'Telefone de destino é obrigatório', ok: false })
    }
    if (!conteudoFinal) {
      return e.json(400, { error: 'Conteúdo da mensagem não pode ser vazio', ok: false })
    }

    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    const msgRecord = new Record(msgsCol)
    msgRecord.set('cliente_id', clienteId)
    if (templateId) msgRecord.set('template_id', templateId)
    msgRecord.set('telefone_destino', telefoneDestino)
    msgRecord.set('conteudo_final', conteudoFinal)
    msgRecord.set('tipo_disparo', tipoDisparo)
    if (referenciaId) msgRecord.set('referencia_id', referenciaId)

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

    // Normalizar número de destino (apenas dígitos, garantindo prefixo 55 se BR)
    let cleanPhone = telefoneDestino.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

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
