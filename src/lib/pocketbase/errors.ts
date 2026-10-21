import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

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

// Identifica erros de sessão/auth (token expirado, não autorizado).
// Contrato verificado por src/services/knowledgeBaseService.test.ts.
export function isAuthSessionError(error: unknown): boolean {
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  if (error && typeof error === 'object') {
    const e = error as { status?: unknown; statusCode?: unknown; message?: unknown }
    const status = typeof e.status === 'number' ? e.status : undefined
    const statusCode = typeof e.statusCode === 'number' ? e.statusCode : undefined
    if (status === 401 || status === 403) return true
    if (statusCode === 401 || statusCode === 403) return true
    const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
    if (msg.includes('token') && (msg.includes('expired') || msg.includes('invalid'))) return true
  }
  return false
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
