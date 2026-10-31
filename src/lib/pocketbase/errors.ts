import ClientResponseError from 'pocketbase'

export interface FieldErrors {
  [key: string]: string
}

/**
 * Verifica se um erro retornado pelo PocketBase decorre de autenticação/sessão expirada
 * (HTTP 401, 403, ou mensagens textuais indicando login/sessão expirados).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  const anyErr = err as any

  // Erros abortados não são erros de sessão
  if (isAbortError(err)) return false

  // Status HTTP clássicos de autenticação/autorização
  const status = anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status
  if (status === 401 || status === 403) {
    return true
  }

  // Checagem por texto da mensagem
  const message = String(anyErr.message || anyErr.data?.message || '')
  if (
    /token\s+(is\s+)?(expired|invalid)/i.test(message) ||
    /failed\s+to\s+authenticate/i.test(message) ||
    /sess[aã]o\s+expirada/i.test(message) ||
    /login\s+expirou/i.test(message) ||
    (/autentica[cç][aã]o/i.test(message) && /inv[aá]lida|expirad/i.test(message))
  ) {
    return true
  }

  return false
}

/**
 * Verifica se a requisição foi abortada pelo autocancel do PocketBase ou AbortController.
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  const anyErr = err as any
  if (anyErr.isAbort === true) return true
  if (anyErr.name === 'AbortError') return true
  if (String(anyErr.message || '').includes('The request was aborted')) return true
  return false
}

/**
 * Extrai erros por campo (validação) retornados pelo PocketBase.
 */
export function extractFieldErrors(err: unknown): FieldErrors {
  if (!err) return {}
  const anyErr = err as any
  const data = anyErr.data?.data || anyErr.response?.data || anyErr.data
  if (data && typeof data === 'object') {
    const res: FieldErrors = {}
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string') {
        res[k] = v
      } else if (v && typeof v === 'object' && 'message' in (v as any)) {
        res[k] = String((v as any).message)
      }
    }
    return res
  }
  return {}
}

/**
 * Retorna mensagem legível para o usuário a partir de um erro PocketBase.
 */
export function getErrorMessage(err: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  if (!err) return fallback
  const anyErr = err as any
  if (anyErr.data?.message) return String(anyErr.data.message)
  if (anyErr.message && typeof anyErr.message === 'string') return anyErr.message
  return fallback
}

/**
 * Formata um erro do PocketBase para texto exibível.
 */
export function formatPbError(err: unknown, fallback = 'Erro ao processar requisição'): string {
  return getErrorMessage(err, fallback)
}

export default {
  isAuthSessionError,
  isAbortError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
}
