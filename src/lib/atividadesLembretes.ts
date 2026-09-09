/**
 * Utilitários para manuseio de datas locais e categorização de atividades de hoje / atrasadas.
 * Cuidado com timezone: sempre extrair YYYY-MM-DD usando métodos locais do Date (getFullYear, getMonth, getDate).
 */
import type { Atividade } from '@/types/crm'

/**
 * Retorna a data no formato "YYYY-MM-DD" baseada no horário local do usuário.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Extrai "YYYY-MM-DD" de uma string de data (ou Date) usando horário local.
 * Suporta formatos ISO tipo "2026-09-09T14:30:00.000Z", "2026-09-09 14:30:00.000Z" ou "2026-09-09".
 */
export function extractLocalDateString(dateInput: string | Date | undefined | null): string | null {
  if (!dateInput) return null
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return null
    return getLocalDateString(d)
  } catch {
    return null
  }
}

/**
 * Calcula a diferença em dias corridos entre a data da atividade e hoje (no horário local).
 * Se a atividade era para 2 dias atrás, retorna 2.
 */
export function getDaysOverdue(
  dateInput: string | Date | undefined | null,
  todayStr = getLocalDateString(),
): number {
  const atvDateStr = extractLocalDateString(dateInput)
  if (!atvDateStr) return 0

  const [tY, tM, tD] = todayStr.split('-').map(Number)
  const [aY, aM, aD] = atvDateStr.split('-').map(Number)

  const dateToday = new Date(tY, tM - 1, tD).getTime()
  const dateAtv = new Date(aY, aM - 1, aD).getTime()

  const diffMs = dateToday - dateAtv
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

export interface AtividadesHojeResult {
  deHoje: Atividade[]
  atrasadas: Atividade[]
  todasPendentesHojeEAtrasadas: Atividade[]
  totalCount: number
  temAtrasadas: boolean
}

/**
 * Filtra e categoriza atividades com status === 'pendente' em:
 * - atrasadas: data local anterior a hoje
 * - deHoje: data local igual a hoje
 *
 * Ordenação:
 * - Atrasadas primeiro (mais antigas primeiro)
 * - Depois as de hoje por horário (mais cedo primeiro)
 */
export function categorizarAtividadesHojeEAtrasadas(
  atividades: Atividade[],
  todayStr = getLocalDateString(),
): AtividadesHojeResult {
  const deHoje: Atividade[] = []
  const atrasadas: Atividade[] = []

  for (const atv of atividades) {
    if (atv.status !== 'pendente') continue

    const atvDateStr = extractLocalDateString(atv.data || atv.created)
    if (!atvDateStr) continue

    if (atvDateStr === todayStr) {
      deHoje.push(atv)
    } else if (atvDateStr < todayStr) {
      atrasadas.push(atv)
    }
  }

  // Ordenar atrasadas: mais antigas primeiro (crescente por timestamp)
  atrasadas.sort((a, b) => {
    const timeA = new Date(a.data || a.created).getTime()
    const timeB = new Date(b.data || b.created).getTime()
    return timeA - timeB
  })

  // Ordenar de hoje: por horário do dia (crescente por timestamp)
  deHoje.sort((a, b) => {
    const timeA = new Date(a.data || a.created).getTime()
    const timeB = new Date(b.data || b.created).getTime()
    return timeA - timeB
  })

  const todasPendentesHojeEAtrasadas = [...atrasadas, ...deHoje]

  return {
    deHoje,
    atrasadas,
    todasPendentesHojeEAtrasadas,
    totalCount: todasPendentesHojeEAtrasadas.length,
    temAtrasadas: atrasadas.length > 0,
  }
}

/**
 * Formata hora local amigável (HH:mm) ou data abreviada
 */
export function formatTimeOnly(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return ''
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return ''
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } catch {
    return ''
  }
}
