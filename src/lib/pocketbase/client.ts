import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { pb }
export default pb

// Reexportação dos utilitários de erro e tipos essenciais para compatibilidade total
export {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
  type FieldErrors,
} from './errors'
export type { ClientResponseError } from 'pocketbase'
