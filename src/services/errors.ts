// Salvaguarda de compatibilidade: reexporta erros e helpers do PocketBase
export * from '@/lib/pocketbase/errors'
export {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
  type FieldErrors,
} from '@/lib/pocketbase/errors'
import * as errorsModule from '@/lib/pocketbase/errors'
export default errorsModule
