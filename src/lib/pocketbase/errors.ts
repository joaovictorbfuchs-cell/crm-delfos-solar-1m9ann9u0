export interface PocketBaseError {
  status?: number
  message?: string
  data?: Record<string, unknown>
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  const err = error as any
  if (err.status === 401 || err.status === 403) return true
  const msg = String(err.message || '').toLowerCase()
  return (
    msg.includes('token') ||
    msg.includes('authenticate') ||
    msg.includes('authentication') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden')
  )
}

export function isAuthError(error: unknown): boolean {
  return isAuthSessionError(error)
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  const err = error as any
  if (err.message && typeof err.message === 'string') return err.message
  return fallback
}

export function extractFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!error) return result
  const err = error as any
  const data = err?.data?.data || err?.data
  if (data && typeof data === 'object') {
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'string') {
        result[key] = val
      } else if (val && typeof val === 'object' && 'message' in (val as any)) {
        result[key] = String((val as any).message)
      }
    }
  }
  return result
}
