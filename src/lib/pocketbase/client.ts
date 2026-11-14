import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb

// Reexports canônicos (wrapper — restauração 18ª regressão, por acréscimo de linhas)
export { pb }
export { isAuthSessionError } from './errors'
