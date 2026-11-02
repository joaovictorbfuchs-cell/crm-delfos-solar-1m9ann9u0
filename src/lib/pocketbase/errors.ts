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

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  const anyErr = error as any

  // Status code explícito 401 ou 403
  if (anyErr?.status === 401 || anyErr?.status === 403) return true
  if (anyErr?.statusCode === 401 || anyErr?.statusCode === 403) return true
  if (anyErr?.response?.status === 401 || anyErr?.response?.status === 403) return true

  // Mensagens típicas de expiração ou invalidação de token
  const msg = String(anyErr?.message || anyErr?.originalError?.message || '').toLowerCase()
  if (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('login expirou') ||
    msg.includes('failed to authenticate') ||
    msg.includes('the request requires valid user authorization')
  ) {
    return true
  }

  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const anyErr = error as any
  return (
    anyErr?.isAbort === true ||
    anyErr?.name === 'AbortError' ||
    String(anyErr?.message || '')
      .toLowerCase()
      .includes('the request was aborted')
  )
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
