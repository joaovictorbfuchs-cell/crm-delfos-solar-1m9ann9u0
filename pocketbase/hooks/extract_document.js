routerAdd('POST', '/backend/v1/extract-document', (e) => {
  try {
    const authUser = e.auth
    let userId = authUser ? authUser.id : null

    // Se a chamada não tiver usuário autenticado, obter o primeiro usuário ou admin para vincular o chat
    if (!userId) {
      try {
        const usersCol = $app.findCollectionByNameOrId('users')
        const firstUser = $app.findRecordsByFilter(usersCol.id, '', 'created', 1, 0)
        if (firstUser && firstUser.length > 0) {
          userId = firstUser[0].id
        }
      } catch (_) {}
    }

    if (!userId) {
      return e.json(401, { error: 'Autenticação necessária para processar documentos' })
    }

    const body = e.requestInfo().body || {}
    const textContent = body.text_content || ''
    const base64Image = body.image_base64 || ''
    const fileName = body.file_name || 'documento'
    const mimeType = body.mime_type || ''

    if (!textContent && !base64Image) {
      return e.json(400, { error: 'Nenhum conteúdo ou imagem enviado para análise' })
    }

    let userPrompt = ''
    if (textContent) {
      userPrompt = `Documento: ${fileName}\n\nConteúdo textual extraído do arquivo:\n"""\n${textContent}\n"""\n\nAnalise o conteúdo acima e extraia todos os dados disponíveis retornando exclusivamente o JSON estruturado.`
    } else {
      userPrompt = `Documento: ${fileName} (tipo: ${mimeType})\nImagem codificada em base64 anexada:\ndata:${mimeType};base64,${base64Image}\n\nAnalise a imagem deste documento (conta de luz / CNH / documento de identidade / tabela solar) e extraia todos os dados disponíveis retornando exclusivamente o JSON estruturado.`
    }

    const result = $ai.agent('extrator-documentos-solar').chat({
      user_id: userId,
      message: userPrompt,
    })

    const rawContent = (result && result.content ? result.content : '').trim()

    // Limpar delimitadores de markdown se o modelo retornar ```json ... ```
    let cleanJson = rawContent
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/```$/, '')
        .trim()
    }

    let parsedData = null
    try {
      parsedData = JSON.parse(cleanJson)
    } catch (parseErr) {
      // Tentar localizar substring JSON
      const firstBrace = cleanJson.indexOf('{')
      const lastBrace = cleanJson.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsedData = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1))
        } catch (_) {}
      }
    }

    if (!parsedData) {
      return e.json(200, {
        ok: false,
        raw_text: rawContent,
        data: null,
        message: 'Não foi possível identificar dados estruturados neste documento.',
      })
    }

    return e.json(200, {
      ok: true,
      data: parsedData,
      raw_text: rawContent,
      conversation_id: result.conversation_id,
    })
  } catch (err) {
    let status = 500
    let msg = 'Falha ao processar extração de documento'
    if (err && err.status) {
      status = err.status
    }
    if (err && err.message) {
      msg = err.message
    }
    return e.json(status, { error: msg, ok: false })
  }
})
