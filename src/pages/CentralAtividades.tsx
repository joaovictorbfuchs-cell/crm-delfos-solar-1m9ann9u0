import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ListFilter,
  Calendar,
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
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatDate } from '@/lib/formatters'
import {
  carregarCentralAtividades,
  type CentralAtividadeItem,
  type CentralAtividadeFonte,
  type CentralAtividadesFiltros,
} from '@/services/centralAtividadesService'

const ITEMS_PER_PAGE = 25

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

  // Estado dos filtros combináveis (AND)
  const [filtros, setFiltros] = useState<CentralAtividadesFiltros>({
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
      // 1. Filtro por tipo de atividade / fonte
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
    if (filtros.tipoFonte && filtros.tipoFonte !== 'todos') count++
    if (filtros.status && filtros.status !== 'todos') count++
    if (filtros.responsavel && filtros.responsavel !== 'todos') count++
    if (filtros.dataInicio) count++
    if (filtros.dataFim) count++
    if (filtros.buscaTexto && filtros.buscaTexto.trim() !== '') count++
    return count
  }, [filtros])

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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header da Tela */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                Central de Atividades
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Visão consolidada de manutenções, ordens de serviço, serviços avulsos, linha do
                tempo e anomalias
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs text-gray-500 font-medium">
            <span className="font-bold text-gray-900">{filteredItems.length}</span> registros
            encontrados
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Atualizar lista de atividades"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`}
            />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Painel de Filtros Combináveis (AND) */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-emerald-600" />
            <span className="text-xs sm:text-sm font-bold text-gray-800">
              Filtros Avançados Combináveis
            </span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

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

        {/* Grade de Controles de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* A. Tipo de Atividade / Fonte */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Tipo de Atividade
            </label>
            <select
              value={filtros.tipoFonte || 'todos'}
              onChange={(e) => handleFiltroChange('tipoFonte', e.target.value)}
              className="w-full text-xs bg-gray-50/80 hover:bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="todos">Todos os tipos ({allItems.length})</option>
              {tiposDisponiveis.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.count})
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

      {/* 3. Lista Unificada de Atividades */}
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
              Nenhum registro corresponde aos filtros selecionados. Experimente alterar ou limpar os
              filtros no painel acima.
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
                    <th className="py-3 px-4">Tipo de Atividade</th>
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
                      {/* Tipo de Atividade */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getFonteBadge(item.fonte)}
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
                          <div className="font-semibold text-gray-800 truncate" title={item.titulo}>
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
                    <div>{getFonteBadge(item.fonte)}</div>
                    <div>{getStatusBadge(item.status)}</div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-900 leading-snug">{item.titulo}</h4>
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
                        <User className="w-3 h-3 text-gray-400" />
                        {item.responsavel}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                        <Calendar className="w-3 h-3 text-gray-400" />
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
                de <span className="font-bold text-gray-900">{filteredItems.length}</span> registros
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
    </div>
  )
}
