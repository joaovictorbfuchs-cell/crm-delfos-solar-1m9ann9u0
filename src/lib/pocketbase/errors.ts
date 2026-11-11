import type { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Detecta erros de sessão de autenticação (401/403, token expirado).
 * Implementação canônica — não reimplementar nos consumidores; reexportar daqui.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    if (typeof error === 'string') {
      const t = error.toLowerCase()
      return (
        t.includes('token is expired') ||
        t.includes('failed to authenticate') ||
        t.includes('sessão expirada') ||
        t.includes('login expirou')
      )
    }
    return false
  }

  const err = error as Record<string, unknown>

  // PocketBase ClientResponseError: { status, response: { status, ... }, ... }
  const status =
    (typeof err.status === 'number' ? err.status : undefined) ??
    (typeof err.statusCode === 'number' ? err.statusCode : undefined) ??
    (err.response && typeof err.response === 'object'
      ? (err.response as Record<string, unknown>).status
      : undefined)

  if (status === 401 || status === 403) return true

  const messageParts: string[] = []
  if (typeof err.message === 'string') messageParts.push(err.message)
  if (err.response && typeof err.response === 'object') {
    const respMsg = (err.response as Record<string, unknown>).message
    if (typeof respMsg === 'string') messageParts.push(respMsg)
  }
  if (error instanceof Error) messageParts.push(error.message)

  const text = messageParts.join(' ').toLowerCase()
  return (
    text.includes('token is expired') ||
    text.includes('failed to authenticate') ||
    text.includes('sessão expirada') ||
    text.includes('login expirou') ||
    text.includes('the request requires valid authentication token')
  )
}

/**
 * Detecta erros de requisição abortada (auto-cancellation do SDK, AbortError).
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  if (
    err.originalError &&
    typeof err.originalError === 'object' &&
    (err.originalError as Record<string, unknown>).name === 'AbortError'
  ) {
    return true
  }
  return (
    err.url === 'aborted' ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('aborted'))
  )
}

/**
 * Formata um erro do PocketBase em mensagem legível (em pt-BR quando possível).
 */
export function formatPbError(error: unknown): string {
  if (isAuthSessionError(error)) {
    return 'Sessão expirada. Faça login novamente.'
  }
  if (isAbortError(error)) {
    return 'Requisição cancelada.'
  }
  if (error instanceof Error || (error && typeof error === 'object' && 'message' in error)) {
    const fieldErrors = extractFieldErrors(error)
    const detail = Object.values(fieldErrors).join(' ')
    const base = getErrorMessage(error)
    return detail ? `${base} ${detail}`.trim() : base
  }
  return 'Ocorreu um erro inesperado.'
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== 'object') return {}
  const response = (error as { response?: unknown }).response
  if (!response || typeof response !== 'object') return {}
  const data = (response as { data?: unknown }).data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data as Record<string, unknown>)) {
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
  if (!error) return 'Ocorreu um erro inesperado.'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message
    if (typeof msg === 'string' && msg) return msg
  }
  const fieldErrors = extractFieldErrors(error)
  const msgs = Object.values(fieldErrors)
  if (msgs.length > 0) return msgs.join(' ')
  if (typeof ClientResponseErrorKludge(error) === 'string') {
    return ClientResponseErrorKludge(error) as string
  }
  return 'Ocorreu um erro inesperado.'
}

// Evita import runtime do SDK apenas para instanceof em ambientes sem bundler
function ClientResponseErrorKludge(error: unknown): unknown {
  const ctor = (error as { constructor?: { name?: string } })?.constructor
  if (ctor?.name === 'ClientResponseError') {
    const msg = (error as { message?: unknown }).message
    if (typeof msg === 'string') return msg
  }
  return undefined
}
