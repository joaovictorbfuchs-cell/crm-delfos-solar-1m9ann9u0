migrate(
  (app) => {
    // 1. Adicionar campo foto_perfil na collection whatsapp_conversas (se ainda não existir)
    const convCol = app.findCollectionByNameOrId('whatsapp_conversas')
    if (!convCol.fields.getByName('foto_perfil')) {
      convCol.fields.add(
        new TextField({
          name: 'foto_perfil',
          required: false,
        }),
      )
      app.save(convCol)
    }

    // 2. Localizar mensagens em whatsapp_mensagens cujo documento_url contenha 'pps.whatsapp.net'
    // ou cujo arquivo corresponda ao padrão de foto de perfil baixada da CDN do WhatsApp/Facebook
    // Exemplo de fotos de perfil:
    // - documento_url: https://pps.whatsapp.net/...
    // - arquivo: 491840116_483946494746199_4942386438021185097_n_... ou 328150590_588538163223147_... ou 576425411_24967626399558741_...
    const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
    const afetadas = app.findRecordsByFilter(
      msgsCol.id,
      "tipo_mensagem = 'imagem' && (documento_url ~ 'pps.whatsapp.net' || arquivo ~ '_n_' || documento_url ~ '_n.jpg')",
      '-created',
      500,
      0,
    )

    const conversasAfetadasIds = {}

    for (let i = 0; i < afetadas.length; i++) {
      const msg = afetadas[i]
      const docUrl = msg.getString('documento_url') || ''
      const convId = msg.getString('conversa_id') || ''

      if (convId) {
        if (!conversasAfetadasIds[convId]) {
          conversasAfetadasIds[convId] = []
        }
        conversasAfetadasIds[convId].push({
          msgId: msg.id,
          docUrl: docUrl,
        })
      }

      // Se houver URL de foto de perfil, salvar na conversa como foto_perfil
      if (convId && docUrl && docUrl.indexOf('pps.whatsapp.net') !== -1) {
        try {
          const conv = app.findFirstRecordByData('whatsapp_conversas', 'id', convId)
          if (!conv.getString('foto_perfil')) {
            conv.set('foto_perfil', docUrl)
            app.save(conv)
          }
        } catch (_) {}
      }

      // Limpar o arquivo baixado indevidamente e a URL de perfil da mensagem
      msg.set('arquivo', null)
      msg.set('documento_url', '')
      msg.set('nome_arquivo', '')
      msg.set('tipo_mensagem', 'texto')

      const conteudo = msg.getString('conteudo_final') || ''
      // Se o conteúdo era apenas o fallback '[Imagem]', substituir por mensagem neutra ou deixar vazio
      if (conteudo === '[Imagem]' || !conteudo) {
        msg.set('conteudo_final', '[Mensagem recebida]')
      }

      app.save(msg)
    }

    // 3. Corrigir ultima_mensagem_preview nas conversas afetadas onde ficou '[Imagem]'
    const convIds = Object.keys(conversasAfetadasIds)
    for (let j = 0; j < convIds.length; j++) {
      const cId = convIds[j]
      try {
        const convRecord = app.findFirstRecordByData('whatsapp_conversas', 'id', cId)
        const prev = convRecord.getString('ultima_mensagem_preview') || ''
        if (prev === '[Imagem]') {
          // Buscar a mensagem mais recente dessa conversa
          const ultimasMsgs = app.findRecordsByFilter(
            msgsCol.id,
            `conversa_id = '${cId}'`,
            '-created',
            1,
            0,
          )
          if (ultimasMsgs && ultimasMsgs.length > 0) {
            const ultMsg = ultimasMsgs[0]
            const texto = (ultMsg.getString('conteudo_final') || '').trim()
            if (texto && texto !== '[Imagem]') {
              convRecord.set('ultima_mensagem_preview', texto.substring(0, 120))
            } else {
              convRecord.set('ultima_mensagem_preview', '[Mensagem recebida]')
            }
          } else {
            convRecord.set('ultima_mensagem_preview', '')
          }
          app.save(convRecord)
        }
      } catch (_) {}
    }
  },
  (app) => {
    // Revert: opcionalmente remover campo foto_perfil se desejado
    try {
      const convCol = app.findCollectionByNameOrId('whatsapp_conversas')
      const field = convCol.fields.getByName('foto_perfil')
      if (field) {
        convCol.fields.removeByName('foto_perfil')
        app.save(convCol)
      }
    } catch (_) {}
  },
)
