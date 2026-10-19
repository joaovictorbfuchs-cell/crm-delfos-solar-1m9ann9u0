import PocketBase from 'pocketbase'
import {
  isAuthSessionError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
  isAbortError,
} from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { pb, isAuthSessionError, extractFieldErrors, getErrorMessage, formatPbError, isAbortError }
export default pb
