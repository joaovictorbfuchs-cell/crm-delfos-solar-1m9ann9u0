import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

// Detecta erro de sessão/token expirado (401/403) — canônico, reexportado por lib/errors e services/errors
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const anyErr = error as { status?: unknown; response?: { status?: unknown }; message?: unknown }
  const status = anyErr.status ?? anyErr.response?.status
  if (status === 401 || status === 403) return true
  const msg = String(
    (error instanceof Error && error.message) ||
      (typeof anyErr.message === 'string' ? anyErr.message : ''),
  )
  return (
    msg.includes('token') ||
    msg.includes('Token') ||
    msg.includes('expirada') ||
    msg.includes('expirou') ||
    msg.includes('Failed to authenticate')
  )
}

// Detecta abort de requisição (auto-cancelamento do SDK)
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const anyErr = error as { isAbort?: unknown; name?: unknown }
  return Boolean(anyErr.isAbort) || anyErr.name === 'AbortError'
}

// Mensagem amigável de ClientResponseError (concatena erros por campo)
export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const fieldMsgs = Object.values(extractFieldErrors(error))
    if (fieldMsgs.length > 0) return fieldMsgs.join(' ')
    return error.message || 'Erro inesperado.'
  }
  return error instanceof Error ? error.message : 'Erro inesperado.'
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
