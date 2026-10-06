/**
 * Utilitários para manipulação e cálculo de horários (HH:mm) e duração de atividades.
 * Suporta arredondamento em passos de 5 minutos, virada de meia-noite e formatação amigável.
 */

/** Converte string "HH:mm" em total de minutos a partir das 00:00 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0
  // Tolerante: aceita "HH:mm", "H:mm", "HH:mm:ss", "HH:mm:ss.sss"
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/)
  if (!match) return 0
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  if (isNaN(hours) || isNaN(minutes)) return 0
  return (hours % 24) * 60 + (minutes % 60)
}

/** Converte total de minutos em formato "HH:mm" (24h com zero à esquerda) */
export function minutesToTimeString(totalMinutes: number): string {
  if (isNaN(totalMinutes)) return '00:00'
  // Normaliza minutos para o intervalo de 0 a 1439 (24 horas)
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Soma minutos a um horário "HH:mm".
 * Trata virada de meia-noite normalmente (ex: 23:30 + 60 min = 00:30).
 */
export function somarMinutos(horaStr: string, minutosParaSomar: number): string {
  const baseMinutos = timeStringToMinutes(horaStr)
  return minutesToTimeString(baseMinutos + minutosParaSomar)
}

/**
 * Calcula a diferença em minutos entre dois horários "HH:mm".
 * Se o fim for menor que o início, assume que virou a meia-noite (ex: 23:00 até 01:00 = 120 min).
 * Se início e fim forem iguais, retorna 0 (ou 1440 se ciclo completo).
 */
export function calcularDiferencaMinutos(horaInicioStr: string, horaFimStr: string): number {
  const minInicio = timeStringToMinutes(horaInicioStr)
  const minFim = timeStringToMinutes(horaFimStr)
  if (minFim >= minInicio) {
    return minFim - minInicio
  }
  // Cruzou a meia-noite
  return 1440 - minInicio + minFim
}

/**
 * Arredonda minutos para o múltiplo de 5 mais próximo (00, 05, 10, ...).
 */
export function arredondarParaPasso5(minutos: number): number {
  if (isNaN(minutos) || minutos <= 0) return 0
  return Math.round(minutos / 5) * 5
}

/**
 * Formata duração em minutos em texto amigável em português:
 * Ex: 60 -> "1h"
 * Ex: 90 -> "1h 30min"
 * Ex: 45 -> "45min"
 * Ex: 0 ou negativo -> "0min"
 */
export function formatarDuracao(minutos?: number | null): string {
  if (!minutos || isNaN(minutos) || minutos <= 0) return '0min'
  const horas = Math.floor(minutos / 60)
  const minsRestantes = minutos % 60

  if (horas === 0) {
    return `${minsRestantes}min`
  }
  if (minsRestantes === 0) {
    return `${horas}h`
  }
  return `${horas}h ${minsRestantes}min`
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
