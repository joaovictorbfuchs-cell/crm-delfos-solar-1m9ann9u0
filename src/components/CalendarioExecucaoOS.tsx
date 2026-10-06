import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { OrdemServico, OSTipoServico } from '@/types/crm'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarRange,
  CalendarDays,
  Clock,
  User,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/formatters'
import { updateOrdemServico } from '@/services/crmService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'

interface CalendarioExecucaoOSProps {
  ordens: OrdemServico[]
  onSelectOS: (os: OrdemServico) => void
  onOSUpdated?: (updatedOS: OrdemServico) => void
  isInstalador?: boolean
  instaladorNome?: string
  leftControlsSlot?: React.ReactNode
  rightActionsSlot?: React.ReactNode
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

// Extrai horário HH:mm da string de data UTC/ISO com defesa rigorosa
function extractHorario(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '--:--'
  try {
    // Se vier no formato "YYYY-MM-DD HH:mm..." com espaço ou T
    if (dateString.length >= 16) {
      const horaMin = dateString.slice(11, 16)
      if (/^\d{2}:\d{2}$/.test(horaMin)) {
        return horaMin
      }
    }
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '--:--'
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } catch (_) {
    return '--:--'
  }
}
export type CalendarioOSViewMode = 'mes' | 'semana' | 'dia'

// Grade horária: das 06:00 às 22:00 (16 horas = 17 marcas de horário)
const HORA_INICIAL = 6
const HORA_FINAL = 22
const TOTAL_HORAS = HORA_FINAL - HORA_INICIAL
const ALTURA_HORA_PX = 56 // 56px por hora para boa legibilidade
const DURACAO_PADRAO_MINUTOS = 60 // 1h padrão se não definido

// Helper para obter o domingo inicial de uma semana
function getStartOfWeekDate(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Domingo
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

// Extrai duração em minutos armazenada em metadados json existentes ou tempo_previsto_minutos
function getDuracaoMinutosOS(os: OrdemServico): number {
  if (!os) return DURACAO_PADRAO_MINUTOS
  if (typeof os.tempo_previsto_minutos === 'number' && os.tempo_previsto_minutos >= 15) {
    return os.tempo_previsto_minutos
  }
  try {
    const dados = (os.instrucoes_seguranca || os.detalhes_execucao) as any
    if (dados && typeof dados === 'object' && typeof dados.duracao_minutos === 'number') {
      const d = Math.round(dados.duracao_minutos)
      if (d >= 15 && d <= 720) return d
    }
  } catch {
    /* fallback */
  }
  return DURACAO_PADRAO_MINUTOS
}

export function CalendarioExecucaoOS({
  ordens,
  onSelectOS,
  onOSUpdated,
  isInstalador,
  instaladorNome,
  leftControlsSlot,
  rightActionsSlot,
}: CalendarioExecucaoOSProps) {
  const now = new Date()
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<CalendarioOSViewMode>('semana')
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(() =>
    getLocalDateKey(new Date()),
  )

  // Overrides locais para drag & drop e resize imediatos
  const [overrides, setOverrides] = useState<
    Record<string, { data_agendada?: string; duracao_minutos?: number }>
  >({})

  // Estado de Drag & Drop
  const [draggingOSId, setDraggingOSId] = useState<string | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ dateKey: string; hora: number } | null>(null)

  // Estado de Resize (ajuste de duração na borda inferior)
  const [resizing, setResizing] = useState<{
    osId: string
    startY: number
    startDuracao: number
    currentDuracao: number
  } | null>(null)

  const timeGridRef = useRef<HTMLDivElement>(null)

  // Data base para visão Dia (se tiver selectedDayKey, converte; senão hoje)
  const selectedDayDate = useMemo(() => {
    if (!selectedDayKey) return new Date()
    const parts = selectedDayKey.split('-').map(Number)
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      if (!isNaN(d.getTime())) return d
    }
    return new Date()
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

  // Mesclar ordens com overrides locais de reagendamento/redimensionamento
  const ordensMescladas = useMemo(() => {
    return (ordens || []).map((os) => {
      if (!os) return os
      const ov = overrides[os.id]
      if (!ov) return os
      return {
        ...os,
        data_agendada: ov.data_agendada ?? os.data_agendada,
        tempo_previsto_minutos: ov.duracao_minutos ?? os.tempo_previsto_minutos,
      }
    })
  }, [ordens, overrides])

  // ==========================================================
  // DRAG & DROP: Reposicionar OS em outro horário / dia
  // ==========================================================
  const handleDragStart = (e: React.DragEvent, osId: string) => {
    e.dataTransfer.setData('text/plain', osId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingOSId(osId)
  }

  const handleDragEnd = () => {
    setDraggingOSId(null)
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
    const osId = e.dataTransfer.getData('text/plain') || draggingOSId
    setDraggingOSId(null)
    setDragOverSlot(null)
    if (!osId) return

    const os = ordensMescladas.find((o) => o?.id === osId)
    if (!os) return

    // Preserva minutos originais arredondados para múltiplos de 5
    let minutos = 0
    if (os.data_agendada && os.data_agendada.length >= 16) {
      const rawMin = parseInt(os.data_agendada.slice(14, 16), 10) || 0
      minutos = Math.min(55, Math.max(0, Math.round(rawMin / 5) * 5))
    }

    const horaFormatada = String(targetHora).padStart(2, '0')
    const minutoFormatado = String(minutos).padStart(2, '0')
    // Padrão PocketBase (YYYY-MM-DD HH:mm:00)
    const novaDataIso = `${targetDateKey} ${horaFormatada}:${minutoFormatado}:00`

    // Atualização otimista
    setOverrides((prev) => ({
      ...prev,
      [osId]: { ...prev[osId], data_agendada: novaDataIso },
    }))

    try {
      const payload: Partial<OrdemServico> = {
        data_agendada: novaDataIso,
      }
      if (os.origem === 'atividades') {
        payload.origem = 'atividades'
      }

      const updated = await updateOrdemServico(osId, payload)
      toast({
        title: 'Horário reagendado com sucesso! 📅',
        description: `Agendado para ${targetDateKey.split('-').reverse().join('/')} às ${horaFormatada}:${minutoFormatado}h.`,
      })
      if (onOSUpdated) {
        onOSUpdated(updated)
      }
    } catch (err) {
      console.error('Erro ao reagendar ordem de serviço:', err)
      // Reverte override
      setOverrides((prev) => {
        const copy = { ...prev }
        delete copy[osId]
        return copy
      })

      if (isAuthSessionError(err)) {
        toast({
          variant: 'destructive',
          title: 'Sessão expirada',
          description: 'Faça login novamente para reagendar a ordem de serviço.',
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
  const handleResizeStart = (e: React.MouseEvent, os: OrdemServico) => {
    e.stopPropagation()
    e.preventDefault()
    const duracaoAtual = getDuracaoMinutosOS(os)
    setResizing({
      osId: os.id,
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
        [resizing.osId]: {
          ...prev[resizing.osId],
          duracao_minutos: duracaoFinal,
        },
      }))
    }

    const handleMouseUp = async () => {
      const targetOSId = resizing.osId
      const duracaoFinal = resizing.currentDuracao
      setResizing(null)

      const os = ordensMescladas.find((o) => o?.id === targetOSId)
      if (!os) return

      try {
        const payload: Partial<OrdemServico> = {
          tempo_previsto_minutos: duracaoFinal,
        }
        if (os.origem === 'atividades') {
          payload.origem = 'atividades'
        }

        const updated = await updateOrdemServico(targetOSId, payload)

        toast({
          title: 'Duração atualizada! ⏱️',
          description: `Tempo previsto ajustado para ${duracaoFinal} minutos.`,
        })

        if (onOSUpdated) {
          onOSUpdated(updated)
        }
      } catch (err) {
        console.error('Erro ao salvar duração da ordem de serviço:', err)
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
  }, [resizing, ordensMescladas, toast, onOSUpdated])

  // Separar ordens de serviço do dia em "Dia todo" vs "Com horário (06:00 - 22:00)"
  const separarOrdensDoDia = useCallback((ordensDoDia: OrdemServico[]) => {
    const diaInteiro: OrdemServico[] = []
    const comHorario: Array<{
      os: OrdemServico
      hora: number
      minuto: number
      top: number
      height: number
      duracaoMinutos: number
    }> = []

    for (const os of ordensDoDia) {
      if (!os || !os.data_agendada || os.data_agendada.length < 13) {
        diaInteiro.push(os)
        continue
      }

      let hora = NaN
      let minuto = 0

      try {
        const horaPart = os.data_agendada.slice(11, 13)
        hora = parseInt(horaPart, 10)
        if (os.data_agendada.length >= 16) {
          minuto = parseInt(os.data_agendada.slice(14, 16), 10) || 0
        }
      } catch {
        hora = NaN
      }

      if (isNaN(hora)) {
        const d = new Date(os.data_agendada)
        if (!isNaN(d.getTime())) {
          hora = d.getHours()
          minuto = d.getMinutes()
        }
      }

      // Se estiver fora do intervalo 06:00 - 22:00, aloca em dia inteiro
      if (isNaN(hora) || hora < HORA_INICIAL || hora >= HORA_FINAL) {
        diaInteiro.push(os)
        continue
      }

      const duracaoMinutos = getDuracaoMinutosOS(os)
      const top = (hora - HORA_INICIAL) * ALTURA_HORA_PX + (minuto / 60) * ALTURA_HORA_PX
      const height = Math.max(28, (duracaoMinutos / 60) * ALTURA_HORA_PX - 2)

      comHorario.push({
        os,
        hora,
        minuto,
        top,
        height,
        duracaoMinutos,
      })
    }

    comHorario.sort((a, b) => a.top - b.top)

    return { diaInteiro, comHorario }
  }, [])

  // Agrupar ordens por chave de data (YYYY-MM-DD)
  const ordensPorDia = useMemo(() => {
    const map = new Map<string, OrdemServico[]>()
    for (const os of ordensMescladas || []) {
      if (!os || !os.data_agendada) continue
      try {
        const d = new Date(os.data_agendada)
        if (isNaN(d.getTime())) continue
        const key = getLocalDateKey(d)
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key)!.push(os)
      } catch (_) {
        // Ignora datas inválidas
      }
    }
    // Ordenar as OS de cada dia por horário com defesa isNaN
    for (const [, list] of map.entries()) {
      list.sort((a, b) => {
        const dateA = a?.data_agendada ? new Date(a.data_agendada) : null
        const dateB = b?.data_agendada ? new Date(b.data_agendada) : null
        const timeA = dateA && !isNaN(dateA.getTime()) ? dateA.getTime() : 0
        const timeB = dateB && !isNaN(dateB.getTime()) ? dateB.getTime() : 0
        return timeA - timeB
      })
    }
    return map
  }, [ordensMescladas]) // Matriz de dias para o calendário (7 colunas, domingo a sábado)
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
    <div className="space-y-2 w-full">
      {/* Cabeçalho Compacto e Consolidado em Linha Única:
          Esquerda: Abas de navegação (Pendentes, Calendário, Concluídas, Relatório)
          Centro: Controles de período (Navegação < Hoje > + Rótulo + Seletor Mês/Semana/Dia)
          Direita: Ações Primárias (Nova Atividade, Filtros) */}
      <div className="bg-white rounded-xl px-2.5 py-1.5 border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        {/* Bloco Esquerda: Abas de navegação injetadas ou título padrão se standalone */}
        <div className="flex items-center gap-2 shrink-0">
          {leftControlsSlot ? (
            leftControlsSlot
          ) : (
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-gray-900">Calendário de Atividades</span>
            </div>
          )}
        </div>

        {/* Bloco Central: Período, Navegação e Modo de Visualização */}
        <div className="flex items-center gap-2 flex-wrap justify-center flex-1 min-w-[280px]">
          {/* Navegação entre períodos: < Hoje > */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrev}
              className="h-7 w-7 p-0 rounded-md border-gray-200 hover:bg-gray-50 text-gray-700 shrink-0"
              title={
                viewMode === 'mes'
                  ? 'Mês anterior'
                  : viewMode === 'semana'
                    ? 'Semana anterior'
                    : 'Dia anterior'
              }
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCurrent}
              className="h-7 px-2 rounded-md border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs shrink-0"
              title="Ir para o período atual"
            >
              Hoje
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="h-7 w-7 p-0 rounded-md border-gray-200 hover:bg-gray-50 text-gray-700 shrink-0"
              title={
                viewMode === 'mes'
                  ? 'Próximo mês'
                  : viewMode === 'semana'
                    ? 'Próxima semana'
                    : 'Próximo dia'
              }
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Rótulo do Período + Badge Compacta de Contagem */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs sm:text-sm font-bold text-gray-900 tracking-tight whitespace-nowrap">
              {headerPeriodoTexto}
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap"
              title={`${totalNoPeriodoExibido} ordem(ns) de serviço agendada(s) no período`}
            >
              {totalNoPeriodoExibido} OS
            </span>
          </div>

          {/* Seletor de Modo: Mês | Semana | Dia */}
          <div className="inline-flex items-center p-0.5 bg-gray-100/90 rounded-md border border-gray-200 shadow-2xs text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('mes')}
              className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                viewMode === 'mes'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setViewMode('semana')}
              className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                viewMode === 'semana'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('dia')
                if (!selectedDayKey) {
                  setSelectedDayKey(getLocalDateKey(new Date()))
                }
              }}
              className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                viewMode === 'dia'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dia
            </button>
          </div>
        </div>

        {/* Bloco Direita: Ações Primárias (Nova Atividade + Filtros) */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end">{rightActionsSlot}</div>
      </div>

      {/* Legenda de Tipos de Serviço Compacta em Linha Única */}
      <div className="bg-white rounded-xl px-2.5 py-1 border border-gray-200/90 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-3 sm:gap-4 text-xs shrink-0 flex-nowrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
            Legenda:
          </span>
          {Object.entries(TIPO_SERVICO_CORES).map(([tipo, config]) => (
            <div
              key={tipo}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 shrink-0"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: config.hex }}
              />
              <span className="whitespace-nowrap">{config.nome}</span>
            </div>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-1 text-[10px] text-gray-400 font-medium shrink-0 ml-auto pl-2 border-l border-gray-100">
          <span>06:00 – 22:00</span>
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
                        if (!os) return null
                        const tipoServico = os.tipo_servico || 'Manutenção'
                        const tipoConfig =
                          TIPO_SERVICO_CORES[tipoServico] || TIPO_SERVICO_CORES['Manutenção']
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
                            title={`${horario} • ${clienteNome} (${tipoServico}) - Clique para abrir a ficha de execução`}
                          >
                            {/* Horário + Tipo (com cor) */}
                            <div className="flex items-center justify-between gap-1 leading-none mb-0.5">
                              <span className="text-[10px] sm:text-[11px] font-bold text-gray-900 flex items-center gap-0.5 shrink-0">
                                <Clock className="w-2.5 h-2.5 text-gray-500" />
                                {horario}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span
                                  className="text-[9px] font-extrabold uppercase truncate tracking-wider"
                                  style={{ color: tipoConfig.hex }}
                                >
                                  {tipoServico}
                                </span>
                              </div>
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
                onClick={handleCurrent}
                className="h-8 px-3 rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
              >
                Ir para a Semana Atual
              </Button>{' '}
            </div>
          )}
        </>
      )}

      {/* ========================================================== */}
      {/* VISÃO 2: SEMANA (Grade Horária Google Calendar 06:00 - 22:00) */}
      {/* ========================================================== */}
      {viewMode === 'semana' && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden select-none flex flex-col">
          {/* Seção "Dia Todo / Sem Horário Definido" no topo */}
          <div className="border-b border-gray-200 bg-gray-50/70 p-2 sm:p-2.5">
            <div className="flex items-start gap-2">
              <div className="w-14 sm:w-16 shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider pt-1.5 text-right pr-2">
                Dia todo
              </div>
              <div className="flex-1 grid grid-cols-7 gap-2 min-w-[700px] overflow-x-auto">
                {weekDays.map((dia) => {
                  const dayOrdens = ordensPorDia.get(dia.dateKey) || []
                  const { diaInteiro } = separarOrdensDoDia(dayOrdens)

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
                        diaInteiro.map((os) => {
                          const tipoServico = os.tipo_servico || 'Manutenção'
                          const tipoConfig =
                            TIPO_SERVICO_CORES[tipoServico] || TIPO_SERVICO_CORES['Manutenção']
                          const clienteNome =
                            os.expand?.cliente_id?.nome ||
                            os.expand?.cliente_id?.razao_social ||
                            'Cliente Solar'

                          return (
                            <div
                              key={`allday-${os.id}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, os.id)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectOS(os)
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border bg-white shadow-2xs hover:border-gray-400 cursor-pointer transition-all hover:shadow-xs flex items-center justify-between gap-1"
                              style={{
                                borderLeftWidth: '3px',
                                borderLeftColor: tipoConfig.hex,
                              }}
                              title={`${clienteNome} (${tipoServico}) - Clique para ver ficha / arraste para grade`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="truncate">{clienteNome}</span>
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

          {/* Cabeçalho das Colunas de Dias da Semana */}
          <div className="flex border-b border-gray-200 bg-[#FAFBFB] sticky top-0 z-10">
            {/* Coluna da régua de horas (espaçador) */}
            <div className="w-14 sm:w-16 shrink-0 border-r border-gray-200 p-2 text-[10px] font-bold text-gray-400 text-right uppercase tracking-wider">
              GMT-3
            </div>

            {/* Colunas dos 7 dias */}
            <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 min-w-[700px]">
              {weekDays.map((dia) => (
                <div
                  key={`header-${dia.dateKey}`}
                  onClick={() => setSelectedDayKey(dia.dateKey)}
                  className={`p-2 sm:p-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    dia.isToday
                      ? 'bg-emerald-50/80 text-emerald-950 font-bold'
                      : selectedDayKey === dia.dateKey
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
                      {dia.dayNumber}
                    </span>
                  </div>

                  <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                    {MESES[dia.date.getMonth()].slice(0, 3)}
                  </span>
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

            {/* Colunas de cada dia na grade horária (7 colunas) */}
            <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 min-w-[700px] relative">
              {weekDays.map((dia) => {
                const dayOrdens = ordensPorDia.get(dia.dateKey) || []
                const { comHorario } = separarOrdensDoDia(dayOrdens)

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
                          onClick={() => setSelectedDayKey(dia.dateKey)}
                          className={`border-b border-gray-100 transition-colors cursor-pointer group/slot relative ${
                            isHovered
                              ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-400/40'
                              : 'hover:bg-gray-50/80'
                          }`}
                          style={{ height: `${ALTURA_HORA_PX}px` }}
                          title={`Arraste uma OS até as ${hora}:00h ou clique para selecionar o dia`}
                        >
                          {/* Linha pontilhada de meia hora para visualização precisa */}
                          <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-gray-100/80 pointer-events-none" />
                        </div>
                      )
                    })}

                    {/* Cards de OS Posicionados na Grade */}
                    {comHorario.map((item) => {
                      const os = item.os
                      const tipoServico = os.tipo_servico || 'Manutenção'
                      const tipoConfig =
                        TIPO_SERVICO_CORES[tipoServico] || TIPO_SERVICO_CORES['Manutenção']
                      const isConcluida = os.status === 'concluida'
                      const isDragging = draggingOSId === os.id
                      const isBeingResized = resizing?.osId === os.id
                      const horaInicioStr = extractHorario(os.data_agendada)

                      // Calcula hora de término prevista
                      const minutosInicio = item.hora * 60 + item.minuto
                      const minutosFim = minutosInicio + item.duracaoMinutos
                      const horaFim = Math.floor(minutosFim / 60)
                      const minutoFim = minutosFim % 60
                      const horaFimStr = `${String(horaFim).padStart(2, '0')}:${String(minutoFim).padStart(2, '0')}`

                      const clienteNome =
                        os.expand?.cliente_id?.nome ||
                        os.expand?.cliente_id?.razao_social ||
                        'Cliente Solar'

                      return (
                        <div
                          key={`card-${os.id}`}
                          draggable={!isBeingResized}
                          onDragStart={(e) => handleDragStart(e, os.id)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectOS(os)
                          }}
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
                            borderLeftColor: isConcluida ? '#9CA3AF' : tipoConfig.hex,
                            backgroundColor: isConcluida ? '#F9FAFB' : tipoConfig.pillBg,
                            zIndex: isDragging || isBeingResized ? 30 : 10,
                          }}
                          title={`${clienteNome} (${tipoServico}) • ${horaInicioStr} - ${horaFimStr}\nClique para abrir ficha de execução\nArraste para mover horário/dia\nPuxe a borda inferior para ajustar duração`}
                        >
                          {/* Conteúdo do Card */}
                          <div className="min-w-0 flex-1">
                            {/* Topo: Horário + Tipo */}
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[10px] font-bold text-gray-700 font-mono flex items-center gap-0.5 shrink-0">
                                <Clock className="w-2.5 h-2.5 text-gray-400" />
                                {horaInicioStr} - {horaFimStr}
                              </span>

                              <div className="flex items-center gap-1 shrink-0">
                                <span
                                  className="text-[8px] font-extrabold uppercase tracking-wider truncate"
                                  style={{ color: tipoConfig.hex }}
                                >
                                  {tipoServico}
                                </span>
                              </div>
                            </div>

                            {/* Nome do Cliente */}
                            <div
                              className={`text-[11px] font-bold leading-tight truncate ${
                                isConcluida
                                  ? 'text-gray-400 line-through'
                                  : 'text-gray-900 group-hover:text-emerald-800'
                              }`}
                            >
                              {clienteNome}
                            </div>

                            {/* Responsável / Duração (se couber na altura) */}
                            {item.height >= 48 && (
                              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5 truncate gap-1">
                                <span className="truncate flex items-center gap-0.5">
                                  <User className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                                  <span className="truncate">
                                    {os.atribuida_a || 'Não atribuído'}
                                  </span>
                                </span>
                                <span className="text-[9px] text-gray-400 shrink-0">
                                  {item.duracaoMinutos}m
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Alça inferior de redimensionamento (resize handle de 15 em 15 min) */}
                          <div
                            onMouseDown={(e) => handleResizeStart(e, os)}
                            className="w-full h-2 cursor-ns-resize flex items-center justify-center hover:bg-emerald-200/50 rounded-b transition-colors -mb-1 -mx-1"
                            title="Arraste para aumentar ou reduzir o tempo previsto (blocos de 15 min)"
                          >
                            <div className="w-6 h-1 rounded-full bg-gray-300 group-hover:bg-emerald-600 transition-colors" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dicas e Instruções Google Calendar */}
          <div className="px-2.5 py-1.5 border-t border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[11px] text-gray-500">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1"
                title="Arraste uma OS até o horário ou clique para selecionar o dia"
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Arraste uma OS até o horário ou clique para selecionar o dia</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-gray-400">
                • Puxe a borda para ajustar duração • Clique para abrir ficha
              </span>
            </div>

            <div className="text-[10px] font-semibold text-emerald-800 shrink-0">06:00 – 22:00</div>
          </div>
        </div>
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
                className="h-8 px-3 rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
              >
                Ir para o Mês Atual
              </Button>{' '}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ordensDiaSelecionado.map((os) => {
                if (!os) return null
                const tipoServico = os.tipo_servico || 'Manutenção'
                const tipoConfig =
                  TIPO_SERVICO_CORES[tipoServico] || TIPO_SERVICO_CORES['Manutenção']
                const horario = extractHorario(os.data_agendada)
                const clienteNome =
                  os.expand?.cliente_id?.nome ||
                  os.expand?.cliente_id?.razao_social ||
                  'Cliente Solar'
                const checklistTotal = (os?.checklist ?? []).length
                const checklistFeitos = (os?.checklist ?? []).filter((c) => c?.concluido).length

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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                            style={{
                              borderColor: `${tipoConfig.borderColor}50`,
                              backgroundColor: tipoConfig.pillBg,
                              color: tipoConfig.hex,
                            }}
                          >
                            {tipoServico}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {horario}
                        </span>
                      </div>

                      {/* Nome do Cliente */}
                      <h5
                        title={clienteNome}
                        className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-1"
                      >
                        {clienteNome}
                      </h5>

                      {/* Endereço */}
                      <div
                        title={os.endereco || 'Endereço não informado'}
                        className="flex items-start gap-1.5 text-xs text-gray-600 mb-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed break-words">
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
                if (!os) return null
                const tipoServico = os.tipo_servico || 'Manutenção'
                const tipoConfig =
                  TIPO_SERVICO_CORES[tipoServico] || TIPO_SERVICO_CORES['Manutenção']
                const horario = extractHorario(os.data_agendada)
                const clienteNome =
                  os.expand?.cliente_id?.nome ||
                  os.expand?.cliente_id?.razao_social ||
                  'Cliente Solar'
                const checklistTotal = (os?.checklist ?? []).length
                const checklistFeitos = (os?.checklist ?? []).filter((c) => c?.concluido).length

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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                            style={{
                              borderColor: `${tipoConfig.borderColor}50`,
                              backgroundColor: tipoConfig.pillBg,
                              color: tipoConfig.hex,
                            }}
                          >
                            {tipoServico}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {horario}
                        </span>
                      </div>

                      {/* Nome do Cliente */}
                      <h5
                        title={clienteNome}
                        className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-1"
                      >
                        {clienteNome}
                      </h5>

                      {/* Endereço */}
                      <div
                        title={os.endereco || 'Endereço não informado'}
                        className="flex items-start gap-1.5 text-xs text-gray-600 mb-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed break-words">
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

export default CalendarioExecucaoOS
