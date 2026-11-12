import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/** Textos que indicam sessão/auth expirada independentemente do status HTTP. */
const TEXTO_SESSAO_EXPIRADA = [
  'token is expired',
  'token expired',
  'sessão expirada',
  'sessao expirada',
  'login expirou',
  'failed to authenticate',
  'the request requires valid authentication',
  'unauthorized',
]

/** Normaliza a mensagem de um erro desconhecido para comparação de texto. */
function mensagemDoErro(error: unknown): string {
  if (error instanceof Error) return String(error.message || '').toLowerCase()
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '').toLowerCase()
  }
  return ''
}

/** Erros de sessão/auth expirada (401/403 ou texto de token inválido) — disparam alerta de sessão expirada no app. */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Objetos simples com status (ex.: mocks em testes)
  if (typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (status === 401 || status === 403) return true
  }

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    // ClientResponseError antigo guardava o status em response.status
    const responseStatus = (error.response as { status?: unknown } | undefined)?.status
    if (responseStatus === 401 || responseStatus === 403) return true
    if (error.isAbort) return false
  }

  const msg = mensagemDoErro(error)
  if (!msg) return false
  return TEXTO_SESSAO_EXPIRADA.some((t) => msg.includes(t))
}

/** Erros de requisição abortada (auto-cancellation do SDK). */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ((error as { isAbort?: unknown }).isAbort === true) return true
  if ((error as { name?: unknown }).name === 'AbortError') return true
  if (
    error instanceof ClientResponseError &&
    (error.status === 0 ||
      String(error.message || '')
        .toLowerCase()
        .includes('abort'))
  ) {
    return true
  }
  return false
}

/** Mensagem amigável a partir de um ClientResponseError do PocketBase. */
export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const fieldMsgs = Object.values(extractFieldErrors(error))
    if (fieldMsgs.length > 0) return fieldMsgs.join(' ')
    if (error.response?.message) return error.response.message
  }
  return error instanceof Error ? error.message : 'Erro inesperado.'
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
