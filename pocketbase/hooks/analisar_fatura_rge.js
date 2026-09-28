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
    const promptInstrucoes = `Você é um analista especialista de alta precisão em faturas de energia elétrica da concessionária RGE (Rio Grande Energia / CPFL Energia / RGE SUL - DANF3E) para o CRM Delfos Solar.

Analise cuidadosamente o arquivo da fatura em anexo (ou texto extraído) e extraia os dados estritamente conforme as regras abaixo:

REGRAS OBRIGATÓRIAS E PERMANENTES:
1. TODO DADO DEVE VIR DA FATURA. Se algum dado não constar na fatura, preencha com exatamente "não informado na fatura" (ou null para valores numéricos onde indicado).
2. NUNCA INVENTE VALORES. Jamais crie ou deduza informações que não estejam escritas no documento.
3. Se a fatura estiver ilegível ou claramente NÃO FOR uma fatura de energia da RGE / CPFL / RGE SUL, retorne "e_fatura_rge": false e descreva o motivo em "erro_identificacao".
4. Responda SEMPRE em português brasileiro.
5. Retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto antes ou depois, sem blocos markdown.

INSTRUÇÕES DETALHADAS POR CAMPO:

1. NÚMERO DA UC (UNIDADE CONSUMIDORA) - REGRA CRÍTICA:
   - Localize o rótulo literal "Número da UC" ou "Unidade Consumidora" (a fatura RGE traz explicitamente uma caixa destacada com o título "Número da UC", e há avisos como: "Consulte o novo código nesta fatura, no campo 'Número da UC'").
   - O valor DEVE ser retornado exatamente como aparece formatado na fatura, com pontos e hífen. Exemplo real: "200.419.001-19".
   - NUNCA retorne o código de instalação numérico simples (ex: "14303744" que é o medidor/instalação legada).
   - NUNCA confunda o Número da UC com o CPF ou CNPJ do titular (ex: CNPJ "21.379.952/0001-38").
   - NUNCA confunda com chave de acesso da NF3e, código de barras, número da nota fiscal ou protocolo de autorização.

2. ENDEREÇO COMPLETO DA UNIDADE CONSUMIDORA:
   - Extraia o endereço completo da unidade consumidora contendo todos os componentes disponíveis na fatura:
     rua (logradouro), número, complemento, bairro, cidade, estado (UF) e CEP.
   - Qualquer componente que não constar explicitamente na fatura deve receber exatamente o valor "não informado na fatura".
   - Exemplo da fatura RGE: rua: "R ESPIRITO SANTO", numero: "275", complemento: "não informado na fatura", bairro: "FATIMA", cidade: "ERECHIM", estado: "RS", cep: "99709-296".

3. HISTÓRICO DE CONSUMO E CÁLCULO DA MÉDIA:
   - Extraia TODOS os meses registrados na tabela ou gráfico de histórico ("Consumo / kWh" ou "Consumo faturado / Nº dias") da fatura.
   - Na fatura RGE podem existir 12, 13 ou outro número de meses registrados (ex: 13 meses: SET 26 com 132 kWh e 29 dias, AGO 26 com 124 kWh e 30 dias, ..., SET 25 com 1 kWh e 30 dias).
   - Para cada mês do histórico extraia:
     * "mes_ano": mês e ano exatamente como consta na tabela (ex: "SET 26", "AGO 26", "SET 25")
     * "consumo_kwh": valor faturado em kWh (número)
     * "dias_ciclo": número de dias do ciclo faturado (número, ex: 29, 30, 32)
   - CÁLCULO DA MÉDIA MENSAL: deve ser a SOMA de todos os meses do histórico extraído dividida pelo NÚMERO TOTAL DE MESES DE REGISTRO extraídos (NÃO fixar em 12 meses! Se houver 13 meses, divida por 13; se houver 11, divida por 11).

4. VALOR DA TARIFA (SOMA DAS DUAS COMPONENTES TUSD + TE):
   - Na tabela de itens faturados da fatura da RGE ("Descrição da operação"), localize as duas componentes de consumo com tributos da distribuidora:
     * Componente TUSD: "Consumo Uso Sistema [KWh]-TUSD" -> extraia a "Tarifa com tributos R$" (ex: 0,74643940)
     * Componente TE: "Consumo - TE" -> extraia a "Tarifa com tributos R$" (ex: 0,45174243)
   - O campo "tarifa_com_tributos" DEVE SER a SOMA exata dessas duas componentes (TUSD com tributos + TE com tributos). Exemplo: 0,74643940 + 0,45174243 = 1.19818183 R$/kWh.
   - Forneça também o detalhamento no objeto "detalhes_tarifa": { "tarifa_tusd_com_tributos": number, "tarifa_te_com_tributos": number, "tarifa_total_com_tributos": number }.

5. TIPO DE FORNECIMENTO:
   - Localize o rótulo literal "Tipo de Fornecimento:" na fatura (geralmente próximo a Classificação e Tensão Nominal).
   - Extraia o valor informado na fatura, tipicamente: "Monofásico", "Bifásico" ou "Trifásico" (ou "não informado na fatura").

6. DEMAIS CAMPOS DA FATURA:
   - "titular_nome": Razão social ou nome completo do titular (ex: "DELFOS ENGENHARIA EIRELI").
   - "cpf_cnpj": CPF ou CNPJ formatado (ex: "21.379.952/0001-38").
   - "classificacao_grupo_subgrupo": ex: "Convencional B3 Comercial Outros Serviços".
   - "tensao_nominal": ex: "Disp.: 220" ou "220V".
   - "valor_total_fatura": Valor total a pagar em R$ (número ou null caso esteja zerada / não pague / asteriscos).
   - "mes_referencia_atual": Mês de referência (ex: "SET/2026").

FORMATO JSON DE RETORNO OBRIGATÓRIO:
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
  "detalhes_tarifa": {
    "tarifa_tusd_com_tributos": number | null,
    "tarifa_te_com_tributos": number | null,
    "tarifa_total_com_tributos": number | null
  },
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
    "quantidade_meses_historico": number,
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
    // Lista de modelos atualizados suportados pela Gemini API (v1beta)
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
    ]

    let geminiResponse = null
    let lastError = null
    let modelUsed = ''

    if (geminiApiKey) {
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
            modelUsed = `gemini:${model}`
            console.log(`[FATURA RGE] Sucesso na resposta do modelo "${model}"`)
            break
          } else {
            const errDetail = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
            console.log(`[FATURA RGE] Modelo "${model}" retornou ${res.statusCode}: ${errDetail}`)
            lastError = `Modelo ${model}: HTTP ${res.statusCode} - ${errDetail}`
            if (res.statusCode === 404 || res.statusCode === 429) {
              continue
            }
            if (res.statusCode === 403 || res.statusCode === 401) {
              // Não quebra imediatamente se tiver fallback para $ai.chat
              break
            }
          }
        } catch (callErr) {
          lastError = callErr && callErr.message ? callErr.message : String(callErr)
          console.log(`[FATURA RGE] Exceção na chamada ao modelo "${model}": ${lastError}`)
        }
      }
    }

    let rawText = ''

    if (geminiResponse) {
      try {
        const candidate =
          geminiResponse.candidates && geminiResponse.candidates[0]
            ? geminiResponse.candidates[0]
            : null
        if (
          candidate &&
          candidate.content &&
          candidate.content.parts &&
          candidate.content.parts[0]
        ) {
          rawText = candidate.content.parts[0].text || ''
        }
      } catch (_) {}
    }

    // Se a chamada Gemini direta não respondeu, fallback transparente e robusto para $ai.chat nativo do Skip
    if (!rawText) {
      console.log(
        `[FATURA RGE] Gemini direto indisponível (${lastError || 'sem resposta'}). Acionando fallback nativo $ai.chat...`,
      )
      try {
        const aiMessages = [
          { role: 'system', content: promptInstrucoes },
          {
            role: 'user',
            content: `Arquivo: ${fileName} (MIME: ${mimeType})\n\nTexto extraído da fatura:\n"""\n${textContent}\n"""\n\nExtraia rigorosamente os dados da fatura RGE conforme as instruções e retorne exclusivamente o JSON estruturado.`,
          },
        ]
        const aiRes = $ai.chat({
          model: 'fast',
          messages: aiMessages,
        })
        if (
          aiRes &&
          aiRes.choices &&
          aiRes.choices[0] &&
          aiRes.choices[0].message &&
          aiRes.choices[0].message.content
        ) {
          rawText = aiRes.choices[0].message.content.trim()
          modelUsed = 'skip-ai:fast'
          console.log('[FATURA RGE] Sucesso na análise via $ai.chat (fallback nativo)')
        }
      } catch (aiErr) {
        console.log(
          `[FATURA RGE] Erro no fallback $ai.chat: ${aiErr && aiErr.message ? aiErr.message : aiErr}`,
        )
      }
    }

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

    // Validação, deduplicação e ordenação cronológica (mais antigo -> mais recente) do histórico
    const rawHistorico = Array.isArray(parsed.historico_consumo) ? parsed.historico_consumo : []

    const mesesMap = {
      jan: 1,
      fev: 2,
      feb: 2,
      mar: 3,
      abr: 4,
      apr: 4,
      mai: 5,
      may: 5,
      jun: 6,
      jul: 7,
      ago: 8,
      aug: 8,
      set: 9,
      sep: 9,
      out: 10,
      oct: 10,
      nov: 11,
      dez: 12,
      dec: 12,
    }
    const siglasMes = [
      '',
      'JAN',
      'FEV',
      'MAR',
      'ABR',
      'MAI',
      'JUN',
      'JUL',
      'AGO',
      'SET',
      'OUT',
      'NOV',
      'DEZ',
    ]

    function extrairAnoMesBackend(raw) {
      if (!raw) return null
      const str = String(raw).trim().toLowerCase()
      const mIso = str.match(/^(\d{4})[-/.](\d{1,2})$/)
      if (mIso) return { ano: parseInt(mIso[1], 10), mes: parseInt(mIso[2], 10) }
      const mNum = str.match(/^(\d{1,2})[-/.](\d{2,4})$/)
      if (mNum) {
        let ano = parseInt(mNum[2], 10)
        if (ano < 100) ano = 2000 + ano
        return { ano, mes: parseInt(mNum[1], 10) }
      }
      const partes = str
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
      let mesEnc = 0
      let anoEnc = 0
      for (let pIdx = 0; pIdx < partes.length; pIdx++) {
        const p = partes[pIdx]
        if (/^\d{2,4}$/.test(p)) {
          let n = parseInt(p, 10)
          if (n < 100) n = n > 50 ? 1900 + n : 2000 + n
          anoEnc = n
        } else {
          const k = p.slice(0, 3)
          if (mesesMap[p] || mesesMap[k]) mesEnc = mesesMap[p] || mesesMap[k]
        }
      }
      if (mesEnc >= 1 && mesEnc <= 12 && anoEnc >= 1990 && anoEnc <= 2100) {
        return { ano: anoEnc, mes: mesEnc }
      }
      return null
    }

    const mapaHistorico = {}
    for (let hIdx = 0; hIdx < rawHistorico.length; hIdx++) {
      const item = rawHistorico[hIdx]
      if (!item) continue
      const parsedMes = extrairAnoMesBackend(item.mes_ano || item.mes)
      let label = String(item.mes_ano || item.mes || '')
        .trim()
        .toUpperCase()
      let ordem = 999900 + hIdx
      let chave = label || String(hIdx)

      if (parsedMes) {
        const sigla = siglasMes[parsedMes.mes] || 'MES'
        const a2d = String(parsedMes.ano % 100).padStart(2, '0')
        label = sigla + '/' + a2d
        ordem = parsedMes.ano * 100 + parsedMes.mes
        chave = String(parsedMes.ano) + '-' + String(parsedMes.mes).padStart(2, '0')
      }

      const rawKwh =
        typeof item.consumo_kwh === 'number'
          ? item.consumo_kwh
          : parseFloat(String(item.consumo_kwh || '0').replace(',', '.')) || 0
      const kwh = Math.max(0, Math.round(rawKwh * 100) / 100)

      const rawDias =
        typeof item.dias_ciclo === 'number'
          ? item.dias_ciclo
          : parseInt(String(item.dias_ciclo || '30').replace(/\D/g, ''), 10) || 30
      const dias = rawDias > 0 && rawDias <= 60 ? rawDias : 30

      const itemLimpo = { mes_ano: label, consumo_kwh: kwh, dias_ciclo: dias }

      if (!mapaHistorico[chave]) {
        mapaHistorico[chave] = { item: itemLimpo, ordem: ordem }
      } else {
        if (kwh > 0 && mapaHistorico[chave].item.consumo_kwh === 0) {
          mapaHistorico[chave] = { item: itemLimpo, ordem: ordem }
        }
      }
    }

    const chaves = Object.keys(mapaHistorico)
    chaves.sort(function (a, b) {
      return mapaHistorico[a].ordem - mapaHistorico[b].ordem
    })

    const historico = []
    let totalAnual = 0
    let maiorConsumo = { mes_ano: '', consumo_kwh: -1 }
    let menorConsumo = { mes_ano: '', consumo_kwh: 999999999 }
    let totalDias = 0

    for (let cIdx = 0; cIdx < chaves.length; cIdx++) {
      const it = mapaHistorico[chaves[cIdx]].item
      historico.push(it)
      totalAnual += it.consumo_kwh
      totalDias += it.dias_ciclo

      if (it.consumo_kwh > maiorConsumo.consumo_kwh) {
        maiorConsumo = { mes_ano: it.mes_ano, consumo_kwh: it.consumo_kwh }
      }
      if (it.consumo_kwh < menorConsumo.consumo_kwh) {
        menorConsumo = { mes_ano: it.mes_ano, consumo_kwh: it.consumo_kwh }
      }
    }

    parsed.historico_consumo = historico

    const qtdMeses = historico.length > 0 ? historico.length : 1
    // Média de consumo: soma de todos os meses dividida pelo número de meses de registro (sem fixar em 12)
    const mediaMensal = Math.round((totalAnual / qtdMeses) * 100) / 100
    const mediaDiaria =
      totalDias > 0
        ? Math.round((totalAnual / totalDias) * 100) / 100
        : Math.round((mediaMensal / 30) * 100) / 100

    if (!parsed.calculos) parsed.calculos = {}
    parsed.calculos.quantidade_meses_historico = historico.length
    parsed.calculos.somatorio_consumo_anual_kwh = Math.round(totalAnual * 100) / 100
    parsed.calculos.media_mensal_consumo_kwh = mediaMensal
    parsed.calculos.consumo_medio_diario_kwh = mediaDiaria
    parsed.consumo_medio = mediaMensal
    if (maiorConsumo.consumo_kwh >= 0) {
      parsed.calculos.maior_consumo_periodo = maiorConsumo
    }
    if (menorConsumo.consumo_kwh < 999999999) {
      parsed.calculos.menor_consumo_periodo = menorConsumo
    }

    // --- PÓS-PROCESSAMENTO DETERMINÍSTICO DE TARIFA (TUSD + TE) E UC VIA REGEX SOBRE TEXTO EXTRAÍDO ---
    // Unificar textos disponíveis da fatura
    const fullTextSearch = `${textContent || ''}\n${rawText || ''}`

    // 1. EXTRAÇÃO DETERMINÍSTICA DE TARIFA (TUSD + TE) VIA REGEX
    // Procura por linhas de "Consumo Uso Sistema ... TUSD" e "Consumo - TE" com valores com 4 a 8 casas decimais
    let regexTusd = 0
    let regexTe = 0

    // Padrões para TUSD
    const tusdMatches = [
      /Consumo\s+Uso\s+Sistema[^\n\r]*?TUSD[^\n\r]*?([0-9]+[,\.][0-9]{4,8})/i,
      /Uso\s+Sistema[^\n\r]*?TUSD[^\n\r]*?([0-9]+[,\.][0-9]{4,8})/i,
      /TUSD[^\n\r]*?([0-9]+[,\.][0-9]{4,8})/i,
    ]
    for (let tIdx = 0; tIdx < tusdMatches.length; tIdx++) {
      const mTusd = fullTextSearch.match(tusdMatches[tIdx])
      if (mTusd && mTusd[1]) {
        const val = parseFloat(mTusd[1].replace(',', '.'))
        if (val > 0.2 && val < 5.0) {
          regexTusd = val
          break
        }
      }
    }

    // Padrões para TE
    const teMatches = [
      /Consumo\s*-\s*TE[^\n\r]*?([0-9]+[,\.][0-9]{4,8})/i,
      /Consumo\s+TE[^\n\r]*?([0-9]+[,\.][0-9]{4,8})/i,
      /\bTE\b[^\n\r]*?([0-9]+[,\.][0-9]{4,8})/i,
    ]
    for (let eIdx = 0; eIdx < teMatches.length; eIdx++) {
      const mTe = fullTextSearch.match(teMatches[eIdx])
      if (mTe && mTe[1]) {
        const val = parseFloat(mTe[1].replace(',', '.'))
        if (val > 0.2 && val < 5.0) {
          regexTe = val
          break
        }
      }
    }

    if (!parsed.detalhes_tarifa) parsed.detalhes_tarifa = {}

    // Se encontramos ambas componentes por regex determinístico no texto, têm prioridade máxima
    if (regexTusd > 0 && regexTe > 0) {
      const somaTarifasRegex = Math.round((regexTusd + regexTe) * 1e8) / 1e8
      parsed.detalhes_tarifa.tarifa_tusd_com_tributos = regexTusd
      parsed.detalhes_tarifa.tarifa_te_com_tributos = regexTe
      parsed.detalhes_tarifa.tarifa_total_com_tributos = somaTarifasRegex
      parsed.tarifa_com_tributos = somaTarifasRegex
      console.log(
        `[FATURA RGE] Tarifa determinística regex calculada: TUSD=${regexTusd} + TE=${regexTe} = ${somaTarifasRegex}`,
      )
    } else {
      // Validação da tarifa TUSD + TE devolvida pelo Gemini / IA
      const tusd = parseFloat(parsed.detalhes_tarifa.tarifa_tusd_com_tributos) || 0
      const te = parseFloat(parsed.detalhes_tarifa.tarifa_te_com_tributos) || 0
      if (tusd > 0.2 && te > 0.2) {
        const somaTarifas = Math.round((tusd + te) * 1e8) / 1e8
        parsed.detalhes_tarifa.tarifa_total_com_tributos = somaTarifas
        parsed.tarifa_com_tributos = somaTarifas
      } else {
        // Rejeitar valores espúrios como 0.12 ou iluminação pública se tarifa < 0.40
        if (parsed.tarifa_com_tributos && parsed.tarifa_com_tributos < 0.4) {
          console.log(
            `[FATURA RGE] Tarifa espúria descartada (< 0.40): ${parsed.tarifa_com_tributos}`,
          )
          parsed.tarifa_com_tributos = null
          parsed.detalhes_tarifa.tarifa_total_com_tributos = null
        }
      }
    }

    // 2. EXTRAÇÃO DETERMINÍSTICA DO NÚMERO DA UC FORMATADO VIA REGEX
    // Padrão oficial RGE: 3 dígitos . 3 dígitos . 3 dígitos - 2 dígitos (ex: 200.419.001-19)
    let ucFormatadaEncontrada = ''
    // Buscar primeiro associado ao rótulo literal
    const rotulosUc = [
      /(?:N[uú]mero\s+da\s+UC|Unidade\s+Consumidora|C[oó]digo\s+da\s+UC)[^\n\r\d]*?([0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})/i,
      /(?:N[uú]mero\s+da\s+UC|Unidade\s+Consumidora|C[oó]digo\s+da\s+UC)[\s\S]{0,100}?([0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})/i,
      /\b([0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})\b/,
    ]

    for (let uIdx = 0; uIdx < rotulosUc.length; uIdx++) {
      const matchUc = fullTextSearch.match(rotulosUc[uIdx])
      if (matchUc && matchUc[1]) {
        ucFormatadaEncontrada = matchUc[1].trim()
        // Validação: deve ter 11 dígitos no formato 000.000.000-00 e não pode ser CPF nem CNPJ
        const digitos = ucFormatadaEncontrada.replace(/\D/g, '')
        if (digitos.length === 11) {
          break
        }
      }
    }

    // Função de validação estrita de UC formatada RGE
    const ucRegexEstrito = /^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$/
    const isUcValida = (v) => {
      if (!v || typeof v !== 'string') return false
      const s = v.trim()
      if (!ucRegexEstrito.test(s)) return false
      // Rejeitar explicitamente padrões de código de instalação ou alfanuméricos
      if (s.startsWith('ERCBU') || s.includes('-00000')) return false
      return true
    }

    // Se achado o padrão formatado da UC no texto, FORÇAR parsed.uc para o valor formatado
    if (ucFormatadaEncontrada && isUcValida(ucFormatadaEncontrada)) {
      console.log(
        `[FATURA RGE] UC formatada RGE confirmada deterministamente por regex: "${ucFormatadaEncontrada}" (modelo havia retornado "${parsed.uc}")`,
      )
      parsed.uc = ucFormatadaEncontrada
    } else if (!isUcValida(parsed.uc)) {
      // Se parsed.uc não segue o padrão formatado estrito da RGE (ex: veio código de instalação, ERCBU..., ou 8 dígitos), rejeitar!
      console.log(
        `[FATURA RGE] Valor de UC inválido rejeitado: "${parsed.uc}". Tentando buscar no texto completo...`,
      )
      // Tenta varredura global no texto por qualquer padrão de UC formatada 000.000.000-00
      const matchesGlobais = fullTextSearch.match(/\b([0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})\b/g)
      let ucResgatada = ''
      if (matchesGlobais) {
        for (let g = 0; g < matchesGlobais.length; g++) {
          const cand = matchesGlobais[g].trim()
          // Evitar que seja CPF do titular caso haja CPF com pontuação idêntica
          const digCand = cand.replace(/\D/g, '')
          const digTitular = parsed.cpf_cnpj ? String(parsed.cpf_cnpj).replace(/\D/g, '') : ''
          if (digCand !== digTitular && isUcValida(cand)) {
            ucResgatada = cand
            break
          }
        }
      }
      parsed.uc = ucResgatada || 'não informado na fatura'
    }

    // REGRA DE OURO FINAL: Se a fatura tiver o rótulo "Número da UC", NUNCA retornar nada além da UC formatada
    if (parsed.uc && !isUcValida(parsed.uc)) {
      parsed.uc = 'não informado na fatura'
    }

    // Reforçar regra de endereço: garantir que todos os 7 componentes existam no objeto
    if (!parsed.endereco_completo || typeof parsed.endereco_completo !== 'object') {
      parsed.endereco_completo = {
        rua: 'não informado na fatura',
        numero: 'não informado na fatura',
        complemento: 'não informado na fatura',
        bairro: 'não informado na fatura',
        cidade: 'não informado na fatura',
        estado: 'não informado na fatura',
        cep: 'não informado na fatura',
      }
    } else {
      const camposEnd = ['rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep']
      camposEnd.forEach((campo) => {
        const val = parsed.endereco_completo[campo]
        if (!val || typeof val !== 'string' || !val.trim()) {
          parsed.endereco_completo[campo] = 'não informado na fatura'
        } else {
          parsed.endereco_completo[campo] = val.trim()
        }
      })
    }

    // Normalizar tipo de fornecimento
    if (parsed.tipo_fornecimento && typeof parsed.tipo_fornecimento === 'string') {
      const tfLow = parsed.tipo_fornecimento.toLowerCase().trim()
      if (tfLow.includes('mono')) parsed.tipo_fornecimento = 'Monofásico'
      else if (tfLow.includes('bi')) parsed.tipo_fornecimento = 'Bifásico'
      else if (tfLow.includes('tri')) parsed.tipo_fornecimento = 'Trifásico'
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
