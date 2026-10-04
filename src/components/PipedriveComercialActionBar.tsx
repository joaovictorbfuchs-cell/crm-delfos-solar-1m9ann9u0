import React from 'react'
import { Info, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PipedriveViewControlGroup } from './PipedriveViewControlGroup'
import { PipedriveNovoNegocioSplitButton } from './PipedriveNovoNegocioSplitButton'
import { PipedriveFilterPopover } from './PipedriveFilterPopover'
import type { Usuario } from '@/types/crm'

interface PipedriveComercialActionBarProps {
  // Controles de Visualização
  viewMode: 'kanban' | 'list' | 'perdidos'
  onChangeViewMode: (mode: 'kanban' | 'list' | 'perdidos') => void
  onRefresh?: () => void
  isRefreshing?: boolean
  onLimparNegocios?: () => void
  isLimpandoNegocios?: boolean
  perdidosCount?: number

  // Criação de Negócio (+ Negócio Split Button)
  onNovoNegocio: () => void
  onNovoLead?: () => void

  // Contagem
  totalNegocios: number

  // Filtro
  usuarios: Usuario[]
  usuarioAtual?: { id?: string; name?: string } | null
  filtroResponsavel: string
  onSelectResponsavel: (id: string) => void
  filtroEstado?: string
  onSelectFiltroEstado?: (estado: string) => void
}

export const PipedriveComercialActionBar: React.FC<PipedriveComercialActionBarProps> = ({
  viewMode,
  onChangeViewMode,
  onRefresh,
  isRefreshing = false,
  onLimparNegocios,
  isLimpandoNegocios = false,
  perdidosCount = 0,
  onNovoNegocio,
  onNovoLead,
  totalNegocios,
  usuarios,
  usuarioAtual,
  filtroResponsavel,
  onSelectResponsavel,
  filtroEstado = 'todos',
  onSelectFiltroEstado,
}) => {
  return (
    <div className="flex flex-col gap-2 select-none">
      {/* Linha Principal de Ferramentas */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Esquerda: Grupo de Visualização + Botão Split "+ Negócio" */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <PipedriveViewControlGroup
            viewMode={viewMode}
            onChangeViewMode={onChangeViewMode}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            onLimparNegocios={onLimparNegocios}
            isLimpandoNegocios={isLimpandoNegocios}
            perdidosCount={perdidosCount}
          />

          <PipedriveNovoNegocioSplitButton
            onNovoNegocio={onNovoNegocio}
            onNovoLead={onNovoLead || onNovoNegocio}
          />
        </div>

        {/* Direita: Contador ("58 negócios (i)"), Funil ("Comercial ▾") e Filtro Pipedrive */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Contador de Negócios no Formato Pipedrive */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
            <span>
              <strong className="text-gray-900 font-bold">{totalNegocios}</strong>{' '}
              {totalNegocios === 1 ? 'negócio' : 'negócios'}
            </span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full transition-colors cursor-help"
                    aria-label="Informações sobre os negócios"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-xs">
                  Total de negócios em andamento no funil comercial comercial ativo.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Badge Funil Comercial (Padrão visual Pipedrive: [| Comercial ▾]) */}
          <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 shadow-2xs">
            <span>Comercial</span>
          </div>

          {/* Seletor de Filtro no formato Pipedrive */}
          <PipedriveFilterPopover
            usuarios={usuarios}
            usuarioAtual={usuarioAtual}
            filtroResponsavel={filtroResponsavel}
            onSelectResponsavel={onSelectResponsavel}
            filtroEstado={filtroEstado}
            onSelectFiltroEstado={onSelectFiltroEstado}
            totalGeral={totalNegocios}
          />
        </div>
      </div>
    </div>
  )
}
