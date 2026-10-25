import React from 'react'
import { Sparkles, X, Check } from 'lucide-react'
import type { ModuloFiltro, QuickFilterDef } from '@/types/filtros'
import { getQuickFiltersPorModulo } from '@/lib/quickFiltersCatalogo'

export interface QuickFilterChipsBarProps {
  modulo: ModuloFiltro
  activeQuickFilters: QuickFilterDef[]
  onToggleQuickFilter: (qf: QuickFilterDef) => void
  onClearAllQuickFilters?: () => void
  maxLimit?: number // default 10
  className?: string
}

export const QuickFilterChipsBar: React.FC<QuickFilterChipsBarProps> = ({
  modulo,
  activeQuickFilters,
  onToggleQuickFilter,
  onClearAllQuickFilters,
  maxLimit = 10,
  className = '',
}) => {
  const disponiveis = getQuickFiltersPorModulo(modulo)

  if (disponiveis.length === 0) {
    return null
  }

  const activeIds = new Set(activeQuickFilters.map((q) => q.id))
  const atingiuLimite = activeQuickFilters.length >= maxLimit

  const getCorClasses = (qf: QuickFilterDef, isAtivo: boolean) => {
    if (isAtivo) {
      switch (qf.cor) {
        case 'emerald':
          return 'bg-emerald-600 text-white border-emerald-600 shadow-2xs hover:bg-emerald-700'
        case 'rose':
          return 'bg-rose-600 text-white border-rose-600 shadow-2xs hover:bg-rose-700'
        case 'amber':
          return 'bg-amber-600 text-white border-amber-600 shadow-2xs hover:bg-amber-700'
        case 'sky':
          return 'bg-sky-600 text-white border-sky-600 shadow-2xs hover:bg-sky-700'
        case 'teal':
          return 'bg-teal-600 text-white border-teal-600 shadow-2xs hover:bg-teal-700'
        case 'purple':
          return 'bg-purple-600 text-white border-purple-600 shadow-2xs hover:bg-purple-700'
        case 'blue':
        default:
          return 'bg-blue-600 text-white border-blue-600 shadow-2xs hover:bg-blue-700'
      }
    }

    // Inativo
    return 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
  }

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin text-xs ${className}`}
      role="toolbar"
      aria-label="Filtros rápidos inline"
    >
      <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 select-none mr-0.5">
        <Sparkles className="w-3 h-3 text-amber-500" />
        <span>Rápido:</span>
      </div>

      {disponiveis.map((qf) => {
        const isAtivo = activeIds.has(qf.id)
        const desabilitado = !isAtivo && atingiuLimite

        return (
          <button
            key={qf.id}
            type="button"
            disabled={desabilitado}
            onClick={() => onToggleQuickFilter(qf)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${getCorClasses(
              qf,
              isAtivo,
            )} ${desabilitado ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={
              desabilitado
                ? `Limite de ${maxLimit} quick filters atingido`
                : isAtivo
                  ? `Desativar filtro "${qf.label}"`
                  : `Aplicar filtro "${qf.label}" com 1 clique`
            }
          >
            {isAtivo && <Check className="w-3 h-3 stroke-[3]" />}
            <span>{qf.label}</span>
            {isAtivo && (
              <span className="p-0.5 -mr-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        )
      })}

      {activeQuickFilters.length > 0 && onClearAllQuickFilters && (
        <button
          type="button"
          onClick={onClearAllQuickFilters}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 ml-1 cursor-pointer"
          title="Limpar todos os quick filters inline"
        >
          <X className="w-3 h-3" />
          <span>Limpar ({activeQuickFilters.length})</span>
        </button>
      )}

      {atingiuLimite && (
        <span className="text-[10px] text-amber-600 font-medium shrink-0 ml-1">
          (limite {maxLimit} ativos)
        </span>
      )}
    </div>
  )
}
export default QuickFilterChipsBar
