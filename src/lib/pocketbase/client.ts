import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb
// ⚠️ NUNCA reescrever este arquivo inteiro (16ª regressão de exports): corrigir
// apenas ACRESCENDO linhas de reexport. O export named `pb` é obrigatório para
// importadores como src/contexts/ClientesContext.tsx e verificado pelo
// exportsTripwire (via main.tsx).
export { pb }
// Helpers canônicos vivem em errors_impl.ts; aqui são apenas reexportados.
export { isAuthSessionError, isAbortError, formatPbError } from './errors_impl'
