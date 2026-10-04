import React from 'react'
import { Plus, ChevronDown, UserPlus, Briefcase } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PipedriveNovoNegocioSplitButtonProps {
  onNovoNegocio: () => void
  onNovoLead?: () => void
  disabled?: boolean
}

export const PipedriveNovoNegocioSplitButton: React.FC<PipedriveNovoNegocioSplitButtonProps> = ({
  onNovoNegocio,
  onNovoLead,
  disabled = false,
}) => {
  return (
    <div className="inline-flex rounded-md shadow-xs overflow-hidden border border-emerald-700 bg-[#16A34A] text-white">
      {/* Botão de Ação Principal: + Negócio */}
      <button
        type="button"
        onClick={onNovoNegocio}
        disabled={disabled}
        className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] transition-colors cursor-pointer select-none disabled:opacity-50"
        title="Criar novo negócio no funil comercial"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>Negócio</span>
      </button>

      {/* Seta Dropdown (Split Button) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="h-8 px-2 inline-flex items-center justify-center bg-[#15803D] hover:bg-[#166534] border-l border-emerald-700/50 transition-colors cursor-pointer text-white disabled:opacity-50"
            title="Mais opções de criação"
            aria-label="Mais opções de criação"
          >
            <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-48 rounded-lg shadow-lg border border-slate-200"
        >
          <DropdownMenuItem
            onClick={onNovoNegocio}
            className="text-xs font-medium cursor-pointer gap-2 py-2"
          >
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
            <span>Novo negócio</span>
          </DropdownMenuItem>
          {onNovoLead && (
            <DropdownMenuItem
              onClick={onNovoLead}
              className="text-xs font-medium cursor-pointer gap-2 py-2"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Novo lead</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
