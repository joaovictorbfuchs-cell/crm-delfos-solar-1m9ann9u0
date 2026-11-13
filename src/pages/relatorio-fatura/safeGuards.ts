/**
 * Utilitários de blindagem de render do relatório de fatura.
 * A IA pode devolver strings/objetos fora do formato esperado; o relatório
 * NÃO pode cair em ErrorBoundary por isso (endpoint responde 200 com dados
 * parciais). Todo acesso aninhado a dados_completos passa por aqui.
 */

/** Objeto seguro: retorna {} quando não é objeto plano (não array, não null). */
export const safeObj = (v: unknown): Record<string, any> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {}

/** Array seguro: retorna [] quando não é array. */
export const safeArr = (v: unknown): any[] => (Array.isArray(v) ? v : [])

/** Coerção segura para número: aceita number finito ou string ("12,34"). */
export const num = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return 0
}

/** Texto seguro com fallback. */
export const safeStr = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.trim() ? v : fallback
