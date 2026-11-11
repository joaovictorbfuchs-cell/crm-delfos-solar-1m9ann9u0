import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Reexporta para compatibilidade: módulos antigos importam isAuthSessionError daqui
export { isAuthSessionError }

export default pb
