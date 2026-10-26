// Salvaguarda de compatibilidade: reexporta cliente PocketBase e helpers
import pbDefault, { pb, isAuthSessionError } from '@/lib/pocketbase/client'

export default pbDefault
export { pb, isAuthSessionError }
