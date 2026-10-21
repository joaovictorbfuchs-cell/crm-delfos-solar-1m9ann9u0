import PocketBase from 'pocketbase'
import { isAuthSessionError, isAbortError, formatPbError } from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { pb, isAuthSessionError, isAbortError, formatPbError }
export default pb
