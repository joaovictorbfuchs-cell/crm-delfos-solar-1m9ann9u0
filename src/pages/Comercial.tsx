import React from 'react'
import { KanbanSquare, Loader2 } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { KanbanBoard } from '@/components/KanbanBoard'
import { formatCurrency } from '@/lib/formatters'

export default function Comercial() {
  const { clientes, isLoading } = useClientes()

  const totalPotencial = clientes
    .filter((c) => c.status !== 'Perdido')
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
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
            <KanbanSquare className="w-6 h-6 text-[#16A34A]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pipeline de Vendas Solar</h2>
            <p className="text-xs text-gray-500">
              Gerencie cada oportunidade desde a captação do lead até o fechamento contratual
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="px-3.5 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">
              Pipeline Total
            </span>
            <span className="font-bold text-gray-900 text-sm">
              {formatCurrency(totalPotencial)}
            </span>
          </div>

          <div className="px-3.5 py-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
            <span className="text-emerald-700 block text-[10px] uppercase font-semibold">
              Total Fechado
            </span>
            <span className="font-bold text-emerald-800 text-sm">
              {formatCurrency(totalFechado)}
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board Full */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs">
        <KanbanBoard clientes={clientes} />
      </div>
    </div>
  )
}
