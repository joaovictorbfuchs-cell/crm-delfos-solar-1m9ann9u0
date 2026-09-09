import React, { useState } from 'react'
import { KanbanSquare, Loader2, UserPlus } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { KanbanBoard } from '@/components/KanbanBoard'
import { formatCurrency } from '@/lib/formatters'
import { NovoLeadModal } from '@/components/NovoLeadModal'

export default function Comercial() {
  const { clientes, isLoading } = useClientes()
  const [isNovoLeadOpen, setIsNovoLeadOpen] = useState(false)

  const totalPotencial = clientes
    .filter((c) => c.status !== 'Contato Futuro' && (c.status as string) !== 'Perdido')
    .reduce((sum, c) => sum + (c.valor_estimado || 0), 0)

  const fechados = clientes.filter((c) => c.status === 'Fechado')
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
      {/* Top Banner */}

      {/* Kanban Board Full with action bar above funil */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Etapas do Funil de Vendas</h3>
            <p className="text-xs text-gray-500">
              Arraste os cards entre as colunas para atualizar a etapa de cada cliente
            </p>
          </div>
          <button
            onClick={() => setIsNovoLeadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all duration-150 hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Novo Lead</span>
          </button>
        </div>

        <KanbanBoard clientes={clientes} />
      </div>

      {/* Modal Novo Lead */}
      <NovoLeadModal isOpen={isNovoLeadOpen} onClose={() => setIsNovoLeadOpen(false)} />
    </div>
  )
}
