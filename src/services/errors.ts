// Salvaguarda de compatibilidade: reexporta erros e helpers do PocketBase
export * from '@/lib/errors'
export {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
  type FieldErrors,
} from '@/lib/errors'
import * as errorsModule from '@/lib/errors'
export default errorsModule
