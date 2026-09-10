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
  Plus,
  CalendarRange,
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
  onAddAtividadeDia?: (date: Date) => void
}

type CalendarViewMode = 'semana' | 'mes'

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_DA_SEMANA_COMPLETO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

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

// Helper para formatar data local no padrão YYYY-MM-DD
function toLocalDateKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Obter início da semana (Domingo) a partir de uma data
function getStartOfWeek(d: Date): Date {
  const result = new Date(d)
  const day = result.getDay() // 0 = Domingo
  result.setDate(result.getDate() - day)
  result.setHours(0, 0, 0, 0)
  return result
}

export const AtividadesCalendario: React.FC<AtividadesCalendarioProps> = ({
  atividades,
  usuarios,
  usuarioSelecionadoId,
  onSelectUsuario,
  onToggleStatus,
  onOpenCliente,
  onAddAtividadeDia,
}) => {
  // 1. Visualização PADRÃO deve ser SEMANAL
  const [viewMode, setViewMode] = useState<CalendarViewMode>('semana')
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [selectedDia, setSelectedDia] = useState<Date | null>(() => new Date())
  const [modalAtividade, setModalAtividade] = useState<Atividade | null>(null)

  // Mês e Ano atuais no visor para modo Mês
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Domingo da semana atual no visor
  const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate])

  // Navegação: anterior
  const handlePrev = () => {
    if (viewMode === 'semana') {
      const prevWeek = new Date(startOfWeek)
      prevWeek.setDate(prevWeek.getDate() - 7)
      setCurrentDate(prevWeek)
    } else {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    }
  }

  // Navegação: próxima
  const handleNext = () => {
    if (viewMode === 'semana') {
      const nextWeek = new Date(startOfWeek)
      nextWeek.setDate(nextWeek.getDate() + 7)
      setCurrentDate(nextWeek)
    } else {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    }
  }

  // Botão "Hoje"
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
        ) {
          return true
        }
        if (a.autor && a.autor.toLowerCase().includes(user.name.toLowerCase())) {
          return true
        }
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

  // Matriz dos 7 dias da semana atual
  const todayKey = toLocalDateKey(new Date())

  const weekDays = useMemo(() => {
    const days: {
      date: Date
      dateKey: string
      diaSemanaCurto: string
      diaSemanaCompleto: string
      diaDoMes: number
      isToday: boolean
      isSelected: boolean
    }[] = []

    const selectedKey = selectedDia ? toLocalDateKey(selectedDia) : ''

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      const dateKey = toLocalDateKey(d)
      days.push({
        date: d,
        dateKey,
        diaSemanaCurto: DIAS_DA_SEMANA[i],
        diaSemanaCompleto: DIAS_DA_SEMANA_COMPLETO[i],
        diaDoMes: d.getDate(),
        isToday: dateKey === todayKey,
        isSelected: dateKey === selectedKey,
      })
    }
    return days
  }, [startOfWeek, todayKey, selectedDia])

  // Label do período exibido no header
  const headerPeriodoLabel = useMemo(() => {
    if (viewMode === 'mes') {
      return `${MESES[currentMonth]} ${currentYear}`
    }

    const first = weekDays[0]?.date
    const last = weekDays[6]?.date
    if (!first || !last) return ''

    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} a ${last.getDate()} de ${MESES[first.getMonth()]} de ${first.getFullYear()}`
    }
    if (first.getFullYear() === last.getFullYear()) {
      return `${first.getDate()} de ${MESES[first.getMonth()].slice(0, 3)} - ${last.getDate()} de ${MESES[last.getMonth()].slice(0, 3)} de ${first.getFullYear()}`
    }
    return `${first.getDate()}/${first.getMonth() + 1}/${first.getFullYear()} - ${last.getDate()}/${last.getMonth() + 1}/${last.getFullYear()}`
  }, [viewMode, currentMonth, currentYear, weekDays])

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
      const dateKey = toLocalDateKey(d)
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        dateKey,
      })
    }

    // Dias do mês atual
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const d = new Date(currentYear, currentMonth, day)
      const dateKey = toLocalDateKey(d)
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        dateKey,
      })
    }

    // Completar até múltiplo de 7
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(currentYear, currentMonth + 1, i)
        const dateKey = toLocalDateKey(d)
        days.push({
          date: d,
          isCurrentMonth: false,
          isToday: dateKey === todayKey,
          dateKey,
        })
      }
    }

    return days
  }, [currentYear, currentMonth, todayKey])

  // Atividades do dia selecionado
  const selectedDiaKey = selectedDia ? toLocalDateKey(selectedDia) : ''
  const atividadesDiaSelecionado = useMemo(() => {
    if (!selectedDiaKey) return []
    return (atividadesPorData.get(selectedDiaKey) || []).sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    )
  }, [selectedDiaKey, atividadesPorData])

  // Total de atividades da semana atual
  const totalAtividadesSemana = useMemo(() => {
    let count = 0
    for (const d of weekDays) {
      count += (atividadesPorData.get(d.dateKey) || []).length
    }
    return count
  }, [weekDays, atividadesPorData])

  const usuarioAtivoNome = useMemo(() => {
    if (usuarioSelecionadoId === 'todos') return 'Todos os Usuários'
    const found = usuarios.find((u) => u.id === usuarioSelecionadoId)
    return found ? found.name : 'Usuário'
  }, [usuarioSelecionadoId, usuarios])

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
      {/* Top Header com Seletor Semana/Mês, navegação de data e seletor de usuário */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-white via-[#F8FAF9] to-white">
        {/* Título & Badge informativo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs shrink-0">
            {viewMode === 'semana' ? (
              <CalendarRange className="w-5 h-5 text-emerald-600" />
            ) : (
              <CalendarIcon className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                {viewMode === 'semana'
                  ? 'Calendário Semanal de Atividades'
                  : 'Calendário Mensal de Atividades'}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {viewMode === 'semana' ? `${totalAtividadesSemana} na semana` : 'Mês'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {viewMode === 'semana'
                ? 'Os 7 dias da semana lado a lado com suas atividades • '
                : 'Visão geral em grade mensal com indicadores diários • '}
              <span className="font-semibold text-emerald-700">{usuarioAtivoNome}</span>
            </p>
          </div>
        </div>

        {/* Controles: Seletor Semana/Mês + Navegação + Usuário + Hoje */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Seletor Segmentado: Semana vs Mês */}
          <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-xl border border-gray-200 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('semana')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'semana'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'mes'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>
          </div>

          {/* Seletor de usuário responsável */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs text-xs">
            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={usuarioSelecionadoId}
              onChange={(e) => onSelectUsuario(e.target.value)}
              className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer max-w-[150px] sm:max-w-none truncate"
            >
              <option value="todos">Todos os Responsáveis</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Navegação de Semana / Mês */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={viewMode === 'semana' ? 'Semana anterior' : 'Mês anterior'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-gray-800 px-2 min-w-[140px] sm:min-w-[180px] text-center truncate">
              {headerPeriodoLabel}
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={viewMode === 'semana' ? 'Próxima semana' : 'Próximo mês'}
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

      {/* ========================================================== */}
      {/* VISUALIZAÇÃO 1: SEMANAL (7 colunas lado a lado)             */}
      {/* ========================================================== */}
      {viewMode === 'semana' && (
        <div className="p-3 sm:p-5">
          {/* Scroll horizontal apenas em telas pequenas, no desktop grade de 7 colunas */}
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-cols-7 gap-2.5 sm:gap-3 min-w-[770px]">
              {weekDays.map((dia) => {
                const dayAtividades = (atividadesPorData.get(dia.dateKey) || []).sort(
                  (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
                )
                const count = dayAtividades.length
                const countConcluidas = dayAtividades.filter((a) => a.status === 'concluida').length
                const countPendentes = count - countConcluidas

                return (
                  <div
                    key={dia.dateKey}
                    onClick={() => setSelectedDia(dia.date)}
                    className={`flex flex-col rounded-2xl border transition-all cursor-pointer min-h-[360px] sm:min-h-[420px] bg-white ${
                      dia.isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md bg-emerald-50/15'
                        : dia.isToday
                          ? 'border-emerald-300 shadow-2xs bg-emerald-50/10'
                          : 'border-gray-200/80 hover:border-gray-300 hover:shadow-2xs'
                    }`}
                  >
                    {/* Cabeçalho do Dia */}
                    <div
                      className={`p-3 border-b rounded-t-2xl flex items-center justify-between transition-colors ${
                        dia.isToday
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-emerald-600'
                          : dia.isSelected
                            ? 'bg-emerald-100/70 border-emerald-200 text-emerald-950'
                            : 'bg-gray-50/80 border-gray-100 text-gray-800'
                      }`}
                    >
                      <div>
                        <div
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            dia.isToday
                              ? 'text-emerald-100'
                              : dia.isSelected
                                ? 'text-emerald-800'
                                : 'text-gray-500'
                          }`}
                        >
                          {dia.diaSemanaCurto}
                        </div>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span
                            className={`text-lg sm:text-xl font-extrabold leading-none ${
                              dia.isToday ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {dia.diaDoMes}
                          </span>
                          <span
                            className={`text-[10px] font-medium ${
                              dia.isToday ? 'text-emerald-100' : 'text-gray-400'
                            }`}
                          >
                            {MESES[dia.date.getMonth()].slice(0, 3)}
                          </span>
                        </div>
                      </div>

                      {/* Badges de contagem */}
                      <div className="flex flex-col items-end gap-1">
                        {dia.isToday && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-white text-emerald-700 shadow-2xs">
                            Hoje
                          </span>
                        )}
                        {count > 0 && (
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                              dia.isToday
                                ? 'bg-emerald-800 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                            title={`${countPendentes} pendentes, ${countConcluidas} concluídas`}
                          >
                            {count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lista de Atividades do Dia (Cards / Chips com Cor e Ícone do Tipo) */}
                    <div className="p-2 sm:p-2.5 flex-1 flex flex-col gap-2 overflow-y-auto max-h-[460px]">
                      {count === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-8 text-center text-gray-300">
                          <Clock className="w-5 h-5 mb-1.5 opacity-40 text-gray-400" />
                          <span className="text-[11px] font-medium text-gray-400">
                            Sem atividades
                          </span>
                          <span className="text-[10px] text-gray-400/80">Livre</span>
                        </div>
                      ) : (
                        dayAtividades.map((atv) => {
                          const conf = getTipoAtividadeConfig(atv.tipo)
                          const Icon = conf.icon
                          const isConcluida = atv.status === 'concluida'
                          const horaStr = atv.data ? atv.data.slice(11, 16) : ''

                          return (
                            <div
                              key={atv.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setModalAtividade(atv)
                              }}
                              className={`group relative text-left p-2 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-xs cursor-pointer ${
                                isConcluida
                                  ? 'bg-gray-50/90 border-gray-200 text-gray-500 opacity-75'
                                  : 'bg-white shadow-2xs hover:border-gray-400'
                              }`}
                              style={{
                                borderLeftWidth: '3.5px',
                                borderLeftColor: isConcluida ? '#9CA3AF' : conf.corHex,
                              }}
                              title={`${atv.titulo || conf.tituloPadrao} - ${atv.responsavel_nome || ''}`}
                            >
                              {/* Topo do chip: ícone + tipo + check */}
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <div
                                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                    style={{
                                      backgroundColor: isConcluida ? '#E5E7EB' : `${conf.corHex}18`,
                                      color: isConcluida ? '#6B7280' : conf.corHex,
                                    }}
                                  >
                                    <Icon className="w-3 h-3" />
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                                      isConcluida ? 'text-gray-400 line-through' : ''
                                    }`}
                                    style={{
                                      color: isConcluida ? undefined : conf.corHex,
                                    }}
                                  >
                                    {conf.tituloPadrao}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleStatus(atv.id, atv.status || 'pendente')
                                  }}
                                  className={`p-0.5 rounded transition-colors shrink-0 ${
                                    isConcluida
                                      ? 'text-emerald-600 hover:bg-emerald-50'
                                      : 'text-gray-300 hover:text-emerald-600 hover:bg-gray-100'
                                  }`}
                                  title={
                                    isConcluida ? 'Marcar como pendente' : 'Marcar como concluída'
                                  }
                                >
                                  {isConcluida ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>

                              {/* Título da atividade */}
                              <div
                                className={`text-xs font-semibold leading-snug line-clamp-2 ${
                                  isConcluida ? 'text-gray-400 line-through' : 'text-gray-900'
                                }`}
                              >
                                {atv.titulo || conf.tituloPadrao}
                              </div>

                              {/* Rodapé do chip: Horário + Cliente / Responsável */}
                              <div className="mt-1.5 pt-1 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 gap-1">
                                <span className="flex items-center gap-1 font-medium truncate text-gray-500">
                                  <Clock className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                                  <span>{horaStr ? `${horaStr}h` : 'Livre'}</span>
                                </span>

                                {atv.expand?.cliente_id ? (
                                  <span className="font-semibold text-emerald-800 truncate max-w-[80px]">
                                    {atv.expand.cliente_id.nome.split(' ')[0]}
                                  </span>
                                ) : atv.responsavel_nome ? (
                                  <span className="text-gray-600 truncate max-w-[80px]">
                                    {atv.responsavel_nome.split(' ')[0]}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Rodapé de cada coluna da semana: clique para focar ou adicionar */}
                    <div className="p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex items-center justify-between text-[10px] text-gray-400">
                      <span>{dia.diaSemanaCurto}</span>
                      {onAddAtividadeDia && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddAtividadeDia(dia.date)
                          }}
                          className="hover:text-emerald-700 flex items-center gap-0.5 font-semibold text-emerald-600 hover:underline"
                          title="Agendar neste dia"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Agendar</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legenda rápida da visão semanal */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Hoje em destaque verde</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Bordas coloridas pelos 12 tipos de atividade</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span>Riscado: atividade concluída</span>
              </span>
            </div>
            <span className="text-[11px] text-gray-400">
              Dica: clique em qualquer card para ver detalhes, concluir ou abrir a ficha do cliente.
            </span>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VISUALIZAÇÃO 2: MENSAL (Grade com indicadores + Lateral)   */}
      {/* ========================================================== */}
      {viewMode === 'mes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          {/* GRID DO MÊS (8 colunas no desktop) */}
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

          {/* PAINEL LATERAL: DETALHES DO DIA SELECIONADO (4 colunas) */}
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
      )}

      {/* Modal de detalhes rápidos ao clicar em uma pílula/card */}
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
