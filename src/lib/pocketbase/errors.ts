export function getErrorMessage(error: any, fallback = 'Ocorreu um erro inesperado'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error.message) return error.message
  if (error.data?.message) return error.data.message
  return fallback
}

export function extractFieldErrors(error: any): Record<string, string> {
  const result: Record<string, string> = {}
  if (!error?.data?.data) return result
  for (const [key, val] of Object.entries(error.data.data)) {
    if (typeof val === 'string') {
      result[key] = val
    } else if (val && typeof val === 'object' && 'message' in (val as any)) {
      result[key] = (val as any).message
    }
  }
  return result
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  const err = error as { status?: number; response?: { message?: string } }
  if (err.status === 401 || err.status === 403) return true
  const msg = err.response?.message?.toLowerCase() || ''
  return msg.includes('token') || msg.includes('auth') || msg.includes('unauthorized')
}
