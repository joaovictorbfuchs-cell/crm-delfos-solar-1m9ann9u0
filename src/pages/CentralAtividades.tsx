import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Filter,
  Calendar,
  CalendarDays,
  User,
  Building2,
  Sun,
  Wrench,
  AlertTriangle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Layers,
  Info,
  Plus,
  MessageSquare,
  ListTodo,
  Settings2,
  Briefcase,
  FileText,
  UserCheck,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
  Check,
} from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/formatters'
import {
  carregarCentralAtividades,
  determinarCategoriaAtividade,
  filtrarCentralAtividades,
  bulkAtualizarResponsavelCentral,
  bulkExcluirItensCentral,
  type CentralAtividadeItem,
  type CentralAtividadeFonte,
  type CentralAtividadesFiltros,
  type CategoriaContagemItem,
} from '@/services/centralAtividadesService'
import { AtividadesCalendario } from '@/components/AtividadesCalendario'
import { ModalNovaAtividade } from '@/components/ModalNovaAtividade'
import { ModalGerenciarAtividades } from '@/components/ModalGerenciarAtividades'
import type { Atividade, AtividadeCategoriaId, AtividadeStatus } from '@/types/crm'

const ITEMS_PER_PAGE = 25

type CentralViewMode = 'tabela' | 'calendario'

export default function CentralAtividadesPage() {
  const navigate = useNavigate()
  const { clientes, openFichaCliente, usuarios } = useClientes()

  // Estado dos dados brutos
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [allItems, setAllItems] = useState<CentralAtividadeItem[]>([])
  const [responsaveisDisponiveis, setResponsaveisDisponiveis] = useState<string[]>([])
  const [statusDisponiveis, setStatusDisponiveis] = useState<string[]>([])
  const [tiposDisponiveis, setTiposDisponiveis] = useState<
    { id: CentralAtividadeFonte; label: string; count: number }[]
  >([])

  // Estado de visão ativa (Tabela unificada vs Calendário semanal/mensal)
  const [viewMode, setViewMode] = useState<CentralViewMode>('tabela')

  // Modais
  const [modalNovaAtividadeOpen, setModalNovaAtividadeOpen] = useState(false)
  const [modalGerenciarAtividadesOpen, setModalGerenciarAtividadesOpen] = useState(false)

  // Drawer lateral de filtros combinados
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

  // Categorias disponíveis calculadas
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<CategoriaContagemItem[]>([
    { id: 'comercial', nome: 'Comerciais', count: 0 },
    { id: 'manutencao', nome: 'Manutenção', count: 0 },
    { id: 'administrativo_pos_venda', nome: 'Administrativas', count: 0 },
  ])

  // Estado dos filtros combináveis (AND) - aplicados
  const [filtros, setFiltros] = useState<CentralAtividadesFiltros>({
    categoriaId: 'todos',
    tipoEspecifico: 'todos',
    tipoFonte: 'todos',
    status: 'todos',
    responsavel: 'todos',
    dataInicio: '',
    dataFim: '',
    buscaTexto: '',
  })

  // Estado rascunho dos filtros dentro do Drawer
  const [draftFiltros, setDraftFiltros] = useState<CentralAtividadesFiltros>({
    categoriaId: 'todos',
    tipoEspecifico: 'todos',
    tipoFonte: 'todos',
    status: 'todos',
    responsavel: 'todos',
    dataInicio: '',
    dataFim: '',
    buscaTexto: '',
  })

  // Sincronizar rascunho ao abrir o drawer
  useEffect(() => {
    if (isFilterDrawerOpen) {
      setDraftFiltros(filtros)
    }
  }, [isFilterDrawerOpen, filtros])

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)

  // Estado de Seleção Múltipla e Ações em Lote
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isModalDefinirResponsavelOpen, setIsModalDefinirResponsavelOpen] = useState(false)
  const [novoResponsavelId, setNovoResponsavelId] = useState<string>('')
  const [isSavingResponsavel, setIsSavingResponsavel] = useState(false)

  const [isModalExcluirLoteOpen, setIsModalExcluirLoteOpen] = useState(false)
  const [textoConfirmacaoExclusao, setTextoConfirmacaoExclusao] = useState('')
  const [isDeletingLote, setIsDeletingLote] = useState(false)

  // Mapa local de clientes para enriquecimento rápido
  const clientesMap = useMemo(() => {
    const map = new Map()
    clientes.forEach((c) => map.set(c.id, c))
    return map
  }, [clientes])

  // Função para carregar os dados
  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await carregarCentralAtividades(clientesMap)
        setAllItems(data.items)
        setResponsaveisDisponiveis(data.responsaveisDisponiveis)
        setStatusDisponiveis(data.statusDisponiveis)
        if (data.categoriasDisponiveis) {
          setCategoriasDisponiveis(data.categoriasDisponiveis)
        }
        setTiposDisponiveis(data.tiposDisponiveis)
      } catch (err) {
        console.error('Erro ao carregar a Central de Atividades:', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [clientesMap],
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handleRecarregar = () => {
      fetchData(true)
    }
    window.addEventListener('delfos:recarregar-dados', handleRecarregar)
    return () => window.removeEventListener('delfos:recarregar-dados', handleRecarregar)
  }, [fetchData])

  // Aplicar rascunho de filtros
  const handleAplicarFiltros = () => {
    setFiltros(draftFiltros)
    setCurrentPage(1)
    setSelectedIds([])
    setIsFilterDrawerOpen(false)
  }

  const handleLimparFiltros = () => {
    const limpos: CentralAtividadesFiltros = {
      categoriaId: 'todos',
      tipoEspecifico: 'todos',
      tipoFonte: 'todos',
      status: 'todos',
      responsavel: 'todos',
      dataInicio: '',
      dataFim: '',
      buscaTexto: '',
    }
    setDraftFiltros(limpos)
    setFiltros(limpos)
    setCurrentPage(1)
    setSelectedIds([])
  }

  // Filtragem unificada através de filtrarCentralAtividades (com normalização semântica de status e tipos específicos)
  const filteredItems = useMemo(() => {
    return filtrarCentralAtividades(allItems, filtros)
  }, [allItems, filtros])

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filtros.categoriaId && filtros.categoriaId !== 'todos') count++
    if (filtros.tipoEspecifico && filtros.tipoEspecifico !== 'todos') count++
    if (filtros.tipoFonte && filtros.tipoFonte !== 'todos') count++
    if (filtros.status && filtros.status !== 'todos') count++
    if (filtros.responsavel && filtros.responsavel !== 'todos') count++
    if (filtros.dataInicio) count++
    if (filtros.dataFim) count++
    if (filtros.buscaTexto && filtros.buscaTexto.trim() !== '') count++
    return count
  }, [filtros])

  // Contagem de filtros rascunho ativos dentro do drawer
  const activeDraftFiltersCount = useMemo(() => {
    let count = 0
    if (draftFiltros.categoriaId && draftFiltros.categoriaId !== 'todos') count++
    if (draftFiltros.tipoEspecifico && draftFiltros.tipoEspecifico !== 'todos') count++
    if (draftFiltros.tipoFonte && draftFiltros.tipoFonte !== 'todos') count++
    if (draftFiltros.status && draftFiltros.status !== 'todos') count++
    if (draftFiltros.responsavel && draftFiltros.responsavel !== 'todos') count++
    if (draftFiltros.dataInicio) count++
    if (draftFiltros.dataFim) count++
    if (draftFiltros.buscaTexto && draftFiltros.buscaTexto.trim() !== '') count++
    return count
  }, [draftFiltros])

  // Usuários do sistema sintetizados a partir dos itens para o calendário
  const usuariosParaCalendario = useMemo(() => {
    const list: { id: string; name: string; email: string }[] = []
    const seen = new Set<string>()
    allItems.forEach((it) => {
      const respName = it.responsavel?.trim()
      const respId = it.responsavelId || respName
      if (respName && respName !== 'Não atribuído' && !seen.has(respName)) {
        seen.add(respName)
        list.push({
          id: respId,
          name: respName,
          email: `${respName.toLowerCase().replace(/\s+/g, '.')}@delfossolar.com.br`,
        })
      }
    })
    return list
  }, [allItems])

  // Converter itens da central para o formato Atividade esperado pelo AtividadesCalendario
  const atividadesParaCalendario = useMemo<Atividade[]>(() => {
    return filteredItems.map((it) => ({
      id: it.origemId || it.id,
      collectionId: 'atividades',
      collectionName: 'atividades',
      cliente_id: it.clienteId || '',
      responsavel_id: it.responsavelId || '',
      responsavel_nome: it.responsavel,
      autor: it.responsavel,
      tipo: (it.tipoId || it.subtipo || 'contato_ligacao') as any,
      categoria: it.categoriaId,
      status: (it.statusRaw === 'concluida' ||
      it.statusRaw === 'concluido' ||
      it.status === 'Concluído'
        ? 'concluida'
        : 'pendente') as AtividadeStatus,
      titulo: it.titulo,
      descricao: it.descricao || '',
      data: it.data,
      created: it.data,
      updated: it.data,
      expand: it.clienteId
        ? {
            cliente_id: {
              id: it.clienteId,
              nome: it.clienteNome,
            } as any,
          }
        : undefined,
    }))
  }, [filteredItems])

  const [usuarioCalendarioFiltro, setUsuarioCalendarioFiltro] = useState<string>('todos')

  // Callback para alternar status pelo calendário
  const handleToggleStatusCalendario = async (id: string, currentStatus: string) => {
    // Procura no ClientesContext se existir a função updateAtividadeStatus
    try {
      // Como a central integra múltiplas fontes, tenta atualizar pelo pb se for atividade padrão
      // e recarrega os dados da Central
      await fetchData(true)
    } catch (err) {
      console.warn('Não foi possível alterar status diretamente:', err)
    }
  }

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredItems.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredItems, currentPage])

  // Limpeza preventiva de IDs selecionados que não existam mais na lista filtrada
  const selectedFilteredItems = useMemo(() => {
    const set = new Set(selectedIds)
    return filteredItems.filter((it) => set.has(it.id))
  }, [filteredItems, selectedIds])

  // Lógica de seleção do checkbox "Selecionar Todos" (sobre o resultado filtrado)
  const isAllSelected =
    filteredItems.length > 0 && selectedFilteredItems.length === filteredItems.length
  const isSomeSelected =
    selectedFilteredItems.length > 0 && selectedFilteredItems.length < filteredItems.length

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map((it) => it.id))
    }
  }

  const handleToggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Lista de usuários reais cadastrados no projeto (coleção users)
  const listaUsuariosParaAtribuicao = useMemo(() => {
    return (usuarios || [])
      .filter((u) => u && u.id && u.name)
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        email: u.email,
      }))
  }, [usuarios])

  // Ação em Lote: Definir Responsável
  const handleConfirmarDefinirResponsavel = async () => {
    if (selectedFilteredItems.length === 0 || !novoResponsavelId) return
    setIsSavingResponsavel(true)

    try {
      const usuarioEncontrado = listaUsuariosParaAtribuicao.find((u) => u.id === novoResponsavelId)
      const respNome = usuarioEncontrado ? usuarioEncontrado.name : novoResponsavelId
      const respId = usuarioEncontrado ? usuarioEncontrado.id : ''

      const res = await bulkAtualizarResponsavelCentral(selectedFilteredItems, respId, respNome)

      setIsModalDefinirResponsavelOpen(false)
      setSelectedIds([])
      setNovoResponsavelId('')
      await fetchData(true)

      if (res.falhas > 0) {
        alert(
          `Responsável atualizado com sucesso em ${res.sucessos} atividades (${res.falhas} falhas).`,
        )
      }
    } catch (err) {
      console.error('Erro ao definir responsável em lote:', err)
      alert('Ocorreu um erro ao atualizar o responsável das atividades selecionadas.')
    } finally {
      setIsSavingResponsavel(false)
    }
  }

  // Ação em Lote: Apagar (Excluir) com confirmação segura digitando a quantidade
  const handleConfirmarExclusaoLote = async () => {
    if (selectedFilteredItems.length === 0) return
    if (textoConfirmacaoExclusao.trim() !== String(selectedFilteredItems.length)) {
      alert(`Por favor, digite "${selectedFilteredItems.length}" para confirmar a exclusão.`)
      return
    }

    setIsDeletingLote(true)
    try {
      const res = await bulkExcluirItensCentral(selectedFilteredItems)
      setIsModalExcluirLoteOpen(false)
      setSelectedIds([])
      setTextoConfirmacaoExclusao('')
      await fetchData(true)

      if (res.falhas > 0) {
        alert(`Excluídas ${res.sucessos} atividades com sucesso (${res.falhas} falhas).`)
      }
    } catch (err) {
      console.error('Erro ao excluir atividades em lote:', err)
      alert('Ocorreu um erro ao excluir as atividades selecionadas.')
    } finally {
      setIsDeletingLote(false)
    }
  }

  // Navegação para registro original
  const handleNavegarOriginal = (item: CentralAtividadeItem) => {
    if (item.clienteId && openFichaCliente) {
      // Abre a ficha detalhada do cliente na aba correspondente
      if (item.fonte === 'ordem_servico' || item.fonte === 'manutencao') {
        openFichaCliente(item.clienteId, 'om')
      } else {
        openFichaCliente(item.clienteId, 'historico')
      }
      return
    }

    if (item.rotaOriginal) {
      navigate(item.rotaOriginal)
    }
  }

  // Indicador visual de Status (bolinha colorida + legenda ao lado)
  const renderStatusDot = (status: string, statusRaw?: string) => {
    const s = (statusRaw || status || '').toLowerCase().trim()

    // 1. Concluído / Resolvido / Faturado / Finalizada
    if (
      status === 'Concluído' ||
      ['concluida', 'concluido', 'concluído', 'resolvido', 'faturado', 'finalizada'].includes(s)
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
          <span>Concluído</span>
        </span>
      )
    }

    // 2. Em Execução / Em Andamento / Análise
    if (
      status === 'Em Execução' ||
      [
        'em_andamento',
        'em andamento',
        'em execução',
        'em_execucao',
        'em análise',
        'em analise',
      ].includes(s)
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-800 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-200 shrink-0" />
          <span>Em Execução</span>
        </span>
      )
    }

    // 3. Cancelado / Rejeitado
    if (
      status === 'Cancelado' ||
      ['cancelada', 'cancelado', 'rejeitada', 'rejeitado'].includes(s)
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 line-through whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-gray-400 ring-2 ring-gray-200 shrink-0" />
          <span>Cancelado</span>
        </span>
      )
    }

    // 4. Registrado / Enviado
    if (
      status === 'Registrado / Enviado' ||
      ['enviado', 'dados_registrados', 'registrado'].includes(s)
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-800 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-cyan-500 ring-2 ring-cyan-200 shrink-0" />
          <span>Registrado</span>
        </span>
      )
    }

    // 5. Pendente / Agendado / Aberto (padrão)
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200 shrink-0" />
        <span>Pendente</span>
      </span>
    )
  }

  // Helper para obter nome curto da categoria (somente Administrativas, Comerciais e Manutenção)
  const getCategoriaCurta = (item: CentralAtividadeItem): string => {
    if (item.categoriaId === 'comercial') return 'Comerciais'
    if (item.categoriaId === 'manutencao') return 'Manutenção'
    if (item.categoriaId === 'administrativo_pos_venda') return 'Administrativas'
    if (item.categoriaNome?.toLowerCase().includes('comerc')) return 'Comerciais'
    if (item.categoriaNome?.toLowerCase().includes('manuten')) return 'Manutenção'
    if (item.categoriaNome?.toLowerCase().includes('admin')) return 'Administrativas'
    return item.categoriaNome || 'Comerciais'
  }

  return (
    <div className="space-y-5 w-full pb-12">
      {/* 1. Header Unificado com Navegação de Visão (Tabela vs Calendário) e Botões de Ação */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 flex-nowrap overflow-x-auto min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-nowrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-gray-900 tracking-tight whitespace-nowrap">
                  Central de Atividades
                </h1>
              </div>
            </div>
          </div>

          {/* Seletor Segmentado de Visão: Lista / Calendário (apenas ícones no estilo h-9 px-2.5 rounded-xl border com tooltip) */}
          <div className="inline-flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('tabela')}
              className={`h-9 px-2.5 rounded-xl border text-xs font-bold transition-all shadow-2xs inline-flex items-center justify-center cursor-pointer ${
                viewMode === 'tabela'
                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/30'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
              title="Visualização em Lista / Fila"
              aria-label="Visualização em Lista / Fila"
            >
              <ListTodo
                className={`w-4 h-4 ${viewMode === 'tabela' ? 'text-white' : 'text-emerald-600'}`}
              />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendario')}
              className={`h-9 px-2.5 rounded-xl border text-xs font-bold transition-all shadow-2xs inline-flex items-center justify-center cursor-pointer ${
                viewMode === 'calendario'
                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/30'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
              title="Visualização em Calendário"
              aria-label="Visualização em Calendário"
            >
              <CalendarDays
                className={`w-4 h-4 ${viewMode === 'calendario' ? 'text-white' : 'text-emerald-600'}`}
              />
            </button>
          </div>
        </div>

        {/* Ações da Central: Botão de Funil de Filtros + Contador + Atualizar + Gerenciar Atividades + Disparar Mensagens + Nova Atividade */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 justify-start md:justify-end overflow-x-visible">
          {/* Botão com Ícone de Funil para abrir Drawer lateral de Filtros */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
              activeFiltersCount > 0
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/40'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
            title="Abrir filtros da Central de Atividades"
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

          {/* Contador de resultado filtrado ao lado do botão de funil */}
          <div
            className="h-9 inline-flex items-center gap-1 px-2.5 sm:px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs shrink-0 whitespace-nowrap"
            title="Total de atividades filtradas sobre o total consolidado"
          >
            <span>
              <strong className="text-gray-900 font-extrabold">{filteredItems.length}</strong> de{' '}
              {allItems.length}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="h-9 px-2.5 sm:px-3 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold shrink-0 whitespace-nowrap"
            title="Atualizar dados da Central"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin text-emerald-600' : ''}`}
            />
            <span className="hidden xl:inline">Atualizar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setModalGerenciarAtividadesOpen(true)}
            className="h-9 px-2.5 sm:px-3 rounded-xl border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100/70 font-semibold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            title="Gerenciar padrões de atividades, checklists e links"
          >
            <Settings2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Gerenciar Atividades</span>
          </Button>

          <Button
            type="button"
            onClick={() => setModalNovaAtividadeOpen(true)}
            className="h-9 px-2.5 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            title="Criar nova atividade no CRM"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Atividade</span>
          </Button>
        </div>
      </div>

      {/* Barra de Ações em Lote quando há itens selecionados */}
      {selectedFilteredItems.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
              {selectedFilteredItems.length}
            </span>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                {selectedFilteredItems.length === 1
                  ? '1 atividade selecionada'
                  : `${selectedFilteredItems.length} atividades selecionadas`}
              </p>
              <p className="text-[11px] text-emerald-700">
                Ações em lote sobre o resultado filtrado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setNovoResponsavelId('')
                setIsModalDefinirResponsavelOpen(true)
              }}
              className="h-8 px-3 rounded-xl border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-100/60 font-semibold text-xs shadow-2xs inline-flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Definir responsável</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTextoConfirmacaoExclusao('')
                setIsModalExcluirLoteOpen(true)
              }}
              className="h-8 px-3 rounded-xl border-red-300 text-red-700 bg-white hover:bg-red-50 font-semibold text-xs shadow-2xs inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Apagar ({selectedFilteredItems.length})</span>
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

      {/* 3. Conteúdo da Central: Tabela / Fila OU Calendário Semanal/Mensal */}
      {viewMode === 'calendario' ? (
        <AtividadesCalendario
          atividades={atividadesParaCalendario}
          usuarios={usuariosParaCalendario}
          usuarioSelecionadoId={usuarioCalendarioFiltro}
          onSelectUsuario={setUsuarioCalendarioFiltro}
          onToggleStatus={handleToggleStatusCalendario}
          onOpenCliente={openFichaCliente}
          onAddAtividadeDia={() => setModalNovaAtividadeOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-medium">
                Carregando atividades consolidadas...
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Info className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-sm font-bold text-gray-800">Nenhuma atividade encontrada</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Nenhum registro corresponde aos filtros selecionados. Experimente alterar ou limpar
                os filtros no painel acima.
              </p>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleLimparFiltros}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                >
                  Limpar filtros aplicados
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Visualização Desktop (Tabela Completa Compacta e Sem Rolagem Horizontal) */}
              <TooltipProvider delayDuration={150}>
                <div className="hidden lg:block w-full overflow-hidden">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2 px-2.5 w-10 text-center">
                          <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            className="p-1 rounded text-gray-600 hover:text-emerald-700 transition-colors cursor-pointer"
                            title={
                              isAllSelected
                                ? 'Desmarcar todas'
                                : 'Selecionar todas as atividades filtradas'
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
                        <th className="py-2 px-2.5 w-[19%]">Categoria / Tipo</th>
                        <th className="py-2 px-2.5 w-[21%]">Cliente</th>
                        <th className="py-2 px-2.5 w-[29%]">Título</th>
                        <th className="py-2 px-1.5 w-[11%]">Status</th>
                        <th className="py-2 px-1.5 w-[12%]">Responsável</th>
                        <th className="py-2 px-2.5 w-[8%] text-right">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedItems.map((item) => {
                        const isSelected = selectedIds.includes(item.id)
                        const categoriaCurta = getCategoriaCurta(item)
                        return (
                          <tr
                            key={item.id}
                            onClick={() => handleNavegarOriginal(item)}
                            title="Clique para ver os detalhes da atividade"
                            className={`transition-colors cursor-pointer group ${
                              isSelected
                                ? 'bg-emerald-50/70 hover:bg-emerald-100/50'
                                : 'hover:bg-emerald-50/40'
                            }`}
                          >
                            {/* Checkbox de Seleção */}
                            <td
                              className="py-1.5 px-2.5 text-center"
                              onClick={(e) => handleToggleSelectOne(item.id, e)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>

                            {/* Categoria e Tipo unificados em tag pequena empilhados verticalmente */}
                            <td className="py-1.5 px-2.5">
                              <div className="flex flex-col items-start gap-0.5 min-w-0">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border ${
                                    item.categoriaId === 'manutencao'
                                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                                      : item.categoriaId === 'administrativo_pos_venda'
                                        ? 'bg-purple-50 text-purple-900 border-purple-200'
                                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                  }`}
                                >
                                  {item.categoriaId === 'manutencao' && (
                                    <Wrench className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                  )}
                                  {item.categoriaId === 'administrativo_pos_venda' && (
                                    <FileText className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                  )}
                                  {item.categoriaId === 'comercial' && (
                                    <Briefcase className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  )}
                                  <span>{categoriaCurta}</span>
                                </span>

                                {item.tipoAtividade && (
                                  <span
                                    className="text-[10px] leading-tight font-medium text-gray-500 truncate max-w-full"
                                    title={item.tipoAtividade}
                                  >
                                    {item.tipoAtividade}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Cliente (com Tooltip do nome da Usina no hover) */}
                            <td className="py-1.5 px-2.5">
                              {item.usinaNome ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                      <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                                        {item.clienteNome || 'Cliente não informado'}
                                      </span>
                                      <Sun className="w-3 h-3 text-amber-500 shrink-0 opacity-70 group-hover:opacity-100" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="text-xs bg-gray-900 text-white px-2.5 py-1.5 rounded-lg shadow-md max-w-xs"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>
                                        Usina: <strong>{item.usinaNome}</strong>
                                      </span>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div
                                  className="flex items-center gap-1.5 min-w-0"
                                  title={item.clienteNome || ''}
                                >
                                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                                    {item.clienteNome || 'Cliente não informado'}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Título com truncamento e tooltip do texto completo */}
                            <td className="py-1.5 px-2.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="font-medium text-gray-800 truncate cursor-pointer">
                                    {item.titulo}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg shadow-md max-w-sm"
                                >
                                  <p className="font-semibold">{item.titulo}</p>
                                  {item.descricao && (
                                    <p className="text-[11px] text-gray-300 mt-1 line-clamp-3">
                                      {item.descricao}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </td>

                            {/* Status: indicador visual bolinha colorida + legenda */}
                            <td className="py-1.5 px-1.5">
                              {renderStatusDot(item.status, item.statusRaw)}
                            </td>

                            {/* Responsável */}
                            <td className="py-1.5 px-1.5 text-gray-700">
                              <div
                                className="flex items-center gap-1 min-w-0"
                                title={item.responsavel}
                              >
                                <User className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="truncate text-[11px]">
                                  {item.responsavel || '-'}
                                </span>
                              </div>
                            </td>

                            {/* Data */}
                            <td className="py-1.5 px-2.5 text-right font-medium text-gray-600 text-[11px] whitespace-nowrap">
                              {formatDate(item.data)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </TooltipProvider>

              {/* Visualização Mobile / Tablet (Cards Responsivos com as mesmas regras) */}
              <TooltipProvider delayDuration={150}>
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
                          ? 'Desmarcar todas'
                          : `Selecionar todas (${filteredItems.length})`}
                      </span>
                    </button>
                    {selectedFilteredItems.length > 0 && (
                      <span className="text-[11px] font-bold text-emerald-800">
                        {selectedFilteredItems.length} selecionada(s)
                      </span>
                    )}
                  </div>

                  {paginatedItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id)
                    const categoriaCurta = getCategoriaCurta(item)
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNavegarOriginal(item)}
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
                              onClick={(e) => handleToggleSelectOne(item.id, e)}
                              onChange={() => {}}
                              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                            />
                            <div className="flex flex-col items-start gap-0.5 min-w-0">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border ${
                                  item.categoriaId === 'manutencao'
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : item.categoriaId === 'administrativo_pos_venda'
                                      ? 'bg-purple-50 text-purple-900 border-purple-200'
                                      : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                }`}
                              >
                                {categoriaCurta}
                              </span>
                              {item.tipoAtividade && (
                                <span className="text-[10px] text-gray-500 font-medium truncate max-w-full">
                                  {item.tipoAtividade}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            {renderStatusDot(item.status, item.statusRaw)}
                          </div>
                        </div>

                        <div>
                          <h4
                            className="text-xs font-bold text-gray-900 leading-snug truncate"
                            title={item.titulo}
                          >
                            {item.titulo}
                          </h4>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-gray-100 text-[11px] text-gray-600">
                          {/* Cliente com Usina no tooltip/title */}
                          <div
                            className="flex items-center gap-1.5"
                            title={item.usinaNome ? `Usina: ${item.usinaNome}` : undefined}
                          >
                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-800 truncate">
                              {item.clienteNome || 'Cliente não informado'}
                            </span>
                            {item.usinaNome && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded shrink-0">
                                Usina vinculada
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="inline-flex items-center gap-1 truncate text-gray-700">
                              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{item.responsavel || '-'}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium text-gray-600 shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              {formatDate(item.data)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TooltipProvider>

              {/* Paginação */}
              <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8FAF9]/60">
                <div className="text-xs text-gray-500">
                  Mostrando{' '}
                  <span className="font-bold text-gray-900">
                    {Math.min(filteredItems.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}
                  </span>{' '}
                  a{' '}
                  <span className="font-bold text-gray-900">
                    {Math.min(filteredItems.length, currentPage * ITEMS_PER_PAGE)}
                  </span>{' '}
                  de <span className="font-bold text-gray-900">{filteredItems.length}</span>{' '}
                  registros
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
      )}

      {/* 4. Modal Nova Atividade (Formulário com 3 Categorias e 2 etapas) */}
      <ModalNovaAtividade
        isOpen={modalNovaAtividadeOpen}
        onClose={() => {
          setModalNovaAtividadeOpen(false)
          fetchData(true)
        }}
      />

      {/* 5. Modal Gerenciar Atividades (Padrões, Checklists e Links) */}
      <ModalGerenciarAtividades
        open={modalGerenciarAtividadesOpen}
        onOpenChange={setModalGerenciarAtividadesOpen}
        onSuccess={() => fetchData(true)}
      />

      {/* 6. Painel Lateral (Drawer / Sheet) de Filtros Combináveis */}
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
                    Filtros da Central
                  </SheetTitle>
                  <SheetDescription className="text-xs text-gray-500">
                    Combine filtros para refinar as atividades (AND)
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

          {/* Corpo rolável com todos os filtros */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* A. Tipo de Atividade (3 Categorias Oficiais: Comerciais, Manutenção, Administrativas) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>Tipo de Atividade</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  3 categorias
                </span>
              </label>
              <select
                value={draftFiltros.categoriaId || 'todos'}
                onChange={(e) =>
                  setDraftFiltros((prev) => ({
                    ...prev,
                    categoriaId: e.target.value as AtividadeCategoriaId | 'todos',
                  }))
                }
                className="w-full text-xs bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2.5 text-emerald-950 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer shadow-2xs"
              >
                <option value="todos">Todas as categorias ({allItems.length})</option>
                {categoriasDisponiveis.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome} ({cat.count})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400">
                Categorias oficiais unificadas do CRM e O&M.
              </p>
            </div>

            {/* B. Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Status</label>
              <select
                value={draftFiltros.status || 'todos'}
                onChange={(e) =>
                  setDraftFiltros((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full text-xs bg-gray-50 hover:bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="todos">Todos os status</option>
                {statusDisponiveis.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* C. Responsável */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Responsável</label>
              <select
                value={draftFiltros.responsavel || 'todos'}
                onChange={(e) =>
                  setDraftFiltros((prev) => ({
                    ...prev,
                    responsavel: e.target.value,
                  }))
                }
                className="w-full text-xs bg-gray-50 hover:bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="todos">Todos os responsáveis</option>
                {responsaveisDisponiveis.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>

            {/* D. Buscar Cliente ou Usina */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Buscar Cliente ou Usina</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={draftFiltros.buscaTexto || ''}
                  onChange={(e) =>
                    setDraftFiltros((prev) => ({
                      ...prev,
                      buscaTexto: e.target.value,
                    }))
                  }
                  placeholder="Nome do cliente, usina ou termo..."
                  className="w-full text-xs bg-gray-50 hover:bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* E. Período da Atividade (De / Até) */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Período da Atividade</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">
                    A partir de:
                  </span>
                  <input
                    type="date"
                    value={draftFiltros.dataInicio || ''}
                    onChange={(e) =>
                      setDraftFiltros((prev) => ({
                        ...prev,
                        dataInicio: e.target.value,
                      }))
                    }
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">Até:</span>
                  <input
                    type="date"
                    value={draftFiltros.dataFim || ''}
                    onChange={(e) =>
                      setDraftFiltros((prev) => ({
                        ...prev,
                        dataFim: e.target.value,
                      }))
                    }
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {(draftFiltros.dataInicio || draftFiltros.dataFim) && (
                <button
                  type="button"
                  onClick={() =>
                    setDraftFiltros((prev) => ({
                      ...prev,
                      dataInicio: '',
                      dataFim: '',
                    }))
                  }
                  className="text-[11px] text-gray-500 hover:text-red-600 underline font-medium"
                >
                  Limpar datas
                </button>
              )}
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

      {/* 7. Dialog de Ação em Lote: Definir Responsável */}
      <Dialog
        open={isModalDefinirResponsavelOpen}
        onOpenChange={(open) => {
          if (!isSavingResponsavel) setIsModalDefinirResponsavelOpen(open)
        }}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Definir Responsável em Lote
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Esta ação atualizará o campo de responsável de todas as{' '}
              <strong className="text-gray-900 font-extrabold">
                {selectedFilteredItems.length}
              </strong>{' '}
              atividades selecionadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Aviso sobre a alteração em lote:</p>
              <p>
                O responsável selecionado abaixo será atribuído imediatamente a{' '}
                <strong>{selectedFilteredItems.length} atividades</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Selecione o novo responsável:
              </label>
              <select
                value={novoResponsavelId}
                onChange={(e) => setNovoResponsavelId(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Escolha um responsável --</option>
                {listaUsuariosParaAtribuicao.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSavingResponsavel}
              onClick={() => setIsModalDefinirResponsavelOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSavingResponsavel || !novoResponsavelId}
              onClick={handleConfirmarDefinirResponsavel}
              className="text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isSavingResponsavel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Atualizando...
                </>
              ) : (
                `Confirmar (${selectedFilteredItems.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Dialog de Ação em Lote: Excluir (Apagar) com confirmação explícita digitando a quantidade */}
      <Dialog
        open={isModalExcluirLoteOpen}
        onOpenChange={(open) => {
          if (!isDeletingLote) setIsModalExcluirLoteOpen(open)
        }}
      >
        <DialogContent className="max-w-md bg-white border-red-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Excluir Atividades em Lote
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Você está prestes a excluir permanentemente{' '}
              <strong className="text-red-700 font-extrabold">
                {selectedFilteredItems.length}
              </strong>{' '}
              atividades selecionadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                Esta ação é irreversível!
              </p>
              <p>Os registros serão apagados do banco de dados e não poderão ser recuperados.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">
                Para confirmar, digite exatamente o número{' '}
                <strong className="text-red-600 font-extrabold">
                  {selectedFilteredItems.length}
                </strong>{' '}
                no campo abaixo:
              </label>
              <input
                type="text"
                value={textoConfirmacaoExclusao}
                onChange={(e) => setTextoConfirmacaoExclusao(e.target.value)}
                placeholder={`Digite ${selectedFilteredItems.length}`}
                className="w-full text-xs font-bold bg-white border border-red-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingLote}
              onClick={() => setIsModalExcluirLoteOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                isDeletingLote ||
                textoConfirmacaoExclusao.trim() !== String(selectedFilteredItems.length)
              }
              onClick={handleConfirmarExclusaoLote}
              className="text-xs rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeletingLote ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                `Excluir Definitivamente (${selectedFilteredItems.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
