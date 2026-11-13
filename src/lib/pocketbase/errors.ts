import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * isAuthSessionError — trava permanente de export (v0.0.1682+).
 * Detecta sessão expirada/inválida: status 401/403 (direto, aninhado em response
 * ou statusCode legado) ou mensagens conhecidas de token expirado.
 * NUNCA remover deste arquivo: o barrel index.ts, client.ts e as salvaguardas
 * raiz (lib/client, lib/errors, services/errors) reexportam desta implementação.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // ClientResponseError (objeto ou instância) — status direto
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }

  const candidate = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    message?: unknown
  }

  // Status direto, statusCode legado ou aninhado em response
  if (candidate.status === 401 || candidate.status === 403) return true
  if (candidate.statusCode === 401 || candidate.statusCode === 403) return true
  if (candidate.response?.status === 401 || candidate.response?.status === 403) return true

  // Mensagens conhecidas de token/sessão expirada (pt-BR e en)
  if (typeof candidate.message === 'string') {
    const msg = candidate.message.toLowerCase()
    const tokensExpirados = [
      'token is expired',
      'token expired',
      'failed to authenticate',
      'the request requires valid',
      'sessão expirada',
      'sessao expirada',
      'login expirou',
      'não autenticado',
      'nao autenticado',
      'não autorizado',
      'nao autorizado',
    ]
    if (tokensExpirados.some((t) => msg.includes(t))) return true
  }

  return false
}

/**
 * isAbortError — detecta erros de requisição abortada (auto-cancellation, timeouts).
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const candidate = error as { isAbort?: unknown; name?: unknown; message?: unknown }
  if (candidate.isAbort === true) return true
  if (candidate.name === 'AbortError') return true
  if (
    typeof candidate.message === 'string' &&
    candidate.message.toLowerCase().includes('request was aborted')
  ) {
    return true
  }
  return false
}

/**
 * formatPbError — formata um erro PocketBase em mensagem legível para o usuário.
 */
export function formatPbError(error: unknown): string {
  if (isAbortError(error)) {
    return 'A requisição foi cancelada. Tente novamente.'
  }
  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou. Faça login novamente.'
  }
  if (error instanceof ClientResponseError) {
    const msgs = Object.values(extractFieldErrors(error))
    if (msgs.length > 0) return msgs.join(' ')
    if (error.response?.message) return error.response.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Ocorreu um erro inesperado. Tente novamente.'
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
