/**
 * Utilitários para conversão e formatação de data/hora no fuso horário fixo de São Paulo (America/Sao_Paulo, UTC-3).
 *
 * O Brasil aboliu o horário de verão (Decreto 9.772/2019), mantendo São Paulo em offset fixo UTC-3 (-03:00).
 * Isso garante que inputs `datetime-local` (formato "YYYY-MM-DDTHH:mm") sejam sempre interpretados
 * no horário comercial/local de São Paulo, independentemente do fuso horário da máquina ou navegador do usuário,
 * gerando um ISO 8601 UTC exato para gravação no banco de dados e comparação no worker do backend.
 */

const SAO_PAULO_OFFSET_HOURS = -3
const SAO_PAULO_OFFSET_MS = SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000

/**
 * Converte uma string digitada no input datetime-local ("YYYY-MM-DDTHH:mm" ou com segundos/espaço)
 * interpretando-a ESTRITAMENTE como horário de São Paulo (UTC-3), e retornando a string ISO em UTC
 * (ex: "2025-05-10T14:30" em SP -> "2025-05-10T17:30:00.000Z").
 *
 * Retorna null se a string for vazia ou inválida.
 */
export function parseSaoPauloToUtcIso(inputStr: string | null | undefined): string | null {
  if (!inputStr || typeof inputStr !== 'string') return null
  const trimmed = inputStr.trim()
  if (!trimmed) return null

  // Casos comuns:
  // "YYYY-MM-DDTHH:mm"
  // "YYYY-MM-DDTHH:mm:ss"
  // "YYYY-MM-DD HH:mm"
  // "YYYY-MM-DD HH:mm:ss"
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/,
  )

  if (!match) {
    // Fallback: se já vier como ISO completo válido
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1 // 0-based
  const day = parseInt(match[3], 10)
  const hour = parseInt(match[4], 10)
  const minute = parseInt(match[5], 10)
  const second = match[6] ? parseInt(match[6], 10) : 0

  // Cria a estampa UTC somando 3 horas ao valor civil digitado (pois SP = UTC-3 -> UTC = SP + 3h)
  const utcMs = Date.UTC(year, month, day, hour, minute, second) - SAO_PAULO_OFFSET_MS
  if (isNaN(utcMs)) return null

  return new Date(utcMs).toISOString()
}

/**
 * Retorna o timestamp em milissegundos correspondente ao instante em que a data/hora digitada em SP ocorrerá.
 * Útil para checagens de validação no frontend (ex: se `timestampSp > Date.now() + 60_000`).
 */
export function getSaoPauloTimestampMs(inputStr: string | null | undefined): number | null {
  const iso = parseSaoPauloToUtcIso(inputStr)
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d.getTime()
}

/**
 * Formata um timestamp ou string ISO UTC de volta para o horário de São Paulo (UTC-3),
 * no formato padrão brasileiro "DD/MM/AAAA HH:mm" (ou com segundos se solicitado).
 *
 * Funciona de forma totalmente determinística sem depender do timezone do navegador.
 */
export function formatUtcToSaoPaulo(
  utcDateStr: string | Date | number | null | undefined,
  incluirSegundos: boolean = false,
): string {
  if (!utcDateStr) return '-'

  let d: Date
  if (utcDateStr instanceof Date) {
    d = utcDateStr
  } else if (typeof utcDateStr === 'number') {
    d = new Date(utcDateStr)
  } else if (typeof utcDateStr === 'string') {
    const trimmed = utcDateStr.trim()
    if (!trimmed) return '-'
    d = new Date(trimmed)
  } else {
    return '-'
  }

  if (isNaN(d.getTime())) return '-'

  // Calcula os componentes no fuso de São Paulo aplicando o deslocamento fixo de -03:00 (subtraindo 3h de UTC)
  const spMs = d.getTime() + SAO_PAULO_OFFSET_MS
  const spDate = new Date(spMs)

  const day = String(spDate.getUTCDate()).padStart(2, '0')
  const month = String(spDate.getUTCMonth() + 1).padStart(2, '0')
  const year = spDate.getUTCFullYear()
  const hours = String(spDate.getUTCHours()).padStart(2, '0')
  const minutes = String(spDate.getUTCMinutes()).padStart(2, '0')

  if (incluirSegundos) {
    const seconds = String(spDate.getUTCSeconds()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  }

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Converte um ISO UTC (ou Date) para o formato esperado por inputs `datetime-local` ("YYYY-MM-DDTHH:mm")
 * garantindo a representação no fuso horário de São Paulo (UTC-3).
 */
export function formatUtcToSaoPauloInput(
  utcDateStr: string | Date | number | null | undefined,
): string {
  if (!utcDateStr) return ''

  let d: Date
  if (utcDateStr instanceof Date) {
    d = utcDateStr
  } else if (typeof utcDateStr === 'number') {
    d = new Date(utcDateStr)
  } else if (typeof utcDateStr === 'string') {
    const trimmed = utcDateStr.trim()
    if (!trimmed) return ''
    d = new Date(trimmed)
  } else {
    return ''
  }

  if (isNaN(d.getTime())) return ''

  const spMs = d.getTime() + SAO_PAULO_OFFSET_MS
  const spDate = new Date(spMs)

  const year = spDate.getUTCFullYear()
  const month = String(spDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(spDate.getUTCDate()).padStart(2, '0')
  const hours = String(spDate.getUTCHours()).padStart(2, '0')
  const minutes = String(spDate.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}
