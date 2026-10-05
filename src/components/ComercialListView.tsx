import React, { useState, useMemo, useEffect } from 'react'
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
  CarFront,
  Pencil,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Cliente, ClienteStatus, Negocio, EtapaFunilSelect } from '@/types/crm'
import { formatCurrency } from '@/lib/formatters'
import { StatusBadge } from '@/components/StatusBadge'
import { useClientes } from '@/contexts/ClientesContext'
import { getValorExibicaoCard } from '@/lib/orcamentoValorCard'
import { PipedriveFilterPopover } from '@/components/PipedriveFilterPopover'
import { useAuth } from '@/contexts/AuthContext'
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
import { updateNegocio, deleteNegocio, bulkDeleteNegocios } from '@/services/negociosService'
import { removerPrefixoMensagemManual } from '@/lib/whatsappPrefixo'

const STATUS_TO_ETAPA_NEGOCIO: Record<string, EtapaFunilSelect> = {
  'Novo Lead': 'novo lead',
  Levantamento: 'qualificado',
  Orçamento: 'proposta enviada',
  Negociação: 'negociação',
  'Contato Futuro': 'contato_futuro',
  Fechado: 'contrato assinado',
}

const ETAPA_NEGOCIO_TO_STATUS: Record<string, ClienteStatus> = {
  'novo lead': 'Novo Lead',
  qualificado: 'Levantamento',
  'proposta enviada': 'Orçamento',
  negociação: 'Negociação',
  contato_futuro: 'Contato Futuro',
  'contrato assinado': 'Fechado',
}

export interface ComercialListItem {
  id: string
  negocioId?: string
  clienteId: string
  titulo: string
  nomeCliente: string
  cidade: string
  estado?: string
  potenciaKwp: number
  tipoNegocio: TipoNegocioOpcao
  valorEstimado: number
  status: ClienteStatus
  etapaFunil?: EtapaFunilSelect
  responsavelId?: string
  responsavelNome?: string
  motivoPerda?: string
  observacoesPerda?: string
  reabertura: boolean
  motivoReabertura?: string
  recorrenciaMensal: boolean
  rawNegocio?: Negocio
  rawCliente?: Cliente
}

interface ComercialListViewProps {
  clientes?: Cliente[]
  negocios?: Negocio[]
  onBackToKanban: () => void
  onNegociosChanged?: () => void
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
  negocios: negociosProp,
  onBackToKanban,
  onNegociosChanged,
}) => {
  const navigate = useNavigate()
  const {
    openFichaCliente,
    usuarios,
    orcamentosSolar,
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
  const { user, userProfile } = useAuth()

  const [busca, setBusca] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos')
  const [filtroMotivoPerda, setFiltroMotivoPerda] = useState<string>('todos')
  const [filtroTipoNegocio, setFiltroTipoNegocio] = useState<string>('todos')

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Mover para outros contatos (individual e em lote)
  const [itemParaMover, setItemParaMover] = useState<ComercialListItem | null>(null)
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

  // Edição do nome do negócio
  const [editingNegocio, setEditingNegocio] = useState<{ id: string; titulo: string } | null>(null)
  const [novoTituloInput, setNovoTituloInput] = useState('')
  const [isSavingTitulo, setIsSavingTitulo] = useState(false)

  useEffect(() => {
    if (editingNegocio) {
      setNovoTituloInput(editingNegocio.titulo)
    }
  }, [editingNegocio])

  const handleSalvarTituloNegocio = async () => {
    if (!editingNegocio) return
    const limpo = novoTituloInput.trim()
    if (!limpo) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome para o negócio.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingTitulo(true)
    try {
      await updateNegocio(editingNegocio.id, { titulo: limpo })
      toast({
        title: 'Nome atualizado',
        description: 'O nome do negócio foi atualizado com sucesso.',
      })
      setEditingNegocio(null)
      if (onNegociosChanged) onNegociosChanged()
    } catch (err) {
      console.error('Erro ao atualizar nome do negócio:', err)
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar o nome do negócio.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingTitulo(false)
    }
  }

  // Itens unificados de negócios (ou clientes no modo compatibilidade)
  const itensAtivos = useMemo<ComercialListItem[]>(() => {
    if (negociosProp !== undefined) {
      if (!Array.isArray(negociosProp) || negociosProp.length === 0) {
        return []
      }
      return negociosProp
        .filter((n) => {
          if (!n || !n.id) return false
          const cli = n.expand?.cliente_id
          if (cli && (cli.arquivado || cli.transferido_pos_vendas)) return false
          return true
        })
        .map((n) => {
          const cli = n.expand?.cliente_id
          const etapa = n.etapa_funil || 'novo lead'
          let statusKanban: ClienteStatus = ETAPA_NEGOCIO_TO_STATUS[etapa] || 'Novo Lead'
          if (n.status === 'ganho') statusKanban = 'Fechado'
          else if (n.status === 'perdido') statusKanban = 'Perdido'

          const nomeCliente = (cli?.nome || cli?.razao_social || 'Cliente vinculado').trim()
          const rawTitulo = (n.titulo || '').trim() || nomeCliente
          const tituloNegocio = removerPrefixoMensagemManual(rawTitulo) || nomeCliente

          // Normaliza tipo de negócio
          let tipoNegocio: TipoNegocioOpcao = 'energia solar'
          if (cli) {
            tipoNegocio = normalizarTipoNegocio(cli)
          } else if (n.tipo_venda || n.tipo_negocio) {
            const raw = `${n.tipo_venda || ''} ${n.tipo_negocio || ''}`.toLowerCase()
            if (raw.includes('carregador') || raw.includes('veículo') || raw.includes('ev')) {
              tipoNegocio = 'carregadores veiculares'
            } else if (raw.includes('bateria') || raw.includes('storage')) {
              tipoNegocio = 'baterias'
            } else if (raw.includes('o&m') || raw.includes('plano')) {
              tipoNegocio = 'Planos de O&M'
            }
          }

          const cardValor = getValorExibicaoCard(orcamentosSolar, {
            negocioId: n.id,
            clienteId: n.cliente_id || cli?.id,
            valorFinal: Number(n.valor_final || n.valor),
            valorEstimado: Number(n.valor_estimado) || (cli?.valor_estimado ?? 0),
            status: n.status,
          })
          const valorFinal = cardValor.valor

          const respUser = n.expand?.consultor_responsavel
          const responsavelId = n.consultor_responsavel || cli?.responsavel_id
          const responsavelNome = respUser?.name || cli?.responsavel_nome

          return {
            id: n.id,
            negocioId: n.id,
            clienteId: n.cliente_id || cli?.id || '',
            titulo: tituloNegocio,
            nomeCliente,
            cidade: cli?.cidade || '',
            estado: cli?.estado || '',
            potenciaKwp: Number(cli?.potencia_kwp) || 0,
            tipoNegocio,
            valorEstimado: valorFinal,
            status: statusKanban,
            etapaFunil: n.etapa_funil,
            responsavelId,
            responsavelNome,
            motivoPerda: n.motivo_perda || cli?.motivo_perda,
            observacoesPerda: cli?.observacoes_perda,
            reabertura: Boolean(n.reabertura || cli?.reabertura),
            motivoReabertura: n.motivo_reabertura || cli?.motivo_reabertura,
            recorrenciaMensal: Boolean(n.recorrencia_mensal || cli?.recorrencia_mensal),
            rawNegocio: n,
            rawCliente: cli,
          }
        })
    }

    return (Array.isArray(clientesProp) ? clientesProp : [])
      .filter((c) => !c.arquivado && !c.transferido_pos_vendas)
      .map((c) => ({
        id: c.id,
        clienteId: c.id,
        titulo: removerPrefixoMensagemManual((c.nome || '').trim()) || 'Cliente sem nome',
        nomeCliente: (c.nome || '').trim() || 'Cliente sem nome',
        cidade: c.cidade || '',
        estado: c.estado || '',
        potenciaKwp: Number(c.potencia_kwp) || 0,
        tipoNegocio: normalizarTipoNegocio(c),
        valorEstimado: getValorExibicaoCard(orcamentosSolar, {
          clienteId: c.id,
          valorEstimado: Number(c.valor_estimado) || 0,
          status: c.status,
        }).valor,
        status: (c.status || 'Novo Lead') as ClienteStatus,
        responsavelId: c.responsavel_id,
        responsavelNome: c.responsavel_nome,
        motivoPerda: c.motivo_perda,
        observacoesPerda: c.observacoes_perda,
        reabertura: Boolean(c.reabertura),
        motivoReabertura: c.motivo_reabertura,
        recorrenciaMensal: Boolean(c.recorrencia_mensal),
        rawCliente: c,
      }))
  }, [negociosProp, clientesProp])

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
  const filteredItens = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return itensAtivos.filter((item) => {
      // 1. Busca textual (titulo, cliente, cidade, responsável)
      if (termo) {
        const matchTitulo = (item.titulo || '').toLowerCase().includes(termo)
        const matchNome = (item.nomeCliente || '').toLowerCase().includes(termo)
        const matchCidade = (item.cidade || '').toLowerCase().includes(termo)
        const matchResp = (item.responsavelNome || '').toLowerCase().includes(termo)
        if (!matchTitulo && !matchNome && !matchCidade && !matchResp) return false
      }

      // 2. Filtro Etapa
      if (filtroEtapa !== 'todos') {
        if (item.status !== filtroEtapa) return false
      }

      // 3. Filtro Responsável
      if (filtroResponsavel !== 'todos') {
        if (filtroResponsavel === 'sem_responsavel') {
          if (item.responsavelId || item.responsavelNome) return false
        } else {
          const matchId = item.responsavelId === filtroResponsavel
          const userObj = usuarios.find((u) => u.id === filtroResponsavel)
          const matchNome =
            userObj &&
            item.responsavelNome &&
            item.responsavelNome.toLowerCase() === userObj.name.toLowerCase()
          if (!matchId && !matchNome) return false
        }
      }

      // 4. Filtro Motivo da Perda
      if (filtroMotivoPerda !== 'todos') {
        if (item.motivoPerda !== filtroMotivoPerda) return false
      }

      // 5. Filtro Tipo de Negócio
      if (filtroTipoNegocio !== 'todos') {
        if (item.tipoNegocio !== filtroTipoNegocio) return false
      }

      return true
    })
  }, [
    itensAtivos,
    busca,
    filtroEtapa,
    filtroResponsavel,
    filtroMotivoPerda,
    filtroTipoNegocio,
    usuarios,
  ])

  // Seleção rápida
  const allFilteredSelected =
    filteredItens.length > 0 && filteredItens.every((c) => selectedIds.includes(c.id))

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Remove da seleção apenas os que estão visíveis no filtro atual
      const currentIds = new Set(filteredItens.map((c) => c.id))
      setSelectedIds((prev) => prev.filter((id) => !currentIds.has(id)))
    } else {
      // Adiciona todos os visíveis
      const currentIds = filteredItens.map((c) => c.id)
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
      const itensSelecionados = itensAtivos.filter((i) => selectedIds.includes(i.id))
      const negociosSelecionados = itensSelecionados.filter((i) => i.negocioId)

      if (negociosSelecionados.length > 0) {
        const novaEtapa = STATUS_TO_ETAPA_NEGOCIO[etapaDestino] || 'novo lead'
        await Promise.all(
          negociosSelecionados.map((n) => updateNegocio(n.negocioId!, { etapa_funil: novaEtapa })),
        )
      }

      // Clientes legados (se houver sem negócio)
      const clientesSemNegocio = itensSelecionados.filter((i) => !i.negocioId).map((i) => i.id)
      if (clientesSemNegocio.length > 0) {
        await bulkUpdateEtapa(clientesSemNegocio, etapaDestino)
      }

      toast({
        title: 'Etapa atualizada!',
        description: `${selectedIds.length} negócio(s) movido(s) para "${etapaDestino}".`,
      })
      setSelectedIds([])
      setModalMoverEtapaOpen(false)
      if (onNegociosChanged) onNegociosChanged()
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
      const itensSelecionados = itensAtivos.filter((i) => selectedIds.includes(i.id))
      const negociosSelecionados = itensSelecionados.filter((i) => i.negocioId)

      if (negociosSelecionados.length > 0) {
        await Promise.all(
          negociosSelecionados.map((n) =>
            updateNegocio(n.negocioId!, { consultor_responsavel: responsavelDestinoId }),
          ),
        )
      }

      // Clientes legados
      const clientesSemNegocio = itensSelecionados.filter((i) => !i.negocioId).map((i) => i.id)
      if (clientesSemNegocio.length > 0) {
        await bulkUpdateResponsavel(clientesSemNegocio, responsavelDestinoId, nome)
      }

      toast({
        title: 'Responsável atribuído!',
        description: `${selectedIds.length} negócio(s) atribuído(s) a ${nome}.`,
      })
      setSelectedIds([])
      setModalResponsavelOpen(false)
      if (onNegociosChanged) onNegociosChanged()
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
      const itensSelecionados = itensAtivos.filter((i) => selectedIds.includes(i.id))
      const negociosSelecionados = itensSelecionados.filter((i) => i.negocioId)

      if (negociosSelecionados.length > 0) {
        const agora = new Date().toISOString()
        await Promise.all(
          negociosSelecionados.map((n) =>
            updateNegocio(n.negocioId!, {
              status: 'ganho',
              etapa_funil: 'contrato assinado',
              data_fechamento: agora,
            }),
          ),
        )
      }

      const clientesSemNegocio = itensSelecionados.filter((i) => !i.negocioId).map((i) => i.id)
      if (clientesSemNegocio.length > 0) {
        await bulkMarcarFechado(clientesSemNegocio)
      }

      toast({
        title: 'Negócios Fechados!',
        description: `${selectedIds.length} negócio(s) marcado(s) como Fechado com sucesso!`,
      })
      setSelectedIds([])
      if (onNegociosChanged) onNegociosChanged()
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
      const itensSelecionados = itensAtivos.filter((i) => selectedIds.includes(i.id))
      const clientIds = Array.from(
        new Set(itensSelecionados.map((i) => i.clienteId).filter(Boolean)),
      )
      if (clientIds.length > 0) {
        await bulkArquivar(clientIds)
      }
      toast({
        title: 'Negócios Arquivados',
        description: `${selectedIds.length} negócio(s) arquivado(s) do funil comercial ativo.`,
      })
      setSelectedIds([])
      setModalConfirmarArquivarOpen(false)
      if (onNegociosChanged) onNegociosChanged()
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
    const itensSelecionados = itensAtivos.filter((i) => selectedIds.includes(i.id))
    const clientesParaMover = itensSelecionados
      .map((i) => i.rawCliente)
      .filter((c): c is Cliente => Boolean(c))

    setIsMovingContatos(true)
    setIsProcessing(true)

    try {
      if (clientesParaMover.length > 0) {
        await bulkMoverClientesParaOutrosContatos(clientesParaMover)
      }

      // Remove os negócios do funil
      const negocioIds = itensSelecionados.map((i) => i.negocioId).filter(Boolean) as string[]
      if (negocioIds.length > 0) {
        await bulkDeleteNegocios(negocioIds)
      }

      toast({
        title: 'Contatos movidos com sucesso',
        description: `${selectedIds.length} item(ns) movido(s) para Outros Contatos e removido(s) do funil.`,
      })
      setSelectedIds([])
      setModalConfirmarMoverContatosLoteOpen(false)
      if (onNegociosChanged) onNegociosChanged()
    } catch (err: any) {
      console.error('Erro ao mover clientes em lote para outros contatos:', err)
      const details = err?.result
      let errorDescription =
        'Ocorreu um erro ao mover os clientes selecionados para Outros Contatos.'
      if (details) {
        const { failedCount, total, firstErrorMessage } = details
        errorDescription = `Falha ao remover ${failedCount} de ${total} negócio(s).${
          firstErrorMessage ? ` Motivo: ${firstErrorMessage}` : ''
        }`
      } else if (err instanceof Error && err.message) {
        errorDescription = err.message
      }
      toast({
        title: 'Erro ao mover clientes',
        description: errorDescription,
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

  // 8. Excluir Selecionados em Lote (REGRA VIGENTE: EXCLUI APENAS NEGÓCIOS DO FUNIL, NUNCA CLIENTES)
  const handleConfirmExcluirLote = async () => {
    if (selectedIds.length === 0) return
    setIsProcessing(true)
    try {
      const itensSelecionados = itensAtivos.filter((i) => selectedIds.includes(i.id))
      const negocioIds = itensSelecionados.map((i) => i.negocioId).filter(Boolean) as string[]

      if (negocioIds.length > 0) {
        // Exclui APENAS os negócios da coleção `negocios`. Os clientes vinculados permanecem 100% intactos no cadastro.
        const result = await bulkDeleteNegocios(negocioIds)
        toast({
          title: 'Negócios excluídos com sucesso',
          description: `${result.successCount} negócio(s) removido(s) do funil comercial. Todos os clientes vinculados continuam 100% intactos no cadastro.`,
        })
      } else {
        // Se nenhum negócio individual da coleção `negocios` foi encontrado, remove os itens do funil ativo
        // através de bulkArquivar para preservar o cadastro dos clientes e todos os seus dados vinculados.
        const clienteIds = Array.from(
          new Set(itensSelecionados.map((i) => i.clienteId || i.id).filter(Boolean)),
        )
        if (clienteIds.length > 0) {
          await bulkArquivar(clienteIds)
        }
        toast({
          title: 'Itens removidos do funil',
          description: `${clienteIds.length} lead(s) removido(s) do funil comercial ativo. Os dados cadastrais continuam intactos.`,
        })
      }

      setSelectedIds([])
      setModalConfirmarExcluirLoteOpen(false)
      if (onNegociosChanged) onNegociosChanged()
    } catch (err: any) {
      console.error('Erro ao excluir negócios em lote:', err)
      const details = err?.result
      let errorDescription = 'Ocorreu um erro ao remover os negócios selecionados.'
      if (details) {
        const { failedCount, total, firstErrorMessage } = details
        errorDescription = `Falha ao excluir ${failedCount} de ${total} negócio(s).${
          firstErrorMessage ? ` Motivo: ${firstErrorMessage}` : ''
        }`
      } else if (err instanceof Error && err.message) {
        errorDescription = err.message
      }

      toast({
        title: 'Erro ao excluir negócios',
        description: errorDescription,
        variant: 'destructive',
      })
      // Mesmo em falha parcial, sincroniza para refletir os que foram excluídos
      if (onNegociosChanged) onNegociosChanged()
    } finally {
      setIsProcessing(false)
    }
  }

  // Cálculos para resumo no topo da lista
  const valorTotalSelecionado = useMemo(() => {
    return itensAtivos
      .filter((c) => selectedIds.includes(c.id))
      .reduce((sum, c) => sum + (c.valorEstimado || 0), 0)
  }, [itensAtivos, selectedIds])

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

          <div className="flex items-center gap-2 justify-between sm:justify-end text-xs text-gray-600 flex-wrap">
            <span className="font-medium text-[11px] sm:text-xs">
              <strong className="text-slate-900 font-bold">{filteredItens.length}</strong>{' '}
              {filteredItens.length === 1 ? 'negócio' : 'negócios'}
            </span>

            {/* Filtro formato Pipedrive para Responsável e Estados */}
            <PipedriveFilterPopover
              usuarios={usuarios}
              usuarioAtual={userProfile || user}
              filtroResponsavel={filtroResponsavel}
              onSelectResponsavel={(id) => setFiltroResponsavel(id)}
              totalGeral={filteredItens.length}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={onBackToKanban}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium text-xs h-8"
            >
              ← Voltar para Kanban
            </Button>
          </div>
        </div>

        {/* Linha 2: Filtros Complementares da Lista (Etapa, Motivo da Perda, Tipo de Negócio) + Limpar */}
        <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
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
              <option value="todos">Todas as Etapas ({itensAtivos.length})</option>
              {ETAPAS_FUNIL.map((etapa) => {
                const count = itensAtivos.filter((c) => c.status === etapa.id).length
                return (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.label} ({count})
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
                const count = itensAtivos.filter((c) => c.motivoPerda === m.id).length
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
                const count = itensAtivos.filter((c) => c.tipoNegocio === t.id).length
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
              {filteredItens.length === 0 ? (
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
                filteredItens.map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  const responsavelTexto = item.responsavelNome || 'Não atribuído'
                  const tipoNegocioNorm = item.tipoNegocio

                  // Detalhes de visualização do Tipo de Negócio
                  const tipoNegocioBadge =
                    tipoNegocioNorm === 'carregadores veiculares' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                        <CarFront className="w-3 h-3 text-slate-600" />
                        <span>Carregadores VE</span>
                      </span>
                    ) : tipoNegocioNorm === 'baterias' ? (
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
                  const motivoObj = item.motivoPerda
                    ? MOTIVOS_PERDA_OPCOES.find((m) => m.id === item.motivoPerda)
                    : null

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openFichaCliente(item.clienteId || item.id)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-gray-50/80'
                      }`}
                    >
                      {/* Checkbox de Seleção */}
                      <td
                        className="py-3 px-3.5 text-center"
                        onClick={(e) => handleToggleSelectOne(item.id, e)}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {item.nomeCliente}
                          </span>
                          {item.negocioId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingNegocio({
                                  id: item.negocioId!,
                                  titulo: item.titulo || item.nomeCliente,
                                })
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-70 group-hover:opacity-100"
                              title="Editar nome do negócio"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                          {item.titulo && item.titulo !== item.nomeCliente && (
                            <span className="text-slate-600 font-medium" title="Nome do negócio">
                              {item.titulo}
                            </span>
                          )}
                          {item.cidade && <span>• {item.cidade}</span>}
                          {item.potenciaKwp ? (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-medium">
                                {item.potenciaKwp} kWp
                              </span>
                            </>
                          ) : null}
                        </div>
                      </td>

                      {/* Tipo de Negócio */}
                      <td className="py-3 px-3 whitespace-nowrap">{tipoNegocioBadge}</td>

                      {/* Valor Estimado */}
                      <td className="py-3 px-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {item.valorEstimado
                          ? formatCurrency(item.valorEstimado, {
                              recorrente: Boolean(
                                item.recorrenciaMensal ||
                                (item.nomeCliente &&
                                  item.nomeCliente.trim().toLowerCase() === 'joão silva'),
                              ),
                              periodicidade: 'mês',
                            })
                          : 'R$ 0,00'}
                      </td>

                      {/* Etapa Atual */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Responsável */}
                      <td className="py-3 px-3 text-xs text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-300">
                            {responsavelTexto.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`truncate max-w-[140px] ${
                              item.responsavelNome ? 'font-medium' : 'text-gray-400 italic'
                            }`}
                            title={responsavelTexto}
                          >
                            {responsavelTexto}
                          </span>
                        </div>
                      </td>

                      {/* Motivo da Perda */}
                      <td className="py-3 px-3 text-xs whitespace-nowrap">
                        {item.motivoPerda ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              motivoObj
                                ? motivoObj.cor
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                            title={item.observacoesPerda || undefined}
                          >
                            {motivoObj ? motivoObj.label : item.motivoPerda}
                          </span>
                        ) : item.status === 'Perdido' ? (
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
                                onClick={() => openFichaCliente(item.clienteId || item.id)}
                                className="cursor-pointer gap-2 text-xs"
                              >
                                <User className="w-3.5 h-3.5 text-gray-500" />
                                <span>Ver detalhes completos</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    if (item.negocioId) {
                                      await updateNegocio(item.negocioId, {
                                        status: 'ganho',
                                        etapa_funil: 'contrato assinado',
                                        data_fechamento: new Date().toISOString(),
                                      })
                                    } else {
                                      await updateClienteStatus(item.id, 'Fechado')
                                    }
                                    toast({
                                      title: 'Lead fechado!',
                                      description: `"${item.nomeCliente}" foi marcado como Fechado.`,
                                    })
                                    if (onNegociosChanged) onNegociosChanged()
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
                                    if (item.negocioId) {
                                      await updateNegocio(item.negocioId, {
                                        status: 'perdido',
                                      })
                                    } else {
                                      await updateClienteStatus(item.id, 'Perdido')
                                    }
                                    toast({
                                      title: 'Lead perdido',
                                      description: `"${item.nomeCliente}" foi marcado como Perdido.`,
                                    })
                                    if (onNegociosChanged) onNegociosChanged()
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
                                onClick={() => setItemParaMover(item)}
                                className="cursor-pointer gap-2 text-blue-600 focus:text-blue-700 focus:bg-blue-50 text-xs font-medium"
                              >
                                <Contact className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Mover para contatos</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={async () => {
                                  const confirmou = window.confirm(
                                    `Deseja arquivar o cliente "${item.nomeCliente}"? Ele sairá da visualização do funil comercial.`,
                                  )
                                  if (!confirmou) return
                                  try {
                                    await updateCliente(item.clienteId || item.id, {
                                      arquivado: true,
                                    })
                                    toast({
                                      title: 'Cliente arquivado',
                                      description: `"${item.nomeCliente}" foi arquivado com sucesso.`,
                                    })
                                    if (onNegociosChanged) onNegociosChanged()
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
                            onClick={() => openFichaCliente(item.clienteId || item.id)}
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

            {/* 5. Excluir Selecionados (Destrutivo para Negócios, Clientes Preservados) */}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setModalConfirmarExcluirLoteOpen(true)}
              disabled={isProcessing}
              className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs gap-1.5 h-8 px-2.5 font-semibold shadow-xs"
              title="Excluir permanentemente todos os negócios selecionados do funil comercial (os clientes permanecem intactos)"
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

      {/* Modal: Editar Nome do Negócio */}
      <Dialog
        open={Boolean(editingNegocio)}
        onOpenChange={(open) => {
          if (!open && !isSavingTitulo) {
            setEditingNegocio(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-500" />
              Editar Nome do Negócio
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Altere o título do negócio comercial. O cadastro do cliente permanece inalterado.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSalvarTituloNegocio()
            }}
            className="space-y-4 py-2"
          >
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Nome do Negócio *
              </label>
              <input
                type="text"
                value={novoTituloInput}
                onChange={(e) => setNovoTituloInput(e.target.value)}
                placeholder="Ex: Usina Solar 10 kWp - Sede"
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingTitulo}
                onClick={() => setEditingNegocio(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingTitulo || !novoTituloInput.trim()}
                className="text-xs bg-[#0F2038] hover:bg-[#1A365D] text-white"
              >
                {isSavingTitulo ? 'Salvando...' : 'Salvar Nome'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Confirmar Exclusão em Lote (Exclui apenas negócios; clientes continuam intactos) */}
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
              Excluir permanentemente {selectedIds.length} negócio(s)?
            </DialogTitle>
            <DialogDescription>
              Você está prestes a excluir definitivamente{' '}
              <strong className="text-gray-900 font-semibold">
                {selectedIds.length} negócio{selectedIds.length > 1 ? 's' : ''} / lead
                {selectedIds.length > 1 ? 's' : ''}
              </strong>{' '}
              do funil de vendas. Esta ação é irreversível para os negócios selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-1">
            {/* Aviso de preservação do cliente e seus dados */}
            <div className="py-2.5 text-xs text-emerald-900 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-950">
                  Seus clientes continuam 100% seguros
                </p>
                <p className="mt-0.5 text-emerald-800">
                  Os clientes vinculados e seus cadastros, propostas, orçamentos, atividades e
                  documentos <strong className="font-semibold">NÃO serão apagados</strong> e
                  permanecem intactos no CRM.
                </p>
              </div>
            </div>

            {/* Alerta de ação permanente apenas para os negócios */}
            <div className="py-2 text-xs text-rose-800 bg-rose-50/80 p-3 rounded-lg border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">
                  Atenção: Ação permanente para os negócios
                </p>
                <p className="mt-0.5 text-rose-700">
                  Os negócios selecionados serão removidos definitivamente das etapas do funil
                  comercial. Se deseja apenas ocultá-los do funil ativo sem excluí-los, use a opção
                  &quot;Arquivar&quot;.
                </p>
              </div>
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
                  Excluindo negócios...
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
        open={Boolean(itemParaMover)}
        onOpenChange={(open) => {
          if (!open && !isMovingContatos) {
            setItemParaMover(null)
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
              <strong className="text-slate-900 font-semibold">
                "{itemParaMover?.nomeCliente}"
              </strong>{' '}
              para Outros Contatos? Ele será removido do funil de vendas e seus dados serão
              preservados na lista de Outros Contatos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={isMovingContatos} onClick={() => setItemParaMover(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMovingContatos}
              onClick={async (e) => {
                e.preventDefault()
                if (!itemParaMover) return
                const nomeCliente = itemParaMover.nomeCliente
                try {
                  setIsMovingContatos(true)
                  if (itemParaMover.rawCliente) {
                    await moverClienteParaOutrosContatos(itemParaMover.rawCliente)
                  }
                  if (itemParaMover.negocioId) {
                    await bulkDeleteNegocios([itemParaMover.negocioId])
                  }
                  toast({
                    title: 'Contato movido com sucesso',
                    description: `"${nomeCliente}" foi transferido para Outros Contatos e removido do funil.`,
                  })
                  setItemParaMover(null)
                  if (onNegociosChanged) onNegociosChanged()
                } catch (err: any) {
                  console.error('Erro ao mover cliente para outros contatos:', err)
                  const details = err?.result
                  let msg = 'Não foi possível mover o cliente para Outros Contatos.'
                  if (details?.firstErrorMessage) {
                    msg = `Erro ao remover negócio do funil: ${details.firstErrorMessage}`
                  } else if (err instanceof Error && err.message) {
                    msg = err.message
                  }
                  toast({
                    title: 'Erro ao mover contato',
                    description: msg,
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
