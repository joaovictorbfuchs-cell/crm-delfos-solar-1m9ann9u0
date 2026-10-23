import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, any>
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.response?.status === 401 || errObj.response?.status === 403) return true
    const msg = String(errObj.message || '')
    if (
      msg.includes('Token is expired or invalid') ||
      msg.includes('Failed to authenticate') ||
      msg.toLowerCase().includes('sessão expirada') ||
      msg.toLowerCase().includes('login expirou')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, any>
    if (errObj.isAbort === true) return true
    if (errObj.name === 'AbortError') return true
    const msg = String(errObj.message || '')
    if (msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('autocancelled')) {
      return true
    }
  }
  return false
}

export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const fieldErrors = extractFieldErrors(error)
    const msgs = Object.values(fieldErrors)
    if (msgs.length > 0) return msgs.join(', ')
    return error.message || 'Erro de comunicação com o servidor'
  }
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'Erro desconhecido'
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
