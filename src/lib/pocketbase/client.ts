import PocketBase from 'pocketbase'
import {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
} from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Dupla exportação (default e nomeada) para proteger contra variações de importação no projeto
export { pb }
export default pb

// Reexportação dos utilitários de erro do PocketBase para compatibilidade retroativa
export { isAuthSessionError, isAbortError, formatPbError, extractFieldErrors, getErrorMessage }
