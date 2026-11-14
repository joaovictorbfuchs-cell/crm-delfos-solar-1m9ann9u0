import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb
// Reexports canônicos (wrapper — não remover)
export { pb }
export { isAuthSessionError } from './errors_impl'
