import PocketBase from 'pocketbase'
import {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
} from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Canonical exports (regressão recorrente — ver memory): o client reexporta
// pb (named + default) e os helpers de erro de './errors'.
export { pb, isAuthSessionError, isAbortError, formatPbError, extractFieldErrors, getErrorMessage }
export default pb
