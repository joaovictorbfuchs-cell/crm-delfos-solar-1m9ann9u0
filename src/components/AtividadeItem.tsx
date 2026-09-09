import React from 'react'
import { Calendar, User, Trash2, CheckCircle2, Circle } from 'lucide-react'
import type { Atividade, AtividadeTipo } from '@/types/crm'
import { formatDateTime } from '@/lib/formatters'

export interface AtividadeItemProps {
  atividade: Atividade
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, currentStatus: string) => void
  showClienteName?: boolean
}

import { getTipoAtividadeConfig } from '@/constants/atividadesTipos'

export function getAtividadeConfig(tipo: AtividadeTipo | string) {
  const conf = getTipoAtividadeConfig(tipo)
  return {
    label: conf.tituloPadrao,
    badgeClass: conf.badgeClass,
    iconBg: conf.iconBg,
    icon: conf.icon,
    corHex: conf.corHex,
  }
}

export const AtividadeItem: React.FC<AtividadeItemProps> = ({
  atividade,
  onDelete,
  onToggleStatus,
  showClienteName,
}) => {
  const config = getAtividadeConfig(atividade.tipo)
  const Icon = config.icon
  const isConcluida = atividade.status === 'concluida'
  const responsavel = atividade.responsavel_nome || atividade.autor

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
      <div
        className={`bg-white rounded-xl border p-3.5 shadow-xs transition-all ${
          isConcluida
            ? 'border-gray-200 bg-gray-50/70 opacity-80'
            : 'border-gray-200/90 hover:border-emerald-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {onToggleStatus && atividade.tipo !== 'mudanca_estagio' && (
              <button
                type="button"
                onClick={() => onToggleStatus(atividade.id, atividade.status || 'pendente')}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                  isConcluida
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
                title={isConcluida ? 'Marcar como pendente' : 'Marcar como concluída'}
              >
                {isConcluida ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Concluída</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pendente</span>
                  </>
                )}
              </button>
            )}

            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${config.badgeClass} truncate max-w-[200px]`}
              title={config.label}
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
            {responsavel && (
              <div
                className="flex items-center text-[11px] text-gray-600 gap-1 bg-emerald-50/60 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200"
                title={`Responsável: ${responsavel}`}
              >
                <User className="w-3 h-3 text-emerald-600" />
                <span className="truncate max-w-[130px] font-medium">{responsavel}</span>
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
