import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro retornado pelo PocketBase ou pela rede é de autenticação/sessão expirada (401, 403, token inválido).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Se o objeto tiver flag direta ou status HTTP 401/403
  const anyErr = err as any
  const status = anyErr?.status ?? anyErr?.statusCode ?? anyErr?.response?.status
  if (status === 401 || status === 403) {
    return true
  }

  // Se for instância de ClientResponseError
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }

  // Análise da mensagem de erro
  const msg = typeof anyErr?.message === 'string' ? anyErr.message.toLowerCase() : ''
  if (
    msg.includes('token is expired') ||
    msg.includes('token is invalid') ||
    msg.includes('failed to authenticate') ||
    msg.includes('login expirou') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('the request requires valid user authorization')
  ) {
    return true
  }

  return false
}

/**
 * Identifica se um erro foi cancelado por AbortController ou auto-cancellation do PocketBase.
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  const anyErr = err as any
  if (anyErr?.isAbort === true) return true
  if (anyErr?.name === 'AbortError') return true
  const msg = typeof anyErr?.message === 'string' ? anyErr.message.toLowerCase() : ''
  if (
    msg.includes('autocancelled') ||
    msg.includes('the request was aborted') ||
    msg.includes('aborterror')
  ) {
    return true
  }
  return false
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

/**
 * Formata um erro do PocketBase de maneira amigável para exibição em toasts e alertas.
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado.',
): string {
  if (!error) return fallbackMessage
  if (isAbortError(error)) return ''
  const fieldErrors = extractFieldErrors(error)
  const fieldMsgs = Object.entries(fieldErrors).map(([field, msg]) => `${field}: ${msg}`)
  if (fieldMsgs.length > 0) {
    return fieldMsgs.join(' | ')
  }
  return getErrorMessage(error) || fallbackMessage
}
