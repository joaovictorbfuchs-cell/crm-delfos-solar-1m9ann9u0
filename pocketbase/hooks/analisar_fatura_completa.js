/**
 * Hook para análise detalhada de faturas de energia RGE com IA Gemini para a atividade "Análise de Fatura".
 * Rota POST /backend/v1/analisar-fatura-completa
 * Rota GET /backend/v1/relatorio-fatura-publico/{token}
 */

routerAdd('POST', '/backend/v1/analisar-fatura-completa', (e) => {
  const reqStart = Date.now()

  // Helpers inline para evitar ReferenceError no pool isolado de VM do Goja / PocketBase
  function formatNumeroBR(val, casasDecimais) {
    if (val === undefined || val === null || val === '') return '0'
    const num = typeof val === 'number' ? val : parseFloat(val)
    if (isNaN(num)) return '0'

    if (typeof casasDecimais === 'number' && casasDecimais >= 0) {
      const fixed = num.toFixed(casasDecimais)
      const parts = fixed.split('.')
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      return parts.length > 1 ? `${intPart},${parts[1]}` : intPart
    }

    const rounded = Math.round(num * 100) / 100
    const isInt = Math.floor(rounded) === rounded
    if (isInt) {
      return Math.floor(rounded)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
    const parts = rounded.toFixed(2).replace(/0+$/, '').split('.')
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return parts.length > 1 ? `${intPart},${parts[1]}` : intPart
  }

  function safeParseFloat(val, fallback) {
    const dFallback = typeof fallback === 'number' ? fallback : 0
    if (val === undefined || val === null || val === '') return dFallback
    try {
      if (typeof val === 'number') return isNaN(val) ? dFallback : val
      const str = String(val).trim().replace(/\./g, '').replace(',', '.')
      const parsed = parseFloat(str)
      return isNaN(parsed) ? dFallback : parsed
    } catch (_) {
      return dFallback
    }
  }

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
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const geminiApiKey = ($os.getenv('GEMINI_API_KEY') || '').trim()
    const body = e.requestInfo().body || {}
    const clienteId = (body.cliente_id || '').trim()
    const arquivos = Array.isArray(body.arquivos) ? body.arquivos : []

    // Arquivo único legado compatível
    if (arquivos.length === 0 && (body.file_base64 || body.text_content)) {
      arquivos.push({
        file_name: body.file_name || 'fatura-rge.pdf',
        mime_type: body.mime_type || 'application/pdf',
        file_base64: body.file_base64 || '',
        text_content: body.text_content || '',
      })
    }

    if (arquivos.length === 0) {
      return e.json(400, {
        ok: false,
        error: 'Nenhum arquivo de fatura RGE enviado para análise.',
      })
    }

    // Carregar dados pré-cadastrados do cliente
    let clienteRecord = null
    let clienteNome = ''
    let clienteUcCadastrada = ''
    let clienteEnderecoCadastrado = ''
    let clienteCidadeCadastrada = ''

    if (clienteId) {
      try {
        clienteRecord = $app.findRecordById('clientes', clienteId)
        clienteNome = clienteRecord.getString('nome') || ''
        clienteUcCadastrada = clienteRecord.getString('uc') || ''
        clienteEnderecoCadastrado = clienteRecord.getString('endereco') || ''
        clienteCidadeCadastrada = clienteRecord.getString('cidade') || ''
      } catch (errCli) {
        console.log('[ANALISE COMPLETA] Cliente não encontrado pelo id:', clienteId)
      }
    }

    const promptCompleto = `Você é um engenheiro eletricista e consultor sênior especialista em regulação do setor elétrico brasileiro (REN 482/2012, REN 1000/2021, Lei 14.300/2022) e faturas da concessionária RGE (CPFL Energia / RGE SUL / DANF3E) para a Delfos Solar.

Analise cuidadosamente as faturas de energia em anexo.

CONTEXTO CADASTRAL EXISTENTE DO CLIENTE NO CRM:
- Nome do cliente: "${clienteNome || 'Não informado'}"
- UC já cadastrada no sistema: "${clienteUcCadastrada || 'Não informada'}"
- Endereço cadastrado: "${clienteEnderecoCadastrado || 'Não informado'}, ${clienteCidadeCadastrada || ''}"

REGRAS RÍGIDAS DE ANÁLISE:
1. TODO NÚMERO DEVE VIR DA FATURA. NUNCA INVENTE VALORES. Se ausente, preencha "não informado na fatura" ou null.
2. Valores monetários sempre em reais (R$), energia em kWh.
3. Créditos, devoluções e compensações de energia SEMPRE com sinal negativo quando representarem desconto/crédito.
4. Se houver divergência entre a UC/endereço da fatura e o cadastro do sistema, aponte a sugestão de atualização cadastral.
5. Se a fatura NÃO for da RGE ou for ilegível, defina "e_fatura_rge": false e explique o erro em "erro_identificacao".
6. Sempre responda em português brasileiro.
7. Retorne EXCLUSIVAMENTE um objeto JSON estritamente válido, sem texto introdutório nem blocos markdown.

ESTRUTURA COMPLETA QUE DEVE SER EXTRAÍDA E CALCULADA:

1. DADOS DO PERÍODO:
- data_leitura_anterior (ex: "15/01/2025")
- data_leitura_atual (ex: "14/02/2025")
- dias_ciclo (número, ex: 30)
- proxima_leitura_prevista (ex: "16/03/2025")
- vencimento (ex: "25/02/2025")
- numero_fatura_nf (ex: "012345678")
- data_emissao (ex: "15/02/2025")
- mes_referencia (ex: "FEV/2025")

2. PAPEL DA UC NO ARRANJO DE GERAÇÃO DISTRIBUÍDA (GD):
- papel_uc: "geradora" (possui usina solar no mesmo ponto, medidor bidirecional injetando energia), "receptora_autoconsumo_remoto" (não injeta no ponto, apenas recebe créditos com rótulos como "Energ Atv Inj. oUC mPT"), ou "mista" (consome e injeta no mesmo ponto mas também envia/recebe de outras UCs)
- descricao_arranjo: explicação didática e técnica do papel desta UC
- participacao_geracao_percentual: número em % se indicado na fatura (ex: 35.5) ou null
- percentual_energia_fica_instalacao: percentual estimado que é consumido no local vs. enviado

3. MEDIÇÃO E CRÉDITOS:
- energia_ativa_consumida: { leitura_anterior: number, leitura_atual: number, multiplicador: number, consumo_mes_kwh: number }
- energia_injetada_geracao: { leitura_anterior: number, leitura_atual: number, multiplicador: number, kwh_injetados_mes: number }
- creditos:
  * creditos_compensados_mes_atual_kwh: number
  * creditos_antigos_competencias_anteriores_kwh: number
  * total_creditos_recebidos_kwh: number
- saldo_energia:
  * saldo_atual_instalacao_kwh: number
  * saldo_a_expirar_proximo_mes_kwh: number (se > 0, acionar alerta)
  * meses_cobertura_saldo: number (quantos meses de consumo médio o saldo cobre)
- historico_consumo: array de objetos, um por mês presente no gráfico "Histórico de Consumo" da fatura (geralmente 12 ou 13 meses), EM ORDEM CRONOLÓGICA do mais antigo para o mais recente:
  { mes: string (ex: "OUT/25"), consumo_kwh: number }
  Extraia APENAS os valores que estão impressos na fatura. Se a fatura não trouxer histórico de consumo, retorne um array vazio []. NUNCA invente meses ou valores.
  Cada item pode ter também dias_ciclo: number se informado na fatura.

4. ITENS FATURADOS (array detalhado):
Para cada item na descrição da fatura (ex: "Consumo Uso Sistema [KWh]-TUSD", "Consumo - TE", "Energia Ativa Injetada TUSD", "Energia Ativa Injetada TE", "Adicional Bandeira Amarela/Vermelha", "Crédito Adicional Bandeira", "Contribuição Custeio IP-CIP", "Ajuste de Saldo", "CDE"):
- item: nome do item
- quantidade_kwh: number ou null
- tarifa_base: number ou null (R$/kWh)
- tarifa_com_impostos: number ou null (R$/kWh)
- valor_total_rs: number (créditos negativos)
- icms: { base_calculo: number, aliquota: number, valor: number }
- pis: { base_calculo: number, valor: number }
- cofins: { base_calculo: number, valor: number }

5. TOTAIS E FORMA DE PAGAMENTO:
- total_distribuidora_rs: number
- total_a_pagar_rs: number
- forma_pagamento: "PIX", "Código de barras / Boleto", "Débito Automático" ou "não informado na fatura"
- bandeira_tarifaria: { cor: "Verde" | "Amarela" | "Vermelha P1" | "Vermelha P2" | "Escassez Hídrica", valor_adicional_rs: number }

6. IMPOSTOS CONSOLIDADOS E SIMULAÇÃO REFORMA TRIBUTÁRIA LC 214/2025:
- impostos_atuais:
  * icms_total_rs: number
  * pis_total_rs: number
  * cofins_total_rs: number
- reforma_tributaria_lc214_simulacao:
  * nota: "Valores meramente SIMULADOS conforme diretrizes gerais da LC 214/2025 (Reforma Tributária IBS/CBS). Sem cobrança atual."
  * ibs_simulado_rs: number (estimativa informativa)
  * cbs_simulada_rs: number (estimativa informativa)

7. INDICADORES CALCULADOS:
- tarifa_cheia_efetiva_rs_kwh: soma TUSD + TE com impostos
- economia_estimada_mes_rs: quanto o cliente economizou neste mês comparado a pagar tarifa cheia sem energia solar
- economia_acumulada_estimada_anual_rs: projeção de economia anual
- relacao_geracao_consumo_percentual: (geração / consumo) * 100
- taxa_minima_disponibilidade_kwh: 30 (monofásico), 50 (bifásico) ou 100 (trifásico)
- projecao_reajuste_9_ano:
  * tarifa_atual: number
  * tarifa_1_ano: number (+9%)
  * tarifa_3_anos: number (+29.5%)
  * tarifa_5_anos: number (+53.86%)

8. ALERTAS:
Array de alertas importantes detectados (ex: saldo prestes a expirar, consumo acima do habitual, bandeira tarifária cara, créditos antigos represados, divergência cadastral de endereço ou UC). Cada alerta: { nivel: "alerta" | "atencao" | "informativo", titulo: string, mensagem: string }.

9. CONCLUSÕES E RECOMENDAÇÕES ACIONÁVEIS:
Lista de 3 a 5 recomendações práticas e executivas para o cliente (ex: remanejar créditos para outra UC se saldo estiver alto/expirando; adequar potência contratada; manutenção preventiva).

FORMATO JSON ESPERADO:
{
  "e_fatura_rge": true,
  "erro_identificacao": null,
  "concessionaria": "RGE",
  "dados_cadastrais_fatura": {
    "titular": string,
    "cpf_cnpj": string,
    "uc": string,
    "endereco": string,
    "cidade": string,
    "tipo_fornecimento": string,
    "classificacao": string,
    "sugestao_preenchimento_crm": string | null
  },
  "periodo": { ... },
  "papel_gd": { ... },
  "medicao_e_creditos": { ... },
  "itens_faturados": [ ... ],
  "totais": { ... },
  "impostos": { ... },
  "indicadores": { ... },
  "alertas": [ ... ],
  "conclusoes_recomendacoes": [ string ]
}`

    // Coletar base64 e textos de todos os arquivos
    const parts = []
    let userText = `Analisando fatura(s) para o cliente "${clienteNome}". Quantidade de arquivos: ${arquivos.length}.\n\n`

    for (let i = 0; i < arquivos.length; i++) {
      const arq = arquivos[i]
      userText += `Arquivo [${i + 1}/${arquivos.length}]: ${arq.file_name} (${arq.mime_type})\n`
      if (arq.text_content) {
        userText += `Texto extraído:\n"""\n${arq.text_content.substring(0, 50000)}\n"""\n\n`
      }
      if (arq.file_base64) {
        parts.push({
          inline_data: {
            mime_type: arq.mime_type || 'application/pdf',
            data: arq.file_base64,
          },
        })
      }
    }

    userText +=
      'Por favor, realize a análise completa e detalhada da fatura RGE conforme as diretrizes e retorne o JSON estruturado.'
    parts.push({ text: userText })

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: promptCompleto }],
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

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ]

    let geminiResponse = null
    let modelUsed = ''
    let lastError = null

    if (geminiApiKey) {
      for (let i = 0; i < candidateModels.length; i++) {
        const model = candidateModels[i]
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`

        try {
          console.log(`[ANALISE COMPLETA] Chamando Gemini API modelo "${model}"...`)
          const res = $http.send({
            url: url,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload),
            timeout: 60,
          })

          if (res.statusCode >= 200 && res.statusCode < 300) {
            geminiResponse = res.json || JSON.parse(res.raw || '{}')
            modelUsed = `gemini:${model}`
            break
          } else {
            lastError = `Modelo ${model}: HTTP ${res.statusCode} - ${res.raw ? res.raw.substring(0, 200) : ''}`
          }
        } catch (callErr) {
          lastError = callErr && callErr.message ? callErr.message : String(callErr)
        }
      }
    }

    let rawText = ''
    if (geminiResponse) {
      try {
        const candidate = geminiResponse.candidates && geminiResponse.candidates[0]
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

    // Fallback nativo $ai.chat se necessário
    if (!rawText) {
      console.log(`[ANALISE COMPLETA] Fallback $ai.chat... Erro anterior: ${lastError}`)
      try {
        const aiRes = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: promptCompleto },
            { role: 'user', content: userText },
          ],
        })
        if (aiRes && aiRes.choices && aiRes.choices[0] && aiRes.choices[0].message) {
          rawText = aiRes.choices[0].message.content.trim()
          modelUsed = 'skip-ai:fast'
        }
      } catch (aiErr) {
        console.log('[ANALISE COMPLETA] Erro fallback $ai.chat:', aiErr)
      }
    }

    if (!rawText) {
      return e.json(500, {
        ok: false,
        error: `Não foi possível obter resposta dos modelos de IA: ${lastError || 'Sem resposta'}`,
      })
    }

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
    } catch (_) {
      const firstB = cleanJson.indexOf('{')
      const lastB = cleanJson.lastIndexOf('}')
      if (firstB !== -1 && lastB > firstB) {
        try {
          parsed = JSON.parse(cleanJson.substring(firstB, lastB + 1))
        } catch (_) {}
      }
    }

    if (!parsed) {
      return e.json(200, {
        ok: false,
        error: 'A IA não retornou um JSON válido.',
        raw_text: rawText,
      })
    }

    if (parsed.e_fatura_rge === false) {
      return e.json(200, {
        ok: false,
        error:
          parsed.erro_identificacao ||
          'O documento enviado não é uma fatura da RGE ou está ilegível.',
        data: parsed,
      })
    }

    // --- LÓGICA DETERMINÍSTICA DO FLUXO DE CRÉDITOS E PARTICIPAÇÃO NA GD ---
    // Regra Delfos Solar:
    // energia_injetada_mes = kWh injetados no mês (ex: 368)
    // creditos_compensados_mes_atual = kWh compensados no próprio mês (ex: 102)
    // saldo_gerado_nao_usado = energia_injetada_mes - creditos_compensados_mes_atual (ex: 368 - 102 = 266)
    // Se saldo_gerado_nao_usado > 0 e a UC NÃO acumulou esse saldo na própria instalação
    // (o saldo da instalação não subiu naquele valor), então os créditos foram para outra UC do arranjo (autoconsumo remoto).
    // Nesse caso: participação da UC na geração do arranjo ≈ 0% e fluxo aponta envio para outra UC.
    const energiaInjetadaCalc =
      typeof parsed.medicao_e_creditos?.energia_injetada_geracao?.kwh_injetados_mes === 'number'
        ? parsed.medicao_e_creditos.energia_injetada_geracao.kwh_injetados_mes
        : safeParseFloat(parsed.medicao_e_creditos?.energia_injetada_geracao?.kwh_injetados_mes, 0)
    const compensadosMesCalc =
      typeof parsed.medicao_e_creditos?.creditos?.creditos_compensados_mes_atual_kwh === 'number'
        ? parsed.medicao_e_creditos.creditos.creditos_compensados_mes_atual_kwh
        : safeParseFloat(
            parsed.medicao_e_creditos?.creditos?.creditos_compensados_mes_atual_kwh,
            safeParseFloat(parsed.medicao_e_creditos?.creditos?.total_creditos_recebidos_kwh, 0),
          )
    const saldoAtualInstalacaoCalc =
      typeof parsed.medicao_e_creditos?.saldo_energia?.saldo_atual_instalacao_kwh === 'number'
        ? parsed.medicao_e_creditos.saldo_energia.saldo_atual_instalacao_kwh
        : safeParseFloat(parsed.medicao_e_creditos?.saldo_energia?.saldo_atual_instalacao_kwh, 0)

    const saldoGeradoNaoUsado = Math.max(
      0,
      Math.round((energiaInjetadaCalc - compensadosMesCalc) * 100) / 100,
    )

    if (!parsed.papel_gd) {
      parsed.papel_gd = {}
    }

    // Se houve injeção superior ao compensado no mês
    if (energiaInjetadaCalc > 0 && saldoGeradoNaoUsado > 0) {
      // Se a instalação não teve acréscimo de saldo compatível no próprio saldo (ex: saldo atual é zero ou menor que o excedente, ou fatura indica rateio)
      const acumulouProprio = saldoAtualInstalacaoCalc >= saldoGeradoNaoUsado
      if (!acumulouProprio) {
        // Os créditos foram para outra UC do arranjo (autoconsumo remoto)
        parsed.papel_gd.participacao_geracao_percentual = 0
        parsed.papel_gd.percentual_energia_fica_instalacao =
          energiaInjetadaCalc > 0
            ? Math.round((compensadosMesCalc / energiaInjetadaCalc) * 1000) / 10
            : 0
        parsed.papel_gd.kwh_enviados_outras_ucs = saldoGeradoNaoUsado
        parsed.papel_gd.kwh_retidos_instalacao = compensadosMesCalc
        parsed.papel_gd.fluxo_creditos_detalhe = `${formatNumeroBR(saldoGeradoNaoUsado)} kWh gerados e não consumidos aqui foram creditados em outra(s) UC(s) do arranjo (autoconsumo remoto).`
      } else {
        // Acumulou no próprio saldo da instalação
        parsed.papel_gd.participacao_geracao_percentual = 100
        parsed.papel_gd.percentual_energia_fica_instalacao = 100
        parsed.papel_gd.kwh_enviados_outras_ucs = 0
        parsed.papel_gd.kwh_retidos_instalacao = energiaInjetadaCalc
        parsed.papel_gd.fluxo_creditos_detalhe = `100% dos créditos gerados (${formatNumeroBR(energiaInjetadaCalc)} kWh) permaneceram nesta instalação.`
      }
    } else if (energiaInjetadaCalc > 0 && compensadosMesCalc >= energiaInjetadaCalc) {
      // 100% da injeção foi compensada aqui
      parsed.papel_gd.participacao_geracao_percentual = 100
      parsed.papel_gd.percentual_energia_fica_instalacao = 100
      parsed.papel_gd.kwh_enviados_outras_ucs = 0
      parsed.papel_gd.kwh_retidos_instalacao = energiaInjetadaCalc
      parsed.papel_gd.fluxo_creditos_detalhe = `Toda a energia injetada no ciclo (${formatNumeroBR(energiaInjetadaCalc)} kWh) foi compensada nesta própria instalação.`
    }

    // Se historico_consumo estiver dentro de medicao_e_creditos ou na raiz de parsed, unificar
    if (parsed.medicao_e_creditos?.historico_consumo && !parsed.historico_consumo) {
      parsed.historico_consumo = parsed.medicao_e_creditos.historico_consumo
    }
    if (parsed.historico_consumo && !parsed.medicao_e_creditos?.historico_consumo) {
      if (!parsed.medicao_e_creditos) parsed.medicao_e_creditos = {}
      parsed.medicao_e_creditos.historico_consumo = parsed.historico_consumo
    }

    // Gerar token único criptográfico/aleatório para a análise
    const token = $security.randomString(32)

    // Extrair indicadores principais para resumo rápido
    const totalPagar =
      typeof parsed.totais?.total_a_pagar_rs === 'number'
        ? parsed.totais.total_a_pagar_rs
        : safeParseFloat(parsed.totais?.total_a_pagar_rs, 0)
    const consumoKwh =
      typeof parsed.medicao_e_creditos?.energia_ativa_consumida?.consumo_mes_kwh === 'number'
        ? parsed.medicao_e_creditos.energia_ativa_consumida.consumo_mes_kwh
        : safeParseFloat(parsed.medicao_e_creditos?.energia_ativa_consumida?.consumo_mes_kwh, 0)
    const injetadaKwh =
      typeof parsed.medicao_e_creditos?.energia_injetada_geracao?.kwh_injetados_mes === 'number'
        ? parsed.medicao_e_creditos.energia_injetada_geracao.kwh_injetados_mes
        : safeParseFloat(parsed.medicao_e_creditos?.energia_injetada_geracao?.kwh_injetados_mes, 0)
    const creditosKwh =
      typeof parsed.medicao_e_creditos?.creditos?.total_creditos_recebidos_kwh === 'number'
        ? parsed.medicao_e_creditos.creditos.total_creditos_recebidos_kwh
        : safeParseFloat(parsed.medicao_e_creditos?.creditos?.total_creditos_recebidos_kwh, 0)
    const saldoKwh =
      typeof parsed.medicao_e_creditos?.saldo_energia?.saldo_atual_instalacao_kwh === 'number'
        ? parsed.medicao_e_creditos.saldo_energia.saldo_atual_instalacao_kwh
        : safeParseFloat(parsed.medicao_e_creditos?.saldo_energia?.saldo_atual_instalacao_kwh, 0)
    const saldoExpirar =
      typeof parsed.medicao_e_creditos?.saldo_energia?.saldo_a_expirar_proximo_mes_kwh === 'number'
        ? parsed.medicao_e_creditos.saldo_energia.saldo_a_expirar_proximo_mes_kwh
        : safeParseFloat(
            parsed.medicao_e_creditos?.saldo_energia?.saldo_a_expirar_proximo_mes_kwh,
            0,
          )
    const economiaRs =
      typeof parsed.indicadores?.economia_estimada_mes_rs === 'number'
        ? parsed.indicadores.economia_estimada_mes_rs
        : safeParseFloat(parsed.indicadores?.economia_estimada_mes_rs, 0)

    const ucFatura =
      parsed.dados_cadastrais_fatura?.uc || clienteUcCadastrada || 'não informado na fatura'
    const competencia = parsed.periodo?.mes_referencia || 'Mês Atual'
    const vencimento = parsed.periodo?.vencimento || ''
    const papelUc = parsed.papel_gd?.papel_uc || 'mista'

    // Salvar registro na coleção analises_fatura
    const analisesCol = $app.findCollectionByNameOrId('analises_fatura')
    const analiseRec = new Record(analisesCol)
    analiseRec.set('token', token)
    if (clienteId) analiseRec.set('cliente_id', clienteId)
    analiseRec.set(
      'cliente_nome',
      clienteNome || parsed.dados_cadastrais_fatura?.titular || 'Cliente',
    )
    analiseRec.set('uc', ucFatura)
    analiseRec.set('competencia', competencia)
    analiseRec.set('vencimento', vencimento)
    analiseRec.set('total_pagar', totalPagar)
    analiseRec.set('consumo_kwh', consumoKwh)
    analiseRec.set('energia_injetada_kwh', injetadaKwh)
    analiseRec.set('creditos_compensados_kwh', creditosKwh)
    analiseRec.set('saldo_energia_kwh', saldoKwh)
    analiseRec.set('saldo_expirar_kwh', saldoExpirar)
    analiseRec.set('economia_estimada_rs', economiaRs)
    analiseRec.set('papel_uc', papelUc)
    analiseRec.set(
      'arquivos_nomes',
      arquivos.map((a) => a.file_name),
    )
    analiseRec.set('dados_completos', parsed)
    analiseRec.set('whatsapp_enviado', false)

    $app.save(analiseRec)

    // Se houver cliente vinculado, podemos atualizar consumo médio ou campos se estavam vazios
    if (clienteRecord) {
      try {
        if (!clienteRecord.getString('uc') && ucFatura && ucFatura !== 'não informado na fatura') {
          clienteRecord.set('uc', ucFatura)
        }
        if (consumoKwh > 0 && !clienteRecord.getFloat('consumo_kwh_mes')) {
          clienteRecord.set('consumo_kwh_mes', consumoKwh)
        }
        $app.save(clienteRecord)
      } catch (errCliUp) {
        console.log('[ANALISE COMPLETA] Atualização do cliente falhou:', errCliUp)
      }
    }

    const elapsedMs = Date.now() - reqStart

    return e.json(200, {
      ok: true,
      token: token,
      analise_id: analiseRec.id,
      model_used: modelUsed,
      elapsed_ms: elapsedMs,
      data: parsed,
    })
  } catch (err) {
    const msg = err && err.message ? err.message : String(err)
    console.log('[ANALISE COMPLETA] Erro:', msg)
    return e.json(500, {
      ok: false,
      error: `Erro ao processar análise completa: ${msg}`,
    })
  }
})

// Rota pública para acessar análise completa pelo token único (para o cliente ou link direto)
routerAdd('GET', '/backend/v1/relatorio-fatura-publico/{token}', (e) => {
  try {
    const token = e.request.pathValue('token')
    if (!token) {
      return e.json(400, { ok: false, error: 'Token ausente' })
    }

    const col = $app.findCollectionByNameOrId('analises_fatura')
    const records = $app.findRecordsByFilter(col.id, `token = '${token}'`, '', 1, 0)

    if (!records || records.length === 0) {
      return e.json(404, {
        ok: false,
        error: 'Relatório de análise de fatura não encontrado ou link expirado.',
      })
    }

    const rec = records[0]
    return e.json(200, {
      ok: true,
      token: rec.getString('token'),
      cliente_nome: rec.getString('cliente_nome'),
      uc: rec.getString('uc'),
      competencia: rec.getString('competencia'),
      vencimento: rec.getString('vencimento'),
      total_pagar: rec.getFloat('total_pagar'),
      consumo_kwh: rec.getFloat('consumo_kwh'),
      energia_injetada_kwh: rec.getFloat('energia_injetada_kwh'),
      creditos_compensados_kwh: rec.getFloat('creditos_compensados_kwh'),
      saldo_energia_kwh: rec.getFloat('saldo_energia_kwh'),
      saldo_expirar_kwh: rec.getFloat('saldo_expirar_kwh'),
      economia_estimada_rs: rec.getFloat('economia_estimada_rs'),
      papel_uc: rec.getString('papel_uc'),
      arquivos_nomes: rec.get('arquivos_nomes'),
      dados_completos: rec.get('dados_completos'),
      created: rec.getString('created'),
    })
  } catch (err) {
    return e.json(500, { ok: false, error: 'Falha ao buscar relatório público' })
  }
})
