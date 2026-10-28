import PocketBase from 'pocketbase'
import {
  isAuthSessionError,
  formatPbError,
  isAbortError,
  extractFieldErrors,
  getErrorMessage,
  type FieldErrors,
} from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export {
  pb,
  isAuthSessionError,
  formatPbError,
  isAbortError,
  extractFieldErrors,
  getErrorMessage,
  type FieldErrors,
}
export default pb
