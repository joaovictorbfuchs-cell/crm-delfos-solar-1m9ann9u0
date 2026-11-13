// ⚠️ WRAPPER: cliente único do PocketBase, reexportado — nunca reescrever.
import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb
export { pb }
// Reexports canônicos (wrapper — nunca reescrever; implementação em errors_impl.ts)
export {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
} from './errors_impl'
export type { FieldErrors } from './errors_impl'
