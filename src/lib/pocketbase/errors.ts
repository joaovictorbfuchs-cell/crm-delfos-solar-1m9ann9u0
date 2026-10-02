export interface PocketBaseErrorResponse {
  code: number
  message: string
  data: Record<string, { code: string; message: string }>
}

export const isAuthSessionError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const err = error as { status?: number; code?: number; response?: { code?: number } }
  return err.status === 401 || err.code === 401 || err.response?.code === 401
}

export const isPocketBaseError = (error: unknown): error is PocketBaseErrorResponse => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as Record<string, unknown>).code === 'number' &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

export const getErrorMessage = (
  error: unknown,
  fallback = 'Ocorreu um erro inesperado',
): string => {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (isPocketBaseError(error)) return error.message
  return fallback
}

export const extractFieldErrors = (error: unknown): Record<string, string> => {
  if (!error || typeof error !== 'object') return {}
  const err = error as { data?: { data?: Record<string, { message?: string }> } }
  const fields = err.data?.data
  if (!fields || typeof fields !== 'object') return {}

  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (
      value &&
      typeof value === 'object' &&
      'message' in value &&
      typeof value.message === 'string'
    ) {
      result[key] = value.message
    } else if (typeof value === 'string') {
      result[key] = value
    }
  }
  return result
}
