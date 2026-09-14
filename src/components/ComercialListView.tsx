import React, { useState, useMemo } from 'react'
import {
  Search,
  CheckSquare,
  Square,
  ArrowRightCircle,
  UserCheck,
  CheckCircle2,
  Archive,
  X,
  Calendar,
  User,
  DollarSign,
  Layers,
  ChevronRight,
  Filter,
  AlertCircle,
} from 'lucide-react'
import type { Cliente, ClienteStatus, SistemaUsuario } from '@/types/crm'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/StatusBadge'
import { useClientes } from '@/contexts/ClientesContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

interface ComercialListViewProps {
  clientes: Cliente[]
  onBackToKanban: () => void
}

const ETAPAS_FUNIL: { id: ClienteStatus; label: string }[] = [
  { id: 'Novo Lead', label: '1 - Novo Lead' },
  { id: 'Levantamento', label: '2 - Levantamento' },
  { id: 'Orçamento', label: '3 - Orçamento' },
  { id: 'Negociação', label: '4 - Negociação' },
  { id: 'Fechado', label: '5 - Fechado' },
  { id: 'Contato Futuro', label: '6 - Contato Futuro' },
  { id: 'Perdido', label: 'Perdido' },
]

export const ComercialListView: React.FC<ComercialListViewProps> = ({
  clientes: clientesProp,
  onBackToKanban,
}) => {
  const {
    openFichaCliente,
    usuarios,
    bulkUpdateEtapa,
    bulkUpdateResponsavel,
    bulkMarcarFechado,
    bulkArquivar,
  } = useClientes()

  const [busca, setBusca] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Modais de confirmação / seleção em lote
  const [modalMoverEtapaOpen, setModalMoverEtapaOpen] = useState(false)
  const [etapaDestino, setEtapaDestino] = useState<ClienteStatus>('Negociação')

  const [modalResponsavelOpen, setModalResponsavelOpen] = useState(false)
  const [responsavelDestinoId, setResponsavelDestinoId] = useState<string>('')

  const [modalConfirmarArquivarOpen, setModalConfirmarArquivarOpen] = useState(false)

  // Excluir registros já arquivados e negócios já transferidos para Pós-Vendas
  const clientesAtivos = useMemo(() => {
    return clientesProp.filter((c) => !c.arquivado && !c.transferido_pos_vendas)
  }, [clientesProp])

  // Filtragem rápida pelo nome do cliente (e também por cidade ou responsável se pesquisado)
  const filteredClientes = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return clientesAtivos
    return clientesAtivos.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.cidade && c.cidade.toLowerCase().includes(termo)) ||
        (c.responsavel_nome && c.responsavel_nome.toLowerCase().includes(termo)),
    )
  }, [clientesAtivos, busca])

  // Seleção rápida
  const allFilteredSelected =
    filteredClientes.length > 0 && filteredClientes.every((c) => selectedIds.includes(c.id))

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Remove da seleção apenas os que estão visíveis no filtro atual
      const currentIds = new Set(filteredClientes.map((c) => c.id))
      setSelectedIds((prev) => prev.filter((id) => !currentIds.has(id)))
    } else {
      // Adiciona todos os visíveis
      const currentIds = filteredClientes.map((c) => c.id)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])))
    }
  }

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  // Ações em Lote:
  // 1. Mover Etapa
  const handleConfirmMoverEtapa = async () => {
    if (selectedIds.length === 0) return
    setIsProcessing(true)
    try {
      await bulkUpdateEtapa(selectedIds, etapaDestino)
      toast({
        title: 'Etapa atualizada!',
        description: `${selectedIds.length} negócio(s) movido(s) para "${etapaDestino}".`,
      })
      setSelectedIds([])
      setModalMoverEtapaOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao mover negócios',
        description: 'Ocorreu um erro ao atualizar os registros.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 2. Atribuir Responsável
  const handleConfirmAtribuirResponsavel = async () => {
    if (selectedIds.length === 0 || !responsavelDestinoId) return
    const user = usuarios.find((u) => u.id === responsavelDestinoId)
    const nome = user?.name || 'Responsável'

    setIsProcessing(true)
    try {
      await bulkUpdateResponsavel(selectedIds, responsavelDestinoId, nome)
      toast({
        title: 'Responsável atribuído!',
        description: `${selectedIds.length} negócio(s) atribuído(s) a ${nome}.`,
      })
      setSelectedIds([])
      setModalResponsavelOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao atribuir responsável',
        description: 'Ocorreu um erro ao atualizar os registros.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 3. Marcar como Fechado
  const handleMarcarComoFechado = async () => {
    if (selectedIds.length === 0) return
    setIsProcessing(true)
    try {
      await bulkMarcarFechado(selectedIds)
      toast({
        title: 'Negócios Fechados!',
        description: `${selectedIds.length} negócio(s) marcado(s) como Fechado com sucesso!`,
      })
      setSelectedIds([])
    } catch (err) {
      toast({
        title: 'Erro ao marcar fechado',
        description: 'Ocorreu um erro ao atualizar os registros.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 4. Arquivar
  const handleConfirmArquivar = async () => {
    if (selectedIds.length === 0) return
    setIsProcessing(true)
    try {
      await bulkArquivar(selectedIds)
      toast({
        title: 'Negócios Arquivados',
        description: `${selectedIds.length} negócio(s) arquivado(s) do funil comercial ativo.`,
      })
      setSelectedIds([])
      setModalConfirmarArquivarOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao arquivar',
        description: 'Ocorreu um erro ao arquivar os registros.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Cálculos para resumo no topo da lista
  const valorTotalSelecionado = useMemo(() => {
    return clientesAtivos
      .filter((c) => selectedIds.includes(c.id))
      .reduce((sum, c) => sum + (c.valor_estimado || 0), 0)
  }, [clientesAtivos, selectedIds])

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca Rápida */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Busca rápida por nome do cliente ou cidade..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition-all placeholder:text-gray-400"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end text-xs text-gray-600">
          <span className="font-medium">
            Exibindo <strong className="text-gray-900">{filteredClientes.length}</strong> de{' '}
            {clientesAtivos.length} negócios
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToKanban}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-medium"
          >
            ← Voltar para Kanban
          </Button>
        </div>
      </div>

      {/* Tabela de Negócios */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-gray-500 hover:text-emerald-600 transition-colors inline-flex items-center justify-center"
                    title={allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#16A34A]" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Nome do Cliente</th>
                <th className="py-3 px-3 text-right">Valor Estimado</th>
                <th className="py-3 px-3 text-center">Etapa Atual</th>
                <th className="py-3 px-3">Previsão Fechamento</th>
                <th className="py-3 px-3">Responsável</th>
                <th className="py-3 px-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Filter className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium text-gray-600">Nenhum negócio encontrado</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {busca
                        ? 'Tente ajustar o termo da busca'
                        : 'Nenhum negócio cadastrado no funil'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => {
                  const isSelected = selectedIds.includes(cliente.id)
                  const previsaoTexto = cliente.data_previsao_fechamento
                    ? formatDate(cliente.data_previsao_fechamento)
                    : '—'
                  const responsavelTexto = cliente.responsavel_nome || 'Não atribuído'

                  return (
                    <tr
                      key={cliente.id}
                      onClick={() => openFichaCliente(cliente.id)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-gray-50/80'
                      }`}
                    >
                      {/* Checkbox de Seleção */}
                      <td
                        className="py-3 px-3.5 text-center"
                        onClick={(e) => handleToggleSelectOne(cliente.id, e)}
                      >
                        <button
                          type="button"
                          className="text-gray-400 hover:text-emerald-600 transition-colors inline-flex items-center justify-center p-0.5 rounded"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#16A34A]" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                          )}
                        </button>
                      </td>

                      {/* Nome do Cliente */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {cliente.nome}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          {cliente.cidade && <span>{cliente.cidade}</span>}
                          {cliente.potencia_kwp ? (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-medium">
                                {cliente.potencia_kwp} kWp
                              </span>
                            </>
                          ) : null}
                        </div>
                      </td>

                      {/* Valor Estimado */}
                      <td className="py-3 px-3 text-right font-semibold text-gray-800">
                        {cliente.valor_estimado
                          ? formatCurrency(cliente.valor_estimado)
                          : 'R$ 0,00'}
                      </td>

                      {/* Etapa Atual */}
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={cliente.status} />
                      </td>

                      {/* Data de Previsão de Fechamento */}
                      <td className="py-3 px-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{previsaoTexto}</span>
                        </div>
                      </td>

                      {/* Responsável */}
                      <td className="py-3 px-3 text-xs text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-300">
                            {responsavelTexto.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`truncate max-w-[150px] ${
                              cliente.responsavel_nome ? 'font-medium' : 'text-gray-400 italic'
                            }`}
                            title={responsavelTexto}
                          >
                            {responsavelTexto}
                          </span>
                        </div>
                      </td>

                      {/* Seta indicativa para abrir drawer */}
                      <td className="py-3 px-2 text-center text-gray-300 group-hover:text-emerald-600 transition-colors">
                        <ChevronRight className="w-4 h-4 mx-auto" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Menu Flutuante com Ações em Lote (aparece quando 1 ou mais itens são selecionados) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl bg-gray-900/95 text-white backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-2xl border border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {selectedIds.length}
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
            </div>

            {valorTotalSelecionado > 0 && (
              <span className="text-[11px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80 font-medium">
                {formatCurrency(valorTotalSelecionado)}
              </span>
            )}

            <button
              onClick={handleClearSelection}
              className="text-gray-400 hover:text-white p-1 rounded-md text-xs inline-flex items-center gap-1 sm:hidden ml-auto"
              title="Limpar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
            {/* 1. Mover Etapa */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setModalMoverEtapaOpen(true)}
              className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 text-xs gap-1.5 h-8 px-2.5"
            >
              <ArrowRightCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Mover etapa</span>
            </Button>

            {/* 2. Atribuir Responsável */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (usuarios.length > 0 && !responsavelDestinoId) {
                  setResponsavelDestinoId(usuarios[0].id)
                }
                setModalResponsavelOpen(true)
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 text-xs gap-1.5 h-8 px-2.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Atribuir responsável</span>
            </Button>

            {/* 3. Marcar como Fechado */}
            <Button
              type="button"
              size="sm"
              onClick={handleMarcarComoFechado}
              disabled={isProcessing}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs gap-1.5 h-8 px-2.5 font-medium shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marcar como fechado</span>
            </Button>

            {/* 4. Arquivar */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setModalConfirmarArquivarOpen(true)}
              className="bg-gray-800 hover:bg-rose-900/40 text-rose-300 border-rose-700/60 hover:border-rose-600 text-xs gap-1.5 h-8 px-2.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Arquivar</span>
            </Button>

            {/* Botão fechar seleção (desktop) */}
            <button
              onClick={handleClearSelection}
              className="text-gray-400 hover:text-white p-1 rounded-md text-xs hidden sm:inline-flex ml-1"
              title="Limpar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal 1: Mover Etapa */}
      <Dialog open={modalMoverEtapaOpen} onOpenChange={setModalMoverEtapaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <ArrowRightCircle className="w-5 h-5 text-emerald-600" />
              Mover etapa em lote
            </DialogTitle>
            <DialogDescription>
              Selecione a etapa para a qual deseja mover os {selectedIds.length} negócio(s)
              selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <label className="text-xs font-semibold text-gray-700 block">
              Nova Etapa do Funil:
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {ETAPAS_FUNIL.map((etapa) => (
                <button
                  key={etapa.id}
                  type="button"
                  onClick={() => setEtapaDestino(etapa.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    etapaDestino === etapa.id
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={etapa.id} />
                  </div>
                  {etapaDestino === etapa.id && (
                    <span className="text-xs font-bold text-emerald-700">Selecionada</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalMoverEtapaOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmMoverEtapa}
              disabled={isProcessing}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white"
            >
              {isProcessing ? 'Atualizando...' : 'Confirmar Mudança'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Atribuir Responsável */}
      <Dialog open={modalResponsavelOpen} onOpenChange={setModalResponsavelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Atribuir responsável em lote
            </DialogTitle>
            <DialogDescription>
              Selecione o membro da equipe para assumir os {selectedIds.length} negócio(s)
              selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <label className="text-xs font-semibold text-gray-700 block">
              Membro da equipe / Usuário:
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {usuarios.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setResponsavelDestinoId(user.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    responsavelDestinoId === user.id
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-300">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{user.name}</div>
                      <div className="text-[11px] text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  {responsavelDestinoId === user.id && (
                    <span className="text-xs font-bold text-emerald-700">Selecionado</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalResponsavelOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmAtribuirResponsavel}
              disabled={isProcessing || !responsavelDestinoId}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white"
            >
              {isProcessing ? 'Atribuindo...' : 'Salvar Atribuição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Confirmar Arquivamento */}
      <Dialog open={modalConfirmarArquivarOpen} onOpenChange={setModalConfirmarArquivarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Archive className="w-5 h-5 text-rose-600" />
              Arquivar {selectedIds.length} negócio(s)?
            </DialogTitle>
            <DialogDescription>
              Os negócios selecionados serão removidos do funil comercial ativo (tanto da
              visualização Kanban quanto da Lista). Os dados continuarão salvos no CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-gray-600 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Esta ação arquiva os leads marcados. Você poderá acessá-los futuramente na gestão
              geral de clientes.
            </span>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalConfirmarArquivarOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmArquivar}
              disabled={isProcessing}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isProcessing ? 'Arquivando...' : 'Sim, Arquivar Negócios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
