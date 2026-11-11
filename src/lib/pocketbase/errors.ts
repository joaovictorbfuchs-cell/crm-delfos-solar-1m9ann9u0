import { ClientResponseError } from 'pocketbase'

// REGRESSÃO CONHECIDA: este arquivo perdeu exports em rodadas que o reescrevem.
// Exports OBRIGATÓRIOS (travados por exportsGuard.test.ts e ServicosCampoBlindagem.test.ts):
// isAuthSessionError, isAbortError, formatPbError, extractFieldErrors, getErrorMessage, FieldErrors.

export type FieldErrors = Record<string, string>

const MENSAGENS_SESSAO_EXPIRADA = [
  'token is expired',
  'expired or invalid',
  'sessão expirada',
  'sessao expirada',
  'login expirou',
  'failed to authenticate',
  'autenticação falhou',
]

function extrairStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const e = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown; code?: unknown }
  }

  const candidatos: unknown[] = [e.status, e.statusCode, e.response?.status, e.response?.code]
  for (const c of candidatos) {
    if (typeof c === 'number' && Number.isFinite(c)) return c
    if (typeof c === 'string' && c.trim() !== '' && Number.isFinite(Number(c))) return Number(c)
  }
  return null
}

/**
 * Identifica erros de sessão de autenticação (401/403 ou mensagem de token expirado).
 * Aceita ClientResponseError, objetos com status/statusCode/response.status e Error com mensagens conhecidas.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  const status = extrairStatus(error)
  if (status === 401 || status === 403) return true
  if (
    status !== null &&
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 401 &&
    status !== 403
  ) {
    // Outros 4xx não são sessão expirada (404, 400...)
    const mensagem =
      error instanceof Error
        ? error.message
        : String((error as { message?: unknown }).message ?? '')
    return MENSAGENS_SESSAO_EXPIRADA.some((m) => mensagem.toLowerCase().includes(m))
  }

  const mensagem =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : ''

  if (!mensagem) return false
  return MENSAGENS_SESSAO_EXPIRADA.some((m) => mensagem.toLowerCase().includes(m))
}

/** Identifica erros de requisição abortada (auto cancellation do SDK ou AbortError do fetch). */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { isAbort?: unknown; name?: unknown }
  if (e.isAbort === true) return true
  if (e.name === 'AbortError') return true
  if (typeof (error as { message?: unknown }).message === 'string') {
    const msg = (error as { message: string }).message.toLowerCase()
    if (msg.includes('request was aborted') || msg.includes('autocancelled')) return false
  }
  return false
}

/** Formata um erro do SDK PocketBase (ou qualquer erro) em mensagem legível. */
export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const msgs = Object.values(extractFieldErrors(error))
    if (msgs.length > 0) return msgs.join(' ')
    return error.message || `Erro ${error.status}`
  }
  return getErrorMessage(error)
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
