// ⚠️ ARQUIVO CRÍTICO — exports canônicos de erros do PocketBase (Delfos Solar)
// REGRA PERMANENTE: `isAuthSessionError`, `isAbortError`, `formatPbError`,
// `extractFieldErrors` e `getErrorMessage` DEVEM permanecer exportados daqui.
// Módulos como AtividadesCalendario, CalendarioExecucaoOS, FichaExecucaoOS,
// ModalMensagemWhatsAppMassa e RelatorioOSConteudo importam daqui — se um destes
// exports sumir, o chunk quebra em runtime e a rota cai em ErrorBoundary.
import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Detecta erro de sessão de autenticação (token expirado/inválido ou permissão negada).
 * Cobertura: status 401/403 direto ou dentro de response/statusCode, e textos clássicos
 * de token expirado ("Token is expired or invalid", "Sessão expirada", "Login expirou",
 * "Failed to authenticate").
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // PocketBase ClientResponseError e similares: status numérico
  const status =
    typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
        ? (error as { response: { status: number } }).response.status
        : typeof (error as { statusCode?: unknown }).statusCode === 'number'
          ? (error as { statusCode: number }).statusCode
          : undefined

  if (status === 401 || status === 403) return true

  // Textos clássicos de token/sessão expirada
  const message =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : ''

  const tokenPhrases = [
    'token is expired',
    'token is invalid',
    'token expirado',
    'token inválido',
    'sessão expirada',
    'sessao expirada',
    'login expirou',
    'failed to authenticate',
    'authentication is required',
  ]
  const lower = message.toLowerCase()
  return tokenPhrases.some((p) => lower.includes(p))
}

/** Detecta erro de requisição abortada (auto-cancellation do SDK). */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ((error as { isAbort?: unknown }).isAbort === true) return true
  return (error as { name?: unknown }).name === 'AbortError'
}

/**
 * Normaliza qualquer erro em uma mensagem amigável em português, pronta para exibição.
 * Prioriza mensagens de campo validados, depois a mensagem do próprio erro.
 */
export function formatPbError(error: unknown): string {
  if (!error) return 'Ocorreu um erro inesperado.'

  // PocketBase ClientResponseError com campos validados
  if (error instanceof ClientResponseError) {
    const fieldMsgs = Object.values(extractFieldErrors(error))
    if (fieldMsgs.length > 0) return fieldMsgs.join(' ')
    return error.message || 'Ocorreu um erro inesperado.'
  }

  if (isAbortError(error)) return 'Requisição cancelada. Tente novamente.'

  if (isAuthSessionError(error)) return 'Sua sessão expirou. Faça login novamente.'

  if (error instanceof Error) return error.message

  if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    const msg = (error as { message?: unknown }).message
    if (typeof msg === 'string' && msg) return msg
  }

  return 'Ocorreu um erro inesperado.'
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
