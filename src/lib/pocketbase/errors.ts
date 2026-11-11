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

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}

// Detecta erro de sessão expirada / autenticação (401/403 ou texto de token expirado).
// Export crítico protegido por exportsGuard.test.ts — NÃO remover.
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const anyErr = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    message?: unknown
  }
  const status = anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status
  if (status === 401 || status === 403) return true
  const msg = typeof anyErr.message === 'string' ? anyErr.message.toLowerCase() : ''
  if (!msg) return false
  const marcadores = [
    'token is expired',
    'token expired',
    'invalid or expired token',
    'sessão expirada',
    'sessao expirada',
    'login expirou',
    'failed to authenticate',
    'authentication failed',
  ]
  return marcadores.some((m) => msg.includes(m))
}

// Detecta erro de requisição abortada (auto-cancelamento do SDK, fetch abortado).
// Export crítico protegido por exportsGuard.test.ts — NÃO remover.
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const anyErr = error as { isAbort?: unknown; name?: unknown; message?: unknown }
  if (anyErr.isAbort === true) return true
  if (anyErr.name === 'AbortError') return true
  const msg = typeof anyErr.message === 'string' ? anyErr.message.toLowerCase() : ''
  return msg.includes('aborted') || msg.includes('aborterror')
}

// Formata um erro do PocketBase em mensagem legível para o usuário.
// Export crítico protegido por exportsGuard.test.ts — NÃO remover.
export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
