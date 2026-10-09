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
}

export interface ResultadoParseRateioProtocolo {
  sucesso: boolean
  protocolo?: string
  dataHora?: string
  unidades: UnidadeImportadaRateio[]
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

  // Fallback caso "Protocolo: 2175698383" esteja no meio de um bloco
  if (!protocolo) {
    const match = textoBruto.match(
      /protocolo\s*(?:n[ºo°]?|de\s+atendimento)?\s*[:=-]\s*([A-Za-z0-9\-./]+)/i,
    )
    if (match && match[1]) {
      const limpo = match[1].trim().replace(/[^A-Za-z0-9-]/g, '')
      if (limpo.length >= 4) protocolo = limpo
    }
  }

  // 2. Extrair data e hora
  dataHora = extrairDataHoraConfirmacao(textoBruto) || undefined

  // 3. Extrair unidades consumidoras
  const unidadesMap = new Map<string, number>()
  for (const linha of linhas) {
    const u = tentarParseLinhaUC(linha)
    if (u) {
      // Se a mesma UC aparecer mais de uma vez no texto, a última substitui ou avisa
      if (unidadesMap.has(u.numero_uc)) {
        avisos.push(
          `A UC ${u.numero_uc} apareceu duplicada no texto; último percentual (${u.percentual}%) considerado.`,
        )
      }
      unidadesMap.set(u.numero_uc, u.percentual)
    }
  }

  const unidades: UnidadeImportadaRateio[] = Array.from(unidadesMap.entries()).map(
    ([numero_uc, percentual]) => ({
      numero_uc,
      percentual,
    }),
  )

  const somaPercentuais = Math.round(unidades.reduce((acc, u) => acc + u.percentual, 0) * 100) / 100

  // Validações obrigatórias
  if (!protocolo) {
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
    somaPercentuais,
    erros,
    avisos,
  }
}
