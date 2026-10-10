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

/**
 * Detecta se o erro retornado pelo PocketBase ou pela camada HTTP
 * indica falha de sessão, token expirado ou autenticação ausente/inválida (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Se for ClientResponseError do PocketBase ou objeto similar
  const errObj = error as Record<string, unknown>

  const status =
    typeof errObj.status === 'number'
      ? errObj.status
      : typeof errObj.statusCode === 'number'
        ? errObj.statusCode
        : typeof (errObj.response as Record<string, unknown> | undefined)?.status === 'number'
          ? ((errObj.response as Record<string, unknown>).status as number)
          : null

  if (status === 401 || status === 403) {
    return true
  }

  // Se for Response padrão do fetch
  if (typeof Response !== 'undefined' && error instanceof Response) {
    if (error.status === 401 || error.status === 403) return true
  }

  // Checagem de mensagens de erro típicas de autenticação/sessão
  const rawMsg =
    typeof errObj.message === 'string'
      ? errObj.message
      : typeof errObj.error === 'string'
        ? errObj.error
        : typeof (errObj.data as Record<string, unknown> | undefined)?.message === 'string'
          ? ((errObj.data as Record<string, unknown>).message as string)
          : ''

  if (rawMsg) {
    const normalized = rawMsg
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

    const authPatterns = [
      'token is expired',
      'token expired',
      'token invalid',
      'invalid token',
      'auth token invalid',
      'requires valid authentication',
      'authentication required',
      'unauthorized',
      'forbidden',
      'failed to authenticate',
      'sessao expirada',
      'sessao invalida',
      'autenticacao',
      'nao autenticado',
      'nao autorizado',
    ]

    for (const pattern of authPatterns) {
      if (normalized.includes(pattern)) {
        return true
      }
    }
  }

  return false
}
