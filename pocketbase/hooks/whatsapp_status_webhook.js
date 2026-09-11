// Webhook público para receber atualizações de status de mensagens da Z-API (On-Message-Status-Received)
// Endpoint: POST /backend/v1/whatsapp/webhook-status
// Também atende GET /backend/v1/whatsapp/webhook-status para validação/ping da Z-API
routerAdd('POST', '/backend/v1/whatsapp/webhook-status', (e) => {
  try {
    const body = e.requestInfo().body || {}

    // Tolerância com pings de verificação de webhook ou payload vazio
    if (!body || Object.keys(body).length === 0) {
      return e.json(200, { ok: true, message: 'Ping de status recebido com sucesso' })
    }

    // 1. Extrair os identificadores da mensagem (ids array ou messageId / zaapId / id)
    const rawIds = []
    if (Array.isArray(body.ids)) {
      for (let i = 0; i < body.ids.length; i++) {
        const item = body.ids[i]
        if (typeof item === 'string' || typeof item === 'number') {
          const strVal = String(item).trim()
          if (strVal) rawIds.push(strVal)
        } else if (item && typeof item === 'object') {
          const innerId = item.id || item.messageId || item.zaapId
          if (innerId) rawIds.push(String(innerId).trim())
        }
      }
    }
    if (body.messageId) rawIds.push(String(body.messageId).trim())
    if (body.zaapId) rawIds.push(String(body.zaapId).trim())
    if (body.id && typeof body.id === 'string') rawIds.push(body.id.trim())

    // 2. Extrair telefone (se presente)
    const rawPhone = (body.phone || body.connectedPhone || body.phoneDevice || '').toString().trim()
    let cleanPhone = rawPhone.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    // 3. Mapear o status recebido para o CRM:
    // Valores comuns da Z-API / WhatsApp:
    // - READ / READ_BY_ME / PLAYED / LIDA / LIDO -> 'lida'
    // - RECEIVED / DELIVERED / ENTREGUE / RECEBIDA -> 'entregue'
    // - SENT / ENVIADA / ENVIADO -> 'enviada'
    // - FAILED / ERROR / FALHA -> 'falha'
    const rawStatus = (body.status || body.state || body.ack || '').toString().toUpperCase().trim()

    let mappedStatus = null
    if (
      rawStatus === 'READ' ||
      rawStatus === 'READ_BY_ME' ||
      rawStatus === 'PLAYED' ||
      rawStatus === 'LIDA' ||
      rawStatus === 'LIDO' ||
      rawStatus === 'VIEWED'
    ) {
      mappedStatus = 'lida'
    } else if (
      rawStatus === 'RECEIVED' ||
      rawStatus === 'DELIVERED' ||
      rawStatus === 'ENTREGUE' ||
      rawStatus === 'RECEBIDA'
    ) {
      mappedStatus = 'entregue'
    } else if (rawStatus === 'SENT' || rawStatus === 'ENVIADA' || rawStatus === 'ENVIADO') {
      mappedStatus = 'enviada'
    } else if (rawStatus === 'FAILED' || rawStatus === 'ERROR' || rawStatus === 'FALHA') {
      mappedStatus = 'falha'
    }

    // Se nenhum status mapeável foi fornecido, responder 200 rapidamente (tolerante)
    if (!mappedStatus) {
      console.log(
        '[WHATSAPP STATUS IGNORADO]',
        JSON.stringify({ rawStatus: rawStatus, bodyKeys: Object.keys(body) }),
      )
      return e.json(200, {
        ok: true,
        ignored: true,
        reason: 'unknown_or_unhandled_status',
        rawStatus: rawStatus,
      })
    }

    // 4. Localizar a mensagem correspondente em whatsapp_mensagens
    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    let foundMsgRecord = null

    // Tentativa A: busca direta pelos IDs externos do gateway
    for (let j = 0; j < rawIds.length; j++) {
      const candidateId = rawIds[j]
      if (!candidateId) continue
      try {
        const matches = $app.findRecordsByFilter(
          msgsCol.id,
          `id_externo_gateway = '${candidateId}' || id = '${candidateId}'`,
          '-created',
          1,
          0,
        )
        if (matches && matches.length > 0) {
          foundMsgRecord = matches[0]
          break
        }
      } catch (_) {}
    }

    // Tentativa B: se não achou pelo id_externo mas temos telefone, buscar a última mensagem enviada para esse número
    if (!foundMsgRecord && cleanPhone) {
      try {
        const phoneMatches = $app.findRecordsByFilter(
          msgsCol.id,
          `telefone_destino ~ '${cleanPhone.slice(-8)}' && direcao = 'enviada'`,
          '-created',
          1,
          0,
        )
        if (phoneMatches && phoneMatches.length > 0) {
          foundMsgRecord = phoneMatches[0]
        }
      } catch (_) {}
    }

    if (foundMsgRecord) {
      const currentStatus = foundMsgRecord.getString('status')

      // Não regredir status (ex: se já estiver 'lida', não voltar para 'entregue' ou 'enviada')
      let shouldUpdate = true
      if (currentStatus === 'lida' && mappedStatus !== 'lida') {
        shouldUpdate = false
      }

      if (shouldUpdate) {
        foundMsgRecord.set('status', mappedStatus)
        // Se ainda não tinha id_externo_gateway gravado e recebemos um no webhook, persistir
        if (!foundMsgRecord.getString('id_externo_gateway') && rawIds.length > 0) {
          foundMsgRecord.set('id_externo_gateway', rawIds[0])
        }
        $app.save(foundMsgRecord)

        console.log(
          '[WHATSAPP STATUS ATUALIZADO]',
          JSON.stringify({
            msgId: foundMsgRecord.id,
            de: currentStatus,
            para: mappedStatus,
            gatewayId: rawIds[0] || '',
            phone: cleanPhone,
          }),
        )
      }

      return e.json(200, {
        ok: true,
        updated: shouldUpdate,
        msgId: foundMsgRecord.id,
        status: mappedStatus,
      })
    }

    // Se a mensagem não foi encontrada no banco (ex: enviada fora do CRM ou antes da integração),
    // responder 200 para a Z-API não reenviar nem acusar erro
    console.log(
      '[WHATSAPP STATUS MSG NAO LOCALIZADA]',
      JSON.stringify({
        rawIds: rawIds,
        phone: cleanPhone,
        mappedStatus: mappedStatus,
      }),
    )

    return e.json(200, {
      ok: true,
      updated: false,
      reason: 'message_not_found',
      rawIds: rawIds,
      mappedStatus: mappedStatus,
    })
  } catch (err) {
    let msg = 'Erro ao processar status de webhook do WhatsApp'
    if (err && err.message) msg = err.message
    console.log('[WHATSAPP STATUS ERRO]', msg)
    // Responder 200 mesmo em exceções não críticas para atender requisito da Z-API de resposta rápida sem repetição abusiva
    return e.json(200, { ok: false, error: msg })
  }
})

// Suporte a requisição GET no mesmo endpoint para testes e verificação de URL da Z-API
routerAdd('GET', '/backend/v1/whatsapp/webhook-status', (e) => {
  return e.json(200, {
    ok: true,
    status: 'online',
    endpoint: '/backend/v1/whatsapp/webhook-status',
    method: 'POST',
    description:
      'Endpoint Webhook para recebimento de status das mensagens WhatsApp Z-API (On-Message-Status-Received)',
  })
})
