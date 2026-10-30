// Salvaguarda de compatibilidade: reexporta cliente PocketBase e helpers
import pbDefault, { pb } from '@/lib/pocketbase/client'
import { isAuthSessionError } from '@/lib/pocketbase/errors'

export default pbDefault
export { pb, isAuthSessionError }
