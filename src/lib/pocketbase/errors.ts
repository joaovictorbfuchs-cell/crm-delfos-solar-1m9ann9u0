import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

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

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof Error && error.name === 'AbortError') return true
  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      name?: unknown
      isAbort?: unknown
      originalError?: { name?: unknown }
    }
    if (errObj.name === 'AbortError' || errObj.isAbort === true) return true
    if (errObj.originalError && errObj.originalError.name === 'AbortError') return true
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // ClientResponseError do PocketBase
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
  }

  // Objeto genérico com status/statusCode HTTP
  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      status?: unknown
      statusCode?: unknown
      message?: unknown
      response?: { status?: unknown; statusCode?: unknown; message?: unknown }
      originalError?: { status?: unknown; statusCode?: unknown; message?: unknown }
    }

    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.statusCode === 401 || errObj.statusCode === 403) return true

    if (
      errObj.response &&
      (errObj.response.status === 401 ||
        errObj.response.status === 403 ||
        errObj.response.statusCode === 401 ||
        errObj.response.statusCode === 403)
    ) {
      return true
    }

    if (
      errObj.originalError &&
      (errObj.originalError.status === 401 ||
        errObj.originalError.status === 403 ||
        errObj.originalError.statusCode === 401 ||
        errObj.originalError.statusCode === 403)
    ) {
      return true
    }

    // Mensagens textuais canônicas de autenticação/sessão
    const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
    const respMsg =
      errObj.response && typeof errObj.response.message === 'string'
        ? errObj.response.message.toLowerCase()
        : ''

    const combinedMsg = `${msg} ${respMsg}`
    if (
      combinedMsg.includes('token is expired') ||
      combinedMsg.includes('token expired') ||
      combinedMsg.includes('failed to authenticate') ||
      combinedMsg.includes('sessão expirada') ||
      combinedMsg.includes('sessao expirada') ||
      combinedMsg.includes('login expirou') ||
      combinedMsg.includes('não autorizado') ||
      combinedMsg.includes('nao autorizado') ||
      combinedMsg.includes('unauthorized') ||
      combinedMsg.includes('the request requires valid record authorization token')
    ) {
      return true
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('não autorizado') ||
      msg.includes('nao autorizado') ||
      msg.includes('unauthorized') ||
      msg.includes('the request requires valid record authorization token')
    ) {
      return true
    }
  }

  return false
}

export default {
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
  isAbortError,
  isAuthSessionError,
}
