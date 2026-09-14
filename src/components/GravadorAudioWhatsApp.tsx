import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Trash2, Send, Play, Pause, AlertTriangle, RotateCcw } from 'lucide-react'

export interface GravadorAudioWhatsAppProps {
  onSendAudio: (audioBase64: string, duracaoSegundos: number) => Promise<void>
  disabled?: boolean
  className?: string
}

export type GravadorEstado = 'idle' | 'gravando' | 'previa' | 'enviando'

/**
 * Converte um Blob de áudio em string Base64 Data URL (data:audio/...;base64,...)
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Falha ao converter áudio para Base64'))
      }
    }
    reader.onerror = () => reject(reader.error || new Error('Erro ao ler blob de áudio'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Formata segundos no formato MM:SS
 */
export function formatAudioDuration(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Detecta o melhor MIME type suportado pelo navegador para envio via WhatsApp Z-API
 * (preferência por audio/ogg;codecs=opus ou audio/webm;codecs=opus)
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/ogg'
  }
  const types = [
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
  ]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t
    }
  }
  return ''
}

export const GravadorAudioWhatsApp: React.FC<GravadorAudioWhatsAppProps> = ({
  onSendAudio,
  disabled = false,
  className = '',
}) => {
  const [estado, setEstado] = useState<GravadorEstado>('idle')
  const [tempoGravacao, setTempoGravacao] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempoReproducao, setTempoReproducao] = useState(0)
  const [duracaoAudio, setDuracaoAudio] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Limpeza de recursos ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          /* intentionally ignored */
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Iniciar Gravação
  const handleIniciarGravacao = async () => {
    setErrorMessage(null)

    // Checagem de suporte a MediaRecorder e getUserMedia
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorMessage(
        'Seu navegador não suporta gravação de áudio pelo microfone. Recomendamos usar o Google Chrome ou Microsoft Edge.',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const mimeType = getSupportedAudioMimeType()
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const finalType = mimeType || 'audio/ogg'
        const blob = new Blob(chunksRef.current, { type: finalType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setEstado('previa')

        // Finalizar tracks do microfone para desligar a luz do microfone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start(200) // Coleta pedaços a cada 200ms
      setTempoGravacao(0)
      setEstado('gravando')

      // Contador de segundos decorridos
      const startTime = Date.now()
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setTempoGravacao(elapsed)
      }, 1000)
    } catch (err: unknown) {
      console.error('Erro ao acessar microfone:', err)
      const errName = (err as Error)?.name || ''
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setErrorMessage(
          'Permissão de microfone negada. Clique no ícone de cadeado/permissões ao lado da barra de endereço para autorizar o microfone e tente novamente.',
        )
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMessage('Nenhum microfone foi encontrado no seu dispositivo.')
      } else {
        setErrorMessage(
          'Não foi possível iniciar a gravação do microfone. Verifique as permissões.',
        )
      }
    }
  }

  // Parar gravação e ir para prévia
  const handlePararGravacao = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch (err) {
        console.warn('Erro ao parar gravação:', err)
      }
    }
  }

  // Descartar áudio gravado e voltar ao estado idle
  const handleDescartar = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        /* intentionally ignored */
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioBlob(null)
    setIsPlaying(false)
    setTempoGravacao(0)
    setTempoReproducao(0)
    setDuracaoAudio(0)
    setErrorMessage(null)
    setEstado('idle')
  }, [audioUrl])

  // Alternar play / pause no player de prévia
  const handleTogglePlay = () => {
    if (!audioElementRef.current) return
    if (isPlaying) {
      audioElementRef.current.pause()
      setIsPlaying(false)
    } else {
      audioElementRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn('Erro ao reproduzir áudio:', e))
    }
  }

  // Enviar áudio gravado
  const handleConfirmarEnvio = async () => {
    if (!audioBlob || estado === 'enviando') return

    // Pausar reprodução se estiver tocando
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      setIsPlaying(false)
    }

    setEstado('enviando')
    setErrorMessage(null)

    try {
      const base64 = await blobToBase64(audioBlob)
      const duracaoFinal = Math.max(1, Math.round(duracaoAudio || tempoGravacao || 1))
      await onSendAudio(base64, duracaoFinal)

      // Sucesso: limpar e voltar ao estado inicial
      handleDescartar()
    } catch (err: unknown) {
      console.error('Erro ao enviar áudio gravado:', err)
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao enviar áudio pelo WhatsApp Z-API.',
      )
      setEstado('previa')
    }
  }

  // 1. Estado Idle: Botão de microfone discreto no padrão WhatsApp Web
  if (estado === 'idle') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <button
          type="button"
          onClick={handleIniciarGravacao}
          disabled={disabled}
          className="p-2.5 rounded-full text-[#54656f] hover:text-[#00a884] hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-95"
          title="Gravar mensagem de voz (WhatsApp)"
          aria-label="Gravar áudio"
        >
          <Mic className="w-5 h-5 text-[#00a884]" />
        </button>

        {/* Modal/Banner de erro de permissão/suporte se houver */}
        {errorMessage && (
          <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-rose-50 border border-rose-200 rounded-xl shadow-lg text-xs text-rose-800 z-50 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-rose-900">Acesso ao microfone</div>
                <div className="text-[11px] mt-0.5 leading-relaxed text-rose-700">
                  {errorMessage}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-800 p-0.5"
                title="Fechar"
              >
                &times;
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 2. Estado Gravando: Barra de gravação ativa com ponto vermelho pulsante, cronômetro e botão de parar
  if (estado === 'gravando') {
    return (
      <div
        className={`flex-1 flex items-center justify-between gap-3 bg-white px-3.5 py-2 rounded-xl border border-red-200 shadow-2xs animate-in fade-in ${className}`}
      >
        {/* Indicador de gravação e tempo decorrido */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 relative" />
          </div>
          <span className="text-xs font-mono font-bold text-red-600">
            {formatAudioDuration(tempoGravacao)}
          </span>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500">
            <span>• Gravando áudio...</span>
            <div className="flex items-center gap-0.5 ml-1">
              <span className="w-1 h-3 bg-red-400 rounded-full animate-pulse" />
              <span
                className="w-1 h-4 bg-red-500 rounded-full animate-pulse"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1 h-2 bg-red-400 rounded-full animate-pulse"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        </div>

        {/* Ações: Descartar (lixeira) e Parar Gravação */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDescartar}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Cancelar gravação"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handlePararGravacao}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
            title="Concluir gravação e ouvir prévia"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Parar</span>
          </button>
        </div>
      </div>
    )
  }

  // 3. Estado Prévia / Enviando: Player para ouvir antes de enviar, botão descartar e botão enviar
  return (
    <div
      className={`flex-1 flex flex-col gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-emerald-300 shadow-2xs animate-in fade-in ${className}`}
    >
      {audioUrl && (
        <audio
          ref={audioElementRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = (e.target as HTMLAudioElement).duration
            if (!isNaN(d) && isFinite(d) && d > 0) {
              setDuracaoAudio(d)
            } else if (tempoGravacao > 0) {
              setDuracaoAudio(tempoGravacao)
            }
          }}
          onTimeUpdate={(e) => {
            setTempoReproducao((e.target as HTMLAudioElement).currentTime)
          }}
          onEnded={() => {
            setIsPlaying(false)
            setTempoReproducao(0)
          }}
        />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Player de áudio com Play/Pause e barra de progresso */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={estado === 'enviando'}
            className="w-8 h-8 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center transition-colors shadow-2xs shrink-0"
            title={isPlaying ? 'Pausar prévia' : 'Ouvir gravação'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Barra de Progresso / Onda sonora */}
          <div className="flex-1 min-w-[120px] flex flex-col justify-center">
            <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00a884] rounded-full transition-all duration-100"
                style={{
                  width: `${
                    duracaoAudio > 0
                      ? Math.min(100, (tempoReproducao / duracaoAudio) * 100)
                      : tempoGravacao > 0
                        ? Math.min(100, (tempoReproducao / tempoGravacao) * 100)
                        : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mt-0.5">
              <span>{formatAudioDuration(tempoReproducao)}</span>
              <span>{formatAudioDuration(duracaoAudio || tempoGravacao)}</span>
            </div>
          </div>
        </div>

        {/* Botões Descartar e Enviar Áudio */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDescartar}
            disabled={estado === 'enviando'}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
            title="Descartar este áudio e voltar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descartar</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmarEnvio}
            disabled={estado === 'enviando'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
            title="Enviar mensagem de áudio pelo WhatsApp"
          >
            {estado === 'enviando' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Áudio</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exibição de erro se envio falhar */}
      {errorMessage && (
        <div className="text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-200 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 ml-2 font-bold"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  )
}
