import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  const status =
    (err as { status?: number })?.status ??
    (err as { statusCode?: number })?.statusCode ??
    (err as { response?: { status?: number } })?.response?.status
  if (status === 401 || status === 403) return true

  const msg = String(
    (err as { message?: string })?.message || (err as { error?: string })?.error || err || '',
  ).toLowerCase()

  if (
    msg.includes('token is expired') ||
    msg.includes('invalid token') ||
    msg.includes('jwt') ||
    msg.includes('autentica') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('failed to authenticate') ||
    msg.includes('login expirou')
  ) {
    return true
  }

  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if ((err as { isAbort?: boolean })?.isAbort) return true
  if ((err as { name?: string })?.name === 'AbortError') return true
  const msg = String((err as { message?: string })?.message || '').toLowerCase()
  return msg.includes('the request was aborted') || msg.includes('abort')
}

export function formatPbError(
  error: unknown,
  fallback = 'Erro desconhecido ao processar requisição.',
): string {
  if (!error) return fallback
  if (error instanceof ClientResponseError) {
    const fieldErrors = extractFieldErrors(error)
    const msgs = Object.values(fieldErrors)
    if (msgs.length > 0) return msgs.join(' ')
    return error.message || fallback
  }
  if (error instanceof Error) {
    return error.message || fallback
  }
  if (typeof error === 'string') return error
  return fallback
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
