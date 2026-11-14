import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb

// Reexports nomeados canônicos — restauração por ACRÉSCIMO (18ª regressão de exports).
export { pb }
export { isAuthSessionError } from './errors_impl'
