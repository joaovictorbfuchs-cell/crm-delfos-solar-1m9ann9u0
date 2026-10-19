import PocketBase from 'pocketbase'
import {
  extractFieldErrors,
  getErrorMessage,
  isAuthSessionError,
  isAbortError,
  formatPbError,
  type FieldErrors,
} from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { pb }
export default pb
export { extractFieldErrors, getErrorMessage, isAuthSessionError, isAbortError, formatPbError }
export type { FieldErrors }
