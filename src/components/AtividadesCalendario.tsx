import React, { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  Circle,
  Building,
  ArrowRight,
  Filter,
} from 'lucide-react'
import type { Atividade, SistemaUsuario } from '@/types/crm'
import { getTipoAtividadeConfig } from '@/constants/atividadesTipos'
import { formatDateTime } from '@/lib/formatters'

interface AtividadesCalendarioProps {
  atividades: Atividade[]
  usuarios: SistemaUsuario[]
  usuarioSelecionadoId: string
  onSelectUsuario: (id: string) => void
  onToggleStatus: (id: string, currentStatus: string) => void
  onOpenCliente: (clienteId: string) => void
}

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const AtividadesCalendario: React.FC<AtividadesCalendarioProps> = ({
  atividades,
  usuarios,
  usuarioSelecionadoId,
  onSelectUsuario,
  onToggleStatus,
  onOpenCliente,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDia, setSelectedDia] = useState<Date | null>(() => new Date())
  const [modalAtividade, setModalAtividade] = useState<Atividade | null>(null)

  // Mês e Ano atuais no visor
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDia(today)
  }

  // Filtrar atividades pelo usuário selecionado
  const atividadesDoUsuario = useMemo(() => {
    if (usuarioSelecionadoId === 'todos') {
      return atividades
    }
    return atividades.filter((a) => {
      if (a.responsavel_id === usuarioSelecionadoId) return true
      const user = usuarios.find((u) => u.id === usuarioSelecionadoId)
      if (user) {
        if (
          a.responsavel_nome &&
          a.responsavel_nome.toLowerCase().includes(user.name.toLowerCase())
        )
          return true
        if (a.autor && a.autor.toLowerCase().includes(user.name.toLowerCase())) return true
      }
      return false
    })
  }, [atividades, usuarioSelecionadoId, usuarios])

  // Agrupamento de atividades por data ISO YYYY-MM-DD
  const atividadesPorData = useMemo(() => {
    const map = new Map<string, Atividade[]>()
    for (const atv of atividadesDoUsuario) {
      if (!atv.data) continue
      const isoDate = atv.data.slice(0, 10)
      const list = map.get(isoDate) || []
      list.push(atv)
      map.set(isoDate, list)
    }
    return map
  }, [atividadesDoUsuario])

  // Matriz de dias para renderizar o mês no calendário (incluindo padding dos meses adjacentes)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()

    const days: {
      date: Date
      isCurrentMonth: boolean
      isToday: boolean
      dateKey: string
    }[] = []

    // Dias do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i)
      const dateKey = d.toISOString().slice(0, 10)
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        dateKey,
      })
    }

    // Dias do mês atual
    const todayStr = new Date().toISOString().slice(0, 10)
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const d = new Date(currentYear, currentMonth, day)
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        dateKey,
      })
    }

    // Completar até 35 ou 42 células (múltiplo de 7)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(currentYear, currentMonth + 1, i)
        const dateKey = d.toISOString().slice(0, 10)
        days.push({
          date: d,
          isCurrentMonth: false,
          isToday: false,
          dateKey,
        })
      }
    }

    return days
  }, [currentYear, currentMonth])

  // Atividades do dia selecionado
  const selectedDiaKey = selectedDia ? selectedDia.toISOString().slice(0, 10) : ''
  const atividadesDiaSelecionado = useMemo(() => {
    if (!selectedDiaKey) return []
    return (atividadesPorData.get(selectedDiaKey) || []).sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    )
  }, [selectedDiaKey, atividadesPorData])

  const usuarioAtivoNome = useMemo(() => {
    if (usuarioSelecionadoId === 'todos') return 'Todos os Usuários'
    const found = usuarios.find((u) => u.id === usuarioSelecionadoId)
    return found ? found.name : 'Usuário'
  }, [usuarioSelecionadoId, usuarios])

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
      {/* Top Header com navegação de mês e seletor de usuário */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-white via-[#F8FAF9] to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Calendário Mensal de Atividades
            </h3>
            <p className="text-xs text-gray-500">
              Visualização de compromissos por dia •{' '}
              <span className="font-semibold text-emerald-700">{usuarioAtivoNome}</span>
            </p>
          </div>
        </div>

        {/* Controles de mês e Usuário Responsável */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de usuário */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs text-xs">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={usuarioSelecionadoId}
              onChange={(e) => onSelectUsuario(e.target.value)}
              className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos os Responsáveis</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Navegação de Mês */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-gray-800 px-2 min-w-[120px] text-center">
              {MESES[currentMonth]} {currentYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-2xs"
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        {/* ========================================================== */}
        {/* GRID DO MÊS (8 colunas no desktop)                          */}
        {/* ========================================================== */}
        <div className="lg:col-span-8 p-3 sm:p-4 overflow-x-auto">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400">
            {DIAS_DA_SEMANA.map((dia, idx) => (
              <div
                key={dia}
                className={`py-1 ${idx === 0 || idx === 6 ? 'text-gray-400' : 'text-gray-600'}`}
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Células de Dias */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[500px]">
            {calendarDays.map((cell) => {
              const dayAtividades = atividadesPorData.get(cell.dateKey) || []
              const isSelected = selectedDiaKey === cell.dateKey
              const count = dayAtividades.length

              return (
                <div
                  key={cell.dateKey}
                  onClick={() => setSelectedDia(cell.date)}
                  className={`min-h-[82px] sm:min-h-[96px] p-1.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                      : cell.isCurrentMonth
                        ? 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                        : 'border-transparent bg-gray-50/50 opacity-50'
                  }`}
                >
                  {/* Número do dia e contador */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : cell.isCurrentMonth
                            ? 'text-gray-800'
                            : 'text-gray-400'
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {count > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                        {count}
                      </span>
                    )}
                  </div>

                  {/* Chips coloridos com ícones das atividades do dia */}
                  <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                    {dayAtividades.slice(0, 3).map((atv) => {
                      const conf = getTipoAtividadeConfig(atv.tipo)
                      const Icon = conf.icon
                      const isConcluida = atv.status === 'concluida'

                      return (
                        <div
                          key={atv.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setModalAtividade(atv)
                          }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate font-medium transition-transform hover:scale-[1.02] border ${
                            isConcluida
                              ? 'bg-gray-100 text-gray-500 line-through border-gray-200'
                              : 'shadow-2xs'
                          }`}
                          style={{
                            backgroundColor: isConcluida ? undefined : `${conf.corHex}15`,
                            color: isConcluida ? undefined : conf.corHex,
                            borderColor: isConcluida ? undefined : `${conf.corHex}40`,
                          }}
                          title={`${atv.titulo || conf.tituloPadrao} - ${atv.responsavel_nome || ''}`}
                        >
                          <Icon className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{atv.titulo || conf.tituloPadrao}</span>
                        </div>
                      )
                    })}

                    {count > 3 && (
                      <span className="text-[9px] font-bold text-gray-500 pl-1 block">
                        +{count - 3} mais...
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ========================================================== */}
        {/* PAINEL LATERAL: DETALHES DO DIA SELECIONADO (4 colunas)     */}
        {/* ========================================================== */}
        <div className="lg:col-span-4 p-4 sm:p-5 bg-gray-50/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 mb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Dia Selecionado
                </span>
                <h4 className="text-sm font-bold text-gray-900">
                  {selectedDia
                    ? `${selectedDia.getDate()} de ${MESES[selectedDia.getMonth()]} de ${selectedDia.getFullYear()}`
                    : 'Nenhum dia'}
                </h4>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {atividadesDiaSelecionado.length}{' '}
                {atividadesDiaSelecionado.length === 1 ? 'atividade' : 'atividades'}
              </span>
            </div>

            {/* Lista de atividades do dia selecionado */}
            {atividadesDiaSelecionado.length === 0 ? (
              <div className="py-8 text-center text-gray-400 space-y-2">
                <Clock className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-medium text-gray-500">
                  Nenhuma atividade agendada para este dia
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  Clique nos 12 ícones no topo da página para agendar uma tarefa para esta data.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {atividadesDiaSelecionado.map((atv) => {
                  const conf = getTipoAtividadeConfig(atv.tipo)
                  const Icon = conf.icon
                  const isConcluida = atv.status === 'concluida'
                  const horaStr = atv.data ? atv.data.slice(11, 16) : ''

                  return (
                    <div
                      key={atv.id}
                      className={`p-3 rounded-xl border bg-white shadow-2xs space-y-2 transition-all ${
                        isConcluida
                          ? 'border-gray-200 opacity-75'
                          : 'border-gray-200/90 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${conf.iconBg}`}
                            style={{ color: conf.corHex }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h5
                              className={`text-xs font-bold truncate ${
                                isConcluida ? 'text-gray-500 line-through' : 'text-gray-900'
                              }`}
                            >
                              {atv.titulo || conf.tituloPadrao}
                            </h5>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {horaStr ? `${horaStr}h` : 'Horário livre'}
                            </span>
                          </div>
                        </div>

                        {/* Botão de alternar status */}
                        <button
                          type="button"
                          onClick={() => onToggleStatus(atv.id, atv.status || 'pendente')}
                          className={`p-1 rounded-md transition-colors ${
                            isConcluida
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-100'
                          }`}
                          title={isConcluida ? 'Marcar como pendente' : 'Marcar como concluída'}
                        >
                          {isConcluida ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {atv.descricao && (
                        <p className="text-[11px] text-gray-600 line-clamp-2 pl-9">
                          {atv.descricao}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-500">
                        <div className="flex items-center gap-1 text-emerald-800 font-semibold truncate max-w-[140px]">
                          <User className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {atv.responsavel_nome || atv.autor || 'João Delfos'}
                          </span>
                        </div>

                        {atv.cliente_id && (
                          <button
                            type="button"
                            onClick={() => onOpenCliente(atv.cliente_id)}
                            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 hover:underline"
                          >
                            <span>Ficha</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200/80 text-[11px] text-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Verde: pendente no dia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Cinza: concluída
            </span>
          </div>
        </div>
      </div>

      {/* Modal simples de detalhes rápidos ao clicar em uma pílula */}
      {modalAtividade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setModalAtividade(null)}
          />
          <div className="relative z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 border border-gray-200 space-y-4 animate-in fade-in duration-150">
            {(() => {
              const conf = getTipoAtividadeConfig(modalAtividade.tipo)
              const Icon = conf.icon
              const isConcluida = modalAtividade.status === 'concluida'

              return (
                <>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${conf.iconBg}`}
                        style={{ color: conf.corHex }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${conf.badgeClass}`}
                        >
                          {conf.tituloPadrao}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                          {modalAtividade.titulo || conf.tituloPadrao}
                        </h4>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalAtividade(null)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2 text-xs text-gray-700">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatDateTime(modalAtividade.data)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        Responsável:{' '}
                        <strong>
                          {modalAtividade.responsavel_nome || modalAtividade.autor || 'João Delfos'}
                        </strong>
                      </span>
                    </div>

                    {modalAtividade.expand?.cliente_id && (
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          Cliente: <strong>{modalAtividade.expand.cliente_id.nome}</strong>
                        </span>
                      </div>
                    )}

                    {modalAtividade.descricao && (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Descrição
                        </span>
                        <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                          {modalAtividade.descricao}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleStatus(modalAtividade.id, modalAtividade.status || 'pendente')
                        setModalAtividade(null)
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        isConcluida
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {isConcluida ? (
                        <>
                          <Circle className="w-3.5 h-3.5" />
                          Reabrir como Pendente
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Concluir Atividade
                        </>
                      )}
                    </button>

                    {modalAtividade.cliente_id && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenCliente(modalAtividade.cliente_id)
                          setModalAtividade(null)
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        Ver Ficha do Cliente →
                      </button>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
