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

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
    const msg = (err.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('invalid token') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }

  if (typeof err === 'object') {
    const record = err as Record<string, unknown>
    const status = record.status ?? record.statusCode ?? record.code
    if (status === 401 || status === 403 || status === '401' || status === '403') {
      return true
    }

    const message = typeof record.message === 'string' ? record.message.toLowerCase() : ''
    if (
      message.includes('token is expired') ||
      message.includes('token expired') ||
      message.includes('failed to authenticate') ||
      message.includes('invalid token') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('sessão expirada') ||
      message.includes('sessao expirada')
    ) {
      return true
    }
  }

  if (typeof err === 'string') {
    const lower = err.toLowerCase()
    if (
      lower.includes('token is expired') ||
      lower.includes('token expired') ||
      lower.includes('failed to authenticate') ||
      lower.includes('sessão expirada') ||
      lower.includes('sessao expirada') ||
      lower.includes('401') ||
      lower.includes('403')
    ) {
      return true
    }
  }

  return false
}
