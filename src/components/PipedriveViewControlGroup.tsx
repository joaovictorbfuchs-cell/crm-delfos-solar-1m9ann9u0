import React from 'react'
import { Kanban, List, History, ArchiveX, Sparkles, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface PipedriveViewControlGroupProps {
  viewMode: 'kanban' | 'list' | 'perdidos'
  onChangeViewMode: (mode: 'kanban' | 'list' | 'perdidos') => void
  onRefresh?: () => void
  isRefreshing?: boolean
  onLimparNegocios?: () => void
  isLimpandoNegocios?: boolean
  perdidosCount?: number
}

export const PipedriveViewControlGroup: React.FC<PipedriveViewControlGroupProps> = ({
  viewMode,
  onChangeViewMode,
  onRefresh,
  isRefreshing = false,
  onLimparNegocios,
  isLimpandoNegocios = false,
  perdidosCount = 0,
}) => {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5 shadow-2xs divide-x divide-slate-200">
        {/* 1. Visão Kanban (Ícone de colunas Pipedrive) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onChangeViewMode('kanban')}
              className={`w-8 h-8 rounded-sm transition-colors cursor-pointer flex items-center justify-center ${
                viewMode === 'kanban'
                  ? 'bg-blue-50 text-blue-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              aria-label="Visualização em Kanban"
            >
              <Kanban className="w-4 h-4 stroke-[2.2]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Visualização em Kanban
          </TooltipContent>
        </Tooltip>

        {/* 2. Visão em Lista */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onChangeViewMode('list')}
              className={`w-8 h-8 rounded-sm transition-colors cursor-pointer flex items-center justify-center ${
                viewMode === 'list'
                  ? 'bg-blue-50 text-blue-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              aria-label="Visualização em Lista"
            >
              <List className="w-4 h-4 stroke-[2.2]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Visualização em Lista
          </TooltipContent>
        </Tooltip>

        {/* 3. Recarregar Dados (ícone History/Refresh compacto) */}
        {onRefresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing || isLimpandoNegocios}
                className="w-8 h-8 rounded-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                aria-label="Atualizar dados do funil"
              >
                <History
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Atualizar dados do funil
            </TooltipContent>
          </Tooltip>
        )}

        {/* 4. Oportunidades Perdidas (Lixeira / Caixa de Arquivamento) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onChangeViewMode('perdidos')}
              className={`w-8 h-8 rounded-sm transition-colors cursor-pointer flex items-center justify-center relative ${
                viewMode === 'perdidos'
                  ? 'bg-rose-50 text-rose-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-rose-600 hover:bg-slate-100'
              }`}
              aria-label="Oportunidades Perdidas"
            >
              <ArchiveX className="w-4 h-4 stroke-[2]" />
              {perdidosCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold w-4 h-4 rounded-full text-[9px] flex items-center justify-center leading-none">
                  {perdidosCount > 99 ? '99+' : perdidosCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Oportunidades Perdidas ({perdidosCount})
          </TooltipContent>
        </Tooltip>

        {/* 5. Ação de Varredura / Limpeza de fora do funil */}
        {onLimparNegocios && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onLimparNegocios}
                disabled={isLimpandoNegocios || isRefreshing}
                className="w-8 h-8 rounded-sm text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                aria-label="Varredura e limpeza do funil"
              >
                {isLimpandoNegocios ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Varredura e limpeza de negócios fora do funil
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
