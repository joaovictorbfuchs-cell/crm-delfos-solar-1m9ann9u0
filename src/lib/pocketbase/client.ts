// ⚠️ ARQUIVO CRÍTICO — instância canônica do PocketBase (Delfos Solar)
// REGRA PERMANENTE: client.ts deve SEMPRE exportar `pb` tanto como default
// quanto como named, e reexportar `isAuthSessionError` de './errors'.
// Se esses exports sumirem, o barrel index.ts (que importa `{ pb }` daqui)
// quebra em runtime e várias rotas caem em ErrorBoundary.
import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export { pb, isAuthSessionError }
export default pb
