export class PocketBaseError extends Error {
  status: number
  data: any

  constructor(message: string, status = 500, data: any = null) {
    super(message)
    this.name = 'PocketBaseError'
    this.status = status
    this.data = data
  }
}

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  const anyErr = err as any
  const status = Number(anyErr?.status || anyErr?.response?.status || anyErr?.statusCode)
  if (status === 401 || status === 403) return true
  const msg = String(anyErr?.message || anyErr?.response?.message || '').toLowerCase()
  return (
    msg.includes('failed to authenticate') ||
    msg.includes('token is expired') ||
    msg.includes('token is invalid') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden')
  )
}

export function handlePocketBaseError(error: any): string {
  if (error?.response?.message) {
    return error.response.message
  }
  if (error?.message) {
    return error.message
  }
  return 'Ocorreu um erro inesperado na comunicação com o servidor.'
}

export function getErrorMessage(error: any, fallback = 'Ocorreu um erro inesperado'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error.response?.data?.message) return error.response.data.message
  if (error.response?.message) return error.response.message
  if (error.data?.message) return error.data.message
  if (error.message) return error.message
  return fallback
}

export function extractFieldErrors(error: any): Record<string, string> {
  const result: Record<string, string> = {}
  if (!error) return result
  const data = error.response?.data?.data || error.data?.data || error.response?.data || error.data
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
