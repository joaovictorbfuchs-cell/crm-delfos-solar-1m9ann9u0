// Hook para envio de documentos PDF (orçamentos solar e propostas O&M) via Z-API / Gateway WhatsApp
routerAdd('POST', '/backend/v1/whatsapp/enviar-documento', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const clienteId = (body.cliente_id || '').trim()
    const telefoneDestino = (body.telefone_destino || '').trim()
    const tipo = (body.tipo || 'documento').trim() // orcamento_solar | proposta_om | documento
    const referenciaId = (body.referencia_id || '').trim()
    const legenda = (body.legenda || body.mensagem || '').trim()
    const nomeArquivo = (body.nome_arquivo || body.fileName || 'documento.pdf').trim()
    const base64Data = (body.base64 || body.document || '').trim()
    const documentoUrl = (body.documento_url || body.documentUrl || '').trim()

    if (!clienteId) {
      return e.json(400, { error: 'cliente_id é obrigatório', ok: false })
    }
    if (!telefoneDestino) {
      return e.json(400, { error: 'Telefone de destino é obrigatório', ok: false })
    }

    // Buscar dados do cliente para registro
    let clienteNome = 'Cliente'
    try {
      const clienteRec = $app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)[0]
      if (clienteRec) {
        clienteNome = clienteRec.getString('nome') || clienteNome
      }
    } catch (_) {}

    // Normalizar telefone (55 + DDD + Número)
    let cleanPhone = telefoneDestino.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    const msgRecord = new Record(msgsCol)
    msgRecord.set('cliente_id', clienteId)
    msgRecord.set('telefone_destino', telefoneDestino)
    msgRecord.set('conteudo_final', legenda || `Envio de documento: ${nomeArquivo}`)
    msgRecord.set('tipo_disparo', 'manual')
    msgRecord.set('tipo_mensagem', 'documento')
    msgRecord.set('nome_arquivo', nomeArquivo)
    if (documentoUrl) msgRecord.set('documento_url', documentoUrl)
    if (referenciaId) msgRecord.set('referencia_id', referenciaId)

    // Ler secrets do Gateway
    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim().replace(/[\r\n\t]/g, '')
    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')
    let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim().replace(/[\r\n\t]/g, '')

    // Título amigável da timeline
    let timelineTitulo = 'Documento enviado por WhatsApp'
    if (tipo === 'orcamento_solar') {
      timelineTitulo = 'Orçamento Solar enviado por WhatsApp'
    } else if (tipo === 'proposta_om') {
      timelineTitulo = 'Proposta O&M enviada por WhatsApp'
    }

    if (!rawApiUrl) {
      // Secrets ainda não configurados
      const logErro =
        'Gateway não configurado: adicione WHATSAPP_API_URL e WHATSAPP_API_KEY aos Secrets do backend.'
      msgRecord.set('status', 'falha')
      msgRecord.set('log_erro', logErro)
      $app.save(msgRecord)

      // Registrar atividade na timeline com status de falha graciosa
      try {
        const atvCol = $app.findCollectionByNameOrId('atividades')
        const atvRec = new Record(atvCol)
        atvRec.set('cliente_id', clienteId)
        atvRec.set('tipo', 'proposta')
        atvRec.set('titulo', timelineTitulo)
        atvRec.set(
          'descricao',
          `Arquivo: ${nomeArquivo}\nDestino: ${telefoneDestino}\nStatus: falha (gateway não configurado)\nLegenda: "${legenda}"`,
        )
        atvRec.set('data', new Date().toISOString())
        atvRec.set('status', 'concluida')
        atvRec.set('autor', (authUser && authUser.getString('name')) || 'Consultor Comercial')
        $app.save(atvRec)
      } catch (errAtv) {
        console.log('[ATV ERRO]', errAtv)
      }

      return e.json(200, {
        ok: true,
        gatewayConfigured: false,
        sent: false,
        status: 'falha',
        message:
          'Documento gravado no histórico como "falha", pois os Secrets WHATSAPP_API_URL e WHATSAPP_API_KEY não foram configurados.',
        data: msgRecord,
      })
    }

    // Normalizar base URL
    let cleanUrl = rawApiUrl.replace(/\/+$/, '')
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }
    const lowerUrl = cleanUrl.toLowerCase()
    const isZApi = lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1

    let targetUrl = ''
    let payloadGateway = {}
    const headers = { 'Content-Type': 'application/json' }

    // Preparar base64 com prefixo correto se fornecido
    let documentBase64 = base64Data
    if (
      documentBase64 &&
      !documentBase64.startsWith('data:') &&
      !documentBase64.startsWith('http')
    ) {
      documentBase64 = 'data:application/pdf;base64,' + documentBase64
    }

    if (isZApi) {
      // Remover sufixo /send-text ou /send-document do final da URL configurada
      let baseWithoutSuffix = cleanUrl
        .replace(/\/+send-text\/?$/i, '')
        .replace(/\/+send-document(\/[^/?#]+)?\/?$/i, '')
        .replace(/\/+$/, '')

      const zapiMatch = baseWithoutSuffix.match(
        /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
      )

      if (zapiMatch) {
        const hostPrefix = zapiMatch[1]
        const instanceId = zapiMatch[2]
        const token = zapiMatch[3]
        targetUrl =
          hostPrefix + '/instances/' + instanceId + '/token/' + token + '/send-document/pdf'
      } else {
        targetUrl = baseWithoutSuffix + '/send-document/pdf'
      }

      if (apiKey) {
        headers['Client-Token'] = apiKey
      }

      // Se temos documento base64, enviamos via send-document
      if (documentBase64) {
        payloadGateway = {
          phone: cleanPhone,
          document: documentBase64,
          fileName: nomeArquivo,
        }
        if (legenda) {
          payloadGateway.caption = legenda
        }
      } else {
        // Fallback: se não tiver base64, usar endpoint de texto
        if (zapiMatch) {
          targetUrl =
            zapiMatch[1] + '/instances/' + zapiMatch[2] + '/token/' + zapiMatch[3] + '/send-text'
        } else {
          targetUrl = baseWithoutSuffix + '/send-text'
        }
        payloadGateway = {
          phone: cleanPhone,
          message: legenda || `Olá ${clienteNome}, segue proposta da Delfos Solar.`,
        }
      }
    } else {
      // Gateway Genérico / Evolution API
      targetUrl = cleanUrl.replace(/\/+$/, '') + '/send-document'
      if (apiKey) {
        headers['apikey'] = apiKey
        headers['Authorization'] = 'Bearer ' + apiKey
      }

      if (documentBase64) {
        payloadGateway = {
          number: cleanPhone,
          phone: cleanPhone,
          document: documentBase64,
          fileName: nomeArquivo,
          caption: legenda,
          sender: originNumber,
        }
      } else {
        targetUrl = cleanUrl.replace(/\/+$/, '') + '/send-text'
        payloadGateway = {
          number: cleanPhone,
          phone: cleanPhone,
          message: legenda,
          text: legenda,
          sender: originNumber,
        }
      }
    }

    let maskedTarget = targetUrl.replace(/\/token\/[^/?#]+/i, '/token/••••••••')
    console.log(
      '[WHATSAPP DOC SEND]',
      JSON.stringify({
        targetUrlMasked: maskedTarget,
        cleanPhone: cleanPhone,
        hasDocument: Boolean(documentBase64),
        fileName: nomeArquivo,
      }),
    )

    try {
      const res = $http.send({
        url: targetUrl,
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payloadGateway),
        timeout: 30,
      })

      console.log(
        '[WHATSAPP DOC RESPOSTA]',
        JSON.stringify({
          statusCode: res.statusCode,
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

        // Registrar atividade na timeline do cliente
        try {
          const atvCol = $app.findCollectionByNameOrId('atividades')
          const atvRec = new Record(atvCol)
          atvRec.set('cliente_id', clienteId)
          atvRec.set('tipo', 'proposta')
          atvRec.set('titulo', timelineTitulo)
          atvRec.set(
            'descricao',
            `Arquivo: ${nomeArquivo}\nDestino: ${telefoneDestino}\nStatus: enviada\nLegenda: "${legenda || 'Sem legenda'}"`,
          )
          atvRec.set('data', new Date().toISOString())
          atvRec.set('status', 'concluida')
          atvRec.set('autor', (authUser && authUser.getString('name')) || 'Consultor Comercial')
          $app.save(atvRec)
        } catch (errAtv) {
          console.log('[ATV ERRO]', errAtv)
        }

        // Se for proposta O&M, registrar também na timeline_om se existir contrato associado
        if (tipo === 'proposta_om') {
          try {
            const timeCol = $app.findCollectionByNameOrId('timeline_om')
            const timeRec = new Record(timeCol)
            timeRec.set('cliente_id', clienteId)
            timeRec.set('tipo', 'relatorio')
            timeRec.set('titulo', 'Proposta O&M enviada por WhatsApp')
            timeRec.set(
              'descricao',
              `PDF: ${nomeArquivo} enviado para ${telefoneDestino}. Legenda: "${legenda || '-'}"`,
            )
            timeRec.set('data', new Date().toISOString())
            timeRec.set('autor', (authUser && authUser.getString('name')) || 'Consultor Comercial')
            timeRec.set('status_tag', 'Enviado')
            if (referenciaId) timeRec.set('referencia_id', referenciaId)
            $app.save(timeRec)
          } catch (_) {}
        }

        return e.json(200, {
          ok: true,
          gatewayConfigured: true,
          sent: true,
          status: 'enviada',
          message: 'Documento enviado com sucesso via WhatsApp!',
          data: msgRecord,
        })
      } else {
        const errorText = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
        let contextualHint = ''
        if (res.statusCode === 404 && errorText.indexOf('Instance not found') !== -1) {
          contextualHint =
            ' (Instância não encontrada na Z-API: verifique WHATSAPP_API_URL no formato https://api.z-api.io/instances/{id}/token/{token})'
        } else if (res.statusCode === 400 && errorText.indexOf('client-token') !== -1) {
          contextualHint =
            ' (Client-Token ausente ou inválido: configure WHATSAPP_API_KEY com seu Client-Token)'
        }

        const logMsg = `Gateway HTTP ${res.statusCode}: ${errorText}${contextualHint}`
        console.log('[WHATSAPP DOC FALHA HTTP]', logMsg)

        msgRecord.set('status', 'falha')
        msgRecord.set('log_erro', logMsg)
        $app.save(msgRecord)

        // Registrar atividade na timeline indicando a tentativa com falha
        try {
          const atvCol = $app.findCollectionByNameOrId('atividades')
          const atvRec = new Record(atvCol)
          atvRec.set('cliente_id', clienteId)
          atvRec.set('tipo', 'proposta')
          atvRec.set('titulo', timelineTitulo + ' (Falha de Envio)')
          atvRec.set(
            'descricao',
            `Arquivo: ${nomeArquivo}\nDestino: ${telefoneDestino}\nMotivo: ${logMsg}`,
          )
          atvRec.set('data', new Date().toISOString())
          atvRec.set('status', 'pendente')
          atvRec.set('autor', (authUser && authUser.getString('name')) || 'Consultor Comercial')
          $app.save(atvRec)
        } catch (_) {}

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
      console.log('[WHATSAPP DOC EXCECAO HTTP]', errMsg)

      msgRecord.set('status', 'falha')
      msgRecord.set('log_erro', 'Erro de conexão com gateway: ' + errMsg)
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
    let msg = 'Erro interno ao enviar documento'
    if (err && err.message) msg = err.message
    console.log('[WHATSAPP DOC ERRO INTERNO]', msg)
    return e.json(500, { error: msg, ok: false })
  }
})
