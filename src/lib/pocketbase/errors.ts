import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  const err = error as { status?: number; response?: { code?: number }; message?: string }
  if (err.status === 401 || err.status === 403) return true
  if (err.response?.code === 401 || err.response?.code === 403) return true
  if (typeof err.message === 'string' && /auth|token|expired|401|403/i.test(err.message)) {
    return true
  }
  return false
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.response?.message) return error.response.message
    return error.message
  }
  if (error instanceof Error) return error.message
  return String(error)
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  if (!error) return fallback
  if (error instanceof ClientResponseError) {
    if (error.response?.message) return error.response.message
    return error.message || fallback
  }
  if (error instanceof Error) return error.message || fallback
  if (typeof error === 'string') return error
  return fallback
}

export function extractFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (error instanceof ClientResponseError && error.response?.data) {
    const data = error.response.data as Record<string, { message?: string } | string>
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'string') {
        result[key] = val
      } else if (val && typeof val === 'object' && val.message) {
        result[key] = val.message
      }
    }
  }
  return result
}

export default {
  isAuthSessionError,
  formatErrorMessage,
  getErrorMessage,
  extractFieldErrors,
}
