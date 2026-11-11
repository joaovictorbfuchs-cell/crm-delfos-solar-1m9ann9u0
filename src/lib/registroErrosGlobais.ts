// Handler global de erros fora de ErrorBoundary: window.onerror e unhandledrejection
// Grava em logs_erro_frontend no mesmo formato do ErrorBoundary (fire-and-forget, requestKey: null),
// para capturar crashes que hoje escapam dos boundaries (ex.: erros assíncronos e de extensões).
import pb from '@/lib/pocketbase/client'

type OrigemErro = 'window.onerror' | 'unhandledrejection'

// Deduplicação simples: mesma assinatura de erro dentro de 10s só grava uma vez,
// evitando tempestade de registros quando um erro dispara em loop.
const ULTIMOS_REGISTROS = new Map<string, number>()
const JANELA_DEDUPE_MS = 10_000

function assinaturaErro(mensagem: string, stack: string): string {
  return `${mensagem}|${stack.split('\n')[1] ?? ''}`
}

function jaRegistradoRecentemente(assinatura: string): boolean {
  const agora = Date.now()
  const ultimo = ULTIMOS_REGISTROS.get(assinatura)
  ULTIMOS_REGISTROS.set(assinatura, agora)
  if (ultimo && agora - ultimo < JANELA_DEDUPE_MS) return true
  // Limpeza para o Map não crescer indefinidamente
  if (ULTIMOS_REGISTROS.size > 100) {
    for (const [chave, ts] of ULTIMOS_REGISTROS) {
      if (agora - ts > JANELA_DEDUPE_MS) ULTIMOS_REGISTROS.delete(chave)
    }
  }
  return false
}

export function registrarErroGlobal(
  error: unknown,
  origem: OrigemErro,
  extra?: { stack?: string },
): void {
  try {
    let mensagem = ''
    let stack = extra?.stack || ''

    if (error instanceof Error) {
      mensagem = error.message
      stack = error.stack || stack
    } else if (typeof error === 'string') {
      mensagem = error
    } else if (error && typeof error === 'object') {
      const e = error as { message?: unknown; reason?: unknown; stack?: unknown }
      mensagem = typeof e.message === 'string' ? e.message : String(error)
      if (typeof e.stack === 'string') stack = e.stack
      if (!mensagem && e.reason !== undefined) mensagem = String(e.reason)
    } else {
      mensagem = String(error ?? '')
    }

    if (!mensagem && !stack) return
    if (jaRegistradoRecentemente(assinaturaErro(mensagem, stack))) return

    const currentUser = pb.authStore?.model
    const errMessage = mensagem.slice(0, 5000)
    const errStack = stack.slice(0, 10000)
    const currentPath = typeof window !== 'undefined' ? window.location?.pathname || '' : ''
    const uAgent = typeof navigator !== 'undefined' ? navigator?.userAgent || '' : ''

    pb.collection('logs_erro_frontend')
      .create(
        {
          mensagem: errMessage,
          message: errMessage,
          stack: errStack,
          component_stack: '',
          rota: currentPath,
          usuario_id: currentUser?.id || '',
          usuario_email: currentUser?.email || '',
          userAgent: uAgent,
          user_agent: uAgent,
          versao_app: '1.0.0',
          metadata: {
            origem,
            url: typeof window !== 'undefined' ? window.location?.href : '',
            timestamp: new Date().toISOString(),
          },
        },
        { requestKey: null },
      )
      .catch((pbErr) => {
        console.warn('[GlobalErrorHandler] Falha ao registrar log em logs_erro_frontend:', pbErr)
      })
  } catch (logErr) {
    console.warn('[GlobalErrorHandler] Exceção ao registrar erro global:', logErr)
  }
}

/** Instala listeners globais (uma única vez) para window.onerror e unhandledrejection. */
export function instalarManipuladoresGlobaisErros(): void {
  if (typeof window === 'undefined') return

  const w = window as typeof window & {
    __delfosHandlersGlobaisErrosInstalados?: boolean
  }
  if (w.__delfosHandlersGlobaisErrosInstalados) return
  w.__delfosHandlersGlobaisErrosInstalados = true

  window.addEventListener(
    'error',
    (event) => {
      // Erros de recurso (script/img) sem mensagem vêm sem "error"; ignora para não poluir
      if (!event.error && !event.message) return
      registrarErroGlobal(event.error ?? event.message, 'window.onerror')
    },
    true,
  )

  window.addEventListener('unhandledrejection', (event) => {
    registrarErroGlobal(event.reason, 'unhandledrejection')
  })
}
