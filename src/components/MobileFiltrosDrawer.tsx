import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Filter, Check, X, RotateCcw } from 'lucide-react'

export interface MobileFilterOption {
  id: string
  label: string
}

export interface MobileFilterGroup {
  id: string
  label: string
  options: MobileFilterOption[]
  selectedValue: string
  onChange: (val: string) => void
}

interface MobileFiltrosDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  groups?: MobileFilterGroup[]
  onClearAll?: () => void
  activeCount?: number
}

export const MobileFiltrosDrawer: React.FC<MobileFiltrosDrawerProps> = ({
  isOpen,
  onClose,
  title = 'Filtros da visualização',
  description = 'Refine e personalize a listagem de registros exibidos na tela.',
  groups = [],
  onClearAll,
  activeCount = 0,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-gray-100 bg-white shrink-0 flex flex-row items-center justify-between space-y-0 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span>{title}</span>
                {activeCount > 0 && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full">
                    {activeCount} ativo{activeCount > 1 ? 's' : ''}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-gray-500 line-clamp-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo com os grupos de filtros */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-400 space-y-1">
              <Filter className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-semibold text-gray-700">Filtros rápidos</p>
              <p className="text-[11px]">
                Nenhum filtro adicional configurado para esta aba no momento.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="space-y-1.5">
                <span className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.options.map((opt) => {
                    const isSelected = group.selectedValue === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => group.onChange(opt.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/80'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-white" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2 shrink-0">
          {onClearAll && activeCount > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-200/60 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Limpar filtros</span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors ml-auto"
          >
            Concluir
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MobileFiltrosDrawer
