import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Plus,
  CheckCircle2,
  Circle,
  Building,
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarRange,
  CalendarDays,
  GripVertical,
} from 'lucide-react'
import { formatDateTime } from '@/lib/formatters'
import { getTipoAtividadeConfig } from '@/constants/atividadesTipos'
import type { Atividade, SistemaUsuario } from '@/types/crm'
import { updateAtividade } from '@/services/crmService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { ModalDetalhesAtividade } from './ModalDetalhesAtividade'

export interface AtividadesCalendarioProps {
  atividades: Atividade[]
  usuarios: SistemaUsuario[]
  usuarioSelecionadoId: string
  onSelectUsuario: (id: string) => void
  onToggleStatus: (id: string, currentStatus: string) => void
  onOpenCliente: (clienteId: string) => void
  onAddAtividadeDia?: (date: Date) => void
  onAtividadeUpdated?: (updated: Atividade) => void
  onCardClickCustom?: (atividade: Atividade) => void
}

export type CalendarViewMode = 'semana' | 'dia' | 'mes'

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

// Grade horária: das 06:00 às 22:00 (16 horas = 17 marcas de horário)
const HORA_INICIAL = 6
const HORA_FINAL = 22
const TOTAL_HORAS = HORA_FINAL - HORA_INICIAL
const ALTURA_HORA_PX = 56 // 56px por hora para boa legibilidade
const DURACAO_PADRAO_MINUTOS = 60 // 1h padrão se não definido

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

// Extrai duração em minutos armazenada em metadados json existentes (auto_leitura_dados ou cronograma_datas)
function getDuracaoMinutos(atv: Atividade): number {
  try {
    const dados = (atv.auto_leitura_dados || atv.cronograma_datas) as Record<string, unknown> | null
    if (dados && typeof dados === 'object' && typeof dados.duracao_minutos === 'number') {
      const d = Math.round(dados.duracao_minutos)
      if (d >= 15 && d <= 720) return d
    }
  } catch {
    /* fallback */
  }
  return DURACAO_PADRAO_MINUTOS
}

export const AtividadesCalendario: React.FC<AtividadesCalendarioProps> = ({
  atividades,
  usuarios,
  usuarioSelecionadoId,
  onSelectUsuario,
  onToggleStatus,
  onOpenCliente,
  onAddAtividadeDia,
  onAtividadeUpdated,
  onCardClickCustom,
}) => {
  const { toast } = useToast()

  // 1. Visualização PADRÃO deve ser SEMANA atual (Google Calendar style)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('semana')
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [selectedDia, setSelectedDia] = useState<Date | null>(() => new Date())

  // Modal para ver e editar atividade (troca de responsável, horário, status, etc)
  const [modalAtividade, setModalAtividade] = useState<Atividade | null>(null)
  const [modalEditarOpen, setModalEditarOpen] = useState(false)

  // Estado local para refletir reagendamento / redimensionamento imediatamente
  const [overrides, setOverrides] = useState<
    Record<string, { data?: string; duracao_minutos?: number }>
  >({})

  // Estado de Drag & Drop
  const [draggingAtividadeId, setDraggingAtividadeId] = useState<string | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ dateKey: string; hora: number } | null>(null)

  // Estado de Resize (ajuste de duração na borda inferior)
  const [resizing, setResizing] = useState<{
    atividadeId: string
    startY: number
    startDuracao: number
    currentDuracao: number
  } | null>(null)

  const timeGridRef = useRef<HTMLDivElement>(null)

  // Mês e Ano atuais no visor
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Início da semana
  const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate])

  // Navegação: anterior
  const handlePrev = () => {
    if (viewMode === 'semana') {
      const prevWeek = new Date(startOfWeek)
      prevWeek.setDate(prevWeek.getDate() - 7)
      setCurrentDate(prevWeek)
    } else if (viewMode === 'dia') {
      const prevDay = new Date(currentDate)
      prevDay.setDate(prevDay.getDate() - 1)
      setCurrentDate(prevDay)
      setSelectedDia(prevDay)
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
    } else if (viewMode === 'dia') {
      const nextDay = new Date(currentDate)
      nextDay.setDate(nextDay.getDate() + 1)
      setCurrentDate(nextDay)
      setSelectedDia(nextDay)
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

  // Filtrar e mesclar com overrides locais
  const atividadesMescladas = useMemo(() => {
    return atividades.map((atv) => {
      const ov = overrides[atv.id]
      if (!ov) return atv
      return {
        ...atv,
        data: ov.data ?? atv.data,
        auto_leitura_dados:
          ov.duracao_minutos !== undefined
            ? {
                ...(typeof atv.auto_leitura_dados === 'object' && atv.auto_leitura_dados !== null
                  ? atv.auto_leitura_dados
                  : {}),
                duracao_minutos: ov.duracao_minutos,
              }
            : atv.auto_leitura_dados,
      }
    })
  }, [atividades, overrides])

  const atividadesDoUsuario = useMemo(() => {
    if (usuarioSelecionadoId === 'todos') {
      return atividadesMescladas
    }
    return atividadesMescladas.filter((a) => {
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
  }, [atividadesMescladas, usuarioSelecionadoId, usuarios])

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

  const todayKey = toLocalDateKey(new Date())

  // Matriz dos 7 dias da semana
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

  // Dias ativos na visualização grade horária (1 se for 'dia', 7 se for 'semana')
  const gridDays = useMemo(() => {
    if (viewMode === 'dia') {
      const d = currentDate
      const dateKey = toLocalDateKey(d)
      const dayIdx = d.getDay()
      return [
        {
          date: d,
          dateKey,
          diaSemanaCurto: DIAS_DA_SEMANA[dayIdx],
          diaSemanaCompleto: DIAS_DA_SEMANA_COMPLETO[dayIdx],
          diaDoMes: d.getDate(),
          isToday: dateKey === todayKey,
          isSelected: true,
        },
      ]
    }
    return weekDays
  }, [viewMode, currentDate, todayKey, weekDays])

  // Label do período exibido no header
  const headerPeriodoLabel = useMemo(() => {
    if (viewMode === 'dia') {
      return `${currentDate.getDate()} de ${MESES[currentDate.getMonth()]} de ${currentDate.getFullYear()} (${DIAS_DA_SEMANA_COMPLETO[currentDate.getDay()]})`
    }
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
  }, [viewMode, currentDate, currentMonth, currentYear, weekDays])

  // Matriz de dias para renderizar o mês no calendário
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
    if (usuarioSelecionadoId === 'todos') return 'Todos os Responsáveis'
    const found = usuarios.find((u) => u.id === usuarioSelecionadoId)
    return found ? found.name : 'Usuário'
  }, [usuarioSelecionadoId, usuarios])

  // ==========================================================
  // DRAG & DROP: Reposicionar atividade em outro horário / dia
  // ==========================================================
  const handleDragStart = (e: React.DragEvent, atividadeId: string) => {
    e.dataTransfer.setData('text/plain', atividadeId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingAtividadeId(atividadeId)
  }

  const handleDragEnd = () => {
    setDraggingAtividadeId(null)
    setDragOverSlot(null)
  }

  const handleDragOverSlot = (e: React.DragEvent, dateKey: string, hora: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragOverSlot || dragOverSlot.dateKey !== dateKey || dragOverSlot.hora !== hora) {
      setDragOverSlot({ dateKey, hora })
    }
  }

  const handleDropOnSlot = async (
    e: React.DragEvent,
    targetDateKey: string,
    targetHora: number,
  ) => {
    e.preventDefault()
    const atvId = e.dataTransfer.getData('text/plain') || draggingAtividadeId
    setDraggingAtividadeId(null)
    setDragOverSlot(null)
    if (!atvId) return

    const atv = atividadesMescladas.find((a) => a.id === atvId)
    if (!atv) return

    // Preserva minutos originais arredondados para múltiplos de 5
    let minutos = 0
    if (atv.data && atv.data.length >= 16) {
      const rawMin = parseInt(atv.data.slice(14, 16), 10) || 0
      minutos = Math.min(55, Math.max(0, Math.round(rawMin / 5) * 5))
    }

    const horaFormatada = String(targetHora).padStart(2, '0')
    const minutoFormatado = String(minutos).padStart(2, '0')
    // Monta datetime no formato padrão PocketBase (YYYY-MM-DD HH:mm:00) com espaço, sem "T"
    const novaDataIso = `${targetDateKey} ${horaFormatada}:${minutoFormatado}:00`

    // Atualização otimista
    setOverrides((prev) => ({
      ...prev,
      [atvId]: { ...prev[atvId], data: novaDataIso },
    }))

    try {
      const updated = await updateAtividade(atvId, { data: novaDataIso })
      toast({
        title: 'Atividade reagendada com sucesso! 📅',
        description: `Horário alterado para ${targetDateKey.split('-').reverse().join('/')} às ${horaFormatada}:${minutoFormatado}h.`,
      })
      if (onAtividadeUpdated) {
        onAtividadeUpdated(updated)
      }
    } catch (err) {
      console.error('Erro ao reagendar atividade:', err)
      // Reverte override
      setOverrides((prev) => {
        const copy = { ...prev }
        delete copy[atvId]
        return copy
      })

      if (isAuthSessionError(err)) {
        toast({
          variant: 'destructive',
          title: 'Sessão expirada',
          description: 'Faça login novamente para reagendar atividades.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao reagendar',
          description: 'Não foi possível salvar o novo horário no banco de dados.',
        })
      }
    }
  }

  // ==========================================================
  // RESIZE: Ajustar duração puxando a borda inferior
  // ==========================================================
  const handleResizeStart = (e: React.MouseEvent, atv: Atividade) => {
    e.stopPropagation()
    e.preventDefault()
    const duracaoAtual = getDuracaoMinutos(atv)
    setResizing({
      atividadeId: atv.id,
      startY: e.clientY,
      startDuracao: duracaoAtual,
      currentDuracao: duracaoAtual,
    })
  }

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizing.startY
      // Cada ALTURA_HORA_PX equivale a 60 minutos
      const deltaMinutos = (deltaY / ALTURA_HORA_PX) * 60
      // Ajusta em blocos de 15 minutos
      const novaDuracaoCalculada = resizing.startDuracao + deltaMinutos
      const duracaoBlocos15 = Math.round(novaDuracaoCalculada / 15) * 15
      // Limites: mínimo 15 min, máximo 480 min (8h)
      const duracaoFinal = Math.min(480, Math.max(15, duracaoBlocos15))

      setResizing((prev) => (prev ? { ...prev, currentDuracao: duracaoFinal } : null))

      // Atualiza visualmente em tempo real
      setOverrides((prev) => ({
        ...prev,
        [resizing.atividadeId]: {
          ...prev[resizing.atividadeId],
          duracao_minutos: duracaoFinal,
        },
      }))
    }

    const handleMouseUp = async () => {
      const atvId = resizing.atividadeId
      const duracaoFinal = resizing.currentDuracao
      setResizing(null)

      const atv = atividadesMescladas.find((a) => a.id === atvId)
      if (!atv) return

      try {
        const dadosExistentes =
          typeof atv.auto_leitura_dados === 'object' && atv.auto_leitura_dados !== null
            ? (atv.auto_leitura_dados as Record<string, unknown>)
            : {}

        const payloadDados = {
          ...dadosExistentes,
          duracao_minutos: duracaoFinal,
        }

        const updated = await updateAtividade(atvId, {
          auto_leitura_dados: payloadDados,
        })

        toast({
          title: 'Duração atualizada! ⏱️',
          description: `Tempo previsto ajustado para ${duracaoFinal} minutos.`,
        })

        if (onAtividadeUpdated) {
          onAtividadeUpdated(updated)
        }
      } catch (err) {
        console.error('Erro ao salvar duração da atividade:', err)
        if (isAuthSessionError(err)) {
          toast({
            variant: 'destructive',
            title: 'Sessão expirada',
            description: 'Faça login novamente para alterar a duração.',
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro ao salvar duração',
            description: 'Não foi possível salvar o ajuste de tempo.',
          })
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing, atividadesMescladas, toast, onAtividadeUpdated])

  // Abertura do modal de edição da atividade ou callback customizado (ex: Serviços de Campo)
  const handleCardClick = (e: React.MouseEvent, atv: Atividade) => {
    e.stopPropagation()
    if (onCardClickCustom) {
      onCardClickCustom(atv)
      return
    }
    setModalAtividade(atv)
    setModalEditarOpen(true)
  }

  // ==========================================================
  // SEPARAR ATIVIDADES: "Com Horário" vs "Dia Inteiro / Sem Horário"
  // ==========================================================
  const separarAtividadesDoDia = useCallback((atividadesDoDia: Atividade[]) => {
    const diaInteiro: Atividade[] = []
    const comHorario: Array<{
      atividade: Atividade
      hora: number
      minuto: number
      top: number
      height: number
      duracaoMinutos: number
    }> = []

    for (const atv of atividadesDoDia) {
      if (!atv.data || atv.data.length < 13) {
        diaInteiro.push(atv)
        continue
      }

      const hora = parseInt(atv.data.slice(11, 13), 10)
      const minuto = atv.data.length >= 16 ? parseInt(atv.data.slice(14, 16), 10) || 0 : 0

      // Se estiver fora do intervalo 06:00 - 22:00, aloca em dia inteiro
      if (isNaN(hora) || hora < HORA_INICIAL || hora >= HORA_FINAL) {
        diaInteiro.push(atv)
        continue
      }

      const duracaoMinutos = getDuracaoMinutos(atv)
      const top = (hora - HORA_INICIAL) * ALTURA_HORA_PX + (minuto / 60) * ALTURA_HORA_PX
      const height = Math.max(28, (duracaoMinutos / 60) * ALTURA_HORA_PX - 2)

      comHorario.push({
        atividade: atv,
        hora,
        minuto,
        top,
        height,
        duracaoMinutos,
      })
    }

    // Ordena por horário de início dentro do dia
    comHorario.sort((a, b) => a.top - b.top)

    return { diaInteiro, comHorario }
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden select-none">
      {/* Top Header com Seletor Mês/Semana/Dia, navegação de data e seletor de usuário */}
      <div className="p-3.5 sm:p-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-gradient-to-r from-white via-[#F8FAF9] to-white">
        {/* Título & Badge informativo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs shrink-0">
            {viewMode === 'semana' ? (
              <CalendarRange className="w-5 h-5 text-emerald-600" />
            ) : viewMode === 'dia' ? (
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            ) : (
              <CalendarIcon className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                {viewMode === 'semana'
                  ? 'Calendário Semanal'
                  : viewMode === 'dia'
                    ? 'Agenda Diária'
                    : 'Calendário Mensal'}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {viewMode === 'semana'
                  ? `${totalAtividadesSemana} na semana`
                  : viewMode === 'dia'
                    ? `${atividadesDiaSelecionado.length} hoje`
                    : 'Mês'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {viewMode === 'semana'
                ? 'Grade Google Calendar • Arraste para reagendar ou puxe a borda inferior'
                : viewMode === 'dia'
                  ? 'Faixas horárias de 1 em 1 hora com posicionamento exato'
                  : 'Visão geral em grade mensal com indicadores diários • '}
              <span className="font-semibold text-emerald-700 ml-1">{usuarioAtivoNome}</span>
            </p>
          </div>
        </div>

        {/* Controles: Seletor Mês / Semana / Dia + Navegação + Usuário + Hoje */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Seletor Segmentado: Mês / Semana / Dia (3 botões mantidos conforme pedido) */}
          <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-xl border border-gray-200 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('mes')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'mes'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
              title="Visualização Mensal"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('semana')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'semana'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
              title="Visualização Semanal estilo Google Calendar"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dia')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'dia'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
              title="Visualização Diária com grade de horários"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Dia</span>
            </button>
          </div>

          {/* Seletor de usuário responsável */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs text-xs">
            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={usuarioSelecionadoId}
              onChange={(e) => onSelectUsuario(e.target.value)}
              className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer max-w-[140px] sm:max-w-none truncate"
            >
              <option value="todos">Todos os Responsáveis</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Navegação de Data */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title={
                viewMode === 'semana'
                  ? 'Semana anterior'
                  : viewMode === 'dia'
                    ? 'Dia anterior'
                    : 'Mês anterior'
              }
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-gray-800 px-2 min-w-[130px] sm:min-w-[180px] text-center truncate">
              {headerPeriodoLabel}
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title={
                viewMode === 'semana'
                  ? 'Próxima semana'
                  : viewMode === 'dia'
                    ? 'Próximo dia'
                    : 'Próximo mês'
              }
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* ========================================================== */}
      {/* VISUALIZAÇÃO: GOOGLE CALENDAR (SEMANA ou DIA)               */}
      {/* ========================================================== */}
      {(viewMode === 'semana' || viewMode === 'dia') && (
        <div className="flex flex-col">
          {/* Seção "Dia Inteiro / Sem Horário Definido" no topo */}
          <div className="border-b border-gray-200 bg-gray-50/70 p-2 sm:p-2.5">
            <div className="flex items-start gap-2">
              <div className="w-14 sm:w-16 shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider pt-1.5 text-right pr-2">
                Dia todo
              </div>
              <div
                className={`flex-1 grid gap-2 ${
                  viewMode === 'dia' ? 'grid-cols-1' : 'grid-cols-7'
                } min-w-[650px] overflow-x-auto`}
              >
                {gridDays.map((dia) => {
                  const dayAtividades = atividadesPorData.get(dia.dateKey) || []
                  const { diaInteiro } = separarAtividadesDoDia(dayAtividades)

                  return (
                    <div
                      key={`all-day-${dia.dateKey}`}
                      onDragOver={(e) => handleDragOverSlot(e, dia.dateKey, HORA_INICIAL)}
                      onDrop={(e) => handleDropOnSlot(e, dia.dateKey, HORA_INICIAL)}
                      className={`min-h-[32px] p-1 rounded-lg border border-dashed transition-colors flex flex-col gap-1 ${
                        dragOverSlot?.dateKey === dia.dateKey
                          ? 'border-emerald-500 bg-emerald-50/60'
                          : dia.isToday
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-gray-200 bg-white/70'
                      }`}
                    >
                      {diaInteiro.length === 0 ? (
                        <span className="text-[10px] text-gray-300 text-center py-1 block">-</span>
                      ) : (
                        diaInteiro.map((atv) => {
                          const conf = getTipoAtividadeConfig(atv.tipo)
                          const isConcluida = atv.status === 'concluida'

                          return (
                            <div
                              key={`allday-${atv.id}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, atv.id)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => handleCardClick(e, atv)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border cursor-pointer transition-all hover:shadow-xs flex items-center justify-between gap-1 ${
                                isConcluida
                                  ? 'bg-gray-100 text-gray-500 line-through border-gray-300'
                                  : 'bg-white shadow-2xs hover:border-gray-400'
                              }`}
                              style={{
                                borderLeftWidth: '3px',
                                borderLeftColor: isConcluida ? '#9CA3AF' : conf.corHex,
                              }}
                              title={`${atv.titulo || conf.tituloPadrao} (Clique para editar / arraste para a grade)`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="truncate">{atv.titulo || conf.tituloPadrao}</span>
                              </div>
                              <span className="text-[9px] text-gray-400 shrink-0">Dia todo</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Cabeçalho das Colunas de Dias com link para agendar */}
          <div className="flex border-b border-gray-200 bg-[#FAFBFB] sticky top-0 z-10">
            {/* Coluna da régua de horas (espaçador) */}
            <div className="w-14 sm:w-16 shrink-0 border-r border-gray-200 p-2 text-[10px] font-bold text-gray-400 text-right uppercase tracking-wider">
              GMT-3
            </div>

            {/* Colunas dos dias */}
            <div
              className={`flex-1 grid ${
                viewMode === 'dia' ? 'grid-cols-1' : 'grid-cols-7'
              } divide-x divide-gray-200 min-w-[650px]`}
            >
              {gridDays.map((dia) => (
                <div
                  key={`header-${dia.dateKey}`}
                  onClick={() => setSelectedDia(dia.date)}
                  className={`p-2 sm:p-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    dia.isToday
                      ? 'bg-emerald-50/80 text-emerald-950 font-bold'
                      : dia.isSelected
                        ? 'bg-gray-100/70 text-gray-900 font-bold'
                        : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-xs uppercase font-extrabold tracking-wider ${
                        dia.isToday ? 'text-emerald-700' : 'text-gray-500'
                      }`}
                    >
                      {dia.diaSemanaCurto}
                    </span>
                    <span
                      className={`text-sm sm:text-base font-extrabold ${
                        dia.isToday
                          ? 'w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center -ml-0.5'
                          : 'text-gray-900'
                      }`}
                    >
                      {dia.diaDoMes}
                    </span>
                  </div>

                  {onAddAtividadeDia && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddAtividadeDia(dia.date)
                      }}
                      className="text-gray-400 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50 transition-colors"
                      title={`Agendar atividade em ${dia.diaDoMes}/${dia.date.getMonth() + 1}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Grade Horária estilo Google Calendar (06:00 às 22:00) */}
          <div
            ref={timeGridRef}
            className="flex overflow-y-auto max-h-[640px] bg-white relative divide-x divide-gray-200"
          >
            {/* Régua de Horas (lado esquerdo) */}
            <div className="w-14 sm:w-16 shrink-0 bg-[#FAFBFB] select-none">
              {Array.from({ length: TOTAL_HORAS }, (_, idx) => {
                const hora = HORA_INICIAL + idx
                return (
                  <div
                    key={`time-label-${hora}`}
                    className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 pr-2 text-right relative"
                    style={{ height: `${ALTURA_HORA_PX}px` }}
                  >
                    <span className="-top-2.5 relative block">
                      {String(hora).padStart(2, '0')}:00
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Colunas de cada dia na grade horária */}
            <div
              className={`flex-1 grid ${
                viewMode === 'dia' ? 'grid-cols-1' : 'grid-cols-7'
              } divide-x divide-gray-200 min-w-[650px] relative`}
            >
              {gridDays.map((dia) => {
                const dayAtividades = atividadesPorData.get(dia.dateKey) || []
                const { comHorario } = separarAtividadesDoDia(dayAtividades)

                return (
                  <div
                    key={`col-${dia.dateKey}`}
                    className={`relative ${dia.isToday ? 'bg-emerald-50/10' : 'bg-white'}`}
                    style={{ height: `${TOTAL_HORAS * ALTURA_HORA_PX}px` }}
                  >
                    {/* Linhas de grade horária (slots receptores de Drop) */}
                    {Array.from({ length: TOTAL_HORAS }, (_, idx) => {
                      const hora = HORA_INICIAL + idx
                      const isHovered =
                        dragOverSlot?.dateKey === dia.dateKey && dragOverSlot?.hora === hora

                      return (
                        <div
                          key={`slot-${dia.dateKey}-${hora}`}
                          onDragOver={(e) => handleDragOverSlot(e, dia.dateKey, hora)}
                          onDrop={(e) => handleDropOnSlot(e, dia.dateKey, hora)}
                          onClick={() => {
                            if (onAddAtividadeDia) {
                              const d = new Date(dia.date)
                              d.setHours(hora, 0, 0, 0)
                              onAddAtividadeDia(d)
                            }
                          }}
                          className={`border-b border-gray-100 transition-colors cursor-pointer group/slot relative ${
                            isHovered
                              ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-400/40'
                              : 'hover:bg-gray-50/80'
                          }`}
                          style={{ height: `${ALTURA_HORA_PX}px` }}
                          title={`Clique para agendar às ${hora}:00h ou arraste um card até aqui`}
                        >
                          {/* Linha pontilhada de meia hora para visualização precisa */}
                          <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-gray-100/80 pointer-events-none" />
                        </div>
                      )
                    })}

                    {/* Cards de Atividades Posicionados na Grade */}
                    {comHorario.map((item) => {
                      const atv = item.atividade
                      const conf = getTipoAtividadeConfig(atv.tipo)
                      const Icon = conf.icon
                      const isConcluida = atv.status === 'concluida'
                      const isDragging = draggingAtividadeId === atv.id
                      const isBeingResized = resizing?.atividadeId === atv.id
                      const horaInicioStr = atv.data ? atv.data.slice(11, 16) : ''

                      // Calcula hora de término prevista
                      const minutosInicio = item.hora * 60 + item.minuto
                      const minutosFim = minutosInicio + item.duracaoMinutos
                      const horaFim = Math.floor(minutosFim / 60)
                      const minutoFim = minutosFim % 60
                      const horaFimStr = `${String(horaFim).padStart(2, '0')}:${String(minutoFim).padStart(2, '0')}`

                      return (
                        <div
                          key={`card-${atv.id}`}
                          draggable={!isBeingResized}
                          onDragStart={(e) => handleDragStart(e, atv.id)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => handleCardClick(e, atv)}
                          className={`absolute left-1 right-1 rounded-xl p-1.5 border shadow-2xs transition-all flex flex-col justify-between overflow-hidden cursor-pointer group ${
                            isDragging ? 'opacity-40 scale-95 ring-2 ring-emerald-500' : ''
                          } ${
                            isConcluida
                              ? 'bg-gray-50 text-gray-500 border-gray-300 opacity-80'
                              : 'bg-white hover:border-gray-400 hover:shadow-md'
                          }`}
                          style={{
                            top: `${item.top}px`,
                            height: `${item.height}px`,
                            borderLeftWidth: '4px',
                            borderLeftColor: isConcluida ? '#9CA3AF' : conf.corHex,
                            zIndex: isDragging || isBeingResized ? 30 : 10,
                          }}
                          title={`${atv.titulo || conf.tituloPadrao} (${horaInicioStr} - ${horaFimStr})\nClique para editar responsável/horário\nArraste para mover\nPuxe a borda inferior para ajustar duração`}
                        >
                          {/* Conteúdo do Card */}
                          <div className="min-w-0 flex-1">
                            {/* Topo: Ícone + Horário + Checkbox rápido */}
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <div className="flex items-center gap-1 min-w-0">
                                <div
                                  className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: isConcluida ? '#E5E7EB' : `${conf.corHex}20`,
                                    color: isConcluida ? '#6B7280' : conf.corHex,
                                  }}
                                >
                                  <Icon className="w-2.5 h-2.5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-700 font-mono truncate">
                                  {horaInicioStr} - {horaFimStr}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleStatus(atv.id, atv.status || 'pendente')
                                }}
                                className="p-0.5 rounded text-gray-400 hover:text-emerald-600 shrink-0"
                                title={
                                  isConcluida ? 'Marcar como pendente' : 'Marcar como concluída'
                                }
                              >
                                {isConcluida ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Circle className="w-3 h-3 text-gray-300 group-hover:text-gray-400" />
                                )}
                              </button>
                            </div>

                            {/* Título */}
                            <div
                              className={`text-[11px] font-bold leading-tight truncate ${
                                isConcluida ? 'text-gray-400 line-through' : 'text-gray-900'
                              }`}
                            >
                              {atv.titulo || conf.tituloPadrao}
                            </div>

                            {/* Cliente / Responsável (se couber na altura) */}
                            {item.height >= 48 && (
                              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5 truncate gap-1">
                                <span className="truncate font-semibold text-emerald-800">
                                  {atv.expand?.cliente_id?.nome ||
                                    atv.responsavel_nome ||
                                    conf.tituloPadrao}
                                </span>
                                <span className="text-[9px] text-gray-400 shrink-0">
                                  {item.duracaoMinutos}m
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Alça inferior de redimensionamento (resize handle bem fininha) */}
                          <div
                            data-testid={`resize-handle-atv-${atv.id}`}
                            onMouseDown={(e) => handleResizeStart(e, atv)}
                            className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize flex items-center justify-center bg-transparent hover:bg-emerald-400/30 active:bg-emerald-500/40 transition-colors select-none z-30"
                            title="Arraste para aumentar ou reduzir o tempo previsto"
                          >
                            <div className="w-12 h-[2.5px] rounded-full bg-gray-400/90 group-hover:bg-emerald-600 transition-all pointer-events-none shadow-2xs" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legenda de cores por tipo de serviço e dicas de uso */}
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            {/* Legenda de Tipos e Categorias */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Legenda:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Comerciais (#16A34A)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                Manutenção (#D97706)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                Administrativas (#7C3AED)
              </span>
            </div>

            {/* Instruções de interação Google Calendar */}
            <div className="flex items-center gap-3 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1">
                <GripVertical className="w-3.5 h-3.5 text-gray-400" />
                Arraste o card para reagendar
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="font-bold text-emerald-700">⇅</span>
                Puxe a borda para ajustar duração
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="font-bold text-gray-700">✎</span>
                Clique para editar
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VISUALIZAÇÃO: MENSAL (Grade do Mês + Painel Lateral)         */}
      {/* ========================================================== */}
      {viewMode === 'mes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          {/* GRID DO MÊS */}
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
                    onClick={() => {
                      setSelectedDia(cell.date)
                      setCurrentDate(cell.date)
                    }}
                    onDragOver={(e) => handleDragOverSlot(e, cell.dateKey, HORA_INICIAL)}
                    onDrop={(e) => handleDropOnSlot(e, cell.dateKey, HORA_INICIAL)}
                    className={`min-h-[82px] sm:min-h-[96px] p-1.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                      dragOverSlot?.dateKey === cell.dateKey
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400'
                        : isSelected
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
                            draggable
                            onDragStart={(e) => handleDragStart(e, atv.id)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => handleCardClick(e, atv)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate font-medium transition-transform hover:scale-[1.02] border cursor-pointer ${
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

          {/* PAINEL LATERAL: TAREFAS DO DIA SELECIONADO */}
          <div className="lg:col-span-4 p-4 sm:p-5 bg-gray-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 inline-flex">
                    <CalendarIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      Tarefas do Dia
                    </span>
                    <h4 className="text-sm font-bold text-gray-900">
                      {selectedDia
                        ? `${selectedDia.getDate()} de ${MESES[selectedDia.getMonth()]} de ${selectedDia.getFullYear()}`
                        : 'Hoje'}
                    </h4>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  {atividadesDiaSelecionado.length}{' '}
                  {atividadesDiaSelecionado.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
              </div>

              {/* Lista de tarefas do dia selecionado */}
              {atividadesDiaSelecionado.length === 0 ? (
                <div className="py-8 text-center text-gray-400 space-y-2 bg-white rounded-xl border border-gray-200 p-4">
                  <Clock className="w-7 h-7 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-700">
                    Nenhuma tarefa para este dia.
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                    Selecione outro dia no calendário ou clique para agendar uma nova tarefa.
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
                        onClick={(e) => handleCardClick(e, atv)}
                        role="button"
                        tabIndex={0}
                        className={`p-3 rounded-xl border bg-white shadow-2xs space-y-2 transition-all cursor-pointer text-left hover:shadow-xs group ${
                          isConcluida
                            ? 'border-gray-200 opacity-75'
                            : 'border-gray-200/90 hover:border-emerald-300'
                        }`}
                        style={{
                          borderLeftWidth: '3.5px',
                          borderLeftColor: isConcluida ? '#9CA3AF' : conf.corHex,
                        }}
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5
                                  className={`text-xs font-bold truncate group-hover:text-emerald-700 transition-colors ${
                                    isConcluida ? 'text-gray-500 line-through' : 'text-gray-900'
                                  }`}
                                >
                                  {atv.titulo || conf.tituloPadrao}
                                </h5>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5 text-gray-400" />
                                  {horaStr ? `${horaStr}h` : 'Livre'}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                    isConcluida
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {isConcluida ? 'Concluída' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleStatus(atv.id, atv.status || 'pendente')
                            }}
                            className={`p-1 rounded-md transition-colors shrink-0 ${
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
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenCliente(atv.cliente_id)
                              }}
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

      {/* Modal Completo de Edição ao Clicar na Atividade (responsável, horário, título, etc) */}
      {modalEditarOpen && modalAtividade && (
        <ModalDetalhesAtividade
          isOpen={modalEditarOpen}
          onClose={() => {
            setModalEditarOpen(false)
            setModalAtividade(null)
          }}
          atividade={modalAtividade}
          onSaved={(updated) => {
            setOverrides((prev) => ({
              ...prev,
              [updated.id]: { data: updated.data },
            }))
            if (onAtividadeUpdated) {
              onAtividadeUpdated(updated)
            }
          }}
        />
      )}
    </div>
  )
}
export default AtividadesCalendario
