/**
 * Helpers para identificação de erros de autenticação / sessão do PocketBase
 */

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as Record<string, any>
    if (err.status === 401 || err.status === 403) return true
    if (err.response?.status === 401 || err.response?.status === 403) return true
    const message = (err.message || err.originalError?.message || '').toLowerCase()
    if (
      message.includes('authenticate') ||
      message.includes('auth') ||
      message.includes('token') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('failed to authenticate')
    ) {
      return true
    }
  }
  return false
}

export default isAuthSessionError
