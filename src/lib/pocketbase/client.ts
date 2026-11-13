// ⚠️ WRAPPER ESTÁVEL — NÃO REESCREVER INTEIRO (12ª regressão de exports registrada).
// Instância única do SDK PocketBase no projeto: TODA a app importa daqui.
// O default E o named `pb` são obrigatórios — importadores usam os dois estilos.
// isAuthSessionError também é export daqui por contrato (ver exportsTripwire.ts).
import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors_impl'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)
export { pb, isAuthSessionError }
export default pb
