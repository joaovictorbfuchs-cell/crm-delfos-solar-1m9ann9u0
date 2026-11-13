import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb

// Wrapper de reexport: implementação real vive em errors_impl.ts (nunca duplicar lógica aqui).
export { pb }
export { isAuthSessionError, isAbortError, formatPbError } from './errors_impl'
