import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Search,
  Filter,
  FilterX,
  Plus,
  MessageSquare,
  Users,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  GitMerge,
  Trash2,
} from 'lucide-react'
import { ModalMesclarClientes } from '@/components/ModalMesclarClientes'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { SessaoExpiradaAlert } from '@/components/SessaoExpiradaAlert'
import { ModalMensagemWhatsAppMassa } from '@/components/ModalMensagemWhatsAppMassa'
import {
  ModalCadastroClienteFornecedor,
  DadosCadastroForm,
} from '@/components/ModalCadastroClienteFornecedor'
import { useClientes } from '@/contexts/ClientesContext'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/formatters'
import { fetchOutrosContatos, fetchAllUsinas } from '@/services/crmService'
import type { Cliente, ClienteStatus, OutroContato, Atividade, UsinaCliente } from '@/types/crm'

export type SortField = 'nome' | 'origem' | 'produto' | 'cidade' | 'potencia' | 'valor' | 'status'
export type SortDirection = 'asc' | 'desc'
export type SubAbaClientes = 'base' | 'outros_contatos'

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

export interface ClienteUnificadoRow {
  id: string
  origemRegistro: 'cliente' | 'outro_contato'
  nome: string
  cpfOuCnpj?: string
  tipoPessoa?: 'fisica' | 'juridica'
  telefone?: string
  whatsapp?: string
  totalUsinas: number
  temContratoOM: boolean
  ultimaAtividade?: {
    data: string
    resumo: string
  }
  clienteRaw?: Cliente
  outroContatoRaw?: OutroContato
}

export interface ClientesFiltrosAvancados {
  tipoPessoa: 'todos' | 'fisica' | 'juridica'
  temTelefone: 'todos' | 'sim' | 'nao'
  temContratoOM: 'todos' | 'sim' | 'nao'
  temUsinas: 'todos' | 'com_usinas' | 'sem_usinas'
  origemRegistro: 'todos' | 'cliente' | 'outro_contato'
}

const ITEMS_PER_PAGE = 25

export default function Clientes() {
  const { toast } = useToast()
  const {
    clientes,
    contratosOM,
    atividades,
    openFichaCliente,
    addCliente,
    bulkRemoveClientes,
    mesclarClientes,
    isLoading,
    isSessionExpired,
    authError,
  } = useClientes()

  // Estados locais de dados adicionais
  const [outrosContatos, setOutrosContatos] = useState<OutroContato[]>([])
  const [usinasList, setUsinasList] = useState<UsinaCliente[]>([])
  const [loadingExtras, setLoadingExtras] = useState(false)

  // Busca rápida no topo
  const [searchTerm, setSearchTerm] = useState('')

  // Drawer de filtros avançados
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [filtros, setFiltros] = useState<ClientesFiltrosAvancados>({
    tipoPessoa: 'todos',
    temTelefone: 'todos',
    temContratoOM: 'todos',
    temUsinas: 'todos',
    origemRegistro: 'todos',
  })
  const [draftFiltros, setDraftFiltros] = useState<ClientesFiltrosAvancados>({
    tipoPessoa: 'todos',
    temTelefone: 'todos',
    temContratoOM: 'todos',
    temUsinas: 'todos',
    origemRegistro: 'todos',
  })

  // Sincronizar draft ao abrir o drawer
  useEffect(() => {
    if (isFilterDrawerOpen) {
      setDraftFiltros(filtros)
    }
  }, [isFilterDrawerOpen, filtros])

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modais
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false)
  const [isModalMensagemMassaOpen, setIsModalMensagemMassaOpen] = useState(false)
  const [isModalMesclarOpen, setIsModalMesclarOpen] = useState(false)
  const [isExcluindoMassa, setIsExcluindoMassa] = useState(false)

  // Carregar outros contatos e usinas para unificação
  const carregarDadosExtras = useCallback(async () => {
    setLoadingExtras(true)
    try {
      const [ocList, usinas] = await Promise.all([
        fetchOutrosContatos().catch((e) => {
          console.warn('Erro ao carregar outros contatos para unificação:', e)
          return [] as OutroContato[]
        }),
        fetchAllUsinas().catch((e) => {
          console.warn('Erro ao carregar usinas:', e)
          return [] as UsinaCliente[]
        }),
      ])
      setOutrosContatos(ocList)
      setUsinasList(usinas)
    } finally {
      setLoadingExtras(false)
    }
  }, [])

  useEffect(() => {
    carregarDadosExtras()
  }, [carregarDadosExtras])

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

  // Mapa de contagem de usinas por cliente_id
  const usinasCountMap = useMemo(() => {
    const map = new Map<string, number>()
    usinasList.forEach((u) => {
      if (u.cliente_id) {
        map.set(u.cliente_id, (map.get(u.cliente_id) || 0) + 1)
      }
    })
    return map
  }, [usinasList])

  // Set de cliente_ids com contrato O&M ativo ou cadastrado
  const contratosOMClienteSet = useMemo(() => {
    const set = new Set<string>()
    ;(contratosOM || []).forEach((c) => {
      if (c?.cliente_id) set.add(c.cliente_id)
    })
    return set
  }, [contratosOM])

  // Mapa da atividade mais recente por cliente_id
  const ultimaAtividadeMap = useMemo(() => {
    const map = new Map<string, { data: string; resumo: string }>()
    if (!Array.isArray(atividades)) return map

    // Ordenar atividades por data decrescente
    const sorted = [...atividades].sort((a, b) => {
      const da = new Date(a.data || a.created || 0).getTime()
      const db = new Date(b.data || b.created || 0).getTime()
      return db - da
    })

    sorted.forEach((at) => {
      if (at.cliente_id && !map.has(at.cliente_id)) {
        const resumoCurto = at.titulo?.trim() || at.descricao?.trim() || at.tipo || 'Atividade'
        map.set(at.cliente_id, {
          data: at.data || at.created,
          resumo: resumoCurto,
        })
      }
    })

    return map
  }, [atividades])

  // Listagem Unificada (Clientes da base + Outros contatos da coleção outros_contatos)
  const rowsUnificadas = useMemo<ClienteUnificadoRow[]>(() => {
    const rows: ClienteUnificadoRow[] = []

    // 1. Clientes da Base
    clientes.forEach((cli) => {
      const doc = (cli.cnpj || cli.cpf || '').trim()
      const tipoPessoa: 'fisica' | 'juridica' =
        cli.tipo_pessoa === 'juridica' || Boolean(cli.cnpj) ? 'juridica' : 'fisica'

      const totalUsinas = usinasCountMap.get(cli.id) || 0
      const temContratoOM =
        Boolean(cli.contratou_om) ||
        contratosOMClienteSet.has(cli.id) ||
        (cli.tipo_negocio || '').toLowerCase().includes('o&m') ||
        (cli.tipo_venda || '').toLowerCase().includes('o&m')

      rows.push({
        id: cli.id,
        origemRegistro: 'cliente',
        nome: cli.nome,
        cpfOuCnpj: doc || undefined,
        tipoPessoa,
        telefone: cli.telefone?.trim() || undefined,
        whatsapp: cli.whatsapp?.trim() || undefined,
        totalUsinas,
        temContratoOM,
        ultimaAtividade: ultimaAtividadeMap.get(cli.id),
        clienteRaw: cli,
      })
    })

    // 2. Outros Contatos (unificados na mesma listagem, sem separação por categoria)
    outrosContatos.forEach((oc) => {
      rows.push({
        id: oc.id,
        origemRegistro: 'outro_contato',
        nome: oc.nome,
        cpfOuCnpj: undefined,
        tipoPessoa: 'fisica',
        telefone: oc.telefone?.trim() || undefined,
        whatsapp: oc.telefone?.trim() || undefined,
        totalUsinas: 0,
        temContratoOM: false,
        ultimaAtividade: oc.observacao
          ? {
              data: oc.created,
              resumo: oc.observacao,
            }
          : undefined,
        outroContatoRaw: oc,
      })
    })

    // Ordenação alfabética padrão (A-Z respeitando pt-BR)
    rows.sort((a, b) =>
      (a.nome || '').localeCompare(b.nome || '', 'pt-BR', {
        sensitivity: 'base',
        numeric: true,
      }),
    )

    return rows
  }, [clientes, outrosContatos, usinasCountMap, contratosOMClienteSet, ultimaAtividadeMap])

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filtros.tipoPessoa !== 'todos') count++
    if (filtros.temTelefone !== 'todos') count++
    if (filtros.temContratoOM !== 'todos') count++
    if (filtros.temUsinas !== 'todos') count++
    if (filtros.origemRegistro !== 'todos') count++
    return count
  }, [filtros])

  const activeDraftFiltersCount = useMemo(() => {
    let count = 0
    if (draftFiltros.tipoPessoa !== 'todos') count++
    if (draftFiltros.temTelefone !== 'todos') count++
    if (draftFiltros.temContratoOM !== 'todos') count++
    if (draftFiltros.temUsinas !== 'todos') count++
    if (draftFiltros.origemRegistro !== 'todos') count++
    return count
  }, [draftFiltros])

  const hasAnyFilterActive = activeFiltersCount > 0 || Boolean(searchTerm.trim())

  const handleLimparFiltros = () => {
    const limpos: ClientesFiltrosAvancados = {
      tipoPessoa: 'todos',
      temTelefone: 'todos',
      temContratoOM: 'todos',
      temUsinas: 'todos',
      origemRegistro: 'todos',
    }
    setDraftFiltros(limpos)
    setFiltros(limpos)
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleAplicarFiltros = () => {
    setFiltros(draftFiltros)
    setCurrentPage(1)
    setIsFilterDrawerOpen(false)
  }

  // Filtragem da lista unificada
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return rowsUnificadas.filter((row) => {
      // 1. Busca por nome (e CPF/CNPJ ou telefone)
      if (term) {
        const matchesNome = (row.nome || '').toLowerCase().includes(term)
        const matchesDoc = row.cpfOuCnpj ? row.cpfOuCnpj.toLowerCase().includes(term) : false
        const matchesTel = row.telefone ? row.telefone.replace(/\D/g, '').includes(term) : false
        if (!matchesNome && !matchesDoc && !matchesTel) return false
      }

      // 2. Filtro Tipo Pessoa (PF / PJ)
      if (filtros.tipoPessoa === 'fisica' && row.tipoPessoa !== 'fisica') return false
      if (filtros.tipoPessoa === 'juridica' && row.tipoPessoa !== 'juridica') return false

      // 3. Filtro Tem Telefone
      const temTel = Boolean(
        (row.whatsapp && row.whatsapp.replace(/\D/g, '').length >= 8) ||
        (row.telefone && row.telefone.replace(/\D/g, '').length >= 8),
      )
      if (filtros.temTelefone === 'sim' && !temTel) return false
      if (filtros.temTelefone === 'nao' && temTel) return false

      // 4. Filtro Contrato O&M
      if (filtros.temContratoOM === 'sim' && !row.temContratoOM) return false
      if (filtros.temContratoOM === 'nao' && row.temContratoOM) return false

      // 5. Filtro Número de Usinas
      if (filtros.temUsinas === 'com_usinas' && row.totalUsinas === 0) return false
      if (filtros.temUsinas === 'sem_usinas' && row.totalUsinas > 0) return false

      // 6. Filtro Origem do Registro
      if (filtros.origemRegistro === 'cliente' && row.origemRegistro !== 'cliente') return false
      if (filtros.origemRegistro === 'outro_contato' && row.origemRegistro !== 'outro_contato')
        return false

      return true
    })
  }, [rowsUnificadas, searchTerm, filtros])

  // Paginação
  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE) || 1
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredRows.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredRows, currentPage])

  // Limpeza de IDs selecionados que não existam mais na lista filtrada
  const selectedFilteredRows = useMemo(() => {
    const set = new Set(selectedIds)
    return filteredRows.filter((r) => set.has(r.id))
  }, [filteredRows, selectedIds])

  const isAllSelected =
    filteredRows.length > 0 && selectedFilteredRows.length === filteredRows.length
  const isSomeSelected =
    selectedFilteredRows.length > 0 && selectedFilteredRows.length < filteredRows.length

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRows.map((r) => r.id))
    }
  }

  const handleToggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Resolver link direto wa.me para ação rápida de WhatsApp
  const resolverWhatsAppLink = (row: ClienteUnificadoRow): string | null => {
    const raw = row.whatsapp || row.telefone || ''
    let digits = raw.replace(/\D/g, '')
    if (!digits || digits.length < 8) return null

    // Adicionar DDI Brasil 55 quando necessário
    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = `55${digits}`
    } else if (digits.length === 8 || digits.length === 9) {
      digits = `5554${digits}` // DDD regional Erechim/RS padrão
    }

    return `https://wa.me/${digits}`
  }

  // Navegar para ficha do cliente
  const handleAbrirCliente = (row: ClienteUnificadoRow) => {
    if (row.origemRegistro === 'cliente') {
      openFichaCliente(row.id)
    }
  }

  const handleAbrirUsinas = (row: ClienteUnificadoRow, e: React.MouseEvent) => {
    e.stopPropagation()
    if (row.origemRegistro === 'cliente') {
      openFichaCliente(row.id, 'usinas')
    }
  }

  // Clientes selecionados para o ModalMesclarClientes (somente clientes reais da coleção clientes)
  const clientesSelecionadosParaMesclar = useMemo(() => {
    const set = new Set(selectedIds)
    return clientes.filter((c) => set.has(c.id))
  }, [selectedIds, clientes])

  const handleExcluirSelecionados = async () => {
    if (selectedFilteredRows.length === 0) return
    const idsParaExcluir = selectedFilteredRows.map((r) => r.id)
    const confirmou = window.confirm(
      `Deseja realmente excluir ${idsParaExcluir.length} cliente(s) selecionado(s)? Esta ação não pode ser desfeita.`,
    )
    if (!confirmou) return

    setIsExcluindoMassa(true)
    try {
      await bulkRemoveClientes(idsParaExcluir)
      setSelectedIds([])
      toast({
        title: 'Clientes excluídos',
        description: `${idsParaExcluir.length} cliente(s) excluído(s) com sucesso.`,
      })
    } catch (err) {
      console.error('Erro ao excluir clientes selecionados:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir alguns ou todos os clientes selecionados.',
      })
    } finally {
      setIsExcluindoMassa(false)
    }
  }

  // Destinatários para o modal de mensagem em massa baseado nos clientes selecionados
  const destinatariosMensagemMassa = useMemo(() => {
    if (selectedIds.length === 0) return undefined
    const set = new Set(selectedIds)

    return rowsUnificadas
      .filter((r) => set.has(r.id))
      .map((r) => {
        if (r.clienteRaw) {
          return {
            cliente: r.clienteRaw,
            valor: r.clienteRaw.valor_final || r.clienteRaw.valor_estimado,
          }
        }
        // Sintetizar cliente a partir do outro_contato
        const sintetico: Cliente = {
          id: r.id,
          collectionId: 'outros_contatos',
          collectionName: 'outros_contatos',
          nome: r.nome,
          telefone: r.telefone || '',
          whatsapp: r.whatsapp || r.telefone || '',
          cidade: 'Erechim',
          endereco: '',
          uc: '',
          potencia_kwp: 0,
          valor_estimado: 0,
          status: 'Novo Lead',
          data_instalacao: '',
          inversor_marca: '',
          inversor_modelo: '',
          placas_qtd: 0,
          placas_marca: '',
          telhado_tipo: 'ceramico',
          created: '',
          updated: '',
        }
        return {
          cliente: sintetico,
          valor: 0,
        }
      })
  }, [selectedIds, rowsUnificadas])

  const handleSalvarNovoCliente = async (dados: DadosCadastroForm) => {
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
    await carregarDadosExtras()
  }

  if (isLoading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-medium">Carregando listagem de clientes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 w-full pb-12">
      {/* Alerta de sessão expirada */}
      {isSessionExpired && (
        <SessaoExpiradaAlert
          mensagem={
            authError ||
            'Por motivos de segurança, sua sessão foi encerrada. Por favor, faça login novamente.'
          }
        />
      )}

      {/* 1. Header no padrão visual da Central de Atividades:
          Título com contagem + Campo de busca + Botão "Filtros" + Botão Limpar Filtros + Botão "Adicionar novo cliente" */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 flex-nowrap min-w-0">
        {/* Lado Esquerdo: Ícone + Título com contagem de clientes */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-nowrap">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-gray-900 tracking-tight whitespace-nowrap">
              Clientes
            </h1>
            {/* Contagem de clientes encontrados */}
            <div
              className="h-8 inline-flex items-center gap-1 px-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs shrink-0 whitespace-nowrap"
              title="Clientes encontrados após filtros e busca"
            >
              <span>
                <strong className="text-gray-900 font-extrabold">{filteredRows.length}</strong> de{' '}
                {rowsUnificadas.length}
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Campo de busca por nome + Botão Filtros + Botão Limpar Filtros + Botão Adicionar Novo Cliente */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap shrink-0 justify-start md:justify-end">
          {/* Campo de Busca por nome */}
          <div className="relative w-full sm:w-56 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Buscar por nome..."
              className="w-full text-xs bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Botão "Filtros" com indicador de ativos */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
              activeFiltersCount > 0
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/40'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
            title="Abrir filtros de clientes"
          >
            <Filter
              className={`w-3.5 h-3.5 ${activeFiltersCount > 0 ? 'text-white' : 'text-emerald-600'}`}
            />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Botão de limpar filtros (visível quando há qualquer filtro ou busca ativa) */}
          {hasAnyFilterActive && (
            <Button
              type="button"
              variant="outline"
              onClick={handleLimparFiltros}
              className="h-9 px-2.5 sm:px-3 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold shrink-0 whitespace-nowrap"
              title="Limpar todos os filtros e busca"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Limpar</span>
            </Button>
          )}

          {/* Botão "Adicionar novo cliente" */}
          <Button
            type="button"
            onClick={() => setIsModalNovoOpen(true)}
            className="h-9 px-2.5 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            title="Adicionar novo cliente ou contato"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar novo cliente</span>
          </Button>
        </div>
      </div>

      {/* Barra de Ações em Lote quando há clientes selecionados (com botão Disparar Mensagens WhatsApp Massa) */}
      {selectedFilteredRows.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
              {selectedFilteredRows.length}
            </span>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                {selectedFilteredRows.length === 1
                  ? '1 cliente selecionado'
                  : `${selectedFilteredRows.length} clientes selecionados`}
              </p>
              <p className="text-[11px] text-emerald-700">
                Ações em lote sobre os clientes marcados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            {/* Aviso discreto quando há >= 2 selecionados mas menos de 2 clientes reais da base */}
            {selectedFilteredRows.length >= 2 && clientesSelecionadosParaMesclar.length < 2 && (
              <span
                className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg shrink-0"
                title="Registros de Outros Contatos não participam da mesclagem"
              >
                Mesclagem requer 2 clientes da base (outros contatos não mesclam)
              </span>
            )}

            {/* Botão Mesclar Clientes (habilitado com >= 2 clientes selecionados da base) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={clientesSelecionadosParaMesclar.length < 2}
              onClick={() => setIsModalMesclarOpen(true)}
              className="h-8 px-3 rounded-xl border-emerald-300 bg-white hover:bg-emerald-100/60 text-emerald-900 font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                clientesSelecionadosParaMesclar.length < 2
                  ? 'Selecione 2 ou mais clientes da base para mesclar'
                  : 'Mesclar clientes selecionados em um único registro unificado'
              }
            >
              <GitMerge className="w-3.5 h-3.5 text-emerald-700" />
              <span>Mesclar Clientes</span>
            </Button>

            {/* Botão Excluir Selecionados */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExcluindoMassa}
              onClick={handleExcluirSelecionados}
              className="h-8 px-3 rounded-xl border-red-200 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50"
              title="Excluir todos os clientes selecionados"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>{isExcluindoMassa ? 'Excluindo...' : 'Excluir Selecionados'}</span>
            </Button>

            {/* Botão Disparar Mensagens WhatsApp Massa */}
            <Button
              type="button"
              onClick={() => setIsModalMensagemMassaOpen(true)}
              className="h-8 px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              title="Disparar mensagens individuais via WhatsApp para os clientes selecionados"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Disparar Mensagens ({selectedFilteredRows.length})</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-8 px-2 text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/50"
            >
              Desmarcar
            </Button>
          </div>
        </div>
      )}

      {/* 2. Tabela de Clientes no padrão visual da Central de Atividades:
          Colunas na ordem:
          1. Checkbox de seleção (individual + em massa)
          2. Nome do Cliente em destaque (sem rótulo PF/PJ; CPF/CNPJ em fonte secundária)
          3. Telefone (ação rápida wa.me; vazio/alerta se sem telefone)
          4. Número de Usinas (quando zero, célula vazia; clique abre ficha na aba 'usinas')
          5. Contrato O&M ("Sim" ou "Não")
          6. Última Atividade (data + resumo curto) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Info className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-gray-800">Nenhum cliente encontrado</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Nenhum registro corresponde aos filtros ou à busca. Experimente limpar os filtros.
            </p>
            {hasAnyFilterActive && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
              >
                Limpar filtros e busca
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Visualização Desktop (Tabela Completa sem rolagem horizontal e com items-center) */}
            <TooltipProvider delayDuration={150}>
              <div className="hidden lg:block w-full overflow-hidden">
                <table className="w-full table-fixed text-left text-xs">
                  <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      {/* 1. Checkbox em massa */}
                      <th className="py-2.5 px-2.5 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="p-1 rounded text-gray-600 hover:text-emerald-700 transition-colors cursor-pointer"
                          title={
                            isAllSelected
                              ? 'Desmarcar todos'
                              : 'Selecionar todos os clientes filtrados'
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

                      {/* 2. Nome do Cliente */}
                      <th className="py-2.5 px-3 w-[32%]">Nome do Cliente</th>

                      {/* 3. Telefone */}
                      <th className="py-2.5 px-3 w-[18%]">Telefone</th>

                      {/* 4. Número de Usinas */}
                      <th className="py-2.5 px-2 w-[12%] text-center">Usinas</th>

                      {/* 5. Contrato O&M */}
                      <th className="py-2.5 px-2 w-[12%] text-center">Contrato O&M</th>

                      {/* 6. Última Atividade */}
                      <th className="py-2.5 px-3 w-[26%] text-right">Última Atividade</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {paginatedRows.map((row) => {
                      const isSelected = selectedIds.includes(row.id)
                      const waLink = resolverWhatsAppLink(row)

                      return (
                        <tr
                          key={row.id}
                          onClick={() => handleAbrirCliente(row)}
                          className={`transition-colors cursor-pointer group ${
                            isSelected
                              ? 'bg-emerald-50/70 hover:bg-emerald-100/50'
                              : 'hover:bg-emerald-50/40'
                          }`}
                        >
                          {/* 1. Checkbox individual */}
                          <td
                            className="py-2.5 px-2.5 text-center align-middle"
                            onClick={(e) => handleToggleSelectOne(row.id, e)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* 2. Nome do Cliente em destaque - SEM rótulo PF/PJ ao lado; CPF/CNPJ discreto abaixo */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="flex flex-col items-start justify-center min-w-0">
                              <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors truncate max-w-full text-xs">
                                {row.nome}
                              </span>
                              {row.cpfOuCnpj && (
                                <span className="text-[11px] text-gray-400 font-mono font-normal truncate max-w-full">
                                  {row.cpfOuCnpj}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Telefone - botão de ação rápida wa.me diretamente; sem retângulo cinza quando vazio */}
                          <td
                            className="py-2.5 px-3 align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {waLink ? (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Conversar com ${row.nome} no WhatsApp`}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors text-xs font-semibold cursor-pointer shrink-0"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[130px]">
                                    {row.whatsapp || row.telefone}
                                  </span>
                                </a>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center justify-center p-1 text-amber-500 hover:text-amber-600 transition-colors">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="text-xs bg-gray-900 text-white px-2 py-1 rounded-md"
                                  >
                                    Telefone não cadastrado
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>

                          {/* 4. Número de Usinas - Quando zero: célula VAZIA. Ao clicar, abre a ficha na aba usinas */}
                          <td className="py-2.5 px-2 align-middle text-center">
                            {row.totalUsinas > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => handleAbrirUsinas(row, e)}
                                title={`Ver ${row.totalUsinas} usina(s) deste cliente`}
                                className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                {row.totalUsinas}
                              </button>
                            ) : null}
                          </td>

                          {/* 5. Contrato O&M - "Sim" ou "Não" com cor semântica */}
                          <td className="py-2.5 px-2 align-middle text-center">
                            <span
                              className={`text-[11px] font-bold ${
                                row.temContratoOM ? 'text-emerald-700' : 'text-gray-400'
                              }`}
                            >
                              {row.temContratoOM ? 'Sim' : 'Não'}
                            </span>
                          </td>

                          {/* 6. Última Atividade - Data + resumo curto com tooltip */}
                          <td className="py-2.5 px-3 align-middle text-right">
                            {row.ultimaAtividade ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex flex-col items-end justify-center min-w-0 max-w-full cursor-pointer">
                                    <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">
                                      {formatDate(row.ultimaAtividade.data)}
                                    </span>
                                    <span className="text-[11px] font-normal text-gray-700 truncate max-w-[190px]">
                                      {row.ultimaAtividade.resumo}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg shadow-md max-w-sm"
                                >
                                  <p className="font-semibold">
                                    {formatDate(row.ultimaAtividade.data)}
                                  </p>
                                  <p className="text-[11px] text-gray-300 mt-0.5">
                                    {row.ultimaAtividade.resumo}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </TooltipProvider>

            {/* Visualização Mobile / Tablet (Cards Responsivos) */}
            <div className="lg:hidden divide-y divide-gray-100">
              {/* Linha de seleção todos mobile */}
              <div className="p-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-2 font-semibold text-gray-700 cursor-pointer"
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
                      : `Selecionar todos (${filteredRows.length})`}
                  </span>
                </button>
                {selectedFilteredRows.length > 0 && (
                  <span className="text-[11px] font-bold text-emerald-800">
                    {selectedFilteredRows.length} selecionado(s)
                  </span>
                )}
              </div>

              {paginatedRows.map((row) => {
                const isSelected = selectedIds.includes(row.id)
                const waLink = resolverWhatsAppLink(row)

                return (
                  <div
                    key={row.id}
                    onClick={() => handleAbrirCliente(row)}
                    className={`p-3 transition-colors cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-emerald-50/70'
                        : 'hover:bg-emerald-50/40 active:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e) => handleToggleSelectOne(row.id, e)}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 leading-snug truncate">
                            {row.nome}
                          </h4>
                          {row.cpfOuCnpj && (
                            <p className="text-[11px] text-gray-400 font-mono truncate">
                              {row.cpfOuCnpj}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Ação WhatsApp Rápida */}
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200"
                        >
                          <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-gray-600">
                      <div className="flex items-center gap-2">
                        {row.totalUsinas > 0 && (
                          <button
                            type="button"
                            onClick={(e) => handleAbrirUsinas(row, e)}
                            className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                          >
                            {row.totalUsinas} {row.totalUsinas === 1 ? 'usina' : 'usinas'}
                          </button>
                        )}
                        <span className="text-gray-500">
                          O&M:{' '}
                          <strong
                            className={row.temContratoOM ? 'text-emerald-700' : 'text-gray-500'}
                          >
                            {row.temContratoOM ? 'Sim' : 'Não'}
                          </strong>
                        </span>
                      </div>

                      {row.ultimaAtividade && (
                        <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                          {formatDate(row.ultimaAtividade.data)} • {row.ultimaAtividade.resumo}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Paginação */}
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8FAF9]/60">
              <div className="text-xs text-gray-500">
                Mostrando{' '}
                <span className="font-bold text-gray-900">
                  {Math.min(filteredRows.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}
                </span>{' '}
                a{' '}
                <span className="font-bold text-gray-900">
                  {Math.min(filteredRows.length, currentPage * ITEMS_PER_PAGE)}
                </span>{' '}
                de <span className="font-bold text-gray-900">{filteredRows.length}</span> registros
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="text-xs font-semibold px-2 text-gray-700">
                    Página {currentPage} de {totalPages}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Próxima página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. Painel Lateral (Drawer / Sheet) de Filtros */}
      <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white">
          <SheetHeader className="p-5 border-b border-gray-100 bg-[#F8FAF9]/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold text-gray-900">
                    Filtros de Clientes
                  </SheetTitle>
                  <SheetDescription className="text-xs text-gray-500">
                    Refine os clientes listados pelos critérios abaixo
                  </SheetDescription>
                </div>
              </div>
              {activeDraftFiltersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {activeDraftFiltersCount} ativo{activeDraftFiltersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </SheetHeader>

          {/* Corpo rolável com filtros */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* A. Tipo Pessoa (PF / PJ) - Acessível apenas pelo filtro conforme especificação */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Tipo de Pessoa</label>
              <select
                value={draftFiltros.tipoPessoa}
                onChange={(e) =>
                  setDraftFiltros((prev) => ({
                    ...prev,
                    tipoPessoa: e.target.value as any,
                  }))
                }
                className="w-full text-xs bg-gray-50 hover:bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="todos">Todos (Pessoa Física e Jurídica)</option>
                <option value="fisica">Pessoa Física (PF)</option>
                <option value="juridica">Pessoa Jurídica (PJ)</option>
              </select>
            </div>

            {/* B. Telefone Cadastrado */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Telefone / WhatsApp</label>
              <select
                value={draftFiltros.temTelefone}
                onChange={(e) =>
                  setDraftFiltros((prev) => ({
                    ...prev,
                    temTelefone: e.target.value as any,
                  }))
                }
                className="w-full text-xs bg-gray-50 hover:bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="sim">Com telefone/WhatsApp cadastrado</option>
                <option value="nao">Sem telefone cadastrado</option>
              </select>
            </div>

            {/* C. Contrato O&M */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Contrato O&M</label>
              <select
                value={draftFiltros.temContratoOM}
                onChange={(e) =>
                  setDraftFiltros((prev) => ({
                    ...prev,
                    temContratoOM: e.target.value as any,
                  }))
                }
                className="w-full text-xs bg-gray-50 hover:bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="sim">Com Contrato O&M ("Sim")</option>
                <option value="nao">Sem Contrato O&M ("Não")</option>
              </select>
            </div>

            {/* D. Número de Usinas */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Usinas Vinculadas</label>
              <select
                value={draftFiltros.temUsinas}
                onChange={(e) =>
                  setDraftFiltros((prev) => ({
                    ...prev,
                    temUsinas: e.target.value as any,
                  }))
                }
                className="w-full text-xs bg-gray-50 hover:bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="com_usinas">Com pelo menos 1 usina</option>
                <option value="sem_usinas">Sem usinas vinculadas</option>
              </select>
            </div>

            {/* E. Origem do Registro */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Origem do Cadastro</label>
              <select
                value={draftFiltros.origemRegistro}
                onChange={(e) =>
                  setDraftFiltros((prev) => ({
                    ...prev,
                    origemRegistro: e.target.value as any,
                  }))
                }
                className="w-full text-xs bg-gray-50 hover:bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="todos">Todos (Base + Outros Contatos)</option>
                <option value="cliente">Base de Clientes</option>
                <option value="outro_contato">Outros Contatos</option>
              </select>
            </div>
          </div>

          {/* Rodapé com botões de Aplicar e Limpar filtros */}
          <SheetFooter className="p-4 border-t border-gray-100 bg-[#F8FAF9]/80 flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLimparFiltros}
              className="h-9 px-3 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold"
            >
              <FilterX className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Limpar filtros
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleAplicarFiltros}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Aplicar filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 4. Modal Cadastro de Novo Cliente */}
      <ModalCadastroClienteFornecedor
        isOpen={isModalNovoOpen}
        onClose={() => setIsModalNovoOpen(false)}
        tipoEntidade="cliente"
        onSubmit={handleSalvarNovoCliente}
      />

      {/* 5. Modal Mensagem WhatsApp em Massa */}
      <ModalMensagemWhatsAppMassa
        open={isModalMensagemMassaOpen}
        onOpenChange={setIsModalMensagemMassaOpen}
        destinatariosIniciais={destinatariosMensagemMassa}
      />

      {/* 6. Modal Mesclar Clientes */}
      <ModalMesclarClientes
        isOpen={isModalMesclarOpen}
        onClose={() => setIsModalMesclarOpen(false)}
        clientesIniciais={clientesSelecionadosParaMesclar ?? []}
        todosClientes={clientes ?? []}
        onConfirmarMesclagem={async (opcoes) => {
          await mesclarClientes(opcoes)
          setSelectedIds([])
          setIsModalMesclarOpen(false)
          toast({
            title: 'Clientes mesclados',
            description: 'Os clientes foram unificados com sucesso.',
          })
        }}
      />
    </div>
  )
}
