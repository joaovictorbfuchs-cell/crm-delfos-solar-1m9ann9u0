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

  // Remove DDI Brasil (55) se o comprimento for 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
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
      // Variação com ou sem 9º dígito (ex: 997128844 vs 97128844)
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
 * Busca na lista de clientes aquele cujo telefone (ou whatsapp ou titular_telefone) bate com o telefone fornecido.
 */
export function buscarClientePorTelefone(telefone: string, clientes: Cliente[]): Cliente | null {
  const telNorm = normalizarTelefoneComparacao(telefone)
  if (!telNorm || telNorm.length < 8) return null

  for (const cliente of clientes) {
    if (cliente.telefone && telefonesBatem(telefone, cliente.telefone)) {
      return cliente
    }
    if (cliente.whatsapp && telefonesBatem(telefone, cliente.whatsapp)) {
      return cliente
    }
    if (cliente.titular_telefone && telefonesBatem(telefone, cliente.titular_telefone)) {
      return cliente
    }
    if (cliente.telefone_secundario && telefonesBatem(telefone, cliente.telefone_secundario)) {
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
  return contatos.map((contato, index) => {
    const id = `contato_${index + 1}_${Date.now()}`
    const telefoneCsv = (contato.telefone || '').trim()
    const nomeCsv = (contato.nome || '').trim() || `Contato ${index + 1}`
    const telefoneCsvNormalizado = normalizarTelefoneComparacao(telefoneCsv)

    const clienteEncontrado = buscarClientePorTelefone(telefoneCsv, clientes)
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

  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return []

  // Detecta o delimitador na primeira linha
  const firstLine = lines[0]
  const countComma = (firstLine.match(/,/g) || []).length
  const countSemicolon = (firstLine.match(/;/g) || []).length
  const countTab = (firstLine.match(/\t/g) || []).length

  let delimiter = ','
  if (countSemicolon > countComma && countSemicolon >= countTab) {
    delimiter = ';'
  } else if (countTab > countComma && countTab > countSemicolon) {
    delimiter = '\t'
  }

  // Função interna para dividir linha respeitando aspas
  const splitLine = (line: string): string[] => {
    const cells: string[] = []
    let inQuotes = false
    let current = ''

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    cells.push(current.trim())
    return cells
  }

  const rawMatrix = lines.map(splitLine)
  if (rawMatrix.length === 0) return []

  // Detectar índices de colunas a partir do cabeçalho
  const headers = rawMatrix[0].map((h) =>
    h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim(),
  )

  let nomeIdx = headers.findIndex((h) =>
    [
      'nome',
      'name',
      'contato',
      'contact',
      'cliente',
      'nome completo',
      'first name',
      'display name',
    ].includes(h),
  )
  let telIdx = headers.findIndex((h) =>
    [
      'telefone',
      'phone',
      'celular',
      'mobile',
      'whatsapp',
      'fone',
      'tel',
      'phone number',
      'numero',
    ].includes(h),
  )

  const hasHeader = nomeIdx !== -1 || telIdx !== -1

  // Se não encontrou cabeçalho explícito, tenta deduzir pela 1ª linha
  let dataRowsStart = 1
  if (!hasHeader) {
    dataRowsStart = 0
    // Supõe coluna 0 = nome e coluna 1 = telefone, ou vice-versa caso a coluna 0 tenha dígitos de telefone
    const col0IsPhone = rawMatrix[0][0] && rawMatrix[0][0].replace(/\D/g, '').length >= 8
    const col1IsPhone = rawMatrix[0][1] && rawMatrix[0][1].replace(/\D/g, '').length >= 8

    if (col0IsPhone && !col1IsPhone) {
      telIdx = 0
      nomeIdx = 1
    } else {
      nomeIdx = 0
      telIdx = 1
    }
  } else {
    if (nomeIdx === -1) nomeIdx = telIdx === 0 ? 1 : 0
    if (telIdx === -1) telIdx = nomeIdx === 0 ? 1 : 0
  }

  const contatos: ContatoCsvRaw[] = []

  for (let i = dataRowsStart; i < rawMatrix.length; i++) {
    const row = rawMatrix[i]
    if (!row || row.length === 0) continue

    const nome = (row[nomeIdx] || '').replace(/^["']|["']$/g, '').trim()
    const telefone = (row[telIdx] || '').replace(/^["']|["']$/g, '').trim()

    // Ignora linhas totalmente vazias ou que sejam o próprio cabeçalho repetido
    if (!nome && !telefone) continue
    if (
      nome.toLowerCase() === 'nome' ||
      nome.toLowerCase() === 'name' ||
      telefone.toLowerCase() === 'telefone' ||
      telefone.toLowerCase() === 'phone'
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
