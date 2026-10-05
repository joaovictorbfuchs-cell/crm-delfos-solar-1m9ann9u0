import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  MapPin,
  GripVertical,
  Calendar,
  AlertCircle,
  MoreVertical,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  Contact,
  Loader2,
  Pencil,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { Cliente, ClienteStatus, Atividade, Negocio, EtapaFunilSelect } from '@/types/crm'
import { formatCurrency } from '@/lib/formatters'
import { useClientes } from '@/contexts/ClientesContext'
import { getValorExibicaoCard } from '@/lib/orcamentoValorCard'
import { FUNIL_ETAPAS_CONFIG } from '@/components/StatusBadge'
import { getTipoVendaBadgeInfo } from '@/constants/tipoVenda'
import { useToast } from '@/hooks/use-toast'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { updateNegocio, deleteNegocio } from '@/services/negociosService'
import { removerPrefixoMensagemManual } from '@/lib/whatsappPrefixo'

// Mapa bidirecional de etapas entre o funil comercial e as colunas do Kanban
const STATUS_TO_ETAPA_NEGOCIO: Record<string, EtapaFunilSelect> = {
  'Novo Lead': 'novo lead',
  Levantamento: 'qualificado',
  Orçamento: 'proposta enviada',
  Negociação: 'negociação',
  'Contato Futuro': 'contato_futuro',
  Fechado: 'contrato assinado',
}

const ETAPA_NEGOCIO_TO_STATUS: Record<string, ClienteStatus> = {
  'novo lead': 'Novo Lead',
  qualificado: 'Levantamento',
  'proposta enviada': 'Orçamento',
  negociação: 'Negociação',
  contato_futuro: 'Contato Futuro',
  'contrato assinado': 'Fechado',
}

export interface KanbanCardItem {
  id: string
  negocioId?: string
  clienteId: string
  titulo: string
  nomeCliente: string
  status: ClienteStatus
  etapaFunil?: EtapaFunilSelect
  valorEstimado: number
  cidade: string
  estado?: string
  tipoVenda: string
  potenciaKwp: number
  reabertura: boolean
  motivoReabertura?: string
  recorrenciaMensal: boolean
  whatsapp?: string
  telefone?: string
  created: string
  updated: string
  rawNegocio?: Negocio
  rawCliente?: Cliente
  responsavelNome?: string
}

interface KanbanBoardProps {
  clientes?: Cliente[]
  negocios?: Negocio[]
  onNegocioUpdated?: () => void
  onNegocioDeleted?: (negocioId: string) => void
}

export interface KanbanColumnDef {
  id: ClienteStatus
  title: string
  colorClass: string
  borderTopClass: string
  icon: LucideIcon
  iconColorClass: string
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: 'Novo Lead',
    title: '1 - Lead',
    colorClass: 'text-slate-700',
    borderTopClass: 'border-t-slate-500',
    icon: FUNIL_ETAPAS_CONFIG['Novo Lead'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Novo Lead'].iconColorClass,
  },
  {
    id: 'Levantamento',
    title: '2 - Orçamento Enviado',
    colorClass: 'text-sky-700',
    borderTopClass: 'border-t-sky-500',
    icon: FUNIL_ETAPAS_CONFIG['Levantamento'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Levantamento'].iconColorClass,
  },
  {
    id: 'Orçamento',
    title: '3 - Proposta',
    colorClass: 'text-indigo-700',
    borderTopClass: 'border-t-indigo-500',
    icon: FUNIL_ETAPAS_CONFIG['Orçamento'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Orçamento'].iconColorClass,
  },
  {
    id: 'Negociação',
    title: '4 - Negociação',
    colorClass: 'text-amber-700',
    borderTopClass: 'border-t-amber-500',
    icon: FUNIL_ETAPAS_CONFIG['Negociação'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Negociação'].iconColorClass,
  },
  {
    id: 'Fechado',
    title: '5 - Fechado',
    colorClass: 'text-emerald-700',
    borderTopClass: 'border-t-emerald-500',
    icon: CheckCircle2,
    iconColorClass: 'text-emerald-600',
  },
  {
    id: 'Perdido',
    title: '6 - Perdido',
    colorClass: 'text-rose-700',
    borderTopClass: 'border-t-rose-500',
    icon: XCircle,
    iconColorClass: 'text-rose-600',
  },
]

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  clientes: clientesProp,
  negocios: negociosProp,
  onNegocioUpdated,
  onNegocioDeleted,
}) => {
  const {
    openFichaCliente,
    updateClienteStatus,
    updateCliente,
    moverClienteParaOutrosContatos,
    refreshData,
    atividades,
    orcamentosSolar,
  } = useClientes()
  const { toast } = useToast()

  const [itemParaMover, setItemParaMover] = useState<KanbanCardItem | null>(null)
  const [isMovingContato, setIsMovingContato] = useState(false)
  // Estado local para overrides otimistas imediatos de status de card (cardId -> status)
  const [optimisticStatusMap, setOptimisticStatusMap] = useState<Record<string, ClienteStatus>>({})

  // Edição do nome do negócio (Kanban)
  const [editingCard, setEditingCard] = useState<KanbanCardItem | null>(null)
  const [novoTituloInput, setNovoTituloInput] = useState('')
  const [isSavingTitulo, setIsSavingTitulo] = useState(false)

  useEffect(() => {
    if (editingCard) {
      setNovoTituloInput(editingCard.titulo)
    }
  }, [editingCard])

  const handleSalvarTituloNegocio = async () => {
    if (!editingCard || !editingCard.negocioId) return
    const limpo = novoTituloInput.trim()
    if (!limpo) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome para o negócio.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingTitulo(true)
    try {
      await updateNegocio(editingCard.negocioId, { titulo: limpo })
      toast({
        title: 'Nome atualizado',
        description: 'O nome do negócio foi atualizado com sucesso.',
      })
      setEditingCard(null)
      if (onNegocioUpdated) onNegocioUpdated()
    } catch (err) {
      console.error('Erro ao atualizar nome do negócio:', err)
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar o nome do negócio.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingTitulo(false)
    }
  }

  // Normalização unificada: quando a prop negocios estiver presente, renderiza APENAS negócios
  // (evita que clientes apareçam como fallback/flash de leads deletados antes ou quando negocios carregam).
  // Se a prop negocios não for passada de todo (ex.: páginas legadas que só passam clientes), mantém compatibilidade.
  const cards = useMemo<KanbanCardItem[]>(() => {
    if (negociosProp !== undefined) {
      if (!Array.isArray(negociosProp) || negociosProp.length === 0) {
        return []
      }
      return negociosProp
        .filter((n) => {
          if (!n || !n.id) return false
          const cli = n.expand?.cliente_id
          if (cli && (cli.arquivado || cli.transferido_pos_vendas)) return false
          return true
        })
        .map((n) => {
          const cli = n.expand?.cliente_id
          const etapa = n.etapa_funil || 'novo lead'
          let baseStatus: ClienteStatus = ETAPA_NEGOCIO_TO_STATUS[etapa] || 'Novo Lead'
          if (n.status === 'ganho') {
            baseStatus = 'Fechado'
          } else if (n.status === 'perdido') {
            baseStatus = 'Perdido'
          }
          const statusKanban = optimisticStatusMap[n.id] ?? baseStatus
          const nomeCliente = (cli?.nome || cli?.razao_social || 'Cliente vinculado').trim()
          const rawTitulo = (n.titulo || '').trim() || nomeCliente
          const tituloNegocio = removerPrefixoMensagemManual(rawTitulo) || nomeCliente

          const cardValor = getValorExibicaoCard(orcamentosSolar, {
            negocioId: n.id,
            clienteId: n.cliente_id || cli?.id,
            valorFinal: Number(n.valor_final || n.valor),
            valorEstimado: Number(n.valor_estimado) || (cli?.valor_estimado ?? 0),
            status: n.status,
          })
          const valorFinal = cardValor.valor
          const respUser = n.expand?.consultor_responsavel
          const responsavelNome = respUser?.name || cli?.responsavel_nome || ''

          return {
            id: n.id,
            negocioId: n.id,
            clienteId: n.cliente_id || cli?.id || '',
            titulo: tituloNegocio,
            nomeCliente,
            status: statusKanban,
            etapaFunil: n.etapa_funil,
            valorEstimado: valorFinal,
            cidade: cli?.cidade || '',
            estado: cli?.estado || '',
            tipoVenda: n.tipo_venda || cli?.tipo_venda || 'Energia Solar',
            potenciaKwp: Number(cli?.potencia_kwp) || 0,
            reabertura: Boolean(n.reabertura || cli?.reabertura),
            motivoReabertura: n.motivo_reabertura || cli?.motivo_reabertura,
            recorrenciaMensal: Boolean(n.recorrencia_mensal || cli?.recorrencia_mensal),
            whatsapp: cli?.whatsapp || '',
            telefone: cli?.telefone || '',
            created: n.created || cli?.created || '',
            updated: n.updated || cli?.updated || '',
            rawNegocio: n,
            rawCliente: cli,
            responsavelNome,
          }
        })
    }

    return (Array.isArray(clientesProp) ? clientesProp : [])
      .filter((c) => Boolean(c) && !c.arquivado && !c.transferido_pos_vendas)
      .map((c) => ({
        id: String(c.id || ''),
        clienteId: String(c.id || ''),
        titulo: removerPrefixoMensagemManual((c.nome || '').trim()) || 'Cliente sem nome',
        nomeCliente: (c.nome || '').trim() || 'Cliente sem nome',
        status: optimisticStatusMap[c.id] ?? ((c.status || 'Novo Lead') as ClienteStatus),
        valorEstimado: getValorExibicaoCard(orcamentosSolar, {
          clienteId: c.id,
          valorEstimado: Number(c.valor_estimado) || 0,
          status: c.status,
        }).valor,
        cidade: typeof c.cidade === 'string' ? c.cidade : '',
        estado: c.estado || '',
        tipoVenda: c.tipo_venda || 'Energia Solar',
        potenciaKwp: Number(c.potencia_kwp) || 0,
        reabertura: Boolean(c.reabertura),
        motivoReabertura: c.motivo_reabertura,
        recorrenciaMensal: Boolean(c.recorrencia_mensal),
        whatsapp: c.whatsapp || '',
        telefone: c.telefone || '',
        created: c.created || '',
        updated: c.updated || '',
        rawCliente: c,
        responsavelNome: c.responsavel_nome || '',
      }))
  }, [negociosProp, clientesProp, orcamentosSolar, optimisticStatusMap])

  // Mapeamento otimizado de próxima atividade agendada por cliente
  const proximaAcaoPorCliente = useMemo(() => {
    const mapa = new Map<string, Atividade>()
    const now = Date.now()

    // Filtrar pendentes excluindo eventos automáticos de mudança de estágio
    const pendentes = (atividades || []).filter(
      (a) => a.status === 'pendente' && a.tipo !== 'mudanca_estagio',
    )

    // Agrupar por cliente
    const agrupado = new Map<string, Atividade[]>()
    for (const a of pendentes) {
      if (!a.cliente_id) continue
      const list = agrupado.get(a.cliente_id) || []
      list.push(a)
      agrupado.set(a.cliente_id, list)
    }

    for (const [cliId, list] of agrupado.entries()) {
      // Ordenar por data
      const futuras = list
        .filter((a) => new Date(a.data || a.created).getTime() >= now - 60 * 60 * 1000)
        .sort(
          (a, b) =>
            new Date(a.data || a.created).getTime() - new Date(b.data || b.created).getTime(),
        )

      if (futuras.length > 0) {
        mapa.set(cliId, futuras[0])
      } else {
        // Se só tem pendentes atrasadas, pega a mais recente
        const atrasadas = [...list].sort(
          (a, b) =>
            new Date(b.data || b.created).getTime() - new Date(a.data || a.created).getTime(),
        )
        mapa.set(cliId, atrasadas[0])
      }
    }

    return mapa
  }, [atividades])

  // Cálculo de dias na etapa para cada card (negócio ou cliente)
  const getDiasNaEtapa = (item: KanbanCardItem) => {
    const rawDate = item.updated || item.created
    if (!rawDate) return 0
    const diffMs = Date.now() - new Date(rawDate).getTime()
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, dias)
  }

  // Formatador conciso para próxima ação agendada (ex: "Ligar — 20/09, 14h")
  const formatProximaAcao = (atv: Atividade) => {
    const d = atv.data ? new Date(atv.data) : atv.created ? new Date(atv.created) : null
    let resumoNome = atv.titulo || 'Atividade'
    if (resumoNome.length > 18) {
      resumoNome = resumoNome.slice(0, 16) + '...'
    }

    if (!d || isNaN(d.getTime())) {
      return resumoNome
    }

    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const hora = String(d.getHours()).padStart(2, '0')
    const min = d.getMinutes() > 0 ? `:${String(d.getMinutes()).padStart(2, '0')}` : 'h'

    return `${resumoNome} — ${dia}/${mes}, ${hora}${min === 'h' ? 'h' : 'h'}`
  }

  // Estado para drag and drop
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<ClienteStatus | null>(null)

  // Suporte a Touch Drag & Drop
  const [isTouchDragging, setIsTouchDragging] = useState(false)
  const touchStateRef = useRef<{
    clientId: string
    initialX: number
    initialY: number
    currentX: number
    currentY: number
    ghostEl: HTMLElement | null
    isDragging: boolean
    longPressTimer?: ReturnType<typeof setTimeout>
  } | null>(null)

  const handleCardClick = (item: KanbanCardItem) => {
    // Se estava arrastando no touch, ignora o clique
    if (touchStateRef.current?.isDragging) return
    // Abre a ficha do cliente vinculado
    if (item.clienteId) {
      openFichaCliente(item.clienteId)
    }
  }

  const moverEtapaCard = async (cardId: string, targetStatus: ClienteStatus) => {
    const targetCard = cards.find((c) => c.id === cardId)
    if (!targetCard || targetCard.status === targetStatus) return

    // Atualização otimista imediata via estado React para feedback instantâneo ao usuário sem nenhum loading
    const previousStatus = targetCard.status
    setOptimisticStatusMap((prev) => ({ ...prev, [cardId]: targetStatus }))

    try {
      if (targetCard.negocioId) {
        // Grava no PocketBase em segundo plano sem disparar loading de tela cheia
        if (targetStatus === 'Fechado') {
          await updateNegocio(targetCard.negocioId, {
            status: 'ganho',
            etapa_funil: 'contrato assinado',
            data_fechamento: new Date().toISOString(),
          })
        } else if (targetStatus === 'Perdido') {
          await updateNegocio(targetCard.negocioId, {
            status: 'perdido',
          })
        } else {
          const novaEtapa = STATUS_TO_ETAPA_NEGOCIO[targetStatus] || 'novo lead'
          await updateNegocio(targetCard.negocioId, {
            status: 'em andamento',
            etapa_funil: novaEtapa,
          })
        }
        toast({
          title: 'Etapa atualizada',
          description: `"${targetCard.titulo}" movido para ${targetStatus}.`,
        })
        if (onNegocioUpdated) onNegocioUpdated()
      } else {
        // Modo legado cliente (ou card sem negócio ainda)
        await updateClienteStatus(cardId, targetStatus)
        toast({
          title: 'Etapa atualizada',
          description: `"${targetCard.titulo}" movido para ${targetStatus}.`,
        })
        if (onNegocioUpdated) onNegocioUpdated()
      }
    } catch (err: any) {
      // Reverte o card imediatamente para a coluna anterior em caso de erro
      setOptimisticStatusMap((prev) => {
        const next = { ...prev }
        delete next[cardId]
        return next
      })
      console.error('Falha ao mover card:', err)
      const errorMsg =
        err?.message || err?.data?.message || 'Não foi possível alterar a etapa no funil.'
      toast({
        title: 'Erro ao mover negócio',
        description: errorMsg,
        variant: 'destructive',
      })
    }
  }

  // HTML5 Drag and Drop Handlers (Desktop / Pointer)
  const handleDragStart = (e: React.DragEvent, item: KanbanCardItem) => {
    setDraggedClientId(item.id)
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedClientId(null)
    setDragOverColumnId(null)
  }

  const handleDragOver = (e: React.DragEvent, colId: ClienteStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId)
    }
  }

  const handleDragLeave = (e: React.DragEvent, colId: ClienteStatus) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    const currentTarget = e.currentTarget as HTMLElement
    if (!currentTarget.contains(relatedTarget)) {
      if (dragOverColumnId === colId) {
        setDragOverColumnId(null)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: ClienteStatus) => {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('text/plain') || draggedClientId
    setDraggedClientId(null)
    setDragOverColumnId(null)

    if (!cardId) return
    await moverEtapaCard(cardId, targetStatus)
  }

  // Touch Handlers para dispositivos móveis
  const handleTouchStart = (e: React.TouchEvent, item: KanbanCardItem) => {
    const touch = e.touches[0]
    const targetCard = e.currentTarget as HTMLElement

    const state = {
      clientId: item.id,
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
      setDraggedClientId(item.id)

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

    // Se moveu muito antes de atingir o longPress, cancela o drag de card para permitir swipe da tela ou scroll
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
      const colEl = elementUnder?.closest('[data-column-id]') as HTMLElement | null
      if (colEl) {
        const colId = colEl.getAttribute('data-column-id') as ClienteStatus
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

    const { ghostEl, isDragging, clientId } = touchStateRef.current

    if (ghostEl) {
      ghostEl.remove()
    }

    if (isDragging) {
      e.preventDefault()
      const touch = e.changedTouches[0]
      const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY)
      const colEl = elementUnder?.closest('[data-column-id]') as HTMLElement | null

      if (colEl) {
        const targetStatus = colEl.getAttribute('data-column-id') as ClienteStatus
        if (targetStatus) {
          await moverEtapaCard(clientId, targetStatus)
        }
      }
    }

    setTimeout(() => {
      touchStateRef.current = null
      setIsTouchDragging(false)
      setDraggedClientId(null)
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

  // Renderizador de uma coluna individual (reutilizado tanto no layout Desktop quanto Mobile)
  const renderColumnContent = (col: KanbanColumnDef, isMobile = false) => {
    const colCards = cards.filter((c) => (c.status || '') === col.id)
    const totalColValue = colCards.reduce((sum, c) => sum + (Number(c.valorEstimado) || 0), 0)
    const isOver = dragOverColumnId === col.id

    return (
      <div
        key={col.id}
        data-column-id={col.id}
        onDragOver={(e) => handleDragOver(e, col.id)}
        onDragLeave={(e) => handleDragLeave(e, col.id)}
        onDrop={(e) => handleDrop(e, col.id)}
        className={`min-w-0 w-full rounded-xl p-1.5 sm:p-2 border-t-[5px] ${
          col.borderTopClass
        } shadow-xs flex flex-col transition-all duration-150 ${
          isOver
            ? 'bg-emerald-50/80 ring-2 ring-emerald-500 ring-offset-1 border-emerald-400'
            : 'bg-slate-100/80 border-x border-b border-slate-200/70'
        }`}
      >
        {/* Cabeçalho da Coluna (no desktop mostra sempre; no mobile serve de header do card container) */}
        <div className="pb-2 mb-2.5 border-b border-slate-200/80 min-w-0">
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <col.icon className={`w-3.5 h-3.5 shrink-0 ${col.iconColorClass}`} />
              <h3
                className="font-bold text-xs text-slate-800 uppercase tracking-wide truncate"
                title={col.title}
              >
                {col.title}
              </h3>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                isOver
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              {colCards.length}
            </span>
          </div>

          {/* Valor acumulado da etapa */}
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">
              Acumulado:
            </span>
            <span className="font-semibold text-slate-700 text-[11px]">
              {formatCurrency(totalColValue)}
            </span>
          </div>
        </div>

        {/* Cards List / Drop Zone */}
        <div
          className={`space-y-2 flex-1 ${isMobile ? 'min-h-[260px]' : 'min-h-[320px]'} flex flex-col min-w-0 w-full`}
        >
          {colCards.length === 0 ? (
            <div
              className={`h-28 flex-1 flex items-center justify-center border-2 border-dashed rounded-lg text-xs text-center p-2 transition-colors ${
                isOver
                  ? 'border-emerald-400 bg-emerald-100/40 text-emerald-700 font-medium'
                  : 'border-slate-300/80 text-slate-400 bg-white/40'
              }`}
            >
              {isOver ? 'Soltar aqui' : 'Nenhum negócio nesta etapa'}
            </div>
          ) : (
            colCards.map((card) => {
              const isDraggingThis = draggedClientId === card.id
              // Atividades vinculadas ao cliente_id
              const proximaAcao = card.clienteId
                ? proximaAcaoPorCliente.get(card.clienteId)
                : undefined
              const isLeadFrio = !proximaAcao
              const diasNaEtapa = getDiasNaEtapa(card)
              const tempoAlerta = diasNaEtapa > 7
              const isReaberto = Boolean(card.reabertura)

              // WhatsApp autoritativo
              const rawWa = card.whatsapp || card.telefone || ''
              const cleanWa = cleanPhoneDigits(rawWa)
              const waDigits =
                cleanWa.length >= 10 && !cleanWa.startsWith('55') ? `55${cleanWa}` : cleanWa

              // ==============================================================
              // VERSÃO MOBILE DO CARD: SUPER SIMPLIFICADA (TÍTULO/CLIENTE + WHATSAPP)
              // ==============================================================
              if (isMobile) {
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, card)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => handleCardClick(card)}
                    className={`bg-white rounded-xl p-2 sm:p-2.5 border transition-all duration-150 cursor-pointer active:cursor-grabbing group relative overflow-hidden w-full min-w-0 flex items-center justify-between gap-2 ${
                      isDraggingThis
                        ? 'opacity-40 scale-95 border-emerald-400 shadow-inner'
                        : 'border-slate-200/90 shadow-2xs hover:shadow-xs active:bg-gray-50'
                    }`}
                  >
                    {/* Título principal: Nome do cliente (em destaque); Subtítulo: título do negócio */}
                    <div className="flex-1 min-w-0 pr-0.5">
                      <div className="flex items-start gap-1">
                        <div
                          className="font-bold text-[11px] text-slate-900 leading-snug flex-1 break-words whitespace-normal"
                          title={card.nomeCliente || card.titulo}
                        >
                          {card.nomeCliente || card.titulo}
                        </div>
                        {card.negocioId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingCard(card)
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 active:bg-slate-200 shrink-0"
                            title="Editar nome do negócio"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {card.titulo && card.titulo !== card.nomeCliente && (
                        <div
                          className="text-[11px] text-slate-600 break-words font-medium mt-0.5"
                          title={`Negócio: ${card.titulo}`}
                        >
                          {card.titulo}
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-1.5 min-w-0 flex-wrap">
                        {(() => {
                          const badgeInfo = getTipoVendaBadgeInfo(card.tipoVenda)
                          const TipoIcon = badgeInfo.icon
                          return (
                            <span
                              className={`inline-flex items-center gap-1 shrink-0 font-semibold text-[9px] px-1.5 py-0.2 rounded border ${badgeInfo.badgeClass}`}
                              title={`Tipo de negócio: ${badgeInfo.label}`}
                            >
                              {badgeInfo.hasTipo && (
                                <TipoIcon
                                  className={`w-2.5 h-2.5 shrink-0 ${badgeInfo.iconClass}`}
                                />
                              )}
                              <span className="truncate">{badgeInfo.shortLabel}</span>
                            </span>
                          )
                        })()}

                        {card.responsavelNome && (
                          <span
                            className="inline-flex items-center gap-1 shrink-0 text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[130px]"
                            title={`Responsável: ${card.responsavelNome}`}
                          >
                            <User className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span className="truncate">{card.responsavelNome}</span>
                          </span>
                        )}
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
                        title={`Conversar com ${card.nomeCliente} no WhatsApp`}
                        aria-label={`Conversar com ${card.nomeCliente} no WhatsApp`}
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCardClick(card)
                        }}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0"
                        title="Sem número de WhatsApp cadastrado (clique para editar)"
                        aria-label="Sem WhatsApp cadastrado"
                      >
                        <WhatsAppIcon className="w-4 h-4 opacity-50" />
                      </button>
                    )}
                  </div>
                )
              }

              // ==============================================================
              // VERSÃO DESKTOP DO CARD: COMPLETA COM TÍTULO E CLIENTE
              // ==============================================================
              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, card)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => handleCardClick(card)}
                  className={`bg-white rounded-lg p-2 sm:p-2.5 border transition-all duration-150 cursor-pointer active:cursor-grabbing group relative overflow-hidden w-full min-w-0 ${
                    isReaberto ? 'border-l-4 border-l-amber-500' : ''
                  } ${
                    isDraggingThis
                      ? 'opacity-40 scale-95 border-emerald-400 shadow-inner'
                      : isLeadFrio
                        ? 'border-rose-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-rose-400 ring-1 ring-rose-200/50'
                        : 'border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300'
                  }`}
                >
                  {/* Linha 1: Título principal = Nome do cliente + Badge Cliente Ativo + Lápis Editar + Menu ⋮ */}
                  <div className="flex items-start justify-between gap-1 min-w-0">
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-start gap-1 min-w-0">
                        <div
                          className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors min-w-0 leading-snug break-words whitespace-normal flex-1"
                          title={card.nomeCliente || card.titulo}
                        >
                          {card.nomeCliente || card.titulo}
                        </div>
                        {card.negocioId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingCard(card)
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-70 group-hover:opacity-100 shrink-0"
                            title="Editar nome do negócio"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {isReaberto && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shrink-0"
                            title={`Cliente Ativo • Oportunidade Reaberta: ${card.motivoReabertura || 'Nova oportunidade comercial'}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                            Cliente Ativo
                          </span>
                        )}
                      </div>
                      {card.titulo && card.titulo !== card.nomeCliente && (
                        <span
                          className="text-[11px] text-slate-600 break-words font-medium mt-0.5"
                          title={`Negócio: ${card.titulo}`}
                        >
                          {card.titulo}
                        </span>
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
                            title="Opções do negócio"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-80 group-hover:opacity-100 focus:opacity-100"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          {/* Opções de mover para outras etapas diretamente pelo menu ⋮ */}
                          {KANBAN_COLUMNS.filter((other) => other.id !== col.id).map((other) => (
                            <DropdownMenuItem
                              key={other.id}
                              onClick={async () => {
                                try {
                                  await moverEtapaCard(card.id, other.id)
                                  toast({
                                    title: 'Etapa atualizada',
                                    description: `"${card.titulo}" movido para ${other.title}.`,
                                  })
                                } catch (err) {
                                  console.error('Erro ao mover lead:', err)
                                }
                              }}
                              className="cursor-pointer gap-2 text-slate-700 text-xs"
                            >
                              <other.icon
                                className={`w-3.5 h-3.5 ${other.iconColorClass} shrink-0`}
                              />
                              <span>Mover para {other.title}</span>
                            </DropdownMenuItem>
                          ))}

                          <DropdownMenuSeparator />

                          {card.negocioId && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingCard(card)
                              }}
                              className="cursor-pointer gap-2 text-slate-700 text-xs font-medium"
                            >
                              <Pencil className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Editar nome do negócio</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                if (card.negocioId) {
                                  await updateNegocio(card.negocioId, {
                                    status: 'ganho',
                                    etapa_funil: 'contrato assinado',
                                    data_fechamento: new Date().toISOString(),
                                  })
                                  if (onNegocioUpdated) onNegocioUpdated()
                                } else {
                                  await updateClienteStatus(card.id, 'Fechado')
                                }
                                toast({
                                  title: 'Negócio ganho!',
                                  description: `"${card.titulo}" foi marcado como Ganho.`,
                                })
                              } catch (err) {
                                console.error('Erro ao marcar como ganho:', err)
                                toast({
                                  title: 'Erro ao marcar ganho',
                                  description: 'Não foi possível atualizar o negócio.',
                                  variant: 'destructive',
                                })
                              }
                            }}
                            className="cursor-pointer gap-2 text-emerald-700 focus:text-emerald-800 focus:bg-emerald-50 font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Marcar como ganho</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                if (card.negocioId) {
                                  await updateNegocio(card.negocioId, {
                                    status: 'perdido',
                                  })
                                  if (onNegocioUpdated) onNegocioUpdated()
                                } else {
                                  await updateClienteStatus(card.id, 'Perdido')
                                }
                                toast({
                                  title: 'Negócio marcado como perdido',
                                  description: `"${card.titulo}" foi atualizado.`,
                                })
                              } catch (err) {
                                console.error('Erro ao marcar perdido:', err)
                                toast({
                                  title: 'Erro ao marcar perdido',
                                  description: 'Não foi possível atualizar o negócio.',
                                  variant: 'destructive',
                                })
                              }
                            }}
                            className="cursor-pointer gap-2 text-rose-700 focus:text-rose-800 focus:bg-rose-50 font-medium"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Marcar como perdido</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => {
                              setItemParaMover(card)
                            }}
                            className="cursor-pointer gap-2 text-blue-600 focus:text-blue-700 focus:bg-blue-50 font-medium"
                          >
                            <Contact className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Mover para contatos</span>
                          </DropdownMenuItem>

                          {card.negocioId ? (
                            <DropdownMenuItem
                              onClick={async () => {
                                const confirmou = window.confirm(
                                  `Deseja excluir o negócio "${card.titulo}" do funil?\n\nO cliente vinculado (${card.nomeCliente}) permanecerá intacto no cadastro.`,
                                )
                                if (!confirmou) return
                                try {
                                  await deleteNegocio(card.negocioId!)
                                  toast({
                                    title: 'Negócio excluído',
                                    description: `O negócio foi removido. O cliente "${card.nomeCliente}" continua no cadastro.`,
                                  })
                                  if (onNegocioDeleted) onNegocioDeleted(card.negocioId!)
                                  else if (onNegocioUpdated) onNegocioUpdated()
                                } catch (err) {
                                  console.error('Erro ao excluir negócio:', err)
                                  toast({
                                    title: 'Erro ao excluir negócio',
                                    description: 'Não foi possível remover o negócio do funil.',
                                    variant: 'destructive',
                                  })
                                }
                              }}
                              className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>Excluir negócio</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={async () => {
                                const confirmou = window.confirm(
                                  `Deseja arquivar "${card.titulo}"? Ele sairá da visualização do funil.`,
                                )
                                if (!confirmou) return
                                try {
                                  await updateCliente(card.id, { arquivado: true })
                                  toast({
                                    title: 'Arquivado com sucesso',
                                    description: `"${card.titulo}" foi arquivado.`,
                                  })
                                } catch (err) {
                                  console.error('Erro ao arquivar:', err)
                                  toast({
                                    title: 'Erro ao arquivar',
                                    description: 'Não foi possível arquivar o registro.',
                                    variant: 'destructive',
                                  })
                                }
                              }}
                              className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>Arquivar lead</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Linha 2: Valor do negócio */}
                  <div className="mt-1 flex items-center justify-between gap-1 min-w-0">
                    <span className="font-bold text-xs truncate" style={{ color: '#1a3a5c' }}>
                      {(() => {
                        const isRecorrente = Boolean(card.recorrenciaMensal)
                        return formatCurrency(card.valorEstimado || 0, {
                          recorrente: isRecorrente,
                          periodicidade: 'mês',
                        })
                      })()}
                    </span>
                  </div>

                  {/* Linha 3: Localização + Tipo de Venda */}
                  {(() => {
                    const badgeInfo = getTipoVendaBadgeInfo(card.tipoVenda)
                    const TipoIcon = badgeInfo.icon
                    return (
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground gap-1.5 min-w-0">
                        {card.cidade ? (
                          <span className="inline-flex items-center gap-1 truncate shrink min-w-0">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{card.cidade}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                            <span>Sem cidade</span>
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                          {card.responsavelNome && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[130px]"
                              title={`Responsável: ${card.responsavelNome}`}
                            >
                              <User className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                              <span className="truncate">{card.responsavelNome}</span>
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 shrink-0 font-semibold text-[10px] px-1.5 py-0.5 rounded border ${badgeInfo.badgeClass}`}
                            title={`Tipo de negócio: ${badgeInfo.label}`}
                          >
                            {badgeInfo.hasTipo && (
                              <TipoIcon className={`w-3 h-3 shrink-0 ${badgeInfo.iconClass}`} />
                            )}
                            <span className="truncate">{badgeInfo.shortLabel}</span>
                          </span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Linha 4: Próxima ação agendada */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 min-w-0 text-[10px]">
                    {proximaAcao ? (
                      <div
                        className="inline-flex items-center gap-1 text-slate-700 truncate min-w-0 font-medium"
                        title={proximaAcao.titulo}
                      >
                        <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{formatProximaAcao(proximaAcao)}</span>
                      </div>
                    ) : (
                      <div
                        className="inline-flex items-center gap-1 text-rose-600 font-semibold truncate shrink-0"
                        title="Sem atividade agendada vinculada ao cliente (Lead Frio)"
                      >
                        <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>Sem atividade agendada</span>
                      </div>
                    )}
                  </div>

                  {/* Linha 5: Tempo na etapa */}
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        tempoAlerta ? 'text-amber-600 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      <Clock
                        className={`w-2.5 h-2.5 ${tempoAlerta ? 'text-amber-500' : 'text-slate-400'}`}
                      />
                      <span>
                        {diasNaEtapa === 0
                          ? 'Hoje nesta etapa'
                          : `${diasNaEtapa} ${diasNaEtapa === 1 ? 'dia' : 'dias'} nesta etapa`}
                      </span>
                      {tempoAlerta && (
                        <span className="text-[9px] px-1 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200">
                          &gt;7d
                        </span>
                      )}
                    </span>

                    <GripVertical className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )
            })
          )}

          {/* Drop indicator quando há cards na coluna e o usuário está passando por cima */}
          {isOver && colCards.length > 0 && (
            <div className="h-10 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-100/50 flex items-center justify-center text-xs text-emerald-700 font-medium">
              Soltar aqui
            </div>
          )}
        </div>
      </div>
    )
  }

  // Prepara as etapas mobile
  const mobileStages: MobileKanbanStage[] = useMemo(() => {
    return KANBAN_COLUMNS.map((col) => {
      const colCards = cards.filter((c) => (c.status || '') === col.id)
      const totalColValue = colCards.reduce((sum, c) => sum + (Number(c.valorEstimado) || 0), 0)
      return {
        id: col.id,
        title: col.title,
        shortTitle: col.title.replace(/^[0-9]+\s*-\s*/, ''),
        count: colCards.length,
        totalSubtitle: `Acumulado: ${formatCurrency(totalColValue)}`,
        icon: col.icon,
        iconColorClass: col.iconColorClass,
        borderTopClass: col.borderTopClass,
        content: renderColumnContent(col, true),
      }
    })
  }, [cards, dragOverColumnId, draggedClientId, proximaAcaoPorCliente])

  return (
    <div className="w-full pb-6 pt-1 select-none">
      {/* 1. VISUALIZAÇÃO MOBILE (apenas celular: md:hidden) */}
      <div className="block md:hidden w-full">
        <MobileKanbanViewport stages={mobileStages} isDraggingCard={isTouchDragging} />
      </div>

      {/* 2. VISUALIZAÇÃO DESKTOP / TABLET: 6 colunas distribuídas por toda a largura */}
      <div className="hidden md:block w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-1.5 sm:gap-2 lg:gap-2.5 items-start w-full">
          {KANBAN_COLUMNS.map((col) => renderColumnContent(col, false))}
        </div>
      </div>

      {/* Dialog: Editar Nome do Negócio */}
      <Dialog
        open={Boolean(editingCard)}
        onOpenChange={(open) => {
          if (!open && !isSavingTitulo) {
            setEditingCard(null)
          }
        }}
      >
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-500" />
              Editar Nome do Negócio
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Altere o título do negócio no funil comercial. O cliente{' '}
              <strong className="text-slate-800">{editingCard?.nomeCliente}</strong> permanece
              intacto.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSalvarTituloNegocio()
            }}
            className="space-y-4 py-2"
          >
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Nome do Negócio *
              </label>
              <input
                type="text"
                value={novoTituloInput}
                onChange={(e) => setNovoTituloInput(e.target.value)}
                placeholder="Ex: Usina Solar 10 kWp - Sede"
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingTitulo}
                onClick={() => setEditingCard(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingTitulo || !novoTituloInput.trim()}
                className="text-xs bg-[#0F2038] hover:bg-[#1A365D] text-white"
              >
                {isSavingTitulo ? 'Salvando...' : 'Salvar Nome'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação para Mover Cliente para Outros Contatos */}
      <AlertDialog
        open={Boolean(itemParaMover)}
        onOpenChange={(open) => {
          if (!open && !isMovingContato) {
            setItemParaMover(null)
          }
        }}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                <Contact className="h-5 w-5" />
              </div>
              <AlertDialogTitle>Mover para Outros Contatos</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-600">
              Deseja mover o cliente{' '}
              <strong className="text-slate-900 font-semibold">
                "{itemParaMover?.nomeCliente}"
              </strong>{' '}
              para Outros Contatos? Ele será removido do funil de vendas e seus dados serão
              preservados na lista de Outros Contatos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={isMovingContato} onClick={() => setItemParaMover(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMovingContato}
              onClick={async (e) => {
                e.preventDefault()
                if (!itemParaMover) return
                const nomeCliente = itemParaMover.nomeCliente
                try {
                  setIsMovingContato(true)
                  if (itemParaMover.rawCliente) {
                    await moverClienteParaOutrosContatos(itemParaMover.rawCliente)
                  }
                  if (itemParaMover.negocioId) {
                    await deleteNegocio(itemParaMover.negocioId)
                    if (onNegocioDeleted) onNegocioDeleted(itemParaMover.negocioId)
                    else if (onNegocioUpdated) onNegocioUpdated()
                  }
                  toast({
                    title: 'Contato movido com sucesso',
                    description: `"${nomeCliente}" foi transferido para Outros Contatos e removido do funil.`,
                  })
                  setItemParaMover(null)
                } catch (err) {
                  console.error('Erro ao mover cliente para outros contatos:', err)
                  toast({
                    title: 'Erro ao mover contato',
                    description:
                      err instanceof Error
                        ? err.message
                        : 'Não foi possível mover o cliente para Outros Contatos.',
                    variant: 'destructive',
                  })
                } finally {
                  setIsMovingContato(false)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isMovingContato ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Movendo...</span>
                </>
              ) : (
                <>
                  <Contact className="h-4 w-4" />
                  <span>Sim, mover para contatos</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
