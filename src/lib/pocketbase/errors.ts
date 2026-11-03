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

// Frases (minúsculas) que identificam sessão/token expirado em qualquer camada do SDK.
const TEXTO_SESSAO_EXPIRADA = [
  'token is expired or invalid',
  'failed to authenticate',
  'sessão expirada',
  'sessao expirada',
  'login expirou',
  'requires valid authentication token',
  'authentication token is invalid',
  'missing or invalid auth token',
]

/** Extrai o status HTTP de um erro PocketBase/fetch em qualquer forma conhecida. */
function extrairStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const anyError = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
  }
  if (typeof anyError.status === 'number') return anyError.status
  if (typeof anyError.statusCode === 'number') return anyError.statusCode
  if (anyError.response && typeof anyError.response.status === 'number') {
    return anyError.response.status
  }
  return null
}

/** Extrai a mensagem de um erro em qualquer forma conhecida (Error, ClientResponseError, string). */
function extrairMensagem(error: unknown): string | null {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const mensagem = (error as { message?: unknown }).message
    if (typeof mensagem === 'string') return mensagem
  }
  return null
}

/** Verdadeiro para aborts de requisição (auto-cancelamento do SDK ou AbortController). */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const anyError = error as { isAbort?: unknown; name?: unknown }
  if (anyError.isAbort === true) return true
  if (anyError.name === 'AbortError') return true
  return false
}

/**
 * Sessão expirada/token inválido: status 401/403 (direto, em statusCode ou em response)
 * ou texto clássico de token expirado na mensagem. Abort NÃO é sessão expirada.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false
  const status = extrairStatus(error)
  if (status === 401 || status === 403) return true
  const mensagem = extrairMensagem(error)
  if (!mensagem) return false
  const normalizada = mensagem.toLowerCase()
  return TEXTO_SESSAO_EXPIRADA.some((trecho) => normalizada.includes(trecho))
}

/** Mensagem pronta para o usuário, com o status HTTP quando existir. */
export function formatPbError(error: unknown): string {
  const mensagem = getErrorMessage(error)
  const status = extrairStatus(error)
  if (status) return `Erro ${status}: ${mensagem}`
  return mensagem
}
