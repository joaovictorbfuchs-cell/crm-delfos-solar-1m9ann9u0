import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Export canônico do projeto (NÃO REMOVER): pb é reexportado como named e default,
// e isAuthSessionError é reexportado de './errors' — regression-guarded por exportsGuard.test.ts.
import { isAuthSessionError } from './errors'
export { pb, isAuthSessionError }
export default pb
