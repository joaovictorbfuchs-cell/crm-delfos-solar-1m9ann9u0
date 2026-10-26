// Arquivo de salvaguarda e compatibilidade: reexporta a instância do PocketBase
import pb, { isAuthSessionError } from './pocketbase/client'
export { pb, isAuthSessionError }
export default pb
