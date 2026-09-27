import React, { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'

export interface MobileKanbanStage {
  id: string
  title: string
  shortTitle?: string
  count: number
  totalSubtitle?: string
  icon?: LucideIcon
  iconColorClass?: string
  accentColorClass?: string
  borderTopClass?: string
  content: React.ReactNode
}

interface MobileKanbanViewportProps {
  stages: MobileKanbanStage[]
  initialStageIndex?: number
  onStageChange?: (index: number, stageId: string) => void
  /**
   * Chamado quando um card está sendo arrastado no touch (para evitar swipe entre colunas acidental durante drag de card)
   */
  isDraggingCard?: boolean
  className?: string
}

export const MobileKanbanViewport: React.FC<MobileKanbanViewportProps> = ({
  stages,
  initialStageIndex = 0,
  onStageChange,
  isDraggingCard = false,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialStageIndex), Math.max(0, stages.length - 1)),
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingCardRef = useRef(isDraggingCard)
  isDraggingCardRef.current = isDraggingCard

  // Garante que se o número de etapas mudar ou o initialStageIndex mudar, ajustamos
  useEffect(() => {
    if (currentIndex >= stages.length && stages.length > 0) {
      setCurrentIndex(stages.length - 1)
    }
  }, [stages.length, currentIndex])

  const goToStage = useCallback(
    (index: number) => {
      const target = Math.min(Math.max(0, index), stages.length - 1)
      setCurrentIndex(target)
      if (stages[target]) {
        onStageChange?.(target, stages[target].id)
      }
    },
    [stages, onStageChange],
  )

  // Suporte a swipe horizontal touch no container
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [touchDeltaX, setTouchDeltaX] = useState(0)
  const isSwipingRef = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    // Se o usuário está arrastando um card (drag & drop), não iniciar swipe
    if (isDraggingCardRef.current) return
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
    isSwipingRef.current = false
    setTouchDeltaX(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isDraggingCardRef.current) return
    const touch = e.touches[0]
    const diffX = touch.clientX - touchStartRef.current.x
    const diffY = touch.clientY - touchStartRef.current.y

    // Se o movimento vertical for preponderante, não interceptamos como swipe horizontal
    if (!isSwipingRef.current) {
      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 8) {
        touchStartRef.current = null
        return
      }
      if (Math.abs(diffX) > 12) {
        isSwipingRef.current = true
      }
    }

    if (isSwipingRef.current) {
      // Amortecer se estiver nos extremos
      if ((currentIndex === 0 && diffX > 0) || (currentIndex === stages.length - 1 && diffX < 0)) {
        setTouchDeltaX(diffX * 0.3)
      } else {
        setTouchDeltaX(diffX)
      }
    }
  }

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !isSwipingRef.current) {
      touchStartRef.current = null
      isSwipingRef.current = false
      setTouchDeltaX(0)
      return
    }

    const threshold = 50 // px mínimos para disparar swipe
    if (touchDeltaX < -threshold && currentIndex < stages.length - 1) {
      // Swipe para esquerda -> avança etapa
      goToStage(currentIndex + 1)
    } else if (touchDeltaX > threshold && currentIndex > 0) {
      // Swipe para direita -> volta etapa
      goToStage(currentIndex - 1)
    }

    touchStartRef.current = null
    isSwipingRef.current = false
    setTouchDeltaX(0)
  }

  const currentStage = stages[currentIndex] || stages[0]

  if (!stages || stages.length === 0) {
    return null
  }

  return (
    <div className={`w-full flex flex-col select-none ${className}`}>
      {/* 1. Barra de Topo do Funil Mobile: Indicador da Etapa Atual, Setas e Contador */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs mb-3">
        <div className="flex items-center justify-between gap-2">
          {/* Botão Etapa Anterior */}
          <button
            type="button"
            onClick={() => goToStage(currentIndex - 1)}
            disabled={currentIndex === 0}
            aria-label="Etapa anterior"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all shrink-0 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Nome e Ícone da Etapa Atual + Contador */}
          <div className="flex-1 min-w-0 text-center px-1">
            <div className="flex items-center justify-center gap-1.5 min-w-0">
              {currentStage.icon && (
                <currentStage.icon
                  className={`w-4 h-4 shrink-0 ${currentStage.iconColorClass || 'text-slate-700'}`}
                />
              )}
              <h2
                className="font-bold text-sm text-slate-800 uppercase tracking-tight truncate max-w-[200px]"
                title={currentStage.title}
              >
                {currentStage.shortTitle || currentStage.title}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                {currentStage.count}
              </span>
            </div>

            {/* Totalizador / Subtítulo da etapa (ex: Acumulado R$ ou Total kWp) */}
            {currentStage.totalSubtitle && (
              <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                {currentStage.totalSubtitle}
              </div>
            )}
          </div>

          {/* Botão Próxima Etapa */}
          <button
            type="button"
            onClick={() => goToStage(currentIndex + 1)}
            disabled={currentIndex === stages.length - 1}
            aria-label="Próxima etapa"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all shrink-0 active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Indicador de passos em bolinhas / pills para feedback visual de posição */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5">
          {stages.map((stage, idx) => {
            const isActive = idx === currentIndex
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => goToStage(idx)}
                aria-label={`Ir para etapa ${idx + 1}: ${stage.title}`}
                className={`transition-all rounded-full ${
                  isActive
                    ? 'w-6 h-2 bg-emerald-600 shadow-2xs'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`${idx + 1}. ${stage.title} (${stage.count})`}
              />
            )
          })}
        </div>

        {/* Dica rápida de swipe */}
        <div className="text-[10px] text-slate-400 text-center mt-1 flex items-center justify-center gap-1 font-medium">
          <span>Deslize para os lados para alternar entre as etapas</span>
        </div>
      </div>

      {/* 2. Container do Funil Mobile: SÓ a etapa selecionada ocupa 100% da largura, sem peek lateral */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full overflow-hidden touch-pan-y"
      >
        <div
          className="flex w-full"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${touchDeltaX}px))`,
            transition: isSwipingRef.current
              ? 'none'
              : 'transform 260ms cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform',
          }}
        >
          {stages.map((stage) => {
            return (
              <div
                key={stage.id}
                className="w-full min-w-full max-w-full shrink-0 flex-none"
                style={{ width: '100%', minWidth: '100%', maxWidth: '100%' }}
              >
                {stage.content}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
