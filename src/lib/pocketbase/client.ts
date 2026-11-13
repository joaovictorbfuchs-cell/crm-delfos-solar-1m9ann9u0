import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb
export { pb }
export { isAuthSessionError, isAbortError, formatPbError } from './errors_impl'
// Reexports canônicos (restaurados por ACRÉSCIMO, v0.0.1696/14ª ocorrência).
// NUNCA reescrever este arquivo inteiro — se um export sumir, apenas acrescentar linhas.
