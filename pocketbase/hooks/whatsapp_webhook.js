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

    // Extrair foto de perfil do contato (se presente no payload) para salvar no contato/avatar,
    // mas NUNCA tratar como mídia da mensagem
    const senderPhoto = (
      body.senderPhoto ||
      body.photo ||
      body.profilePic ||
      body.profilePictureUrl ||
      body.avatarUrl ||
      ''
    )
      .toString()
      .trim()

    // 0. Extrair texto preliminar (se houver em body.text, body.message, etc.)
    let rawTextFromPayload = ''
    if (body.text && typeof body.text === 'object') {
      rawTextFromPayload = body.text.message || body.text.title || ''
    } else if (typeof body.text === 'string') {
      rawTextFromPayload = body.text
    } else if (body.message && typeof body.message === 'string') {
      rawTextFromPayload = body.message
    } else if (body.buttonsResponseMessage && typeof body.buttonsResponseMessage === 'object') {
      rawTextFromPayload = body.buttonsResponseMessage.message || '[Resposta de Botão]'
    } else if (body.listResponseMessage && typeof body.listResponseMessage === 'object') {
      rawTextFromPayload = body.listResponseMessage.message || '[Resposta de Lista]'
    } else if (body.caption) {
      rawTextFromPayload = body.caption
    }
    rawTextFromPayload = (rawTextFromPayload || '').trim()

    // Extrair texto da mensagem e detectar tipo de mídia
    let messageText = rawTextFromPayload
    let tipoMensagem = 'texto'
    let nomeArquivo = ''
    let documentoUrl = ''

    // Função auxiliar para inspecionar se uma URL ou nome tem extensão de vídeo
    const isVideoExtension = (str) => {
      if (!str || typeof str !== 'string') return false
      const s = str.split('?')[0].split('#')[0].toLowerCase()
      return (
        s.endsWith('.mp4') ||
        s.endsWith('.mov') ||
        s.endsWith('.3gp') ||
        s.endsWith('.mkv') ||
        s.endsWith('.avi') ||
        s.endsWith('.webm')
      )
    }

    // Função auxiliar para inspecionar se uma URL ou nome tem extensão de áudio
    const isAudioExtension = (str) => {
      if (!str || typeof str !== 'string') return false
      const s = str.split('?')[0].split('#')[0].toLowerCase()
      return (
        s.endsWith('.ogg') ||
        s.endsWith('.opus') ||
        s.endsWith('.mp3') ||
        s.endsWith('.wav') ||
        s.endsWith('.m4a') ||
        s.endsWith('.aac')
      )
    }

    // Função auxiliar para inspecionar se uma URL ou nome tem extensão de imagem
    const isImageExtension = (str) => {
      if (!str || typeof str !== 'string') return false
      const s = str.split('?')[0].split('#')[0].toLowerCase()
      return (
        s.endsWith('.jpg') ||
        s.endsWith('.jpeg') ||
        s.endsWith('.png') ||
        s.endsWith('.webp') ||
        s.endsWith('.gif')
      )
    }

    // 1. Objeto 'video' direto
    if (body.video && typeof body.video === 'object') {
      tipoMensagem = 'video'
      documentoUrl = body.video.videoUrl || body.video.url || body.video.link || ''
      nomeArquivo = body.video.fileName || ''
      const cap = (body.video.caption || body.caption || '').trim()
      messageText = cap || '[Vídeo]'
    }
    // 2. Objeto 'ptv' (Push To Video / Pre-recorded Transfer Video / Mensagem de vídeo instantânea / bolha de vídeo)
    else if (body.ptv && typeof body.ptv === 'object') {
      tipoMensagem = 'video'
      documentoUrl = body.ptv.videoUrl || body.ptv.url || body.ptv.link || ''
      nomeArquivo = body.ptv.fileName || ''
      const cap = (body.ptv.caption || body.caption || '').trim()
      messageText = cap || '[Vídeo]'
    }
    // 3. String direta em body.video (URL ou data-url enviada em body.video)
    else if (typeof body.video === 'string' && body.video.trim()) {
      tipoMensagem = 'video'
      documentoUrl = body.video.trim()
      nomeArquivo = body.fileName || ''
      const cap = (body.caption || '').trim()
      messageText = cap || '[Vídeo]'
    }
    // 4. body.videoUrl direto
    else if (body.videoUrl) {
      tipoMensagem = 'video'
      documentoUrl = body.videoUrl
      nomeArquivo = body.fileName || ''
      messageText = (body.caption || '').trim() || '[Vídeo]'
    }
    // 5. Template hydrated com header de vídeo
    else if (
      body.hydratedTemplate &&
      body.hydratedTemplate.header &&
      body.hydratedTemplate.header.video
    ) {
      tipoMensagem = 'video'
      const v = body.hydratedTemplate.header.video
      documentoUrl = v.videoUrl || v.url || ''
      const cap = (v.caption || body.hydratedTemplate.message || '').trim()
      messageText = cap || '[Vídeo]'
    }
    // 6. Flag isVideo: true no payload da Z-API
    else if (body.isVideo === true) {
      tipoMensagem = 'video'
      documentoUrl =
        body.videoUrl ||
        body.url ||
        (body.document && (body.document.documentUrl || body.document.url)) ||
        ''
      nomeArquivo = body.fileName || (body.document && body.document.fileName) || ''
      const cap = (
        body.caption ||
        (body.document && (body.document.title || body.document.caption)) ||
        ''
      ).trim()
      messageText = cap || '[Vídeo]'
    }
    // 7. Imagem (objeto image)
    else if (body.image && typeof body.image === 'object') {
      tipoMensagem = 'imagem'
      documentoUrl = body.image.imageUrl || body.image.url || body.image.thumbnailUrl || ''
      nomeArquivo = body.image.fileName || ''
      const cap = (body.image.caption || body.caption || '').trim()
      messageText = cap || '[Imagem]'
    }
    // 8. String direta em body.image
    else if (typeof body.image === 'string' && body.image.trim()) {
      tipoMensagem = 'imagem'
      documentoUrl = body.image.trim()
      nomeArquivo = body.fileName || ''
      const cap = (body.caption || '').trim()
      messageText = cap || '[Imagem]'
    }
    // 9. Template hydrated com imagem
    else if (
      body.hydratedTemplate &&
      body.hydratedTemplate.header &&
      body.hydratedTemplate.header.image
    ) {
      tipoMensagem = 'imagem'
      const im = body.hydratedTemplate.header.image
      documentoUrl = im.imageUrl || im.url || ''
      const cap = (im.caption || body.hydratedTemplate.message || '').trim()
      messageText = cap || '[Imagem]'
    }
    // 10. Imagem via imageUrl isolado (NUNCA usar body.photo / senderPhoto aqui!)
    else if (
      body.imageUrl &&
      typeof body.imageUrl === 'string' &&
      body.imageUrl.trim() &&
      !body.imageUrl.includes('pps.whatsapp.net')
    ) {
      tipoMensagem = 'imagem'
      documentoUrl = body.imageUrl.trim()
      messageText = (body.caption || rawTextFromPayload || '').trim() || '[Imagem]'
    }
    // 11. Áudio (objeto audio)
    else if (body.audio && typeof body.audio === 'object') {
      tipoMensagem = 'audio'
      documentoUrl = body.audio.audioUrl || body.audio.url || ''
      nomeArquivo = body.audio.fileName || ''
      messageText = '[Áudio]'
    }
    // 12. String direta em body.audio ou body.audioUrl
    else if ((typeof body.audio === 'string' && body.audio.trim()) || body.audioUrl) {
      tipoMensagem = 'audio'
      documentoUrl = (typeof body.audio === 'string' && body.audio.trim()) || body.audioUrl
      nomeArquivo = body.fileName || ''
      messageText = '[Áudio]'
    }
    // 13. Documento estruturado: verificar se o mimeType ou extensão é na verdade vídeo ou áudio ou imagem
    else if (body.document && typeof body.document === 'object') {
      const mime = (body.document.mimeType || '').toLowerCase()
      const docUrl = body.document.documentUrl || body.document.url || ''
      const docName = body.document.fileName || ''

      if (mime.startsWith('video/') || isVideoExtension(docUrl) || isVideoExtension(docName)) {
        tipoMensagem = 'video'
        documentoUrl = docUrl
        nomeArquivo = docName
        const cap = (body.document.caption || body.document.title || body.caption || '').trim()
        messageText = cap || '[Vídeo]'
      } else if (
        mime.startsWith('audio/') ||
        isAudioExtension(docUrl) ||
        isAudioExtension(docName)
      ) {
        tipoMensagem = 'audio'
        documentoUrl = docUrl
        nomeArquivo = docName
        messageText = '[Áudio]'
      } else if (
        mime.startsWith('image/') ||
        isImageExtension(docUrl) ||
        isImageExtension(docName)
      ) {
        tipoMensagem = 'imagem'
        documentoUrl = docUrl
        nomeArquivo = docName
        const cap = (body.document.caption || body.document.title || body.caption || '').trim()
        messageText = cap || '[Imagem]'
      } else {
        tipoMensagem = 'documento'
        nomeArquivo = docName || 'documento.pdf'
        documentoUrl = docUrl
        messageText = body.document.title || body.document.caption || `[Documento: ${nomeArquivo}]`
      }
    }
    // 14. Documento via documentUrl direto (verificar se é vídeo/áudio disfarçado)
    else if (body.documentUrl) {
      const docUrl = body.documentUrl
      const docName = body.fileName || ''
      if (isVideoExtension(docUrl) || isVideoExtension(docName)) {
        tipoMensagem = 'video'
        documentoUrl = docUrl
        nomeArquivo = docName
        messageText = (body.title || body.caption || '').trim() || '[Vídeo]'
      } else if (isAudioExtension(docUrl) || isAudioExtension(docName)) {
        tipoMensagem = 'audio'
        documentoUrl = docUrl
        nomeArquivo = docName
        messageText = '[Áudio]'
      } else if (isImageExtension(docUrl) || isImageExtension(docName)) {
        tipoMensagem = 'imagem'
        documentoUrl = docUrl
        nomeArquivo = docName
        messageText = (body.title || body.caption || '').trim() || '[Imagem]'
      } else {
        tipoMensagem = 'documento'
        documentoUrl = docUrl
        nomeArquivo = docName || 'documento.pdf'
        messageText = body.title || body.caption || `[Documento: ${nomeArquivo}]`
      }
    }
    // 15. Figurinha (sticker)
    else if (body.sticker && typeof body.sticker === 'object') {
      tipoMensagem = 'imagem'
      documentoUrl = body.sticker.stickerUrl || body.sticker.url || ''
      messageText = '[Figurinha]'
    }
    // 16. Tipo genérico com campo type / mediaType no body
    else if (body.type === 'video' || body.mediaType === 'video') {
      tipoMensagem = 'video'
      documentoUrl = body.url || body.mediaUrl || body.videoUrl || ''
      nomeArquivo = body.fileName || ''
      messageText = (body.caption || rawTextFromPayload || '').trim() || '[Vídeo]'
    } else if (body.type === 'image' || body.mediaType === 'image') {
      const imgUrl = (body.url || body.mediaUrl || body.imageUrl || '').toString().trim()
      // Guarda: garantir que não seja foto de perfil
      if (imgUrl && !imgUrl.includes('pps.whatsapp.net')) {
        tipoMensagem = 'imagem'
        documentoUrl = imgUrl
        nomeArquivo = body.fileName || ''
        messageText = (body.caption || rawTextFromPayload || '').trim() || '[Imagem]'
      }
    }
    // 17. Mensagens de texto: se tipoMensagem continua 'texto', usar texto extraído
    if (tipoMensagem === 'texto') {
      messageText = rawTextFromPayload
    }

    messageText = (messageText || '').trim()
    if (!messageText && tipoMensagem === 'texto') {
      messageText = '[Mensagem recebida]'
    } else if (
      tipoMensagem === 'video' &&
      (!messageText || messageText === '[Mensagem recebida]')
    ) {
      messageText = '[Vídeo]'
    } else if (
      tipoMensagem === 'imagem' &&
      (!messageText || messageText === '[Mensagem recebida]')
    ) {
      messageText = '[Imagem]'
    } else if (
      tipoMensagem === 'audio' &&
      (!messageText || messageText === '[Mensagem recebida]')
    ) {
      messageText = '[Áudio]'
    } else if (
      tipoMensagem === 'documento' &&
      (!messageText || messageText === '[Mensagem recebida]')
    ) {
      messageText = nomeArquivo ? `[Documento: ${nomeArquivo}]` : '[Documento]'
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
      if (senderPhoto) {
        try {
          conversaRecord.set('foto_perfil', senderPhoto)
        } catch (_) {}
      }
      $app.save(conversaRecord)
    } else {
      // Conversa NÃO existe ainda
      conversaRecord = new Record(convCol)
      conversaRecord.set('numero', cleanPhone)
      conversaRecord.set('ultima_mensagem_preview', messageText.substring(0, 120))
      conversaRecord.set('ultima_mensagem_em', nowIso)
      conversaRecord.set('nao_lidas', 1)
      if (senderPhoto) {
        try {
          conversaRecord.set('foto_perfil', senderPhoto)
        } catch (_) {}
      }

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

    // 4. Download e persistência local da mídia no ato do recebimento
    // Preserva o arquivo na base do PocketBase mesmo se a instância Z-API expirar,
    // o número for alterado ou a URL temporária da Z-API / Backblaze expirar.
    const isMidia =
      tipoMensagem === 'imagem' ||
      tipoMensagem === 'video' ||
      tipoMensagem === 'audio' ||
      tipoMensagem === 'documento'

    if (isMidia && documentoUrl) {
      try {
        let fileToSave = null
        try {
          fileToSave = $filesystem.fileFromURL(documentoUrl, 30)
        } catch (downloadErr) {
          console.log(
            '[WHATSAPP WEBHOOK] fileFromURL direto falhou, tentando com headers Z-API:',
            downloadErr,
          )
        }

        // Se falhou ou precisa de headers específicos (Client-Token)
        if (!fileToSave) {
          const lowerUrl = documentoUrl.toLowerCase()
          const isZApi =
            lowerUrl.indexOf('z-api.io') !== -1 ||
            lowerUrl.indexOf('z-api.com') !== -1 ||
            lowerUrl.indexOf('plugzapi.com') !== -1

          const apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')
          const headers = { 'User-Agent': 'DelfosSolar-CRM/1.0' }
          if (isZApi && apiKey) {
            headers['Client-Token'] = apiKey
          }

          const httpRes = $http.send({
            url: documentoUrl,
            method: 'GET',
            headers: headers,
            timeout: 30,
          })

          if (httpRes.statusCode >= 200 && httpRes.statusCode < 300) {
            let fname = nomeArquivo
            if (!fname) {
              const cleanPart = documentoUrl.split('?')[0].split('#')[0]
              const parts = cleanPart.split('/')
              fname = parts[parts.length - 1] || 'media_whatsapp'
            }
            if (!fname.includes('.')) {
              if (tipoMensagem === 'imagem') fname += '.jpg'
              else if (tipoMensagem === 'video') fname += '.mp4'
              else if (tipoMensagem === 'audio') fname += '.ogg'
              else if (tipoMensagem === 'documento') fname += '.pdf'
            }
            fileToSave = $filesystem.fileFromBytes(httpRes.body || httpRes.raw, fname)
          } else {
            msgRecord.set(
              'motivo_falha_midia',
              `HTTP ${httpRes.statusCode} ao baixar mídia original`,
            )
          }
        }

        if (fileToSave) {
          msgRecord.set('arquivo', fileToSave)
        }
      } catch (saveMediaErr) {
        const errDesc =
          saveMediaErr && saveMediaErr.message ? saveMediaErr.message : String(saveMediaErr)
        console.log('[WHATSAPP WEBHOOK ERRO PERSISTIR MIDIA]', errDesc)
        msgRecord.set('motivo_falha_midia', errDesc)
      }
    } else if (isMidia && !documentoUrl) {
      msgRecord.set('motivo_falha_midia', 'URL de mídia não fornecida no payload da mensagem')
    }

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
