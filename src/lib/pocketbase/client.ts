import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

const url = (import.meta as any).env?.VITE_POCKETBASE_URL || '/'
export const pb = new PocketBase(url)

export { isAuthSessionError }
export default pb
