/**
 * Hook para análise de faturas de energia da RGE usando a API do Google Gemini.
 * Rota POST /backend/v1/analisar-fatura-rge
 *
 * Utiliza o secret GEMINI_API_KEY ($os.getenv("GEMINI_API_KEY")) via REST API do Gemini
 * (com fallback dinâmico entre modelos compatíveis: gemini-2.5-flash, gemini-1.5-flash, gemini-2.0-flash).
 *
 * Suporta arquivo em PDF ou Imagem (PNG/JPG/WEBP) com base64 inline_data ou texto extraído.
 */

routerAdd('POST', '/backend/v1/analisar-fatura-rge', (e) => {
  const reqStart = Date.now()
  let fileName = 'fatura-rge'

  try {
    const authUser = e.auth
    let userId = authUser ? authUser.id : null

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
      console.log('[FATURA RGE] Rejeitado: autenticação necessária')
      return e.json(401, { error: 'Autenticação necessária para processar faturas', ok: false })
    }

    const geminiApiKey = ($os.getenv('GEMINI_API_KEY') || '').trim()
    if (!geminiApiKey) {
      console.log('[FATURA RGE] Erro: GEMINI_API_KEY não configurada nos secrets')
      return e.json(500, {
        ok: false,
        error: 'Chave GEMINI_API_KEY não configurada nas variáveis de ambiente do backend.',
      })
    }

    const body = e.requestInfo().body || {}
    let textContent = (body.text_content || '').trim()
    const base64Data = (body.file_base64 || body.image_base64 || '').trim()
    fileName = body.file_name || 'fatura-rge'
    let mimeType = body.mime_type || ''

    if (!mimeType) {
      const lowerName = fileName.toLowerCase()
      if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf'
      else if (lowerName.endsWith('.png')) mimeType = 'image/png'
      else if (lowerName.endsWith('.webp')) mimeType = 'image/webp'
      else mimeType = 'image/jpeg'
    }

    if (!textContent && !base64Data) {
      return e.json(400, {
        ok: false,
        error: 'Nenhum conteúdo, PDF ou imagem enviado para análise da fatura RGE.',
      })
    }

    console.log(
      `[FATURA RGE] Iniciando análise: arquivo="${fileName}", mime="${mimeType}", text_chars=${textContent.length}, base64_chars=${base64Data.length}`,
    )

    // Instruções rigorosas de extração conforme especificação do usuário
    const promptInstrucoes = `Você é um analista especialista de alta precisão em faturas de energia elétrica da concessionária RGE (Rio Grande Energia / CPFL Energia) para o CRM Delfos Solar.

Analise cuidadosamente o arquivo da fatura em anexo (ou texto extraído) e extraia os dados estritamente conforme as regras abaixo:

REGRAS OBRIGATÓRIAS DE EXTRAÇÃO:
1. Todo dado DEVE vir da fatura. Se algum dado não aparecer explicitamente na fatura, preencha com exatamente "não informado na fatura" (ou null para valores numéricos onde indicado).
2. NUNCA INVENTE VALORES.
3. Valores monetários devem estar em reais (R$), energia em kWh.
4. Se o documento estiver ilegível ou claramente NÃO FOR uma fatura de energia da RGE (ou CPFL/RGE Sul), informe no campo "e_fatura_rge": false e detalhe o motivo em "erro_identificacao".
5. Responda SEMPRE em português brasileiro.
6. Retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto antes ou depois, sem markdown adicional como \`\`\`json.

DISTINÇÃO CRÍTICA ENTRE UC (UNIDADE CONSUMIDORA) E CPF/CNPJ:
- O número da UC (código do cliente / instalação / unidade consumidora) na RGE geralmente aparece formatado com pontos e hífen, por exemplo: "200.419.001-19" ou números como "00419001-1" / "1002345678".
- NUNCA confunda o número da UC com CPF (11 dígitos) ou CNPJ (14 dígitos) do titular.
- NUNCA confunda o número da UC com códigos numéricos do cabeçalho, código de barras, número da nota fiscal, código de débito automático ou chave de acesso da NF3e.
- O campo "cpf_cnpj" só deve conter o CPF (11 dígitos) ou CNPJ (14 dígitos) real do titular cadastrado.

CAMPOS A EXTRAIR:
1. "titular_nome": Nome completo ou razão social do titular da conta
2. "cpf_cnpj": CPF ou CNPJ do titular (formatado com pontuação padrão). Se ausente, preencha "não informado na fatura".
3. "endereco_completo": {
     "rua": string,
     "numero": string,
     "complemento": string,
     "bairro": string,
     "cidade": string,
     "estado": string,
     "cep": string
   }
4. "uc": Número da Unidade Consumidora / Código da Instalação (ex: "200.419.001-19").
5. "classificacao_grupo_subgrupo": Classificação do grupo e subgrupo tarifário (ex: "Convencional B3 Comercial Outros Serviços", "B1 Residencial", "B2 Rural", etc.).
6. "tipo_fornecimento": "monofásico", "bifásico" ou "trifásico" (ou "não informado na fatura").
7. "tensao_nominal": Tensão nominal da rede (ex: "127V", "220V", "380/220V", "13.8kV", etc. ou "não informado na fatura").
8. "tarifa_com_tributos": Valor da tarifa total com tributos em R$/kWh (número ou null).
9. "valor_total_fatura": Valor total a pagar em R$ da fatura atual (número ou null).
10. "mes_referencia_atual": Mês de referência desta fatura (ex: "03/2025" ou "Mar/2025").
11. "historico_consumo": Lista com o histórico de consumo dos últimos 12 a 13 meses exatamente como registrado no quadro "Histórico de Consumo" da fatura. Cada item deve conter:
    - "mes_ano": mês e ano de referência (ex: "03/25", "Fev/25", etc.)
    - "consumo_kwh": número em kWh
    - "dias_ciclo": número de dias faturados no ciclo (se constar, senão 30)

CÁLCULOS AUTOMÁTICOS (calcule a partir dos dados do histórico de consumo extraído):
- "somatorio_consumo_anual_kwh": soma do consumo em kWh de todos os meses do histórico extraído (número).
- "media_mensal_consumo_kwh": média aritmética do consumo mensal em kWh (número arredondado em 2 casas decimais).
- "consumo_medio_diario_kwh": consumo médio diário em kWh (média mensal dividida por 30 ou baseada na soma de kWh / soma de dias_ciclo, com 2 casas decimais).
- "maior_consumo_periodo": { "mes_ano": string, "consumo_kwh": number }
- "menor_consumo_periodo": { "mes_ano": string, "consumo_kwh": number }

FORMATO DO JSON DE RESPOSTA:
{
  "e_fatura_rge": true,
  "concessionaria_detectada": "RGE",
  "erro_identificacao": null,
  "titular_nome": string,
  "cpf_cnpj": string,
  "endereco_completo": {
    "rua": string,
    "numero": string,
    "complemento": string,
    "bairro": string,
    "cidade": string,
    "estado": string,
    "cep": string
  },
  "uc": string,
  "classificacao_grupo_subgrupo": string,
  "tipo_fornecimento": string,
  "tensao_nominal": string,
  "tarifa_com_tributos": number | null,
  "valor_total_fatura": number | null,
  "mes_referencia_atual": string,
  "historico_consumo": [
    {
      "mes_ano": string,
      "consumo_kwh": number,
      "dias_ciclo": number
    }
  ],
  "calculos": {
    "somatorio_consumo_anual_kwh": number,
    "media_mensal_consumo_kwh": number,
    "consumo_medio_diario_kwh": number,
    "maior_consumo_periodo": {
      "mes_ano": string,
      "consumo_kwh": number
    },
    "menor_consumo_periodo": {
      "mes_ano": string,
      "consumo_kwh": number
    }
  }
}`

    // Montar as partes para o Gemini API
    const parts = []

    if (base64Data) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      })
    }

    let userText = `Arquivo recebido: ${fileName} (MIME: ${mimeType})\n`
    if (textContent) {
      userText += `Texto complementar extraído do arquivo:\n"""\n${textContent.substring(0, 100000)}\n"""\n\n`
    }
    userText +=
      'Por favor analise este documento da RGE e extraia todas as informações no formato JSON especificado.'
    parts.push({ text: userText })

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: promptInstrucoes }],
      },
      contents: [
        {
          role: 'user',
          parts: parts,
        },
      ],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: 'application/json',
      },
    }

    // Lista de modelos suportados para fallback resiliente
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
    ]

    let geminiResponse = null
    let lastError = null
    let modelUsed = ''

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i]
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`

      try {
        console.log(`[FATURA RGE] Chamando Gemini API modelo "${model}"...`)
        const res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(geminiPayload),
          timeout: 45,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          geminiResponse = res.json || JSON.parse(res.raw || '{}')
          modelUsed = model
          console.log(`[FATURA RGE] Sucesso na resposta do modelo "${model}"`)
          break
        } else {
          const errDetail = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
          console.log(`[FATURA RGE] Modelo "${model}" retornou ${res.statusCode}: ${errDetail}`)
          lastError = `Modelo ${model}: HTTP ${res.statusCode} - ${errDetail}`
          // Se for 404 de modelo não encontrado, tenta o próximo da lista
          if (res.statusCode === 404) {
            continue
          }
          // Para outros erros (ex: 400 Bad Request por formato inválido ou 429 quota), se for 429 tenta próximo
          if (res.statusCode === 429) {
            continue
          }
          // Caso seja erro terminal de autenticação ou chave
          if (res.statusCode === 403 || res.statusCode === 401) {
            return e.json(500, {
              ok: false,
              error: `Erro de autenticação com a API do Gemini: ${errDetail}`,
            })
          }
        }
      } catch (callErr) {
        lastError = callErr && callErr.message ? callErr.message : String(callErr)
        console.log(`[FATURA RGE] Exceção na chamada ao modelo "${model}": ${lastError}`)
      }
    }

    if (!geminiResponse) {
      return e.json(502, {
        ok: false,
        error: `Não foi possível obter resposta da API do Google Gemini. Detalhes: ${lastError}`,
      })
    }

    // Extrair o texto da resposta do Gemini
    let rawText = ''
    try {
      const candidate =
        geminiResponse.candidates && geminiResponse.candidates[0]
          ? geminiResponse.candidates[0]
          : null
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        rawText = candidate.content.parts[0].text || ''
      }
    } catch (_) {}

    if (!rawText) {
      return e.json(500, {
        ok: false,
        error: 'Resposta vazia retornada pelo modelo Gemini.',
        raw_response: geminiResponse,
      })
    }

    // Limpar delimitadores de markdown se existirem
    let cleanJson = rawText.trim()
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/```$/, '')
        .trim()
    }

    let parsed = null
    try {
      parsed = JSON.parse(cleanJson)
    } catch (parseErr) {
      const firstBrace = cleanJson.indexOf('{')
      const lastBrace = cleanJson.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1))
        } catch (_) {}
      }
    }

    if (!parsed) {
      return e.json(200, {
        ok: false,
        data: null,
        raw_text: rawText,
        error: 'Não foi possível interpretar a resposta da IA como JSON estruturado.',
      })
    }

    // Se o modelo detectou que NÃO é fatura RGE ou está ilegível
    if (parsed.e_fatura_rge === false) {
      return e.json(200, {
        ok: false,
        data: parsed,
        raw_text: rawText,
        error:
          parsed.erro_identificacao ||
          'O documento fornecido não parece ser uma fatura da distribuidora RGE ou está ilegível.',
      })
    }

    // Validação e recálculo determinístico no backend para garantir consistência perfeita
    const historico = Array.isArray(parsed.historico_consumo) ? parsed.historico_consumo : []
    let totalAnual = 0
    let maiorConsumo = { mes_ano: '', consumo_kwh: -1 }
    let menorConsumo = { mes_ano: '', consumo_kwh: 999999999 }
    let totalDias = 0

    historico.forEach((item) => {
      const kwh =
        typeof item.consumo_kwh === 'number' ? item.consumo_kwh : parseFloat(item.consumo_kwh) || 0
      item.consumo_kwh = Math.round(kwh * 100) / 100
      const dias =
        typeof item.dias_ciclo === 'number' ? item.dias_ciclo : parseInt(item.dias_ciclo, 10) || 30
      item.dias_ciclo = dias

      totalAnual += item.consumo_kwh
      totalDias += dias

      if (item.consumo_kwh > maiorConsumo.consumo_kwh) {
        maiorConsumo = { mes_ano: String(item.mes_ano || ''), consumo_kwh: item.consumo_kwh }
      }
      if (item.consumo_kwh < menorConsumo.consumo_kwh) {
        menorConsumo = { mes_ano: String(item.mes_ano || ''), consumo_kwh: item.consumo_kwh }
      }
    })

    const qtdMeses = historico.length > 0 ? historico.length : 1
    const mediaMensal = Math.round((totalAnual / qtdMeses) * 100) / 100
    const mediaDiaria =
      totalDias > 0
        ? Math.round((totalAnual / totalDias) * 100) / 100
        : Math.round((mediaMensal / 30) * 100) / 100

    if (!parsed.calculos) parsed.calculos = {}
    parsed.calculos.somatorio_consumo_anual_kwh = Math.round(totalAnual * 100) / 100
    parsed.calculos.media_mensal_consumo_kwh = mediaMensal
    parsed.calculos.consumo_medio_diario_kwh = mediaDiaria
    if (maiorConsumo.consumo_kwh >= 0) {
      parsed.calculos.maior_consumo_periodo = maiorConsumo
    }
    if (menorConsumo.consumo_kwh < 999999999) {
      parsed.calculos.menor_consumo_periodo = menorConsumo
    }

    // Reforçar regra de ouro: se UC e CPF tiverem os mesmos dígitos, anular CPF
    const rawCpf = parsed.cpf_cnpj
    const rawUc = parsed.uc
    if (rawCpf && typeof rawCpf === 'string') {
      const digCpf = rawCpf.replace(/\D/g, '')
      const digUc = rawUc && typeof rawUc === 'string' ? rawUc.replace(/\D/g, '') : ''
      if (digUc && digCpf === digUc) {
        parsed.cpf_cnpj = 'não informado na fatura'
      } else if (digCpf.length !== 11 && digCpf.length !== 14) {
        if (!parsed.uc || parsed.uc === 'não informado na fatura') {
          parsed.uc = rawCpf
        }
        parsed.cpf_cnpj = 'não informado na fatura'
      }
    }

    const elapsedMs = Date.now() - reqStart
    console.log(
      `[FATURA RGE] Concluído com sucesso em ${elapsedMs}ms via modelo ${modelUsed}. UC="${parsed.uc}", Titular="${parsed.titular_nome}", Histórico=${historico.length} meses`,
    )

    return e.json(200, {
      ok: true,
      data: parsed,
      model_used: modelUsed,
      elapsed_ms: elapsedMs,
      file_name: fileName,
    })
  } catch (err) {
    const elapsedMs = Date.now() - reqStart
    const msg = err && err.message ? err.message : String(err)
    console.log(`[FATURA RGE] Erro fatal após ${elapsedMs}ms: ${msg}`)
    return e.json(500, {
      ok: false,
      error: `Falha interna no processamento da fatura RGE: ${msg}`,
    })
  }
})
