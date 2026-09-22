export function formatCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return 'R$ 0,00'
  }
  const num = typeof value === 'number' ? value : Number(value)
  if (isNaN(num)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') return '-'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '-'
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const year = d.getUTCFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return '-'
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') return '-'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '-'
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return '-'
  }
}

/**
 * Alias de compatibilidade para formatDateTime / formatação de data
 */
export const formatarDataHora = formatDateTime

export function formatWhatsAppPhone(phone: string | undefined | null): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 0) return ''

  // Se o número começar com "55" e tiver 12 ou 13 dígitos no total, remover o DDI Brasil (55)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
  }

  // Quando o número não tem DDD (8 dígitos para fixo ou 9 dígitos para celular),
  // assume o DDD padrão regional 54 (Delfos Solar - RS)
  if (digits.length === 8 || digits.length === 9) {
    digits = `54${digits}`
  }

  // 1 ou 2 dígitos (início da digitação do DDD)
  if (digits.length <= 2) {
    return `(${digits}`
  }

  // Entre 3 e 6 dígitos: "(XX) XXX..."
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }

  // Entre 7 e 10 dígitos (fixo completo tem 10 dígitos: "(XX) XXXX-XXXX")
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  // 11 dígitos: celular brasileiro padrão "(XX) XXXXX-XXXX"
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }

  // Mais de 11 dígitos (fallback legível sem quebrar: DDD + miolo + 4 finais)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, digits.length - 4)}-${digits.slice(digits.length - 4)}`
}

export function cleanPhoneDigits(phone: string | undefined | null): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Converte valor numérico em string monetária formatada em Real (ex: 1198.8 -> "R$ 1.198,80").
 * Sempre com 2 casas decimais e sem artefatos de ponto flutuante.
 */
export function formatCurrencyBRL(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00'
  }
  const rounded = Math.round(Number(value) * 100) / 100
  const parts = rounded.toFixed(2).split('.')
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimalPart = parts[1]
  return `R$ ${integerPart},${decimalPart}`
}

/**
 * Converte qualquer entrada do usuário (com ou sem R$, pontos, vírgulas)
 * para string com máscara monetária em Real brasileiro ("R$ 1.198,80").
 * Interpreta os dígitos como centavos conforme o usuário digita.
 */
export function maskCurrencyBRL(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return 'R$ 0,00'
  if (typeof input === 'number') {
    return formatCurrencyBRL(input)
  }
  const digits = input.replace(/\D/g, '')
  if (!digits || digits === '0') {
    return 'R$ 0,00'
  }
  const numValue = parseInt(digits, 10) / 100
  return formatCurrencyBRL(numValue)
}

/**
 * Converte uma string digitada com ou sem máscara para um número float arredondado a 2 casas decimais.
 * Ex: "R$ 1.198,80" -> 1198.8
 */
export function parseCurrencyBRL(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0
  if (typeof val === 'number') {
    return Math.round(val * 100) / 100
  }
  const digits = val.replace(/\D/g, '')
  if (!digits) return 0
  const cents = parseInt(digits, 10)
  return Math.round(cents) / 100
}

export function getTelhadoLabel(tipo: string | undefined): string {
  switch (tipo) {
    case 'ceramico':
      return 'Cerâmico'
    case 'metalico':
      return 'Metálico'
    case 'laje':
      return 'Laje'
    case 'fibrocimento':
      return 'Fibrocimento'
    default:
      return tipo || '-'
  }
}

/**
 * Calcula a data prevista de quitação do investimento (mês por extenso/ano em pt-BR)
 * a partir da data base da proposta/orçamento + meses de payback.
 * Exemplo: dataBase = "2024-03-15", mesesPayback = 52 -> "julho/2028"
 */
export function formatarMesAnoQuitacao(
  dataBase?: Date | string | null,
  mesesPayback?: number | null,
): string {
  let base = new Date()
  if (typeof dataBase === 'string' && dataBase.trim()) {
    const parsed = new Date(dataBase)
    if (!isNaN(parsed.getTime())) base = parsed
  } else if (dataBase instanceof Date && !isNaN(dataBase.getTime())) {
    base = new Date(dataBase.getTime())
  }
  const meses = mesesPayback && mesesPayback > 0 ? Math.round(mesesPayback) : 24
  const dataFinal = new Date(base.getFullYear(), base.getMonth() + meses, 1)
  return `${dataFinal.toLocaleDateString('pt-BR', { month: 'long' })}/${dataFinal.getFullYear()}`
}
