import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Exportação padrão e nomeada de pb (GARANTIA ESTRUTURAL CANÔNICA)
export default pb
export { pb }

// Reexportação dos utilitários de erro do PocketBase para imunizar consumidores que
// porventura importarem erros a partir de client.ts ou que tenham caminhos mistos
export {
  isAuthSessionError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
  isAbortError,
} from './errors'
