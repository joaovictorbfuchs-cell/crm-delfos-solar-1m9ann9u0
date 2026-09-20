import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  MapPin,
  Zap,
  GripVertical,
  Calendar,
  AlertCircle,
  MoreVertical,
  Clock,
  Edit2,
  ArrowRight,
  Archive,
  type LucideIcon,
} from 'lucide-react'
import type { Cliente, ClienteStatus, Atividade } from '@/types/crm'
import { formatCurrency } from '@/lib/formatters'
import { useClientes } from '@/contexts/ClientesContext'
import { FUNIL_ETAPAS_CONFIG } from '@/components/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface KanbanBoardProps {
  clientes: Cliente[]
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
    title: '1 - Novo Lead',
    colorClass: 'text-slate-700',
    borderTopClass: 'border-t-slate-500',
    icon: FUNIL_ETAPAS_CONFIG['Novo Lead'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Novo Lead'].iconColorClass,
  },
  {
    id: 'Levantamento',
    title: '2 - Levantamento',
    colorClass: 'text-sky-700',
    borderTopClass: 'border-t-sky-500',
    icon: FUNIL_ETAPAS_CONFIG['Levantamento'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Levantamento'].iconColorClass,
  },
  {
    id: 'Orçamento',
    title: '3 - Proposta Enviada',
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
    id: 'Contato Futuro',
    title: '5 - Contato Futuro',
    colorClass: 'text-gray-700',
    borderTopClass: 'border-t-gray-400',
    icon: FUNIL_ETAPAS_CONFIG['Contato Futuro'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Contato Futuro'].iconColorClass,
  },
]

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ clientes: clientesProp }) => {
  const { openFichaCliente, updateClienteStatus, updateCliente, atividades } = useClientes()
  const { toast } = useToast()

  // Sanitização e normalização defensiva dos clientes:
  const clientes = useMemo(() => {
    return (Array.isArray(clientesProp) ? clientesProp : [])
      .filter(
        (c) =>
          Boolean(c) &&
          c.status !== 'Fechado' &&
          (c.status as string) !== 'Perdido' &&
          !c.arquivado &&
          !c.transferido_pos_vendas,
      )
      .map((c) => ({
        ...c,
        id: String(c.id || ''),
        nome: typeof c.nome === 'string' && c.nome.trim() ? c.nome.trim() : 'Cliente sem nome',
        status: (c.status || 'Novo Lead') as ClienteStatus,
        valor_estimado: Number(c.valor_estimado) || 0,
        cidade: typeof c.cidade === 'string' ? c.cidade : '',
        produto: typeof c.produto === 'string' ? c.produto : 'Energia Solar',
        potencia_kwp: Number(c.potencia_kwp) || 0,
      }))
  }, [clientesProp])

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

  // Cálculo de dias na etapa para cada cliente
  const getDiasNaEtapa = (client: Cliente) => {
    const rawDate = client.updated || client.created
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
  const touchStateRef = useRef<{
    clientId: string
    initialX: number
    initialY: number
    ghostEl: HTMLElement | null
    isDragging: boolean
  } | null>(null)

  const handleCardClick = (clientId: string) => {
    // Se estava arrastando no touch, ignora o clique
    if (touchStateRef.current?.isDragging) return
    openFichaCliente(clientId)
  }

  // HTML5 Drag and Drop Handlers (Desktop / Pointer)
  const handleDragStart = (e: React.DragEvent, client: Cliente) => {
    setDraggedClientId(client.id)
    e.dataTransfer.setData('text/plain', client.id)
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
    const clientId = e.dataTransfer.getData('text/plain') || draggedClientId
    setDraggedClientId(null)
    setDragOverColumnId(null)

    if (!clientId) return
    const targetClient = clientes.find((c) => c.id === clientId)
    if (!targetClient || targetClient.status === targetStatus) return

    try {
      await updateClienteStatus(clientId, targetStatus)
    } catch (err) {
      console.error('Falha ao mover card:', err)
      toast({
        title: 'Erro ao mover cliente',
        description: 'Não foi possível alterar a etapa do cliente.',
        variant: 'destructive',
      })
    }
  }

  // Touch Handlers para dispositivos móveis
  const handleTouchStart = (e: React.TouchEvent, client: Cliente) => {
    const touch = e.touches[0]
    touchStateRef.current = {
      clientId: client.id,
      initialX: touch.clientX,
      initialY: touch.clientY,
      ghostEl: null,
      isDragging: false,
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStateRef.current) return
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStateRef.current.initialX)
    const deltaY = Math.abs(touch.clientY - touchStateRef.current.initialY)

    if (!touchStateRef.current.isDragging && (deltaX > 10 || deltaY > 10)) {
      touchStateRef.current.isDragging = true
      setDraggedClientId(touchStateRef.current.clientId)

      const targetCard = e.currentTarget as HTMLElement
      const ghost = targetCard.cloneNode(true) as HTMLElement
      ghost.style.position = 'fixed'
      ghost.style.zIndex = '9999'
      ghost.style.pointerEvents = 'none'
      ghost.style.opacity = '0.9'
      ghost.style.transform = 'scale(1.02)'
      ghost.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
      ghost.style.width = `${targetCard.offsetWidth}px`
      ghost.style.left = `${touch.clientX - targetCard.offsetWidth / 2}px`
      ghost.style.top = `${touch.clientY - 40}px`
      document.body.appendChild(ghost)
      touchStateRef.current.ghostEl = ghost
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
        const client = clientes.find((c) => c.id === clientId)
        if (targetStatus && client && client.status !== targetStatus) {
          try {
            await updateClienteStatus(clientId, targetStatus)
          } catch (err) {
            console.error('Falha ao mover card touch:', err)
          }
        }
      }
    }

    setTimeout(() => {
      touchStateRef.current = null
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

  return (
    <div className="w-full pb-6 pt-1 select-none overflow-x-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start min-w-[320px]">
        {KANBAN_COLUMNS.map((col) => {
          const colClients = clientes.filter((c) => (c.status || '') === col.id)
          const totalColValue = colClients.reduce(
            (sum, c) => sum + (Number(c.valor_estimado) || 0),
            0,
          )
          const isOver = dragOverColumnId === col.id

          return (
            <div
              key={col.id}
              data-column-id={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`min-w-0 w-full rounded-xl p-2.5 border-t-[5px] ${
                col.borderTopClass
              } shadow-xs flex flex-col transition-all duration-150 ${
                isOver
                  ? 'bg-emerald-50/80 ring-2 ring-emerald-500 ring-offset-1 border-emerald-400'
                  : 'bg-slate-100/80 border-x border-b border-slate-200/70'
              }`}
            >
              {/* Cabeçalho da Coluna: Nome, contador, valor acumulado e border-top estilizado */}
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
                    {colClients.length}
                  </span>
                </div>

                {/* Valor acumulado da etapa em fonte pequena */}
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
              <div className="space-y-2.5 flex-1 min-h-[320px] flex flex-col min-w-0">
                {colClients.length === 0 ? (
                  <div
                    className={`h-28 flex-1 flex items-center justify-center border-2 border-dashed rounded-lg text-xs text-center p-2 transition-colors ${
                      isOver
                        ? 'border-emerald-400 bg-emerald-100/40 text-emerald-700 font-medium'
                        : 'border-slate-300/80 text-slate-400 bg-white/40'
                    }`}
                  >
                    {isOver ? 'Soltar aqui' : 'Nenhum lead nesta etapa'}
                  </div>
                ) : (
                  colClients.map((client) => {
                    const isDraggingThis = draggedClientId === client.id
                    const proximaAcao = proximaAcaoPorCliente.get(client.id)
                    const isLeadFrio = !proximaAcao
                    const diasNaEtapa = getDiasNaEtapa(client)
                    const tempoAlerta = diasNaEtapa > 7
                    const isReaberto = Boolean(client.reabertura)

                    return (
                      <div
                        key={client.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, client)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => handleTouchStart(e, client)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onClick={() => handleCardClick(client.id)}
                        className={`bg-white rounded-lg p-3 border transition-all duration-150 cursor-pointer active:cursor-grabbing group relative overflow-hidden min-w-0 ${
                          isReaberto ? 'border-l-4 border-l-amber-500' : ''
                        } ${
                          isDraggingThis
                            ? 'opacity-40 scale-95 border-emerald-400 shadow-inner'
                            : isLeadFrio
                              ? 'border-rose-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-rose-400 ring-1 ring-rose-200/50'
                              : 'border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300'
                        }`}
                      >
                        {/* Linha 1: Nome do cliente (14pt/text-sm font-bold truncate) + Badge Cliente Ativo + Menu de 3 pontos */}
                        <div className="flex items-start justify-between gap-1.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <div
                              className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate min-w-0 leading-tight"
                              title={client.nome}
                            >
                              {client.nome}
                            </div>
                            {isReaberto && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shrink-0"
                                title={`Cliente Ativo • Oportunidade Reaberta: ${client.motivo_reabertura || 'Nova oportunidade comercial'}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                Cliente Ativo
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
                                  title="Opções do lead"
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-80 group-hover:opacity-100 focus:opacity-100"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuItem
                                  onClick={() => openFichaCliente(client.id)}
                                  className="cursor-pointer gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Editar / Ver Ficha</span>
                                </DropdownMenuItem>

                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                                    <span>Mover etapa</span>
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="w-44 text-xs">
                                    {KANBAN_COLUMNS.map((c) => (
                                      <DropdownMenuItem
                                        key={c.id}
                                        disabled={client.status === c.id}
                                        onClick={async () => {
                                          try {
                                            await updateClienteStatus(client.id, c.id)
                                            toast({
                                              title: 'Etapa atualizada',
                                              description: `Cliente movido para "${c.title}".`,
                                            })
                                          } catch (err) {
                                            console.error('Falha ao mover etapa via menu:', err)
                                          }
                                        }}
                                        className="cursor-pointer gap-1.5"
                                      >
                                        <c.icon className={`w-3 h-3 ${c.iconColorClass}`} />
                                        <span className="truncate">{c.title}</span>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={async () => {
                                    const confirmou = window.confirm(
                                      `Deseja arquivar o cliente "${client.nome}"? Ele sairá da visualização do funil.`,
                                    )
                                    if (!confirmou) return
                                    try {
                                      await updateCliente(client.id, { arquivado: true })
                                      toast({
                                        title: 'Cliente arquivado',
                                        description: `"${client.nome}" foi arquivado com sucesso.`,
                                      })
                                    } catch (err) {
                                      console.error('Erro ao arquivar:', err)
                                      toast({
                                        title: 'Erro ao arquivar',
                                        description: 'Não foi possível arquivar o cliente.',
                                        variant: 'destructive',
                                      })
                                    }
                                  }}
                                  className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  <span>Arquivar lead</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Linha 2: Valor do negócio: text-xs font-bold em azul marinho (#1a3a5c) */}
                        <div className="mt-1 flex items-center justify-between gap-1 min-w-0">
                          <span className="font-bold text-xs truncate" style={{ color: '#1a3a5c' }}>
                            {formatCurrency(client.valor_estimado || 0)}
                          </span>
                        </div>

                        {/* Linha 3: Localização + Potência na mesma linha com ícones Lucide (text-[11px] text-muted-foreground) */}
                        <div className="mt-1.5 flex items-center text-[11px] text-muted-foreground gap-1.5 min-w-0 truncate">
                          {client.cidade ? (
                            <span className="inline-flex items-center gap-1 truncate shrink min-w-0">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{client.cidade}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                              <span>Sem cidade</span>
                            </span>
                          )}

                          <span className="text-slate-300">•</span>

                          {client.potencia_kwp ? (
                            <span className="inline-flex items-center gap-1 shrink-0 font-medium text-slate-600">
                              <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>{client.potencia_kwp} kWp</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] shrink-0">— kWp</span>
                          )}
                        </div>

                        {/* Linha 4: Próxima ação agendada (10pt / text-[10px]) */}
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

                        {/* Linha 5: Tempo na etapa (discreto, 10pt; alerta amarelo/vermelho se > 7 dias) */}
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
                {isOver && colClients.length > 0 && (
                  <div className="h-10 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-100/50 flex items-center justify-center text-xs text-emerald-700 font-medium">
                    Soltar aqui
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
