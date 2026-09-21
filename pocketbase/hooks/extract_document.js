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
    let textContent = (body.text_content || '').trim()
    const base64Image = (body.image_base64 || '').trim()
    const fileName = body.file_name || 'documento'
    const mimeType = body.mime_type || 'image/jpeg'

    if (!textContent && !base64Image) {
      return e.json(400, { error: 'Nenhum conteúdo ou imagem enviado para análise' })
    }

    // 1. Guard de segurança para imagens em base64: máx 700KB de string (~525KB binário)
    // Imagens maiores do que isso estouram o limite de tokens da janela de contexto
    const MAX_BASE64_LENGTH = 700 * 1024 // 700 KB em caracteres
    if (base64Image && base64Image.length > MAX_BASE64_LENGTH) {
      return e.json(413, {
        ok: false,
        error:
          'Imagem muito grande. Tire a foto em resolução menor ou use o PDF original do documento.',
      })
    }

    // 2. Guard de segurança para conteúdo textual: máx 150.000 caracteres
    const MAX_TEXT_LENGTH = 150000
    if (textContent.length > MAX_TEXT_LENGTH) {
      textContent = textContent.substring(0, MAX_TEXT_LENGTH)
    }

    let userPrompt = ''
    if (textContent) {
      userPrompt = `Documento: ${fileName}\n\nConteúdo textual extraído do arquivo:\n"""\n${textContent}\n"""\n\nAnalise o conteúdo acima e extraia todos os dados disponíveis retornando exclusivamente o JSON estruturado.`
    } else {
      userPrompt = `Documento: ${fileName} (tipo: ${mimeType})\nImagem codificada em base64 anexada:\ndata:${mimeType};base64,${base64Image}\n\nAnalise a imagem deste documento (conta de luz / CNH / documento de identidade / tabela solar) e extraia todos os dados disponíveis retornando exclusivamente o JSON estruturado.`
    }

    // 3. Garantir conversa FRESCA a cada extração passando conversation_id: null explicitamente
    // O Skip Cloud cria uma thread limpa para este documento em vez de acumular tokens de chamadas anteriores
    let result = null
    try {
      result = $ai.agent('extrator-documentos-solar').chat({
        user_id: userId,
        conversation_id: null,
        message: userPrompt,
      })
    } catch (aiErr) {
      const errMsg = (aiErr && aiErr.message ? aiErr.message : String(aiErr || '')).toLowerCase()
      // Detectar erro de estouro de tokens / context length
      if (
        errMsg.includes('context length') ||
        errMsg.includes('tokens') ||
        errMsg.includes('longer than') ||
        errMsg.includes('too large') ||
        errMsg.includes('maximum context')
      ) {
        return e.json(413, {
          ok: false,
          error:
            'O documento excede o limite de processamento de IA. Reduza a resolução da foto ou envie o arquivo PDF em formato digital.',
        })
      }
      throw aiErr
    }

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
      conversation_id: result ? result.conversation_id : null,
    })
  } catch (err) {
    let status = 500
    let msg = 'Falha ao processar extração de documento'
    if (err && err.status) {
      status = err.status
    }
    if (err && err.message) {
      msg = err.message
      const msgLower = msg.toLowerCase()
      if (
        msgLower.includes('context length') ||
        msgLower.includes('tokens') ||
        msgLower.includes('longer than')
      ) {
        status = 413
        msg =
          'O documento excede o limite de processamento de IA. Reduza a resolução da foto ou envie o arquivo PDF em formato digital.'
      }
    }
    return e.json(status, { error: msg, ok: false })
  }
})
