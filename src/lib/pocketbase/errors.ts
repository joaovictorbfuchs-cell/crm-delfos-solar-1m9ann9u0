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

export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const msgs = Object.values(extractFieldErrors(error))
    if (msgs.length) return msgs.join(' ')
  }
  return error instanceof Error ? error.message : String(error || 'Erro inesperado.')
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof ClientResponseError) return error.isAbort === true
  const anyErr = error as { name?: string; isAbort?: boolean; code?: string | number } | null
  return (
    anyErr?.name === 'AbortError' ||
    anyErr?.isAbort === true ||
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError')
  )
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    if (error.response && typeof error.response === 'object') {
      const respStatus = (error.response as { status?: number }).status
      if (respStatus === 401 || respStatus === 403) return true
    }
  }
  const anyErr = error as { status?: number; statusCode?: number; message?: string } | null
  if (anyErr) {
    if (anyErr.status === 401 || anyErr.status === 403) return true
    if (anyErr.statusCode === 401 || anyErr.statusCode === 403) return true
  }
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const texto = String(msg || '').toLowerCase()
  return (
    texto.includes('token is expired') ||
    texto.includes('token invalid') ||
    texto.includes('failed to authenticate') ||
    texto.includes('the request requires valid authentication') ||
    texto.includes('authentication is required') ||
    texto.includes('sessão expirada') ||
    texto.includes('login expirou') ||
    texto.includes('sessao expirada')
  )
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
