import React, { useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  ArrowRight,
  Sparkles,
  CalendarCheck2,
  Clock,
  Loader2,
  Edit3,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { getTipoAtividadeConfig } from '@/constants/atividadesTipos'
import {
  categorizarAtividadesHojeEAtrasadas,
  getLocalDateString,
  getDaysOverdue,
  formatTimeOnly,
} from '@/lib/atividadesLembretes'
import { formatDate } from '@/lib/formatters'
import { ModalDetalhesAtividade } from '@/components/ModalDetalhesAtividade'
import type { Atividade } from '@/types/crm'

export const PainelLembretesHoje: React.FC = () => {
  const { atividades, updateAtividadeStatus, openFichaCliente } = useClientes()
  const [concluindoId, setConcluindoId] = useState<string | null>(null)
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<Atividade | null>(null)

  const todayStr = getLocalDateString()
  const { deHoje, atrasadas, todasPendentesHojeEAtrasadas, totalCount, temAtrasadas } =
    categorizarAtividadesHojeEAtrasadas(atividades, todayStr)

  // Mantém a atividade selecionada sincronizada com o estado global se ela for alterada
  const atividadeModalAtual = React.useMemo(() => {
    if (!atividadeSelecionada) return null
    return atividades.find((a) => a.id === atividadeSelecionada.id) || atividadeSelecionada
  }, [atividadeSelecionada, atividades])

  const handleConcluir = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      setConcluindoId(id)
      await updateAtividadeStatus(id, 'concluida')
    } catch (err) {
      console.error('Falha ao concluir atividade:', err)
    } finally {
      setConcluindoId(null)
    }
  }

  const handleCardClick = (atv: Atividade) => {
    setAtividadeSelecionada(atv)
  }

  const handleCloseModal = () => {
    setAtividadeSelecionada(null)
  }

  // Estado vazio amigável quando não há atividades hoje nem atrasadas
  if (totalCount === 0) {
    return (
      <>
        <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/40 rounded-xl p-4 sm:p-5 border border-emerald-100 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h3 className="text-sm font-bold text-emerald-950">Lembretes de Hoje (0)</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Tudo em dia
                  </span>
                </div>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Nenhuma atividade pendente para hoje nem atrasada 🎉 Bom trabalho!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-700/80 font-medium">
              <CalendarCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Fila limpa no momento</span>
            </div>
          </div>
        </div>

        <ModalDetalhesAtividade
          isOpen={Boolean(atividadeModalAtual)}
          onClose={handleCloseModal}
          atividade={atividadeModalAtual}
        />
      </>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden transition-all">
        {/* Header do Painel */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/70 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                temAtrasadas
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <CalendarClock className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                  Lembretes de Hoje
                  <span className="text-xs font-bold text-gray-500">({totalCount})</span>
                </h2>

                {temAtrasadas ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                    <AlertCircle className="w-3 h-3 text-amber-700" />
                    {atrasadas.length} atrasada{atrasadas.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {deHoje.length} para hoje
                  </span>
                )}
              </div>

              <p className="text-[11px] text-gray-500 mt-0.5">
                Clique em qualquer atividade para ver e editar os detalhes completos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-gray-500">
            <span className="hidden md:inline text-[11px] text-gray-400">
              Clique no item para editar ou no botão verde para concluir
            </span>
          </div>
        </div>

        {/* Lista de Atividades (Grid responsivo: 1 col no mobile/tablet, 2 col em telas maiores se tiver várias) */}
        <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
          {todasPendentesHojeEAtrasadas.map((atv) => (
            <LembreteCardItem
              key={atv.id}
              atividade={atv}
              todayStr={todayStr}
              isConcluindo={concluindoId === atv.id}
              onConcluir={() => handleConcluir(atv.id)}
              onOpenCliente={openFichaCliente}
              onClick={() => handleCardClick(atv)}
            />
          ))}
        </div>
      </div>

      {/* Modal de Detalhes e Edição da Atividade */}
      <ModalDetalhesAtividade
        isOpen={Boolean(atividadeModalAtual)}
        onClose={handleCloseModal}
        atividade={atividadeModalAtual}
      />
    </>
  )
}

interface LembreteCardItemProps {
  atividade: Atividade
  todayStr: string
  isConcluindo: boolean
  onConcluir: () => void
  onOpenCliente: (clienteId: string) => void
  onClick: () => void
}

const LembreteCardItem: React.FC<LembreteCardItemProps> = ({
  atividade,
  todayStr,
  isConcluindo,
  onConcluir,
  onOpenCliente,
  onClick,
}) => {
  const conf = getTipoAtividadeConfig(atividade.tipo)
  const Icon = conf.icon

  const diasAtraso = getDaysOverdue(atividade.data || atividade.created, todayStr)
  const isAtrasada = diasAtraso > 0
  const timeStr = formatTimeOnly(atividade.data)
  const dateStr = formatDate(atividade.data)

  const responsavel =
    atividade.responsavel_nome ||
    atividade.expand?.responsavel_id?.name ||
    atividade.autor ||
    'Não atribuído'

  const respInitial = responsavel.charAt(0).toUpperCase()
  const clienteNome = atividade.expand?.cliente_id?.nome

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`relative flex flex-col justify-between rounded-xl border p-3.5 transition-all group cursor-pointer text-left select-none ${
        isAtrasada
          ? 'bg-rose-50/25 border-rose-200 hover:border-rose-400 hover:shadow-md hover:bg-rose-50/40'
          : 'bg-white border-gray-200 hover:border-emerald-400 hover:shadow-md hover:bg-emerald-50/10'
      }`}
    >
      <div>
        {/* Cabeçalho do Card: Tipo da atividade + Badge de Prazo + Botão Concluir */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Ícone e Tipo */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs ${conf.iconBg}`}
              title={conf.tituloPadrao}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>

            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border truncate max-w-[150px] sm:max-w-[190px] ${conf.badgeClass}`}
            >
              {conf.tituloPadrao}
            </span>

            {/* Badge Hoje vs Atrasada */}
            {isAtrasada ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100/90 border border-rose-300/80 px-2 py-0.5 rounded-full shrink-0">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Atrasada há {diasAtraso} dia{diasAtraso > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                <Clock className="w-3 h-3 text-emerald-700" />
                Hoje
              </span>
            )}
          </div>

          {/* Ações à direita: Ícone de edição + Botão Concluir 1 clique */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-[10px] text-gray-400 group-hover:text-emerald-700 flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium transition-colors"
              title="Clique para editar detalhes"
            >
              <Edit3 className="w-3 h-3" />
              <span className="hidden sm:inline">Editar</span>
            </span>

            {/* Botão de 1 clique para Concluir */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onConcluir()
              }}
              disabled={isConcluindo}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-[#16A34A] border border-emerald-200 hover:border-[#16A34A] rounded-lg transition-all shrink-0 active:scale-95 disabled:opacity-50"
              title="Marcar como concluída"
            >
              {isConcluindo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Concluir</span>
            </button>
          </div>
        </div>

        {/* Título da Atividade */}
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug group-hover:text-emerald-950 transition-colors">
          {atividade.titulo || conf.tituloPadrao}
        </h4>

        {/* Descrição se houver */}
        {atividade.descricao && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
            {atividade.descricao}
          </p>
        )}
      </div>

      {/* Rodapé do Card: Cliente + Responsável + Horário */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Cliente vinculado */}
        <div className="flex items-center gap-1.5 min-w-0">
          {atividade.cliente_id ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenCliente(atividade.cliente_id)
              }}
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors max-w-[200px] truncate group-hover:border-emerald-300"
              title="Abrir ficha do cliente"
            >
              <Building className="w-3 h-3 shrink-0" />
              <span className="truncate">{clienteNome || 'Ver cliente'}</span>
              <ArrowRight className="w-2.5 h-2.5 shrink-0 opacity-70" />
            </button>
          ) : (
            <span className="text-gray-400 italic">Sem cliente vinculado</span>
          )}
        </div>

        {/* Responsável + Data/Hora */}
        <div className="flex items-center gap-2.5 ml-auto text-gray-600">
          {/* Avatar / Inicial do Responsável */}
          <div
            className="flex items-center gap-1.5 bg-gray-100/90 text-gray-800 px-2 py-0.5 rounded-md border border-gray-200"
            title={`Responsável: ${responsavel}`}
          >
            <div className="w-4 h-4 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-[9px] shrink-0">
              {respInitial}
            </div>
            <span className="font-medium truncate max-w-[100px]">{responsavel}</span>
          </div>

          {/* Horário */}
          <div
            className={`flex items-center gap-1 font-medium ${
              isAtrasada ? 'text-rose-700 font-semibold' : 'text-gray-500'
            }`}
            title={`Data prevista: ${dateStr}${timeStr ? ` às ${timeStr}` : ''}`}
          >
            <Clock className="w-3 h-3 text-gray-400" />
            <span>{isAtrasada ? dateStr : timeStr ? `${timeStr}h` : 'Hoje'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
