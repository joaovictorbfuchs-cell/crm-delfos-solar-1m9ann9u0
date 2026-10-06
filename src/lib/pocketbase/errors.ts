import { ClientResponseError } from 'pocketbase'

export function getErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.response?.message) {
      return error.response.message
    }
    if (typeof error.data === 'object' && error.data !== null) {
      const firstKey = Object.keys(error.data)[0]
      if (firstKey && error.data[firstKey]?.message) {
        return `${firstKey}: ${error.data[firstKey].message}`
      }
    }
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Ocorreu um erro inesperado'
}

export function extractFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (error instanceof ClientResponseError && error.data && typeof error.data === 'object') {
    Object.entries(error.data).forEach(([key, val]) => {
      if (val && typeof val === 'object' && 'message' in val) {
        result[key] = String((val as any).message)
      } else if (typeof val === 'string') {
        result[key] = val
      }
    })
  }
  return result
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  const err = error as any
  if (
    err.status === 401 ||
    err.status === 403 ||
    err.statusCode === 401 ||
    err.statusCode === 403
  ) {
    return true
  }
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  if (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('failed to authenticate') ||
    msg.includes('the request requires valid user authorization')
  ) {
    return true
  }
  return false
}
