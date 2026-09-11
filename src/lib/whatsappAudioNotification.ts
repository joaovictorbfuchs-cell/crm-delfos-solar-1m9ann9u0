/**
 * Utilitário para notificações sonoras e desktop da Central de Atendimento WhatsApp.
 * - Som via Web Audio API (sem dependências ou arquivos externos mp3/wav).
 * - Notificações desktop via Notification API com fallback gracioso para mobile.
 */

// Instância singleton de AudioContext para reutilização no navegador
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtxClass) return null
    if (!audioCtx) {
      audioCtx = new AudioCtxClass()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Toca um tom duplo suave característico de mensagem recebida no WhatsApp / mensageiros modernos.
 * Utiliza dois beeps curtos (frequências 800Hz e 1050Hz) com decaimento exponencial suave.
 */
export function playWhatsAppNotificationSound(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Primeiro tom (800 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(800, now)

    gain1.gain.setValueAtTime(0.001, now)
    gain1.gain.exponentialRampToValueAtTime(0.25, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.13)

    // Segundo tom (1050 Hz) logo após
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1050, now + 0.11)

    gain2.gain.setValueAtTime(0.001, now + 0.11)
    gain2.gain.exponentialRampToValueAtTime(0.3, now + 0.13)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now + 0.11)
    osc2.stop(now + 0.29)
  } catch (err) {
    console.warn('[AUDIO] Não foi possível reproduzir som de notificação:', err)
  }
}

/**
 * Verifica se a Notification API do navegador é suportada no dispositivo atual.
 */
export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Retorna o status de permissão atual ('default', 'granted' ou 'denied').
 */
export function getDesktopNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isDesktopNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Solicita permissão de notificação desktop ao usuário.
 */
export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (!isDesktopNotificationSupported()) return false
  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (err) {
    console.warn('[NOTIFICATION] Erro ao solicitar permissão:', err)
    return false
  }
}

/**
 * Dispara notificação desktop para mensagem recebida de cliente no WhatsApp.
 */
export function showWhatsAppDesktopNotification(params: {
  title?: string
  clientNameOrPhone: string
  messagePreview: string
  onClick?: () => void
}): void {
  if (!isDesktopNotificationSupported()) return
  if (Notification.permission !== 'granted') return

  try {
    const title = params.title || 'Nova mensagem de WhatsApp'
    const body = `${params.clientNameOrPhone}: ${params.messagePreview || 'Nova mensagem recebida'}`

    const notification = new Notification(title, {
      body,
      icon: '/delfos-logo.png',
      tag: 'whatsapp-message-' + Date.now(),
      silent: true, // Já tocamos o som via Web Audio API para não sobrepor
    })

    if (params.onClick) {
      notification.onclick = () => {
        window.focus()
        params.onClick?.()
        notification.close()
      }
    }

    // Auto-fechar após 6 segundos
    setTimeout(() => {
      try {
        notification.close()
      } catch {
        /* intentionally ignored */
      }
    }, 6000)
  } catch (err) {
    console.warn('[NOTIFICATION] Falha ao exibir notificação:', err)
  }
}
