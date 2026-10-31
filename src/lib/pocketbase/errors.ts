export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Objeto com status HTTP
  const withStatus = error as { status?: number; response?: { status?: number } }
  if (withStatus.status === 401 || withStatus.status === 403) return true
  if (withStatus.response?.status === 401 || withStatus.response?.status === 403) return true

  // Mensagens típicas de erro de sessão / autenticação
  const message =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown }).message === 'string'
        ? String((error as { message?: unknown }).message)
        : ''

  if (!message) return false

  const normalized = message.toLowerCase()
  return (
    normalized.includes('token is expired') ||
    normalized.includes('invalid token') ||
    normalized.includes('token expired') ||
    normalized.includes('login expirou') ||
    normalized.includes('sessão expirada') ||
    normalized.includes('sessao expirada') ||
    normalized.includes('failed to authenticate') ||
    normalized.includes('authentication required') ||
    normalized.includes('unauthorized')
  )
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const err = error as { isAbort?: boolean; name?: string; message?: string }
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  if (typeof err.message === 'string' && err.message.toLowerCase().includes('aborted')) return true
  return false
}

export function formatPbError(error: unknown): string {
  if (!error) return 'Erro desconhecido'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  const err = error as { message?: string }
  return err.message || 'Erro inesperado no servidor'
}

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
