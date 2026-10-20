import { lazy, type ComponentType } from 'react'

/** Chave do sessionStorage para rastrear recargas por falha de chunk */
const CHUNK_RELOAD_STORAGE_KEY = 'delfos_chunk_load_reload_time'
/** Intervalo mínimo para permitir nova recarga automática (evita loops infinitos) */
const CHUNK_RELOAD_COOLDOWN_MS = 15000

/**
 * Detecta se uma mensagem ou objeto de erro indica falha no carregamento dinâmico de chunk/módulo do Vite/Webpack.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String((error as { message?: unknown })?.message || '')

  const msgLower = msg.toLowerCase()
  return (
    msgLower.includes('failed to fetch dynamically imported module') ||
    msgLower.includes('error loading dynamically imported module') ||
    msgLower.includes('chunkloaderror') ||
    msgLower.includes('loading chunk') ||
    msgLower.includes('failed to load module script') ||
    msgLower.includes('unable to preload css') ||
    msgLower.includes('importing a module script failed')
  )
}

/**
 * Tenta recarregar a página uma única vez de forma segura para buscar o novo index.html com os hashes atualizados.
 * Retorna true se recarregou ou false se já havia recarregado recentemente (respeitando cooldown).
 */
export function reloadPageForChunkUpdate(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const lastReloadStr = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)
    const now = Date.now()

    if (lastReloadStr) {
      const lastReload = parseInt(lastReloadStr, 10)
      if (!isNaN(lastReload) && now - lastReload < CHUNK_RELOAD_COOLDOWN_MS) {
        // Já recarregou recentemente, não entra em loop
        return false
      }
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now))
    window.location.reload()
    return true
  } catch (err) {
    console.warn('[lazyWithRetry] Falha ao acessar sessionStorage ou recarregar:', err)
    try {
      window.location.reload()
      return true
    } catch {
      return false
    }
  }
}

/**
 * Wrapper resiliente para React.lazy() com:
 * 1. Tentativa imediata de retry da importação dinâmica com pequeno delay
 * 2. Recarga automática segura da página (1x dentro do cooldown) se o chunk não for encontrado
 *    (cenário típico de novo deploy no qual o hash do arquivo JS mudou)
 * 3. Fallback limpo propagando erro caso persista, para ser tratado pelo ErrorBoundary com botão de Recarregar.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 1,
  delayMs = 300,
): ReturnType<typeof lazy<T>> {
  return lazy<T>(async () => {
    try {
      return await componentImport()
    } catch (error) {
      if (isChunkLoadError(error)) {
        console.warn(
          '[lazyWithRetry] Detectada falha no carregamento do chunk dinâmico. Tentando retry/recarga da aplicação...',
          error,
        )

        // Tenta retry imediato
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          try {
            return await componentImport()
          } catch (retryErr) {
            console.warn(
              '[lazyWithRetry] Retry dinâmico falhou, acionando recarga segura...',
              retryErr,
            )
          }
        }

        // Se falhou e é erro de chunk novo após deploy, recarrega a página automaticamente 1 vez
        const reloaded = reloadPageForChunkUpdate()
        if (reloaded) {
          // Retorna uma Promise que nunca resolve enquanto a página recarrega para evitar piscar de tela de erro
          return new Promise<{ default: T }>(() => {})
        }
      }

      // Se não for chunk error ou se já recarregou recentemente, repassa o erro para o ErrorBoundary
      throw error
    }
  })
}
