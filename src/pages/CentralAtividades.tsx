import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ListFilter,
  Calendar,
  CalendarDays,
  CalendarRange,
  User,
  Building2,
  Sun,
  Wrench,
  AlertTriangle,
  Clock,
  Search,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Layers,
  CheckCircle2,
  Sparkles,
  ClipboardList,
  Info,
  Plus,
  MessageSquare,
  ListTodo,
  Briefcase,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/formatters'
import {
  carregarCentralAtividades,
  determinarCategoriaAtividade,
  type CentralAtividadeItem,
  type CentralAtividadeFonte,
  type CentralAtividadesFiltros,
  type CategoriaContagemItem,
} from '@/services/centralAtividadesService'
import { AtividadesCalendario } from '@/components/AtividadesCalendario'
import { ModalNovaAtividade } from '@/components/ModalNovaAtividade'
import { ModalDisparoMensagensMassa } from '@/components/ModalDisparoMensagensMassa'
import type { Atividade, AtividadeCategoriaId, AtividadeStatus } from '@/types/crm'

const ITEMS_PER_PAGE = 25

type CentralViewMode = 'tabela' | 'calendario'

export default function CentralAtividadesPage() {
  const navigate = useNavigate()
  const { clientes, openFichaCliente } = useClientes()

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
  const [modalMensagemMassaOpen, setModalMensagemMassaOpen] = useState(false)

  // Categorias disponíveis calculadas
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<CategoriaContagemItem[]>([
    { id: 'comercial', nome: 'Comerciais', count: 0 },
    { id: 'manutencao', nome: 'Manutenção', count: 0 },
    { id: 'administrativo_pos_venda', nome: 'Administrativas', count: 0 },
  ])

  // Estado dos filtros combináveis (AND)
  const [filtros, setFiltros] = useState<CentralAtividadesFiltros>({
    categoriaId: 'todos',
    tipoFonte: 'todos',
    status: 'todos',
    responsavel: 'todos',
    dataInicio: '',
    dataFim: '',
    buscaTexto: '',
  })

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)

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

  // Reset de página ao alterar qualquer filtro
  const handleFiltroChange = (key: keyof CentralAtividadesFiltros, value: string) => {
    setFiltros((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleLimparFiltros = () => {
    setFiltros({
      categoriaId: 'todos',
      tipoFonte: 'todos',
      status: 'todos',
      responsavel: 'todos',
      dataInicio: '',
      dataFim: '',
      buscaTexto: '',
    })
    setCurrentPage(1)
  }

  // Filtragem combinada AND
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // 1. Filtro por Categoria Oficial (Comerciais, Manutenção, Administrativas)
      if (filtros.categoriaId && filtros.categoriaId !== 'todos') {
        if (item.categoriaId !== filtros.categoriaId) return false
      }

      // 1.1. Filtro por tipo de atividade / fonte (se ativo)
      if (filtros.tipoFonte && filtros.tipoFonte !== 'todos') {
        if (item.fonte !== filtros.tipoFonte) return false
      }

      // 2. Filtro por status
      if (filtros.status && filtros.status !== 'todos') {
        if (item.status !== filtros.status && item.statusRaw !== filtros.status) {
          return false
        }
      }

      // 3. Filtro por responsável
      if (filtros.responsavel && filtros.responsavel !== 'todos') {
        if (item.responsavel.toLowerCase().trim() !== filtros.responsavel.toLowerCase().trim()) {
          return false
        }
      }

      // 4. Filtro por período de data (de/até)
      if (filtros.dataInicio) {
        const itemDateStr = item.data ? item.data.slice(0, 10) : ''
        if (itemDateStr < filtros.dataInicio) return false
      }
      if (filtros.dataFim) {
        const itemDateStr = item.data ? item.data.slice(0, 10) : ''
        if (itemDateStr > filtros.dataFim) return false
      }

      // 5. Busca textual livre (cliente, usina, título ou descrição)
      if (filtros.buscaTexto && filtros.buscaTexto.trim() !== '') {
        const termo = filtros.buscaTexto.toLowerCase().trim()
        const matchCliente = item.clienteNome?.toLowerCase().includes(termo)
        const matchUsina = item.usinaNome?.toLowerCase().includes(termo)
        const matchTitulo = item.titulo?.toLowerCase().includes(termo)
        const matchDescricao = item.descricao?.toLowerCase().includes(termo)
        const matchResponsavel = item.responsavel?.toLowerCase().includes(termo)
        if (!matchCliente && !matchUsina && !matchTitulo && !matchDescricao && !matchResponsavel) {
          return false
        }
      }

      return true
    })
  }, [allItems, filtros])

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filtros.categoriaId && filtros.categoriaId !== 'todos') count++
    if (filtros.tipoFonte && filtros.tipoFonte !== 'todos') count++
    if (filtros.status && filtros.status !== 'todos') count++
    if (filtros.responsavel && filtros.responsavel !== 'todos') count++
    if (filtros.dataInicio) count++
    if (filtros.dataFim) count++
    if (filtros.buscaTexto && filtros.buscaTexto.trim() !== '') count++
    return count
  }, [filtros])

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
    status: (it.statusRaw === 'concluida' || it.statusRaw === 'concluido' || it.status === 'Concluído' ? 'concluida' : 'pendente') as AtividadeStatus,
    titulo: it.titulo,
    descricao: it.descricao || '',
    data: it.data,
    created: it.data,
    updated: it.data,
    expand: it.clienteId ? {
      cliente_id: {
        id: it.clienteId,
        nome: it.clienteNome,
      } as any,
    } : undefined,
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

  // Renderizadores de badges visuais
  const getFonteBadge = (fonte: CentralAtividadeFonte) => {
    switch (fonte) {
      case 'atividade':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <ClipboardList className="w-3 h-3 text-blue-600" />
            Atividade CRM
          </span>
        )
      case 'ordem_servico':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Wrench className="w-3 h-3 text-amber-600" />
            Ordem de Serviço
          </span>
        )
      case 'manutencao':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Sun className="w-3 h-3 text-emerald-600" />
            Manutenção O&M
          </span>
        )
      case 'servico_avulso':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Sparkles className="w-3 h-3 text-purple-600" />
            Serviço Avulso
          </span>
        )
      case 'timeline_om':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
            <Clock className="w-3 h-3 text-cyan-600" />
            Linha do Tempo
          </span>
        )
      case 'anomalia_om':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Anomalia O&M
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-50 text-gray-800 border border-gray-200">
            Item
          </span>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concluído':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Concluído
          </span>
        )
      case 'Pendente / Agendado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente
          </span>
        )
      case 'Em Execução':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Wrench className="w-3 h-3 text-blue-600" />
            Em Execução
          </span>
        )
      case 'Cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-300 line-through">
            Cancelado
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* 1. Header Unificado com Navegação de Visão (Tabela vs Calendário) e Botões de Ação */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E7EB] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs shrink-0">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                  Central de Atividades
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Painel Único
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                Painel consolidado em 3 categorias: Comerciais, Manutenção e Administrativas
              </p>
            </div>
          </div>

          {/* Seletor Segmentado de Visão: Lista / Calendário */}
          <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-xl border border-gray-200/80 shadow-2xs text-xs font-semibold sm:ml-4">
            <button
              type="button"
              onClick={() => setViewMode('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'tabela'
                  ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lista / Fila</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'calendario'
                  ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>Calendário</span>
            </button>
          </div>
        </div>

        {/* Ações da Central: Atualizar + Disparar Mensagens (WhatsApp) + Nova Atividade */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="h-9 px-3 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold"
            title="Atualizar dados da Central"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`}
            />
            <span>Atualizar</span>
          </Button>

          <Button
            type="button"
            onClick={() => setModalMensagemMassaOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            title="Disparar mensagens em massa via WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Disparar Mensagens</span>
          </Button>

          <Button
            type="button"
            onClick={() => setModalNovaAtividadeOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            title="Criar nova atividade no CRM"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Atividade</span>
          </Button>
        </div>
      </div>

      {/* 2. Painel de Filtros (3 Categorias Oficiais + Responsável + Status + Busca + Datas) */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-emerald-600" />
            <span className="text-xs sm:text-sm font-bold text-gray-800">
              Filtro por Categorias Unificadas
            </span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">
              <strong className="text-gray-900">{filteredItems.length}</strong> de {allItems.length}{' '}
              atividades
            </span>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:underline font-semibold cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Grade de Controles de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* A. CATEGORIA UNIFICADA (As 3 oficiais do CRM: Comerciais, Manutenção, Administrativas) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center justify-between">
              <span>Tipo de Atividade</span>
              <span className="text-[10px] text-emerald-700 font-semibold lowercase">
                3 categorias
              </span>
            </label>
            <select
              value={filtros.categoriaId || 'todos'}
              onChange={(e) => handleFiltroChange('categoriaId', e.target.value)}
              className="w-full text-xs bg-emerald-50/40 hover:bg-emerald-50/70 border border-emerald-300 rounded-xl px-3 py-2.5 text-emerald-950 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer shadow-2xs"
            >
              <option value="todos">Todos os tipos ({allItems.length})</option>
              {categoriasDisponiveis.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome} ({cat.count})
                </option>
              ))}
            </select>
          </div>

          {/* B. Status */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Status
            </label>
            <select
              value={filtros.status || 'todos'}
              onChange={(e) => handleFiltroChange('status', e.target.value)}
              className="w-full text-xs bg-gray-50/80 hover:bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
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
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Responsável
            </label>
            <select
              value={filtros.responsavel || 'todos'}
              onChange={(e) => handleFiltroChange('responsavel', e.target.value)}
              className="w-full text-xs bg-gray-50/80 hover:bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="todos">Todos os responsáveis</option>
              {responsaveisDisponiveis.map((resp) => (
                <option key={resp} value={resp}>
                  {resp}
                </option>
              ))}
            </select>
          </div>

          {/* D. Busca rápida (Cliente, Usina, Termo) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Buscar Cliente ou Usina
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filtros.buscaTexto || ''}
                onChange={(e) => handleFiltroChange('buscaTexto', e.target.value)}
                placeholder="Nome do cliente ou usina..."
                className="w-full text-xs bg-gray-50/80 hover:bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Período de Datas (De / Até) */}
        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            Período da Atividade:
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-gray-400 text-[10px]">De:</span>
              <input
                type="date"
                value={filtros.dataInicio || ''}
                onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
                className="bg-transparent text-xs text-gray-800 focus:outline-none font-medium"
              />
            </div>

            <span className="text-gray-400 text-xs">até</span>

            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-gray-400 text-[10px]">Até:</span>
              <input
                type="date"
                value={filtros.dataFim || ''}
                onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
                className="bg-transparent text-xs text-gray-800 focus:outline-none font-medium"
              />
            </div>

            {(filtros.dataInicio || filtros.dataFim) && (
              <button
                type="button"
                onClick={() => {
                  setFiltros((prev) => ({ ...prev, dataInicio: '', dataFim: '' }))
                  setCurrentPage(1)
                }}
                className="text-xs text-gray-400 hover:text-gray-700 px-1"
                title="Limpar período de datas"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

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
              {/* Visualização Desktop (Tabela Completa) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Categoria / Tipo</th>
                      <th className="py-3 px-4">Cliente / Usina</th>
                      <th className="py-3 px-4">Título & Detalhes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Responsável</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleNavegarOriginal(item)}
                        className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                      >
                        {/* Categoria Oficial e Tipo de Atividade */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                item.categoriaId === 'manutencao'
                                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                                  : item.categoriaId === 'administrativo_pos_venda'
                                    ? 'bg-purple-50 text-purple-900 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              }`}
                            >
                              {item.categoriaId === 'manutencao' && (
                                <Wrench className="w-3 h-3 text-amber-600" />
                              )}
                              {item.categoriaId === 'administrativo_pos_venda' && (
                                <FileText className="w-3 h-3 text-purple-600" />
                              )}
                              {item.categoriaId === 'comercial' && (
                                <Briefcase className="w-3 h-3 text-emerald-600" />
                              )}
                              <span>{item.categoriaNome}</span>
                            </span>

                            <div className="text-[11px] font-medium text-gray-600 truncate max-w-[200px]">
                              {item.tipoAtividade}
                            </div>
                          </div>
                        </td>

                        {/* Cliente e Usina */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate max-w-[220px]">{item.clienteNome}</span>
                            </div>
                            {item.usinaNome && (
                              <div className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                                <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="truncate max-w-[220px]">{item.usinaNome}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Título e Descrição */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="space-y-0.5">
                            <div
                              className="font-semibold text-gray-800 truncate"
                              title={item.titulo}
                            >
                              {item.titulo}
                            </div>
                            {item.descricao && (
                              <div
                                className="text-[11px] text-gray-500 line-clamp-1"
                                title={item.descricao}
                              >
                                {item.descricao}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>

                        {/* Responsável */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{item.responsavel}</span>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{formatDate(item.data)}</span>
                          </div>
                        </td>

                        {/* Ação */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:underline">
                            Ver detalhes
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Visualização Mobile / Tablet (Cards Responsivos) */}
              <div className="lg:hidden divide-y divide-gray-100">
                {paginatedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNavegarOriginal(item)}
                    className="p-4 hover:bg-emerald-50/40 active:bg-emerald-50 transition-colors cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          item.categoriaId === 'manutencao'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : item.categoriaId === 'administrativo_pos_venda'
                              ? 'bg-purple-50 text-purple-900 border-purple-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {item.categoriaNome}
                      </span>
                      <div>{getStatusBadge(item.status)}</div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-900 leading-snug">
                        {item.titulo}
                      </h4>
                      {item.descricao && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                          {item.descricao}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-gray-100 text-[11px] text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-800">{item.clienteNome}</span>
                      </div>

                      {item.usinaNome && (
                        <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                          <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{item.usinaNome}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {item.responsavel}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(item.data)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        Ver no CRM
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

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

      {/* 5. Modal Disparo em Massa WhatsApp */}
      <ModalDisparoMensagensMassa
        open={modalMensagemMassaOpen}
        onOpenChange={setModalMensagemMassaOpen}
        segmentoInicial="todos"
        titulo="Disparar Mensagens em Massa via WhatsApp"
        descricao="Envie mensagens personalizadas via WhatsApp para clientes com registro automático na Central de Atividades."
      />
    </div>
  )
}
