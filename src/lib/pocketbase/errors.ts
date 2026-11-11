import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

// Implementação CANÔNICA — os consumidores importam daqui (ou das salvaguardas
// src/lib/errors / src/services/errors, que só reexportam). Nunca apagar estas
// exports: é regressão recorrente do projeto e o exportsGuard.test.ts falha.
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof Error) {
    const msg = (error.message || '').toLowerCase()
    return (
      msg.includes('token is expired') ||
      msg.includes('token is invalid') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('autenticação falhou') ||
      msg.includes('autenticacao falhou')
    )
  }
  if (typeof error === 'object') {
    const err = error as {
      status?: number
      statusCode?: number
      response?: { status?: number }
      message?: string
    }
    const status = err.status ?? err.statusCode ?? err.response?.status
    if (status === 401 || status === 403) return true
    const msg = (err.message || '').toLowerCase()
    return (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou')
    )
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { isAbort?: boolean; name?: string; message?: string }
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('aborted') || msg.includes('autocancelled')
}

export function formatPbError(error: unknown): string {
  if (isAuthSessionError(error)) {
    return 'Sessão expirada. Faça login novamente.'
  }
  if (isAbortError(error)) {
    return 'A requisição foi cancelada. Tente novamente.'
  }
  return getErrorMessage(error)
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
