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
