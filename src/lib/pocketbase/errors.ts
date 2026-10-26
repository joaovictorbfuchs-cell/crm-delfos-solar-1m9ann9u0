import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Detecta se um erro é originado por sessão inválida, token expirado ou
 * falta de permissão de autenticação (401/403) no PocketBase.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // PocketBase ClientResponseError ou objeto similar
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    if (error.response?.code === 401 || error.response?.code === 403) return true
    if (error.response?.code === 'auth_session') return true
  }

  // Duck typing para objetos com status / statusCode / response
  const anyErr = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown; code?: unknown }
    message?: unknown
    name?: unknown
    isAbort?: unknown
  }

  // Abort / Autocancelled não é erro de sessão expirada
  if (isAbortError(error)) return false

  if (anyErr.status === 401 || anyErr.status === 403) return true
  if (anyErr.statusCode === 401 || anyErr.statusCode === 403) return true
  if (anyErr.response?.status === 401 || anyErr.response?.status === 403) return true
  if (anyErr.response?.code === 401 || anyErr.response?.code === 403) return true
  if (anyErr.response?.code === 'auth_session') return true

  // Verificação de mensagens textuais conhecidas de sessão expirada/autenticação
  const msg = typeof anyErr.message === 'string' ? anyErr.message.toLowerCase() : ''
  if (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('login expirou') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('failed to authenticate') ||
    msg.includes('the request requires valid record authorization token') ||
    msg.includes('the request requires admin authorization token')
  ) {
    return true
  }

  return false
}

/**
 * Identifica erros de requisição cancelada (PocketBase auto-cancellation ou DOM AbortController)
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return Boolean(error.isAbort)
  }
  const anyErr = error as { isAbort?: unknown; name?: unknown; message?: unknown }
  if (anyErr.isAbort === true) return true
  if (anyErr.name === 'AbortError') return true
  if (typeof anyErr.message === 'string') {
    const m = anyErr.message.toLowerCase()
    return m.includes('the request was autocancelled') || m.includes('the request was aborted')
  }
  return false
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}

export function formatPbError(error: unknown, fallback = 'Erro na operação'): string {
  if (!error) return fallback
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}
