import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb

// Exportação nomeada adicional — regra permanente do projeto: exportação dupla (default + nomeada)
export { pb }
