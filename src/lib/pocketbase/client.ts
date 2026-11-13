import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb

// Named export canônico + reexport de erro (wrapper; NUNCA remover).
export { pb }
export { isAuthSessionError, isAbortError, formatPbError } from './errors_impl'
export type { FieldErrors } from './errors_impl'
