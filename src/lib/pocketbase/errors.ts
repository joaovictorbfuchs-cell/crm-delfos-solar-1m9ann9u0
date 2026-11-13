import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

const AUTH_STATUS_CODES = [401, 403]

const AUTH_ERROR_PATTERNS = [
  'token is expired',
  'authtoken',
  'sessão expirada',
  'sessao expirada',
  'login expirou',
  'failed to authenticate',
  'authentication failed',
  'auth/session',
]

function matchesAuthText(text: string): boolean {
  const normalized = text.toLowerCase()
  return AUTH_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))
}

function isRecordWithStatus(error: unknown): error is { status?: unknown } {
  return typeof error === 'object' && error !== null && 'status' in error
}

/**
 * Detecta erros de sessão de autenticação (401/403, token expirado, sessão expirada).
 * Função canônica do projeto — NÃO REMOVER: reexportada por client.ts, lib/errors,
 * services/errors e consumida por dezenas de componentes (regressão recorrente).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  if (error instanceof Error) {
    return matchesAuthText(error.message || '')
  }

  const asRecord = error as { status?: unknown; statusCode?: unknown }
  if (typeof asRecord.status === 'number' && AUTH_STATUS_CODES.includes(asRecord.status))
    return true
  if (typeof asRecord.statusCode === 'number' && AUTH_STATUS_CODES.includes(asRecord.statusCode)) {
    return true
  }

  const asResponse = error as { response?: { status?: unknown } }
  const responseStatus = asResponse?.response?.status
  if (typeof responseStatus === 'number' && AUTH_STATUS_CODES.includes(responseStatus)) {
    return true
  }

  const message =
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : ''
  return message !== '' && matchesAuthText(message)
}

/** Detecta erros de cancelamento/abort (auto-cancellation do PocketBase, AbortError). */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ((error as { isAbort?: unknown }).isAbort === true) return true
  return (error as { name?: unknown }).name === 'AbortError'
}

/** Formata qualquer erro em uma mensagem legível em português, para exibição ao usuário. */
export function formatPbError(error: unknown): string {
  if (isAbortError(error)) return 'Operação cancelada.'
  if (error instanceof ClientResponseError) {
    const msgs = Object.values(extractFieldErrors(error))
    if (msgs.length > 0) return msgs.join(' ')
    if (error.response?.message) return error.response.message
    return error.message || 'Erro inesperado.'
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string' && error.trim() !== '') return error
  return 'Erro inesperado.'
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
