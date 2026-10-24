import PocketBase, { ClientResponseError } from 'pocketbase'
export * from './errors'
export { ClientResponseError }

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
export { pb }
export default pb
