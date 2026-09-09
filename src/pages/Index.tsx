import React, { useState } from 'react'
import { Users, TrendingUp, DollarSign, Loader2 } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency } from '@/lib/formatters'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ManutencoesList } from '@/components/ManutencoesList'
import { NovaManutencaoModal } from '@/components/NovaManutencaoModal'

export default function Index() {
  const { clientes, isLoading } = useClientes()
  const [activeTab, setActiveTab] = useState<'comercial' | 'manutencoes'>('comercial')
  const [isNovaManutencaoOpen, setIsNovaManutencaoOpen] = useState(false)

  // Top metric calculations
  const totalClientes = clientes.length

  // Negócios em Aberto: Novo Lead, Levantamento, Orçamento, Negociação
  const negociosEmAberto = clientes.filter((c) =>
    ['Novo Lead', 'Levantamento', 'Orçamento', 'Negociação'].includes(c.status),
  )

  const valorTotalFunil = negociosEmAberto.reduce((sum, c) => sum + (c.valor_estimado || 0), 0)

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando painel Delfos Solar...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard Delfos Solar</h1>
          <p className="text-xs text-gray-500">
            Acompanhamento de vendas, metas comerciais e ordens de serviço
          </p>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Total Clientes */}
        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total de Clientes
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalClientes}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Base cadastrada no sistema</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-[#16A34A] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 2: Negócios em Aberto */}
        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Negócios em Aberto
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{negociosEmAberto.length}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Leads, levantamentos e propostas</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 3: Valor Total Estimado do Funil */}
        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Valor Total no Funil
              </p>
              <h3 className="text-2xl font-bold text-[#166534] mt-1">
                {formatCurrency(valorTotalFunil)}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Potencial em negociação ativa</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5">
        {/* Tab Headers */}
        <div className="border-b border-gray-200 flex items-center gap-6 mb-6">
          <button
            onClick={() => setActiveTab('comercial')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'comercial' ? 'text-[#166534]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Aba Comercial (Funil de Vendas)
            {activeTab === 'comercial' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#16A34A] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('manutencoes')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'manutencoes' ? 'text-[#166534]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Aba Manutenções & O.S.
            {activeTab === 'manutencoes' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#16A34A] rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content with 150ms smooth transition */}
        <div className="transition-opacity duration-150">
          {activeTab === 'comercial' ? (
            <div className="animate-in fade-in duration-150 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Funil Comercial de Oportunidades
                  </h3>
                  <p className="text-xs text-gray-500">
                    Visão em Kanban das negociações por estágio na região de Erechim, Passo Fundo e
                    Chapecó
                  </p>
                </div>
              </div>
              <KanbanBoard clientes={clientes} />
            </div>
          ) : (
            <div className="animate-in fade-in duration-150">
              <ManutencoesList onOpenNovaManutencao={() => setIsNovaManutencaoOpen(true)} />
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Manutencao */}
      <NovaManutencaoModal
        isOpen={isNovaManutencaoOpen}
        onClose={() => setIsNovaManutencaoOpen(false)}
      />
    </div>
  )
}
