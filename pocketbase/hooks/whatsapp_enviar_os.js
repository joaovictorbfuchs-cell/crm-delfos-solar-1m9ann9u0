// Hook para disparo manual de notificação de Ordem de Serviço (OS) para o instalador responsável via WhatsApp (Z-API)
// Endpoint: POST /backend/v1/whatsapp/enviar-os
// Autenticação obrigatória (somente administradores ou usuários logados autorizados)

routerAdd('POST', '/backend/v1/whatsapp/enviar-os', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const osId = (body.os_id || '').trim()

    if (!osId) {
      return e.json(400, { error: 'os_id é obrigatório', ok: false })
    }

    // Buscar a Ordem de Serviço
    let osRec = null
    try {
      osRec = $app.findRecordsByFilter('ordens_servico', "id = '" + osId + "'", '', 1, 0)[0]
    } catch (_) {}

    if (!osRec) {
      return e.json(404, { error: 'Ordem de serviço não encontrada', ok: false })
    }

    const responsavelId = osRec.getString('responsavel_usuario_id')
    if (!responsavelId) {
      return e.json(400, {
        error:
          'Esta OS não possui um instalador responsável atribuído. Atribua um técnico antes de enviar.',
        ok: false,
        code: 'SEM_RESPONSAVEL',
      })
    }

    // Buscar dados do instalador (usuário no PocketBase)
    let userRec = null
    try {
      userRec = $app.findRecordsByFilter(
        '_pb_users_auth_',
        "id = '" + responsavelId + "'",
        '',
        1,
        0,
      )[0]
    } catch (_) {}

    if (!userRec) {
      return e.json(404, {
        error: 'Usuário responsável não encontrado no sistema.',
        ok: false,
        code: 'USUARIO_NAO_ENCONTRADO',
      })
    }

    const instaladorNome = userRec.getString('name') || 'Instalador'
    const instaladorTelefone = (userRec.getString('phone') || '').trim()

    if (!instaladorTelefone) {
      return e.json(400, {
        error:
          'O técnico ' +
          instaladorNome +
          ' não possui número de WhatsApp cadastrado. Cadastre o telefone do técnico em Gerenciar Usuários antes de enviar.',
        ok: false,
        code: 'SEM_TELEFONE',
        tecnico_nome: instaladorNome,
      })
    }

    // Buscar dados do cliente
    let clienteNome = 'Cliente Solar'
    let clienteEndereco = osRec.getString('endereco') || ''
    const clienteId = osRec.getString('cliente_id')
    if (clienteId) {
      try {
        const clienteRec = $app.findRecordsByFilter(
          'clientes',
          "id = '" + clienteId + "'",
          '',
          1,
          0,
        )[0]
        if (clienteRec) {
          clienteNome =
            clienteRec.getString('nome') || clienteRec.getString('razao_social') || clienteNome
          if (!clienteEndereco) {
            clienteEndereco = [
              clienteRec.getString('endereco'),
              clienteRec.getString('numero'),
              clienteRec.getString('bairro'),
              clienteRec.getString('cidade'),
            ]
              .filter(Boolean)
              .join(', ')
          }
        }
      } catch (_) {}
    }

    if (!clienteEndereco) {
      clienteEndereco = 'Endereço a confirmar no CRM'
    }

    // Formatar data agendada (ex: dd/mm/aaaa)
    const rawDataAgendada = osRec.getString('data_agendada')
    let dataFormatada = 'A definir'
    if (rawDataAgendada) {
      try {
        const d = new Date(rawDataAgendada)
        if (!isNaN(d.getTime())) {
          const dia = String(d.getUTCDate()).padStart(2, '0')
          const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
          const ano = d.getUTCFullYear()
          dataFormatada = dia + '/' + mes + '/' + ano
        }
      } catch (_) {
        dataFormatada = rawDataAgendada.slice(0, 10)
      }
    }

    const tipoServico = osRec.getString('tipo_servico') || 'Manutenção'

    // Template ou mensagem padrão idêntica à do hook automático
    let tpl = null
    try {
      tpl = $app.findFirstRecordByData('whatsapp_templates', 'slug', 'os_atribuida_instalador')
    } catch (_) {}

    let conteudo =
      tpl && tpl.getString('conteudo')
        ? tpl.getString('conteudo')
        : '📋 *Nova Ordem de Serviço atribuída*\n👤 Cliente: {{nome_cliente}}\n🔧 Serviço: {{tipo_servico}}\n📍 Endereço: {{endereco}}\n📅 Data: {{data_agendada}}\n\nAcesse o CRM para ver a ficha de execução.'

    conteudo = conteudo
      .replace(/\{\{nome_cliente\}\}/g, clienteNome)
      .replace(/\{\{tipo_servico\}\}/g, tipoServico)
      .replace(/\{\{endereco\}\}/g, clienteEndereco)
      .replace(/\{\{data_agendada\}\}/g, dataFormatada)
      .replace(/\{\{nome_instalador\}\}/g, instaladorNome)
      .replace(/\{\{id_os\}\}/g, osId)

    // Referência única para reenvio manual: inclui timestamp para nunca colidir e nunca ser bloqueada por deduplicação
    const manualRefKey = 'os_manual_' + osId + '_' + responsavelId + '_' + new Date().getTime()

    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    const novaMsg = new Record(msgsCol)
    if (clienteId) novaMsg.set('cliente_id', clienteId)
    if (tpl) novaMsg.set('template_id', tpl.id)
    novaMsg.set('telefone_destino', instaladorTelefone)
    novaMsg.set('conteudo_final', conteudo)
    novaMsg.set('tipo_disparo', 'manual')
    novaMsg.set('referencia_id', manualRefKey)
    novaMsg.set('direcao', 'enviada')

    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim().replace(/[\r\n\t]/g, '')
    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')
    let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim().replace(/[\r\n\t]/g, '')

    let cleanPhone = instaladorTelefone.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    if (!rawApiUrl) {
      console.log('[WHATSAPP ENVIAR OS MANUAL] Gateway não configurado (WHATSAPP_API_URL ausente).')
      novaMsg.set('status', 'falha')
      novaMsg.set(
        'log_erro',
        'Gateway não configurado nos Secrets do backend (WHATSAPP_API_URL e WHATSAPP_API_KEY).',
      )
      $app.save(novaMsg)

      return e.json(200, {
        ok: true,
        sent: false,
        gatewayConfigured: false,
        status: 'falha',
        message:
          'Gateway WhatsApp não configurado nos Secrets do sistema. Mensagem registrada como falha.',
        destinatario: {
          nome: instaladorNome,
          telefone: instaladorTelefone,
        },
        data: novaMsg,
      })
    }

    try {
      let cleanUrl = rawApiUrl.replace(/\/+$/, '')
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl
      }

      const lowerUrl = cleanUrl.toLowerCase()
      const isZApi = lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1
      let targetUrl = cleanUrl
      let payloadGateway = {}
      const headers = { 'Content-Type': 'application/json' }

      if (isZApi) {
        let baseWithoutSuffix = cleanUrl.replace(/\/+send-text\/?$/i, '').replace(/\/+$/, '')
        const zapiMatch = baseWithoutSuffix.match(
          /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
        )
        if (zapiMatch) {
          targetUrl =
            zapiMatch[1] + '/instances/' + zapiMatch[2] + '/token/' + zapiMatch[3] + '/send-text'
        } else {
          targetUrl = baseWithoutSuffix + '/send-text'
        }

        if (apiKey) {
          headers['Client-Token'] = apiKey
        }
        payloadGateway = {
          phone: cleanPhone,
          message: conteudo,
        }
      } else {
        if (apiKey) {
          headers['apikey'] = apiKey
          headers['Authorization'] = 'Bearer ' + apiKey
          headers['X-Api-Key'] = apiKey
        }
        payloadGateway = {
          number: cleanPhone,
          phone: cleanPhone,
          message: conteudo,
          text: conteudo,
          sender: originNumber,
        }
      }

      console.log(
        '[WHATSAPP ENVIAR OS MANUAL ENVIANDO]',
        JSON.stringify({
          osId: osId,
          instalador: instaladorNome,
          phone: cleanPhone,
          targetUrl: targetUrl.replace(/\/token\/[^/?#]+/i, '/token/••••••••'),
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
        '[WHATSAPP ENVIAR OS MANUAL RESPOSTA]',
        JSON.stringify({
          statusCode: res.statusCode,
          osId: osId,
          hasRaw: Boolean(res.raw),
        }),
      )

      if (res.statusCode >= 200 && res.statusCode < 300) {
        let extId = ''
        try {
          if (res.json) {
            if (res.json.messageId) extId = String(res.json.messageId)
            else if (res.json.id) extId = String(res.json.id)
            else if (res.json.zaapId) extId = String(res.json.zaapId)
            else if (res.json.key && res.json.key.id) extId = String(res.json.key.id)
          }
        } catch (_) {}
        novaMsg.set('status', 'enviada')
        novaMsg.set('enviado_em', new Date().toISOString())
        if (extId) novaMsg.set('id_externo_gateway', extId)
        novaMsg.set('log_erro', '')
        $app.save(novaMsg)

        return e.json(200, {
          ok: true,
          sent: true,
          gatewayConfigured: true,
          status: 'enviada',
          message:
            'Ordem de Serviço enviada com sucesso para o WhatsApp de ' + instaladorNome + '!',
          destinatario: {
            nome: instaladorNome,
            telefone: instaladorTelefone,
          },
          data: novaMsg,
        })
      } else {
        const errStr = res.raw ? res.raw.substring(0, 300) : 'HTTP ' + res.statusCode
        novaMsg.set('status', 'falha')
        novaMsg.set('log_erro', 'Gateway HTTP ' + res.statusCode + ': ' + errStr)
        $app.save(novaMsg)

        return e.json(200, {
          ok: true,
          sent: false,
          gatewayConfigured: true,
          status: 'falha',
          message: 'Falha no gateway WhatsApp (' + res.statusCode + '): ' + errStr,
          destinatario: {
            nome: instaladorNome,
            telefone: instaladorTelefone,
          },
          data: novaMsg,
        })
      }
    } catch (sendErr) {
      const errDetail = sendErr && sendErr.message ? sendErr.message : String(sendErr)
      console.log('[WHATSAPP ENVIAR OS MANUAL ERRO DE ENVIO]', errDetail)
      novaMsg.set('status', 'falha')
      novaMsg.set('log_erro', String(errDetail))
      $app.save(novaMsg)

      return e.json(200, {
        ok: true,
        sent: false,
        gatewayConfigured: true,
        status: 'falha',
        message: 'Erro de conexão com gateway WhatsApp: ' + errDetail,
        destinatario: {
          nome: instaladorNome,
          telefone: instaladorTelefone,
        },
        data: novaMsg,
      })
    }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err)
    console.log('[WHATSAPP ENVIAR OS MANUAL ERRO INTERNO]', msg)
    return e.json(500, { error: 'Erro interno ao processar envio da OS: ' + msg, ok: false })
  }
})
