import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Building,
  Clock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { getTipoAtividadeConfig } from '@/constants/atividadesTipos'
import {
  categorizarAtividadesHojeEAtrasadas,
  getLocalDateString,
  getDaysOverdue,
  formatTimeOnly,
} from '@/lib/atividadesLembretes'
import { formatDate } from '@/lib/formatters'

export const NotificacoesBell: React.FC = () => {
  const { atividades, updateAtividadeStatus, openFichaCliente } = useClientes()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [concluindoId, setConcluindoId] = useState<string | null>(null)

  const todayStr = getLocalDateString()

  // Filtrar apenas atividades atribuídas ao usuário logado (ou todas se não autenticado / sem id)
  const atividadesDoUsuario = React.useMemo(() => {
    if (!user?.id) return atividades
    return atividades.filter((atv) => {
      if (atv.responsavel_id === user.id) return true
      if (user.name && atv.responsavel_nome?.toLowerCase().includes(user.name.toLowerCase())) {
        return true
      }
      return false
    })
  }, [atividades, user?.id, user?.name])

  const { deHoje, atrasadas, todasPendentesHojeEAtrasadas, totalCount, temAtrasadas } =
    categorizarAtividadesHojeEAtrasadas(atividadesDoUsuario, todayStr)

  const handleConcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setConcluindoId(id)
      await updateAtividadeStatus(id, 'concluida')
    } catch (err) {
      console.error('Falha ao concluir atividade pelo sino:', err)
    } finally {
      setConcluindoId(null)
    }
  }

  const handleVerDashboard = () => {
    setOpen(false)
    navigate('/')
  }

  const handleOpenCliente = (clienteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    openFichaCliente(clienteId)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          title={
            totalCount > 0
              ? `${totalCount} lembrete${totalCount > 1 ? 's' : ''} pendente${totalCount > 1 ? 's' : ''} para hoje`
              : 'Nenhum lembrete pendente'
          }
          aria-label="Notificações e lembretes"
        >
          <Bell className="w-5 h-5" />

          {/* Badge de contagem sobre o sino */}
          {totalCount > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center text-white border-2 border-white shadow-2xs ${
                temAtrasadas ? 'bg-amber-500 animate-pulse' : 'bg-[#16A34A]'
              }`}
            >
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-xl rounded-2xl border-gray-200/90 bg-white overflow-hidden"
      >
        {/* Header do Popover */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                temAtrasadas
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 leading-tight">Lembretes do Dia</h3>
              <p className="text-[10px] text-gray-500">
                {user?.name ? `Minhas pendências (${user.name})` : 'Pendências de hoje'}
              </p>
            </div>
          </div>

          {totalCount > 0 && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                temAtrasadas
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {totalCount} {totalCount === 1 ? 'tarefa' : 'tarefas'}
            </span>
          )}
        </div>

        {/* Lista de Atividades */}
        {totalCount === 0 ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-800">Tudo em dia por aqui! 🎉</p>
            <p className="text-[11px] text-gray-500 max-w-[220px] mx-auto">
              Você não possui atividades pendentes para hoje nem atrasadas.
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 p-1">
            {todasPendentesHojeEAtrasadas.map((atv) => {
              const conf = getTipoAtividadeConfig(atv.tipo)
              const Icon = conf.icon
              const diasAtraso = getDaysOverdue(atv.data || atv.created, todayStr)
              const isAtrasada = diasAtraso > 0
              const timeStr = formatTimeOnly(atv.data)
              const dateStr = formatDate(atv.data)
              const clienteNome = atv.expand?.cliente_id?.nome

              return (
                <div
                  key={atv.id}
                  className={`p-2.5 rounded-xl transition-colors space-y-1.5 ${
                    isAtrasada ? 'hover:bg-rose-50/40' : 'hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${conf.iconBg}`}
                        title={conf.tituloPadrao}
                      >
                        <Icon className="w-3 h-3" />
                      </div>

                      <span
                        className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border truncate max-w-[130px] ${conf.badgeClass}`}
                      >
                        {conf.tituloPadrao}
                      </span>

                      {isAtrasada ? (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100/90 px-1.5 py-0.2 rounded border border-rose-200 shrink-0">
                          {diasAtraso}d atrás
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                          Hoje
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleConcluir(atv.id, e)}
                      disabled={concluindoId === atv.id}
                      className="text-[10px] font-semibold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-[#16A34A] border border-emerald-200 hover:border-[#16A34A] px-2 py-0.5 rounded transition-all shrink-0 active:scale-95 disabled:opacity-50 inline-flex items-center gap-1"
                      title="Concluir atividade"
                    >
                      {concluindoId === atv.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>OK</span>
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-gray-900 leading-snug">
                    {atv.titulo || conf.tituloPadrao}
                  </h4>

                  {atv.descricao && (
                    <p className="text-[11px] text-gray-600 line-clamp-1">{atv.descricao}</p>
                  )}

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-gray-100 text-gray-500">
                    {atv.cliente_id ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenCliente(atv.cliente_id, e)}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold max-w-[170px] truncate"
                      >
                        <Building className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{clienteNome || 'Ver cliente'}</span>
                      </button>
                    ) : (
                      <span className="text-gray-400 italic">Sem cliente</span>
                    )}

                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-gray-400" />
                      <span>{isAtrasada ? dateStr : timeStr ? `${timeStr}h` : 'Hoje'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Rodapé com link para ver no dashboard */}
        <div className="p-2 border-t border-gray-100 bg-gray-50/70 text-center">
          <button
            type="button"
            onClick={handleVerDashboard}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <span>Ver painel completo no Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
