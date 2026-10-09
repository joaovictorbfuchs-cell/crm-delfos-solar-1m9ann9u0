/**
 * Parser tolerante para confirmação de atualização de rateio / beneficiárias de concessionárias de energia (ex.: RGE).
 *
 * Formato de exemplo real:
 * ---
 * Solicitação concluída com sucesso!
 * Seu protocolo foi gerado e está em andamento. Em breve, nossa equipe entrará em contato para dar prosseguimento.
 * Fique tranquilo, estamos cuidando de tudo para você!.
 *
 * Protocolo: 2175698383
 * 14:42 05/08/2026
 *
 * UC | CPF/CNPJ | Rateio | UC âncora | Ações
 * 308155225 | 54323843020 | 5
 * 4004357003 | 54323843020 | 35
 * 4004392324 | 54323843020 | 10
 * 4004357004 | 54323843020 | 35
 * 3083327475 | 54323843020 | 15
 * ---
 */

export interface UnidadeImportadaRateio {
  numero_uc: string
  percentual: number
  rotulo?: string
  identificacao?: string
  documento?: string
}

export interface ResultadoParseRateioProtocolo {
  sucesso: boolean
  protocolo?: string
  dataHora?: string
  unidades: UnidadeImportadaRateio[]
  percentualGeradora?: number
  somaPercentuais: number
  erros: string[]
  avisos: string[]
}

/**
 * Normaliza um número percentual que pode vir com vírgula ou ponto (ex.: "12,5", "35", "10.0").
 */
export function normalizarPercentual(str: string): number | null {
  if (!str) return null
  const limpo = str.trim().replace(/%/g, '').replace(/\s+/g, '')
  if (!limpo) return null
  // Substitui vírgula decimal por ponto
  const comPonto = limpo.replace(',', '.')
  const num = parseFloat(comPonto)
  if (Number.isNaN(num) || num < 0 || num > 100) return null
  return Math.round(num * 100) / 100
}

/**
 * Remove caracteres não numéricos comuns em protocolos mantendo alfanuméricos caso necessário,
 * ou dígitos. Protocolos RGE são tipicamente numéricos (ex: 2175698383).
 */
export function extrairNumeroProtocolo(linha: string): string | null {
  if (!linha) return null
  // Padrões tolerantes: "Protocolo: 2175698383", "Protocolo : 2175698383", "Nº Protocolo: 2175698383", "Protocolo de Atendimento: 2175698383"
  const match = linha.match(
    /(?:protocolo|atendimento|solicita[çc][ãa]o)\s*(?:n[ºo°]?|de\s+atendimento)?\s*[:=-]\s*([A-Za-z0-9\-./]+)/i,
  )
  if (match && match[1]) {
    const limpo = match[1].trim().replace(/[^A-Za-z0-9-]/g, '')
    if (limpo.length >= 4) return limpo
  }

  // Suporte a linha com apenas "Protocolo 2175698383" (sem dois pontos, mas com número/identificador)
  const matchSemPontuacao = linha.match(
    /\b(?:protocolo|atendimento)\s+(?:n[ºo°]?\s+)?([0-9][A-Za-z0-9\-./]*)/i,
  )
  if (matchSemPontuacao && matchSemPontuacao[1]) {
    const limpo = matchSemPontuacao[1].trim().replace(/[^A-Za-z0-9-]/g, '')
    if (limpo.length >= 4) {
      return limpo
    }
  }

  return null
}

/**
 * Extrai data e hora (ex: "14:42 05/08/2026" ou "05/08/2026 14:42" ou "05/08/2026")
 */
export function extrairDataHoraConfirmacao(texto: string): string | null {
  // Padrão 1: HH:mm DD/MM/YYYY
  const m1 = texto.match(
    /\b([0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)\s+([0-3]?[0-9]\/[0-1]?[0-9]\/[1-2][0-9]{3})\b/,
  )
  if (m1) return `${m1[1]} ${m1[2]}`

  // Padrão 2: DD/MM/YYYY HH:mm
  const m2 = texto.match(
    /\b([0-3]?[0-9]\/[0-1]?[0-9]\/[1-2][0-9]{3})(?:\s+([0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?))?\b/,
  )
  if (m2) {
    return m2[2] ? `${m2[2]} ${m2[1]}` : m2[1]
  }

  return null
}

export interface LinhaRateioSetaExtraida {
  tipo: 'geradora' | 'beneficiaria'
  rotulo: string
  documentoBruto: string
  numero_uc: string
  percentual: number
  identificacao: string
}

/**
 * Tenta fazer o parse de uma linha no formato de seta:
 * UCG (290984100192) → 0,00%
 * UCB 1 (2.909.841.001-92) -> 5,00%
 * UCB (778.946.001-78) → 15,00%
 */
export function tentarParseLinhaSeta(linha: string): LinhaRateioSetaExtraida | null {
  const limpa = linha.trim()
  if (!limpa) return null

  // Expressão regular tolerante:
  // Início da linha: UCG ou UCB (opcionalmente com número/sufixo, ex: UCB 1, UCB 02)
  // Seguido de documento/número entre parênteses: (2.909.841.001-92) ou (290984100192)
  // Seguido de seta ("→" ou "->") com espaços opcionais
  // Seguido de percentual numérico com vírgula ou ponto e símbolo de % opcional ou obrigatório
  const regex =
    /^\s*(UC[GB])(?:\s+([A-Za-z0-9_.-]+))?\s*\(([^)]+)\)\s*(?:→|->)\s*([0-9]+(?:[.,][0-9]+)?)\s*%?\s*$/i
  const match = limpa.match(regex)
  if (!match) return null

  const prefixo = match[1].toUpperCase()
  const sufixo = match[2] ? match[2].trim() : ''
  const docBruto = match[3].trim()
  const percStr = match[4].trim()

  const tipo: 'geradora' | 'beneficiaria' = prefixo === 'UCG' ? 'geradora' : 'beneficiaria'
  const rotulo = sufixo ? `${prefixo} ${sufixo}` : prefixo
  const perc = normalizarPercentual(percStr)
  if (perc === null) return null

  // O número da UC é extraído do documento/número entre parênteses
  const numero_uc = docBruto.replace(/\D/g, '')
  if (!numero_uc) return null

  // Identificação consistente: rótulo + documento
  // Quando o documento/número estiver disponível, combina rótulo com documento:
  // Se pontuado (ex.: 2.909.841.001-92) -> "UCB 1 (2.909.841.001-92)"
  // Se sem pontuação (ex.: 290984100192) -> "UCB 1 (290984100192)"
  // Se apenas rótulo sem doc extra -> "UCB 1"
  const identificacao = docBruto ? `${rotulo} (${docBruto})` : rotulo

  return {
    tipo,
    rotulo,
    documentoBruto: docBruto,
    numero_uc,
    percentual: perc,
    identificacao,
  }
}

/**
 * Analisa linha com possíveis separadores (pipe "|", tab "\t", ponto-e-vírgula ";", ou múltiplos espaços).
 * Ignora cabeçalhos que contenham palavras como "UC", "CPF", "CNPJ", "Rateio", "Ações".
 */
export function tentarParseLinhaUC(linha: string): UnidadeImportadaRateio | null {
  const limpa = linha.trim()
  if (!limpa) return null

  // Pular linhas de cabeçalho óbvias
  const lower = limpa.toLowerCase()
  if (
    (lower.includes('uc') &&
      (lower.includes('rateio') || lower.includes('cpf') || lower.includes('cnpj'))) ||
    lower.startsWith('protocolo') ||
    lower.startsWith('solicita') ||
    lower.startsWith('seu protocolo') ||
    lower.startsWith('fique tranquilo') ||
    lower.startsWith('em breve')
  ) {
    return null
  }

  // Se tem separadores explícitos (| ou \t ou ;)
  let tokens: string[] = []
  if (limpa.includes('|')) {
    tokens = limpa
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
  } else if (limpa.includes('\t')) {
    tokens = limpa
      .split('\t')
      .map((s) => s.trim())
      .filter(Boolean)
  } else if (limpa.includes(';')) {
    tokens = limpa
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
  } else {
    // Tentativa por múltiplos espaços consecutivos
    const partes = limpa
      .split(/\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (partes.length >= 2) {
      tokens = partes
    } else {
      // Tentativa por espaço simples se houver padrão: <UC_DIGITOS> <CPF_CNPJ_OPCIONAL> <RATEIO>
      const matchEspacos = limpa.match(
        /^(\d{5,15})\s+(?:[\d.\-/]{11,18}\s+)?(\d{1,3}(?:[,.]\d{1,2})?%?)$/,
      )
      if (matchEspacos) {
        tokens = [matchEspacos[1], matchEspacos[2]]
      }
    }
  }

  if (tokens.length < 2) return null

  // A primeira coluna típica é a UC (apenas dígitos numéricos ou alfanumérico sem pontuação pesada)
  const ucCandidata = tokens[0].replace(/\D/g, '')
  if (ucCandidata.length < 5 || ucCandidata.length > 15) {
    return null
  }

  // Localizar a coluna de rateio/percentual.
  // Casos comuns:
  // tokens = [UC, CPF/CNPJ, Rateio, ...] -> index 2
  // tokens = [UC, Rateio] -> index 1
  // tokens = [UC, ..., Rateio]
  let percentualEncontrado: number | null = null

  // Se tokens tem 3 ou mais e tokens[1] é CPF/CNPJ (11 a 14 dígitos), a taxa é tokens[2]
  if (tokens.length >= 3) {
    const cpfCnpjDigitos = tokens[1].replace(/\D/g, '')
    if (cpfCnpjDigitos.length === 11 || cpfCnpjDigitos.length === 14) {
      const p = normalizarPercentual(tokens[2])
      if (p !== null) {
        percentualEncontrado = p
      }
    }
  }

  // Se ainda não encontrou, inspecionar cada token a partir do índice 1 procurando um percentual válido
  if (percentualEncontrado === null) {
    for (let i = 1; i < tokens.length; i++) {
      const tok = tokens[i].trim()
      // Se for CPF/CNPJ de 11 a 14 dígitos, pula
      const digitosApenas = tok.replace(/\D/g, '')
      if (
        digitosApenas.length >= 10 &&
        digitosApenas.length <= 14 &&
        !tok.includes('%') &&
        !tok.includes(',')
      ) {
        continue
      }
      const p = normalizarPercentual(tok)
      if (p !== null && p >= 0 && p <= 100) {
        percentualEncontrado = p
        break
      }
    }
  }

  if (percentualEncontrado === null) return null

  return {
    numero_uc: ucCandidata,
    percentual: percentualEncontrado,
  }
}

/**
 * Função principal do parser. Recebe o texto colado e devolve os dados estruturados.
 */
export function parseConfirmacaoConcessionaria(textoBruto: string): ResultadoParseRateioProtocolo {
  const erros: string[] = []
  const avisos: string[] = []

  if (!textoBruto || !textoBruto.trim()) {
    return {
      sucesso: false,
      unidades: [],
      somaPercentuais: 0,
      erros: ['Nenhum texto informado para importação.'],
      avisos: [],
    }
  }

  const linhas = textoBruto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  let protocolo: string | undefined = undefined
  let dataHora: string | undefined = undefined

  // 1. Procurar protocolo linha a linha ou no texto completo
  for (const linha of linhas) {
    const prot = extrairNumeroProtocolo(linha)
    if (prot) {
      protocolo = prot
      break
    }
  }

  // Fallback caso "Protocolo: 2175698383" ou variações estejam no texto
  if (!protocolo) {
    const match = textoBruto.match(
      /(?:protocolo|atendimento|solicita[çc][ãa]o)\s*(?:n[ºo°]?|de\s+atendimento)?\s*[:=-]\s*([A-Za-z0-9\-./]+)/i,
    )
    if (match && match[1]) {
      const limpo = match[1].trim().replace(/[^A-Za-z0-9-]/g, '')
      if (limpo.length >= 4) {
        protocolo = limpo
      }
    }
  }

  // 2. Extrair data e hora
  dataHora = extrairDataHoraConfirmacao(textoBruto) || undefined

  // 3. Extrair unidades consumidoras: Primeiro verifica se há linhas no formato de seta (UCG / UCB ... -> / → ...%)
  let percentualGeradora: number | undefined = undefined
  const linhasSetaBeneficiarias: LinhaRateioSetaExtraida[] = []

  for (const linha of linhas) {
    const itemSeta = tentarParseLinhaSeta(linha)
    if (itemSeta) {
      if (itemSeta.tipo === 'geradora') {
        percentualGeradora = itemSeta.percentual
      } else {
        linhasSetaBeneficiarias.push(itemSeta)
      }
    }
  }

  const unidadesMap = new Map<string, UnidadeImportadaRateio>()

  if (linhasSetaBeneficiarias.length > 0) {
    // Formato com setas detectado!
    for (const b of linhasSetaBeneficiarias) {
      if (unidadesMap.has(b.numero_uc)) {
        avisos.push(
          `A UC ${b.numero_uc} apareceu duplicada no texto; último percentual (${b.percentual}%) considerado.`,
        )
      }
      unidadesMap.set(b.numero_uc, {
        numero_uc: b.numero_uc,
        percentual: b.percentual,
        rotulo: b.rotulo,
        identificacao: b.identificacao,
        documento: b.documentoBruto,
      })
    }
  } else {
    // Formato tabular tradicional (pipe, tab, múltiplos espaços)
    for (const linha of linhas) {
      const u = tentarParseLinhaUC(linha)
      if (u) {
        if (unidadesMap.has(u.numero_uc)) {
          avisos.push(
            `A UC ${u.numero_uc} apareceu duplicada no texto; último percentual (${u.percentual}%) considerado.`,
          )
        }
        unidadesMap.set(u.numero_uc, u)
      }
    }
  }

  const unidades: UnidadeImportadaRateio[] = Array.from(unidadesMap.values())

  const somaPercentuais = Math.round(unidades.reduce((acc, u) => acc + u.percentual, 0) * 100) / 100

  // Validações obrigatórias
  if (!protocolo) {
    // Se não encontrou protocolo, gera aviso em vez de travar se as UCs foram extraídas com sucesso,
    // ou erro descritivo. Mas atentar: o modal permite confirmar apenas se protocolo existir,
    // portanto marcamos erro claro para o usuário.
    erros.push(
      'Não foi possível identificar o número do protocolo no texto (exemplo esperado: "Protocolo: 2175698383").',
    )
  }

  if (unidades.length === 0) {
    erros.push('Nenhuma unidade consumidora com rateio foi encontrada no texto colado.')
  }

  const sucesso = erros.length === 0

  return {
    sucesso,
    protocolo,
    dataHora,
    unidades,
    percentualGeradora,
    somaPercentuais,
    erros,
    avisos,
  }
}

/**
 * Fallback de IA para extração de rateio/protocolo quando o parser determinístico falhar.
 * Utiliza o endpoint backend existente (/backend/v1/extract-document ou /backend/v1/analisar-fatura-rge).
 */
export async function extrairRateioProtocoloComFallbackIA(
  textoBruto: string,
  tokenAuth?: string,
  baseUrlCustom?: string,
): Promise<ResultadoParseRateioProtocolo> {
  // 1. Tentar primeiro o parser determinístico local
  const parseLocal = parseConfirmacaoConcessionaria(textoBruto)
  if (parseLocal.sucesso && parseLocal.unidades.length > 0 && parseLocal.protocolo) {
    return parseLocal
  }

  // Se o parser local já extraiu com sucesso as unidades no formato com setas, mas apenas faltou protocolo
  // retornamos o parseLocal sem necessidade de chamada externa que possa alterar os percentuais
  if (
    parseLocal.unidades.length > 0 &&
    parseLocal.erros.length === 1 &&
    parseLocal.erros[0].includes('protocolo')
  ) {
    // se não há backend configurado ou fallback falhar, mantém as unidades
  }

  // 2. Se falhar e não houver texto substantivo
  if (!textoBruto || !textoBruto.trim()) {
    return parseLocal
  }

  const baseUrl =
    baseUrlCustom ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_POCKETBASE_URL) ||
    ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (tokenAuth) {
    headers.Authorization = tokenAuth
  }

  // Tentar chamar o endpoint de documentos existente (/backend/v1/extract-document)
  try {
    const res = await fetch(`${baseUrl}/backend/v1/extract-document`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        file_name: 'confirmacao-rateio-concessionaria.txt',
        mime_type: 'text/plain',
        text_content: textoBruto,
      }),
    })

    if (res.ok) {
      const json = await res.json()
      const rawText = json?.raw_text || ''

      // Tenta reparsear o raw_text retornado pelo $ai.chat
      if (rawText) {
        const reparseRaw = parseConfirmacaoConcessionaria(rawText)
        if (reparseRaw.sucesso && reparseRaw.unidades.length > 0) {
          return {
            ...reparseRaw,
            avisos: [
              ...reparseRaw.avisos,
              'Dados estruturados com auxílio do assistente de IA Skip.',
            ],
          }
        }

        // Tentar extrair bloco JSON da resposta da IA caso retorne { protocolo, percentual_geradora, unidades }
        try {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsedObj = JSON.parse(jsonMatch[0])
            const prot = parsedObj.protocolo || parsedObj.numero_protocolo
            const percGer =
              parsedObj.percentual_geradora !== undefined
                ? normalizarPercentual(String(parsedObj.percentual_geradora))
                : undefined
            const unidadesArray = Array.isArray(parsedObj.unidades)
              ? parsedObj.unidades
              : Array.isArray(parsedObj.beneficiarias)
                ? parsedObj.beneficiarias
                : []

            if (prot && unidadesArray.length > 0) {
              const ucsExtraidas: UnidadeImportadaRateio[] = []
              for (const item of unidadesArray) {
                const ucStr = String(item.numero_uc || item.uc || '').replace(/\D/g, '')
                const perc = normalizarPercentual(String(item.percentual ?? item.rateio ?? ''))
                const rot = item.rotulo ? String(item.rotulo).trim() : undefined
                const ident = item.identificacao ? String(item.identificacao).trim() : rot
                if (ucStr && perc !== null) {
                  ucsExtraidas.push({
                    numero_uc: ucStr,
                    percentual: perc,
                    rotulo: rot,
                    identificacao: ident,
                  })
                }
              }

              if (ucsExtraidas.length > 0) {
                const soma =
                  Math.round(ucsExtraidas.reduce((a, b) => a + b.percentual, 0) * 100) / 100
                return {
                  sucesso: true,
                  protocolo: String(prot).trim(),
                  dataHora: extrairDataHoraConfirmacao(textoBruto) || undefined,
                  unidades: ucsExtraidas,
                  percentualGeradora: percGer ?? undefined,
                  somaPercentuais: soma,
                  erros: [],
                  avisos: ['Dados recuperados com sucesso via fallback de IA.'],
                }
              }
            }
          }
        } catch (_) {
          /* ignorar e tentar o fallback RGE abaixo */
        }
      }
    }
  } catch (err) {
    console.warn('[rateioProtocoloParser] Fallback extract-document falhou:', err)
  }

  // Tentar também endpoint da fatura RGE se o anterior não resolveu
  try {
    const resRge = await fetch(`${baseUrl}/backend/v1/analisar-fatura-rge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        file_name: 'rateio-concessionaria.txt',
        mime_type: 'text/plain',
        text_content: textoBruto,
      }),
    })

    if (resRge.ok) {
      const jsonRge = await resRge.json()
      const rawTextRge = jsonRge?.raw_text || ''
      if (rawTextRge) {
        const reparseRge = parseConfirmacaoConcessionaria(rawTextRge)
        if (reparseRge.sucesso && reparseRge.unidades.length > 0) {
          return {
            ...reparseRge,
            avisos: [
              ...reparseRge.avisos,
              'Dados estruturados com auxílio do modelo de visão RGE/Gemini.',
            ],
          }
        }
      }
    }
  } catch (errRge) {
    console.warn('[rateioProtocoloParser] Fallback analisar-fatura-rge falhou:', errRge)
  }

  // Se nenhum fallback de IA conseguiu, retorna o resultado do parse determinístico original com seus erros
  return parseLocal
}
