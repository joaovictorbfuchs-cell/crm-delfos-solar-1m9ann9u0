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
  User,
  DollarSign,
  ChevronRight,
  Filter,
  AlertCircle,
  Users,
  Wrench,
  Trash2,
  Loader2,
  Contact,
  MoreVertical,
  CheckCircle,
  XCircle,
  RotateCcw,
  Zap,
  Battery,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Cliente, ClienteStatus, SistemaUsuario } from '@/types/crm'
import { formatCurrency } from '@/lib/formatters'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

export type TipoNegocioOpcao =
  | 'energia solar'
  | 'baterias'
  | 'Planos de O&M'
  | 'carregadores veiculares'

const TIPOS_NEGOCIO_OPCOES: { id: TipoNegocioOpcao; label: string }[] = [
  { id: 'energia solar', label: 'Energia Solar' },
  { id: 'baterias', label: 'Baterias' },
  { id: 'Planos de O&M', label: 'O&M (Operação e Manutenção)' },
  { id: 'carregadores veiculares', label: 'Carregadores Veículos Elétricos' },
]

const MOTIVOS_PERDA_OPCOES: { id: string; label: string; cor: string }[] = [
  { id: 'preco', label: 'Preço', cor: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'concorrente', label: 'Concorrente', cor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'desistiu', label: 'Desistiu', cor: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'nao_respondeu', label: 'Não respondeu', cor: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'outro', label: 'Outro', cor: 'bg-gray-100 text-gray-800 border-gray-200' },
]

/**
 * Normaliza o tipo de negócio do cliente para uma das 3 categorias do usuário:
 * 'energia solar', 'baterias' ou 'Planos de O&M'
 */
export function normalizarTipoNegocio(cliente: Cliente): TipoNegocioOpcao {
  const raw =
    `${cliente.tipo_venda || ''} ${cliente.tipo_negocio || ''} ${cliente.produto || ''}`.toLowerCase()
  if (
    raw.includes('carregador') ||
    raw.includes('veículo') ||
    raw.includes('veiculo') ||
    raw.includes('wallbox') ||
    raw.includes('ev')
  ) {
    return 'carregadores veiculares'
  }
  if (
    raw.includes('bateria') ||
    raw.includes('storage') ||
    raw.includes('híbrido') ||
    raw.includes('hibrido')
  ) {
    return 'baterias'
  }
  if (
    raw.includes('o&m') ||
    raw.includes('manuten') ||
    raw.includes('plano') ||
    raw.includes('opera') ||
    cliente.contratou_om ||
    cliente.proposta_om_id
  ) {
    return 'Planos de O&M'
  }
  return 'energia solar'
}

export const ComercialListView: React.FC<ComercialListViewProps> = ({
  clientes: clientesProp,
  onBackToKanban,
}) => {
  const navigate = useNavigate()
  const {
    openFichaCliente,
    usuarios,
    bulkUpdateEtapa,
    bulkUpdateResponsavel,
    bulkMarcarFechado,
    bulkArquivar,
    bulkRemoveClientes,
    moverClienteParaOutrosContatos,
    bulkMoverClientesParaOutrosContatos,
    updateClienteStatus,
    updateCliente,
  } = useClientes()

  const [busca, setBusca] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos')
  const [filtroMotivoPerda, setFiltroMotivoPerda] = useState<string>('todos')
  const [filtroTipoNegocio, setFiltroTipoNegocio] = useState<string>('todos')

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Mover para outros contatos (individual e em lote)
  const [clienteParaMover, setClienteParaMover] = useState<Cliente | null>(null)
  const [modalConfirmarMoverContatosLoteOpen, setModalConfirmarMoverContatosLoteOpen] =
    useState(false)
  const [isMovingContatos, setIsMovingContatos] = useState(false)

  // Modais de confirmação / seleção em lote
  const [modalMoverEtapaOpen, setModalMoverEtapaOpen] = useState(false)
  const [etapaDestino, setEtapaDestino] = useState<ClienteStatus>('Negociação')

  const [modalResponsavelOpen, setModalResponsavelOpen] = useState(false)
  const [responsavelDestinoId, setResponsavelDestinoId] = useState<string>('')

  const [modalConfirmarArquivarOpen, setModalConfirmarArquivarOpen] = useState(false)
  const [modalConfirmarExcluirLoteOpen, setModalConfirmarExcluirLoteOpen] = useState(false)

  // Excluir registros já arquivados e negócios já transferidos para Pós-Vendas
  const clientesAtivos = useMemo(() => {
    return clientesProp.filter((c) => !c.arquivado && !c.transferido_pos_vendas)
  }, [clientesProp])

  // Filtros ativos contagem e flag
  const hasActiveFilters =
    filtroEtapa !== 'todos' ||
    filtroResponsavel !== 'todos' ||
    filtroMotivoPerda !== 'todos' ||
    filtroTipoNegocio !== 'todos' ||
    busca.trim() !== ''

  const handleLimparFiltros = () => {
    setBusca('')
    setFiltroEtapa('todos')
    setFiltroResponsavel('todos')
    setFiltroMotivoPerda('todos')
    setFiltroTipoNegocio('todos')
  }

  // Filtragem combinada (E): Busca textual + Etapa + Responsável + Motivo da Perda + Tipo de Negócio
  const filteredClientes = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return clientesAtivos.filter((c) => {
      // 1. Busca textual (nome, cidade, responsável)
      if (termo) {
        const matchNome = (c.nome || '').toLowerCase().includes(termo)
        const matchCidade = (c.cidade || '').toLowerCase().includes(termo)
        const matchResp = (c.responsavel_nome || '').toLowerCase().includes(termo)
        if (!matchNome && !matchCidade && !matchResp) return false
      }

      // 2. Filtro Etapa
      if (filtroEtapa !== 'todos') {
        if (c.status !== filtroEtapa) return false
      }

      // 3. Filtro Responsável
      if (filtroResponsavel !== 'todos') {
        if (filtroResponsavel === 'sem_responsavel') {
          if (c.responsavel_id || c.responsavel_nome) return false
        } else {
          const matchId = c.responsavel_id === filtroResponsavel
          const userObj = usuarios.find((u) => u.id === filtroResponsavel)
          const matchNome =
            userObj &&
            c.responsavel_nome &&
            c.responsavel_nome.toLowerCase() === userObj.name.toLowerCase()
          if (!matchId && !matchNome) return false
        }
      }

      // 4. Filtro Motivo da Perda
      if (filtroMotivoPerda !== 'todos') {
        if (c.motivo_perda !== filtroMotivoPerda) return false
      }

      // 5. Filtro Tipo de Negócio
      if (filtroTipoNegocio !== 'todos') {
        const tipoNorm = normalizarTipoNegocio(c)
        if (tipoNorm !== filtroTipoNegocio) return false
      }

      return true
    })
  }, [
    clientesAtivos,
    busca,
    filtroEtapa,
    filtroResponsavel,
    filtroMotivoPerda,
    filtroTipoNegocio,
    usuarios,
  ])

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

  // 5. Mover Selecionados para Outros Contatos em Lote
  const handleConfirmMoverContatosLote = async () => {
    if (selectedIds.length === 0) return
    const clientesSelecionados = clientesAtivos.filter((c) => selectedIds.includes(c.id))
    if (clientesSelecionados.length === 0) return

    const total = clientesSelecionados.length
    setIsMovingContatos(true)
    setIsProcessing(true)

    try {
      const { sucesso, falhas } = await bulkMoverClientesParaOutrosContatos(clientesSelecionados)
      if (falhas === 0) {
        toast({
          title: 'Contatos movidos com sucesso',
          description: `${sucesso} cliente${sucesso > 1 ? 's' : ''} movido${sucesso > 1 ? 's' : ''} para Outros Contatos com sucesso.`,
        })
      } else if (sucesso > 0) {
        toast({
          title: 'Operação parcialmente concluída',
          description: `${sucesso} cliente(s) movido(s), porém ${falhas} falharam. Os dados foram recarregados.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Erro ao mover contatos',
          description: `Não foi possível mover os ${falhas} cliente(s) selecionado(s).`,
          variant: 'destructive',
        })
      }
      setSelectedIds([])
      setModalConfirmarMoverContatosLoteOpen(false)
    } catch (err) {
      console.error('Erro ao mover clientes em lote para outros contatos:', err)
      toast({
        title: 'Erro ao mover clientes',
        description:
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro ao mover os clientes selecionados para Outros Contatos.',
        variant: 'destructive',
      })
    } finally {
      setIsMovingContatos(false)
      setIsProcessing(false)
    }
  }

  // 7. Ir para Aba de Clientes
  const handleIrParaClientes = () => {
    navigate('/clientes')
  }

  // 8. Excluir Selecionados em Lote
  const handleConfirmExcluirLote = async () => {
    if (selectedIds.length === 0) return
    const count = selectedIds.length
    setIsProcessing(true)
    try {
      await bulkRemoveClientes(selectedIds)
      toast({
        title: 'Clientes excluídos',
        description: `${count} cliente${count > 1 ? 's' : ''} excluído${count > 1 ? 's' : ''} permanentemente com sucesso.`,
      })
      setSelectedIds([])
      setModalConfirmarExcluirLoteOpen(false)
    } catch (err) {
      console.error('Erro ao excluir clientes em lote:', err)
      toast({
        title: 'Erro ao excluir clientes',
        description: 'Ocorreu um erro ao excluir os clientes selecionados.',
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
      <div className="bg-white rounded-xl border border-gray-200/90 p-3.5 shadow-xs space-y-3">
        {/* Linha 1: Campo de Busca Textual + Contador + Voltar ao Kanban */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Busca rápida por nome do cliente, cidade ou responsável..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:bg-white focus:border-transparent transition-all placeholder:text-gray-400"
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
            <span className="font-medium text-[11px] sm:text-xs">
              Exibindo{' '}
              <strong className="text-gray-900 font-bold">{filteredClientes.length}</strong> de{' '}
              <strong className="text-gray-900 font-bold">{clientesAtivos.length}</strong> negócios
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToKanban}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-medium text-xs h-8"
            >
              ← Voltar para Kanban
            </Button>
          </div>
        </div>

        {/* Linha 2: 4 Filtros Combináveis (Etapa, Responsável, Motivo da Perda, Tipo de Negócio) + Limpar */}
        <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end">
          {/* 1. Filtro Etapa */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Etapa do Funil
            </label>
            <select
              value={filtroEtapa}
              onChange={(e) => setFiltroEtapa(e.target.value)}
              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors ${
                filtroEtapa !== 'todos'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200 font-medium'
              }`}
            >
              <option value="todos">Todas as Etapas ({clientesAtivos.length})</option>
              {ETAPAS_FUNIL.map((etapa) => {
                const count = clientesAtivos.filter((c) => c.status === etapa.id).length
                return (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.label} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          {/* 2. Filtro Responsável */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Responsável
            </label>
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors ${
                filtroResponsavel !== 'todos'
                  ? 'bg-blue-50 text-blue-900 border-blue-400 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200 font-medium'
              }`}
            >
              <option value="todos">Todos os Responsáveis</option>
              <option value="sem_responsavel">Não atribuído</option>
              {usuarios.map((u) => {
                const count = clientesAtivos.filter(
                  (c) =>
                    c.responsavel_id === u.id ||
                    (c.responsavel_nome &&
                      c.responsavel_nome.toLowerCase() === u.name.toLowerCase()),
                ).length
                return (
                  <option key={u.id} value={u.id}>
                    {u.name} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          {/* 3. Filtro Motivo da Perda */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Motivo da Perda
            </label>
            <select
              value={filtroMotivoPerda}
              onChange={(e) => setFiltroMotivoPerda(e.target.value)}
              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors ${
                filtroMotivoPerda !== 'todos'
                  ? 'bg-rose-50 text-rose-900 border-rose-400 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200 font-medium'
              }`}
            >
              <option value="todos">Todos os Motivos</option>
              {MOTIVOS_PERDA_OPCOES.map((m) => {
                const count = clientesAtivos.filter((c) => c.motivo_perda === m.id).length
                return (
                  <option key={m.id} value={m.id}>
                    {m.label} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          {/* 4. Filtro Tipo de Negócio */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Tipo de Negócio
            </label>
            <select
              value={filtroTipoNegocio}
              onChange={(e) => setFiltroTipoNegocio(e.target.value)}
              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors ${
                filtroTipoNegocio !== 'todos'
                  ? 'bg-purple-50 text-purple-900 border-purple-400 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200 font-medium'
              }`}
            >
              <option value="todos">Todos os Tipos</option>
              {TIPOS_NEGOCIO_OPCOES.map((t) => {
                const count = clientesAtivos.filter((c) => normalizarTipoNegocio(c) === t.id).length
                return (
                  <option key={t.id} value={t.id}>
                    {t.label} ({count})
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Linha Auxiliar quando houver filtros aplicados */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filtros ativos na visualização</span>
            </div>
            <button
              type="button"
              onClick={handleLimparFiltros}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar filtros</span>
            </button>
          </div>
        )}
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
                <th className="py-3 px-3">Tipo de Negócio</th>
                <th className="py-3 px-3 text-right">Valor Estimado</th>
                <th className="py-3 px-3 text-center">Etapa Atual</th>
                <th className="py-3 px-3">Responsável</th>
                <th className="py-3 px-3">Motivo da Perda</th>
                <th className="py-3 px-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
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
                  const responsavelTexto = cliente.responsavel_nome || 'Não atribuído'
                  const tipoNegocioNorm = normalizarTipoNegocio(cliente)

                  // Detalhes de visualização do Tipo de Negócio
                  const tipoNegocioBadge =
                    tipoNegocioNorm === 'baterias' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                        <Battery className="w-3 h-3 text-sky-600" />
                        <span>Baterias</span>
                      </span>
                    ) : tipoNegocioNorm === 'Planos de O&M' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                        <Wrench className="w-3 h-3 text-teal-600" />
                        <span>Planos de O&M</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span>Energia Solar</span>
                      </span>
                    )

                  // Motivo da Perda (exibido com badge legível quando houver motivo ou quando for perdido)
                  const motivoObj = cliente.motivo_perda
                    ? MOTIVOS_PERDA_OPCOES.find((m) => m.id === cliente.motivo_perda)
                    : null

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

                      {/* Tipo de Negócio */}
                      <td className="py-3 px-3 whitespace-nowrap">{tipoNegocioBadge}</td>

                      {/* Valor Estimado */}
                      <td className="py-3 px-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {cliente.valor_estimado
                          ? formatCurrency(cliente.valor_estimado)
                          : 'R$ 0,00'}
                      </td>

                      {/* Etapa Atual */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <StatusBadge status={cliente.status} />
                      </td>

                      {/* Responsável */}
                      <td className="py-3 px-3 text-xs text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-300">
                            {responsavelTexto.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`truncate max-w-[140px] ${
                              cliente.responsavel_nome ? 'font-medium' : 'text-gray-400 italic'
                            }`}
                            title={responsavelTexto}
                          >
                            {responsavelTexto}
                          </span>
                        </div>
                      </td>

                      {/* Motivo da Perda */}
                      <td className="py-3 px-3 text-xs whitespace-nowrap">
                        {cliente.motivo_perda ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              motivoObj
                                ? motivoObj.cor
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                            title={cliente.observacoes_perda || undefined}
                          >
                            {motivoObj ? motivoObj.label : cliente.motivo_perda}
                          </span>
                        ) : cliente.status === 'Perdido' ? (
                          <span className="text-gray-400 text-xs italic">Não informado</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Ações da linha (Menu 3 pontinhos) e Seta */}
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                title="Mais opções do cliente"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Opções</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-xs font-semibold text-gray-500">
                                Ações do Cliente
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => openFichaCliente(cliente.id)}
                                className="cursor-pointer gap-2 text-xs"
                              >
                                <User className="w-3.5 h-3.5 text-gray-500" />
                                <span>Ver detalhes completos</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await updateClienteStatus(cliente.id, 'Fechado')
                                    toast({
                                      title: 'Lead fechado!',
                                      description: `"${cliente.nome}" foi marcado como Fechado.`,
                                    })
                                  } catch (err) {
                                    console.error('Erro ao marcar fechado:', err)
                                    toast({
                                      title: 'Erro ao atualizar',
                                      description: 'Não foi possível alterar a etapa.',
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                                className="cursor-pointer gap-2 text-emerald-700 focus:text-emerald-800 focus:bg-emerald-50 text-xs font-medium"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Marcar como fechado</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await updateClienteStatus(cliente.id, 'Perdido')
                                    toast({
                                      title: 'Lead perdido',
                                      description: `"${cliente.nome}" foi marcado como Perdido.`,
                                    })
                                  } catch (err) {
                                    console.error('Erro ao marcar perdido:', err)
                                    toast({
                                      title: 'Erro ao atualizar',
                                      description: 'Não foi possível alterar a etapa.',
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                                className="cursor-pointer gap-2 text-rose-700 focus:text-rose-800 focus:bg-rose-50 text-xs font-medium"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Marcar como perdido</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => setClienteParaMover(cliente)}
                                className="cursor-pointer gap-2 text-blue-600 focus:text-blue-700 focus:bg-blue-50 text-xs font-medium"
                              >
                                <Contact className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Mover para contatos</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={async () => {
                                  const confirmou = window.confirm(
                                    `Deseja arquivar o cliente "${cliente.nome}"? Ele sairá da visualização do funil comercial.`,
                                  )
                                  if (!confirmou) return
                                  try {
                                    await updateCliente(cliente.id, { arquivado: true })
                                    toast({
                                      title: 'Cliente arquivado',
                                      description: `"${cliente.nome}" foi arquivado com sucesso.`,
                                    })
                                  } catch (err) {
                                    console.error('Erro ao arquivar:', err)
                                    toast({
                                      title: 'Erro ao arquivar',
                                      description: 'Não foi possível arquivar o cliente.',
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                                className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 text-xs"
                              >
                                <Archive className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Arquivar lead</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <button
                            type="button"
                            onClick={() => openFichaCliente(cliente.id)}
                            className="text-gray-300 hover:text-emerald-600 transition-colors p-1"
                            title="Abrir ficha"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
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

            {/* 3. Mover para Contatos em Lote */}
            <Button
              type="button"
              size="sm"
              onClick={() => setModalConfirmarMoverContatosLoteOpen(true)}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs gap-1.5 h-8 px-2.5 font-medium shadow-xs"
              title="Mover os clientes selecionados para a lista de Outros Contatos"
            >
              <Contact className="w-3.5 h-3.5 text-blue-200" />
              <span>Mover para contatos</span>
            </Button>

            {/* 4. Marcar como Fechado */}
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

            {/* 5. Ver na Aba Clientes */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleIrParaClientes}
              className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 text-xs gap-1.5 h-8 px-2.5"
              title="Ir para a aba Clientes (/clientes) para gerenciar ou mesclar cadastros"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Aba Clientes</span>
            </Button>

            {/* 4. Arquivar */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setModalConfirmarArquivarOpen(true)}
              className="bg-gray-800 hover:bg-amber-900/40 text-amber-300 border-amber-700/60 hover:border-amber-600 text-xs gap-1.5 h-8 px-2.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Arquivar</span>
            </Button>

            {/* 5. Excluir Selecionados (Destrutivo) */}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setModalConfirmarExcluirLoteOpen(true)}
              disabled={isProcessing}
              className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs gap-1.5 h-8 px-2.5 font-semibold shadow-xs"
              title="Excluir permanentemente todos os clientes selecionados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir ({selectedIds.length})</span>
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

      {/* Modal 5: Confirmar Exclusão em Lote */}
      <Dialog
        open={modalConfirmarExcluirLoteOpen}
        onOpenChange={(open) => {
          if (!isProcessing) setModalConfirmarExcluirLoteOpen(open)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Excluir permanentemente {selectedIds.length} cliente(s)?
            </DialogTitle>
            <DialogDescription>
              Você está prestes a excluir definitivamente{' '}
              <strong className="text-gray-900 font-semibold">
                {selectedIds.length} cliente{selectedIds.length > 1 ? 's' : ''}
              </strong>{' '}
              do funil de vendas. Esta ação é irreversível e removerá também todos os dados e
              registros vinculados (orçamentos, propostas, atividades e documentos).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2.5 text-xs text-rose-800 bg-rose-50 p-3 rounded-lg border border-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Atenção: Ação permanente (sem lixeira)</p>
              <p className="mt-0.5 text-rose-700">
                Os registros serão apagados definitivamente do sistema. Se você deseja apenas
                retirar os leads do funil sem perder o histórico, utilize a opção
                &quot;Arquivar&quot;.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalConfirmarExcluirLoteOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmExcluirLote}
              disabled={isProcessing}
              className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo clientes...
                </>
              ) : (
                `Sim, Excluir (${selectedIds.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação para Mover Cliente Individual para Outros Contatos */}
      <AlertDialog
        open={Boolean(clienteParaMover)}
        onOpenChange={(open) => {
          if (!open && !isMovingContatos) {
            setClienteParaMover(null)
          }
        }}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                <Contact className="h-5 w-5" />
              </div>
              <AlertDialogTitle>Mover para Outros Contatos</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-600">
              Deseja mover o cliente{' '}
              <strong className="text-slate-900 font-semibold">"{clienteParaMover?.nome}"</strong>{' '}
              para Outros Contatos? Ele será removido do funil de vendas e seus dados serão
              preservados na lista de Outros Contatos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel
              disabled={isMovingContatos}
              onClick={() => setClienteParaMover(null)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMovingContatos}
              onClick={async (e) => {
                e.preventDefault()
                if (!clienteParaMover) return
                const nomeCliente = clienteParaMover.nome
                try {
                  setIsMovingContatos(true)
                  await moverClienteParaOutrosContatos(clienteParaMover)
                  toast({
                    title: 'Contato movido com sucesso',
                    description: `"${nomeCliente}" foi transferido para Outros Contatos e removido do funil.`,
                  })
                  setClienteParaMover(null)
                } catch (err) {
                  console.error('Erro ao mover cliente para outros contatos:', err)
                  toast({
                    title: 'Erro ao mover contato',
                    description:
                      err instanceof Error
                        ? err.message
                        : 'Não foi possível mover o cliente para Outros Contatos.',
                    variant: 'destructive',
                  })
                } finally {
                  setIsMovingContatos(false)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isMovingContatos ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Movendo...</span>
                </>
              ) : (
                <>
                  <Contact className="h-4 w-4" />
                  <span>Sim, mover para contatos</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de Confirmação para Mover Clientes em LOTE para Outros Contatos */}
      <AlertDialog
        open={modalConfirmarMoverContatosLoteOpen}
        onOpenChange={(open) => {
          if (!open && !isMovingContatos) {
            setModalConfirmarMoverContatosLoteOpen(false)
          }
        }}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                <Contact className="h-5 w-5" />
              </div>
              <AlertDialogTitle>
                Mover {selectedIds.length} cliente(s) para Outros Contatos?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-600">
              Você está prestes a mover{' '}
              <strong className="text-slate-900 font-semibold">
                {selectedIds.length} cliente{selectedIds.length > 1 ? 's' : ''}
              </strong>{' '}
              selecionado{selectedIds.length > 1 ? 's' : ''} para a lista de Outros Contatos. Eles
              serão removidos do funil comercial ativo e todos os seus dados e históricos serão
              preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2.5 text-xs text-blue-900 bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-start gap-2">
            <Contact className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Preservação de Dados</p>
              <p className="mt-0.5 text-blue-800">
                Cada contato manterá nome, telefone, etapa anterior no funil, cidade, documentos e
                histórico de notas.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel
              disabled={isMovingContatos}
              onClick={() => setModalConfirmarMoverContatosLoteOpen(false)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMovingContatos}
              onClick={async (e) => {
                e.preventDefault()
                await handleConfirmMoverContatosLote()
              }}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white gap-2 font-medium"
            >
              {isMovingContatos ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Movendo {selectedIds.length} clientes...</span>
                </>
              ) : (
                <>
                  <Contact className="h-4 w-4" />
                  <span>Sim, mover ({selectedIds.length}) para contatos</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
