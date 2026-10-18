// Barrel canônico para o SDK PocketBase e utilitários de erro do Delfos
// Centraliza exports para evitar quebras por importação relativa concorrente

export { default as pb, pb } from './client'
export {
  isAuthSessionError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
  isAbortError,
} from './errors'
export type { ClientResponseError } from 'pocketbase'
