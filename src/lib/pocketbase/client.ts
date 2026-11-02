import PocketBase, { ClientResponseError } from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.response && (errObj.response.status === 401 || errObj.response.status === 403))
      return true
    const msg = String(errObj.message || errObj.error || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('token is invalid') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate')
    ) {
      return true
    }
  }
  return false
}

export { pb }
export default pb
