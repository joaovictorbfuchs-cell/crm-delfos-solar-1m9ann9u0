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

// isAbortError: abort de request (auto-cancelamento do PocketBase / fetch).
export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof ClientResponseError && error.isAbort) ||
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

// formatPbError: mensagem amigavel para exibir ao usuario.
export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const msgs = Object.values(extractFieldErrors(error))
    if (msgs.length > 0) return msgs.join(' ')
    if (error.response?.message) return error.response.message
  }
  return getErrorMessage(error)
}

// isAuthSessionError: sessao de autenticacao caiu (401/403 ou token invalido/
// expirado) — usado para mostrar o alerta de sessao expirada.
export function isAuthSessionError(error: unknown): boolean {
  if (!(error instanceof ClientResponseError)) return false
  if (error.status === 401 || error.status === 403) return true
  const msg = String(
    (error.response as { message?: string } | undefined)?.message || error.message || '',
  ).toLowerCase()
  return (
    msg.includes('token') &&
    (msg.includes('invalid') || msg.includes('expir') || msg.includes('expired'))
  )
}
