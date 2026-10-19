// Barrel canônico para o SDK PocketBase e utilitários de erro do Delfos
// Centraliza exports para evitar quebras por importação relativa concorrente

import pbDefault, { pb } from './client'
export default pbDefault
export { pb }
export {
  isAuthSessionError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
  isAbortError,
  type FieldErrors,
} from './errors'
export type { ClientResponseError } from 'pocketbase'
