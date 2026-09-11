// Webhook público para receber mensagens do WhatsApp (Z-API / On-Message-Received)
// Endpoint: POST /backend/v1/whatsapp/webhook
// Também atende GET /backend/v1/whatsapp/webhook para verificação/ping de conformidade
routerAdd('POST', '/backend/v1/whatsapp/webhook', (e) => {
  try {
    const body = e.requestInfo().body || {}

    // Tolerância com payloads vazios ou pings de verificação de webhook
    if (!body || Object.keys(body).length === 0) {
      return e.json(200, { ok: true, message: 'Ping recebido com sucesso' })
    }

    // Ignorar mensagens de grupos ou broadcast se não for chat direto
    if (body.isGroup === true || body.isNewsletter === true) {
      return e.json(200, { ok: true, ignored: true, reason: 'group_or_newsletter' })
    }

    // Se for notificação de envio próprio (fromMe: true), ignorar para evitar loop
    if (body.fromMe === true) {
      return e.json(200, { ok: true, ignored: true, reason: 'from_me' })
    }

    // Extrair telefone do remetente
    // Z-API manda `phone` (ex: "5544999999999" ou "554499999999") ou `connectedPhone`
    const rawPhone = (body.phone || body.connectedPhone || body.sender || '').toString().trim()
    if (!rawPhone) {
      return e.json(200, { ok: true, ignored: true, reason: 'phone_not_found' })
    }

    // Normalizar telefone (apenas dígitos e prefixo 55 se BR)
    let cleanPhone = rawPhone.replace(/\D/g, '')
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    // Extrair texto da mensagem
    let messageText = ''
    let tipoMensagem = 'texto'
    let nomeArquivo = ''
    let documentoUrl = ''

    if (body.text && typeof body.text === 'object') {
      messageText = body.text.message || body.text.title || ''
    } else if (typeof body.text === 'string') {
      messageText = body.text
    } else if (body.message && typeof body.message === 'string') {
      messageText = body.message
    } else if (body.document && typeof body.document === 'object') {
      tipoMensagem = 'documento'
      nomeArquivo = body.document.fileName || 'documento.pdf'
      documentoUrl = body.document.documentUrl || ''
      messageText = body.document.title || `[Documento: ${nomeArquivo}]`
    } else if (body.image && typeof body.image === 'object') {
      tipoMensagem = 'imagem'
      documentoUrl = body.image.imageUrl || ''
      messageText = body.image.caption || '[Imagem]'
    } else if (body.audio && typeof body.audio === 'object') {
      tipoMensagem = 'audio'
      documentoUrl = body.audio.audioUrl || ''
      messageText = '[Áudio]'
    } else if (body.buttonsResponseMessage && typeof body.buttonsResponseMessage === 'object') {
      messageText = body.buttonsResponseMessage.message || '[Resposta de Botão]'
    } else if (body.listResponseMessage && typeof body.listResponseMessage === 'object') {
      messageText = body.listResponseMessage.message || '[Resposta de Lista]'
    } else if (body.caption) {
      messageText = body.caption
    }

    messageText = (messageText || '').trim()
    if (!messageText && tipoMensagem === 'texto') {
      messageText = '[Mensagem recebida]'
    }

    const messageIdGateway = (body.messageId || body.zaapId || body.id || '').toString().trim()
    const nowIso = new Date().toISOString()

    // 1. Verificar se existe cliente com esse número
    // O número de clientes pode estar em 'whatsapp' ou 'telefone', mascarado ou não
    // Para busca tolerante, buscar clientes e comparar dígitos normalizados
    let clienteEncontrado = null
    try {
      // Tentativa 1: busca exata direta pelo campo whatsapp ou telefone
      const directClients = $app.findRecordsByFilter(
        'clientes',
        `whatsapp ~ '${cleanPhone.slice(-8)}' || telefone ~ '${cleanPhone.slice(-8)}'`,
        '-updated',
        10,
        0,
      )

      for (let i = 0; i < directClients.length; i++) {
        const c = directClients[i]
        const cWhats = (c.getString('whatsapp') || '').replace(/\D/g, '')
        const cTel = (c.getString('telefone') || '').replace(/\D/g, '')

        const matchWhats =
          cWhats &&
          (cWhats === cleanPhone ||
            cWhats.endsWith(cleanPhone.slice(-8)) ||
            cleanPhone.endsWith(cWhats.slice(-8)))
        const matchTel =
          cTel &&
          (cTel === cleanPhone ||
            cTel.endsWith(cleanPhone.slice(-8)) ||
            cleanPhone.endsWith(cTel.slice(-8)))

        if (matchWhats || matchTel) {
          clienteEncontrado = c
          break
        }
      }
    } catch (errBuscaCliente) {
      console.log('[WEBHOOK AVISO BUSCA CLIENTE]', errBuscaCliente)
    }

    // 2. Localizar ou criar conversa em whatsapp_conversas
    const convCol = $app.findCollectionByNameOrId('whatsapp_conversas')
    let conversaRecord = null

    try {
      // Buscar conversa existente por este número
      const existingConvs = $app.findRecordsByFilter(
        convCol.id,
        `numero = '${cleanPhone}' || numero ~ '${cleanPhone.slice(-8)}'`,
        '-updated',
        1,
        0,
      )
      if (existingConvs && existingConvs.length > 0) {
        conversaRecord = existingConvs[0]
      }
    } catch (_) {}

    // Se cliente foi encontrado e ainda não tínhamos achado conversa pelo número exato,
    // verificar se o cliente já possui alguma conversa aberta
    if (!conversaRecord && clienteEncontrado) {
      try {
        const clientConvs = $app.findRecordsByFilter(
          convCol.id,
          `cliente_id = '${clienteEncontrado.id}'`,
          '-updated',
          1,
          0,
        )
        if (clientConvs && clientConvs.length > 0) {
          conversaRecord = clientConvs[0]
        }
      } catch (_) {}
    }

    if (conversaRecord) {
      // A conversa já existe.
      // Regras de negócio solicitadas:
      // - Se a conversa estava em "resolvido", mover de volta para "em_atendimento" com status "Nova mensagem" / reaberta.
      // - Se estava em "novo" (Fila de Novos), manter lá até alguém assumir.
      // - Se estava em "aguardando_cliente" ou "em_atendimento", manter "em_atendimento".
      // - Se já encontramos cliente agora e a conversa ainda não tinha cliente_id, vincular.
      const statusAtual = conversaRecord.getString('status')
      if (statusAtual === 'resolvido') {
        conversaRecord.set('status', 'em_atendimento')
        conversaRecord.set('reaberta_em', nowIso)
      } else if (statusAtual === 'aguardando_cliente') {
        conversaRecord.set('status', 'em_atendimento')
      }

      if (clienteEncontrado && !conversaRecord.getString('cliente_id')) {
        conversaRecord.set('cliente_id', clienteEncontrado.id)
        conversaRecord.set('vinculada_em', nowIso)
      }

      const naoLidas = (conversaRecord.getInt('nao_lidas') || 0) + 1
      conversaRecord.set('nao_lidas', naoLidas)
      conversaRecord.set('ultima_mensagem_preview', messageText.substring(0, 120))
      conversaRecord.set('ultima_mensagem_em', nowIso)
      $app.save(conversaRecord)
    } else {
      // Conversa NÃO existe ainda
      conversaRecord = new Record(convCol)
      conversaRecord.set('numero', cleanPhone)
      conversaRecord.set('ultima_mensagem_preview', messageText.substring(0, 120))
      conversaRecord.set('ultima_mensagem_em', nowIso)
      conversaRecord.set('nao_lidas', 1)

      if (clienteEncontrado) {
        // Número já conhecido: associar cliente, criar em "em_atendimento"
        conversaRecord.set('cliente_id', clienteEncontrado.id)
        conversaRecord.set('status', 'em_atendimento')
        conversaRecord.set('vinculada_em', nowIso)
      } else {
        // Número desconhecido: criar na Fila de Novos com status "novo", NÃO criar cliente
        conversaRecord.set('status', 'novo')
      }

      $app.save(conversaRecord)
    }

    // 3. Gravar a mensagem recebida na coleção whatsapp_mensagens
    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    const msgRecord = new Record(msgsCol)
    if (clienteEncontrado) {
      msgRecord.set('cliente_id', clienteEncontrado.id)
    }
    msgRecord.set('conversa_id', conversaRecord.id)
    msgRecord.set('telefone_destino', cleanPhone)
    msgRecord.set('conteudo_final', messageText)
    msgRecord.set('status', 'entregue')
    msgRecord.set('direcao', 'recebida')
    msgRecord.set('tipo_disparo', 'webhook')
    msgRecord.set('tipo_mensagem', tipoMensagem)
    if (nomeArquivo) msgRecord.set('nome_arquivo', nomeArquivo)
    if (documentoUrl) msgRecord.set('documento_url', documentoUrl)
    if (messageIdGateway) msgRecord.set('id_externo_gateway', messageIdGateway)
    msgRecord.set('enviado_em', nowIso)

    $app.save(msgRecord)

    console.log(
      '[WHATSAPP WEBHOOK RECEBIDO]',
      JSON.stringify({
        phone: cleanPhone,
        hasClient: Boolean(clienteEncontrado),
        conversaId: conversaRecord.id,
        statusConversa: conversaRecord.getString('status'),
        messagePreview: messageText.substring(0, 50),
      }),
    )

    return e.json(200, {
      ok: true,
      conversaId: conversaRecord.id,
      conversaStatus: conversaRecord.getString('status'),
      hasCliente: Boolean(clienteEncontrado),
      msgId: msgRecord.id,
    })
  } catch (err) {
    let msg = 'Erro ao processar webhook do WhatsApp'
    if (err && err.message) msg = err.message
    console.log('[WHATSAPP WEBHOOK ERRO]', msg)
    return e.json(500, { ok: false, error: msg })
  }
})

// Suporte a requisição GET no mesmo endpoint para testes e verificação de URL
routerAdd('GET', '/backend/v1/whatsapp/webhook', (e) => {
  return e.json(200, {
    ok: true,
    status: 'online',
    endpoint: '/backend/v1/whatsapp/webhook',
    method: 'POST',
    description: 'Endpoint Webhook para recebimento de mensagens WhatsApp Z-API',
  })
})
