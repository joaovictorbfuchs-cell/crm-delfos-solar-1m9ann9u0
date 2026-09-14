// Hook para envio de áudio por WhatsApp via Z-API /send-audio
routerAdd('POST', '/backend/v1/whatsapp/enviar-audio', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const clienteId = (body.cliente_id || '').trim()
    const conversaId = (body.conversa_id || '').trim()
    const telefoneDestino = (body.telefone_destino || '').trim()
    const audioData = (body.audio || body.base64 || body.audio_url || '').trim()
    const duracaoSegundos = Number(body.duracao_segundos || 0)
    const referenciaId = (body.referencia_id || '').trim()

    if (!telefoneDestino) {
      return e.json(400, { error: 'Telefone de destino é obrigatório', ok: false })
    }
    if (!audioData) {
      return e.json(400, { error: 'Arquivo ou base64 de áudio é obrigatório', ok: false })
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
    const msgRecord = new Record(msgsCol)
    if (finalClienteId) msgRecord.set('cliente_id', finalClienteId)
    if (conversaId) msgRecord.set('conversa_id', conversaId)
    msgRecord.set('telefone_destino', telefoneDestino)

    const duracaoFormatada =
      duracaoSegundos > 0
        ? `${Math.floor(duracaoSegundos / 60)}:${String(duracaoSegundos % 60).padStart(2, '0')}`
        : ''
    const audioDescricao = duracaoFormatada ? `Áudio (${duracaoFormatada})` : 'Áudio gravado'

    msgRecord.set('conteudo_final', audioDescricao)
    msgRecord.set('tipo_disparo', 'manual')
    msgRecord.set('tipo_mensagem', 'audio')
    msgRecord.set('direcao', 'enviada')
    // Se audioData for data URL ou URL, salvar para reprodução se suportado
    if (audioData.startsWith('data:audio') || audioData.startsWith('http')) {
      msgRecord.set('documento_url', audioData)
    }
    if (referenciaId) msgRecord.set('referencia_id', referenciaId)

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

      // Registrar atividade no histórico de contatos do cliente se houver clienteId
      if (finalClienteId) {
        try {
          const atvCol = $app.findCollectionByNameOrId('atividades')
          const atvRec = new Record(atvCol)
          atvRec.set('cliente_id', finalClienteId)
          atvRec.set('tipo', 'follow_up')
          atvRec.set('titulo', 'Áudio por WhatsApp (Falha de Envio)')
          atvRec.set(
            'descricao',
            `Destino: ${telefoneDestino}\nDuração: ${duracaoFormatada || 'N/A'}\nStatus: falha (gateway não configurado)\nMotivo: ${logErro}`,
          )
          atvRec.set('data', new Date().toISOString())
          atvRec.set('status', 'pendente')
          atvRec.set('autor', autorNome)
          $app.save(atvRec)
        } catch (errAtv) {
          console.log('[ATV ERRO AUDIO]', errAtv)
        }
      }

      return e.json(200, {
        ok: true,
        gatewayConfigured: false,
        sent: false,
        status: 'falha',
        message:
          'Áudio registrado no histórico como "falha", pois os Secrets WHATSAPP_API_URL e WHATSAPP_API_KEY não foram preenchidos.',
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

    if (isZApi) {
      // Remover qualquer sufixo /send-text, /send-document, /send-audio do final
      let baseWithoutSuffix = cleanUrl
        .replace(/\/+send-text\/?$/i, '')
        .replace(/\/+send-document(\/[^/?#]+)?\/?$/i, '')
        .replace(/\/+send-audio\/?$/i, '')
        .replace(/\/+$/, '')

      const zapiMatch = baseWithoutSuffix.match(
        /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
      )

      if (zapiMatch) {
        const hostPrefix = zapiMatch[1]
        const instanceId = zapiMatch[2]
        const token = zapiMatch[3]
        targetUrl = hostPrefix + '/instances/' + instanceId + '/token/' + token + '/send-audio'
      } else {
        targetUrl = baseWithoutSuffix + '/send-audio'
      }

      if (apiKey) {
        headers['Client-Token'] = apiKey
      }

      payloadGateway = {
        phone: cleanPhone,
        audio: audioData,
        waveform: true, // Habilita exibição de onda sonora (recado de voz) no WhatsApp
      }
    } else {
      // Gateway Genérico / Evolution API
      targetUrl = cleanUrl.replace(/\/+$/, '') + '/send-audio'
      if (apiKey) {
        headers['apikey'] = apiKey
        headers['Authorization'] = 'Bearer ' + apiKey
      }

      payloadGateway = {
        number: cleanPhone,
        phone: cleanPhone,
        audio: audioData,
        sender: originNumber,
      }
    }

    let maskedTarget = targetUrl.replace(/\/token\/[^/?#]+/i, '/token/••••••••')
    console.log(
      '[WHATSAPP AUDIO SEND INICIADO]',
      JSON.stringify({
        targetUrlMasked: maskedTarget,
        cleanPhone: cleanPhone,
        audioDataLength: audioData.length,
        isZApi: isZApi,
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
        '[WHATSAPP AUDIO SEND RESPOSTA]',
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

        // Atualizar conversa se fornecida
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
              convRec.set('ultima_mensagem_preview', `🎤 ${audioDescricao}`)
              convRec.set('ultima_mensagem_em', new Date().toISOString())
              convRec.set('nao_lidas', 0)
              if (authUser && !convRec.getString('atendente')) {
                convRec.set('atendente', authUser.getString('name') || 'Atendente')
                convRec.set('atendente_id', authUser.id)
              }
              $app.save(convRec)
            }
          } catch (errConv) {
            console.log('[CONV UPDATE AUDIO AVISO]', errConv)
          }
        }

        // Registrar atividade no histórico de contatos do cliente
        if (finalClienteId) {
          try {
            const atvCol = $app.findCollectionByNameOrId('atividades')
            const atvRec = new Record(atvCol)
            atvRec.set('cliente_id', finalClienteId)
            atvRec.set('tipo', 'follow_up')
            atvRec.set('titulo', 'Áudio enviado por WhatsApp')
            atvRec.set(
              'descricao',
              `Áudio enviado para ${telefoneDestino}.\nDuração: ${duracaoFormatada || 'N/A'}\nStatus: enviada`,
            )
            atvRec.set('data', new Date().toISOString())
            atvRec.set('status', 'concluida')
            atvRec.set('autor', autorNome)
            $app.save(atvRec)
          } catch (errAtv) {
            console.log('[ATV ERRO AUDIO SUCESSO]', errAtv)
          }
        }

        return e.json(200, {
          ok: true,
          gatewayConfigured: true,
          sent: true,
          status: 'enviada',
          message: 'Mensagem de voz enviada com sucesso ao WhatsApp do cliente!',
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
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          contextualHint = ' (Acesso não autorizado ou trial expirado na Z-API)'
        }

        const logMsg = `Gateway retornou erro HTTP ${res.statusCode}: ${errorText}${contextualHint}`
        console.log('[WHATSAPP AUDIO FALHA HTTP]', logMsg)

        msgRecord.set('status', 'falha')
        msgRecord.set('log_erro', logMsg)
        $app.save(msgRecord)

        // Registrar atividade na timeline indicando a tentativa com falha
        if (finalClienteId) {
          try {
            const atvCol = $app.findCollectionByNameOrId('atividades')
            const atvRec = new Record(atvCol)
            atvRec.set('cliente_id', finalClienteId)
            atvRec.set('tipo', 'follow_up')
            atvRec.set('titulo', 'Áudio por WhatsApp (Falha de Envio)')
            atvRec.set(
              'descricao',
              `Destino: ${telefoneDestino}\nDuração: ${duracaoFormatada || 'N/A'}\nMotivo: ${logMsg}`,
            )
            atvRec.set('data', new Date().toISOString())
            atvRec.set('status', 'pendente')
            atvRec.set('autor', autorNome)
            $app.save(atvRec)
          } catch (errAtv) {
            console.log('[ATV ERRO AUDIO FALHA]', errAtv)
          }
        }

        return e.json(200, {
          ok: true,
          gatewayConfigured: true,
          sent: false,
          status: 'falha',
          message: `Falha no retorno do WhatsApp Z-API (${res.statusCode}): ${errorText}${contextualHint}`,
          data: msgRecord,
        })
      }
    } catch (httpErr) {
      const errMsg = httpErr && httpErr.message ? httpErr.message : String(httpErr)
      console.log('[WHATSAPP AUDIO EXCECAO HTTP]', errMsg)

      msgRecord.set('status', 'falha')
      msgRecord.set('log_erro', 'Erro de conexão com gateway: ' + errMsg)
      $app.save(msgRecord)

      if (finalClienteId) {
        try {
          const atvCol = $app.findCollectionByNameOrId('atividades')
          const atvRec = new Record(atvCol)
          atvRec.set('cliente_id', finalClienteId)
          atvRec.set('tipo', 'follow_up')
          atvRec.set('titulo', 'Áudio por WhatsApp (Erro de Conexão)')
          atvRec.set('descricao', `Destino: ${telefoneDestino}\nErro de rede/conexão: ${errMsg}`)
          atvRec.set('data', new Date().toISOString())
          atvRec.set('status', 'pendente')
          atvRec.set('autor', autorNome)
          $app.save(atvRec)
        } catch (_) {}
      }

      return e.json(200, {
        ok: true,
        gatewayConfigured: true,
        sent: false,
        status: 'falha',
        message: 'Erro de conexão com o gateway WhatsApp: ' + errMsg,
        data: msgRecord,
      })
    }
  } catch (err) {
    let msg = 'Erro interno ao processar envio de áudio'
    if (err && err.message) msg = err.message
    console.log('[WHATSAPP AUDIO ERRO INTERNO]', msg)
    return e.json(500, { error: msg, ok: false })
  }
})
