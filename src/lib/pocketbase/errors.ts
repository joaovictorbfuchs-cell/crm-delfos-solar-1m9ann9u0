import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError) {
    return err.status === 401 || err.status === 403
  }
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status?: number }).status
    return status === 401 || status === 403
  }
  const str = String(err).toLowerCase()
  return (
    str.includes('401') ||
    str.includes('403') ||
    str.includes('failed to authenticate') ||
    str.includes('token expired') ||
    str.includes('sessão expirada')
  )
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError) {
    return err.isAbort === true
  }
  if (typeof err === 'object' && err !== null && 'isAbort' in err) {
    return Boolean((err as { isAbort?: boolean }).isAbort)
  }
  const str = String(err).toLowerCase()
  return str.includes('autocancelled') || str.includes('abort')
}

export function formatPbError(err: unknown): string {
  if (err instanceof ClientResponseError) {
    return err.message || `Erro ${err.status}`
  }
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}

export function extractFieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ClientResponseError && err.data?.data) {
    const res: Record<string, string> = {}
    for (const [k, v] of Object.entries(err.data.data)) {
      if (typeof v === 'object' && v !== null && 'message' in v) {
        res[k] = String((v as { message?: string }).message)
      } else {
        res[k] = String(v)
      }
    }
    return res
  }
  return {}
}

export function getErrorMessage(err: unknown): string {
  return formatPbError(err)
}
