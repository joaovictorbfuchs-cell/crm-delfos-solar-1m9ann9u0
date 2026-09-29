import { ClientResponseError } from 'pocketbase'

/**
 * Verifica se um erro retornado pelo PocketBase indica sessão expirada, token inválido ou ausente.
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  if (err instanceof ClientResponseError) {
    return err.status === 401 || err.status === 403
  }

  const errObj = err as { status?: number; response?: { code?: number; message?: string } }
  if (errObj.status === 401 || errObj.status === 403) {
    return true
  }

  const msg = String((err as any)?.message || '').toLowerCase()
  return (
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('the request requires valid user authorization') ||
    msg.includes('failed to authenticate')
  )
}

/**
 * Retorna mensagem legível para o usuário a partir de um erro do PocketBase ou genérico.
 */
export function getErrorMessage(err: unknown, defaultMessage = 'Ocorreu um erro inesperado'): string {
  if (!err) return defaultMessage
  if (err instanceof ClientResponseError) {
    if (err.data?.message) return err.data.message
    if (err.message) return err.message
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as any).message)
  }
  if (typeof err === 'string') return err
  return defaultMessage
}

/**
 * Extrai erros de validação campo a campo do PocketBase.
 */
export function extractFieldErrors(err: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (err instanceof ClientResponseError && err.data?.data) {
    for (const [key, val] of Object.entries(err.data.data)) {
      if (typeof val === 'object' && val !== null && 'message' in val) {
        result[key] = String((val as any).message)
      } else if (typeof val === 'string') {
        result[key] = val
      }
    }
  }
  return result
}

export default isAuthSessionError
