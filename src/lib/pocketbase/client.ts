import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

import { isAuthSessionError } from './errors'

export { pb, isAuthSessionError }
export default pb
