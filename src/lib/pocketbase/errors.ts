import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (error instanceof ClientResponseError && error.data?.data) {
    const raw = error.data.data as Record<string, { message?: string; code?: string }>
    return Object.fromEntries(
      Object.entries(raw).map(([field, detail]) => [field, detail?.message || 'Campo inválido']),
    )
  }
  return {}
}

export function formatPbError(error: unknown, fallback = 'Erro desconhecido.'): string {
  if (error instanceof ClientResponseError) {
    const fieldErrors = extractFieldErrors(error)
    const fieldMessages = Object.entries(fieldErrors).map(([f, m]) => `${f}: ${m}`)
    if (fieldMessages.length > 0) return fieldMessages.join(', ')
    return error.data?.message || error.message || fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Erro ao processar requisição.',
): string {
  return formatPbError(error, fallback)
}

/**
 * Identifica erros de sessão/autenticação expirada ou inválida (status 401 ou 403).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  const anyErr = err as any
  const status = anyErr?.status ?? anyErr?.statusCode ?? anyErr?.response?.status

  if (status === 401 || status === 403) {
    return true
  }

  const message = String(anyErr?.message || anyErr?.response?.message || '').toLowerCase()
  if (
    message.includes('token is expired') ||
    message.includes('token expired') ||
    message.includes('failed to authenticate') ||
    message.includes('login expirou') ||
    message.includes('sessão expirada') ||
    message.includes('sessao expirada') ||
    message.includes('authentication required')
  ) {
    return true
  }

  return false
}

/**
 * Identifica requisições canceladas/abortadas (ex.: autocancel do PocketBase ou AbortController).
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  const anyErr = err as any
  return (
    Boolean(anyErr?.isAbort) ||
    anyErr?.name === 'AbortError' ||
    String(anyErr?.message || '')
      .toLowerCase()
      .includes('the request was aborted') ||
    String(anyErr?.message || '')
      .toLowerCase()
      .includes('autocancelled')
  )
}
