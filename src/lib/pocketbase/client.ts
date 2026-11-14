import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb

// ⚠️ Wrapper de reexport (regressão de exports, 18ª ocorrência — restaurada
// por ACRÉSCIMO de linhas): a implementação canônica vive em errors_impl.ts.
export { isAuthSessionError, isAbortError, formatPbError } from './errors_impl'
export type { FieldErrors } from './errors_impl'
export { pb as pbNamed }
const pbInstance = pb
export { pbInstance as pb }
