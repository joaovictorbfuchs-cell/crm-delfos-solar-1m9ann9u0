import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/** Mensagens que indicam sessão/token expirado ou inválido. */
const MENSAGENS_SESSAO_EXPIRADA = [
  'token is expired',
  'token is invalid',
  'sessão expirada',
  'sessao expirada',
  'login expirou',
  'failed to authenticate',
  'autenticação falhou',
  'autenticacao falhou',
  'unauthorized',
  'não autorizado',
  'nao autorizado',
]

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // ClientResponseError e objetos com status/statusCode (401/403)
  const possivelStatus: number[] = []
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>
    if (typeof obj.status === 'number') possivelStatus.push(obj.status)
    if (typeof obj.statusCode === 'number') possivelStatus.push(obj.statusCode)
    const response = obj.response as Record<string, unknown> | undefined
    if (response && typeof response === 'object' && typeof response.status === 'number') {
      possivelStatus.push(response.status)
    }
  }
  if (possivelStatus.some((s) => s === 401 || s === 403)) return true

  // Erros com mensagem indicando sessão expirada
  let mensagem: string | undefined
  if (error instanceof Error) mensagem = error.message
  else if (typeof error === 'object') {
    const obj = error as Record<string, unknown>
    if (typeof obj.message === 'string') mensagem = obj.message
  }
  if (mensagem) {
    const normalizada = mensagem.toLowerCase()
    if (MENSAGENS_SESSAO_EXPIRADA.some((m) => normalizada.includes(m))) return true
  }

  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const obj = error as Record<string, unknown>
  return obj.isAbort === true || obj.name === 'AbortError'
}

export function formatPbError(error: unknown): string {
  if (isAbortError(error)) return 'Operação cancelada.'
  if (isAuthSessionError(error)) return 'Sua sessão expirou. Faça login novamente.'
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
