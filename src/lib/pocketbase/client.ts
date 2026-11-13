import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb
export { pb }
// Reexports obrigatórios de errors_impl.ts (tripwire: exportsTripwire.ts) — regressão de exports já ocorreu 15x.
export {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
} from './errors_impl'
export type { FieldErrors } from './errors_impl'
