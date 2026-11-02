import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { isAuthSessionError }
export default pb
