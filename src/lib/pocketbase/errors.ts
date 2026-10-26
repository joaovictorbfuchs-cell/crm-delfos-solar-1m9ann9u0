import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as any
    if (e.status === 401 || e.status === 403) return true
    if (e.statusCode === 401 || e.statusCode === 403) return true
    if (e.response?.status === 401 || e.response?.status === 403) return true
  }
  const msg =
    typeof err === 'string' ? err : err instanceof Error ? err.message : (err as any)?.message || ''
  const m = msg.toLowerCase()
  return (
    m.includes('token is expired') ||
    m.includes('failed to authenticate') ||
    m.includes('sessão expirada') ||
    m.includes('sessao expirada') ||
    m.includes('login expirou') ||
    m.includes('token expirado')
  )
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as any
    if (e.isAbort) return true
    if (e.name === 'AbortError' || e.name === 'ClientResponseError 0') return true
  }
  const msg =
    typeof err === 'string' ? err : err instanceof Error ? err.message : (err as any)?.message || ''
  return msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('autocancelled')
}

export function formatPbError(error: unknown, fallback = 'Erro inesperado'): string {
  if (!error) return fallback
  if (error instanceof ClientResponseError) {
    const data = error.response?.data
    if (data && typeof data === 'object') {
      const parts: string[] = []
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && 'message' in v) {
          parts.push(`${k}: ${(v as any).message}`)
        }
      }
      if (parts.length > 0) return parts.join(', ')
    }
    return error.message || fallback
  }
  return error instanceof Error ? error.message : String(error)
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
