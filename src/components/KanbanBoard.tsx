import React from 'react'
import { MapPin, Zap } from 'lucide-react'
import type { Cliente, ClienteStatus } from '@/types/crm'
import { formatCurrency } from '@/lib/formatters'
import { useClientes } from '@/contexts/ClientesContext'

interface KanbanBoardProps {
  clientes: Cliente[]
}

const COLUMNS: { id: ClienteStatus; title: string; borderClass: string }[] = [
  { id: 'Lead', title: 'Lead', borderClass: 'border-t-slate-400' },
  { id: 'Orçamento Enviado', title: 'Orçamento Enviado', borderClass: 'border-t-indigo-400' },
  { id: 'Proposta', title: 'Proposta', borderClass: 'border-t-teal-400' },
  { id: 'Negociação', title: 'Negociação', borderClass: 'border-t-amber-500' },
  { id: 'Fechado', title: 'Fechado', borderClass: 'border-t-[#16A34A]' },
  { id: 'Perdido', title: 'Perdido', borderClass: 'border-t-gray-400' },
]

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ clientes }) => {
  const { openFichaCliente } = useClientes()

  return (
    <div className="w-full overflow-x-auto pb-6 pt-1">
      <div className="flex gap-4 min-w-[1200px] xl:min-w-0 xl:grid xl:grid-cols-6 items-start">
        {COLUMNS.map((col) => {
          const colClients = clientes.filter((c) => c.status === col.id)
          const totalColValue = colClients.reduce((sum, c) => sum + (c.valor_estimado || 0), 0)

          return (
            <div
              key={col.id}
              className={`w-[280px] xl:w-full flex-shrink-0 bg-[#F1F5F3] rounded-xl p-3 border-t-4 ${col.borderClass} shadow-xs flex flex-col`}
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/60">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-xs text-gray-800 uppercase tracking-wider">
                    {col.title}
                  </h3>
                  <span className="bg-white text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-xs border border-gray-200">
                    {colClients.length}
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-2.5 flex-1 min-h-[320px]">
                {colClients.length === 0 ? (
                  <div className="h-28 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400">
                    Nenhum cliente
                  </div>
                ) : (
                  colClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => openFichaCliente(client.id)}
                      className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
                    >
                      <div className="font-semibold text-sm text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                        {client.nome}
                      </div>

                      <div className="flex items-center text-xs text-gray-500 mt-2 gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{client.cidade}</span>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-xs">
                        <div className="flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <Zap className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{client.potencia_kwp} kWp</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(client.valor_estimado)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Col Footer total */}
              {colClients.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-gray-200/60 text-right text-[11px] text-gray-500">
                  Total: <strong className="text-gray-700">{formatCurrency(totalColValue)}</strong>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
