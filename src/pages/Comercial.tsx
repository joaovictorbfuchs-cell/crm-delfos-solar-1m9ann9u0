import React, { useState } from 'react'
import { KanbanSquare, List, Loader2, UserPlus, LayoutGrid } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ComercialListView } from '@/components/ComercialListView'
import { formatCurrency } from '@/lib/formatters'
import { NovoLeadModal } from '@/components/NovoLeadModal'

export default function Comercial() {
  const { clientes, isLoading } = useClientes()
  const [isNovoLeadOpen, setIsNovoLeadOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  // Clientes ativos no funil comercial: desconsidera arquivados e negócios já transferidos para Pós-Vendas
  const clientesAtivos = clientes.filter((c) => !c.arquivado && !c.transferido_pos_vendas)

  const fechados = clientesAtivos.filter((c) => c.status === 'Fechado')
  const totalFechado = fechados.reduce((sum, c) => sum + (c.valor_estimado || 0), 0)

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando funil comercial...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action Bar & Container */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {viewMode === 'kanban'
                ? 'Etapas do Funil de Vendas'
                : 'Visão Geral dos Negócios (Lista)'}
            </h3>
            <p className="text-xs text-gray-500">
              {viewMode === 'kanban'
                ? 'Arraste os cards entre as colunas para atualizar a etapa de cada cliente'
                : 'Gerencie negócios em formato tabela com seleção múltipla e ações em lote'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Seletor de Modo de Visualização: Kanban vs Lista */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/80'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Visualização Kanban"
              >
                <LayoutGrid className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/80'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Visualização em Lista"
              >
                <List className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>

            {/* Botão Novo Lead */}
            <button
              onClick={() => setIsNovoLeadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all duration-150 hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Novo Lead</span>
            </button>
          </div>
        </div>

        {/* Alternância de Visualização */}
        {viewMode === 'kanban' ? (
          <KanbanBoard clientes={clientesAtivos} />
        ) : (
          <ComercialListView
            clientes={clientesAtivos}
            onBackToKanban={() => setViewMode('kanban')}
          />
        )}
      </div>

      {/* Modal Novo Lead */}
      <NovoLeadModal isOpen={isNovoLeadOpen} onClose={() => setIsNovoLeadOpen(false)} />
    </div>
  )
}
