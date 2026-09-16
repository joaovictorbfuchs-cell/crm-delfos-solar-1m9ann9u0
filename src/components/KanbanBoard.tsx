import React, { useState, useRef, useEffect } from 'react'
import { MapPin, Zap, GripVertical, Trophy, XCircle, type LucideIcon } from 'lucide-react'
import type { Cliente, ClienteStatus } from '@/types/crm'
import { formatCurrency } from '@/lib/formatters'
import { useClientes } from '@/contexts/ClientesContext'
import { ProductBadge, FUNIL_ETAPAS_CONFIG } from '@/components/StatusBadge'
import { ModalMarcarGanho } from '@/components/ModalMarcarGanho'
import { ModalMarcarPerdido } from '@/components/ModalMarcarPerdido'
import { useToast } from '@/hooks/use-toast'

interface KanbanBoardProps {
  clientes: Cliente[]
}

export interface KanbanColumnDef {
  id: ClienteStatus
  title: string
  borderClass: string
  icon: LucideIcon
  iconColorClass: string
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: 'Novo Lead',
    title: '1 - Novo Lead',
    borderClass: 'border-t-slate-400',
    icon: FUNIL_ETAPAS_CONFIG['Novo Lead'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Novo Lead'].iconColorClass,
  },
  {
    id: 'Levantamento',
    title: '2 - Levantamento',
    borderClass: 'border-t-sky-400',
    icon: FUNIL_ETAPAS_CONFIG['Levantamento'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Levantamento'].iconColorClass,
  },
  {
    id: 'Orçamento',
    title: '3 - Orçamento',
    borderClass: 'border-t-indigo-400',
    icon: FUNIL_ETAPAS_CONFIG['Orçamento'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Orçamento'].iconColorClass,
  },
  {
    id: 'Negociação',
    title: '4 - Negociação',
    borderClass: 'border-t-amber-500',
    icon: FUNIL_ETAPAS_CONFIG['Negociação'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Negociação'].iconColorClass,
  },
  {
    id: 'Contato Futuro',
    title: '5 - Contato Futuro',
    borderClass: 'border-t-gray-400',
    icon: FUNIL_ETAPAS_CONFIG['Contato Futuro'].icon,
    iconColorClass: FUNIL_ETAPAS_CONFIG['Contato Futuro'].iconColorClass,
  },
]

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ clientes: clientesProp }) => {
  const { openFichaCliente, updateClienteStatus, marcarComoGanho, marcarComoPerdido } =
    useClientes()
  const { toast } = useToast()

  // Sanitização e normalização defensiva dos clientes:
  // Evita erros se algum registro vier com campos nulos, tipos inesperados ou status corrompido
  const clientes = (Array.isArray(clientesProp) ? clientesProp : [])
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

  // Modais de ação rápida Ganho / Perdido
  const [modalGanhoCliente, setModalGanhoCliente] = useState<Cliente | null>(null)
  const [modalPerdidoCliente, setModalPerdidoCliente] = useState<Cliente | null>(null)

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

  const draggedClient = draggedClientId
    ? clientes.find((c) => c.id === draggedClientId) || null
    : null

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
    // Apenas se o ponteiro sair da coluna em si (não para elementos filhos)
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

    // Iniciar arrasto se passar de um limiar mínimo
    if (!touchStateRef.current.isDragging && (deltaX > 10 || deltaY > 10)) {
      touchStateRef.current.isDragging = true
      setDraggedClientId(touchStateRef.current.clientId)

      // Criar elemento fantasma flutuante
      const targetCard = e.currentTarget as HTMLElement
      const ghost = targetCard.cloneNode(true) as HTMLElement
      ghost.style.position = 'fixed'
      ghost.style.zIndex = '9999'
      ghost.style.pointerEvents = 'none'
      ghost.style.opacity = '0.85'
      ghost.style.transform = 'scale(1.03)'
      ghost.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
      ghost.style.width = `${targetCard.offsetWidth}px`
      ghost.style.left = `${touch.clientX - targetCard.offsetWidth / 2}px`
      ghost.style.top = `${touch.clientY - 40}px`
      document.body.appendChild(ghost)
      touchStateRef.current.ghostEl = ghost
    }

    if (touchStateRef.current.isDragging && touchStateRef.current.ghostEl) {
      e.preventDefault() // Prevenir scroll enquanto arrasta o card
      const ghost = touchStateRef.current.ghostEl
      const cardWidth = ghost.offsetWidth
      ghost.style.left = `${touch.clientX - cardWidth / 2}px`
      ghost.style.top = `${touch.clientY - 40}px`

      // Detectar qual coluna está embaixo do touch
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

    // Reset touch state
    setTimeout(() => {
      touchStateRef.current = null
      setDraggedClientId(null)
      setDragOverColumnId(null)
    }, 50)
  }

  // Limpeza de ghost element se o componente desmontar
  useEffect(() => {
    return () => {
      if (touchStateRef.current?.ghostEl) {
        touchStateRef.current.ghostEl.remove()
      }
    }
  }, [])

  return (
    <div className="w-full pb-4 pt-1 select-none overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3 items-start w-full">
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
              className={`min-w-0 w-full rounded-xl p-2 sm:p-2.5 border-t-4 ${
                col.borderClass
              } shadow-xs flex flex-col transition-all duration-150 ${
                isOver
                  ? 'bg-emerald-50/80 ring-2 ring-emerald-500 ring-offset-1 border-emerald-400'
                  : 'bg-[#F1F5F3]'
              }`}
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/60 gap-1 min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <col.icon className={`w-3.5 h-3.5 shrink-0 ${col.iconColorClass}`} />
                  <h3
                    className="font-semibold text-[11px] sm:text-xs text-gray-800 uppercase tracking-tight truncate"
                    title={col.title}
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
                  {colClients.length}
                </span>
              </div>

              {/* Cards List / Drop Zone */}
              <div className="space-y-2 flex-1 min-h-[300px] flex flex-col min-w-0">
                {colClients.length === 0 ? (
                  <div
                    className={`h-24 flex-1 flex items-center justify-center border-2 border-dashed rounded-lg text-[11px] text-center p-1 transition-colors ${
                      isOver
                        ? 'border-emerald-400 bg-emerald-100/40 text-emerald-700 font-medium'
                        : 'border-gray-200 text-gray-400'
                    }`}
                  >
                    {isOver ? 'Soltar aqui' : 'Vazio'}
                  </div>
                ) : (
                  colClients.map((client) => {
                    const isDraggingThis = draggedClientId === client.id

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
                        className={`bg-white rounded-lg sm:rounded-xl p-2.5 sm:p-3 border transition-all duration-150 cursor-grab active:cursor-grabbing group relative overflow-hidden min-w-0 ${
                          isDraggingThis
                            ? 'opacity-40 scale-95 border-emerald-400 shadow-inner'
                            : 'border-gray-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300'
                        }`}
                      >
                        {/* Nome do Cliente com Grip */}
                        <div className="flex items-start justify-between gap-1 min-w-0">
                          <div
                            className="font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug break-words flex-1 min-w-0"
                            title={client.nome}
                          >
                            {client.nome}
                          </div>
                          <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 hidden sm:block" />
                        </div>

                        {/* Etiqueta colorida de produto */}
                        <div className="mt-1.5 sm:mt-2 min-w-0">
                          <ProductBadge
                            produto={client.produto || 'Energia Solar'}
                            size="sm"
                            className="text-[10px] sm:text-[11px] py-0.5 px-1.5 sm:px-2 max-w-full"
                          />
                        </div>

                        {/* Cidade */}
                        {client.cidade && (
                          <div className="flex items-center text-[11px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2 gap-1 min-w-0">
                            <MapPin className="w-3 h-3 shrink-0 text-emerald-600" />
                            <span className="truncate">{client.cidade}</span>
                          </div>
                        )}

                        {/* Potência e Valor Estimado */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px] sm:text-xs gap-1 min-w-0 flex-wrap sm:flex-nowrap">
                          {client.potencia_kwp ? (
                            <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium text-[10px] sm:text-[11px]">
                              <Zap className="w-3 h-3 text-amber-500" />
                              <span>{client.potencia_kwp} kWp</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}

                          <span className="font-semibold text-gray-800 text-[11px] sm:text-xs truncate">
                            {formatCurrency(client.valor_estimado || 0)}
                          </span>
                        </div>

                        {/* Botões de Ação Rápida: Marcar como Ganho / Marcar como Perdido */}
                        <div
                          className="mt-2.5 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            title="Marcar como Ganho (enviar para Projetos ou O&M)"
                            onClick={(e) => {
                              e.stopPropagation()
                              setModalGanhoCliente(client)
                            }}
                            className="inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-colors shadow-2xs active:scale-95"
                          >
                            <Trophy className="w-3 h-3 shrink-0" />
                            <span className="truncate">Ganho</span>
                          </button>

                          <button
                            type="button"
                            title="Marcar como Perdido (registrar motivo)"
                            onClick={(e) => {
                              e.stopPropagation()
                              setModalPerdidoCliente(client)
                            }}
                            className="inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] font-semibold bg-gray-50 text-gray-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-gray-200 transition-colors shadow-2xs active:scale-95"
                          >
                            <XCircle className="w-3 h-3 shrink-0" />
                            <span className="truncate">Perdido</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Drop indicator quando há cards na coluna e o usuário está passando por cima */}
                {isOver && colClients.length > 0 && (
                  <div className="h-9 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-100/50 flex items-center justify-center text-[11px] text-emerald-700 font-medium">
                    Soltar aqui
                  </div>
                )}
              </div>

              {/* Col Footer total */}
              {colClients.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200/60 text-right text-[10px] sm:text-[11px] text-gray-500 truncate">
                  Total:{' '}
                  <strong className="text-gray-800 font-semibold">
                    {formatCurrency(totalColValue)}
                  </strong>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Marcar Ganho */}
      <ModalMarcarGanho
        cliente={modalGanhoCliente}
        open={Boolean(modalGanhoCliente)}
        onOpenChange={(open) => {
          if (!open) setModalGanhoCliente(null)
        }}
        onConfirm={async (area) => {
          if (!modalGanhoCliente) return
          const nomeCliente = modalGanhoCliente.nome
          try {
            await marcarComoGanho(modalGanhoCliente.id, area)
            toast({
              title: 'Negócio Ganho!',
              description: `Cliente "${nomeCliente}" fechado e enviado com sucesso para ${
                area === 'projetos'
                  ? 'a área de Projetos (Levantamento de Informações)'
                  : 'a área de O&M (Plano de Manutenção)'
              }.`,
            })
            setModalGanhoCliente(null)
          } catch (err) {
            toast({
              title: 'Erro ao marcar ganho',
              description: 'Não foi possível registrar o negócio como ganho. Tente novamente.',
              variant: 'destructive',
            })
            throw err
          }
        }}
      />

      {/* Modal Marcar Perdido */}
      <ModalMarcarPerdido
        cliente={modalPerdidoCliente}
        open={Boolean(modalPerdidoCliente)}
        onOpenChange={(open) => {
          if (!open) setModalPerdidoCliente(null)
        }}
        onConfirm={async (motivo, observacao) => {
          if (!modalPerdidoCliente) return
          const nomeCliente = modalPerdidoCliente.nome
          try {
            await marcarComoPerdido(modalPerdidoCliente.id, motivo, observacao)
            const rotulos: Record<string, string> = {
              preco: 'Preço',
              concorrente: 'Concorrente',
              desistiu: 'Desistiu',
              outro: 'Outro',
            }
            toast({
              title: 'Negócio marcado como Perdido',
              description: `Cliente "${nomeCliente}" atualizado. Motivo: ${rotulos[motivo] || motivo}.`,
            })
            setModalPerdidoCliente(null)
          } catch (err) {
            toast({
              title: 'Erro ao registrar perda',
              description: 'Não foi possível marcar o negócio como perdido. Tente novamente.',
              variant: 'destructive',
            })
            throw err
          }
        }}
      />
    </div>
  )
}
