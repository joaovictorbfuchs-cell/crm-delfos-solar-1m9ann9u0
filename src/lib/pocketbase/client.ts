import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Reexport canônico: isAuthSessionError também deve existir em client.ts (guarda de exports)
export { isAuthSessionError }
export default pb
export { pb }
