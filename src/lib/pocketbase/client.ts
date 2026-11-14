import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb

// ⚠️ Wrapper canônico (v0.0.1706): reexports obrigatórios — não remover.
export { pb }
export { isAuthSessionError, isAbortError, formatPbError } from './errors_impl'
