/**
 * Hook para extração estruturada de dados de documentos usando Skip AI ($ai.chat).
 * Rota POST /backend/v1/extract-document
 *
 * Utiliza $ai.chat (stateless / OpenAI-shape) para garantir que NENHUM histórico
 * ou token de chamadas anteriores seja acumulado entre requisições de documentos.
 */

routerAdd('POST', '/backend/v1/extract-document', (e) => {
  const systemPromptExtratorSolar = `Você é um extrator de dados de alta precisão para CRM de energia solar no Brasil (Delfos Solar).
Sua função é analisar o conteúdo de documentos (contas de luz de concessionárias brasileiras como RGE, CPFL, Enel, Cemig, Celesc, Copel, Energisa; documentos de identificação como CNH, RG, CPF; ou planilhas/tabelas de dimensionamento solar e orçamentos) e extrair os dados cadastrais, de endereço, técnicos e de consumo de energia.

REGRAS OBRIGATÓRIAS DE RESPOSTA:
1. Retorne SEMPRE E EXCLUSIVAMENTE um objeto JSON válido, sem bloco de markdown adicional, sem texto antes ou depois.
2. A estrutura do JSON DEVE seguir estritamente o formato:
{
  "dados_cadastrais": {
    "nome": string | null,
    "cpf_cnpj": string | null,
    "rg": string | null,
    "data_nascimento": string | null,
    "telefone": string | null,
    "email": string | null
  },
  "endereco": {
    "endereco": string | null,
    "numero": string | null,
    "bairro": string | null,
    "cidade": string | null,
    "estado": string | null,
    "cep": string | null,
    "complemento": string | null,
    "latitude": number | null,
    "longitude": number | null
  },
  "dados_tecnicos": {
    "potencia_kwp": number | null,
    "numero_modulos": number | null,
    "fabricante_modulos": string | null,
    "modelo_modulos": string | null,
    "fabricante_inversores": string | null,
    "modelo_inversores": string | null,
    "tipo_telhado": "ceramico" | "metalico" | "laje" | "fibrocimento" | null,
    "padrao_entrada": string | null,
    "tipo_atendimento": "aéreo" | "subterrâneo" | null,
    "numero_fases": "monofásico" | "bifásico" | "trifásico" | null,
    "geracao_mensal_kwh": number | null
  },
  "consumo": {
    "uc": string | null,
    "consumo_kwh_mes": number | null,
    "tarifa": number | null,
    "classe_consumo": string | null,
    "concessionaria": string | null
  }
}

3. Mapeamentos específicos e regras CRÍTICAS de classificação:
- ATENÇÃO MÁXIMA PARA UNIDADE CONSUMIDORA (UC) E DEMAIS CÓDIGOS DA FATURA:
  * NUNCA confunda número de instalação / código do cliente / unidade consumidora (UC) com CNPJ ou CPF!
  * NUNCA extraia códigos de roteiro de leitura ou de entrega como "ERCBU083-00000411", "BU083", códigos de barras, chaves de acesso NF3e ou medidores como UC!
  * Em faturas da RGE/CPFL, a UC está no campo "Número da UC" e segue o padrão formatado com pontos e hífen: ex: "200.419.001-19".
  * O campo "consumo.uc" só deve receber a Unidade Consumidora real. Códigos alfanuméricos de rota/instalação como "ERCBU..." são estritamente proibidos.
  * O campo "dados_cadastrais.cpf_cnpj" só recebe valores com EXATAMENTE 11 dígitos (CPF) ou 14 dígitos (CNPJ) próximos a termos como "CPF", "CNPJ", "CPF/CNPJ", "Titular", "Documento", "CNPJ/CPF". Se não constar CPF ou CNPJ de 11 ou 14 dígitos, deixe "cpf_cnpj" como null. NUNCA coloque número de UC ou instalação em "cpf_cnpj".
- Conta de energia e Documentos Técnicos:
  * nome: nome do titular/cliente na fatura
  * endereco / cidade / estado / cep: endereço da instalação/unidade consumidora
  * latitude / longitude: coordenadas geográficas numéricas (ex: -27.634, -52.269) se constarem no memorial, projeto, ART ou conta. Se não constar, retorne null.  * uc: número da UC (na RGE: padrão com pontos e hífen, ex: "200.419.001-19"). Rejeite códigos alfanuméricos como "ERCBU...".
  * consumo_kwh_mes: consumo médio mensal da fatura em kWh. Se houver histórico de meses (ex: 12 ou 13 meses), a média é a soma de todos os meses dividida pela quantidade de meses registrados. NUNCA coloque apenas o consumo de um único mês (ex: 132) se houver histórico.
  * tarifa: valor da tarifa de energia da distribuidora em R$/kWh (TUSD com tributos + TE com tributos, tipicamente entre 0.80 e 1.40 R$/kWh). NUNCA coloque valores espúrios como 0.12 ou parcelas isoladas como Iluminação Pública.
  * classe_consumo: Residencial, Comercial, Industrial, Rural, Poder Público, etc.
  * concessionaria: RGE, CPFL, CELESC, COPEL, ENEL, CEMIG, etc.
- CNH / RG:
  * nome: nome completo
  * cpf_cnpj: CPF formatado ou numérico (estritamente 11 dígitos)
  * rg: número do RG com órgão emissor se houver
  * data_nascimento: data no formato AAAA-MM-DD ou DD/MM/AAAA
  * endereco / cidade / estado: se constar no documento
- Planilhas e relatórios solares:
  * potência kWp, quantidade e fabricante de módulos, fabricante e modelo de inversores, geração mensal estimada, tipo de telhado e fases.

4. Se algum campo não puder ser identificado com clareza, atribua null. Não invente dados fictícios.
5. Se o documento for completamente ilegível ou vazio, retorne o JSON com todos os campos nulos.`

  const reqStart = Date.now()
  let fileName = 'documento'
  let mimeType = 'image/jpeg'
  let textLength = 0
  let base64Length = 0

  try {
    const authUser = e.auth
    let userId = authUser ? authUser.id : null

    // Se a chamada não tiver usuário autenticado, obter o primeiro usuário ou admin para contexto
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
      console.log('[EXTRACT DOC] Rejeitado: autenticação necessária (nenhum usuário no sistema)')
      return e.json(401, { error: 'Autenticação necessária para processar documentos' })
    }

    const body = e.requestInfo().body || {}
    let textContent = (body.text_content || '').trim()
    const base64Image = (body.image_base64 || '').trim()
    fileName = body.file_name || 'documento'
    mimeType = body.mime_type || 'image/jpeg'
    textLength = textContent.length
    base64Length = base64Image.length

    // Rastreio inicial conforme requisito 3
    console.log(
      `[EXTRACT DOC] Início da requisição: arquivo="${fileName}", mime="${mimeType}", text_chars=${textLength}, base64_chars=${base64Length}, user_id="${userId}"`,
    )

    if (!textContent && !base64Image) {
      console.log(`[EXTRACT DOC] Rejeitado: nenhum conteúdo enviado para o arquivo "${fileName}"`)
      return e.json(400, { error: 'Nenhum conteúdo ou imagem enviado para análise' })
    }

    // 1. Guard de segurança para imagens em base64: máx 700KB de string (~525KB binário)
    const MAX_BASE64_LENGTH = 700 * 1024 // 700 KB em caracteres
    if (base64Image && base64Image.length > MAX_BASE64_LENGTH) {
      console.log(
        `[EXTRACT DOC] Rejeitado 413: imagem muito grande (${base64Length} chars > ${MAX_BASE64_LENGTH}) para "${fileName}"`,
      )
      return e.json(413, {
        ok: false,
        error:
          'Imagem muito grande. Tire a foto em resolução menor ou use o PDF original do documento.',
      })
    }

    // 2. Guard de segurança para conteúdo textual: máx 150.000 caracteres
    const MAX_TEXT_LENGTH = 150000
    if (textContent.length > MAX_TEXT_LENGTH) {
      console.log(
        `[EXTRACT DOC] Truncando texto de ${textContent.length} para ${MAX_TEXT_LENGTH} caracteres para "${fileName}"`,
      )
      textContent = textContent.substring(0, MAX_TEXT_LENGTH)
      textLength = textContent.length
    }

    // 3. Montar mensagens OpenAI-shape para $ai.chat
    // Para imagens (JPG/PNG/WEBP), utiliza content array com parts: text + image_url
    // Para texto (PDF, DOCX, XLSX, CSV), utiliza content string normal.
    // NUNCA injeta PDFs como data:application/pdf;base64 em blocos de imagem.
    let userMessageContent
    if (base64Image && mimeType.startsWith('image/')) {
      const promptIntro = textContent
        ? `Documento: ${fileName}\nTexto complementar extraído por OCR:\n"""\n${textContent}\n"""\nAnalise a imagem anexada e o texto acima, extraindo os dados cadastrais, endereço, dados técnicos e de consumo no formato JSON estruturado especificado.`
        : `Documento: ${fileName}\nAnalise a imagem deste documento (conta de luz / documento do cliente / dados solares) e extraia os dados cadastrais, endereço da instalação, dados técnicos e de consumo retornando exclusivamente o JSON estruturado.`

      userMessageContent = [
        {
          type: 'text',
          text: promptIntro,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ]
    } else {
      userMessageContent = `Documento: ${fileName}\n\nConteúdo textual extraído do arquivo:\n"""\n${textContent}\n"""\n\nAnalise o conteúdo acima e extraia todos os dados disponíveis retornando exclusivamente o JSON estruturado.`
    }

    // 4. Chamada 100% STATELESS usando $ai.chat (OpenAI-shape) com model 'fast'.
    // Isto elimina completamente o acúmulo de contexto/histórico de conversas prévias.
    let chatRes = null
    try {
      chatRes = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPromptExtratorSolar },
          { role: 'user', content: userMessageContent },
        ],
      })
    } catch (aiErr) {
      const errMsg = (aiErr && aiErr.message ? aiErr.message : String(aiErr || '')).toLowerCase()
      console.log(`[EXTRACT DOC] Erro na chamada $ai.chat para "${fileName}": ${errMsg}`)
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

    const rawContent = (
      chatRes &&
      chatRes.choices &&
      chatRes.choices[0] &&
      chatRes.choices[0].message &&
      chatRes.choices[0].message.content
        ? chatRes.choices[0].message.content
        : ''
    ).trim()

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

    const elapsedMs = Date.now() - reqStart

    if (!parsedData) {
      console.log(
        `[EXTRACT DOC] Desfecho: json não parseado para "${fileName}" em ${elapsedMs}ms. Raw preview: "${rawContent.substring(0, 150)}..."`,
      )
      return e.json(200, {
        ok: false,
        raw_text: rawContent,
        data: null,
        message: 'Não foi possível identificar dados estruturados neste documento.',
        conversation_id: null,
      })
    }

    // Pós-processamento em JS puro (compatível com goja)
    // 1. Se dados_cadastrais.cpf_cnpj tiver dígitos ≠ 11 e ≠ 14 -> mover para consumo.uc (se vazio) e anular cpf_cnpj
    // 2. Se cpf_cnpj tiver os mesmos dígitos que consumo.uc -> anular cpf_cnpj (UC vence, sem duplicação)
    // 3. Sanitização estrita de UC: rejeitar códigos como "ERCBU083-00000411", códigos de rota/instalação ou < 8 dígitos.
    // 4. Se for documento da RGE, buscar pelo regex estrito de UC formatada [0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}
    // 5. Sanitização de tarifa: rejeitar tarifas < 0.40 (ex: 0.12)
    if (parsedData && typeof parsedData === 'object') {
      if (!parsedData.dados_cadastrais) parsedData.dados_cadastrais = {}
      if (!parsedData.consumo) parsedData.consumo = {}

      var rawCpfCnpj = parsedData.dados_cadastrais.cpf_cnpj
      if (rawCpfCnpj && typeof rawCpfCnpj === 'string') {
        var digitsCpfCnpj = rawCpfCnpj.replace(/\D/g, '')
        var rawUc = parsedData.consumo.uc
        var digitsUc = rawUc && typeof rawUc === 'string' ? rawUc.replace(/\D/g, '') : ''

        if (digitsUc && digitsCpfCnpj === digitsUc) {
          parsedData.dados_cadastrais.cpf_cnpj = null
        } else if (digitsCpfCnpj.length !== 11 && digitsCpfCnpj.length !== 14) {
          if (!parsedData.consumo.uc || !String(parsedData.consumo.uc).trim()) {
            parsedData.consumo.uc = rawCpfCnpj
          }
          parsedData.dados_cadastrais.cpf_cnpj = null
        }
      }

      // Validação de UC
      var ucAtual = parsedData.consumo.uc ? String(parsedData.consumo.uc).trim() : ''
      var ucInvalida = false
      if (
        ucAtual.indexOf('ERCBU') !== -1 ||
        ucAtual.indexOf('-00000') !== -1 ||
        ucAtual.toLowerCase() === 'não informado na fatura' ||
        ucAtual.length < 5
      ) {
        ucInvalida = true
      }

      // Se for RGE ou se texto contiver padrão formatado de UC da RGE, extrair deterministamente
      var fullTxt = textContent + '\n' + rawContent
      var matchRgeUc = fullTxt.match(
        /(?:N[uú]mero\s+da\s+UC|Unidade\s+Consumidora|C[oó]digo\s+da\s+UC)[\s\S]{0,80}?([0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})/i,
      )
      if (!matchRgeUc) {
        matchRgeUc = fullTxt.match(/\b([0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})\b/)
      }

      if (matchRgeUc && matchRgeUc[1]) {
        parsedData.consumo.uc = matchRgeUc[1].trim()
      } else if (ucInvalida) {
        parsedData.consumo.uc = null
      }

      // Extração determinística de Tarifa TUSD + TE no extrator genérico caso texto tenha esses dados
      var matchTusd = fullTxt.match(
        /(?:Consumo\s+Uso\s+Sistema|TUSD)[\s\S]*?([0-9]+[,\.][0-9]{4,8})/i,
      )
      var matchTe = fullTxt.match(/(?:Consumo\s*-\s*TE|TE)[\s\S]*?([0-9]+[,\.][0-9]{4,8})/i)
      if (matchTusd && matchTe && matchTusd[1] && matchTe[1]) {
        var vTusd = parseFloat(matchTusd[1].replace(',', '.'))
        var vTe = parseFloat(matchTe[1].replace(',', '.'))
        if (vTusd > 0.2 && vTusd < 5.0 && vTe > 0.2 && vTe < 5.0) {
          parsedData.consumo.tarifa = Math.round((vTusd + vTe) * 1e8) / 1e8
        }
      }

      // Validação de tarifa: rejeitar tarifas absurdas como 0.12 (iluminação pública ou erro)
      if (
        parsedData.consumo.tarifa !== null &&
        parsedData.consumo.tarifa !== undefined &&
        typeof parsedData.consumo.tarifa === 'number'
      ) {
        if (parsedData.consumo.tarifa < 0.4) {
          // Rejeita valor espúrio
          parsedData.consumo.tarifa = null
        }
      }
    }

    console.log(
      `[EXTRACT DOC] Desfecho: ok para "${fileName}" em ${elapsedMs}ms (campos extraídos com sucesso)`,
    )

    // Preserva exatamente o contrato de resposta esperado pelo frontend:
    // { ok, data, raw_text, message, conversation_id }
    return e.json(200, {
      ok: true,
      data: parsedData,
      raw_text: rawContent,
      conversation_id: null,
    })
  } catch (err) {
    const elapsedMs = Date.now() - reqStart
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
    console.log(
      `[EXTRACT DOC] Desfecho: erro ${status} (${msg}) para "${fileName}" após ${elapsedMs}ms`,
    )
    return e.json(status, { error: msg, ok: false })
  }
})
