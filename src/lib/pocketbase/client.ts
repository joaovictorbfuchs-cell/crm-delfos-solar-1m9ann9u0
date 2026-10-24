import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { pb }
export {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
} from './errors'
export type { FieldErrors } from './errors'

export default pb
