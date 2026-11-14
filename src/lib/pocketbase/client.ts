import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb
// Reexports canônicos (restauração v0.0.1712 — wrapper client.ts; pb default + nomeado
// e isAuthSessionError, que vivem em errors_impl/index conforme tripwire).
export { pb }
export { isAuthSessionError } from './errors_impl'
