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

    // TRAVA DE DEDUPLICAÇÃO E IDEMPOTÊNCIA:
    // Se a própria atividade já teve lembrete enviado, rejeita reenvio
    const jaEnviadoAtv = atvRecord.getString('lembrete_whatsapp_enviado_em')
    if (jaEnviadoAtv) {
      return e.json(400, {
        ok: false,
        error: `Lembrete já enviado para esta atividade em ${jaEnviadoAtv}. Reenvio duplicado bloqueado.`,
        lembrete_whatsapp_enviado_em: jaEnviadoAtv,
      })
    }

    // Se possui atividade mãe (parent_id), verificar se a mãe ou qualquer atividade irmã
    // da mesma mãe, mesma UC e mesma data_leitura já teve lembrete enviado
    const parentIdAtv = atvRecord.getString('parent_id')
    const ucAtv = (atvRecord.getString('numero_uc') || '').trim()
    const rawDataLeituraAtv = (
      atvRecord.getString('data_leitura') ||
      atvRecord.getString('data_vencimento') ||
      ''
    ).trim()
    const dataLeituraYmd = rawDataLeituraAtv ? rawDataLeituraAtv.substring(0, 10) : ''

    if (parentIdAtv) {
      try {
        const maeRecord = $app.findRecordById(atvCol.id, parentIdAtv)
        if (maeRecord && maeRecord.getString('lembrete_whatsapp_enviado_em')) {
          return e.json(400, {
            ok: false,
            error: `Lembrete de auto leitura já enviado anteriormente na atividade principal (ID: ${parentIdAtv}).`,
            lembrete_whatsapp_enviado_em: maeRecord.getString('lembrete_whatsapp_enviado_em'),
          })
        }

        let filtroIrmas = `parent_id = '${parentIdAtv}' && id != '${atvRecord.id}' && lembrete_whatsapp_enviado_em != ''`
        if (dataLeituraYmd) {
          filtroIrmas += ` && data_leitura ~ '${dataLeituraYmd}'`
        }
        const irmasJaEnviadas = $app.findRecordsByFilter(
          'atividades',
          filtroIrmas,
          '-created',
          10,
          0,
        )
        for (let im = 0; im < irmasJaEnviadas.length; im++) {
          const irma = irmasJaEnviadas[im]
          const ucIrma = (irma.getString('numero_uc') || '').trim()
          if (!ucAtv || !ucIrma || ucAtv === ucIrma) {
            const enviadaEm = irma.getString('lembrete_whatsapp_enviado_em')
            return e.json(400, {
              ok: false,
              error: `Lembrete já enviado para a atividade irmã ${irma.id} da mesma leitura (UC: ${ucIrma || 'N/A'}, data: ${dataLeituraYmd || 'N/A'}) em ${enviadaEm}. Envio duplicado impedido.`,
              lembrete_whatsapp_enviado_em: enviadaEm,
            })
          }
        }
      } catch (errDedup) {
        console.log('[whatsapp_enviar_lembrete] erro ao checar deduplicação de irmãs:', errDedup)
      }
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

    // Destino: aceita telefone_destino opcional enviado do modal de conferência
    const rawTelefoneEnviado = (body.telefone_destino || '').trim()

    // Ordem de resolução exata:
    // 1. Telefone enviado explicitamente (se fornecido)
    // 2. WhatsApp cadastrado no cliente
    // 3. WhatsApp de contato adicional vinculado com is_whatsapp = true
    // 4. Telefone do cliente
    let rawTelefone = rawTelefoneEnviado
    if (!rawTelefone) {
      const cliWhats = (clienteRecord.getString('whatsapp') || '').trim()
      const cliTelefone = (
        clienteRecord.getString('telefone') ||
        clienteRecord.getString('telefone_secundario') ||
        ''
      ).trim()

      if (cliWhats && cliWhats.replace(/\D/g, '').length >= 10) {
        rawTelefone = cliWhats
      } else {
        // Buscar contatos adicionais com is_whatsapp = true
        try {
          const contatos = $app.findRecordsByFilter(
            'contatos_adicionais',
            `cliente = '${clienteRecord.id}' && is_whatsapp = true`,
            '-created',
            10,
            0,
          )
          for (let i = 0; i < contatos.length; i++) {
            const telC = (contatos[i].getString('telefone') || '').trim()
            if (telC.replace(/\D/g, '').length >= 10) {
              rawTelefone = telC
              break
            }
          }
        } catch (eContatos) {
          console.log(
            '[whatsapp_enviar_lembrete] erro ao consultar contatos_adicionais:',
            eContatos,
          )
        }

        // Se ainda não tiver, tenta o telefone do cliente
        if (!rawTelefone && cliTelefone && cliTelefone.replace(/\D/g, '').length >= 10) {
          rawTelefone = cliTelefone
        }
      }
    }

    if (!rawTelefone || rawTelefone.replace(/\D/g, '').length < 10) {
      return e.json(400, {
        ok: false,
        error:
          'Envio não realizado: o cliente não possui WhatsApp, contato adicional com WhatsApp ou telefone cadastrado. Atualize o cadastro antes de enviar.',
      })
    }
    // Normalizar telefone (apenas dígitos, com DDI 55 caso BR)
    let cleanPhone = rawTelefone.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    // Se o telefone foi editado no modal e é válido, mantém a autoridade do WhatsApp atualizando cliente
    if (rawTelefoneEnviado && rawTelefoneEnviado !== clienteRecord.getString('whatsapp')) {
      try {
        clienteRecord.set('whatsapp', rawTelefoneEnviado)
        $app.save(clienteRecord)
      } catch (_) {}
    }

    // Montar dados para interpolação segura com fallback
    const nomeClienteResolvido = (clienteRecord.getString('nome') || 'Cliente').trim()

    const nomeUsinaOuCliente =
      (usinaRecord ? usinaRecord.getString('nome') : '') ||
      atvRecord.getString('usina_nome') ||
      clienteRecord.getString('nome') ||
      'Usina cadastrada'

    const numeroInstalacao =
      atvRecord.getString('numero_uc') ||
      (usinaRecord
        ? usinaRecord.getString('numero_uc') || usinaRecord.getString('uc_codigo')
        : '') ||
      clienteRecord.getString('uc') ||
      clienteRecord.getString('numero_instalacao') ||
      'Não informada'

    let enderecoInstalacao = ''
    if (usinaRecord && usinaRecord.getString('endereco')) {
      const partesU = [
        usinaRecord.getString('endereco'),
        usinaRecord.getString('numero'),
        usinaRecord.getString('bairro'),
        usinaRecord.getString('cidade'),
      ].filter(Boolean)
      enderecoInstalacao = partesU.join(', ') || usinaRecord.getString('endereco')
    }
    if (!enderecoInstalacao) {
      const rawNum = (clienteRecord.getString('numero') || '').trim()
      const numFmt = rawNum && rawNum.toUpperCase() !== 'S/N' ? `nº ${rawNum}` : ''
      const partes = [
        clienteRecord.getString('endereco'),
        numFmt,
        clienteRecord.getString('bairro'),
        clienteRecord.getString('cidade'),
      ].filter(Boolean)
      enderecoInstalacao =
        partes.join(', ') || clienteRecord.getString('cidade') || 'Endereço cadastrado'
    }

    // Resolver data de leitura formatada em DD/MM/AAAA (respeitando fuso de São Paulo)
    const rawDataLeituraStr =
      atvRecord.getString('data_leitura') ||
      atvRecord.getString('data_vencimento') ||
      atvRecord.getString('data_inicio') ||
      atvRecord.getString('data') ||
      ''
    let dataFormatada = ''
    if (rawDataLeituraStr) {
      try {
        let ymd = rawDataLeituraStr.substring(0, 10)
        if (rawDataLeituraStr.length > 10) {
          const dUtc = new Date(rawDataLeituraStr)
          if (!isNaN(dUtc.getTime())) {
            const spMs = dUtc.getTime() - 3 * 60 * 60 * 1000
            const spDate = new Date(spMs)
            const y = spDate.getUTCFullYear()
            const m = String(spDate.getUTCMonth() + 1).padStart(2, '0')
            const day = String(spDate.getUTCDate()).padStart(2, '0')
            ymd = `${y}-${m}-${day}`
          }
        }
        const partesDt = ymd.split('-')
        if (partesDt.length === 3) {
          dataFormatada = `${partesDt[2]}/${partesDt[1]}/${partesDt[0]}`
        }
      } catch (_) {}
    }
    if (!dataFormatada) {
      const agoraD = new Date(Date.now() - 3 * 60 * 60 * 1000)
      dataFormatada = `${String(agoraD.getUTCDate()).padStart(2, '0')}/${String(agoraD.getUTCMonth() + 1).padStart(2, '0')}/${agoraD.getUTCFullYear()}`
    }

    // Template no banco se existir
    let tplLeitura = null
    try {
      tplLeitura = $app.findFirstRecordByData(
        'whatsapp_templates',
        'slug',
        'lembrete_auto_leitura_rge',
      )
    } catch (_) {}

    const mensagemPersonalizada = (body.mensagem_personalizada || body.mensagem || '').trim()
    const rawTextoParaEnviar =
      mensagemPersonalizada ||
      atvRecord.getString('mensagem_cliente') ||
      (tplLeitura && tplLeitura.getString('conteudo')) ||
      `Olá, {{nome_cliente}}! Chegou o momento da leitura do medidor de energia na usina {{usina}}, instalação consumidora {{numero_uc}} e endereço {{endereco}}. A leitura referente a {{data}} é fundamental para garantirmos o correto envio à RGE. Pedimos que nos encaminhe foto ou vídeo nítido do medidor com as grandezas 03 (consumo kWh) e 103 (injeção kWh), e em seguida nos informe os valores por escrito para validação.`

    // OBRIGATÓRIO: passar pela função central whatsapp_template_vars.js
    // NUNCA deixar variáveis cruas como {{usina}}, {{numero_uc}}, {{endereco}}, {{data}}
    let mensagemTexto = rawTextoParaEnviar
    try {
      const tplHelper = require(`${__hooks}/whatsapp_template_vars.js`)
      mensagemTexto = tplHelper.interpolarTemplate(rawTextoParaEnviar, {
        nome_cliente: nomeClienteResolvido,
        cliente_nome: nomeClienteResolvido,
        usina: nomeUsinaOuCliente,
        nome_usina: nomeUsinaOuCliente,
        numero_uc: numeroInstalacao,
        uc: numeroInstalacao,
        endereco: enderecoInstalacao,
        data: dataFormatada,
        data_leitura: dataFormatada,
        empresa: 'Delfos Solar',
      })
    } catch (eTpl) {
      console.log('[whatsapp_enviar_lembrete] erro ao interpolar via whatsapp_template_vars:', eTpl)
      mensagemTexto = rawTextoParaEnviar
        .replace(/\{\{nome_cliente\}\}/g, nomeClienteResolvido)
        .replace(/\{\{cliente_nome\}\}/g, nomeClienteResolvido)
        .replace(/\{\{usina\}\}/g, nomeUsinaOuCliente)
        .replace(/\{\{nome_usina\}\}/g, nomeUsinaOuCliente)
        .replace(/\{\{numero_uc\}\}/g, numeroInstalacao)
        .replace(/\{\{uc\}\}/g, numeroInstalacao)
        .replace(/\{\{endereco\}\}/g, enderecoInstalacao)
        .replace(/\{\{data\}\}/g, dataFormatada)
        .replace(/\{\{data_leitura\}\}/g, dataFormatada)
    }

    // Limpeza final de segurança para garantir que nenhum placeholder cru reste
    mensagemTexto = mensagemTexto
      .replace(/\{\{nome_cliente\}\}/g, nomeClienteResolvido)
      .replace(/\{\{usina\}\}/g, nomeUsinaOuCliente)
      .replace(/\{\{numero_uc\}\}/g, numeroInstalacao)
      .replace(/\{\{endereco\}\}/g, enderecoInstalacao)
      .replace(/\{\{data\}\}/g, dataFormatada)

    // Obter credenciais Z-API dos Secrets
    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim().replace(/[\r\n\t]/g, '')
    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')

    // Buscar ou criar conversa no CRM
    let conversaId = ''
    try {
      const helper = require(`${__hooks}/whatsapp_conversa_helper.js`)
      const conv = helper.ensureConversaForMessage(
        $app,
        clienteId,
        cleanPhone,
        mensagemTexto,
        authUser,
      )
      if (conv) {
        conversaId = conv.id
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

    // Se enviado com sucesso, atualiza a atividade marcando a data de envio do lembrete e o status para "enviado"
    const agoraIso = new Date().toISOString()
    atvRecord.set('lembrete_whatsapp_enviado_em', agoraIso)
    atvRecord.set('status', 'enviado')

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
