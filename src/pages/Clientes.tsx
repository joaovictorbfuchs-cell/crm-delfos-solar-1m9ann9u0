import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchOutrosContatos } from '@/services/crmService'
import { fetchContatosUnicos } from '@/services/contatosService'
import {
  Search,
  Eye,
  MapPin,
  Zap,
  Users,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  Building2,
  User,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownZA,
  X,
  RotateCcw,
  Trash2,
  GitMerge,
  CheckSquare,
  Square,
  MinusSquare,
  MoreVertical,
  Briefcase,
  GitFork,
  Check,
  Filter,
  FileSpreadsheet,
  ArrowRightLeft,
  Phone,
  PhoneOff,
  UserCheck,
  UserX,
  SlidersHorizontal,
  Info,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { SessaoExpiradaAlert } from '@/components/SessaoExpiradaAlert'
import { ModalMesclarClientes } from '@/components/ModalMesclarClientes'
import { ModalOferecerLimpezaAvulsa } from '@/components/ModalOferecerLimpezaAvulsa'
import { ModalMensagemWhatsAppMassa } from '@/components/ModalMensagemWhatsAppMassa'
import { OutrosContatosView } from '@/components/OutrosContatosView'
import { Contact } from 'lucide-react'
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
import { StatusBadge, ProductBadge } from '@/components/StatusBadge'
import { OrigemClienteBadge } from '@/components/OrigemClienteBadge'
import { identificarOrigemCliente } from '@/lib/origemCliente'
import { formatCurrency } from '@/lib/formatters'
import { exportarClientesSegmentadosXlsx } from '@/lib/exportClientesSegmentadosXlsx'
import {
  ModalCadastroClienteFornecedor,
  DadosCadastroForm,
} from '@/components/ModalCadastroClienteFornecedor'
import type { Cliente, ClienteStatus, ContatoAdicional } from '@/types/crm'

export type SortField = 'nome' | 'origem' | 'produto' | 'cidade' | 'potencia' | 'valor' | 'status'
export type SortDirection = 'asc' | 'desc'
export type SubAbaClientes = 'base' | 'outros_contatos'

// Lista canônica de etapas do funil comercial Delfos Solar
export const ETAPAS_FUNIL_CLIENTES: { id: ClienteStatus; label: string; cor: string }[] = [
  { id: 'Novo Lead', label: '1 - Novo Lead', cor: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'Levantamento', label: '2 - Levantamento', cor: 'bg-sky-100 text-sky-800 border-sky-300' },
  {
    id: 'Orçamento',
    label: '3 - Proposta Enviada',
    cor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  {
    id: 'Negociação',
    label: '4 - Negociação',
    cor: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  {
    id: 'Contato Futuro',
    label: '5 - Contato Futuro',
    cor: 'bg-gray-100 text-gray-800 border-gray-300',
  },
  {
    id: 'Fechado',
    label: 'Fechado (Ganho)',
    cor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  { id: 'Perdido', label: 'Perdido', cor: 'bg-rose-100 text-rose-800 border-rose-300' },
]

export default function Clientes() {
  const navigate = useNavigate()
  const [activeSubTab, setActiveSubTab] = useState<SubAbaClientes>('base')
  const [totalOutrosContatos, setTotalOutrosContatos] = useState<number>(0)

  // Carrega contagem inicial de outros contatos para o badge da sub-aba
  useEffect(() => {
    let mounted = true
    fetchOutrosContatos()
      .then((data) => {
        if (mounted) {
          setTotalOutrosContatos(data.length)
        }
      })
      .catch((err) => {
        console.error('Erro ao contar outros contatos:', err)
      })
    return () => {
      mounted = false
    }
  }, [])

  const {
    isSessionExpired,
    authError,
    clientes,
    contatosAdicionais = [],
    isLoading,
    openFichaCliente,
    addCliente,
    updateCliente,
    updateClienteStatus,
    bulkUpdateEtapa,
    removeCliente,
    bulkRemoveClientes,
    mesclarClientes,
    refreshClientes,
  } = useClientes()

  // Mapear contatos únicos da área unificada vinculados aos clientes (N:N)
  const [contatosUnicosVinculadosMap, setContatosUnicosVinculadosMap] = useState<
    Map<string, number>
  >(new Map())
  useEffect(() => {
    let mounted = true
    fetchContatosUnicos()
      .then((unicos) => {
        if (!mounted) return
        const map = new Map<string, number>()
        unicos.forEach((cu) => {
          if (Array.isArray(cu.clientes_vinculados)) {
            cu.clientes_vinculados.forEach((cid) => {
              if (cid) map.set(cid, (map.get(cid) || 0) + 1)
            })
          }
        })
        setContatosUnicosVinculadosMap(map)
      })
      .catch((err) => {
        console.warn('Erro ao carregar contatos únicos para contagem de vínculos:', err)
      })
    return () => {
      mounted = false
    }
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false)

  // Painel lateral de filtros (Drawer / Sheet)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

  // Estados dos Filtros Avançados
  // 1. Etapas do funil comercial (multiseleção: array com os IDs selecionados)
  const [selectedEtapas, setSelectedEtapas] = useState<string[]>([])

  // 2. Filtros tem/não tem (Sim/Não checkboxes independentes)
  // Se ambos marcados ou ambos desmarcados => sem restrição
  const [telefoneSim, setTelefoneSim] = useState(false)
  const [telefoneNao, setTelefoneNao] = useState(false)

  const [whatsAppSim, setWhatsAppSim] = useState(false)
  const [whatsAppNao, setWhatsAppNao] = useState(false)

  const [contatoVinculadoSim, setContatoVinculadoSim] = useState(false)
  const [contatoVinculadoNao, setContatoVinculadoNao] = useState(false)

  // Ouvinte para receber alteração de busca/filtro do drawer mobile global
  useEffect(() => {
    const handleMobileFilterChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ statusFilter?: string }>
      if (customEvent.detail && customEvent.detail.statusFilter !== undefined) {
        const st = customEvent.detail.statusFilter
        if (st === 'todos') {
          setSelectedEtapas([])
        } else {
          setSelectedEtapas([st])
        }
      }
    }
    window.addEventListener('delfos:mobile-filter-change', handleMobileFilterChange)
    return () => {
      window.removeEventListener('delfos:mobile-filter-change', handleMobileFilterChange)
    }
  }, [])

  // Ouvinte para abrir modal de novo cliente via header mobile (+)
  useEffect(() => {
    const handleOpenNovoCliente = () => {
      setIsModalNovoOpen(true)
    }
    window.addEventListener('delfos:abrir-novo-lead', handleOpenNovoCliente)
    return () => {
      window.removeEventListener('delfos:abrir-novo-lead', handleOpenNovoCliente)
    }
  }, [])

  const [isModalOferecerLimpezaOpen, setIsModalOferecerLimpezaOpen] = useState(false)
  const [isModalMensagemMassaOpen, setIsModalMensagemMassaOpen] = useState(false)
  const [clienteParaExcluir, setClienteParaExcluir] = useState<{ id: string; nome: string } | null>(
    null,
  )
  const [isDeletingCliente, setIsDeletingCliente] = useState(false)

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Ações em lote
  const [isModalExcluirLoteOpen, setIsModalExcluirLoteOpen] = useState(false)
  const [isDeletingLote, setIsDeletingLote] = useState(false)
  const [textoConfirmacaoExclusao, setTextoConfirmacaoExclusao] = useState('')

  const [isModalMoverEtapaLoteOpen, setIsModalMoverEtapaLoteOpen] = useState(false)
  const [etapaDestinoLote, setEtapaDestinoLote] = useState<ClienteStatus>('Novo Lead')
  const [isMovingEtapaLote, setIsMovingEtapaLote] = useState(false)

  // Mesclagem de clientes
  const [isModalMesclarOpen, setIsModalMesclarOpen] = useState(false)
  const [clienteMesclarInicial, setClienteMesclarInicial] = useState<any>(null)

  // Ordenação alfabética por padrão (A-Z respeitando pt-BR)
  const [sortField, setSortField] = useState<SortField>('nome')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Mapear antecipadamente a origem e status de telefone/whatsapp/contato de cada cliente para performance
  const clientesComMetadados = useMemo(() => {
    // Mapa auxiliar de contatos adicionais por cliente_id
    const contatosAdicionaisMap = new Map<string, ContatoAdicional[]>()
    ;(contatosAdicionais || []).forEach((ca) => {
      if (!ca.cliente) return
      const list = contatosAdicionaisMap.get(ca.cliente) || []
      list.push(ca)
      contatosAdicionaisMap.set(ca.cliente, list)
    })

    return clientes.map((c) => {
      const telDigits = (c.telefone || '').replace(/\D/g, '')
      const temTelefone = telDigits.length >= 8

      const waDigits = (c.whatsapp || '').replace(/\D/g, '')
      const temWhatsApp = waDigits.length >= 8

      const totalAdicionais = (contatosAdicionaisMap.get(c.id) || []).length
      const totalUnicos = contatosUnicosVinculadosMap.get(c.id) || 0
      const temNomeContato = Boolean(c.contato_principal?.trim() || c.contato?.trim())
      const temContatoVinculado = totalAdicionais > 0 || totalUnicos > 0 || temNomeContato

      return {
        ...c,
        origemInfo: identificarOrigemCliente(c),
        temTelefone,
        temWhatsApp,
        temContatoVinculado,
        totalVinculos: totalAdicionais + totalUnicos + (temNomeContato ? 1 : 0),
      }
    })
  }, [clientes, contatosAdicionais, contatosUnicosVinculadosMap])

  // Contagem de filtros ativos no botão de funil
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedEtapas.length > 0) count += 1
    if ((telefoneSim || telefoneNao) && !(telefoneSim && telefoneNao)) count += 1
    if ((whatsAppSim || whatsAppNao) && !(whatsAppSim && whatsAppNao)) count += 1
    if (
      (contatoVinculadoSim || contatoVinculadoNao) &&
      !(contatoVinculadoSim && contatoVinculadoNao)
    )
      count += 1
    return count
  }, [
    selectedEtapas,
    telefoneSim,
    telefoneNao,
    whatsAppSim,
    whatsAppNao,
    contatoVinculadoSim,
    contatoVinculadoNao,
  ])

  const hasAnyFilterActive = activeFiltersCount > 0 || Boolean(searchTerm.trim())

  const handleLimparTodosFiltros = () => {
    setSearchTerm('')
    setSelectedEtapas([])
    setTelefoneSim(false)
    setTelefoneNao(false)
    setWhatsAppSim(false)
    setWhatsAppNao(false)
    setContatoVinculadoSim(false)
    setContatoVinculadoNao(false)
    setSortField('nome')
    setSortDirection('asc')
  }

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filtragem combinada (Search + Drawer Filtros com AND entre grupos e OR dentro) e Ordenação
  const processedClientes = useMemo(() => {
    // 1. Filtragem
    const filtered = clientesComMetadados.filter((c) => {
      // Busca textual geral
      if (searchTerm.trim()) {
        const lower = searchTerm.toLowerCase()
        const matchesSearch =
          c.nome.toLowerCase().includes(lower) ||
          (c.razao_social && c.razao_social.toLowerCase().includes(lower)) ||
          (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(lower)) ||
          (c.cnpj && c.cnpj.includes(searchTerm)) ||
          (c.cpf && c.cpf.includes(searchTerm)) ||
          (c.cidade && c.cidade.toLowerCase().includes(lower)) ||
          (c.uc && c.uc.includes(lower)) ||
          (c.telefone && c.telefone.includes(searchTerm)) ||
          (c.whatsapp && c.whatsapp.includes(searchTerm)) ||
          c.origemInfo.label.toLowerCase().includes(lower)

        if (!matchesSearch) return false
      }

      // Filtro 1: Etapas do Funil (multiseleção com OR)
      if (selectedEtapas.length > 0) {
        const statusAtual = (c.status || '').trim() || 'Novo Lead'
        if (!selectedEtapas.includes(statusAtual)) {
          return false
        }
      }

      // Filtro 2: Telefone cadastrado (Sim / Não)
      // Se ambos marcados ou ambos desmarcados, aceita todos
      const telRestrito = (telefoneSim || telefoneNao) && !(telefoneSim && telefoneNao)
      if (telRestrito) {
        if (telefoneSim && !c.temTelefone) return false
        if (telefoneNao && c.temTelefone) return false
      }

      // Filtro 3: WhatsApp cadastrado (Sim / Não)
      const waRestrito = (whatsAppSim || whatsAppNao) && !(whatsAppSim && whatsAppNao)
      if (waRestrito) {
        if (whatsAppSim && !c.temWhatsApp) return false
        if (whatsAppNao && c.temWhatsApp) return false
      }

      // Filtro 4: Algum contato vinculado (Sim / Não)
      const contatoRestrito =
        (contatoVinculadoSim || contatoVinculadoNao) &&
        !(contatoVinculadoSim && contatoVinculadoNao)
      if (contatoRestrito) {
        if (contatoVinculadoSim && !c.temContatoVinculado) return false
        if (contatoVinculadoNao && c.temContatoVinculado) return false
      }

      return true
    })

    // 2. Ordenação (Alfabética A-Z por padrão com localeCompare pt-BR)
    return [...filtered].sort((a, b) => {
      let result = 0

      switch (sortField) {
        case 'nome':
          result = (a.nome || '').localeCompare(b.nome || '', 'pt-BR', {
            sensitivity: 'base',
            numeric: true,
          })
          break
        case 'origem':
          result = a.origemInfo.label.localeCompare(b.origemInfo.label, 'pt-BR', {
            sensitivity: 'base',
          })
          if (result === 0) {
            result = (a.nome || '').localeCompare(b.nome || '', 'pt-BR', {
              sensitivity: 'base',
            })
          }
          break
        case 'produto':
          result = (a.produto || '').localeCompare(b.produto || '', 'pt-BR')
          break
        case 'cidade':
          result = (a.cidade || '').localeCompare(b.cidade || '', 'pt-BR')
          break
        case 'potencia':
          result = (a.potencia_kwp || 0) - (b.potencia_kwp || 0)
          break
        case 'valor':
          result = (a.valor_estimado || 0) - (b.valor_estimado || 0)
          break
        case 'status':
          result = (a.status || '').localeCompare(b.status || '', 'pt-BR')
          break
        default:
          result = (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      }

      return sortDirection === 'asc' ? result : -result
    })
  }, [
    clientesComMetadados,
    searchTerm,
    selectedEtapas,
    telefoneSim,
    telefoneNao,
    whatsAppSim,
    whatsAppNao,
    contatoVinculadoSim,
    contatoVinculadoNao,
    sortField,
    sortDirection,
  ])

  // Limpar seleção de IDs que já não estejam na lista processada (quando filtros mudam)
  // Mantemos apenas selecionados válidos
  const selectedCount = selectedIds.length
  const isAllSelected =
    processedClientes.length > 0 && processedClientes.every((c) => selectedIds.includes(c.id))
  const isSomeSelected = processedClientes.some((c) => selectedIds.includes(c.id)) && !isAllSelected

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(processedClientes.map((c) => c.id))
    }
  }

  const handleToggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Lista de clientes selecionados atualmente
  const clientesSelecionados = useMemo(() => {
    if (selectedIds.length === 0) return []
    const set = new Set(selectedIds)
    return clientes.filter((c) => set.has(c.id))
  }, [clientes, selectedIds])

  // Ação em lote: Exportar Excel (.xlsx) segmentado
  const handleExportarExcelLote = (somenteSelecionados = false) => {
    const listaAlvo =
      somenteSelecionados && clientesSelecionados.length > 0
        ? clientesSelecionados
        : processedClientes

    if (listaAlvo.length === 0) {
      alert('Não há clientes na lista para exportar.')
      return
    }

    const prefixo = somenteSelecionados
      ? `clientes-selecionados-${listaAlvo.length}`
      : `clientes-filtrados-${listaAlvo.length}`

    exportarClientesSegmentadosXlsx({
      clientes: listaAlvo,
      contatosAdicionais,
      contatosUnicosVinculadosMap,
      nomePrefixo: prefixo,
    })
  }

  // Ação em lote: Mover para outra etapa do funil
  const handleConfirmarMoverEtapaLote = async () => {
    if (selectedIds.length === 0) return
    try {
      setIsMovingEtapaLote(true)
      await bulkUpdateEtapa(selectedIds, etapaDestinoLote)
      setIsModalMoverEtapaLoteOpen(false)
      setSelectedIds([])
    } catch (err) {
      console.error('Erro ao mover clientes de etapa em lote:', err)
      alert('Ocorreu um erro ao mover os clientes de etapa. Tente novamente.')
    } finally {
      setIsMovingEtapaLote(false)
    }
  }

  // Ação em lote: Excluir clientes selecionados com verificação de segurança reforçada
  const handleExcluirLote = async () => {
    if (selectedIds.length === 0) return
    if (textoConfirmacaoExclusao.trim() !== String(selectedIds.length)) {
      alert(`Por favor, digite "${selectedIds.length}" para confirmar a exclusão.`)
      return
    }

    try {
      setIsDeletingLote(true)
      await bulkRemoveClientes(selectedIds)
      setSelectedIds([])
      setIsModalExcluirLoteOpen(false)
      setTextoConfirmacaoExclusao('')
    } catch (err) {
      console.error('Erro ao excluir clientes em lote:', err)
      alert('Erro ao excluir clientes selecionados. Tente novamente.')
    } finally {
      setIsDeletingLote(false)
    }
  }

  const handleAbrirMesclagem = (cliente?: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (cliente) {
      setClienteMesclarInicial(cliente)
    } else if (selectedIds.length > 0) {
      const primeiro = clientes.find((c) => c.id === selectedIds[0])
      setClienteMesclarInicial(primeiro || null)
    } else {
      setClienteMesclarInicial(null)
    }
    setIsModalMesclarOpen(true)
  }

  const handleSalvarCliente = async (dados: DadosCadastroForm) => {
    await addCliente({
      nome: dados.nome,
      tipo_pessoa: dados.tipo_pessoa,
      razao_social: dados.razao_social,
      nome_fantasia: dados.nome_fantasia,
      cpf: dados.cpf,
      cnpj: dados.cnpj,
      situacao_cadastral: dados.situacao_cadastral,
      cnae_principal: dados.cnae_principal,
      data_abertura: dados.data_abertura,
      telefone: dados.telefone,
      telefone_secundario: dados.telefone_secundario,
      whatsapp: dados.telefone,
      email: dados.email,
      contato_principal: dados.contato_principal,
      contato: dados.contato_principal,
      atividade_principal: dados.atividade_principal,
      como_conheceu: dados.como_conheceu,
      origem_lead:
        dados.como_conheceu === 'Redes Sociais'
          ? 'Instagram'
          : (dados.como_conheceu as any) || 'Indicação',
      observacoes: dados.observacoes,
      endereco: dados.endereco || '',
      numero: dados.numero,
      complemento: dados.complemento,
      bairro: dados.bairro,
      cidade: dados.cidade || 'Erechim',
      estado: dados.estado || 'RS',
      cep: dados.cep,
      uc: '',
      potencia_kwp: 5.5,
      valor_estimado: 0,
      status: 'Novo Lead',
      produto: 'Energia Solar',
      telhado_tipo: 'ceramico',
      inversor_marca: 'Deye',
      inversor_modelo: 'SUN-5K-SG01LP1',
      placas_qtd: 10,
      placas_marca: 'Canadian Solar',
      data_instalacao: new Date().toISOString().split('T')[0],
    })
  }

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando base de clientes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-1 sm:pt-0">
      {/* Alerta de Sessão Expirada exibido no topo quando o token expira */}
      {isSessionExpired && (
        <SessaoExpiradaAlert
          mensagem={
            authError ||
            'Por motivos de segurança, sua sessão foi encerrada após um período de inatividade ou o token de acesso tornou-se inválido. Por favor, faça login novamente para continuar.'
          }
        />
      )}

      {/* Navegação por Sub-Abas Compactas de 2º Nível: Base de Clientes vs Outros Contatos + Botões de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white p-2 sm:p-2.5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-semibold text-gray-600 w-full sm:w-auto shrink min-w-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('base')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'base'
                ? 'bg-white text-emerald-800 shadow-xs font-bold border border-gray-200/80'
                : 'hover:text-gray-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Base de Clientes</span>
            <span
              className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSubTab === 'base'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {clientes.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('outros_contatos')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'outros_contatos'
                ? 'bg-white text-blue-800 shadow-xs font-bold border border-gray-200/80'
                : 'hover:text-gray-900'
            }`}
          >
            <Contact className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Outros Contatos</span>
            <span
              className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSubTab === 'outros_contatos'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {totalOutrosContatos}
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/contatos')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-emerald-800 hover:bg-white/80 transition-all font-semibold"
            title="Abrir Visão Consolidada de todos os contatos (principais e adicionais) por cliente"
          >
            <Users className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="truncate">Visão Consolidada</span>
          </button>
        </div>

        {/* Botões de Ação do Topo */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsModalOferecerLimpezaOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 active:scale-[0.98] text-xs sm:text-sm font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            title="Disparar oferta de limpeza periódica de módulos solares via WhatsApp"
            aria-label="Oferecer Limpeza Avulsa"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />
            <span className="inline">Oferecer Limpeza Avulsa</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalNovoOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
            title="Adicionar Novo Cliente"
            aria-label="Adicionar Novo"
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span className="inline">Adicionar Novo</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Sub-Aba 2: Outros Contatos */}
      {activeSubTab === 'outros_contatos' && (
        <OutrosContatosView onTotalChange={setTotalOutrosContatos} />
      )}

      {/* Conteúdo da Sub-Aba 1: Base de Clientes */}
      {activeSubTab === 'base' && (
        <>
          {/* BARRA SUPERIOR DE FILTROS REORGANIZADA (Botão Único de Funil + Contador ao Lado + Busca Rápida) */}
          <div className="bg-white rounded-2xl p-3 border border-gray-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Lado Esquerdo: Botão Único com Ícone de Funil + Contador de Clientes Filtrados */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Botão de Funil (Abre o Drawer Lateral de Filtros Combinados) */}
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-[0.98] cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-400 ring-offset-1'
                    : 'bg-white text-gray-700 hover:text-emerald-700 hover:bg-emerald-50/50 border border-gray-300'
                }`}
                title="Abrir painel com todas as opções de filtros combinados"
              >
                <Filter
                  className={`w-4 h-4 ${activeFiltersCount > 0 ? 'text-white' : 'text-emerald-600'}`}
                />
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-emerald-800 text-[11px] font-extrabold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* CONTADOR AO LADO DO BOTÃO DE FILTRO (Requisito 3) */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span>
                  <strong className="text-emerald-700 font-extrabold">
                    {processedClientes.length}
                  </strong>
                  {processedClientes.length === 1 ? ' cliente encontrado' : ' clientes encontrados'}
                </span>
                {processedClientes.length !== clientes.length && (
                  <span className="text-[11px] text-gray-400 font-normal">
                    (de {clientes.length} no total)
                  </span>
                )}
              </div>

              {/* Botão para limpar filtros caso haja algum ativo */}
              {hasAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleLimparTodosFiltros}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 font-medium underline px-1 py-1 cursor-pointer transition-colors"
                  title="Limpar todos os filtros e pesquisa"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar filtros</span>
                </button>
              )}
            </div>

            {/* Lado Direito: Busca Rápida Textual + Exportar Planilha Filtrada */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, CPF/CNPJ, cidade, tel..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-gray-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botão de Exportar Lista Filtrada em Excel */}
              <button
                type="button"
                onClick={() => handleExportarExcelLote(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
                title="Exportar a lista atual para Excel (.xlsx) segmentada por grupos de telefone, WhatsApp e contatos"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Gerar Lista (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* BARRA DE AÇÕES EM LOTE (Exibida sempre que houver clientes selecionados) (Requisitos 4 e 5) */}
          {selectedIds.length > 0 && (
            <div className="bg-emerald-50/90 border-2 border-emerald-500 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-black shadow-xs">
                  {selectedIds.length}
                </span>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block sm:inline">
                    {selectedIds.length === 1
                      ? '1 cliente selecionado'
                      : `${selectedIds.length} clientes selecionados`}
                  </span>
                  <span className="text-[11px] text-emerald-800 font-medium sm:ml-2 block sm:inline">
                    (de {processedClientes.length} no resultado filtrado)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-gray-600 hover:text-red-700 underline ml-2 cursor-pointer font-medium"
                >
                  Desmarcar todos
                </button>
              </div>

              {/* Conjunto de Ações em Lote */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Ação 1: Gerar Lista Segmentada em Excel (.xlsx) dos selecionados */}
                <button
                  type="button"
                  onClick={() => handleExportarExcelLote(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100/70 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title="Gerar planilha .xlsx segmentando os clientes selecionados (com/sem telefone, com/sem WhatsApp, com/sem contato vinculado)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Gerar Lista Excel ({selectedIds.length})</span>
                </button>

                {/* Ação 2: Mover para outra etapa do funil */}
                <button
                  type="button"
                  onClick={() => setIsModalMoverEtapaLoteOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title="Mover os clientes selecionados para outra etapa do funil comercial"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Mover de Etapa ({selectedIds.length})</span>
                </button>

                {/* Ação 3: Mensagem WhatsApp em Massa */}
                <button
                  type="button"
                  onClick={() => setIsModalMensagemMassaOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title="Enviar mensagem para selecionados via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp ({selectedIds.length})</span>
                </button>

                {/* Ação 4: Mesclar */}
                <button
                  type="button"
                  onClick={() => handleAbrirMesclagem()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title="Mesclar cadastros selecionados em um só cliente mestre"
                >
                  <GitMerge className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Mesclar</span>
                </button>

                {/* Ação 5: Deletar clientes selecionados (com confirmação reforçada) */}
                <button
                  type="button"
                  onClick={() => {
                    setTextoConfirmacaoExclusao('')
                    setIsModalExcluirLoteOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title="Excluir permanentemente todos os clientes selecionados"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Deletar ({selectedIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Table / Cards */}
          {isSessionExpired ? null : processedClientes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
              <p className="text-sm">Nenhum cliente encontrado com os filtros aplicados.</p>
              {hasAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleLimparTodosFiltros}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Filtros e Busca</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View com Ordenação nos Cabeçalhos e Checkbox Selecionar Todos */}
              <div className="hidden md:block bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#F8FAF9] border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider select-none">
                    <tr>
                      {/* Checkbox Selecionar Todos do Resultado Filtrado */}
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-gray-500 hover:text-emerald-700 p-0.5 rounded transition-colors cursor-pointer"
                          title={
                            isAllSelected
                              ? 'Desmarcar todos os clientes do resultado'
                              : 'Selecionar todos os clientes do resultado filtrado'
                          }
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : isSomeSelected ? (
                            <MinusSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </th>

                      {/* Nome */}
                      <th
                        onClick={() => handleSortToggle('nome')}
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Nome do Cliente</span>
                          {sortField === 'nome' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUpAZ className="w-4 h-4 text-emerald-600 font-bold" />
                            ) : (
                              <ArrowDownZA className="w-4 h-4 text-emerald-600 font-bold" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                          )}
                        </div>
                      </th>

                      {/* Telefones / Contatos Cadastrados */}
                      <th className="py-3 px-4">
                        <span>Telefone & Contatos</span>
                      </th>

                      {/* Origem */}
                      <th
                        onClick={() => handleSortToggle('origem')}
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Origem</span>
                          {sortField === 'origem' ? (
                            <span className="text-emerald-700 font-bold">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                          )}
                        </div>
                      </th>

                      {/* Cidade */}
                      <th
                        onClick={() => handleSortToggle('cidade')}
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Cidade</span>
                          {sortField === 'cidade' && (
                            <span className="text-emerald-700 font-bold">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>

                      {/* Potência */}
                      <th
                        onClick={() => handleSortToggle('potencia')}
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Potência</span>
                          {sortField === 'potencia' && (
                            <span className="text-emerald-700 font-bold">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>

                      {/* Valor Estimado */}
                      <th
                        onClick={() => handleSortToggle('valor')}
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Valor Estimado</span>
                          {sortField === 'valor' && (
                            <span className="text-emerald-700 font-bold">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>

                      {/* Etapa Comercial (Status) */}
                      <th
                        onClick={() => handleSortToggle('status')}
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Etapa no Funil</span>
                          {sortField === 'status' && (
                            <span className="text-emerald-700 font-bold">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>

                      {/* Ação */}
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {processedClientes.map((c) => {
                      const isChecked = selectedIds.includes(c.id)
                      return (
                        <tr
                          key={c.id}
                          onClick={() => openFichaCliente(c.id)}
                          className={`transition-colors cursor-pointer group ${
                            isChecked
                              ? 'bg-emerald-50/70 hover:bg-emerald-50'
                              : 'hover:bg-emerald-50/40'
                          }`}
                        >
                          {/* Checkbox Individual */}
                          <td
                            className="py-3 px-3 text-center select-none"
                            onClick={(e) => handleToggleSelectOne(c.id, e)}
                          >
                            <button
                              type="button"
                              className="text-gray-400 hover:text-emerald-700 p-0.5 rounded transition-colors cursor-pointer"
                              title={isChecked ? 'Desmarcar' : 'Selecionar'}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                              )}
                            </button>
                          </td>

                          {/* Nome & Documentos */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                {c.nome}
                              </span>
                              {c.tipo_pessoa === 'juridica' || c.cnpj ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  <Building2 className="w-2.5 h-2.5" /> PJ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  <User className="w-2.5 h-2.5" /> PF
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                              {c.cnpj && (
                                <span className="text-gray-600 font-medium">CNPJ: {c.cnpj}</span>
                              )}
                              {c.cpf && (
                                <span className="text-gray-600 font-medium">CPF: {c.cpf}</span>
                              )}
                              {c.uc && <span>• UC: {c.uc}</span>}
                            </div>
                          </td>

                          {/* Telefones / Contatos Cadastrados com Badges Visuais Claros */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start text-xs">
                              {/* WhatsApp / Telefone */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {c.temWhatsApp ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
                                    title={`WhatsApp: ${c.whatsapp}`}
                                  >
                                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                                    <span>{c.whatsapp}</span>
                                  </span>
                                ) : c.temTelefone ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200"
                                    title={`Telefone: ${c.telefone}`}
                                  >
                                    <Phone className="w-3 h-3 text-gray-500" />
                                    <span>{c.telefone}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-200 italic text-[11px]">
                                    <PhoneOff className="w-3 h-3 text-gray-400" />
                                    Sem telefone
                                  </span>
                                )}
                              </div>

                              {/* Vínculo de Contato */}
                              {c.temContatoVinculado ? (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                  title={`Possui ${c.totalVinculos} contato(s) vinculado(s)`}
                                >
                                  <UserCheck className="w-2.5 h-2.5 text-blue-600" />
                                  <span>Contato vinculado</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-normal text-gray-400"
                                  title="Sem outros contatos vinculados a este cliente"
                                >
                                  <UserX className="w-2.5 h-2.5 text-gray-300" />
                                  <span>Sem contato</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Origem */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <OrigemClienteBadge origemInfo={c.origemInfo} />
                          </td>

                          {/* Cidade */}
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{c.cidade || 'Não informada'}</span>
                            </div>
                          </td>

                          {/* Potência */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                              <Zap className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{c.potencia_kwp} kWp</span>
                            </div>
                          </td>

                          {/* Valor Estimado */}
                          <td className="py-3 px-4 text-gray-800 font-medium whitespace-nowrap">
                            {formatCurrency(c.valor_estimado)}
                          </td>

                          {/* Status / Etapa Comercial */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <StatusBadge status={c.status} />
                              {c.status === 'Perdido' && c.motivo_perda && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 capitalize"
                                  title={`Motivo da perda: ${c.motivo_perda}`}
                                >
                                  Motivo:{' '}
                                  {c.motivo_perda === 'preco'
                                    ? 'Preço'
                                    : c.motivo_perda === 'concorrente'
                                      ? 'Concorrente'
                                      : c.motivo_perda === 'desistiu'
                                        ? 'Desistiu'
                                        : c.motivo_perda === 'outro'
                                          ? 'Outro'
                                          : c.motivo_perda}
                                </span>
                              )}
                              {c.status === 'Fechado' && c.area_destino && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  title={`Área de destino: ${c.area_destino}`}
                                >
                                  {c.area_destino === 'projetos'
                                    ? 'Projetos (Levantamento)'
                                    : 'O&M (Manutenção)'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={(e) => handleAbrirMesclagem(c, e)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                                title="Mesclar este cliente com outro da base"
                              >
                                <GitMerge className="w-3.5 h-3.5 text-emerald-700" />
                                <span className="hidden xl:inline">Mesclar</span>
                              </button>
                              {c.status === 'Perdido' && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    const confirmou = window.confirm(
                                      `Deseja reativar o cliente "${c.nome}" e devolver ao funil como Novo Lead?`,
                                    )
                                    if (confirmou) {
                                      await updateClienteStatus(c.id, 'Novo Lead')
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                                  title="Reativar cliente como Novo Lead"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Reativar</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openFichaCliente(c.id, 'whatsapp')
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300"
                                title="Abrir WhatsApp do cliente"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </button>
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setClienteParaExcluir({ id: c.id, nome: c.nome })
                                }}
                                className="inline-flex items-center p-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 hover:text-red-700"
                                title={`Excluir cliente ${c.nome}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="sr-only">Excluir</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-2.5">
                {/* Selecionar todos no mobile */}
                <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-2 font-bold text-gray-700"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : isSomeSelected ? (
                      <MinusSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                    <span>
                      {isAllSelected
                        ? 'Desmarcar todos'
                        : `Selecionar todos (${processedClientes.length})`}
                    </span>
                  </button>
                  {selectedIds.length > 0 && (
                    <span className="text-emerald-700 font-extrabold text-[11px]">
                      {selectedIds.length} marcado{selectedIds.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {processedClientes.map((c) => {
                  const rawWa = (c.whatsapp || '').trim() || (c.telefone || '').trim()
                  let waDigits = rawWa.replace(/\D/g, '')
                  if (
                    waDigits &&
                    !waDigits.startsWith('55') &&
                    (waDigits.length === 10 || waDigits.length === 11)
                  ) {
                    waDigits = `55${waDigits}`
                  }

                  const tipoNegocioAtual = (
                    c.tipo_negocio ||
                    c.produto ||
                    'energia solar'
                  ).toLowerCase()

                  const isChecked = selectedIds.includes(c.id)

                  return (
                    <div
                      key={c.id}
                      onClick={() => openFichaCliente(c.id)}
                      className={`bg-white rounded-xl p-3.5 border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/50'
                          : 'border-gray-200/90 shadow-2xs hover:border-emerald-300'
                      }`}
                    >
                      {/* Checkbox Individual no Mobile */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectOne(c.id, e)}
                        className="p-1 -ml-1 text-gray-400 hover:text-emerald-600 shrink-0"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                      </button>

                      {/* Nome do cliente e badges */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-gray-900 text-sm leading-snug truncate">
                            {c.nome}
                          </h4>
                          {c.tipo_pessoa === 'juridica' || c.cnpj ? (
                            <span className="text-[9px] font-bold px-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              PJ
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              PF
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="font-medium text-emerald-700">
                            {c.status || 'Novo Lead'}
                          </span>
                          {c.cidade && <span>• {c.cidade}</span>}
                          {c.temContatoVinculado && (
                            <span className="text-blue-700 font-semibold">• Contato vinc.</span>
                          )}
                        </div>
                      </div>

                      {/* Ações diretas: WhatsApp + Menu ⋮ */}
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {waDigits ? (
                          <a
                            href={`https://wa.me/${waDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Conversar com ${c.nome} no WhatsApp`}
                            title={`Conversar com ${c.nome} no WhatsApp`}
                            className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white flex items-center justify-center shadow-xs transition-transform cursor-pointer"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openFichaCliente(c.id, 'whatsapp')}
                            aria-label="Abrir WhatsApp do cliente"
                            title="Sem WhatsApp direto - abrir ficha"
                            className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 flex items-center justify-center border border-emerald-200 transition-colors cursor-pointer"
                          >
                            <WhatsAppIcon className="w-4 h-4 opacity-70" />
                          </button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Opções do cliente"
                              title="Opções do cliente"
                              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 text-xs p-1.5 shadow-lg">
                            <DropdownMenuItem
                              onClick={() => handleAbrirMesclagem(c)}
                              className="cursor-pointer gap-2 py-2 px-2.5 font-medium text-gray-700"
                            >
                              <GitMerge className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span>Mesclar clientes</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                const etapaMsg = c.status
                                  ? `Etapa atual do cliente "${c.nome}": ${c.status}`
                                  : `Cliente "${c.nome}" não possui etapa definida no funil.`
                                alert(etapaMsg)
                              }}
                              className="cursor-pointer gap-2 py-2 px-2.5 font-medium text-gray-700"
                            >
                              <GitFork className="w-4 h-4 text-blue-600 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span>Ver etapa do funil</span>
                                <span className="text-[10px] text-gray-400 font-semibold truncate">
                                  {c.status || 'Sem etapa'}
                                </span>
                              </div>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1" />

                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="cursor-pointer gap-2 py-2 px-2.5 font-medium text-gray-700">
                                <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                                <div className="flex flex-col min-w-0 text-left">
                                  <span>Tipo de negócio</span>
                                  <span className="text-[10px] text-gray-400 font-semibold capitalize truncate">
                                    {tipoNegocioAtual.includes('carregador') ||
                                    tipoNegocioAtual.includes('veículo') ||
                                    tipoNegocioAtual.includes('veiculo') ||
                                    tipoNegocioAtual.includes('wallbox')
                                      ? 'Carregadores VE'
                                      : tipoNegocioAtual.includes('bateria')
                                        ? 'Baterias'
                                        : tipoNegocioAtual.includes('o&m') ||
                                            tipoNegocioAtual.includes('om') ||
                                            tipoNegocioAtual.includes('manuten')
                                          ? 'O&M'
                                          : 'Solar'}
                                  </span>
                                </div>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-56 text-xs p-1.5 shadow-lg">
                                <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider px-2 py-1">
                                  Definir Tipo
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateCliente(c.id, {
                                        tipo_venda: 'Energia Solar',
                                        tipo_negocio: 'energia solar',
                                        produto: 'Energia Solar',
                                      })
                                    } catch (err) {
                                      console.error('Erro ao definir tipo Solar:', err)
                                    }
                                  }}
                                  className="cursor-pointer flex items-center justify-between py-2 px-2.5 text-xs font-semibold"
                                >
                                  <span>Energia Solar</span>
                                  {!tipoNegocioAtual.includes('bateria') &&
                                    !tipoNegocioAtual.includes('o&m') &&
                                    !tipoNegocioAtual.includes('om') &&
                                    !tipoNegocioAtual.includes('manuten') &&
                                    !tipoNegocioAtual.includes('carregador') &&
                                    !tipoNegocioAtual.includes('veículo') &&
                                    !tipoNegocioAtual.includes('veiculo') && (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    )}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateCliente(c.id, {
                                        tipo_venda: 'O&M (Operação e Manutenção)',
                                        tipo_negocio: 'Planos de O&M',
                                        produto: 'Plano de O&M',
                                      })
                                    } catch (err) {
                                      console.error('Erro ao definir tipo O&M:', err)
                                    }
                                  }}
                                  className="cursor-pointer flex items-center justify-between py-2 px-2.5 text-xs font-semibold"
                                >
                                  <span>O&M</span>
                                  {(tipoNegocioAtual.includes('o&m') ||
                                    tipoNegocioAtual.includes('om') ||
                                    tipoNegocioAtual.includes('manuten')) && (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateCliente(c.id, {
                                        tipo_venda: 'Baterias',
                                        tipo_negocio: 'baterias',
                                        produto: 'Sistemas Híbridos',
                                      })
                                    } catch (err) {
                                      console.error('Erro ao definir tipo Baterias:', err)
                                    }
                                  }}
                                  className="cursor-pointer flex items-center justify-between py-2 px-2.5 text-xs font-semibold"
                                >
                                  <span>Baterias</span>
                                  {tipoNegocioAtual.includes('bateria') && (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* PAINEL LATERAL DE FILTROS COMBINADOS (Sheet / Drawer lateral do botão de funil) (Requisitos 1 e 2) */}
          <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
            <SheetContent
              side="right"
              className="w-full sm:max-w-md p-0 flex flex-col bg-white overflow-hidden shadow-2xl"
            >
              <SheetHeader className="p-5 border-b border-gray-100 bg-gray-50/70 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Filter className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <span>Filtros de Clientes</span>
                      {activeFiltersCount > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-gray-500">
                      Combine múltiplos filtros ao mesmo tempo para refinar sua lista.
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Corpo de Filtros */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* 1. FILTRO DE ETAPA DO FUNIL COMERCIAL (Multiseleção) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                      <GitFork className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Etapa do Funil Comercial</span>
                    </label>
                    {selectedEtapas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedEtapas([])}
                        className="text-[11px] text-gray-500 hover:text-red-600 underline font-medium cursor-pointer"
                      >
                        Limpar etapas
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Selecione uma ou mais etapas para listar clientes presentes em qualquer uma
                    delas:
                  </p>

                  <div className="grid grid-cols-1 gap-1.5">
                    {ETAPAS_FUNIL_CLIENTES.map((etapa) => {
                      const isSelected = selectedEtapas.includes(etapa.id)
                      const count = clientesComMetadados.filter(
                        (c) => (c.status || 'Novo Lead') === etapa.id,
                      ).length

                      return (
                        <button
                          key={etapa.id}
                          type="button"
                          onClick={() => {
                            setSelectedEtapas((prev) =>
                              prev.includes(etapa.id)
                                ? prev.filter((id) => id !== etapa.id)
                                : [...prev, etapa.id],
                            )
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                              : 'bg-white border-gray-200/90 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>{etapa.label}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-200/80 pt-4 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Filtros de Dados de Contato</span>
                  </h4>

                  {/* 2. FILTRO: TELEFONE CADASTRADO (SIM / NÃO) */}
                  <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-600" />
                        <span>Telefone cadastrado</span>
                      </span>
                      {(telefoneSim || telefoneNao) && (
                        <button
                          type="button"
                          onClick={() => {
                            setTelefoneSim(false)
                            setTelefoneNao(false)
                          }}
                          className="text-[10px] text-gray-400 hover:text-red-600 underline font-medium cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          telefoneSim
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={telefoneSim}
                          onChange={(e) => setTelefoneSim(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Sim (Tem)</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          telefoneNao
                            ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={telefoneNao}
                          onChange={(e) => setTelefoneNao(e.target.checked)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Não (Sem)</span>
                      </label>
                    </div>
                  </div>

                  {/* 3. FILTRO: WHATSAPP CADASTRADO (SIM / NÃO) */}
                  <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp cadastrado</span>
                      </span>
                      {(whatsAppSim || whatsAppNao) && (
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsAppSim(false)
                            setWhatsAppNao(false)
                          }}
                          className="text-[10px] text-gray-400 hover:text-red-600 underline font-medium cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          whatsAppSim
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={whatsAppSim}
                          onChange={(e) => setWhatsAppSim(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Sim (Tem)</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          whatsAppNao
                            ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={whatsAppNao}
                          onChange={(e) => setWhatsAppNao(e.target.checked)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Não (Sem)</span>
                      </label>
                    </div>
                  </div>

                  {/* 4. FILTRO: CONTATO VINCULADO (SIM / NÃO) */}
                  <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Contato vinculado</span>
                      </span>
                      {(contatoVinculadoSim || contatoVinculadoNao) && (
                        <button
                          type="button"
                          onClick={() => {
                            setContatoVinculadoSim(false)
                            setContatoVinculadoNao(false)
                          }}
                          className="text-[10px] text-gray-400 hover:text-red-600 underline font-medium cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          contatoVinculadoSim
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={contatoVinculadoSim}
                          onChange={(e) => setContatoVinculadoSim(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Sim (Tem)</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          contatoVinculadoNao
                            ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={contatoVinculadoNao}
                          onChange={(e) => setContatoVinculadoNao(e.target.checked)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Não (Sem)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé do Drawer com Resumo e Botão de Aplicar */}
              <SheetFooter className="p-4 border-t border-gray-100 bg-gray-50/90 flex flex-row items-center justify-between gap-2">
                <div className="text-xs text-gray-600 font-medium">
                  Resultado:{' '}
                  <strong className="text-emerald-700 font-extrabold text-sm">
                    {processedClientes.length}
                  </strong>{' '}
                  clientes
                </div>

                <div className="flex items-center gap-2">
                  {hasAnyFilterActive && (
                    <button
                      type="button"
                      onClick={handleLimparTodosFiltros}
                      className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-red-600 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      Limpar tudo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterDrawerOpen(false)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Ver Resultado ({processedClientes.length})
                  </button>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Modal de Cadastro Unificado PF/PJ com Consulta CNPJ */}
          <ModalCadastroClienteFornecedor
            isOpen={isModalNovoOpen}
            onClose={() => setIsModalNovoOpen(false)}
            tipoEntidade="cliente"
            onSubmit={handleSalvarCliente}
          />

          {/* Modal Enviar Mensagem WhatsApp em Massa */}
          <ModalMensagemWhatsAppMassa
            open={isModalMensagemMassaOpen}
            onOpenChange={setIsModalMensagemMassaOpen}
            destinatariosIniciais={selectedIds
              .map((id) => {
                const c = clientes.find((cli) => cli.id === id)
                return c ? { cliente: c, valor: c.valor_final || c.valor_estimado } : null
              })
              .filter((d): d is NonNullable<typeof d> => Boolean(d))}
          />

          {/* Modal Oferecer Limpeza Avulsa em Lote / Individual */}
          <ModalOferecerLimpezaAvulsa
            open={isModalOferecerLimpezaOpen}
            onOpenChange={setIsModalOferecerLimpezaOpen}
            initialClienteId={selectedIds.length === 1 ? selectedIds[0] : null}
          />

          {/* Modal de Mesclagem Campo a Campo */}
          <ModalMesclarClientes
            isOpen={isModalMesclarOpen}
            onClose={() => {
              setIsModalMesclarOpen(false)
              setClienteMesclarInicial(null)
            }}
            clienteInicial={clienteMesclarInicial}
            todosClientes={clientes}
            onConfirmarMesclagem={async (opcoes) => {
              await mesclarClientes(opcoes)
              setSelectedIds((prev) => prev.filter((id) => id !== opcoes.clienteSecundarioId))
              await refreshClientes()
            }}
          />

          {/* MODAL DE AÇÃO EM LOTE: MOVER PARA OUTRA ETAPA DO FUNIL (Requisito 4 e 5) */}
          <Dialog
            open={isModalMoverEtapaLoteOpen}
            onOpenChange={(open) => {
              if (!open && !isMovingEtapaLote) {
                setIsModalMoverEtapaLoteOpen(false)
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base text-gray-900 font-extrabold">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  <span>Mover {selectedIds.length} Clientes de Etapa</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Selecione a etapa de destino no funil comercial para os clientes selecionados.
                </DialogDescription>
              </DialogHeader>

              <div className="py-3 space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900">
                    <p className="font-semibold">
                      Você está prestes a mover <strong>{selectedIds.length} clientes</strong>{' '}
                      simultaneamente.
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Esta ação atualizará o status de todos eles no funil comercial de vendas.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Escolha a Etapa de Destino:
                  </label>
                  <select
                    value={etapaDestinoLote}
                    onChange={(e) => setEtapaDestinoLote(e.target.value as ClienteStatus)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {ETAPAS_FUNIL_CLIENTES.map((etapa) => (
                      <option key={etapa.id} value={etapa.id}>
                        {etapa.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <DialogFooter className="flex flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isMovingEtapaLote}
                  onClick={() => setIsModalMoverEtapaLoteOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isMovingEtapaLote}
                  onClick={handleConfirmarMoverEtapaLote}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isMovingEtapaLote ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Movendo...</span>
                    </>
                  ) : (
                    <span>Confirmar Mudança de Etapa</span>
                  )}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* CONFIRMAÇÃO REFORÇADA DE EXCLUSÃO EM LOTE (Requisitos 4 e 5) */}
          <AlertDialog
            open={isModalExcluirLoteOpen}
            onOpenChange={(open) => {
              if (!open && !isDeletingLote) {
                setIsModalExcluirLoteOpen(false)
                setTextoConfirmacaoExclusao('')
              }
            }}
          >
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Atenção: Exclusão de {selectedIds.length} Clientes
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-xs text-gray-600 text-left">
                    <p>
                      Você selecionou{' '}
                      <strong className="text-gray-900 font-bold">
                        {selectedIds.length} {selectedIds.length === 1 ? 'cliente' : 'clientes'}
                      </strong>{' '}
                      para exclusão definitiva.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <span>Aviso de impacto irreversível:</span>
                      </p>
                      <p className="text-[11px] text-red-800">
                        Esta operação apagará permanentemente o cadastro e todos os registros
                        vinculados (orçamentos, manutenções, propostas, atividades na timeline,
                        etc.).
                      </p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="text-xs font-bold text-gray-800 block">
                        Para confirmar a exclusão sem enganos, digite exatamente{' '}
                        <span className="text-red-600 font-black px-1 py-0.5 bg-red-100 rounded">
                          {selectedIds.length}
                        </span>{' '}
                        abaixo:
                      </label>
                      <input
                        type="text"
                        value={textoConfirmacaoExclusao}
                        onChange={(e) => setTextoConfirmacaoExclusao(e.target.value)}
                        placeholder={`Digite ${selectedIds.length} para confirmar`}
                        className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-red-300 focus:border-red-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isDeletingLote}
                  onClick={() => setTextoConfirmacaoExclusao('')}
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={
                    isDeletingLote || textoConfirmacaoExclusao.trim() !== String(selectedIds.length)
                  }
                  onClick={async (e) => {
                    e.preventDefault()
                    await handleExcluirLote()
                  }}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 text-white focus:ring-red-600 font-bold"
                >
                  {isDeletingLote ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Excluindo {selectedIds.length} clientes...
                    </>
                  ) : (
                    `Excluir ${selectedIds.length} Clientes Definitivamente`
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Confirmação Segura de Exclusão Individual de Cliente */}
          <AlertDialog
            open={Boolean(clienteParaExcluir)}
            onOpenChange={(open) => {
              if (!open && !isDeletingCliente) {
                setClienteParaExcluir(null)
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão de Cliente</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o cliente{' '}
                  <strong className="text-gray-900 font-semibold">
                    {clienteParaExcluir?.nome}
                  </strong>
                  ? Esta ação é irreversível e excluirá todas as atividades, propostas, orçamentos e
                  registros vinculados a ele.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingCliente}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDeletingCliente}
                  onClick={async (e) => {
                    e.preventDefault()
                    if (!clienteParaExcluir) return
                    try {
                      setIsDeletingCliente(true)
                      await removeCliente(clienteParaExcluir.id)
                      setClienteParaExcluir(null)
                    } catch (err) {
                      console.error('Erro ao excluir cliente:', err)
                      alert('Ocorreu um erro ao excluir o cliente. Tente novamente.')
                    } finally {
                      setIsDeletingCliente(false)
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                >
                  {isDeletingCliente ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Excluindo...
                    </>
                  ) : (
                    'Confirmar Exclusão'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
