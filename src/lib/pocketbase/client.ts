// Client PocketBase — exports críticos travados por exportsGuard.test.ts (NÃO REMOVER).
import PocketBase from 'pocketbase'
import { isAuthSessionError } from './errors'

const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090')
pb.autoCancellation(false)

export default pb
export { pb, isAuthSessionError }
