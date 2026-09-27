// PocketBase error helpers

export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { status?: number; response?: { message?: string } }
  return err.status === 401 || err.status === 403
}

export function isAuthSessionError(error: unknown): boolean {
  return isAuthError(error)
}

export function getPocketBaseErrorMessage(
  error: unknown,
  fallback = 'Ocorreu um erro inesperado',
): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  ) {
    return (error as Record<string, unknown>).message as string
  }
  return fallback
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  return getPocketBaseErrorMessage(error, fallback)
}

export function extractFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!error || typeof error !== 'object') return result

  const pbErr = error as {
    data?: { data?: Record<string, { message?: string }> }
    response?: { data?: Record<string, { message?: string }> }
  }

  const data = pbErr.data?.data || pbErr.response?.data
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([key, val]) => {
      if (val && typeof val === 'object' && 'message' in val && typeof val.message === 'string') {
        result[key] = val.message
      }
    })
  }

  return result
}
