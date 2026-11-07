// Utilidades de erro para o client PocketBase.
// exportsGuard.test.ts trava estas exportações — NÃO REMOVER (regressão recorrente).

export interface PbErrorLike {
  status?: number
  statusCode?: number
  response?: { status?: number; message?: string; [campo: string]: unknown }
  message?: string
  url?: string
  isAbort?: boolean
  name?: string
  originalError?: unknown
}

const TEXTO_SESSAO_EXPIRADA = [
  'token is expired',
  'token expired',
  'sessão expirada',
  'sessao expirada',
  'login expirou',
  'failed to authenticate',
  'authentication failed',
  'the request requires a valid authentication token',
]

/** Erros de sessão (401/403/token expirado) — a UI usa para alertar sessão expirada. */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  const e = err as PbErrorLike
  if (e.isAbort) return false

  const status = e.status ?? e.statusCode ?? (e.response as PbErrorLike | undefined)?.status
  if (status === 401 || status === 403) return true

  const texto = [e.message, (e as Error).name].filter(Boolean).join(' ').toLowerCase()
  if (!texto) return false
  return TEXTO_SESSAO_EXPIRADA.some((t) => texto.includes(t))
}

/** Erros de requisição abortada (auto-cancelamento ou AbortController). */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  const e = err as PbErrorLike & { name?: string }
  return Boolean(e.isAbort || e.name === 'AbortError')
}

export type FieldErrors = Record<string, string>

/** Extrai erros por campo da response do PocketBase. */
export function extractFieldErrors(err: unknown): FieldErrors {
  const saida: FieldErrors = {}
  const resposta = (err as PbErrorLike | undefined)?.response
  if (resposta && typeof resposta === 'object') {
    for (const [k, v] of Object.entries(resposta)) {
      if (k === 'status' || k === 'message' || k === 'code') continue
      if (typeof v === 'string' && v) saida[k] = v
      else if (v && typeof v === 'object' && 'message' in (v as Record<string, unknown>)) {
        const msg = (v as { message?: unknown }).message
        if (typeof msg === 'string' && msg) saida[k] = msg
      }
    }
  }
  return saida
}

/** Mensagem legível para exibição na UI. */
export function getErrorMessage(err: unknown): string {
  return formatPbError(err)
}

export function formatPbError(err: unknown): string {
  if (!err) return 'Erro inesperado. Tente novamente.'
  const e = err as PbErrorLike
  if (e.isAbort || e.name === 'AbortError') {
    return 'Requisição cancelada.'
  }
  const resposta = e?.response
  if (resposta && typeof resposta === 'object') {
    if (typeof resposta.message === 'string' && resposta.message) {
      const extras = Object.keys(resposta)
        .filter((k) => k !== 'message' && k !== 'status' && k !== 'code')
        .map((k) => {
          const v = resposta[k]
          if (typeof v === 'string' && v) return `${k}: ${v}`
          return null
        })
        .filter(Boolean)
      return extras.length > 0 ? `${resposta.message} (${extras.join('; ')})` : resposta.message
    }
    const primeiro = Object.values(resposta).find((v) => typeof v === 'string' && v)
    if (primeiro) return String(primeiro)
  }
  if (typeof e?.message === 'string' && e.message) return e.message
  return 'Erro inesperado. Tente novamente.'
}
