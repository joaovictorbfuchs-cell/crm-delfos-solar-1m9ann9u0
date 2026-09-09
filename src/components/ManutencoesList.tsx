import React from 'react'
import { Plus, Droplets, Zap, Settings, Wrench, User, Calendar } from 'lucide-react'
import type { Manutencao } from '@/types/crm'
import { formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/StatusBadge'
import { useClientes } from '@/contexts/ClientesContext'

interface ManutencoesListProps {
  onOpenNovaManutencao: () => void
}

export const ManutencoesList: React.FC<ManutencoesListProps> = ({ onOpenNovaManutencao }) => {
  const { manutencoes, clientes, openFichaCliente } = useClientes()

  const getClientName = (m: Manutencao) => {
    if (m.expand?.cliente_id?.nome) return m.expand.cliente_id.nome
    const found = clientes.find((c) => c.id === m.cliente_id)
    return found ? found.nome : 'Cliente Desconhecido'
  }

  const getClientCity = (m: Manutencao) => {
    if (m.expand?.cliente_id?.cidade) return m.expand.cliente_id.cidade
    const found = clientes.find((c) => c.id === m.cliente_id)
    return found ? found.cidade : ''
  }

  const getServiceIcon = (tipo: string) => {
    switch (tipo) {
      case 'Limpeza':
        return <Droplets className="w-4 h-4 text-blue-500" />
      case 'Revisão Elétrica':
        return <Zap className="w-4 h-4 text-amber-500" />
      case 'Troca de Inversor':
        return <Settings className="w-4 h-4 text-purple-500" />
      default:
        return <Wrench className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Ordens de Serviço e Manutenções</h3>
          <p className="text-xs text-gray-500">
            Acompanhamento de revisões elétricas, limpezas e suporte a inversores
          </p>
        </div>
        <button
          onClick={onOpenNovaManutencao}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-120 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Nova Manutenção
        </button>
      </div>

      {manutencoes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma manutenção agendada.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Data do Serviço</th>
                  <th className="py-3.5 px-4">Tipo de Serviço</th>
                  <th className="py-3.5 px-4">Técnico</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {manutencoes.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => openFichaCliente(m.cliente_id)}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {getClientName(m)}
                      </div>
                      <div className="text-xs text-gray-400">{getClientCity(m)}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium whitespace-nowrap">
                      {formatDate(m.data)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {getServiceIcon(m.tipo)}
                        <span className="font-medium text-gray-800">{m.tipo}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 text-xs">
                      {m.tecnico ? (
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {m.tecnico}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Não atribuído</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-xs font-medium text-emerald-600 group-hover:text-emerald-800 group-hover:underline">
                        Ver ficha →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {manutencoes.map((m) => (
              <div
                key={m.id}
                onClick={() => openFichaCliente(m.cliente_id)}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{getClientName(m)}</h4>
                    <p className="text-xs text-gray-400">{getClientCity(m)}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    {getServiceIcon(m.tipo)}
                    <span className="font-medium">{m.tipo}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(m.data)}</span>
                  </div>
                </div>

                {m.tecnico && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-400" />
                    <span>Técnico: {m.tecnico}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
