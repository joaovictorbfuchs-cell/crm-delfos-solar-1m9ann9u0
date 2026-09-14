import React, { useState, useMemo } from 'react'
import { OrdemServico, OSTipoServico } from '@/types/crm'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/formatters'

interface CalendarioExecucaoOSProps {
  ordens: OrdemServico[]
  onSelectOS: (os: OrdemServico) => void
  isInstalador?: boolean
  instaladorNome?: string
}

// Configurações de cores por tipo de serviço
// Requisito:
// - Limpeza: VERDE
// - Manutenção: AMARELO
// - Instalação: AZUL
// - Garantia: LARANJA
// - Configuração de datalogger: ROXO
export const TIPO_SERVICO_CORES: Record<
  OSTipoServico | string,
  {
    nome: string
    borderClass: string
    borderColor: string
    bgLightClass: string
    bgBadgeClass: string
    textClass: string
    hex: string
    pillBg: string
  }
> = {
  Limpeza: {
    nome: 'Limpeza',
    borderClass: 'border-l-emerald-500',
    borderColor: '#10B981',
    bgLightClass: 'bg-emerald-50/70 hover:bg-emerald-100/80',
    bgBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    textClass: 'text-emerald-800',
    hex: '#10B981',
    pillBg: 'rgba(16, 185, 129, 0.12)',
  },
  Manutenção: {
    nome: 'Manutenção',
    borderClass: 'border-l-amber-500',
    borderColor: '#F59E0B',
    bgLightClass: 'bg-amber-50/70 hover:bg-amber-100/80',
    bgBadgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    textClass: 'text-amber-800',
    hex: '#F59E0B',
    pillBg: 'rgba(245, 158, 11, 0.14)',
  },
  Instalação: {
    nome: 'Instalação',
    borderClass: 'border-l-blue-500',
    borderColor: '#3B82F6',
    bgLightClass: 'bg-blue-50/70 hover:bg-blue-100/80',
    bgBadgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    textClass: 'text-blue-800',
    hex: '#3B82F6',
    pillBg: 'rgba(59, 130, 246, 0.12)',
  },
  Garantia: {
    nome: 'Garantia',
    borderClass: 'border-l-orange-500',
    borderColor: '#F97316',
    bgLightClass: 'bg-orange-50/70 hover:bg-orange-100/80',
    bgBadgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    textClass: 'text-orange-800',
    hex: '#F97316',
    pillBg: 'rgba(249, 115, 22, 0.14)',
  },
  'Configuração de Datalogger': {
    nome: 'Configuração de Datalogger',
    borderClass: 'border-l-purple-500',
    borderColor: '#A855F7',
    bgLightClass: 'bg-purple-50/70 hover:bg-purple-100/80',
    bgBadgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    textClass: 'text-purple-800',
    hex: '#A855F7',
    pillBg: 'rgba(168, 85, 247, 0.14)',
  },
}

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

const DIAS_SEMANA_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Formata chave YYYY-MM-DD
function getLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Extrai horário HH:mm da string de data UTC/ISO
function extractHorario(dateString?: string): string {
  if (!dateString) return '--:--'
  try {
    const d = new Date(dateString)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } catch (_) {
    return '--:--'
  }
}

export type CalendarioOSViewMode = 'mes' | 'semana' | 'dia'

// Helper para obter o domingo inicial de uma semana
function getStartOfWeekDate(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Domingo
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export function CalendarioExecucaoOS({
  ordens,
  onSelectOS,
  isInstalador,
  instaladorNome,
}: CalendarioExecucaoOSProps) {
  const now = new Date()
  const [viewMode, setViewMode] = useState<CalendarioOSViewMode>('mes')
  const [currentDate, setCurrentDate] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth(), 1),
  )
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(getLocalDateKey(now))

  // Data base para visão Dia (se tiver selectedDayKey, converte; senão hoje)
  const selectedDayDate = useMemo(() => {
    if (!selectedDayKey) return new Date()
    const [y, m, d] = selectedDayKey.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [selectedDayKey])

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Início da semana atual baseado na currentDate
  const startOfWeek = useMemo(() => getStartOfWeekDate(currentDate), [currentDate])

  // Navegação: anterior
  const handlePrev = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    } else if (viewMode === 'semana') {
      const prevWeek = new Date(startOfWeek)
      prevWeek.setDate(prevWeek.getDate() - 7)
      setCurrentDate(prevWeek)
      // Ajusta o dia selecionado se estiver fora da nova semana
      const newSelected = new Date(prevWeek)
      setSelectedDayKey(getLocalDateKey(newSelected))
    } else {
      // Visão dia: retrocede 1 dia
      const prevDay = new Date(selectedDayDate)
      prevDay.setDate(prevDay.getDate() - 1)
      setSelectedDayKey(getLocalDateKey(prevDay))
      setCurrentDate(prevDay)
    }
  }

  // Navegação: atual / hoje
  const handleCurrent = () => {
    const today = new Date()
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    setSelectedDayKey(getLocalDateKey(today))
  }

  // Navegação: próxima
  const handleNext = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    } else if (viewMode === 'semana') {
      const nextWeek = new Date(startOfWeek)
      nextWeek.setDate(nextWeek.getDate() + 7)
      setCurrentDate(nextWeek)
      const newSelected = new Date(nextWeek)
      setSelectedDayKey(getLocalDateKey(newSelected))
    } else {
      // Visão dia: avança 1 dia
      const nextDay = new Date(selectedDayDate)
      nextDay.setDate(nextDay.getDate() + 1)
      setSelectedDayKey(getLocalDateKey(nextDay))
      setCurrentDate(nextDay)
    }
  }

  // Mantém compatibilidade com handlers antigos
  const handlePrevMonth = handlePrev
  const handleCurrentMonth = handleCurrent
  const handleNextMonth = handleNext

  // Agrupar ordens por chave de data (YYYY-MM-DD)
  const ordensPorDia = useMemo(() => {
    const map = new Map<string, OrdemServico[]>()
    for (const os of ordens) {
      if (!os.data_agendada) continue
      try {
        const d = new Date(os.data_agendada)
        const key = getLocalDateKey(d)
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key)!.push(os)
      } catch (_) {
        // Ignora datas inválidas
      }
    }
    // Ordenar as OS de cada dia por horário
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => new Date(a.data_agendada).getTime() - new Date(b.data_agendada).getTime())
    }
    return map
  }, [ordens])

  // Matriz de dias para o calendário (7 colunas, domingo a sábado)
  const todayKey = getLocalDateKey(new Date())

  // Dias da semana corrente para visão semanal
  const weekDays = useMemo(() => {
    const days: {
      date: Date
      dayNumber: number
      diaSemanaCurto: string
      diaSemanaCompleto: string
      isCurrentMonth: boolean
      isToday: boolean
      dateKey: string
    }[] = []

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      const dateKey = getLocalDateKey(d)
      days.push({
        date: d,
        dayNumber: d.getDate(),
        diaSemanaCurto: DIAS_SEMANA_NOMES[i],
        diaSemanaCompleto: [
          'Domingo',
          'Segunda-feira',
          'Terça-feira',
          'Quarta-feira',
          'Quinta-feira',
          'Sexta-feira',
          'Sábado',
        ][i],
        isCurrentMonth: d.getMonth() === currentMonth,
        isToday: dateKey === todayKey,
        dateKey,
      })
    }
    return days
  }, [startOfWeek, currentMonth, todayKey])

  // Contagem de OS no período exibido (mês / semana / dia)
  const totalNoPeriodoExibido = useMemo(() => {
    if (viewMode === 'mes') {
      let count = 0
      const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
      for (const [key, list] of ordensPorDia.entries()) {
        if (key.startsWith(prefix)) {
          count += list.length
        }
      }
      return count
    } else if (viewMode === 'semana') {
      let count = 0
      for (const d of weekDays) {
        count += (ordensPorDia.get(d.dateKey) || []).length
      }
      return count
    } else {
      // Visão Dia
      if (!selectedDayKey) return 0
      return (ordensPorDia.get(selectedDayKey) || []).length
    }
  }, [viewMode, currentYear, currentMonth, ordensPorDia, weekDays, selectedDayKey])

  // Rótulo textual do período para o header
  const headerPeriodoTexto = useMemo(() => {
    if (viewMode === 'mes') {
      return `${MESES[currentMonth]} ${currentYear}`
    } else if (viewMode === 'semana') {
      const first = weekDays[0]?.date
      const last = weekDays[6]?.date
      if (!first || !last) return ''
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()}–${last.getDate()} de ${MESES[first.getMonth()]} de ${first.getFullYear()}`
      }
      if (first.getFullYear() === last.getFullYear()) {
        return `${first.getDate()} de ${MESES[first.getMonth()]} – ${last.getDate()} de ${MESES[last.getMonth()]} de ${first.getFullYear()}`
      }
      return `${first.getDate()}/${first.getMonth() + 1}/${first.getFullYear()} – ${last.getDate()}/${last.getMonth() + 1}/${last.getFullYear()}`
    } else {
      // Visão Dia
      const d = selectedDayDate
      const dia = d.getDate()
      const mes = MESES[d.getMonth()]
      const ano = d.getFullYear()
      return `${dia} de ${mes} de ${ano}`
    }
  }, [viewMode, currentMonth, currentYear, weekDays, selectedDayDate])

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() // 0 = Domingo
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()

    const days: {
      date: Date
      dayNumber: number
      isCurrentMonth: boolean
      isToday: boolean
      dateKey: string
    }[] = []

    // Preenchimento dos dias do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i)
      const dateKey = getLocalDateKey(d)
      days.push({
        date: d,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        dateKey,
      })
    }

    // Dias do mês atual
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const d = new Date(currentYear, currentMonth, day)
      const dateKey = getLocalDateKey(d)
      days.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        dateKey,
      })
    }

    // Preenchimento até completar semanas inteiras (múltiplo de 7)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(currentYear, currentMonth + 1, i)
        const dateKey = getLocalDateKey(d)
        days.push({
          date: d,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: dateKey === todayKey,
          dateKey,
        })
      }
    }

    return days
  }, [currentYear, currentMonth, todayKey])

  // OS do dia selecionado (para detalhamento em gaveta/lista abaixo em mobile)
  const ordensDiaSelecionado = useMemo(() => {
    if (!selectedDayKey) return []
    return ordensPorDia.get(selectedDayKey) || []
  }, [selectedDayKey, ordensPorDia])

  const diaSelecionadoFormatado = useMemo(() => {
    if (!selectedDayKey) return ''
    const parts = selectedDayKey.split('-')
    if (parts.length !== 3) return selectedDayKey
    const dia = parseInt(parts[2], 10)
    const mes = parseInt(parts[1], 10) - 1
    const ano = parseInt(parts[0], 10)
    return `${dia} de ${MESES[mes]} de ${ano}`
  }, [selectedDayKey])

  return (
    <div className="space-y-4">
      {/* Barra Superior de Navegação do Calendário */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                {headerPeriodoTexto}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {totalNoPeriodoExibido}{' '}
                {totalNoPeriodoExibido === 1 ? 'OS agendada' : 'OSs agendadas'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {isInstalador
                ? `Exibindo ordens atribuídas a ${instaladorNome || 'você'}`
                : 'Visão de todas as ordens de serviço da equipe'}
            </p>
          </div>
        </div>

        {/* Controles: Seletor Mês / Semana / Dia + Botões de Navegação */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Seletor Segmentado: Mês | Semana | Dia */}
          <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-xl border border-gray-200 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('mes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'mes'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <span>Mês</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('semana')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'semana'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <span>Semana</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('dia')
                if (!selectedDayKey) {
                  setSelectedDayKey(getLocalDateKey(new Date()))
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'dia'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <span>Dia</span>
            </button>
          </div>

          {/* Botões de Navegação adaptados ao modo (Mês / Semana / Dia) */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrev}
              className="h-9 px-2.5 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1"
              title={
                viewMode === 'mes'
                  ? 'Mês anterior'
                  : viewMode === 'semana'
                    ? 'Semana anterior'
                    : 'Dia anterior'
              }
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">
                {viewMode === 'mes'
                  ? 'Mês anterior'
                  : viewMode === 'semana'
                    ? 'Semana anterior'
                    : 'Dia anterior'}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCurrent}
              className="h-9 px-3 rounded-xl border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs"
              title={
                viewMode === 'mes'
                  ? 'Voltar para o mês corrente'
                  : viewMode === 'semana'
                    ? 'Semana atual'
                    : 'Hoje'
              }
            >
              {viewMode === 'mes' ? 'Mês atual' : viewMode === 'semana' ? 'Semana atual' : 'Hoje'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="h-9 px-2.5 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1"
              title={
                viewMode === 'mes'
                  ? 'Próximo mês'
                  : viewMode === 'semana'
                    ? 'Próxima semana'
                    : 'Próximo dia'
              }
            >
              <span className="hidden xs:inline sm:inline">
                {viewMode === 'mes'
                  ? 'Próximo mês'
                  : viewMode === 'semana'
                    ? 'Próxima semana'
                    : 'Próximo dia'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legenda de Cores por Tipo de Serviço */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-2xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
          Legenda por Tipo de Serviço:
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {Object.entries(TIPO_SERVICO_CORES).map(([tipo, config]) => (
            <div
              key={tipo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
              style={{
                borderColor: `${config.borderColor}50`,
                backgroundColor: config.pillBg,
                color: config.hex,
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.hex }} />
              <span>{config.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================== */}
      {/* VISÃO 1: MÊS (Grade com 7 colunas, domingo a sábado)        */}
      {/* ========================================================== */}
      {viewMode === 'mes' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            {/* Cabeçalho dos Dias da Semana */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80 text-center text-xs font-bold text-gray-600">
              {DIAS_SEMANA_NOMES.map((nome, index) => (
                <div
                  key={nome}
                  className={`py-2.5 sm:py-3 uppercase tracking-wider text-[11px] sm:text-xs ${
                    index === 0 || index === 6 ? 'text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {nome}
                </div>
              ))}
            </div>

            {/* Grade de Dias */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-200/70 border-b border-gray-200/70">
              {calendarDays.map((cell) => {
                const dayOrdens = ordensPorDia.get(cell.dateKey) || []
                const hasOrdens = dayOrdens.length > 0
                const isSelected = selectedDayKey === cell.dateKey

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => setSelectedDayKey(cell.dateKey)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedDayKey(cell.dateKey)
                      }
                    }}
                    className={`min-h-[105px] sm:min-h-[135px] md:min-h-[150px] p-1.5 sm:p-2 flex flex-col justify-between transition-all cursor-pointer relative ${
                      !cell.isCurrentMonth
                        ? 'bg-gray-50/50 opacity-45'
                        : cell.isToday
                          ? 'bg-emerald-50/30 ring-2 ring-emerald-500/40 ring-inset'
                          : isSelected
                            ? 'bg-emerald-50/20 ring-1 ring-emerald-400 ring-inset'
                            : 'bg-white hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Número do Dia + Indicador de Hoje / Badge Contagem */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`inline-flex items-center justify-center text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-transform ${
                          cell.isToday
                            ? 'bg-[#166534] text-white shadow-2xs font-extrabold'
                            : isSelected
                              ? 'bg-emerald-100 text-emerald-900 font-bold'
                              : cell.isCurrentMonth
                                ? 'text-gray-800'
                                : 'text-gray-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {cell.isToday && (
                        <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Hoje
                        </span>
                      )}

                      {hasOrdens && (
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            cell.isToday
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                          title={`${dayOrdens.length} ordem(ns) neste dia`}
                        >
                          {dayOrdens.length}
                        </span>
                      )}
                    </div>

                    {/* Cards compactos com as OSs do Dia */}
                    <div className="flex-1 space-y-1 sm:space-y-1.5 overflow-hidden">
                      {dayOrdens.slice(0, 3).map((os) => {
                        const tipoConfig =
                          TIPO_SERVICO_CORES[os.tipo_servico] || TIPO_SERVICO_CORES['Manutenção']
                        const horario = extractHorario(os.data_agendada)
                        const clienteNome =
                          os.expand?.cliente_id?.nome ||
                          os.expand?.cliente_id?.razao_social ||
                          'Cliente Solar'

                        return (
                          <div
                            key={os.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectOS(os)
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation()
                                onSelectOS(os)
                              }
                            }}
                            style={{
                              borderLeftWidth: '3.5px',
                              borderLeftColor: tipoConfig.borderColor,
                              backgroundColor: tipoConfig.pillBg,
                            }}
                            className="p-1 sm:p-1.5 rounded-md border border-gray-200/70 text-left transition-all hover:scale-[1.02] hover:shadow-xs group cursor-pointer"
                            title={`${horario} • ${clienteNome} (${os.tipo_servico}) - Clique para abrir a ficha de execução`}
                          >
                            {/* Horário + Tipo (com cor) */}
                            <div className="flex items-center justify-between gap-1 leading-none mb-0.5">
                              <span className="text-[10px] sm:text-[11px] font-bold text-gray-900 flex items-center gap-0.5 shrink-0">
                                <Clock className="w-2.5 h-2.5 text-gray-500" />
                                {horario}
                              </span>
                              <span
                                className="text-[9px] font-extrabold uppercase truncate tracking-wider"
                                style={{ color: tipoConfig.hex }}
                              >
                                {os.tipo_servico}
                              </span>
                            </div>

                            {/* Nome do Cliente */}
                            <div className="text-[10px] sm:text-xs font-semibold text-gray-900 truncate group-hover:text-emerald-800 transition-colors">
                              {clienteNome}
                            </div>
                          </div>
                        )
                      })}

                      {/* Mais OSs no dia */}
                      {dayOrdens.length > 3 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDayKey(cell.dateKey)
                          }}
                          className="w-full text-center text-[10px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline bg-emerald-50/50 py-0.5 rounded"
                        >
                          +{dayOrdens.length - 3} mais...
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Estado Vazio se o mês não tiver nenhuma OS */}
          {totalNoPeriodoExibido === 0 && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-200">
                <CalendarIcon className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">
                Nenhuma ordem de serviço agendada para este período.
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mb-4">
                Utilize os botões de navegação acima para consultar outros meses ou volte ao mês
                atual.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCurrentMonth}
                className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
              >
                Ir para o Mês Atual
              </Button>
            </div>
          )}
        </>
      )}

      {/* ========================================================== */}
      {/* VISÃO 2: SEMANA (7 colunas referente à semana selecionada) */}
      {/* ========================================================== */}
      {viewMode === 'semana' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            {/* Scroll horizontal defensivo para telas muito pequenas, sem quebrar layout desktop */}
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                {/* Cabeçalho dos Dias da Semana */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80 text-center text-xs font-bold text-gray-600">
                  {weekDays.map((dia, index) => (
                    <div
                      key={dia.dateKey}
                      className={`py-2.5 sm:py-3 uppercase tracking-wider text-[11px] sm:text-xs ${
                        index === 0 || index === 6 ? 'text-gray-400' : 'text-gray-700'
                      }`}
                    >
                      {dia.diaSemanaCurto}
                    </div>
                  ))}
                </div>

                {/* Grade de 7 colunas da Semana */}
                <div className="grid grid-cols-7 divide-x divide-gray-200/70 border-b border-gray-200/70">
                  {weekDays.map((dia) => {
                    const dayOrdens = ordensPorDia.get(dia.dateKey) || []
                    const hasOrdens = dayOrdens.length > 0
                    const isSelected = selectedDayKey === dia.dateKey

                    return (
                      <div
                        key={dia.dateKey}
                        onClick={() => setSelectedDayKey(dia.dateKey)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedDayKey(dia.dateKey)
                          }
                        }}
                        className={`min-h-[260px] sm:min-h-[340px] md:min-h-[380px] p-2 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer relative ${
                          dia.isToday
                            ? 'bg-emerald-50/30 ring-2 ring-emerald-500/40 ring-inset'
                            : isSelected
                              ? 'bg-emerald-50/20 ring-1 ring-emerald-400 ring-inset'
                              : 'bg-white hover:bg-gray-50/80'
                        }`}
                      >
                        {/* Topo do dia da semana: Número + Hoje + Badge */}
                        <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center justify-center text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-transform ${
                                dia.isToday
                                  ? 'bg-[#166534] text-white shadow-2xs font-extrabold'
                                  : isSelected
                                    ? 'bg-emerald-100 text-emerald-900 font-bold'
                                    : 'text-gray-800'
                              }`}
                            >
                              {dia.dayNumber}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {MESES[dia.date.getMonth()].slice(0, 3)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {dia.isToday && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                Hoje
                              </span>
                            )}
                            {hasOrdens && (
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                  dia.isToday
                                    ? 'bg-emerald-200 text-emerald-900'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                                title={`${dayOrdens.length} ordem(ns) neste dia`}
                              >
                                {dayOrdens.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Cards compactos com as OSs do Dia da Semana */}
                        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[320px] pr-0.5">
                          {dayOrdens.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-6 text-center text-gray-300">
                              <Clock className="w-4 h-4 mb-1 text-gray-300" />
                              <span className="text-[10px] text-gray-400">Sem agendamentos</span>
                            </div>
                          ) : (
                            dayOrdens.map((os) => {
                              const tipoConfig =
                                TIPO_SERVICO_CORES[os.tipo_servico] ||
                                TIPO_SERVICO_CORES['Manutenção']
                              const horario = extractHorario(os.data_agendada)
                              const clienteNome =
                                os.expand?.cliente_id?.nome ||
                                os.expand?.cliente_id?.razao_social ||
                                'Cliente Solar'

                              return (
                                <div
                                  key={os.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onSelectOS(os)
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation()
                                      onSelectOS(os)
                                    }
                                  }}
                                  style={{
                                    borderLeftWidth: '3.5px',
                                    borderLeftColor: tipoConfig.borderColor,
                                    backgroundColor: tipoConfig.pillBg,
                                  }}
                                  className="p-1.5 rounded-md border border-gray-200/70 text-left transition-all hover:scale-[1.02] hover:shadow-xs group cursor-pointer"
                                  title={`${horario} • ${clienteNome} (${os.tipo_servico}) - Clique para abrir a ficha de execução`}
                                >
                                  {/* Horário + Tipo (com cor) */}
                                  <div className="flex items-center justify-between gap-1 leading-none mb-1">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-900 flex items-center gap-0.5 shrink-0">
                                      <Clock className="w-2.5 h-2.5 text-gray-500" />
                                      {horario}
                                    </span>
                                    <span
                                      className="text-[9px] font-extrabold uppercase truncate tracking-wider"
                                      style={{ color: tipoConfig.hex }}
                                    >
                                      {os.tipo_servico}
                                    </span>
                                  </div>

                                  {/* Nome do Cliente */}
                                  <div className="text-[10px] sm:text-xs font-semibold text-gray-900 truncate group-hover:text-emerald-800 transition-colors">
                                    {clienteNome}
                                  </div>

                                  {/* Responsável técnico */}
                                  {os.atribuida_a && (
                                    <div className="text-[9px] text-gray-500 truncate mt-0.5 flex items-center gap-0.5">
                                      <User className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                                      <span className="truncate">{os.atribuida_a}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>

                        {/* Rodapé do dia */}
                        <div className="pt-1.5 text-center text-[10px] text-gray-400 border-t border-gray-100">
                          {dia.diaSemanaCompleto}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Estado Vazio se a semana não tiver nenhuma OS */}
          {totalNoPeriodoExibido === 0 && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-200">
                <CalendarIcon className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">
                Nenhuma ordem de serviço agendada para este período.
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mb-4">
                Utilize os botões de navegação acima para consultar outras semanas ou volte à semana
                atual.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCurrent}
                className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
              >
                Ir para a Semana Atual
              </Button>
            </div>
          )}
        </>
      )}

      {/* ========================================================== */}
      {/* VISÃO 3: DIA (Painel único do dia selecionado)             */}
      {/* ========================================================== */}
      {viewMode === 'dia' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 inline-flex shadow-2xs">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Visão Diária • Agendamentos
                </span>
                <h4 className="text-base sm:text-lg font-bold text-gray-900">
                  {diaSelecionadoFormatado}
                </h4>
              </div>
            </div>

            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              {ordensDiaSelecionado.length}{' '}
              {ordensDiaSelecionado.length === 1 ? 'OS agendada' : 'OSs agendadas'}
            </span>
          </div>

          {ordensDiaSelecionado.length === 0 ? (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1 border border-emerald-200">
                <CalendarIcon className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-gray-900">
                Nenhuma ordem de serviço agendada para este período.
              </h4>
              <p className="text-xs text-gray-500 max-w-sm">
                Nenhuma OS encontrada para {diaSelecionadoFormatado}. Navegue pelos botões "Dia
                anterior" e "Próximo dia" ou retorne para "Hoje".
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCurrent}
                className="mt-2 rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
              >
                Voltar para Hoje
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ordensDiaSelecionado.map((os) => {
                const tipoConfig =
                  TIPO_SERVICO_CORES[os.tipo_servico] || TIPO_SERVICO_CORES['Manutenção']
                const horario = extractHorario(os.data_agendada)
                const clienteNome =
                  os.expand?.cliente_id?.nome ||
                  os.expand?.cliente_id?.razao_social ||
                  'Cliente Solar'
                const checklistTotal = os.checklist?.length || 0
                const checklistFeitos = os.checklist?.filter((c) => c.concluido).length || 0

                return (
                  <div
                    key={os.id}
                    onClick={() => onSelectOS(os)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectOS(os)
                      }
                    }}
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: tipoConfig.borderColor,
                    }}
                    className="p-3.5 sm:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between"
                  >
                    <div>
                      {/* Topo do card do dia */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                          style={{
                            borderColor: `${tipoConfig.borderColor}50`,
                            backgroundColor: tipoConfig.pillBg,
                            color: tipoConfig.hex,
                          }}
                        >
                          {os.tipo_servico}
                        </span>

                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {horario}
                        </span>
                      </div>

                      {/* Nome do Cliente */}
                      <h5 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-1">
                        {clienteNome}
                      </h5>

                      {/* Endereço */}
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {os.endereco || 'Endereço não informado'}
                        </span>
                      </div>

                      {/* Responsável */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                          Instalador:{' '}
                          <strong className="text-gray-700">
                            {os.atribuida_a || 'Não atribuído'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Rodapé com botão Direto para a Ficha de Execução */}
                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs mt-1">
                      <span className="text-[11px] text-gray-500 font-medium">
                        {checklistTotal > 0
                          ? `Checklist: ${checklistFeitos}/${checklistTotal}`
                          : os.status === 'concluida'
                            ? 'Concluída'
                            : 'Pendente'}
                      </span>

                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                        <span>Abrir Ficha de Execução</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Painel de Detalhes do Dia Selecionado (exibido na visão Mês e Semana quando um dia está selecionado) */}
      {viewMode !== 'dia' && selectedDayKey && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 inline-flex">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Ordens de Serviço do Dia
                </span>
                <h4 className="text-sm sm:text-base font-bold text-gray-900">
                  {diaSelecionadoFormatado}
                </h4>
              </div>
            </div>

            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {ordensDiaSelecionado.length}{' '}
              {ordensDiaSelecionado.length === 1 ? 'OS agendada' : 'OSs agendadas'}
            </span>
          </div>

          {ordensDiaSelecionado.length === 0 ? (
            <div className="py-6 text-center text-gray-400 space-y-1">
              <Clock className="w-6 h-6 text-gray-300 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-600">
                Nenhuma ordem de serviço agendada para este dia.
              </p>
              <p className="text-[11px] text-gray-400">
                Selecione outro dia no calendário acima para conferir os agendamentos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ordensDiaSelecionado.map((os) => {
                const tipoConfig =
                  TIPO_SERVICO_CORES[os.tipo_servico] || TIPO_SERVICO_CORES['Manutenção']
                const horario = extractHorario(os.data_agendada)
                const clienteNome =
                  os.expand?.cliente_id?.nome ||
                  os.expand?.cliente_id?.razao_social ||
                  'Cliente Solar'
                const checklistTotal = os.checklist?.length || 0
                const checklistFeitos = os.checklist?.filter((c) => c.concluido).length || 0

                return (
                  <div
                    key={os.id}
                    onClick={() => onSelectOS(os)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectOS(os)
                      }
                    }}
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: tipoConfig.borderColor,
                    }}
                    className="p-3 sm:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between"
                  >
                    <div>
                      {/* Topo do card do dia */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                          style={{
                            borderColor: `${tipoConfig.borderColor}50`,
                            backgroundColor: tipoConfig.pillBg,
                            color: tipoConfig.hex,
                          }}
                        >
                          {os.tipo_servico}
                        </span>

                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {horario}
                        </span>
                      </div>

                      {/* Nome do Cliente */}
                      <h5 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-1">
                        {clienteNome}
                      </h5>

                      {/* Endereço */}
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">
                          {os.endereco || 'Endereço não informado'}
                        </span>
                      </div>

                      {/* Responsável */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                          Instalador:{' '}
                          <strong className="text-gray-700">
                            {os.atribuida_a || 'Não atribuído'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Rodapé com botão Direto para a Ficha de Execução */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs mt-1">
                      <span className="text-[11px] text-gray-500 font-medium">
                        {checklistTotal > 0
                          ? `Checklist: ${checklistFeitos}/${checklistTotal}`
                          : os.status === 'concluida'
                            ? 'Concluída'
                            : 'Pendente'}
                      </span>

                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                        <span>Abrir Ficha de Execução</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
