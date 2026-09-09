import React from 'react'
import {
  FileText,
  PhoneCall,
  Users,
  Send,
  Wrench,
  ArrowRightLeft,
  Calendar,
  Clock,
  User,
  Trash2,
} from 'lucide-react'
import type { Atividade, AtividadeTipo } from '@/types/crm'
import { formatDateTime } from '@/lib/formatters'

export interface AtividadeItemProps {
  atividade: Atividade
  onDelete?: (id: string) => void
  showClienteName?: boolean
}

export function getAtividadeConfig(tipo: AtividadeTipo | string) {
  switch (tipo) {
    case 'anotacao':
      return {
        label: 'Anotação',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: FileText,
      }
    case 'ligacao':
      return {
        label: 'Ligação',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: PhoneCall,
      }
    case 'reuniao':
      return {
        label: 'Reunião',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: Users,
      }
    case 'proposta':
      return {
        label: 'Proposta Comercial',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: Send,
      }
    case 'visita_tecnica':
      return {
        label: 'Visita Técnica / O.S.',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        iconBg: 'bg-teal-100 text-teal-800 border-teal-200',
        icon: Wrench,
      }
    case 'mudanca_estagio':
      return {
        label: 'Mudança de Estágio',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: ArrowRightLeft,
      }
    default:
      return {
        label: 'Atividade',
        badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
        iconBg: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: Clock,
      }
  }
}

export const AtividadeItem: React.FC<AtividadeItemProps> = ({
  atividade,
  onDelete,
  showClienteName,
}) => {
  const config = getAtividadeConfig(atividade.tipo)
  const Icon = config.icon

  return (
    <div className="relative pl-7 pb-5 group">
      {/* Linha vertical conectora */}
      <span
        className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-gray-200 group-last:hidden"
        aria-hidden="true"
      />

      {/* Marcador com ícone visual */}
      <div
        className={`absolute left-0 top-0.5 w-7 h-7 rounded-full flex items-center justify-center border shadow-xs ${config.iconBg}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* Conteúdo do Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-3.5 shadow-xs hover:border-emerald-300 transition-all">
        <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${config.badgeClass}`}
            >
              {config.label}
            </span>

            {showClienteName && atividade.expand?.cliente_id && (
              <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                {atividade.expand.cliente_id.nome}
              </span>
            )}

            <div className="flex items-center text-[11px] text-gray-500 gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span>{formatDateTime(atividade.data || atividade.created)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {atividade.autor && (
              <div className="flex items-center text-[11px] text-gray-500 gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                <User className="w-3 h-3 text-gray-400" />
                <span className="truncate max-w-[120px]">{atividade.autor}</span>
              </div>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(atividade.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                title="Excluir atividade"
                aria-label="Excluir atividade"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {atividade.titulo && (
          <h4 className="text-xs font-bold text-gray-900 mb-1 leading-snug">{atividade.titulo}</h4>
        )}

        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
          {atividade.descricao}
        </p>
      </div>
    </div>
  )
}
