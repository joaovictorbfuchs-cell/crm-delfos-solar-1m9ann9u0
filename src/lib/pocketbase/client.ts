import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Salvaguarda contra regressão: pb e isAuthSessionError sempre nomeados + default
export { pb, isAuthSessionError }
export default pb
