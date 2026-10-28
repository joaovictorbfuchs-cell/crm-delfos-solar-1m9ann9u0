/**
 * Utilitários para manipulação e cálculo de horários (HH:mm) e duração de atividades.
 * Suporta arredondamento em passos de 5 minutos, virada de meia-noite e formatação amigável.
 * Totalmente defensivo contra undefined, null, objetos, tipos inesperados e datas inválidas.
 */

/** Converte string "HH:mm" (ou string ISO / data / objeto) em total de minutos a partir das 00:00 */
export function timeStringToMinutes(timeStr: unknown): number {
  if (timeStr === undefined || timeStr === null) return 0

  try {
    // Se for um Date válido
    if (timeStr instanceof Date) {
      if (isNaN(timeStr.getTime())) return 0
      return timeStr.getHours() * 60 + timeStr.getMinutes()
    }

    // Se for número (já em minutos ou timestamp)
    if (typeof timeStr === 'number') {
      if (isNaN(timeStr) || !isFinite(timeStr)) return 0
      return Math.max(0, Math.min(1439, Math.round(timeStr)))
    }

    let str = String(timeStr).trim()
    if (
      !str ||
      str === 'null' ||
      str === 'undefined' ||
      str === 'Invalid Date' ||
      str === '--:--'
    ) {
      return 0
    }

    // Se for formato ISO ou YYYY-MM-DD HH:mm
    if (str.length >= 16 && (str.includes('T') || str.includes(' '))) {
      const horaMinSlice = str.replace(' ', 'T').slice(11, 16)
      if (/^\d{1,2}:\d{2}$/.test(horaMinSlice)) {
        str = horaMinSlice
      }
    }

    // Tolerante: aceita "HH:mm", "H:mm", "HH:mm:ss", "HH:mm:ss.sss"
    const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/)
    if (!match) {
      // Tenta extrair qualquer padrão HH:mm na string
      const subMatch = str.match(/\b(\d{1,2}):(\d{2})\b/)
      if (subMatch) {
        const hours = parseInt(subMatch[1], 10)
        const minutes = parseInt(subMatch[2], 10)
        if (!isNaN(hours) && !isNaN(minutes)) {
          return (hours % 24) * 60 + (minutes % 60)
        }
      }
      return 0
    }

    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    if (isNaN(hours) || isNaN(minutes)) return 0
    return (hours % 24) * 60 + (minutes % 60)
  } catch {
    return 0
  }
}

/** Converte total de minutos em formato "HH:mm" (24h com zero à esquerda) */
export function minutesToTimeString(totalMinutes: unknown): string {
  try {
    const minNum = Number(totalMinutes)
    if (isNaN(minNum) || !isFinite(minNum)) return '00:00'
    // Normaliza minutos para o intervalo de 0 a 1439 (24 horas)
    const normalized = ((Math.round(minNum) % 1440) + 1440) % 1440
    const hours = Math.floor(normalized / 60)
    const minutes = normalized % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  } catch {
    return '00:00'
  }
}

/**
 * Soma minutos a um horário "HH:mm".
 * Trata virada de meia-noite normalmente (ex: 23:30 + 60 min = 00:30).
 */
export function somarMinutos(horaStr: unknown, minutosParaSomar: unknown): string {
  try {
    const baseMinutos = timeStringToMinutes(horaStr)
    const soma =
      typeof minutosParaSomar === 'number' && !isNaN(minutosParaSomar) && isFinite(minutosParaSomar)
        ? Math.round(minutosParaSomar)
        : Number(minutosParaSomar) || 0
    return minutesToTimeString(baseMinutos + soma)
  } catch {
    return '00:00'
  }
}

/**
 * Calcula a diferença em minutos entre dois horários "HH:mm".
 * Se o fim for menor que o início, assume que virou a meia-noite (ex: 23:00 até 01:00 = 120 min).
 * Se início e fim forem iguais, retorna 0 (ou 1440 se ciclo completo).
 */
export function calcularDiferencaMinutos(horaInicioStr: unknown, horaFimStr: unknown): number {
  try {
    const minInicio = timeStringToMinutes(horaInicioStr)
    const minFim = timeStringToMinutes(horaFimStr)
    if (minFim >= minInicio) {
      return minFim - minInicio
    }
    // Cruzou a meia-noite
    return 1440 - minInicio + minFim
  } catch {
    return 0
  }
}

/**
 * Arredonda minutos para o múltiplo de 5 mais próximo (00, 05, 10, ...).
 */
export function arredondarParaPasso5(minutos: unknown): number {
  try {
    const num = Number(minutos)
    if (isNaN(num) || !isFinite(num) || num <= 0) return 0
    return Math.round(num / 5) * 5
  } catch {
    return 0
  }
}

/**
 * Formata duração em minutos em texto amigável em português:
 * Ex: 60 -> "1h"
 * Ex: 90 -> "1h 30min"
 * Ex: 45 -> "45min"
 * Ex: 0 ou negativo -> "0min"
 */
export function formatarDuracao(minutos?: unknown): string {
  try {
    if (minutos === undefined || minutos === null) return '0min'
    const num = Number(minutos)
    if (isNaN(num) || !isFinite(num) || num <= 0) return '0min'

    const horas = Math.floor(num / 60)
    const minsRestantes = Math.round(num) % 60

    if (horas === 0) {
      return `${minsRestantes}min`
    }
    if (minsRestantes === 0) {
      return `${horas}h`
    }
    return `${horas}h ${minsRestantes}min`
  } catch {
    return '0min'
  }
}

/**
 * Formata de forma segura um Date, string ou timestamp para horário "HH:mm".
 * Nunca lança RangeError nem TypeError.
 */
export function formatarHoraSegura(val: unknown, fallback: string = '--:--'): string {
  if (val === undefined || val === null) return fallback
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return fallback
      const h = String(val.getHours()).padStart(2, '0')
      const m = String(val.getMinutes()).padStart(2, '0')
      return `${h}:${m}`
    }
    const str = String(val).trim()
    if (!str) return fallback
    const match = str.match(/\b(\d{1,2}):(\d{2})\b/)
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`
    }
    const d = new Date(str)
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, '0')
      const m = String(d.getMinutes()).padStart(2, '0')
      return `${h}:${m}`
    }
    return fallback
  } catch {
    return fallback
  }
}

/**
 * Opções padrão de passos de 5 minutos para seleção (de 0 a 55).
 */
export const MINUTOS_PASSO_5 = [
  '00',
  '05',
  '10',
  '15',
  '20',
  '25',
  '30',
  '35',
  '40',
  '45',
  '50',
  '55',
] as const

/**
 * Opções padrão de horas (00 a 23).
 */
export const HORAS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

/**
 * Lista de durações previstas mais comuns em minutos para manutenção em campo.
 */
export const DURACOES_PREVISTAS_SUGESTOES = [
  { minutos: 30, label: '30 min' },
  { minutos: 45, label: '45 min' },
  { minutos: 60, label: '1 hora (padrão)' },
  { minutos: 90, label: '1h 30min' },
  { minutos: 120, label: '2 horas' },
  { minutos: 150, label: '2h 30min' },
  { minutos: 180, label: '3 horas' },
  { minutos: 240, label: '4 horas' },
  { minutos: 300, label: '5 horas' },
  { minutos: 360, label: '6 horas' },
  { minutos: 480, label: '8 horas (dia todo)' },
]
