import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const candidate = err as {
      status?: unknown
      response?: { status?: unknown }
      message?: unknown
    }
    if (candidate.status === 401 || candidate.status === 403) return true
    if (candidate.response?.status === 401 || candidate.response?.status === 403) return true
    if (typeof candidate.message === 'string') {
      const msg = candidate.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('login expirou') ||
        msg.includes('sessão expirada') ||
        msg.includes('failed to authenticate')
      ) {
        return true
      }
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const candidate = err as { isAbort?: unknown; name?: unknown; message?: unknown }
  if (candidate.isAbort === true) return true
  if (candidate.name === 'AbortError') return true
  if (
    typeof candidate.message === 'string' &&
    candidate.message.includes('The request was aborted')
  ) {
    return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  if (!error) return 'Erro desconhecido'
  if (error instanceof ClientResponseError) {
    const details = Object.values(extractFieldErrors(error))
    if (details.length > 0) return details.join(', ')
    return error.message || 'Erro de comunicação com o servidor'
  }
  if (error instanceof Error) return error.message
  return String(error)
}

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
