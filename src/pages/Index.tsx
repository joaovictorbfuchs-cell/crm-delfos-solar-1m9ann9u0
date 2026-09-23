import React, { useState } from 'react'
import { Users, TrendingUp, DollarSign, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/formatters'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ManutencoesList } from '@/components/ManutencoesList'
import { NovaManutencaoModal } from '@/components/NovaManutencaoModal'
import { PainelLembretesHoje } from '@/components/PainelLembretesHoje'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function Index() {
  const { clientes, isLoading, error, refreshData } = useClientes()
  const [activeTab, setActiveTab] = useState<'comercial' | 'manutencoes'>('comercial')
  const [isNovaManutencaoOpen, setIsNovaManutencaoOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      setIsRefreshing(false)
    }
  }

  const safeClientes = Array.isArray(clientes) ? clientes : []

  // Top metric calculations
  const totalClientes = safeClientes.length

  // Negócios em Aberto: etapas ativas do funil (exclui Fechado, Contato Futuro e Perdido)
  const STATUS_EM_ABERTO = ['Novo Lead', 'Levantamento', 'Orçamento', 'Negociação']
  const negociosEmAberto = safeClientes.filter(
    (c) =>
      Boolean(c) &&
      STATUS_EM_ABERTO.includes(c.status) &&
      (c.status as string) !== 'Perdido' &&
      (c.status as string) !== 'Fechado' &&
      !c.arquivado &&
      !c.transferido_pos_vendas,
  )

  const valorTotalFunil = negociosEmAberto.reduce((sum, c) => {
    const val = Number(c?.valor_estimado)
    return sum + (isNaN(val) ? 0 : val)
  }, 0)

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

      {/* Banner de erro quando houver falha ao carregar dados do CRM */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-red-800">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Erro ao carregar dados do CRM</p>
              <p className="text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shrink-0 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      {/* Alerta defensivo quando a lista estiver vazia após carregar */}
      {!isLoading && !error && safeClientes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-amber-800">
          <div>
            <p className="font-bold">Nenhum cliente carregado no painel.</p>
            <p className="text-amber-700">
              Se você possui dados cadastrados no CRM, clique em recarregar para revalidar a
              consulta.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Recarregar dados</span>
          </button>
        </div>
      )}

      {/* 3 Metric Cards protegidos por ErrorBoundary */}
      <ErrorBoundary compact errorMessage="Não foi possível carregar as métricas do painel.">
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
          <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Valor Total no Funil
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(valorTotalFunil)}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Soma de negócios em aberto</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>

      {/* Painel "Lembretes de Hoje" destacado acima das abas */}
      <ErrorBoundary compact errorMessage="Não foi possível carregar os lembretes do dia.">
        <PainelLembretesHoje />
      </ErrorBoundary>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 sm:p-5">
        {/* Tab Headers */}
        <div className="border-b border-gray-200 flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-6">
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

          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 mb-2 shrink-0"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tab Content with 150ms smooth transition */}
        <div className="transition-opacity duration-150">
          {activeTab === 'comercial' ? (
            <ErrorBoundary compact errorMessage="Não foi possível exibir o funil comercial.">
              <div className="animate-in fade-in duration-150 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Funil Comercial de Oportunidades
                    </h3>
                    <p className="text-xs text-gray-500">
                      Visão em Kanban das negociações por estágio na região de Erechim, Passo Fundo
                      e Chapecó
                    </p>
                  </div>
                </div>
                <KanbanBoard clientes={safeClientes} />
              </div>
            </ErrorBoundary>
          ) : (
            <ErrorBoundary compact errorMessage="Não foi possível exibir a lista de manutenções.">
              <div className="animate-in fade-in duration-150">
                <ManutencoesList onOpenNovaManutencao={() => setIsNovaManutencaoOpen(true)} />
              </div>
            </ErrorBoundary>
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
