// Hook para enviar lembrete de Auto Leitura RGE via WhatsApp (Z-API) e atualizar status da atividade
routerAdd('POST', '/backend/v1/whatsapp/enviar-lembrete-auto-leitura', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const atividadeId = (body.atividade_id || '').trim()

    if (!atividadeId) {
      return e.json(400, { error: 'atividade_id é obrigatório', ok: false })
    }

    const atvCol = $app.findCollectionByNameOrId('atividades')
    const atvRecord = $app.findRecordById(atvCol.id, atividadeId)
    if (!atvRecord) {
      return e.json(404, { error: 'Atividade não encontrada', ok: false })
    }

    const clienteId = atvRecord.getString('cliente_id')
    if (!clienteId) {
      return e.json(400, {
        error: 'Esta atividade não possui cliente vinculado para envio do WhatsApp.',
        ok: false,
      })
    }

    const clienteCol = $app.findCollectionByNameOrId('clientes')
    const clienteRecord = $app.findRecordById(clienteCol.id, clienteId)
    if (!clienteRecord) {
      return e.json(404, { error: 'Cliente vinculado não encontrado', ok: false })
    }

    // Usina vinculada (se houver)
    let usinaRecord = null
    const usinaId = atvRecord.getString('usina_id')
    if (usinaId) {
      try {
        const usinaCol = $app.findCollectionByNameOrId('usinas')
        usinaRecord = $app.findRecordById(usinaCol.id, usinaId)
      } catch (_) {
        // Ignora se usina não for encontrada
      }
    }

    // Regra do projeto: WhatsApp é o número autoritativo do cliente
    const rawTelefone = (
      clienteRecord.getString('whatsapp') ||
      clienteRecord.getString('telefone') ||
      clienteRecord.getString('telefone_secundario') ||
      ''
    ).trim()

    if (!rawTelefone) {
      return e.json(400, {
        error:
          'Cliente não possui número de WhatsApp cadastrado. Preencha o WhatsApp na Ficha do Cliente antes de enviar.',
        ok: false,
      })
    }

    // Normalizar telefone (apenas dígitos, com DDI 55 caso BR)
    let cleanPhone = rawTelefone.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    // Montar texto EXATO verbatim conforme pedido do usuário:
    // "Olá, boa tarde! Chegou o momento da leitura do seu medidor de energia na instalação da [nome da usina ou cliente], instalação consumidora [número] e endereço [endereço]. Para garantirmos o correto envio das informações à RGE, pedimos que nos encaminhe um vídeo ou fotos do medidor, onde apareçam claramente as seguintes grandezas: 03 – Energia consumida (kWh) e 103 – Energia injetada (kWh). Após o envio das imagens, pedimos também que nos informe por escrito os valores das grandezas 03 e 103, para conferência e validação dos dados antes do envio à RGE."
    const nomeUsinaOuCliente =
      (usinaRecord ? usinaRecord.getString('nome') : '') ||
      clienteRecord.getString('nome') ||
      'sua unidade'

    const numeroInstalacao =
      (usinaRecord ? usinaRecord.getString('uc_codigo') : '') ||
      clienteRecord.getString('uc') ||
      clienteRecord.getString('numero_instalacao') ||
      'não informado'

    const enderecoInstalacao =
      (usinaRecord ? usinaRecord.getString('endereco') : '') ||
      clienteRecord.getString('endereco') ||
      clienteRecord.getString('cidade') ||
      'endereço cadastrado'

    const mensagemTexto =
      `Olá, boa tarde! Chegou o momento da leitura do seu medidor de energia na instalação da ${nomeUsinaOuCliente}, ` +
      `instalação consumidora ${numeroInstalacao} e endereço ${enderecoInstalacao}. ` +
      `Para garantirmos o correto envio das informações à RGE, pedimos que nos encaminhe um vídeo ou fotos do medidor, ` +
      `onde apareçam claramente as seguintes grandezas: 03 – Energia consumida (kWh) e 103 – Energia injetada (kWh). ` +
      `Após o envio das imagens, pedimos também que nos informe por escrito os valores das grandezas 03 e 103, ` +
      `para conferência e validação dos dados antes do envio à RGE.`

    // Obter credenciais Z-API dos Secrets
    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim().replace(/[\r\n\t]/g, '')
    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')

    // Buscar ou criar conversa no CRM
    let conversaId = ''
    try {
      const convCol = $app.findCollectionByNameOrId('whatsapp_conversas')
      const convs = $app.findRecordsByFilter(
        convCol.id,
        `cliente_id = '${clienteId}' || numero = '${cleanPhone}'`,
        '-updated',
        1,
        0,
      )
      if (convs && convs.length > 0) {
        conversaId = convs[0].id
      } else {
        const newConv = new Record(convCol)
        newConv.set('cliente_id', clienteId)
        newConv.set('nome_contato', clienteRecord.getString('nome') || 'Cliente')
        newConv.set('numero', cleanPhone)
        newConv.set('status', 'aguardando_cliente')
        newConv.set('ultima_mensagem_preview', mensagemTexto.substring(0, 100))
        newConv.set('ultima_mensagem_em', new Date().toISOString())
        newConv.set('nao_lidas', 0)
        if (authUser) {
          newConv.set('atendente', authUser.getString('name') || 'Atendente')
          newConv.set('atendente_id', authUser.id)
        }
        $app.save(newConv)
        conversaId = newConv.id
      }
    } catch (errConv) {
      console.log('[LEMBRETE AUTO LEITURA] Aviso ao obter conversa:', errConv)
    }

    // Criar registro de mensagem na collection whatsapp_mensagens
    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    const msgRecord = new Record(msgsCol)
    msgRecord.set('cliente_id', clienteId)
    if (conversaId) msgRecord.set('conversa_id', conversaId)
    msgRecord.set('telefone_destino', cleanPhone)
    msgRecord.set('conteudo_final', mensagemTexto)
    msgRecord.set('tipo_disparo', 'lembrete_auto_leitura')
    msgRecord.set('direcao', 'enviada')
    msgRecord.set('referencia_id', atividadeId)

    // Se Z-API não estiver configurada nos Secrets:
    if (!rawApiUrl) {
      msgRecord.set('status', 'falha')
      msgRecord.set(
        'log_erro',
        'Z-API não configurada: adicione WHATSAPP_API_URL e WHATSAPP_API_KEY aos Secrets do backend no Skip Cloud.',
      )
      $app.save(msgRecord)

      return e.json(200, {
        ok: false,
        gatewayConfigured: false,
        sent: false,
        error:
          'Z-API não configurada. Cadastre as credenciais Z-API (WHATSAPP_API_URL e WHATSAPP_API_KEY) nos Secrets do Skip Cloud.',
        message: 'Z-API não configurada. Cadastre as credenciais Z-API nos Secrets do Skip Cloud.',
        data: msgRecord,
      })
    }

    // Chamar gateway Z-API
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

    if (isZApi) {
      const baseWithoutSuffix = cleanUrl.replace(/\/+send-text\/?$/i, '').replace(/\/+$/, '')
      const zapiMatch = baseWithoutSuffix.match(
        /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
      )
      if (zapiMatch) {
        const hostPrefix = zapiMatch[1]
        const instanceId = zapiMatch[2]
        const token = zapiMatch[3]
        targetUrl = hostPrefix + '/instances/' + instanceId + '/token/' + token + '/send-text'
      } else {
        targetUrl = baseWithoutSuffix + '/send-text'
      }

      if (apiKey) {
        headers['Client-Token'] = apiKey
      }

      payloadGateway = {
        phone: cleanPhone,
        message: mensagemTexto,
      }
    } else {
      // Gateway alternativo/genérico
      if (apiKey) {
        headers['apikey'] = apiKey
        headers['Authorization'] = 'Bearer ' + apiKey
      }
      payloadGateway = {
        phone: cleanPhone,
        message: mensagemTexto,
      }
    }

    let envioSucesso = false
    let erroDetalhado = ''

    try {
      const res = $http.send({
        url: targetUrl,
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payloadGateway),
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        envioSucesso = true
        let externalId = ''
        try {
          if (res.json) {
            if (res.json.messageId) externalId = String(res.json.messageId)
            else if (res.json.id) externalId = String(res.json.id)
            else if (res.json.zaapId) externalId = String(res.json.zaapId)
          }
        } catch (_) {}

        msgRecord.set('status', 'enviada')
        msgRecord.set('enviado_em', new Date().toISOString())
        if (externalId) msgRecord.set('id_externo_gateway', externalId)
        msgRecord.set('log_erro', '')
        $app.save(msgRecord)
      } else {
        const errorText = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
        erroDetalhado = `Falha no gateway Z-API (${res.statusCode}): ${errorText}`
        msgRecord.set('status', 'falha')
        msgRecord.set('log_erro', erroDetalhado)
        $app.save(msgRecord)
      }
    } catch (httpErr) {
      erroDetalhado = 'Erro de conexão com Z-API: ' + (httpErr.message || String(httpErr))
      msgRecord.set('status', 'falha')
      msgRecord.set('log_erro', erroDetalhado)
      $app.save(msgRecord)
    }

    if (!envioSucesso) {
      return e.json(200, {
        ok: false,
        gatewayConfigured: true,
        sent: false,
        error: erroDetalhado || 'Falha ao enviar mensagem via Z-API',
        message: erroDetalhado || 'Falha ao enviar mensagem via Z-API',
        data: msgRecord,
      })
    }

    // Se enviado com sucesso, atualiza a atividade marcando a data de envio do lembrete
    const agoraIso = new Date().toISOString()
    atvRecord.set('lembrete_whatsapp_enviado_em', agoraIso)

    // Atualiza também dentro de auto_leitura_dados se existir para compatibilidade
    try {
      let autoLeituraDados = atvRecord.get('auto_leitura_dados') || {}
      if (typeof autoLeituraDados === 'string') {
        try {
          autoLeituraDados = JSON.parse(autoLeituraDados)
        } catch (_) {
          autoLeituraDados = {}
        }
      }
      autoLeituraDados.lembrete_whatsapp_enviado_em = agoraIso
      atvRecord.set('auto_leitura_dados', autoLeituraDados)
    } catch (_) {}

    $app.save(atvRecord)

    // Atualiza preview da conversa
    if (conversaId) {
      try {
        const convCol = $app.findCollectionByNameOrId('whatsapp_conversas')
        const convRecord = $app.findRecordById(convCol.id, conversaId)
        if (convRecord) {
          convRecord.set('status', 'aguardando_cliente')
          convRecord.set('ultima_mensagem_preview', mensagemTexto.substring(0, 100))
          convRecord.set('ultima_mensagem_em', agoraIso)
          $app.save(convRecord)
        }
      } catch (_) {}
    }

    return e.json(200, {
      ok: true,
      gatewayConfigured: true,
      sent: true,
      mensagem: mensagemTexto,
      telefone_destino: cleanPhone,
      lembrete_whatsapp_enviado_em: agoraIso,
      atividade: atvRecord,
      message: 'Lembrete enviado via WhatsApp com sucesso!',
    })
  } catch (err) {
    const msg = err && err.message ? err.message : String(err)
    console.log('[WHATSAPP ENVIAR LEMBRETE AUTO LEITURA ERRO]', msg)
    return e.json(500, { error: msg, ok: false })
  }
})
