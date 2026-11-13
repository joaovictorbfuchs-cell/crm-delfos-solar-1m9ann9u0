// ⚠️ WRAPPER DE REEXPORT: única implementação vive em errors_impl.ts.
// Restaurar SEMPRE por acréscimo de linhas de reexport — nunca reescrever.
export {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
} from './errors_impl'
export type { FieldErrors } from './errors_impl'
