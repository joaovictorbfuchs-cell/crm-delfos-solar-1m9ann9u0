import React, { useState, useRef, useEffect } from 'react'
import {
  MapPin,
  Zap,
  GripVertical,
  User,
  HardHat,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ClipboardList,
  FileCheck,
  ShoppingCart,
  PackageCheck,
  Hammer,
  type LucideIcon,
} from 'lucide-react'
import type { Projeto, ProjetoEtapa, Profissional } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'

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
  const { openFichaCliente, updateProjetoEtapa, assignProjetoProfissional } = useClientes()

  const [draggedProjetoId, setDraggedProjetoId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<ProjetoEtapa | null>(null)

  // Touch drag state
  const touchStateRef = useRef<{
    projetoId: string
    initialX: number
    initialY: number
    ghostEl: HTMLElement | null
    isDragging: boolean
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
    touchStateRef.current = {
      projetoId: projeto.id,
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
      setDraggedProjetoId(touchStateRef.current.projetoId)

      const targetCard = e.currentTarget as HTMLElement
      const ghost = targetCard.cloneNode(true) as HTMLElement
      ghost.style.position = 'fixed'
      ghost.style.zIndex = '9999'
      ghost.style.pointerEvents = 'none'
      ghost.style.opacity = '0.9'
      ghost.style.transform = 'scale(1.02)'
      ghost.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.25)'
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

  return (
    <div className="w-full pb-4 pt-1 select-none overflow-hidden">
      {/* Grid fluido de 6 colunas sem scroll horizontal em desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3 items-start w-full">
        {PROJETOS_COLUMNS.map((col) => {
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
              className={`min-w-0 w-full rounded-xl p-2 sm:p-2.5 border-t-4 ${
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
              <div className="space-y-2 flex-1 min-h-[320px] flex flex-col min-w-0">
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
                    const clienteNome = proj.expand?.cliente_id?.nome || 'Cliente não vinculado'
                    const cidade = proj.cidade || proj.expand?.cliente_id?.cidade || 'Erechim/RS'
                    const potencia = proj.potencia_kwp || proj.expand?.cliente_id?.potencia_kwp || 0
                    const profNome =
                      proj.profissional_nome || proj.expand?.profissional_id?.nome || null
                    const profInitial = profNome ? profNome.charAt(0).toUpperCase() : '?'

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
                        className={`bg-white rounded-lg sm:rounded-xl p-2.5 sm:p-3 border transition-all duration-150 cursor-grab active:cursor-grabbing group relative overflow-hidden min-w-0 ${
                          isDraggingThis
                            ? 'opacity-40 scale-95 border-emerald-400 shadow-inner'
                            : 'border-gray-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-400'
                        }`}
                      >
                        {/* Nome do Cliente com Grip */}
                        <div className="flex items-start justify-between gap-1 min-w-0">
                          <div
                            className="font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug break-words flex-1 min-w-0"
                            title={clienteNome}
                          >
                            {clienteNome}
                          </div>
                          <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 hidden sm:block" />
                        </div>

                        {/* Potência kWp & Cidade */}

                        {/* Profissional Responsável pela etapa */}
                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                          {profNome ? (
                            <div
                              className="flex items-center gap-1.5 min-w-0 flex-1"
                              title={`Responsável: ${profNome}`}
                            >
                              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-300">
                                {profInitial}
                              </div>
                              <span className="text-[11px] text-gray-700 font-medium truncate">
                                {profNome}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenAtribuirModal(proj, col.id)
                              }}
                              className="text-[10px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 font-medium transition-colors flex items-center gap-1"
                            >
                              <HardHat className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Atribuir</span>
                            </button>
                          )}

                          {/* Botão de troca rápida se já tiver profissional */}
                          {profNome && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenAtribuirModal(proj, col.id)
                              }}
                              className="p-1 text-gray-300 hover:text-emerald-700 hover:bg-gray-100 rounded transition-colors"
                              title="Alterar profissional"
                            >
                              <HardHat className="w-3 h-3" />
                            </button>
                          )}
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
        })}
      </div>
    </div>
  )
}
