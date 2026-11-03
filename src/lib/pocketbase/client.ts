import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Exports nomeadas canônicas — NÃO REMOVER (trava: src/lib/pocketbase/exportsGuard.test.ts).
// Regressão já ocorrida 6 vezes: rodadas que reescrevem este arquivo perdem `pb`/`isAuthSessionError`
// e o build quebra em AuthContext.tsx e demais importadores.
export { pb, isAuthSessionError }
export default pb
