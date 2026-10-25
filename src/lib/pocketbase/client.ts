import PocketBase from 'pocketbase'
import {
  isAuthSessionError,
  isAbortError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
  type FieldErrors,
} from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export {
  pb,
  isAuthSessionError,
  isAbortError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
  type FieldErrors,
}
export default pb
