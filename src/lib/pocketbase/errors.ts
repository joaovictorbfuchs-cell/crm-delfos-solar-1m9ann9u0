import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Detecta erros de sessão expirada/inválida (auth token revogado) que exigem
 * novo login. Implementação canônica — salvaguardas (lib/errors, lib/client,
 * services/*) apenas reexportam.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!(error instanceof ClientResponseError)) return false
  const status = error.status
  if (status === 401) return true
  if (status === 400 || status === 403) {
    const data = error.response?.data as { code?: unknown } | undefined
    if (data && typeof data === 'object') {
      const code = String(data.code ?? '')
      return code === 'auto_cancelled' || code.includes('auth')
    }
    const msg = (error.response?.message ?? '').toLowerCase()
    return msg.includes('token') || msg.includes('auth') || msg.includes('session')
  }
  return false
}

/**
 * Detecta erros de requisição abortada (auto cancellation do SDK ou AbortController).
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (
    error instanceof ClientResponseError &&
    (error.originalError?.name === 'AbortError' || error.message?.includes('cancelled'))
  ) {
    return true
  }
  return false
}

/**
 * Formata um erro para exibição amigável ao usuário.
 */
export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const fieldMsgs = Object.values(extractFieldErrors(error))
    if (fieldMsgs.length > 0) return fieldMsgs.join(' ')
    return error.message || 'Erro inesperado.'
  }
  if (error instanceof Error) return error.message
  return String(error ?? 'Erro inesperado.')
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
