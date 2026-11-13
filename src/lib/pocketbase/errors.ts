// ⚠️ WRAPPER ESTÁVEL — NÃO REESCREVER INTEIRO (12ª regressão de exports registrada).
// Implementação real: src/lib/pocketbase/errors_impl.ts (única cópia no projeto).
// Este arquivo só reexporta: se precisar mexer em alguma função, vá em errors_impl.ts.
export {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
  type FieldErrors,
} from './errors_impl'
