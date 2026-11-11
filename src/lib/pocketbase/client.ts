// Implementação CANÔNICA do client PocketBase — nunca reescrever sem manter
// as exports `pb` (default e named) e `isAuthSessionError` (reexportada de
// ./errors). Regressão recorrente do projeto: exportsGuard.test.ts falha se
// alguma delas sumir.
import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb
export { pb }
export { isAuthSessionError }
