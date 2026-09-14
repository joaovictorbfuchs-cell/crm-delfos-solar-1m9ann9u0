// Hook disparado após criação ou atualização de Ordens de Serviço (ordens_servico)
// Notifica automaticamente o instalador responsável via WhatsApp (Z-API)

onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    if (record.collection().name !== 'ordens_servico') {
      return e.next()
    }

    const responsavelId = record.getString('responsavel_usuario_id')
    const status = record.getString('status')

    // Se não há instalador responsável atribuído ou a OS já está concluída/cancelada, nada a enviar
    if (!responsavelId || status === 'concluida' || status === 'cancelada') {
      return e.next()
    }

    const osId = record.id
    const refKey = 'os_atribuida_' + osId + '_' + responsavelId

    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')

    // Evitar duplicidade: verificar se já existe notificação para esta OS e responsável
    try {
      const jaEnviado = $app.findRecordsByFilter(
        msgsCol.id,
        "referencia_id = '" + refKey + "'",
        '',
        1,
        0,
      )
      if (jaEnviado && jaEnviado.length > 0) {
        console.log('[WHATSAPP NOTIF OS] Já notificado anteriormente para ref:', refKey)
        return e.next()
      }
    } catch (_) {}

    // Buscar dados do instalador (usuário)
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
      console.log('[WHATSAPP NOTIF OS] Usuário responsável não encontrado:', responsavelId)
      return e.next()
    }

    const instaladorNome = userRec.getString('name') || 'Instalador'
    const instaladorTelefone = (userRec.getString('phone') || '').trim()

    if (!instaladorTelefone) {
      console.log(
        '[WHATSAPP NOTIF OS] Instalador ' +
          instaladorNome +
          ' (' +
          responsavelId +
          ') não possui telefone cadastrado. Pulando envio.',
      )
      return e.next()
    }

    // Buscar dados do cliente
    let clienteNome = 'Cliente Solar'
    let clienteEndereco = record.getString('endereco') || ''
    const clienteId = record.getString('cliente_id')
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
    const rawDataAgendada = record.getString('data_agendada')
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

    const tipoServico = record.getString('tipo_servico') || 'Manutenção'

    // Template ou mensagem padrão
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

    const novaMsg = new Record(msgsCol)
    if (clienteId) novaMsg.set('cliente_id', clienteId)
    if (tpl) novaMsg.set('template_id', tpl.id)
    novaMsg.set('telefone_destino', instaladorTelefone)
    novaMsg.set('conteudo_final', conteudo)
    novaMsg.set('tipo_disparo', 'os_atribuida')
    novaMsg.set('referencia_id', refKey)
    novaMsg.set('direcao', 'enviada')
    novaMsg.set('origem_envio', 'automatico')

    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim().replace(/[\r\n\t]/g, '')
    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')
    let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim().replace(/[\r\n\t]/g, '')

    let cleanPhone = instaladorTelefone.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    if (!rawApiUrl) {
      console.log('[WHATSAPP NOTIF OS] Gateway não configurado (WHATSAPP_API_URL ausente).')
      novaMsg.set('status', 'falha')
      novaMsg.set('log_erro', 'Gateway não configurado nos Secrets do backend')
      $app.save(novaMsg)
      return e.next()
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
        '[WHATSAPP NOTIF OS ENVIANDO]',
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
        '[WHATSAPP NOTIF OS RESPOSTA]',
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
      } else {
        const errStr = res.raw ? res.raw.substring(0, 300) : 'HTTP ' + res.statusCode
        novaMsg.set('status', 'falha')
        novaMsg.set('log_erro', 'Gateway HTTP ' + res.statusCode + ': ' + errStr)
      }
    } catch (sendErr) {
      const errDetail = sendErr && sendErr.message ? sendErr.message : String(sendErr)
      console.log('[WHATSAPP NOTIF OS ERRO DE ENVIO]', errDetail)
      novaMsg.set('status', 'falha')
      novaMsg.set('log_erro', String(errDetail))
    }

    $app.save(novaMsg)
    return e.next()
  } catch (err) {
    console.log('[WHATSAPP NOTIF OS ERRO HOOK onRecordAfterCreateSuccess]:', err)
    return e.next()
  }
})

onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record
    if (record.collection().name !== 'ordens_servico') {
      return e.next()
    }

    const responsavelId = record.getString('responsavel_usuario_id')
    const responsavelAnterior = record.original().getString('responsavel_usuario_id')
    const status = record.getString('status')

    // Disparar somente se o responsável foi definido ou alterado, e não está concluída ou cancelada
    if (!responsavelId || responsavelId === responsavelAnterior) {
      return e.next()
    }

    if (status === 'concluida' || status === 'cancelada') {
      return e.next()
    }

    const osId = record.id
    const refKey = 'os_atribuida_' + osId + '_' + responsavelId

    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')

    // Evitar duplicidade: verificar se já existe notificação para este par os+responsável
    try {
      const jaEnviado = $app.findRecordsByFilter(
        msgsCol.id,
        "referencia_id = '" + refKey + "'",
        '',
        1,
        0,
      )
      if (jaEnviado && jaEnviado.length > 0) {
        console.log('[WHATSAPP NOTIF OS UPDATE] Já notificado para ref:', refKey)
        return e.next()
      }
    } catch (_) {}

    // Buscar dados do instalador (usuário)
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
      console.log('[WHATSAPP NOTIF OS UPDATE] Usuário não encontrado:', responsavelId)
      return e.next()
    }

    const instaladorNome = userRec.getString('name') || 'Instalador'
    const instaladorTelefone = (userRec.getString('phone') || '').trim()

    if (!instaladorTelefone) {
      console.log(
        '[WHATSAPP NOTIF OS UPDATE] Instalador ' +
          instaladorNome +
          ' (' +
          responsavelId +
          ') não possui telefone cadastrado. Pulando envio.',
      )
      return e.next()
    }

    // Buscar dados do cliente
    let clienteNome = 'Cliente Solar'
    let clienteEndereco = record.getString('endereco') || ''
    const clienteId = record.getString('cliente_id')
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
    const rawDataAgendada = record.getString('data_agendada')
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

    const tipoServico = record.getString('tipo_servico') || 'Manutenção'

    // Template ou mensagem padrão
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

    const novaMsg = new Record(msgsCol)
    if (clienteId) novaMsg.set('cliente_id', clienteId)
    if (tpl) novaMsg.set('template_id', tpl.id)
    novaMsg.set('telefone_destino', instaladorTelefone)
    novaMsg.set('conteudo_final', conteudo)
    novaMsg.set('tipo_disparo', 'os_atribuida')
    novaMsg.set('referencia_id', refKey)
    novaMsg.set('direcao', 'enviada')
    novaMsg.set('origem_envio', 'automatico')

    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim().replace(/[\r\n\t]/g, '')
    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')
    let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim().replace(/[\r\n\t]/g, '')

    let cleanPhone = instaladorTelefone.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    if (!rawApiUrl) {
      console.log('[WHATSAPP NOTIF OS UPDATE] Gateway não configurado (WHATSAPP_API_URL ausente).')
      novaMsg.set('status', 'falha')
      novaMsg.set('log_erro', 'Gateway não configurado nos Secrets do backend')
      $app.save(novaMsg)
      return e.next()
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
        '[WHATSAPP NOTIF OS UPDATE ENVIANDO]',
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
        '[WHATSAPP NOTIF OS UPDATE RESPOSTA]',
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
      } else {
        const errStr = res.raw ? res.raw.substring(0, 300) : 'HTTP ' + res.statusCode
        novaMsg.set('status', 'falha')
        novaMsg.set('log_erro', 'Gateway HTTP ' + res.statusCode + ': ' + errStr)
      }
    } catch (sendErr) {
      const errDetail = sendErr && sendErr.message ? sendErr.message : String(sendErr)
      console.log('[WHATSAPP NOTIF OS UPDATE ERRO DE ENVIO]', errDetail)
      novaMsg.set('status', 'falha')
      novaMsg.set('log_erro', String(errDetail))
    }

    $app.save(novaMsg)
    return e.next()
  } catch (err) {
    console.log('[WHATSAPP NOTIF OS UPDATE ERRO HOOK onRecordAfterUpdateSuccess]:', err)
    return e.next()
  }
})
