import type { Cliente } from '@/types/crm'

export interface ContatoCsvRaw {
  nome: string
  telefone: string
  [key: string]: string
}

export interface ItemImportacaoContatoCelular {
  id: string
  nomeCsv: string
  telefoneCsv: string
  telefoneCsvNormalizado: string
  status: 'encontrado' | 'nao_encontrado'
  clienteId?: string
  clienteNome?: string
  clienteTelefoneAtual?: string
  telefoneAtualizado: boolean
  novoTelefoneAplicado?: string
}

export interface ResumoImportacaoContatos {
  totalContatos: number
  clientesEncontrados: number
  telefonesAtualizados: number
}

/**
 * Normaliza o telefone para comparação:
 * Mantém apenas dígitos e remove o código DDI do Brasil (55) inicial se houver 12 ou 13 dígitos
 * Ex: "(54) 99712-8844", "54997128844", "+55 54 99712-8844" -> "54997128844"
 */
export function normalizarTelefoneComparacao(tel: string | undefined | null): string {
  if (!tel) return ''
  let digits = tel.replace(/\D/g, '')

  // Remove zero(s) à esquerda espúrios se houver (ex: 054997128844 -> 54997128844)
  if (digits.startsWith('0') && digits.length >= 11) {
    digits = digits.replace(/^0+/, '')
  }

  // Remove DDI Brasil (55) se o comprimento for 12, 13 ou 14 dígitos (ex: +55 54 99999-9999 ou +55 054 ...)
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 14) {
    digits = digits.slice(2)
    // Se após remover o 55 sobrou um 0 à esquerda de DDD (ex: 55054999999999 -> 054... -> 54...)
    if (digits.startsWith('0') && digits.length >= 11) {
      digits = digits.replace(/^0+/, '')
    }
  }

  return digits
}

/**
 * Compara dois números de telefone ignorando máscaras, espaços, DDI (55) e zeros à esquerda.
 * Suporta correspondência exata dos dígitos normalizados e tolerância para variação do 9º dígito.
 */
export function telefonesBatem(
  telA: string | undefined | null,
  telB: string | undefined | null,
): boolean {
  const a = normalizarTelefoneComparacao(telA)
  const b = normalizarTelefoneComparacao(telB)

  if (!a || !b) return false
  if (a.length < 8 || b.length < 8) return false

  // Se forem idênticos
  if (a === b) return true

  // Comparar os últimos 8 ou 9 dígitos com o mesmo DDD
  if (a.length >= 10 && b.length >= 10) {
    const dddA = a.slice(0, 2)
    const dddB = b.slice(0, 2)
    if (dddA === dddB) {
      const numA = a.slice(2)
      const numB = b.slice(2)
      if (numA === numB) return true
      // Variação com ou sem 9º dígito celular (ex: 997128844 vs 97128844)
      if (numA.slice(-8) === numB.slice(-8)) return true
    }
  }

  // Se um dos lados não tiver DDD (apenas 8 ou 9 dígitos locais)
  if (a.slice(-8) === b.slice(-8) && (a.length <= 9 || b.length <= 9)) {
    return true
  }

  return false
}

/**
 * Busca na lista de clientes aquele cujo telefone (ou whatsapp ou titular_telefone ou telefone_secundario)
 * bate com o telefone fornecido.
 */
export function buscarClientePorTelefone(telefone: string, clientes: Cliente[]): Cliente | null {
  const telNorm = normalizarTelefoneComparacao(telefone)
  if (!telNorm || telNorm.length < 8) return null

  for (const cliente of clientes) {
    if (cliente.telefone && telefonesBatem(telNorm, cliente.telefone)) {
      return cliente
    }
    if (cliente.whatsapp && telefonesBatem(telNorm, cliente.whatsapp)) {
      return cliente
    }
    if (cliente.titular_telefone && telefonesBatem(telNorm, cliente.titular_telefone)) {
      return cliente
    }
    if (cliente.telefone_secundario && telefonesBatem(telNorm, cliente.telefone_secundario)) {
      return cliente
    }
  }

  return null
}

/**
 * Processa a lista de contatos do CSV contra a base de clientes do CRM
 */
export function processarContatosComClientes(
  contatos: ContatoCsvRaw[],
  clientes: Cliente[],
  telefonesAtualizadosMap: Record<string, string> = {},
): ItemImportacaoContatoCelular[] {
  // Pré-indexar clientes por telefones normalizados para alta performance com centenas de contatos
  // Chave: string de dígitos normalizados -> Cliente
  const indexClientesPorTel = new Map<string, Cliente>()
  const indexClientesPorUltimos8 = new Map<string, Cliente>()

  if (clientes && clientes.length > 0) {
    for (const cli of clientes) {
      const telFields = [cli.telefone, cli.whatsapp, cli.titular_telefone, cli.telefone_secundario]
      for (const rawTel of telFields) {
        if (!rawTel) continue
        const norm = normalizarTelefoneComparacao(rawTel)
        if (norm.length >= 8) {
          if (!indexClientesPorTel.has(norm)) {
            indexClientesPorTel.set(norm, cli)
          }
          const u8 = norm.slice(-8)
          if (!indexClientesPorUltimos8.has(u8)) {
            indexClientesPorUltimos8.set(u8, cli)
          }
        }
      }
    }
  }

  const casarCliente = (tel: string): Cliente | null => {
    if (!tel || !clientes.length) return null
    const norm = normalizarTelefoneComparacao(tel)
    if (!norm || norm.length < 8) return null

    // 1. Busca direta exata no mapa
    const exato = indexClientesPorTel.get(norm)
    if (exato) return exato

    // 2. Busca com variação do 9º dígito no mesmo DDD
    if (norm.length === 11) {
      // Ex: 54 9 9999-9999 -> tentar sem o 9 (54 9999-9999)
      const ddd = norm.slice(0, 2)
      const sem9 = ddd + norm.slice(3)
      const mSem9 = indexClientesPorTel.get(sem9)
      if (mSem9) return mSem9
    } else if (norm.length === 10) {
      // Ex: 54 9999-9999 -> tentar com 9 inserido (54 9 9999-9999)
      const ddd = norm.slice(0, 2)
      const com9 = `${ddd}9${norm.slice(2)}`
      const mCom9 = indexClientesPorTel.get(com9)
      if (mCom9) return mCom9
    }

    // 3. Fallback linear completo usando telefonesBatem
    return buscarClientePorTelefone(tel, clientes)
  }

  return contatos.map((contato, index) => {
    const id = `contato_${index + 1}`
    const telefoneCsv = (contato.telefone || '').trim()
    const nomeCsv = (contato.nome || '').trim() || `Contato ${index + 1}`
    const telefoneCsvNormalizado = normalizarTelefoneComparacao(telefoneCsv)

    const clienteEncontrado = casarCliente(telefoneCsv)
    const jaAtualizado = Boolean(clienteEncontrado && telefonesAtualizadosMap[clienteEncontrado.id])

    if (clienteEncontrado) {
      return {
        id,
        nomeCsv,
        telefoneCsv,
        telefoneCsvNormalizado,
        status: 'encontrado',
        clienteId: clienteEncontrado.id,
        clienteNome: clienteEncontrado.nome,
        clienteTelefoneAtual: clienteEncontrado.telefone || clienteEncontrado.whatsapp || '',
        telefoneAtualizado: jaAtualizado,
        novoTelefoneAplicado: jaAtualizado
          ? telefonesAtualizadosMap[clienteEncontrado.id]
          : undefined,
      }
    }

    return {
      id,
      nomeCsv,
      telefoneCsv,
      telefoneCsvNormalizado,
      status: 'nao_encontrado',
      telefoneAtualizado: false,
    }
  })
}

/**
 * Parser resiliente para CSV de contatos do celular
 * Suporta separadores (, ou ; ou tab), colunas em qualquer ordem (Nome/Telefone, Name/Phone, Celular, etc.)
 */
export function parseContatosCsv(csvContent: string): ContatoCsvRaw[] {
  const clean = csvContent.replace(/^\uFEFF/, '').trim()
  if (!clean) return []

  // Parseador de CSV compatível com RFC 4180 com tolerância a aspas desbalanceadas
  const parseRowsFromText = (text: string, delim: string): string[][] => {
    const matrix: string[][] = []
    let currentRow: string[] = []
    let currentCell = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]

      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          currentCell += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delim && !inQuotes) {
        currentRow.push(currentCell.trim())
        currentCell = ''
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++
        }
        currentRow.push(currentCell.trim())
        currentCell = ''
        if (currentRow.some((c) => c.length > 0)) {
          matrix.push(currentRow)
        }
        currentRow = []
      } else {
        currentCell += char
      }
    }

    // Última célula pendente
    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim())
      if (currentRow.some((c) => c.length > 0)) {
        matrix.push(currentRow)
      }
    }

    return matrix
  }

  // Tenta delimitar com vírgula, ponto-e-vírgula e tab
  // e escolhe o delimitador que resulta na matriz mais uniforme e coerente
  const candidateDelimiters = [',', ';', '\t']

  const evaluateMatrix = (matrix: string[][]) => {
    if (matrix.length === 0) return { score: -1, matrix }
    const colCounts = matrix.map((r) => r.length)
    const avgCols = colCounts.reduce((a, b) => a + b, 0) / colCounts.length
    if (avgCols < 1.5) return { score: 0, matrix }

    // Conta quantos telefones válidos (>=8 dígitos sem letras) foram detectados nas linhas
    let phonesFound = 0
    let consistentCols = 0
    const modeCols = Math.round(avgCols)

    for (const r of matrix.slice(0, 50)) {
      if (Math.abs(r.length - modeCols) <= 1) consistentCols++
      for (const cell of r) {
        const digits = cell.replace(/\D/g, '')
        if (digits.length >= 8 && digits.length <= 15 && !/[a-zA-Z\u00C0-\u00FF]/.test(cell)) {
          phonesFound++
          break
        }
      }
    }

    const score = phonesFound * 10 + consistentCols * 2 + (avgCols >= 2 ? 5 : 0)
    return { score, matrix }
  }

  let bestDelimResult = candidateDelimiters
    .map((delim) => ({ delim, ...evaluateMatrix(parseRowsFromText(clean, delim)) }))
    .sort((a, b) => b.score - a.score)[0]

  let rawMatrix = bestDelimResult?.matrix || []

  // Se por acaso aspas desbalanceadas quebraram o texto em pouquíssimas linhas,
  // faz fallback para split linha a linha com aspas ignoradas se a linha contiver quebra
  if (rawMatrix.length < 5 && clean.split(/\r?\n/).length > 5) {
    const fallbackLines = clean
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    const fallbackMatrix = fallbackLines.map((line) => {
      // split simples pelo delimitador
      return line.split(bestDelimResult.delim).map((c) => c.replace(/^["']|["']$/g, '').trim())
    })

    if (evaluateMatrix(fallbackMatrix).score > bestDelimResult.score) {
      rawMatrix = fallbackMatrix
    }
  }

  if (rawMatrix.length === 0) return []

  // Detectar se a primeira linha é um cabeçalho
  const headers = rawMatrix[0].map((h) =>
    h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim(),
  )

  // Lista expandida para reconhecer colunas de exportação do Google Contatos, iOS, Samsung, Outlook, etc.
  const nameKeywords = [
    'nome',
    'name',
    'display name',
    'nome completo',
    'first name',
    'primeiro nome',
    'contato',
    'contact',
    'cliente',
    'given name',
    'formatted name',
  ]

  const phoneKeywords = [
    'telefone',
    'phone',
    'celular',
    'mobile',
    'whatsapp',
    'fone',
    'tel',
    'phone number',
    'numero',
    'phone 1 - value',
    'phone 2 - value',
    'phone 1',
    'phone 2',
    'mobile phone',
    'primary phone',
  ]

  let nomeIdx = headers.findIndex((h) =>
    nameKeywords.some((k) => h === k || h.startsWith(`${k} `) || h.endsWith(` ${k}`)),
  )

  let telIdx = headers.findIndex((h) =>
    phoneKeywords.some((k) => h === k || h.startsWith(`${k} `) || h.endsWith(` ${k}`)),
  )

  const hasHeader = nomeIdx !== -1 || telIdx !== -1 || headers.some((h) => /[a-zA-Z]/.test(h))
  let dataRowsStart = hasHeader ? 1 : 0

  // Descobrir número máximo de colunas e dados amostrais
  const sampleRows = rawMatrix.slice(dataRowsStart, Math.min(rawMatrix.length, dataRowsStart + 100))
  const maxCols = Math.max(...rawMatrix.map((r) => r.length), 0)

  // Avalia cada coluna por quantidade de telefones válidos vs texto
  const colScores = Array.from({ length: maxCols }, (_, colIndex) => {
    let validPhoneCount = 0
    let textOnlyCount = 0
    let totalFilled = 0

    for (const row of sampleRows) {
      const val = (row[colIndex] || '').trim()
      if (!val) continue
      totalFilled++
      const digits = val.replace(/\D/g, '')
      // Telefone com formato brasileiro/internacional (entre 8 e 15 dígitos)
      const isLikelyPhone =
        digits.length >= 8 &&
        digits.length <= 15 &&
        /^[\d\s()+-]+$/.test(val) &&
        !/[a-zA-Z\u00C0-\u00FF]/.test(val)

      if (isLikelyPhone) {
        validPhoneCount++
      } else if (/[a-zA-Z\u00C0-\u00FF]/.test(val)) {
        textOnlyCount++
      }
    }

    return {
      colIndex,
      validPhoneCount,
      textOnlyCount,
      totalFilled,
    }
  })

  // Se telIdx não foi identificado pelo cabeçalho OU se a coluna escolhida quase não tem números,
  // selecionar a coluna que tem o maior número de valores com cara de telefone
  const bestPhoneCol = [...colScores].sort(
    (a, b) => b.validPhoneCount - a.validPhoneCount || b.totalFilled - a.totalFilled,
  )[0]

  const currentTelScore = telIdx !== -1 ? colScores[telIdx]?.validPhoneCount || 0 : 0
  if (
    telIdx === -1 ||
    (bestPhoneCol &&
      bestPhoneCol.validPhoneCount > currentTelScore &&
      bestPhoneCol.validPhoneCount > 0)
  ) {
    if (bestPhoneCol && bestPhoneCol.validPhoneCount > 0) {
      telIdx = bestPhoneCol.colIndex
    }
  }

  // Da mesma forma para o nome: deve ser uma coluna diferente de telIdx com presença forte de texto
  const candidateNames = colScores.filter((c) => c.colIndex !== telIdx)
  const bestNameCol = candidateNames.sort(
    (a, b) => b.textOnlyCount - a.textOnlyCount || b.totalFilled - a.totalFilled,
  )[0]

  if (nomeIdx === -1 || nomeIdx === telIdx) {
    if (bestNameCol) {
      nomeIdx = bestNameCol.colIndex
    }
  }

  // Fallbacks seguros se nada foi achado
  if (nomeIdx === -1) nomeIdx = 0
  if (telIdx === -1) telIdx = nomeIdx === 0 ? 1 : 0
  if (nomeIdx === telIdx) {
    telIdx = (nomeIdx + 1) % Math.max(maxCols, 2)
  }

  const contatos: ContatoCsvRaw[] = []

  for (let i = dataRowsStart; i < rawMatrix.length; i++) {
    const row = rawMatrix[i]
    if (!row || row.length === 0) continue

    let nome = (row[nomeIdx] || '').replace(/^["']|["']$/g, '').trim()
    let telefone = (row[telIdx] || '').replace(/^["']|["']$/g, '').trim()

    // Se a coluna atribuída como telefone NÃO contiver telefone válido (ex: <8 dígitos ou puramente letras),
    // procurar se outra coluna desta linha tem um telefone válido (ex: Phone 1 - Value, Phone 2, etc.)
    const telDigits = telefone.replace(/\D/g, '')
    if (telDigits.length < 8) {
      let foundAlternativePhone = ''
      for (let c = 0; c < row.length; c++) {
        if (c === nomeIdx) continue
        const candidate = (row[c] || '').replace(/^["']|["']$/g, '').trim()
        const candDigits = candidate.replace(/\D/g, '')
        if (candDigits.length >= 8 && candDigits.length <= 15 && /^[\d\s()+-]+$/.test(candidate)) {
          foundAlternativePhone = candidate
          break
        }
      }
      if (foundAlternativePhone) {
        telefone = foundAlternativePhone
      }
    }

    // Se o valor de telefone claramente for fragmento de texto (letras e sem dígitos suficientes), limpar telefone
    const finalTelDigits = telefone.replace(/\D/g, '')
    if (finalTelDigits.length < 8 && /[a-zA-Z\u00C0-\u00FF]/.test(telefone)) {
      // Se a coluna de nome estava vazia e o telefone é texto, talvez o nome estivesse nessa célula
      if (!nome) {
        nome = telefone
      }
      telefone = ''
    }

    // Ignora linhas totalmente vazias ou que sejam o próprio cabeçalho repetido
    if (!nome && !telefone) continue
    if (
      (nome.toLowerCase() === 'nome' ||
        nome.toLowerCase() === 'name' ||
        nome.toLowerCase() === 'first name') &&
      (telefone.toLowerCase() === 'telefone' ||
        telefone.toLowerCase() === 'phone' ||
        telefone.toLowerCase() === 'phone 1 - value')
    ) {
      continue
    }

    contatos.push({ nome, telefone })
  }

  return contatos
}

/**
 * CSV padrão de demonstração com 5 contatos:
 * 3 batem com clientes reais do CRM:
 * - Marcelo Becker: (54) 99712-8844
 * - Maria Santos: (54) 99812-3456
 * - João Pedro Oliveira: (54) 99123-7890
 * 2 não são encontrados no CRM:
 * - Marcos Vinicius Souza: (54) 99344-9988 (não cadastrado)
 * - Camila Fernandes Andrade: (51) 98765-4321 (não cadastrado)
 */
export const CSV_EXEMPLO_DEMONSTRACAO = `Nome,Telefone
Marcelo Becker,(54) 99712-8844
Maria Santos,+55 54 99812-3456
João Pedro Oliveira,54991237890
Marcos Vinicius Souza,(54) 99344-9988
Camila Fernandes Andrade,+55 51 98765-4321`
