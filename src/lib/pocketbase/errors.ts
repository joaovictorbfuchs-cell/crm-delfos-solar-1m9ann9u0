import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro recebido é de sessão expirada, token inválido ou não autorizado (401 / 403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    if (error.response?.status === 401 || error.response?.status === 403) return true
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      status?: unknown
      statusCode?: unknown
      code?: unknown
      response?: { status?: unknown }
      message?: unknown
    }

    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.statusCode === 401 || errObj.statusCode === 403) return true
    if (errObj.code === 401 || errObj.code === 403) return true
    if (errObj.response?.status === 401 || errObj.response?.status === 403) return true

    if (typeof errObj.message === 'string') {
      const msg = errObj.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('token expired') ||
        msg.includes('sessão expirada') ||
        msg.includes('sessao expirada') ||
        msg.includes('login expirou') ||
        msg.includes('failed to authenticate') ||
        msg.includes('the request requires valid user authorization') ||
        msg.includes('the request requires valid admin authorization')
      ) {
        return true
      }
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate') ||
      msg.includes('the request requires valid user authorization') ||
      msg.includes('the request requires valid admin authorization')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se um erro recebido foi causado por cancelamento de requisição ou timeout.
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof ClientResponseError) {
    if (error.isAbort) return true
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as { isAbort?: unknown; name?: unknown; message?: unknown }
    if (errObj.isAbort === true) return true
    if (errObj.name === 'AbortError') return true
    if (typeof errObj.message === 'string') {
      const msg = errObj.message.toLowerCase()
      if (msg.includes('autocancelled') || msg.includes('the request was aborted')) {
        return true
      }
    }
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') return true
    const msg = error.message.toLowerCase()
    if (msg.includes('autocancelled') || msg.includes('the request was aborted')) {
      return true
    }
  }

  return false
}

/**
 * Extrai erros de validação por campo a partir do objeto de erro do PocketBase.
 */
export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const resp = (error as { response?: { data?: unknown } }).response
      const data = resp?.data
      if (data && typeof data === 'object') {
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
    }
    return {}
  }

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

/**
 * Formata um erro do PocketBase para uma mensagem amigável em português.
 */
export function formatPbError(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (!error) return fallback

  if (isAbortError(error)) {
    return 'A requisição foi cancelada.'
  }

  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou. Faça login novamente.'
  }

  const fieldErrors = extractFieldErrors(error)
  const fieldMsgs = Object.entries(fieldErrors).map(([field, msg]) => `${field}: ${msg}`)
  if (fieldMsgs.length > 0) {
    return fieldMsgs.join('; ')
  }

  if (error instanceof ClientResponseError) {
    if (error.message) return error.message
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  if (typeof error === 'string') {
    return error
  }

  return fallback
}

/**
 * Obtém mensagem de erro textual a partir de qualquer erro lançado.
 */
export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (!error) return fallback
  return formatPbError(error, fallback)
}
