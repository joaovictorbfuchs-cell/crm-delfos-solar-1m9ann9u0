import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export function isAuthSessionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { status?: number; response?: { message?: string } }
  return anyErr.status === 401 || anyErr.status === 403
}

export { pb }
export default pb
