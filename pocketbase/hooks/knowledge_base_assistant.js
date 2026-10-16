/**
 * Hook para a Base de Conhecimento do CRM Delfos Solar:
 * 1. Rota POST /backend/v1/assistente-delfos
 *    - Recebe a pergunta do usuário e histórico recente da sessão (body.historico)
 *    - Busca semântica avançada via embeddings Gemini (text-embedding-004, gemini-embedding-001 e $ai.embed)
 *    - Similaridade de cosseno combinada com pontuação léxica de palavras-chave como reforço
 *    - Utiliza os top 6 artigos mais relevantes
 *    - Incorpora o texto_extraido INTEGRAL de documentos anexados (sem corte de 3000 chars; limite total de contexto de 30k chars)
 *    - Identifica a categoria de origem mais relevante
 *    - Modelos Gemini válidos: gemini-3.8-flash, gemini-3.5-flash, gemini-3.5-flash-lite (timeout 60s)
 *    - Envia histórico conversacional recente antes da pergunta atual
 *    - Fallback seguro para $ai.chat
 *    - Mantém exatamente as regras de resposta vigentes (português, citar categoria, frase padrão estrita se não encontrar)
 * 2. Rota POST /backend/v1/extrair-texto-anexo
 *    - Extrai texto de PDFs, Word (.docx) e imagens via OCR/Visão com Gemini para indexação
 */

routerAdd('POST', '/backend/v1/assistente-delfos', (e) => {
  try {
    const authUser = e.auth
    if (!authUser || !authUser.id) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const pergunta = (body.pergunta || body.message || '').trim()
    const categoriaFiltroId = body.categoria_id || null
    const historicoRecebido = Array.isArray(body.historico) ? body.historico : []

    if (!pergunta) {
      return e.json(400, { error: 'Pergunta é obrigatória', ok: false })
    }

    // Funções utilitárias inline para isolamento de VM goja
    const computeCosineSimilarity = (vecA, vecB) => {
      if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0
      let dotProduct = 0
      let normA = 0
      let normB = 0
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
      }
      if (normA === 0 || normB === 0) return 0
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
    }

    const getEmbedding = (textToEmbed, apiKey) => {
      if (!textToEmbed || !apiKey) return null
      const sanitized = textToEmbed.slice(0, 4000)
      const candidateModels = ['text-embedding-004', 'gemini-embedding-001', 'embedding-001']

      for (let m = 0; m < candidateModels.length; m++) {
        const model = candidateModels[m]
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`
        const payload = {
          model: `models/${model}`,
          content: {
            parts: [{ text: sanitized }],
          },
        }

        try {
          const res = $http.send({
            url: url,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            timeout: 25,
          })

          if (res.statusCode >= 200 && res.statusCode < 300) {
            const data = res.json || JSON.parse(res.raw || '{}')
            const values = data?.embedding?.values || data?.embeddings?.[0]?.values || data?.values
            if (values && Array.isArray(values) && values.length > 0) {
              return values
            }
          } else {
            console.log(
              `[ASSISTENTE DELFOS] Embedding ${model} status ${res.statusCode}:`,
              (res.raw || '').substring(0, 200),
            )
          }
        } catch (callErr) {
          console.log(`[ASSISTENTE DELFOS] Erro embedding ${model}:`, callErr)
        }
      }

      // Fallback para $ai.embed se disponível
      try {
        if (typeof $ai !== 'undefined' && typeof $ai.embed === 'function') {
          const aiRes = $ai.embed({ input: sanitized.slice(0, 2700) })
          if (aiRes?.data?.[0]?.embedding) {
            return aiRes.data[0].embedding
          }
        }
      } catch (skipAiErr) {
        console.log('[ASSISTENTE DELFOS] Erro fallback embedding $ai:', skipAiErr)
      }

      return null
    }

    // 1. Carregar categorias e artigos da Base de Conhecimento
    let categoriesMap = {}
    try {
      const cats = $app.findRecordsByFilter('knowledge_categories', '', 'ordem', 100, 0)
      for (let i = 0; i < cats.length; i++) {
        categoriesMap[cats[i].id] = cats[i].getString('titulo')
      }
    } catch (errCats) {
      console.log('[ASSISTENTE DELFOS] Erro ao carregar categorias:', errCats)
    }

    let filter = ''
    if (categoriaFiltroId) {
      filter = `categoria_id = '${categoriaFiltroId}'`
    }

    let articles = []
    try {
      articles = $app.findRecordsByFilter('knowledge_articles', filter, '-created', 100, 0)
    } catch (errArts) {
      console.log('[ASSISTENTE DELFOS] Erro ao carregar artigos:', errArts)
    }

    if (!articles || articles.length === 0) {
      return e.json(200, {
        ok: true,
        resposta:
          'Não encontrei essa informação na base de conhecimento. Deseja cadastrar um novo artigo sobre este tema?',
        encontrado: false,
        categoria_origem: null,
        artigos_utilizados: [],
      })
    }

    // 2. Pontuação léxica de palavras-chave (reforço)
    const sanitizeWord = (w) =>
      w
        .toLowerCase()
        .replace(/[^\w\sáéíóúâêîôûãõç]/g, '')
        .trim()
    const rawTokens = pergunta.toLowerCase().split(/\s+/)
    const stopWords = [
      'de',
      'a',
      'o',
      'que',
      'e',
      'do',
      'da',
      'em',
      'um',
      'para',
      'é',
      'com',
      'não',
      'uma',
      'os',
      'no',
      'se',
      'na',
      'por',
      'mais',
      'as',
      'dos',
      'como',
      'mas',
      'foi',
      'ao',
      'ele',
      'das',
      'tem',
      'à',
      'seu',
      'sua',
      'ou',
      'ser',
      'quando',
      'muito',
      'há',
      'nos',
      'já',
      'está',
      'eu',
      'também',
      'só',
      'pelo',
      'pela',
      'até',
      'isso',
      'ela',
      'entre',
      'era',
      'depois',
      'sem',
      'mesmo',
      'aos',
      'ter',
      'seus',
      'quem',
      'nas',
      'me',
      'esse',
      'eles',
      'estão',
      'você',
      'tinha',
      'foram',
      'essa',
      'num',
      'qual',
      'quais',
      'onde',
      'como',
      'fazer',
      'saber',
      'sobre',
      'delfos',
      'solar',
      'gostaria',
      'preciso',
      'ajuda',
      'dúvida',
      'duvida',
      'ola',
      'olá',
      'bom',
      'dia',
      'tarde',
      'noite',
    ]

    const queryKeywords = rawTokens
      .map(sanitizeWord)
      .filter((t) => t.length >= 3 && !stopWords.includes(t))

    // 3. Obtenção do embedding da pergunta para busca semântica
    const geminiApiKey = ($os.getenv('GEMINI_API_KEY') || '').trim()
    let queryEmbedding = null
    if (geminiApiKey) {
      queryEmbedding = getEmbedding(pergunta, geminiApiKey)
    }

    if (!queryEmbedding) {
      console.log('[ASSISTENTE DELFOS] Embeddings indisponíveis — busca cai para léxica')
    }

    // 4. Ranqueamento dos artigos: similaridade de cosseno (semântica) + reforço de palavras-chave
    const scoredArticles = []

    for (let i = 0; i < articles.length; i++) {
      const art = articles[i]
      const titulo = art.getString('titulo') || ''
      const conteudo = art.getString('conteudo') || ''
      const textoExtraido = art.getString('texto_extraido') || ''
      const tags = art.getString('tags') || ''
      const catId = art.getString('categoria_id')
      const catNome = categoriesMap[catId] || 'Geral'

      // A) Score por palavras-chave
      const haystack = (titulo + ' ' + tags + ' ' + conteudo + ' ' + textoExtraido).toLowerCase()
      let keywordScore = 0

      if (haystack.includes(pergunta.toLowerCase())) {
        keywordScore += 30
      }

      for (let k = 0; k < queryKeywords.length; k++) {
        const kw = queryKeywords[k]
        if (titulo.toLowerCase().includes(kw)) {
          keywordScore += 15
        }
        if (tags.toLowerCase().includes(kw)) {
          keywordScore += 10
        }
        if (conteudo.toLowerCase().includes(kw)) {
          keywordScore += 4
        }
        if (textoExtraido.toLowerCase().includes(kw)) {
          keywordScore += 3
        }
      }

      // B) Score semântico via embeddings
      let semanticSimilarity = 0
      if (queryEmbedding && geminiApiKey) {
        // Sintetiza texto representativo do artigo para o embedding
        const textoParaEmbedding = (
          `Título: ${titulo}\nTags: ${tags}\nConteúdo: ${conteudo.slice(0, 1500)}\n` +
          (textoExtraido ? `Texto anexos: ${textoExtraido.slice(0, 2000)}` : '')
        ).trim()

        const artVec = getEmbedding(textoParaEmbedding, geminiApiKey)
        if (artVec) {
          semanticSimilarity = computeCosineSimilarity(queryEmbedding, artVec)
        }
      }

      // Score final combinado: similaridade semântica (0 a 1) escalada para 100 pontos + reforço de termos
      let totalScore = 0
      if (semanticSimilarity > 0) {
        totalScore = semanticSimilarity * 100 + keywordScore * 0.5
      } else {
        totalScore = keywordScore
      }

      scoredArticles.push({
        id: art.id,
        titulo: titulo,
        conteudo: conteudo,
        texto_extraido: textoExtraido,
        categoria_id: catId,
        categoria_nome: catNome,
        score: totalScore,
        semanticSimilarity: semanticSimilarity,
        keywordScore: keywordScore,
      })
    }

    scoredArticles.sort((a, b) => b.score - a.score)

    // Critério de corte: relevância semântica razoável ou pontuação de palavras-chave
    const melhorArtigo = scoredArticles[0]
    const temRelevancia =
      melhorArtigo &&
      (melhorArtigo.semanticSimilarity >= 0.42 ||
        melhorArtigo.keywordScore >= 3 ||
        melhorArtigo.score >= 42)

    if (!temRelevancia) {
      return e.json(200, {
        ok: true,
        resposta:
          'Não encontrei essa informação na base de conhecimento. Deseja cadastrar um novo artigo sobre este tema?',
        encontrado: false,
        categoria_origem: null,
        artigos_utilizados: [],
      })
    }

    // 5. Selecionar os top 6 artigos mais relevantes
    const topArticles = scoredArticles.slice(0, 6)
    const categoriaOrigem = topArticles[0].categoria_nome

    // 6. Montar o contexto para a IA com salvaguarda rigorosa de tamanho
    // Cada artigo tem seu texto extraído limitado a 15k chars e o contexto total a 30k chars
    // para garantir margem de segurança folgada contra limites de tokens da API Gemini.
    let contextStr = ''
    const MAX_TEXTO_POR_ARTIGO = 15000
    const MAX_CONTEXTO_TOTAL = 30000

    for (let j = 0; j < topArticles.length; j++) {
      const a = topArticles[j]
      let blocoArtigo = `\n\n--- ARTIGO ${j + 1} (Categoria: ${a.categoria_nome}) ---\n`
      blocoArtigo += `Título: ${a.titulo}\n`
      blocoArtigo += `Conteúdo:\n${(a.conteudo || '').slice(0, 8000)}\n`
      if (a.texto_extraido && a.texto_extraido.trim()) {
        const extraidoLimpo = a.texto_extraido.trim()
        const extraidoCortado =
          extraidoLimpo.length > MAX_TEXTO_POR_ARTIGO
            ? extraidoLimpo.slice(0, MAX_TEXTO_POR_ARTIGO) + '\n... [trecho do anexo truncado]'
            : extraidoLimpo
        blocoArtigo += `Texto complementar extraído de documentos anexados:\n${extraidoCortado}\n`
      }

      if ((contextStr + blocoArtigo).length > MAX_CONTEXTO_TOTAL) {
        const espacoRestante = Math.max(0, MAX_CONTEXTO_TOTAL - contextStr.length - 100)
        if (espacoRestante > 200) {
          contextStr +=
            blocoArtigo.substring(0, espacoRestante) +
            '\n... [restante do documento omitido por limite de contexto]'
        }
        break
      } else {
        contextStr += blocoArtigo
      }
    }

    const systemPromptAssistente = `Você é o Assistente Delfos, um assistente inteligente integrado ao CRM da Delfos Solar (empresa especializada em projetos, homologação de energia solar e O&M no Rio Grande do Sul).

SUAS REGRAS PERMANENTES E OBRIGATÓRIAS:
1. Responda estritamente em português do Brasil com tom profissional, claro, técnico e seguro.
2. Toda resposta DEVE ser fundamentada exclusivamente na Base de Conhecimento fornecida no contexto abaixo.
3. IDENTIFICAÇÃO DA CATEGORIA OBRIGATÓRIA: Inicie ou mencione explicitamente na resposta de qual categoria da Base de Conhecimento veio a informação (exato formato recomendado: "De acordo com a base de conhecimento de ${categoriaOrigem}..." ou "Conforme documentado na base de conhecimento de ${categoriaOrigem}...").
4. CITE fatos, números, normas e dados técnicos exatamente como constam na documentação fornecida.
5. Se a resposta para a dúvida NÃO estiver presente ou não puder ser deduzida com certeza dos artigos fornecidos no contexto, responda EXATAMENTE e APENAS a seguinte frase:
"Não encontrei essa informação na base de conhecimento. Deseja cadastrar um novo artigo sobre este tema?"
(Não acrescente desculpas, não invente respostas genéricas de internet).
6. Mantenha a resposta concisa, bem formatada com listas e tópicos quando aplicável.`

    // Formatação do prompt com o histórico recente da conversa
    // Salvaguarda: corta o histórico antigo mantendo no máximo as últimas 4 a 6 mensagens mais recentes
    // e com teto de caracteres por mensagem (1.500 chars) e total (6.000 chars) para evitar erro 400 "Input too long".
    let historicoTexto = ''
    const MAX_HISTORICO_CHARS_TOTAL = 6000
    const MAX_CHARS_POR_MSG = 1500

    // Filtra e normaliza itens válidos do histórico mais recente (máx 6)
    let msgsValidasHist = []
    if (historicoRecebido && historicoRecebido.length > 0) {
      const msgsFiltradas = historicoRecebido
        .filter((h) => h && typeof h.content === 'string' && h.content.trim())
        .slice(-6)

      // Monta da mais recente para a mais antiga para garantir que as mais recentes fiquem dentro do teto
      let charsAcumulados = 0
      const msgsFinaisReversas = []
      for (let idx = msgsFiltradas.length - 1; idx >= 0; idx--) {
        const item = msgsFiltradas[idx]
        const conteudoTrunk = item.content.trim().slice(0, MAX_CHARS_POR_MSG)
        if (charsAcumulados + conteudoTrunk.length <= MAX_HISTORICO_CHARS_TOTAL) {
          msgsFinaisReversas.push({
            role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
            origRole: item.role,
            content: conteudoTrunk,
          })
          charsAcumulados += conteudoTrunk.length
        } else {
          // Se não cabe mais mensagens inteiras, interrompe (corta histórico antigo)
          break
        }
      }
      msgsValidasHist = msgsFinaisReversas.reverse()

      if (msgsValidasHist.length > 0) {
        historicoTexto = 'Histórico recente da conversa com o usuário:\n'
        for (let h = 0; h < msgsValidasHist.length; h++) {
          const item = msgsValidasHist[h]
          const papel = item.role === 'user' ? 'Usuário' : 'Assistente'
          historicoTexto += `[${papel}]: ${item.content}\n`
        }
        historicoTexto += '\n'
      }
    }

    const userPrompt = `Contexto da Base de Conhecimento Delfos Solar:
${contextStr}

${historicoTexto}Pergunta atual do usuário:
"${pergunta}"

Por favor elabore a resposta seguindo rigorosamente as instruções.`

    // 7. Chamada ao Gemini API com modelos existentes e timeout de 60s (gemini-3.8-flash, gemini-3.5-flash, gemini-3.5-flash-lite)
    let respostaTexto = ''
    let modelUsed = ''
    let erroInputTooLong = false

    if (geminiApiKey) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']

      const contentsPayload = []

      // Injeta mensagens anteriores do histórico truncado
      if (msgsValidasHist && msgsValidasHist.length > 0) {
        for (let h = 0; h < msgsValidasHist.length; h++) {
          const item = msgsValidasHist[h]
          contentsPayload.push({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.content }],
          })
        }
      }

      // Adiciona o turno atual
      contentsPayload.push({
        role: 'user',
        parts: [{ text: userPrompt }],
      })

      const geminiPayload = {
        system_instruction: {
          parts: [{ text: systemPromptAssistente }],
        },
        contents: contentsPayload,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }

      for (let m = 0; m < candidateModels.length; m++) {
        const model = candidateModels[m]
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`
        try {
          const res = $http.send({
            url: url,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload),
            timeout: 60,
          })

          if (res.statusCode >= 200 && res.statusCode < 300) {
            const data = res.json || JSON.parse(res.raw || '{}')
            if (
              data.candidates &&
              data.candidates[0] &&
              data.candidates[0].content &&
              data.candidates[0].content.parts &&
              data.candidates[0].content.parts[0]
            ) {
              respostaTexto = data.candidates[0].content.parts[0].text || ''
              modelUsed = `gemini:${model}`
              break
            }
          } else {
            const rawBody = String(res.raw || '')
            console.log(`[ASSISTENTE DELFOS] Gemini ${model} status ${res.statusCode}:`, rawBody)
            if (
              rawBody.toLowerCase().includes('input too long') ||
              rawBody.toLowerCase().includes('limit is') ||
              rawBody.toLowerCase().includes('tokens')
            ) {
              erroInputTooLong = true
            }
          }
        } catch (callErr) {
          console.log(`[ASSISTENTE DELFOS] Erro chamada Gemini ${model}:`, callErr)
          const errStr = String(callErr || '').toLowerCase()
          if (errStr.includes('input too long') || errStr.includes('token')) {
            erroInputTooLong = true
          }
        }
      }
    }

    // 8. Fallback nativo para $ai.chat (utilizando o histórico truncado)
    if (!respostaTexto) {
      try {
        const messagesAiChat = [{ role: 'system', content: systemPromptAssistente }]

        if (msgsValidasHist && msgsValidasHist.length > 0) {
          for (let h = 0; h < msgsValidasHist.length; h++) {
            const item = msgsValidasHist[h]
            messagesAiChat.push({
              role: item.role === 'model' || item.origRole === 'assistant' ? 'assistant' : 'user',
              content: item.content,
            })
          }
        }

        messagesAiChat.push({
          role: 'user',
          content: userPrompt,
        })

        const aiRes = $ai.chat({
          model: 'fast',
          messages: messagesAiChat,
        })
        if (
          aiRes &&
          aiRes.choices &&
          aiRes.choices[0] &&
          aiRes.choices[0].message &&
          aiRes.choices[0].message.content
        ) {
          respostaTexto = aiRes.choices[0].message.content.trim()
          modelUsed = 'skip-ai:fast'
        }
      } catch (aiErr) {
        console.log('[ASSISTENTE DELFOS] Erro fallback $ai.chat:', aiErr)
      }
    }

    if (!respostaTexto) {
      // Se ocorreu erro de limite de tokens/input too long, responde com mensagem amigável em vez de 500 silencioso
      if (erroInputTooLong) {
        return e.json(200, {
          ok: true,
          resposta:
            'A conversa ou os documentos anexados ultrapassaram o limite de leitura do assistente. Por favor, envie sua dúvida com uma pergunta mais pontual ou inicie um novo tópico.',
          encontrado: false,
          categoria_origem: categoriaOrigem,
          artigos_utilizados: topArticles.map((a) => ({
            id: a.id,
            titulo: a.titulo,
            categoria: a.categoria_nome,
          })),
          model_used: 'friendly_fallback:input_too_long',
        })
      }

      return e.json(500, {
        ok: false,
        error: 'Não foi possível gerar a resposta no momento. Tente novamente.',
      })
    }

    return e.json(200, {
      ok: true,
      resposta: respostaTexto.trim(),
      encontrado: !respostaTexto.includes('Não encontrei essa informação na base de conhecimento'),
      categoria_origem: categoriaOrigem,
      artigos_utilizados: topArticles.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        categoria: a.categoria_nome,
      })),
      model_used: modelUsed,
    })
  } catch (err) {
    console.log('[ASSISTENTE DELFOS] Erro geral:', err)
    return e.json(500, {
      ok: false,
      error: 'Erro interno ao consultar o Assistente Delfos: ' + (err.message || String(err)),
    })
  }
})

/**
 * Endpoint para extrair e indexar texto de documentos anexados (PDF, Word, Imagens com OCR via Gemini Vision)
 */
routerAdd('POST', '/backend/v1/extrair-texto-anexo', (e) => {
  try {
    const authUser = e.auth
    if (!authUser || !authUser.id) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const fileName = body.file_name || 'anexo'
    const mimeType = body.mime_type || ''
    const base64Data = (body.file_base64 || '').trim()
    let textContent = (body.text_content || '').trim()

    // Se já recebemos texto legível (extraído do PDF pelo pdfjs ou docx)
    if (textContent && textContent.length > 50) {
      return e.json(200, {
        ok: true,
        texto_extraido: textContent.substring(0, 50000),
        metodo: 'texto_direto',
      })
    }

    // Se for imagem ou PDF escaneado e tiver base64, usar Gemini Vision para transcrição
    if (base64Data && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
      const geminiApiKey = ($os.getenv('GEMINI_API_KEY') || '').trim()
      if (geminiApiKey) {
        const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']
        const promptOcr =
          'Você é um assistente de extração de texto para a Base de Conhecimento técnica e comercial da Delfos Solar. Transcreva todo o texto, tabelas, dados técnicos, números e informações legíveis contidas neste documento/imagem de forma fiel e estruturada em texto puro legível.'

        const geminiPayload = {
          system_instruction: {
            parts: [{ text: promptOcr }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
                    data: base64Data,
                  },
                },
                { text: `Extraia integralmente todo o texto visível deste arquivo: ${fileName}` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }

        for (let m = 0; m < candidateModels.length; m++) {
          const model = candidateModels[m]
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`
          try {
            const res = $http.send({
              url: url,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(geminiPayload),
              timeout: 45,
            })
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const data = res.json || JSON.parse(res.raw || '{}')
              const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text
              if (txt) {
                return e.json(200, {
                  ok: true,
                  texto_extraido: txt.trim(),
                  metodo: `gemini_vision:${model}`,
                })
              }
            }
          } catch (ocrErr) {
            console.log(`[EXTRAIR ANEXO] Erro Gemini ${model}:`, ocrErr)
          }
        }
      }

      // Fallback para $ai.chat se for imagem
      if (mimeType.startsWith('image/')) {
        try {
          const aiRes = $ai.chat({
            model: 'fast',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Transcreva todo o texto visível nesta imagem para nossa base de conhecimento solar.',
                  },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${base64Data}` },
                  },
                ],
              },
            ],
          })
          const content = aiRes?.choices?.[0]?.message?.content
          if (content) {
            return e.json(200, {
              ok: true,
              texto_extraido: content.trim(),
              metodo: 'skip_ai_vision',
            })
          }
        } catch (aiVisionErr) {
          console.log('[EXTRAIR ANEXO] Erro AI Vision:', aiVisionErr)
        }
      }
    }

    return e.json(200, {
      ok: true,
      texto_extraido: textContent || '',
      metodo: 'conteudo_original',
    })
  } catch (err) {
    return e.json(500, {
      ok: false,
      error: 'Falha ao extrair texto do anexo: ' + (err.message || String(err)),
    })
  }
})
