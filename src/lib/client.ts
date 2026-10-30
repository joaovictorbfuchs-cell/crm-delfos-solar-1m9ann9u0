// Arquivo de salvaguarda e compatibilidade: reexporta a instância do PocketBase
import pb from './pocketbase/client'
import { isAuthSessionError } from './pocketbase/errors'
export { pb, isAuthSessionError }
export default pb
