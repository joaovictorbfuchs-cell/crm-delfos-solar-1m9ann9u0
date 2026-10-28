import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { pb }
export {
  isAuthSessionError,
  formatPbError,
  isAbortError,
  extractFieldErrors,
  getErrorMessage,
  type FieldErrors,
} from './errors'

export default pb
