import React from 'react'
import { Calendar, User, Trash2, CheckCircle2, Circle, Sun } from 'lucide-react'
import type { Atividade, AtividadeTipo } from '@/types/crm'
import { formatDateTime } from '@/lib/formatters'

export interface AtividadeItemProps {
  atividade: Atividade
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, currentStatus: string) => void
  onOpenDetalhes?: (atividade: Atividade) => void
  showClienteName?: boolean
}

import { getTipoAtividadeConfig } from '@/constants/atividadesTipos'
import { isAtividadeAutoLeitura } from '@/services/autoLeituraService'

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
  onOpenDetalhes,
  showClienteName,
}) => {
  const isAutoLeitura = isAtividadeAutoLeitura(atividade)
  const config = getAtividadeConfig(isAutoLeitura ? 'auto_leitura_rge' : atividade.tipo)

  const isConcluida = atividade.status === 'concluida'

  // Regra da tag verde: atividade filha de auto leitura RGE ou pendente
  const isAutoLeituraFilha =
    isAutoLeitura &&
    (atividade.titulo?.toLowerCase().includes('auto leitura rge -') ||
      /auto\s*leitura.*rge.*-.*\d{2}\/\d{2}\/\d{4}/i.test(atividade.titulo || ''))  const responsavel = atividade.responsavel_nome || atividade.autor

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
                onClick={(e) => {
                  e.stopPropagation()
                  if (isAutoLeitura && onOpenDetalhes) {
                    onOpenDetalhes(atividade)
                    return
                  }
                  onToggleStatus(atividade.id, atividade.status || 'pendente')
                }}
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
              <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                {atividade.expand.cliente_id.nome}
              </span>
            )}

            {/* Etiqueta de vínculo com a Usina */}
            {atividade.expand?.usina_id?.nome && (
              <span
                className="inline-flex items-center gap-1 font-bold text-[#0F2038] bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[160px]"
                title={`Vinculada à usina: ${atividade.expand.usina_id.nome}`}
              >
                <Sun className="w-3 h-3 text-[#E0A838] shrink-0" />
                <span className="truncate">{atividade.expand.usina_id.nome}</span>
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

        <div
          onClick={(e) => {
            if (onOpenDetalhes) {
              e.stopPropagation()
              onOpenDetalhes(atividade)
            }
          }}
          className={onOpenDetalhes ? 'cursor-pointer group/title' : ''}
        >
          {atividade.titulo && (
            <h4 className="text-xs font-bold text-gray-900 mb-1 leading-snug group-hover/title:text-emerald-700 transition-colors">
              {atividade.titulo}
            </h4>
          )}

          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
            {atividade.descricao}
          </p>
        </div>

        {isAutoLeitura && onOpenDetalhes && (
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] text-orange-800 bg-orange-50 font-semibold px-2 py-0.5 rounded border border-orange-200">
              Cronograma & Leitura RGE
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDetalhes(atividade)
              }}
              className="text-[11px] font-bold text-orange-700 hover:text-orange-900 hover:underline"
            >
              Abrir Cronograma e Requisitos →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
