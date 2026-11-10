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

// Identifica erros de requisição abortada (fetch cancelado / AbortError),
// para não exibi-los como erro real na UI.
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    if (typeof error === 'string') {
      const s = error.toLowerCase()
      return s.includes('abort') || s.includes('aborted')
    }
    return false
  }
  const anyErr = error as any
  return (
    anyErr.isAbort === true ||
    anyErr.name === 'AbortError' ||
    (typeof anyErr.message === 'string' && anyErr.message.toLowerCase().includes('abort'))
  )
}

// Formata um erro do PocketBase em uma mensagem legível para a UI,
// agregando os erros por campo quando existirem.
export function formatPbError(error: unknown): string {
  if (isAuthSessionError(error)) return 'Sua sessão expirou. Faça login novamente.'
  if (isAbortError(error)) return 'Requisição cancelada.'
  const fieldErrors = extractFieldErrors(error)
  const fieldMsgs = Object.entries(fieldErrors).map(([field, msg]) => `${field}: ${msg}`)
  if (fieldMsgs.length > 0) return fieldMsgs.join(' · ')
  return getErrorMessage(error)
}

// Identifica erros de sessão de autenticação expirada (401/403/token expirado)
// para que a UI ofereça novo login em vez de exibir erro genérico.
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    if (typeof error === 'string') {
      const s = error.toLowerCase()
      return (
        s.includes('token is expired') ||
        s.includes('sessão expirada') ||
        s.includes('login expirou') ||
        s.includes('failed to authenticate') ||
        s.includes('autenticação falhou')
      )
    }
    return false
  }
  const anyErr = error as any
  const status = anyErr.status ?? anyErr.statusCode ?? anyErr?.response?.status
  if (status === 401 || status === 403) return true

  const msgs: string[] = []
  if (typeof anyErr.message === 'string') msgs.push(anyErr.message)
  if (typeof anyErr.response?.message === 'string') msgs.push(anyErr.response.message)
  const joined = msgs.join(' ').toLowerCase()
  return (
    joined.includes('token is expired') ||
    joined.includes('sessão expirada') ||
    joined.includes('login expirou') ||
    joined.includes('failed to authenticate') ||
    joined.includes('autenticação falhou')
  )
}
