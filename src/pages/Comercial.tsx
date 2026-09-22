import React, { useState } from 'react'
import {
  KanbanSquare,
  List,
  Loader2,
  UserPlus,
  LayoutGrid,
  Send,
  RefreshCw,
  AlertCircle,
  ArchiveX,
  RotateCcw,
  Search,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ComercialListView } from '@/components/ComercialListView'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { formatCurrency } from '@/lib/formatters'
import { NovoLeadModal } from '@/components/NovoLeadModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export default function Comercial() {
  const {
    clientes,
    isLoading,
    error,
    bulkTransferirFechadosPosVendas,
    refreshData,
    updateClienteStatus,
    openFichaCliente,
  } = useClientes()
  const [isNovoLeadOpen, setIsNovoLeadOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'perdidos'>('kanban')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [buscaPerdidos, setBuscaPerdidos] = useState('')
  const [reativandoId, setReativandoId] = useState<string | null>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Clientes ativos no funil comercial: desconsidera arquivados e negócios já transferidos para Pós-Vendas
  const clientesAtivos = clientes.filter((c) => !c.arquivado && !c.transferido_pos_vendas)

  // Clientes perdidos
  const clientesPerdidos = clientes.filter((c) => c.status === 'Perdido' && !c.arquivado)

  const clientesPerdidosFiltrados = clientesPerdidos.filter((c) => {
    if (!buscaPerdidos.trim()) return true
    const termo = buscaPerdidos.toLowerCase()
    return (
      (c.nome || '').toLowerCase().includes(termo) ||
      (c.motivo_perda || '').toLowerCase().includes(termo) ||
      (c.observacoes || '').toLowerCase().includes(termo) ||
      (c.observacoes_perda || '').toLowerCase().includes(termo) ||
      (c.cidade || '').toLowerCase().includes(termo)
    )
  })

  const fechados = clientesAtivos.filter((c) => c.status === 'Fechado')
  const totalFechado = fechados.reduce((sum, c) => sum + (c.valor_estimado || 0), 0)

  const handleReativarCliente = async (clienteId: string) => {
    setReativandoId(clienteId)
    try {
      await updateClienteStatus(clienteId, 'Contato Futuro')
      toast({
        title: 'Oportunidade reativada!',
        description: 'O cliente retornou ao funil de vendas na etapa "Contato Futuro".',
      })
    } catch (err) {
      console.error('Erro ao reativar cliente:', err)
      toast({
        title: 'Erro ao reativar',
        description: 'Não foi possível reativar o cliente. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setReativandoId(null)
    }
  }

  // Modal de transferência em lote dos Fechados para Pós-Vendas
  const [isModalTransferenciaOpen, setIsModalTransferenciaOpen] = useState(false)
  const [isTransferindo, setIsTransferindo] = useState(false)

  const handleConfirmarTransferenciaPosVendas = async () => {
    if (fechados.length === 0) return
    setIsTransferindo(true)
    try {
      const payload = fechados.map((c) => ({
        id: c.id,
        data_fechamento:
          c.data_fechamento || c.data_instalacao || c.created || new Date().toISOString(),
      }))
      await bulkTransferirFechadosPosVendas(payload)
      toast({
        title: 'Transferência concluída!',
        description: `${payload.length} negócio(s) fechado(s) transferido(s) com sucesso para Clientes Pós-Vendas.`,
      })
      setIsModalTransferenciaOpen(false)
    } catch (err) {
      console.error('Falha ao transferir fechados:', err)
      toast({
        title: 'Erro na transferência',
        description: 'Não foi possível transferir os negócios para Pós-Vendas. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsTransferindo(false)
    }
  }

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

      {/* Botão de recarga defensivo quando a lista estiver vazia */}
      {!isLoading && !error && clientesAtivos.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-amber-800">
          <div>
            <p className="font-bold">Nenhum cliente ou lead encontrado no Funil Comercial.</p>
            <p className="text-amber-700">
              Se você já possui negócios cadastrados, clique no botão para recarregar os dados do
              sistema.
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

      {/* Action Bar & Container */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Seletor de Modo de Visualização: Kanban vs Lista vs Oportunidades Perdidas */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/80 font-bold'
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/80 font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('perdidos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'perdidos'
                  ? 'bg-white text-rose-800 shadow-xs border border-rose-200/80 font-bold'
                  : 'text-gray-600 hover:text-rose-700'
              }`}
              title="Oportunidades Perdidas"
            >
              <ArchiveX className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Oportunidades Perdidas</span>
              {clientesPerdidos.length > 0 && (
                <span className="ml-1 bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                  {clientesPerdidos.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Botão Enviar Fechados para Pós-Vendas */}
            <button
              type="button"
              onClick={() => setIsModalTransferenciaOpen(true)}
              disabled={fechados.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
              title={
                fechados.length === 0
                  ? 'Nenhum negócio fechado aguardando envio'
                  : `Mover ${fechados.length} negócio(s) fechado(s) para a aba de Clientes Pós-Vendas`
              }
            >
              <Send className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
              <span className="hidden sm:inline">Enviar Fechados para Pós-Vendas</span>
              <span className="sm:hidden">Pós-Vendas</span>
              {fechados.length > 0 && (
                <span className="ml-0.5 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {fechados.length}
                </span>
              )}
            </button>

            {/* Botão Recarregar dados */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200/80 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Recarregar dados do CRM"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden md:inline">
                {isRefreshing ? 'Recarregando...' : 'Recarregar'}
              </span>
            </button>

            {/* Botão Novo Lead no padrão exato minimalista */}
            <button
              onClick={() => setIsNovoLeadOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Novo Lead</span>
            </button>
          </div>
        </div>

        {/* Alternância de Visualização */}
        {viewMode === 'kanban' ? (
          <ErrorBoundary compact errorMessage="Não foi possível exibir o funil de vendas.">
            <KanbanBoard clientes={clientesAtivos} />
          </ErrorBoundary>
        ) : viewMode === 'list' ? (
          <ErrorBoundary compact errorMessage="Não foi possível exibir o funil de vendas.">
            <ComercialListView
              clientes={clientesAtivos}
              onBackToKanban={() => setViewMode('kanban')}
            />
          </ErrorBoundary>
        ) : (
          /* Aba / Visão de Oportunidades Perdidas */
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={buscaPerdidos}
                  onChange={(e) => setBuscaPerdidos(e.target.value)}
                  placeholder="Buscar cliente, motivo ou cidade..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Total de oportunidades perdidas:{' '}
                <strong className="text-gray-900">{clientesPerdidosFiltrados.length}</strong>
              </div>
            </div>

            {clientesPerdidosFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <ArchiveX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">
                  Nenhuma oportunidade perdida encontrada
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {buscaPerdidos
                    ? 'Nenhum resultado corresponde à busca informada.'
                    : 'Nenhum cliente foi marcado como perdido no momento.'}
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-4">Cliente</th>
                        <th className="py-2.5 px-4">Motivo da Perda</th>
                        <th className="py-2.5 px-4">Observações</th>
                        <th className="py-2.5 px-4">Valor Estimado</th>
                        <th className="py-2.5 px-4">Data</th>
                        <th className="py-2.5 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {clientesPerdidosFiltrados.map((cliente) => {
                        const rotulosMotivo: Record<string, { label: string; cor: string }> = {
                          preco: {
                            label: 'Preço',
                            cor: 'bg-amber-100 text-amber-800 border-amber-200',
                          },
                          concorrente: {
                            label: 'Concorrente',
                            cor: 'bg-blue-100 text-blue-800 border-blue-200',
                          },
                          desistiu: {
                            label: 'Desistiu',
                            cor: 'bg-purple-100 text-purple-800 border-purple-200',
                          },
                          nao_respondeu: {
                            label: 'Não respondeu',
                            cor: 'bg-rose-100 text-rose-800 border-rose-200',
                          },
                          outro: {
                            label: 'Outro',
                            cor: 'bg-gray-100 text-gray-800 border-gray-200',
                          },
                        }
                        const motivoInfo = cliente.motivo_perda
                          ? rotulosMotivo[cliente.motivo_perda] || {
                              label: cliente.motivo_perda,
                              cor: 'bg-gray-100 text-gray-800 border-gray-200',
                            }
                          : {
                              label: 'Não informado',
                              cor: 'bg-gray-100 text-gray-500 border-gray-200',
                            }

                        const obsExibida = cliente.observacoes_perda || cliente.observacoes || '—'

                        const dataExibida =
                          cliente.updated || cliente.created
                            ? new Date(cliente.updated || cliente.created).toLocaleDateString(
                                'pt-BR',
                              )
                            : '—'

                        return (
                          <tr key={cliente.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-3 px-4 font-semibold text-gray-900">
                              <button
                                type="button"
                                onClick={() => openFichaCliente(cliente.id)}
                                className="hover:text-emerald-700 hover:underline text-left"
                              >
                                {cliente.nome}
                              </button>
                              {cliente.cidade && (
                                <span className="block text-[11px] font-normal text-gray-500">
                                  {cliente.cidade} {cliente.estado ? `- ${cliente.estado}` : ''}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${motivoInfo.cor}`}
                              >
                                {motivoInfo.label}
                              </span>
                            </td>
                            <td
                              className="py-3 px-4 max-w-xs text-gray-600 truncate"
                              title={obsExibida}
                            >
                              {obsExibida}
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-800 whitespace-nowrap">
                              {cliente.valor_final
                                ? formatCurrency(cliente.valor_final)
                                : cliente.valor_estimado
                                  ? formatCurrency(cliente.valor_estimado)
                                  : 'R$ 0,00'}
                            </td>
                            <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                              {dataExibida}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={reativandoId === cliente.id}
                                onClick={() => handleReativarCliente(cliente.id)}
                                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 font-semibold"
                                title="Devolver oportunidade ao funil na etapa Contato Futuro"
                              >
                                {reativandoId === cliente.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                                <span>Reativar</span>
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Novo Lead */}
      <NovoLeadModal isOpen={isNovoLeadOpen} onClose={() => setIsNovoLeadOpen(false)} />

      {/* Modal de Confirmação de Transferência de Fechados para Pós-Vendas */}
      <Dialog
        open={isModalTransferenciaOpen}
        onOpenChange={(open) => {
          if (!isTransferindo) setIsModalTransferenciaOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#16A34A]" />
              <span>Enviar Fechados para Pós-Vendas</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 pt-2 leading-relaxed">
              Deseja mover todos os negócios fechados para a aba de Clientes Pós-Vendas? Eles sairão
              do funil comercial.
            </DialogDescription>
          </DialogHeader>

          {fechados.length > 0 && (
            <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200/80 text-xs space-y-2 mt-1">
              <div className="flex items-center justify-between text-emerald-900 font-semibold">
                <span>Total de negócios a transferir:</span>
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                  {fechados.length} clientes
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-gray-700">
                {fechados.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between text-[11px] bg-white/80 p-1.5 rounded border border-emerald-100"
                  >
                    <span className="font-medium text-gray-900 truncate max-w-[220px]">
                      {c.nome}
                    </span>
                    <span className="text-gray-600 font-semibold shrink-0">
                      {formatCurrency(c.valor_estimado || 0)}
                    </span>
                  </div>
                ))}
              </div>
              {totalFechado > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 font-semibold text-emerald-900 text-xs">
                  <span>Valor total fechado:</span>
                  <span>{formatCurrency(totalFechado)}</span>
                </div>
              )}
              <p className="text-[11px] text-emerald-800 italic pt-1">
                * Cada cliente manterá seus dados (nome, telefone, email, valor do projeto, data de
                fechamento) e receberá o badge &quot;Vindo do funil&quot; nos primeiros 7 dias na
                aba de Pós-Vendas.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isTransferindo}
              onClick={() => setIsModalTransferenciaOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isTransferindo || fechados.length === 0}
              onClick={handleConfirmarTransferenciaPosVendas}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white"
            >
              {isTransferindo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
