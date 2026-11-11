import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

// Instância única do SDK PocketBase
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb
export { pb, isAuthSessionError }
