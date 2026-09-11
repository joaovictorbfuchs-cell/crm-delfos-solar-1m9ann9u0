export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-'
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
  if (!dateString) return '-'
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

export function formatWhatsAppPhone(phone: string | undefined | null): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 0) return ''

  // Se o número começar com "55" e tiver 12 ou 13 dígitos no total, remover o DDI Brasil (55)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
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
