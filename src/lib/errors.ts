// Arquivo de salvaguarda de compatibilidade: reexporta do módulo canônico src/lib/pocketbase/errors
export * from './pocketbase/errors'
export {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
  type FieldErrors,
} from './pocketbase/errors'
import * as errorsModule from './pocketbase/errors'
export default errorsModule
