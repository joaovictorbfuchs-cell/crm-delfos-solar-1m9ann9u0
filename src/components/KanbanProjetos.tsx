import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GripVertical,
  HardHat,
  CheckCircle2,
  Clock,
  ClipboardList,
  FileCheck,
  ShoppingCart,
  PackageCheck,
  Hammer,
  MoreVertical,
  FolderOpen,
  FileText,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { Projeto, ProjetoEtapa, Profissional, Atividade, OrcamentoSolar } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'
import { MobileKanbanViewport, type MobileKanbanStage } from '@/components/MobileKanbanViewport'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { cleanPhoneDigits } from '@/lib/formatters'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface KanbanProjetosProps {
  projetos: Projeto[]
  profissionais: Profissional[]
  onOpenAtribuirModal: (projeto: Projeto, targetEtapa?: ProjetoEtapa) => void
}

export interface ProjetoColumnDef {
  id: ProjetoEtapa
  stepNumber: number
  title: string
  shortTitle: string
  borderClass: string
  headerBgClass: string
  badgeBgClass: string
  icon: LucideIcon
  iconColorClass: string
}

export const PROJETOS_COLUMNS: ProjetoColumnDef[] = [
  {
    id: 'Levantamento de Informações',
    stepNumber: 1,
    title: '1. Levantamento',
    shortTitle: 'Levantamento de Informações',
    borderClass: 'border-t-sky-500',
    headerBgClass: 'bg-sky-50/50',
    badgeBgClass: 'bg-sky-100 text-sky-800 border-sky-300',
    icon: ClipboardList,
    iconColorClass: 'text-sky-600',
  },
  {
    id: 'Elaboração de Projeto',
    stepNumber: 2,
    title: '2. Elaboração',
    shortTitle: 'Elaboração de Projeto',
    borderClass: 'border-t-indigo-500',
    headerBgClass: 'bg-indigo-50/50',
    badgeBgClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: FileCheck,
    iconColorClass: 'text-indigo-600',
  },
  {
    id: 'Pedido de Compra',
    stepNumber: 3,
    title: '3. Pedido Compra',
    shortTitle: 'Pedido de Compra',
    borderClass: 'border-t-amber-500',
    headerBgClass: 'bg-amber-50/50',
    badgeBgClass: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: ShoppingCart,
    iconColorClass: 'text-amber-600',
  },
  {
    id: 'Aguardando Material',
    stepNumber: 4,
    title: '4. Aguardando Mat.',
    shortTitle: 'Aguardando Material',
    borderClass: 'border-t-purple-500',
    headerBgClass: 'bg-purple-50/50',
    badgeBgClass: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: PackageCheck,
    iconColorClass: 'text-purple-600',
  },
  {
    id: 'Instalação',
    stepNumber: 5,
    title: '5. Instalação',
    shortTitle: 'Instalação em Campo',
    borderClass: 'border-t-orange-500',
    headerBgClass: 'bg-orange-50/50',
    badgeBgClass: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: Hammer,
    iconColorClass: 'text-orange-600',
  },
  {
    id: 'Concluído',
    stepNumber: 6,
    title: '6. Concluído',
    shortTitle: 'Concluído / Homologado',
    borderClass: 'border-t-emerald-600',
    headerBgClass: 'bg-emerald-50/50',
    badgeBgClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: CheckCircle2,
    iconColorClass: 'text-emerald-600',
  },
]

export const KanbanProjetos: React.FC<KanbanProjetosProps> = ({
  projetos,
  profissionais,
  onOpenAtribuirModal,
}) => {
  const navigate = useNavigate()
  const { openFichaCliente, updateProjeto, updateProjetoEtapa, atividades, orcamentosSolar } =
    useClientes()

  const [draggedProjetoId, setDraggedProjetoId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<ProjetoEtapa | null>(null)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState<string>('')

  // Proposta solar vinculada mais relevante por cliente: aprovada ou mais recente
  const propostaPorCliente = useMemo(() => {
    const mapa = new Map<string, OrcamentoSolar>()
    const porCliente = new Map<string, OrcamentoSolar[]>()

    for (const orc of orcamentosSolar || []) {
      if (!orc.cliente_id) continue
      const list = porCliente.get(orc.cliente_id) || []
      list.push(orc)
      porCliente.set(orc.cliente_id, list)
    }

    for (const [cliId, list] of porCliente.entries()) {
      const aprovada = list.find(
        (o) =>
          o.status === 'Aprovado' ||
          (o.status as string) === 'aprovada' ||
          (o.status as string) === 'Aprovada',
      )
      if (aprovada) {
        mapa.set(cliId, aprovada)
      } else {
        const ordenadas = [...list].sort(
          (a, b) =>
            new Date(b.created || b.data_orcamento || 0).getTime() -
            new Date(a.created || a.data_orcamento || 0).getTime(),
        )
        if (ordenadas.length > 0) {
          mapa.set(cliId, ordenadas[0])
        }
      }
    }

    return mapa
  }, [orcamentosSolar])

  // Mapeamento otimizado de próxima atividade agendada por cliente
  const proximaAcaoPorCliente = useMemo(() => {
    const mapa = new Map<string, Atividade>()
    const now = Date.now()

    const pendentes = (atividades || []).filter(
      (a) => a.status === 'pendente' && a.tipo !== 'mudanca_estagio',
    )

    const agrupado = new Map<string, Atividade[]>()
    for (const a of pendentes) {
      if (!a.cliente_id) continue
      const list = agrupado.get(a.cliente_id) || []
      list.push(a)
      agrupado.set(a.cliente_id, list)
    }

    for (const [cliId, list] of agrupado.entries()) {
      const futuras = list
        .filter((a) => new Date(a.data || a.created).getTime() >= now - 60 * 60 * 1000)
        .sort(
          (a, b) =>
            new Date(a.data || a.created).getTime() - new Date(b.data || b.created).getTime(),
        )

      if (futuras.length > 0) {
        mapa.set(cliId, futuras[0])
      } else {
        const atrasadas = [...list].sort(
          (a, b) =>
            new Date(b.data || b.created).getTime() - new Date(a.data || a.created).getTime(),
        )
        mapa.set(cliId, atrasadas[0])
      }
    }

    return mapa
  }, [atividades])

  // Cálculo de dias na etapa para cada projeto
  const getDiasNaEtapa = (proj: Projeto) => {
    const rawDate = proj.updated || proj.created
    if (!rawDate) return 0
    const diffMs = Date.now() - new Date(rawDate).getTime()
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, dias)
  }

  // Título padrão da usina com fallback
  const getTituloUsina = (proj: Projeto) => {
    if (proj.titulo_usina && proj.titulo_usina.trim()) {
      return proj.titulo_usina.trim()
    }
    const cliente = proj.expand?.cliente_id
    const clienteNome = cliente?.nome || 'Cliente'
    const potencia = proj.potencia_kwp || cliente?.potencia_kwp || 0
    const potFormatada = potencia.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    return `Usina ${potFormatada} kWp — ${clienteNome}`
  }

  // Cor da próxima atividade: verde (no prazo), laranja (vence hoje), vermelho (atrasada)
  const getAtividadePrazoInfo = (atv: Atividade) => {
    const dStr = atv.data || atv.created
    if (!dStr) {
      return {
        corClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
        dotClass: 'bg-emerald-500',
      }
    }
    const d = new Date(dStr)
    if (isNaN(d.getTime())) {
      return {
        corClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
        dotClass: 'bg-emerald-500',
      }
    }

    const agora = new Date()
    const hojeInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()
    const hojeFim = hojeInicio + 24 * 60 * 60 * 1000 - 1
    const dataTime = d.getTime()

    if (dataTime < hojeInicio) {
      // Atrasada
      return {
        corClass: 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100',
        dotClass: 'bg-rose-500',
      }
    } else if (dataTime >= hojeInicio && dataTime <= hojeFim) {
      // Vence hoje
      return {
        corClass: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
        dotClass: 'bg-amber-500',
      }
    } else {
      // No prazo / futura
      return {
        corClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
        dotClass: 'bg-emerald-500',
      }
    }
  }

  const handleStartEditingTitle = (proj: Projeto, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTitleId(proj.id)
    setEditingTitleValue(proj.titulo_usina || getTituloUsina(proj))
  }

  const handleCancelEditingTitle = () => {
    setEditingTitleId(null)
    setEditingTitleValue('')
  }

  const handleSaveTitle = async (projId: string) => {
    const novo = editingTitleValue.trim()
    setEditingTitleId(null)
    setEditingTitleValue('')
    try {
      await updateProjeto(projId, { titulo_usina: novo })
    } catch (err) {
      console.error('Erro ao salvar título da usina:', err)
    }
  }

  // Touch drag state
  const [isTouchDragging, setIsTouchDragging] = useState(false)
  const touchStateRef = useRef<{
    projetoId: string
    initialX: number
    initialY: number
    currentX: number
    currentY: number
    ghostEl: HTMLElement | null
    isDragging: boolean
    longPressTimer?: ReturnType<typeof setTimeout>
  } | null>(null)

  const handleCardClick = (projeto: Projeto) => {
    if (touchStateRef.current?.isDragging) return
    if (projeto.cliente_id) {
      openFichaCliente(projeto.cliente_id, 'projeto')
    }
  }

  // Drag and drop HTML5 handlers
  const handleDragStart = (e: React.DragEvent, projeto: Projeto) => {
    setDraggedProjetoId(projeto.id)
    e.dataTransfer.setData('text/plain', projeto.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedProjetoId(null)
    setDragOverColumnId(null)
  }

  const handleDragOver = (e: React.DragEvent, colId: ProjetoEtapa) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId)
    }
  }

  const handleDragLeave = (e: React.DragEvent, colId: ProjetoEtapa) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    const currentTarget = e.currentTarget as HTMLElement
    if (!currentTarget.contains(relatedTarget)) {
      if (dragOverColumnId === colId) {
        setDragOverColumnId(null)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent, targetEtapa: ProjetoEtapa) => {
    e.preventDefault()
    const projId = e.dataTransfer.getData('text/plain') || draggedProjetoId
    setDraggedProjetoId(null)
    setDragOverColumnId(null)

    if (!projId) return
    const targetProj = projetos.find((p) => p.id === projId)
    if (!targetProj || targetProj.etapa === targetEtapa) return

    // Se a etapa de destino for Instalação (ou se o projeto ainda não tiver responsável),
    // podemos abrir o modal de seleção para o usuário escolher o instalador
    if (targetEtapa === 'Instalação' && !targetProj.profissional_id) {
      onOpenAtribuirModal(targetProj, targetEtapa)
      // Primeiro atualiza a etapa
      await updateProjetoEtapa(projId, targetEtapa)
      return
    }

    try {
      await updateProjetoEtapa(projId, targetEtapa)
    } catch (err) {
      console.error('Falha ao mover card de projeto:', err)
    }
  }

  // Touch Handlers para mobile
  const handleTouchStart = (e: React.TouchEvent, projeto: Projeto) => {
    const touch = e.touches[0]
    const targetCard = e.currentTarget as HTMLElement

    const state = {
      projetoId: projeto.id,
      initialX: touch.clientX,
      initialY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      ghostEl: null as HTMLElement | null,
      isDragging: false,
    }
    touchStateRef.current = state

    // Long press de 260ms para ativar o arrasto no mobile sem interferir no swipe horizontal da tela
    const timer = setTimeout(() => {
      if (!touchStateRef.current) return
      touchStateRef.current.isDragging = true
      setIsTouchDragging(true)
      setDraggedProjetoId(projeto.id)

      const ghost = targetCard.cloneNode(true) as HTMLElement
      ghost.style.position = 'fixed'
      ghost.style.zIndex = '9999'
      ghost.style.pointerEvents = 'none'
      ghost.style.opacity = '0.92'
      ghost.style.transform = 'scale(1.03)'
      ghost.style.boxShadow = '0 12px 28px -5px rgba(0, 0, 0, 0.3)'
      ghost.style.width = `${targetCard.offsetWidth}px`
      ghost.style.left = `${touchStateRef.current.currentX - targetCard.offsetWidth / 2}px`
      ghost.style.top = `${touchStateRef.current.currentY - 40}px`
      document.body.appendChild(ghost)
      touchStateRef.current.ghostEl = ghost
    }, 260)

    touchStateRef.current.longPressTimer = timer
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStateRef.current) return
    const touch = e.touches[0]
    touchStateRef.current.currentX = touch.clientX
    touchStateRef.current.currentY = touch.clientY

    const deltaX = Math.abs(touch.clientX - touchStateRef.current.initialX)
    const deltaY = Math.abs(touch.clientY - touchStateRef.current.initialY)

    if (!touchStateRef.current.isDragging && (deltaX > 15 || deltaY > 15)) {
      if (touchStateRef.current.longPressTimer) {
        clearTimeout(touchStateRef.current.longPressTimer)
      }
    }

    if (touchStateRef.current.isDragging && touchStateRef.current.ghostEl) {
      e.preventDefault()
      const ghost = touchStateRef.current.ghostEl
      const cardWidth = ghost.offsetWidth
      ghost.style.left = `${touch.clientX - cardWidth / 2}px`
      ghost.style.top = `${touch.clientY - 40}px`

      const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY)
      const colEl = elementUnder?.closest('[data-projeto-column-id]') as HTMLElement | null
      if (colEl) {
        const colId = colEl.getAttribute('data-projeto-column-id') as ProjetoEtapa
        if (colId) setDragOverColumnId(colId)
      } else {
        setDragOverColumnId(null)
      }
    }
  }

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (!touchStateRef.current) return

    if (touchStateRef.current.longPressTimer) {
      clearTimeout(touchStateRef.current.longPressTimer)
    }

    const { ghostEl, isDragging, projetoId } = touchStateRef.current

    if (ghostEl) ghostEl.remove()

    if (isDragging) {
      e.preventDefault()
      const touch = e.changedTouches[0]
      const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY)
      const colEl = elementUnder?.closest('[data-projeto-column-id]') as HTMLElement | null

      if (colEl) {
        const targetEtapa = colEl.getAttribute('data-projeto-column-id') as ProjetoEtapa
        const proj = projetos.find((p) => p.id === projetoId)
        if (targetEtapa && proj && proj.etapa !== targetEtapa) {
          try {
            await updateProjetoEtapa(projetoId, targetEtapa)
            if (targetEtapa === 'Instalação' && !proj.profissional_id) {
              onOpenAtribuirModal(proj, targetEtapa)
            }
          } catch (err) {
            console.error('Falha ao mover card touch:', err)
          }
        }
      }
    }

    setTimeout(() => {
      touchStateRef.current = null
      setIsTouchDragging(false)
      setDraggedProjetoId(null)
      setDragOverColumnId(null)
    }, 50)
  }

  useEffect(() => {
    return () => {
      if (touchStateRef.current?.ghostEl) {
        touchStateRef.current.ghostEl.remove()
      }
    }
  }, [])

  // Renderizador de uma coluna individual de Projetos (reutilizado em Desktop e Mobile)
  const renderColumnContent = (col: ProjetoColumnDef, isMobile = false) => {
    const colProjetos = projetos.filter((p) => p.etapa === col.id)
    const totalKwp = colProjetos.reduce((sum, p) => sum + (p.potencia_kwp || 0), 0)
    const isOver = dragOverColumnId === col.id

    return (
      <div
        key={col.id}
        data-projeto-column-id={col.id}
        onDragOver={(e) => handleDragOver(e, col.id)}
        onDragLeave={(e) => handleDragLeave(e, col.id)}
        onDrop={(e) => handleDrop(e, col.id)}
        className={`min-w-0 w-full rounded-xl p-3 border-t-4 ${
          col.borderClass
        } shadow-xs flex flex-col transition-all duration-150 ${
          isOver
            ? 'bg-emerald-50/90 ring-2 ring-emerald-500 ring-offset-1 border-emerald-400'
            : 'bg-[#F1F5F3]'
        }`}
      >
        {/* Header da Coluna */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/60 gap-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <col.icon className={`w-3.5 h-3.5 shrink-0 ${col.iconColorClass}`} />
            <h3
              className="font-semibold text-[11px] sm:text-xs text-gray-800 uppercase tracking-tight truncate"
              title={col.shortTitle}
            >
              {col.title}
            </h3>
          </div>
          <span
            className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs border transition-colors shrink-0 ml-1 ${
              isOver
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {colProjetos.length}
          </span>
        </div>

        {/* Cards List */}
        <div
          className={`space-y-2 flex-1 ${isMobile ? 'min-h-[260px]' : 'min-h-[320px]'} flex flex-col min-w-0`}
        >
          {colProjetos.length === 0 ? (
            <div
              className={`h-28 flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-[11px] text-center p-2 transition-colors ${
                isOver
                  ? 'border-emerald-400 bg-emerald-100/40 text-emerald-700 font-medium'
                  : 'border-gray-200 text-gray-400'
              }`}
            >
              <col.icon className="w-5 h-5 text-gray-300 mb-1" />
              <span>{isOver ? 'Soltar nesta etapa' : 'Nenhum projeto'}</span>
            </div>
          ) : (
            colProjetos.map((proj) => {
              const isDraggingThis = draggedProjetoId === proj.id
              const cliente = proj.expand?.cliente_id
              const clienteNome = cliente?.nome || 'Cliente não vinculado'
              const profNome = proj.profissional_nome || proj.expand?.profissional_id?.nome || null

              const propostaVinculada = cliente?.id ? propostaPorCliente.get(cliente.id) : undefined
              const proximaAcao = cliente?.id ? proximaAcaoPorCliente.get(cliente.id) : undefined
              const diasNaEtapa = getDiasNaEtapa(proj)
              const isEditingThisTitle = editingTitleId === proj.id
              const tituloUsinaDisplay = getTituloUsina(proj)
              const atividadePrazo = proximaAcao ? getAtividadePrazoInfo(proximaAcao) : null

              // WhatsApp autoritativo: whatsapp tem prioridade sobre telefone
              const rawWa = cliente?.whatsapp || cliente?.telefone || ''
              const cleanWa = cleanPhoneDigits(rawWa)
              const waDigits =
                cleanWa.length >= 10 && !cleanWa.startsWith('55') ? `55${cleanWa}` : cleanWa

              // ==============================================================
              // VERSÃO MOBILE DO CARD: SUPER SIMPLIFICADA (NOME + WHATSAPP)
              // ==============================================================
              if (isMobile) {
                return (
                  <div
                    key={proj.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, proj)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, proj)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => handleCardClick(proj)}
                    className={`bg-white rounded-xl p-3 border transition-all duration-150 cursor-pointer active:cursor-grabbing group relative overflow-hidden min-w-0 flex items-center justify-between gap-2.5 ${
                      isDraggingThis
                        ? 'opacity-40 scale-95 border-emerald-400 shadow-inner'
                        : 'border-slate-200/90 shadow-2xs hover:shadow-xs active:bg-gray-50'
                    }`}
                  >
                    {/* Nome do cliente / negócio (ou título da usina) */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div
                        className="font-bold text-sm text-slate-900 truncate leading-snug"
                        title={clienteNome}
                      >
                        {clienteNome}
                      </div>
                    </div>

                    {/* Botão de contato direto via WhatsApp */}
                    {waDigits ? (
                      <a
                        href={`https://wa.me/${waDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white flex items-center justify-center shadow-xs shrink-0 transition-transform"
                        title={`Conversar com ${clienteNome} no WhatsApp`}
                        aria-label={`Conversar com ${clienteNome} no WhatsApp`}
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCardClick(proj)
                        }}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0"
                        title="Sem WhatsApp cadastrado (clique para abrir)"
                        aria-label="Sem WhatsApp cadastrado"
                      >
                        <WhatsAppIcon className="w-4 h-4 opacity-50" />
                      </button>
                    )}
                  </div>
                )
              }

              // ==============================================================
              // VERSÃO DESKTOP DO CARD: COMPLETA COM AS 6 INFORMAÇÕES
              // ==============================================================
              return (
                <div
                  key={proj.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, proj)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, proj)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => handleCardClick(proj)}
                  className={`bg-white rounded-lg p-3 border transition-all duration-150 cursor-pointer active:cursor-grabbing group relative overflow-hidden min-w-0 ${
                    isDraggingThis
                      ? 'opacity-40 scale-95 border-emerald-400 shadow-inner'
                      : 'border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300'
                  }`}
                >
                  {/* 1. TÍTULO DA USINA (mais destacado, editável inline) + Menu ⋮ */}
                  <div className="flex items-start justify-between gap-1.5 min-w-0">
                    <div className="flex-1 min-w-0">
                      {isEditingThisTitle ? (
                        <div
                          className="min-w-0"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveTitle(proj.id)
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelEditingTitle()
                              }
                            }}
                            onBlur={() => handleSaveTitle(proj.id)}
                            placeholder="Título da usina..."
                            className="w-full text-xs font-bold text-slate-900 px-1.5 py-0.5 rounded border border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          />
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            Enter salva • Esc cancela
                          </span>
                        </div>
                      ) : (
                        <div
                          onClick={(e) => handleStartEditingTitle(proj, e)}
                          title="Clique para editar o título da usina"
                          className="font-bold text-sm text-slate-900 hover:text-emerald-700 transition-colors truncate min-w-0 leading-tight cursor-text"
                        >
                          {tituloUsinaDisplay}
                        </div>
                      )}
                    </div>

                    <div
                      className="shrink-0 flex items-center -mr-1 -mt-1"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            title="Opções do projeto"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-80 group-hover:opacity-100 focus:opacity-100"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 text-xs">
                          {/* Opções de mover para outras etapas diretamente pelo menu ⋮ (essencial no mobile) */}
                          {PROJETOS_COLUMNS.filter((other) => other.id !== col.id).map((other) => (
                            <DropdownMenuItem
                              key={other.id}
                              onClick={async () => {
                                try {
                                  await updateProjetoEtapa(proj.id, other.id)
                                  if (other.id === 'Instalação' && !proj.profissional_id) {
                                    onOpenAtribuirModal(proj, other.id)
                                  }
                                } catch (err) {
                                  console.error('Erro ao mover projeto:', err)
                                }
                              }}
                              className="cursor-pointer gap-2 text-slate-700 text-xs"
                            >
                              <other.icon
                                className={`w-3.5 h-3.5 ${other.iconColorClass} shrink-0`}
                              />
                              <span>Mover para {other.shortTitle || other.title}</span>
                            </DropdownMenuItem>
                          ))}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleCardClick(proj)}
                            className="cursor-pointer gap-2 text-slate-700 focus:text-slate-900 focus:bg-slate-100 font-medium"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>Abrir ficha / projeto</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => onOpenAtribuirModal(proj, col.id)}
                            className="cursor-pointer gap-2 text-amber-700 focus:text-amber-800 focus:bg-amber-50 font-medium"
                          >
                            <HardHat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{profNome ? 'Alterar responsável' : 'Atribuir responsável'}</span>
                          </DropdownMenuItem>

                          {col.id !== 'Concluído' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await updateProjetoEtapa(proj.id, 'Concluído')
                                  } catch (err) {
                                    console.error('Erro ao concluir projeto:', err)
                                  }
                                }}
                                className="cursor-pointer gap-2 text-emerald-700 focus:text-emerald-800 focus:bg-emerald-50 font-medium"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Mover para Concluído</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* 2. CLIENTE VINCULADO */}
                  <div className="mt-1 flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (proj.cliente_id) {
                          openFichaCliente(proj.cliente_id, 'projeto')
                        }
                      }}
                      title={`Abrir ficha de ${clienteNome}`}
                      className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 font-medium truncate max-w-full text-left transition-colors"
                    >
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate hover:underline">{clienteNome}</span>
                    </button>
                  </div>

                  {/* 3. RESPONSÁVEL */}
                  <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenAtribuirModal(proj, col.id)
                      }}
                      title={profNome ? `Responsável: ${profNome}` : 'Atribuir responsável'}
                      className={`inline-flex items-center gap-1.5 text-[11px] truncate text-left transition-colors ${
                        profNome
                          ? 'text-slate-700 hover:text-amber-700 font-medium'
                          : 'text-amber-700 hover:text-amber-800 font-semibold underline underline-offset-2'
                      }`}
                    >
                      <HardHat
                        className={`w-3 h-3 shrink-0 ${
                          profNome ? 'text-slate-400' : 'text-amber-600'
                        }`}
                      />
                      <span className="truncate">{profNome || 'Atribuir responsável'}</span>
                    </button>
                  </div>

                  {/* 4. LINK PARA PROPOSTA */}
                  {propostaVinculada && (
                    <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(
                            `/orcamentos?propostaId=${propostaVinculada.id}&clienteId=${propostaVinculada.cliente_id}`,
                          )
                        }}
                        title="Ver proposta solar"
                        className="inline-flex items-center gap-1 text-[11px] text-sky-700 hover:text-sky-900 font-medium truncate hover:underline text-left transition-colors"
                      >
                        <FileText className="w-3 h-3 text-sky-600 shrink-0" />
                        <span className="truncate">
                          Proposta Solar #{propostaVinculada.numero_revisao || 1} (
                          {propostaVinculada.status})
                        </span>
                      </button>
                    </div>
                  )}

                  {/* 5. PRÓXIMA ATIVIDADE */}
                  {proximaAcao && atividadePrazo && (
                    <div className="mt-2 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (proj.cliente_id) {
                            openFichaCliente(proj.cliente_id, 'historico')
                          }
                        }}
                        title={`Próxima atividade: ${proximaAcao.titulo || 'Atividade'}`}
                        className={`w-full inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border text-left truncate transition-colors ${atividadePrazo.corClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${atividadePrazo.dotClass}`}
                        />
                        <span className="truncate">
                          {proximaAcao.titulo || 'Atividade pendente'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* 6. TEMPO NA ETAPA */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                      <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span>
                        {diasNaEtapa === 0
                          ? 'Hoje nesta etapa'
                          : `${diasNaEtapa} ${diasNaEtapa === 1 ? 'dia' : 'dias'} nesta etapa`}
                      </span>
                    </span>

                    <GripVertical className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )
            })
          )}

          {/* Drop indicator se houver cards e passar o mouse */}
          {isOver && colProjetos.length > 0 && (
            <div className="h-9 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-100/50 flex items-center justify-center text-[11px] text-emerald-700 font-medium">
              Soltar aqui
            </div>
          )}
        </div>

        {/* Footer com soma total em kWp */}
        {colProjetos.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200/60 text-right text-[10px] sm:text-[11px] text-gray-500 truncate">
            Total:{' '}
            <strong className="text-gray-800 font-semibold">{totalKwp.toFixed(1)} kWp</strong>
          </div>
        )}
      </div>
    )
  }

  // Prepara as etapas mobile para o MobileKanbanViewport
  const mobileStages: MobileKanbanStage[] = useMemo(() => {
    return PROJETOS_COLUMNS.map((col) => {
      const colProjetos = projetos.filter((p) => p.etapa === col.id)
      const totalKwp = colProjetos.reduce((sum, p) => sum + (p.potencia_kwp || 0), 0)
      return {
        id: col.id,
        title: col.title,
        shortTitle: col.shortTitle,
        count: colProjetos.length,
        totalSubtitle: colProjetos.length > 0 ? `Total: ${totalKwp.toFixed(1)} kWp` : undefined,
        icon: col.icon,
        iconColorClass: col.iconColorClass,
        borderTopClass: col.borderClass,
        content: renderColumnContent(col, true),
      }
    })
  }, [
    projetos,
    dragOverColumnId,
    draggedProjetoId,
    proximaAcaoPorCliente,
    propostaPorCliente,
    editingTitleId,
    editingTitleValue,
  ])

  return (
    <div className="w-full pb-4 pt-1 select-none">
      {/* 1. VISUALIZAÇÃO MOBILE (apenas celular: md:hidden) */}
      <div className="block md:hidden w-full">
        <MobileKanbanViewport stages={mobileStages} isDraggingCard={isTouchDragging} />
      </div>

      {/* 2. VISUALIZAÇÃO DESKTOP / TABLET (inalterada: hidden md:block) */}
      <div className="hidden md:block w-full overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3 items-start w-full">
          {PROJETOS_COLUMNS.map((col) => renderColumnContent(col, false))}
        </div>
      </div>
    </div>
  )
}
