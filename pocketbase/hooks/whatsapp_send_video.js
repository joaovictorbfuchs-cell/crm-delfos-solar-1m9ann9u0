// Hook para envio de vídeos via Z-API /send-video e gateway WhatsApp
routerAdd('POST', '/backend/v1/whatsapp/enviar-video', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const clienteId = (body.cliente_id || '').trim()
    const conversaId = (body.conversa_id || '').trim()
    const telefoneDestino = (body.telefone_destino || '').trim()
    const videoData = (body.video || body.base64 || body.video_url || '').trim()
    const legenda = (body.legenda || body.caption || body.mensagem || '').trim()
    const nomeArquivo = (body.nome_arquivo || body.fileName || 'video.mp4').trim()
    const recordId = (body.record_id || body.msg_id || '').trim()
    const referenciaId = (body.referencia_id || '').trim()

    if (!clienteId && !conversaId) {
      return e.json(400, { error: 'cliente_id ou conversa_id é obrigatório', ok: false })
    }
    if (!telefoneDestino) {
      return e.json(400, { error: 'Telefone de destino é obrigatório', ok: false })
    }

    // Buscar dados do cliente (se clienteId fornecido ou a partir da conversa)
    let finalClienteId = clienteId
    let clienteNome = 'Cliente'
    if (!finalClienteId && conversaId) {
      try {
        const convRec = $app.findRecordsByFilter(
          'whatsapp_conversas',
          `id = '${conversaId}'`,
          '',
          1,
          0,
        )[0]
        if (convRec) {
          finalClienteId = convRec.getString('cliente_id') || ''
        }
      } catch (_) {}
    }

    if (finalClienteId) {
      try {
        const cliRec = $app.findRecordsByFilter('clientes', `id = '${finalClienteId}'`, '', 1, 0)[0]
        if (cliRec) {
          clienteNome = cliRec.getString('nome') || clienteNome
        }
      } catch (_) {}
    }

    // Normalizar telefone (55 + DDD + Número)
    let cleanPhone = telefoneDestino.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    let msgRecord = null
    if (recordId) {
      try {
        msgRecord = $app.findFirstRecordByData('whatsapp_mensagens', 'id', recordId)
      } catch (_) {}
    }
    if (!msgRecord) {
      msgRecord = new Record(msgsCol)
    }

    if (finalClienteId) msgRecord.set('cliente_id', finalClienteId)
    if (conversaId) msgRecord.set('conversa_id', conversaId)
    msgRecord.set('telefone_destino', telefoneDestino)
    msgRecord.set('conteudo_final', legenda || '[Vídeo]')
    msgRecord.set('tipo_disparo', 'manual')
    msgRecord.set('tipo_mensagem', 'video')
    msgRecord.set('direcao', 'enviada')
    msgRecord.set('nome_arquivo', nomeArquivo)
    if (referenciaId) msgRecord.set('referencia_id', referenciaId)

    if (videoData && (videoData.startsWith('http') || videoData.startsWith('data:video'))) {
      msgRecord.set('documento_url', videoData)
    }

    // Ler secrets do Gateway
    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim().replace(/[\r\n\t]/g, '')
    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')
    let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim().replace(/[\r\n\t]/g, '')

    const autorNome =
      (authUser && (authUser.getString('name') || authUser.getString('email'))) || 'Atendente'

    if (!rawApiUrl) {
      const logErro =
        'Gateway não configurado: adicione WHATSAPP_API_URL e WHATSAPP_API_KEY aos Secrets do backend.'
      msgRecord.set('status', 'falha')
      msgRecord.set('log_erro', logErro)
      $app.save(msgRecord)

      if (finalClienteId) {
        try {
          const atvCol = $app.findCollectionByNameOrId('atividades')
          const atvRec = new Record(atvCol)
          atvRec.set('cliente_id', finalClienteId)
          atvRec.set('tipo', 'follow_up')
          atvRec.set('titulo', 'Vídeo por WhatsApp (Falha de Envio)')
          atvRec.set(
            'descricao',
            `Arquivo: ${nomeArquivo}\nDestino: ${telefoneDestino}\nStatus: falha (gateway não configurado)\nLegenda: "${legenda}"`,
          )
          atvRec.set('data', new Date().toISOString())
          atvRec.set('status', 'pendente')
          atvRec.set('autor', autorNome)
          $app.save(atvRec)
        } catch (_) {}
      }

      return e.json(200, {
        ok: true,
        gatewayConfigured: false,
        sent: false,
        status: 'falha',
        message:
          'Vídeo registrado no histórico como "falha", pois os Secrets WHATSAPP_API_URL e WHATSAPP_API_KEY não foram preenchidos.',
        data: msgRecord,
      })
    }

    let cleanUrl = rawApiUrl.replace(/\/+$/, '')
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }
    const lowerUrl = cleanUrl.toLowerCase()
    const isZApi = lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1

    let targetUrl = ''
    let payloadGateway = {}
    const headers = { 'Content-Type': 'application/json' }

    let payloadVideoValue = videoData
    if (!payloadVideoValue && msgRecord.getString('arquivo')) {
      const pbUrl = ($os.getenv('PB_INSTANCE_URL') || $os.getenv('SITE_URL') || '').replace(
        /\/+$/,
        '',
      )
      if (pbUrl) {
        payloadVideoValue =
          pbUrl +
          '/api/files/whatsapp_mensagens/' +
          msgRecord.id +
          '/' +
          encodeURIComponent(msgRecord.getString('arquivo'))
      }
    }

    if (isZApi) {
      let baseWithoutSuffix = cleanUrl
        .replace(/\/+send-text\/?$/i, '')
        .replace(/\/+send-document(\/[^/?#]+)?\/?$/i, '')
        .replace(/\/+send-image\/?$/i, '')
        .replace(/\/+send-video\/?$/i, '')
        .replace(/\/+send-audio\/?$/i, '')
        .replace(/\/+$/, '')

      const zapiMatch = baseWithoutSuffix.match(
        /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
      )

      if (zapiMatch) {
        const hostPrefix = zapiMatch[1]
        const instanceId = zapiMatch[2]
        const token = zapiMatch[3]
        targetUrl = hostPrefix + '/instances/' + instanceId + '/token/' + token + '/send-video'
      } else {
        targetUrl = baseWithoutSuffix + '/send-video'
      }

      if (apiKey) {
        headers['Client-Token'] = apiKey
      }

      payloadGateway = {
        phone: cleanPhone,
        video: payloadVideoValue,
      }
      if (legenda) {
        payloadGateway.caption = legenda
      }
    } else {
      targetUrl = cleanUrl.replace(/\/+$/, '') + '/send-video'
      if (apiKey) {
        headers['apikey'] = apiKey
        headers['Authorization'] = 'Bearer ' + apiKey
      }

      payloadGateway = {
        number: cleanPhone,
        phone: cleanPhone,
        video: payloadVideoValue,
        media: payloadVideoValue,
        caption: legenda,
        sender: originNumber,
      }
    }

    let maskedTarget = targetUrl.replace(/\/token\/[^/?#]+/i, '/token/••••••••')
    console.log(
      '[WHATSAPP VIDEO SEND INICIADO]',
      JSON.stringify({
        targetUrlMasked: maskedTarget,
        cleanPhone: cleanPhone,
        fileName: nomeArquivo,
        hasVideo: Boolean(payloadVideoValue),
      }),
    )

    try {
      const res = $http.send({
        url: targetUrl,
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payloadGateway),
        timeout: 45,
      })

      console.log(
        '[WHATSAPP VIDEO SEND RESPOSTA]',
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

        // Atualizar status e preview na conversa do chat
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
              convRec.set('ultima_mensagem_preview', legenda ? `🎥 ${legenda}` : '🎥 Vídeo')
              convRec.set('ultima_mensagem_em', new Date().toISOString())
              convRec.set('nao_lidas', 0)
              if (authUser && !convRec.getString('atendente')) {
                convRec.set('atendente', authUser.getString('name') || 'Atendente')
                convRec.set('atendente_id', authUser.id)
              }
              $app.save(convRec)
            }
          } catch (errConv) {
            console.log('[CONV UPDATE VIDEO AVISO]', errConv)
          }
        }

        // Registrar atividade na timeline se houver cliente
        if (finalClienteId) {
          try {
            const atvCol = $app.findCollectionByNameOrId('atividades')
            const atvRec = new Record(atvCol)
            atvRec.set('cliente_id', finalClienteId)
            atvRec.set('tipo', 'follow_up')
            atvRec.set('titulo', 'Vídeo enviado por WhatsApp')
            atvRec.set(
              'descricao',
              `Vídeo: ${nomeArquivo}\nDestino: ${telefoneDestino}\nStatus: enviada\nLegenda: "${legenda || 'Sem legenda'}"`,
            )
            atvRec.set('data', new Date().toISOString())
            atvRec.set('status', 'concluida')
            atvRec.set('autor', autorNome)
            $app.save(atvRec)
          } catch (errAtv) {
            console.log('[ATV ERRO VIDEO SUCESSO]', errAtv)
          }
        }

        return e.json(200, {
          ok: true,
          gatewayConfigured: true,
          sent: true,
          status: 'enviada',
          message: 'Vídeo enviado com sucesso via WhatsApp!',
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
        console.log('[WHATSAPP VIDEO FALHA HTTP]', logMsg)

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
      console.log('[WHATSAPP VIDEO EXCECAO HTTP]', errMsg)

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
    let msg = 'Erro interno ao enviar vídeo'
    if (err && err.message) msg = err.message
    console.log('[WHATSAPP VIDEO ERRO INTERNO]', msg)
    return e.json(500, { error: msg, ok: false })
  }
})
