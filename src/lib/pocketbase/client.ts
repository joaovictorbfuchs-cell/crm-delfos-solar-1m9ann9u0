import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { pb }
export { isAuthSessionError }
export default pb
