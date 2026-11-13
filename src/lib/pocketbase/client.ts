import PocketBase from 'pocketbase'
// isAuthSessionError reexportado como trava permanente (guard test exige identidade
// de referência com a implementação canônica em ./errors)
import { isAuthSessionError } from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { pb, isAuthSessionError }
export default pb
