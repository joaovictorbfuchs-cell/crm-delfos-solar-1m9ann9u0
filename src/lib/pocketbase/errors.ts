import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  const status = (error as { status?: number })?.status
  if (status === 401 || status === 403) return true
  const message = String((error as { message?: string })?.message || '').toLowerCase()
  return (
    message.includes('token') ||
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('session expired')
  )
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (!error) return fallback
  if (error instanceof ClientResponseError) {
    if (error.response?.message) return error.response.message
    if (error.message) return error.message
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}

export function extractFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!error) return result
  if (error instanceof ClientResponseError && error.response?.data) {
    const data = error.response.data as Record<string, { message?: string; code?: string } | string>
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
