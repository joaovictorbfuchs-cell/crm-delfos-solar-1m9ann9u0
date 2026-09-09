import React, { useState, useMemo } from 'react'
import { Search, Eye, MapPin, Zap, Users, Loader2 } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { StatusBadge } from '@/components/StatusBadge'
import { formatCurrency } from '@/lib/formatters'

export default function Clientes() {
  const { clientes, isLoading, openFichaCliente } = useClientes()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes
    const lower = searchTerm.toLowerCase()
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(lower) ||
        (c.cidade && c.cidade.toLowerCase().includes(lower)) ||
        (c.uc && c.uc.includes(lower)),
    )
  }, [clientes, searchTerm])

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando base de clientes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Search */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Base de Clientes
          </h2>
          <p className="text-xs text-gray-500">
            Total de {clientes.length} clientes cadastrados na região norte do RS e oeste de SC
          </p>
        </div>

        {/* Search Input with instant filter */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, cidade ou UC..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Table / Cards */}
      {filteredClientes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <p className="text-sm">Nenhum cliente encontrado para "{searchTerm}".</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Nome do Cliente</th>
                  <th className="py-3.5 px-4">Cidade</th>
                  <th className="py-3.5 px-4">Potência</th>
                  <th className="py-3.5 px-4">Valor Estimado</th>
                  <th className="py-3.5 px-4">Status Comercial</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClientes.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openFichaCliente(c.id)}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {c.nome}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">UC: {c.uc || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{c.cidade}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{c.potencia_kwp} kWp</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-800 font-medium whitespace-nowrap">
                      {formatCurrency(c.valor_estimado)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openFichaCliente(c.id)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                        title="Ver Ficha Técnica Completa"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredClientes.map((c) => (
              <div
                key={c.id}
                onClick={() => openFichaCliente(c.id)}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{c.nome}</h4>
                    <p className="text-xs text-gray-400 font-mono">UC: {c.uc || '-'}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{c.cidade}</span>
                  </div>
                  <div className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {c.potencia_kwp} kWp
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-gray-900 text-sm">
                    {formatCurrency(c.valor_estimado)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openFichaCliente(c.id)
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ficha
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
