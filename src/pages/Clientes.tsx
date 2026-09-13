import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Eye,
  MapPin,
  Zap,
  Users,
  Loader2,
  MessageSquare,
  Plus,
  Building2,
  User,
  Upload,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownZA,
  Filter,
  X,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
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
import {
  ModalCadastroClienteFornecedor,
  DadosCadastroForm,
} from '@/components/ModalCadastroClienteFornecedor'

export type SortField = 'nome' | 'origem' | 'produto' | 'cidade' | 'potencia' | 'valor' | 'status'
export type SortDirection = 'asc' | 'desc'

export default function Clientes() {
  const navigate = useNavigate()
  const { clientes, isLoading, openFichaCliente, addCliente, updateClienteStatus, removeCliente } =
    useClientes()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false)
  const [clienteParaExcluir, setClienteParaExcluir] = useState<{ id: string; nome: string } | null>(
    null,
  )
  const [isDeletingCliente, setIsDeletingCliente] = useState(false)

  // Requisito 2: Ordenação alfabética por padrão (A-Z respeitando pt-BR)
  const [sortField, setSortField] = useState<SortField>('nome')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Requisito 3: Filtros por coluna na primeira linha da tabela
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos')
  const [filtroCidade, setFiltroCidade] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroProduto, setFiltroProduto] = useState<string>('todos')

  // Mapear antecipadamente a origem de cada cliente para performance
  const clientesComOrigem = useMemo(() => {
    return clientes.map((c) => ({
      ...c,
      origemInfo: identificarOrigemCliente(c),
    }))
  }, [clientes])

  // Valores distintos presentes na base para os filtros de coluna
  const distinctOrigens = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>()
    clientesComOrigem.forEach((c) => {
      const key = c.origemInfo.label
      const cur = map.get(key)
      if (cur) {
        cur.count += 1
      } else {
        map.set(key, { label: key, count: 1 })
      }
    })
    return Array.from(map.entries())
      .map(([key, v]) => ({ value: key, label: v.label, count: v.count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [clientesComOrigem])

  const distinctCidades = useMemo(() => {
    const map = new Map<string, number>()
    clientesComOrigem.forEach((c) => {
      const cidade = (c.cidade || '').trim() || 'Não informada'
      map.set(cidade, (map.get(cidade) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([cidade, count]) => ({ value: cidade, label: cidade, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [clientesComOrigem])

  const distinctStatuses = useMemo(() => {
    const map = new Map<string, number>()
    // Garantir que todos os status cadastrais padrão estejam mapeados mesmo se contagem for 0
    const padroes = [
      'Novo Lead',
      'Levantamento',
      'Orçamento',
      'Negociação',
      'Fechado',
      'Contato Futuro',
      'Perdido',
    ]
    padroes.forEach((p) => map.set(p, 0))

    clientesComOrigem.forEach((c) => {
      const status = (c.status || '').trim() || 'Outro'
      map.set(status, (map.get(status) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([status, count]) => ({ value: status, label: status, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [clientesComOrigem])

  const distinctProdutos = useMemo(() => {
    const map = new Map<string, number>()
    clientesComOrigem.forEach((c) => {
      const prod = (c.produto || '').trim() || 'Energia Solar'
      map.set(prod, (map.get(prod) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([prod, count]) => ({ value: prod, label: prod, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [clientesComOrigem])

  // Contagem de filtros ativos
  const hasActiveColumnFilters =
    filtroOrigem !== 'todos' ||
    filtroCidade !== 'todos' ||
    filtroStatus !== 'todos' ||
    filtroProduto !== 'todos'

  const activeFiltersCount = [
    filtroOrigem !== 'todos',
    filtroCidade !== 'todos',
    filtroStatus !== 'todos',
    filtroProduto !== 'todos',
    Boolean(searchTerm.trim()),
  ].filter(Boolean).length

  const handleLimparTodosFiltros = () => {
    setSearchTerm('')
    setFiltroOrigem('todos')
    setFiltroCidade('todos')
    setFiltroStatus('todos')
    setFiltroProduto('todos')
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

  // Filtragem combinada (Search + Filtros de Coluna com AND) e Ordenação
  const processedClientes = useMemo(() => {
    // 1. Filtragem
    const filtered = clientesComOrigem.filter((c) => {
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
          c.origemInfo.label.toLowerCase().includes(lower)

        if (!matchesSearch) return false
      }

      // Filtro Coluna Origem
      if (filtroOrigem !== 'todos') {
        if (c.origemInfo.label !== filtroOrigem) return false
      }

      // Filtro Coluna Cidade
      if (filtroCidade !== 'todos') {
        const cid = (c.cidade || '').trim() || 'Não informada'
        if (cid !== filtroCidade) return false
      }

      // Filtro Coluna Status
      if (filtroStatus !== 'todos') {
        const st = (c.status || '').trim() || 'Outro'
        if (st !== filtroStatus) return false
      }

      // Filtro Coluna Produto
      if (filtroProduto !== 'todos') {
        const pr = (c.produto || '').trim() || 'Energia Solar'
        if (pr !== filtroProduto) return false
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
    clientesComOrigem,
    searchTerm,
    filtroOrigem,
    filtroCidade,
    filtroStatus,
    filtroProduto,
    sortField,
    sortDirection,
  ])

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
      valor_estimado: 25000,
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
    <div className="space-y-5">
      {/* Top Bar with Search & Adicionar Novo em Destaque */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Base de Clientes
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {processedClientes.length} de {clientes.length} clientes
            </span>
            {sortField === 'nome' && sortDirection === 'asc' && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 flex items-center gap-1">
                <ArrowUpAZ className="w-3.5 h-3.5 text-emerald-600" />
                Ordem Alfabética (A→Z)
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Total de {clientes.length} clientes cadastrados na região norte do RS e oeste de SC (PF
            e PJ)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input with instant filter */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nome, CPF/CNPJ, cidade, origem..."
              className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botão Importar Planilha e Adicionar Novo */}
          <button
            type="button"
            onClick={() => navigate('/importar-clientes')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-sm font-bold rounded-xl transition-all shrink-0 cursor-pointer"
            title="Importar do Pipedrive ou Conta Azul"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>Importar Planilha</span>
          </button>

          {/* Botão Adicionar Novo em Destaque no Topo */}
          <button
            type="button"
            onClick={() => setIsModalNovoOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Adicionar Novo</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Rápida / Mobile e Indicador de Filtros Ativos */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              Filtros por Coluna:
            </span>

            {/* Ordenação rápida */}
            <button
              type="button"
              onClick={() => handleSortToggle('nome')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                sortField === 'nome'
                  ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
              title="Alternar ordenação alfabética"
            >
              {sortField === 'nome' && sortDirection === 'asc' ? (
                <ArrowUpAZ className="w-3.5 h-3.5 text-emerald-700" />
              ) : sortField === 'nome' && sortDirection === 'desc' ? (
                <ArrowDownZA className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span>
                Nome {sortField === 'nome' ? (sortDirection === 'asc' ? '(A→Z)' : '(Z→A)') : ''}
              </span>
            </button>

            {hasActiveColumnFilters && (
              <button
                type="button"
                onClick={handleLimparTodosFiltros}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                title="Limpar todos os filtros aplicados"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar Filtros ({activeFiltersCount})
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-1.5 self-end sm:self-auto">
            <span>Mostrando</span>
            <strong className="text-gray-800 font-bold">{processedClientes.length}</strong>
            <span>de</span>
            <strong className="text-gray-800 font-bold">{clientes.length}</strong>
            <span>clientes</span>
          </div>
        </div>

        {/* Linha de Seletores (Dropdowns de Colunas): Responsivo para Mobile e Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100">
          {/* 1. Origem */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Origem / Importação
            </label>
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors ${
                filtroOrigem !== 'todos'
                  ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200'
              }`}
            >
              <option value="todos">Todas as Origens ({clientes.length})</option>
              {distinctOrigens.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({o.count})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Cidade */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Cidade
            </label>
            <select
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors ${
                filtroCidade !== 'todos'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200'
              }`}
            >
              <option value="todos">Todas as Cidades ({clientes.length})</option>
              {distinctCidades.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({c.count})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Comercial */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Status Comercial
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors ${
                filtroStatus !== 'todos'
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200'
              }`}
            >
              <option value="todos">Todos os Status ({clientes.length})</option>
              {distinctStatuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} ({s.count})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Produto */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Produto
            </label>
            <select
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors ${
                filtroProduto !== 'todos'
                  ? 'bg-purple-50 text-purple-900 border-purple-300 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200'
              }`}
            >
              <option value="todos">Todos os Produtos ({clientes.length})</option>
              {distinctProdutos.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} ({p.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table / Cards */}
      {processedClientes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
          <p className="text-sm">Nenhum cliente encontrado com os filtros aplicados.</p>
          {(searchTerm || hasActiveColumnFilters) && (
            <button
              type="button"
              onClick={handleLimparTodosFiltros}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Busca e Filtros</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View com Filtros e Ordenação nos Cabeçalhos */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              {/* LINHA 1 DE CABEÇALHO: Títulos das Colunas com Ordenação */}
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  {/* Nome */}
                  <th
                    onClick={() => handleSortToggle('nome')}
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
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

                  {/* Origem */}
                  <th
                    onClick={() => handleSortToggle('origem')}
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
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

                  {/* Produto */}
                  <th
                    onClick={() => handleSortToggle('produto')}
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Produto</span>
                      {sortField === 'produto' && (
                        <span className="text-emerald-700 font-bold">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Cidade */}
                  <th
                    onClick={() => handleSortToggle('cidade')}
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
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
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
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
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
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

                  {/* Status Comercial */}
                  <th
                    onClick={() => handleSortToggle('status')}
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
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

                {/* LINHA 2 DO CABEÇALHO: Filtros por Coluna Diretos na Primeira Linha */}
                <tr className="bg-emerald-50/30 border-b border-gray-200/90 text-normal lowercase">
                  {/* Busca Rápida por Nome */}
                  <th className="py-2 px-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filtrar nome..."
                        className="w-full text-xs font-normal px-2 py-1 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-1.5 top-1.5 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* Filtro Dropdown: Origem */}
                  <th className="py-2 px-3">
                    <select
                      value={filtroOrigem}
                      onChange={(e) => setFiltroOrigem(e.target.value)}
                      className={`w-full text-xs px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                        filtroOrigem !== 'todos'
                          ? 'bg-blue-50 text-blue-900 border-blue-400 font-bold'
                          : 'bg-white text-gray-700 border-gray-200 font-normal'
                      }`}
                      title="Filtrar por Origem"
                    >
                      <option value="todos">Todas origens</option>
                      {distinctOrigens.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.count})
                        </option>
                      ))}
                    </select>
                  </th>

                  {/* Filtro Dropdown: Produto */}
                  <th className="py-2 px-3">
                    <select
                      value={filtroProduto}
                      onChange={(e) => setFiltroProduto(e.target.value)}
                      className={`w-full text-xs px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                        filtroProduto !== 'todos'
                          ? 'bg-purple-50 text-purple-900 border-purple-400 font-bold'
                          : 'bg-white text-gray-700 border-gray-200 font-normal'
                      }`}
                      title="Filtrar por Produto"
                    >
                      <option value="todos">Todos produtos</option>
                      {distinctProdutos.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label} ({p.count})
                        </option>
                      ))}
                    </select>
                  </th>

                  {/* Filtro Dropdown: Cidade */}
                  <th className="py-2 px-3">
                    <select
                      value={filtroCidade}
                      onChange={(e) => setFiltroCidade(e.target.value)}
                      className={`w-full text-xs px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                        filtroCidade !== 'todos'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold'
                          : 'bg-white text-gray-700 border-gray-200 font-normal'
                      }`}
                      title="Filtrar por Cidade"
                    >
                      <option value="todos">Todas cidades</option>
                      {distinctCidades.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label} ({c.count})
                        </option>
                      ))}
                    </select>
                  </th>

                  {/* Potência (placeholder informativo) */}
                  <th className="py-2 px-3 text-[11px] text-gray-400 font-normal italic">kWp</th>

                  {/* Valor (placeholder informativo) */}
                  <th className="py-2 px-3 text-[11px] text-gray-400 font-normal italic">R$</th>

                  {/* Filtro Dropdown: Status */}
                  <th className="py-2 px-3">
                    <select
                      value={filtroStatus}
                      onChange={(e) => setFiltroStatus(e.target.value)}
                      className={`w-full text-xs px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                        filtroStatus !== 'todos'
                          ? 'bg-amber-50 text-amber-900 border-amber-400 font-bold'
                          : 'bg-white text-gray-700 border-gray-200 font-normal'
                      }`}
                      title="Filtrar por Status"
                    >
                      <option value="todos">Todos status</option>
                      {distinctStatuses.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label} ({s.count})
                        </option>
                      ))}
                    </select>
                  </th>

                  {/* Ação: Botão Limpar se algum filtro estiver ativo */}
                  <th className="py-2 px-3 text-right">
                    {hasActiveColumnFilters && (
                      <button
                        type="button"
                        onClick={handleLimparTodosFiltros}
                        className="text-[11px] font-semibold text-gray-500 hover:text-red-600 underline inline-flex items-center gap-0.5"
                        title="Limpar todos os seletores"
                      >
                        <X className="w-3 h-3" />
                        Limpar
                      </button>
                    )}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {processedClientes.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openFichaCliente(c.id)}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                  >
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
                        {c.cpf && <span className="text-gray-600 font-medium">CPF: {c.cpf}</span>}
                        {c.whatsapp ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            {c.whatsapp}
                          </span>
                        ) : c.telefone ? (
                          <span>{c.telefone}</span>
                        ) : null}
                        {c.uc && <span>• UC: {c.uc}</span>}
                      </div>
                    </td>

                    {/* Origem / Importação (Requisito 1) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <OrigemClienteBadge origemInfo={c.origemInfo} />
                    </td>

                    {/* Produto */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <ProductBadge produto={c.produto || 'Energia Solar'} />
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

                    {/* Status Comercial */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {processedClientes.map((c) => (
              <div
                key={c.id}
                onClick={() => openFichaCliente(c.id)}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-gray-900 text-sm">{c.nome}</h4>
                      {c.tipo_pessoa === 'juridica' || c.cnpj ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          PJ
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          PF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono">
                      {c.cnpj ? `CNPJ: ${c.cnpj}` : c.cpf ? `CPF: ${c.cpf}` : `UC: ${c.uc || '-'}`}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {/* Badge de Origem no Mobile Card */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 text-[11px]">Origem:</span>
                    <OrigemClienteBadge origemInfo={c.origemInfo} />
                  </div>
                  <ProductBadge produto={c.produto || 'Energia Solar'} size="sm" />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{c.cidade || 'Não informada'}</span>
                  </div>
                  <div className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {c.potencia_kwp} kWp
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-gray-900 text-sm">
                    {formatCurrency(c.valor_estimado)}
                  </span>
                  <div className="flex items-center gap-1.5">
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
                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 px-2.5 py-1 rounded-md shadow-2xs"
                        title="Reativar cliente"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reativar
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openFichaCliente(c.id, 'whatsapp')
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openFichaCliente(c.id)
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ficha
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setClienteParaExcluir({ id: c.id, nome: c.nome })
                      }}
                      className="inline-flex items-center p-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 hover:text-red-700"
                      title={`Excluir cliente ${c.nome}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sr-only">Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de Cadastro Unificado PF/PJ com Consulta CNPJ */}
      <ModalCadastroClienteFornecedor
        isOpen={isModalNovoOpen}
        onClose={() => setIsModalNovoOpen(false)}
        tipoEntidade="cliente"
        onSubmit={handleSalvarCliente}
      />

      {/* Confirmação Segura de Exclusão de Cliente */}
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
              <strong className="text-gray-900 font-semibold">{clienteParaExcluir?.nome}</strong>?
              Esta ação é irreversível e excluirá todas as atividades, propostas, orçamentos e
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
    </div>
  )
}
