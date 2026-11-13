// ⚠️ ARQUIVO-CÁPSULA: nunca reescrever este arquivo inteiro.
// ÚNICA implementação real de todos os helpers de erro do PocketBase.
// Qualquer alteração de semântica deve ser feita AQUI — os wrappers
// src/lib/pocketbase/errors.ts e src/lib/pocketbase/client.ts apenas reexportam.

import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Erro de sessão de autenticação: cobre status 401/403 (direto, statusCode ou response.status)
 * e mensagens de token expirado/inválido (PT e EN). Preservar semântica EXATA — é dependência
 * de AuthContext, ClientesContext, calendários, execução de OS e relatórios públicos.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'string') {
    const s = error.toLowerCase()
    return (
      s.includes('token is expired') ||
      s.includes('token expirado') ||
      s.includes('failed to authenticate') ||
      s.includes('sessão expirada') ||
      s.includes('login expirou') ||
      s.includes('auto refresh') ||
      s.includes('the request requires a valid')
    )
  }
  if (typeof error === 'object') {
    const err = error as {
      status?: unknown
      statusCode?: unknown
      response?: { status?: unknown }
      message?: unknown
      name?: unknown
    }
    const status = err.status
    const statusCode = err.statusCode
    const responseStatus = err.response?.status
    const isAuthStatus =
      status === 401 ||
      status === 403 ||
      statusCode === 401 ||
      statusCode === 403 ||
      responseStatus === 401 ||
      responseStatus === 403
    if (isAuthStatus) return true
    const msg = typeof err.message === 'string' ? err.message : ''
    const name = typeof err.name === 'string' ? err.name : ''
    const combined = `${msg} ${name}`.toLowerCase()
    return (
      combined.includes('token is expired') ||
      combined.includes('token expirado') ||
      combined.includes('failed to authenticate') ||
      combined.includes('sessão expirada') ||
      combined.includes('login expirou') ||
      combined.includes('auto refresh') ||
      combined.includes('the request requires a valid')
    )
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { isAbort?: unknown; name?: unknown }
  return err.isAbort === true || err.name === 'AbortError'
}

export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const msgs = Object.values(extractFieldErrors(error))
    if (msgs.length > 0) return msgs.join(' ')
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Erro inesperado. Tente novamente.'
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
