/**
 * Hook para a Base de Conhecimento do CRM Delfos Solar:
 * 1. Rota POST /backend/v1/assistente-delfos
 *    - Recebe a pergunta do usuário e histórico recente da sessão
 *    - Busca os artigos mais relevantes na base de conhecimento (título, conteúdo, texto_extraido, tags)
 *    - Identifica a categoria de origem mais relevante
 *    - Invoca Gemini (com fallback $ai.chat) para interpretar documentos e responder com tom profissional
 *    - Se não encontrar informação na base: responde exatamente "Não encontrei essa informação na base de conhecimento. Deseja cadastrar um novo artigo sobre este tema?"
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

    if (!pergunta) {
      return e.json(400, { error: 'Pergunta é obrigatória', ok: false })
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

    // 2. Classificação de relevância por termos e palavras-chave da pergunta
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

    const scoredArticles = []

    for (let i = 0; i < articles.length; i++) {
      const art = articles[i]
      const titulo = art.getString('titulo') || ''
      const conteudo = art.getString('conteudo') || ''
      const textoExtraido = art.getString('texto_extraido') || ''
      const tags = art.getString('tags') || ''
      const catId = art.getString('categoria_id')
      const catNome = categoriesMap[catId] || 'Geral'

      const haystack = (titulo + ' ' + tags + ' ' + conteudo + ' ' + textoExtraido).toLowerCase()
      let score = 0

      // Match exato com frase
      if (haystack.includes(pergunta.toLowerCase())) {
        score += 30
      }

      for (let k = 0; k < queryKeywords.length; k++) {
        const kw = queryKeywords[k]
        if (titulo.toLowerCase().includes(kw)) {
          score += 15
        }
        if (tags.toLowerCase().includes(kw)) {
          score += 10
        }
        if (conteudo.toLowerCase().includes(kw)) {
          score += 4
        }
        if (textoExtraido.toLowerCase().includes(kw)) {
          score += 3
        }
      }

      if (score > 0) {
        scoredArticles.push({
          id: art.id,
          titulo: titulo,
          conteudo: conteudo,
          texto_extraido: textoExtraido,
          categoria_id: catId,
          categoria_nome: catNome,
          score: score,
        })
      }
    }

    scoredArticles.sort((a, b) => b.score - a.score)

    // Se nenhuma palavra-chave pontuou com relevância mínima
    if (scoredArticles.length === 0 || (queryKeywords.length > 0 && scoredArticles[0].score < 3)) {
      return e.json(200, {
        ok: true,
        resposta:
          'Não encontrei essa informação na base de conhecimento. Deseja cadastrar um novo artigo sobre este tema?',
        encontrado: false,
        categoria_origem: null,
        artigos_utilizados: [],
      })
    }

    // Selecionar os top 3 artigos mais relevantes
    const topArticles = scoredArticles.slice(0, 3)
    const categoriaOrigem = topArticles[0].categoria_nome

    // Montar o contexto para a IA
    let contextStr = ''
    for (let j = 0; j < topArticles.length; j++) {
      const a = topArticles[j]
      contextStr += `\n\n--- ARTIGO ${j + 1} (Categoria: ${a.categoria_nome}) ---\n`
      contextStr += `Título: ${a.titulo}\n`
      contextStr += `Conteúdo:\n${a.conteudo}\n`
      if (a.texto_extraido) {
        contextStr += `Texto complementar extraído de documentos anexados:\n${a.texto_extraido.substring(0, 3000)}\n`
      }
    }

    // Limitar contexto geral
    if (contextStr.length > 15000) {
      contextStr = contextStr.substring(0, 15000) + '...'
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

    const userPrompt = `Contexto da Base de Conhecimento Delfos Solar:
${contextStr}

Pergunta do usuário:
"${pergunta}"

Por favor elabore a resposta seguindo rigorosamente as instruções.`

    // Chamada ao Gemini API com fallback para $ai.chat
    const geminiApiKey = ($os.getenv('GEMINI_API_KEY') || '').trim()
    let respostaTexto = ''
    let modelUsed = ''

    if (geminiApiKey) {
      const candidateModels = [
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-3.7-flash',
      ]

      const geminiPayload = {
        system_instruction: {
          parts: [{ text: systemPromptAssistente }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
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
            timeout: 30,
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
          }
        } catch (callErr) {
          console.log(`[ASSISTENTE DELFOS] Erro chamada Gemini ${model}:`, callErr)
        }
      }
    }

    // Fallback nativo $ai.chat
    if (!respostaTexto) {
      try {
        const aiRes = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: systemPromptAssistente },
            { role: 'user', content: userPrompt },
          ],
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
        const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash']
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
              timeout: 35,
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
