import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Wrench,
  Cpu,
  Sun,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Shield,
  Zap,
  Layers,
  Sparkles,
  Info,
  FileText,
  ExternalLink,
  CheckCircle2,
  FileUp,
  AlertTriangle,
  Link as LinkIcon,
  Phone,
  Building2,
  Settings,
  ArrowUpDown,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Equipamento, TipoEquipamento, ConfiguracaoMonitoramento } from '@/types/equipamentos'
import type { Fornecedor } from '@/types/crm'
import {
  fetchEquipamentos,
  createEquipamento,
  updateEquipamento,
  deleteEquipamento,
  getFotoEquipamentoUrl,
  getDatasheetEquipamentoUrl,
  getDataloggerEquipamentoUrl,
  formatarPotenciaEquipamento,
  formatarPotenciaPorTipo,
  converterInputParaWatts,
  converterWattsParaInput,
  converterKwParaWatts,
  converterWattsParaKwString,
  getUnidadePorTipo,
  getRotuloCampoPotencia,
} from '@/services/equipamentosService'
import {
  fetchConfiguracoesMonitoramento,
  getProcedimentoMonitoramentoUrl,
} from '@/services/configuracoesMonitoramentoService'
import { fetchContagemUsoEquipamentosEmUsinas } from '@/services/usinaEquipamentosService'
import { fetchFornecedores } from '@/services/crmService'
import { ModalFormEquipamento } from '@/components/ModalFormEquipamento'
import { MonitoramentoConfigBadge } from '@/components/MonitoramentoConfigBadge'
import { AbaConfiguracoesMonitoramento } from '@/components/AbaConfiguracoesMonitoramento'
import { normalizarDigitosDestino } from '@/lib/resolverNumeroDestinoCliente'
import { aplicarPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
import { useAuth } from '@/contexts/AuthContext'
import { buildXlsxBuffer, downloadFileInBrowser, type XlsxSheet } from '@/lib/xlsxBuilderClient'

type TabFiltro = 'todos' | 'inversor' | 'modulo_fv' | 'outro' | 'configuracoes_monitoramento'
type CriterioOrdenacao = 'recentes' | 'marca_asc' | 'modelo_asc' | 'potencia_desc' | 'potencia_asc'

export function EquipamentosPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [configuracoesMonitoramento, setConfiguracoesMonitoramento] = useState<
    ConfiguracaoMonitoramento[]
  >([])
  const [contagemUsinas, setContagemUsinas] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [tabAtiva, setTabAtiva] = useState<TabFiltro>('todos')
  const [busca, setBusca] = useState<string>(() => searchParams.get('busca') || '')
  const [ordenacao, setOrdenacao] = useState<CriterioOrdenacao>('recentes')
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('todos')

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<Equipamento | null>(null)
  const [modalDeleteConfirmOpen, setModalDeleteConfirmOpen] = useState<boolean>(false)
  const [itemParaExcluir, setItemParaExcluir] = useState<Equipamento | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Sincronizar parâmetro de URL se mudar externamente
  useEffect(() => {
    const buscaUrl = searchParams.get('busca')
    if (buscaUrl !== null && buscaUrl !== busca) {
      setBusca(buscaUrl)
    }
  }, [searchParams])

  const carregar = async () => {
    setLoading(true)
    try {
      const [dataEq, dataForn, dataCfg, mapaUsinas] = await Promise.all([
        fetchEquipamentos(),
        fetchFornecedores(),
        fetchConfiguracoesMonitoramento(),
        fetchContagemUsoEquipamentosEmUsinas(),
      ])
      setEquipamentos(dataEq)
      setFornecedores(dataForn)
      setConfiguracoesMonitoramento(dataCfg)
      setContagemUsinas(mapaUsinas)
    } catch (err) {
      console.error('Erro ao carregar equipamentos:', err)
      toast.error('Erro ao carregar lista de equipamentos.')
    } finally {
      setLoading(false)
    }
  }

  const recarregarConfiguracoes = async () => {
    try {
      const dataCfg = await fetchConfiguracoesMonitoramento()
      setConfiguracoesMonitoramento(dataCfg)
    } catch (err) {
      console.error('Erro ao recarregar configurações:', err)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (item: Equipamento) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleOpenWhatsAppSuporte = (numero: string, marcaEq?: string, modeloEq?: string) => {
    const limpo = normalizarDigitosDestino(numero)
    if (!limpo || limpo.length < 10) {
      toast.warning('Número de telefone do suporte inválido.')
      return
    }
    const identificador = [marcaEq, modeloEq].filter(Boolean).join(' ').trim()
    const corpo = identificador
      ? `Olá! Preciso de suporte técnico sobre o equipamento ${identificador}.`
      : 'Olá! Preciso de suporte técnico sobre o equipamento Delfos Solar.'
    const msg = aplicarPrefixoMensagemManual(corpo, user?.name)
    window.open(`https://wa.me/${limpo}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleOpenDeleteConfirm = (item: Equipamento) => {
    setItemParaExcluir(item)
    setModalDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemParaExcluir) return
    try {
      setIsDeleting(true)
      await deleteEquipamento(itemParaExcluir.id)
      toast.success(`Equipamento "${itemParaExcluir.modelo}" removido com sucesso.`)
      setModalDeleteConfirmOpen(false)
      setItemParaExcluir(null)
      await carregar()
    } catch (err: any) {
      console.error('Erro ao excluir equipamento:', err)
      toast.error('Não foi possível excluir o equipamento. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Contagens para os tabs
  const contagens = useMemo(() => {
    const total = equipamentos.length
    const inversores = equipamentos.filter((e) => e.tipo === 'inversor').length
    const modulos = equipamentos.filter((e) => e.tipo === 'modulo_fv').length
    const outros = equipamentos.filter((e) => e.tipo === 'outro').length
    const configuracoes = configuracoesMonitoramento.length
    return { total, inversores, modulos, outros, configuracoes }
  }, [equipamentos, configuracoesMonitoramento])

  // Lista filtrada e ordenada
  const filtrados = useMemo(() => {
    const base = equipamentos.filter((item) => {
      // Filtro por tab
      if (tabAtiva !== 'todos' && item.tipo !== tabAtiva) {
        return false
      }
      // Filtro por fornecedor
      if (filtroFornecedor !== 'todos' && item.fornecedor_id !== filtroFornecedor) {
        return false
      }
      // Filtro por busca
      if (!busca.trim()) return true
      const term = busca.toLowerCase().trim()
      const matchMarca = item.marca?.toLowerCase().includes(term)
      const matchModelo = item.modelo?.toLowerCase().includes(term)
      const matchDescricao = item.descricao_padrao?.toLowerCase().includes(term)
      const matchPotenciaWatts = String(item.potencia_w).includes(term)
      const kwVal = item.potencia_w ? item.potencia_w / 1000 : 0
      const matchPotenciaKw =
        String(kwVal).includes(term) ||
        String(kwVal).replace('.', ',').includes(term) ||
        `${kwVal}kw`.includes(term.replace(/\s+/g, ''))
      return matchMarca || matchModelo || matchDescricao || matchPotenciaWatts || matchPotenciaKw
    })

    return base.sort((a, b) => {
      switch (ordenacao) {
        case 'marca_asc': {
          const compMarca = (a.marca || '').localeCompare(b.marca || '', 'pt-BR', {
            sensitivity: 'base',
          })
          if (compMarca !== 0) return compMarca
          return (a.modelo || '').localeCompare(b.modelo || '', 'pt-BR', { sensitivity: 'base' })
        }
        case 'modelo_asc':
          return (a.modelo || '').localeCompare(b.modelo || '', 'pt-BR', { sensitivity: 'base' })
        case 'potencia_desc':
          return (Number(b.potencia_w) || 0) - (Number(a.potencia_w) || 0)
        case 'potencia_asc':
          return (Number(a.potencia_w) || 0) - (Number(b.potencia_w) || 0)
        case 'recentes':
        default: {
          const dtA = a.created ? new Date(a.created).getTime() : 0
          const dtB = b.created ? new Date(b.created).getTime() : 0
          if (dtA !== dtB) return dtB - dtA
          return (b.id || '').localeCompare(a.id || '')
        }
      }
    })
  }, [equipamentos, tabAtiva, filtroFornecedor, busca, ordenacao])

  // Atualizar campo de busca e sincronizar URL de forma limpa
  const handleBuscaChange = (novoValor: string) => {
    setBusca(novoValor)
    const novosParams = new URLSearchParams(searchParams)
    if (novoValor.trim()) {
      novosParams.set('busca', novoValor.trim())
    } else {
      novosParams.delete('busca')
    }
    setSearchParams(novosParams, { replace: true })
  }

  // Exportar Excel (.xlsx) da lista filtrada atual
  const handleExportarExcel = () => {
    if (filtrados.length === 0) {
      toast.info('Não há equipamentos na lista filtrada para exportar.')
      return
    }

    try {
      const colWidths = [
        16, // Tipo
        22, // Marca
        30, // Modelo
        22, // Potência Nominal (Regra do Tipo: Placa em W, Inversor em kW)
        18, // Unidade
        18, // Potência (kW)
        18, // Potência (W)
        16, // Garantia (anos)
        28, // Fornecedor
        22, // Telefone Suporte
        36, // Datasheet (URL)
        36, // Datalogger (URL)
        46, // Descrição Padrão
        16, // Usinas Vinculadas
      ]

      const cabecalho = [
        'Tipo',
        'Marca',
        'Modelo',
        'Potência Nominal (por tipo)',
        'Unidade',
        'Potência (kW)',
        'Potência (W)',
        'Garantia (anos)',
        'Fornecedor',
        'Telefone Suporte',
        'Datasheet (URL)',
        'Datalogger (URL)',
        'Descrição Padrão',
        'Em uso em Usina(s)',
      ]

      const rows: (string | number)[][] = [cabecalho]

      filtrados.forEach((item) => {
        const tipoLabel =
          item.tipo === 'inversor' ? 'Inversor' : item.tipo === 'modulo_fv' ? 'Módulo FV' : 'Outro'

        const fornNome =
          item.expand?.fornecedor_id?.nome_empresa ||
          fornecedores.find((f) => f.id === item.fornecedor_id)?.nome_empresa ||
          ''

        const telSuporte =
          item.telefone_suporte_fornecedor ||
          item.expand?.fornecedor_id?.telefone_suporte ||
          item.expand?.fornecedor_id?.whatsapp ||
          item.expand?.fornecedor_id?.telefone ||
          ''

        const urlDatasheet = getDatasheetEquipamentoUrl(item) || ''
        const urlDatalogger = getDataloggerEquipamentoUrl(item) || ''
        const usinasCount = contagemUsinas[item.id] || 0
        const potW = Number(item.potencia_w) || 0
        const potKw = potW ? parseFloat((potW / 1000).toFixed(4)) : 0
        const unidade = getUnidadePorTipo(item.tipo)
        // Regra do usuário: Placa solar unitária SEMPRE em Watts (W), Inversor SEMPRE em kW
        const potenciaNominalValor = item.tipo === 'modulo_fv' ? potW : potKw

        rows.push([
          tipoLabel,
          item.marca || '',
          item.modelo || '',
          potenciaNominalValor,
          unidade,
          potKw,
          potW,
          item.garantia_anos !== undefined && item.garantia_anos !== null
            ? Number(item.garantia_anos)
            : '',
          fornNome,
          telSuporte,
          urlDatasheet,
          urlDatalogger,
          item.descricao_padrao || '',
          usinasCount,
        ])
      })

      const sheet: XlsxSheet = {
        name: 'Equipamentos',
        rows,
        colWidths,
      }

      const buffer = buildXlsxBuffer([sheet])
      const dataHoje = new Date().toISOString().slice(0, 10)
      const nomeArquivo = `catalogo-equipamentos-${dataHoje}.xlsx`
      downloadFileInBrowser(buffer, nomeArquivo)
      toast.success(`Planilha com ${filtrados.length} equipamento(s) exportada com sucesso!`)
    } catch (err) {
      console.error('Erro ao exportar equipamentos para Excel:', err)
      toast.error('Não foi possível gerar a planilha Excel. Tente novamente.')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Cadastro de Equipamentos
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Gerencie os inversores e módulos fotovoltaicos que alimentam as propostas comerciais
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={carregar}
            disabled={loading}
            className="p-2.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-gray-200 transition-colors shadow-2xs"
            title="Atualizar lista de equipamentos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportarExcel}
            disabled={filtrados.length === 0}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 hover:text-emerald-800 border border-gray-200 text-xs sm:text-sm font-semibold rounded-xl shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
            title="Exportar equipamentos filtrados para planilha Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all hover:shadow active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Equipamento</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo Delfos */}
      <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-emerald-950 space-y-1">
          <p className="font-bold text-sm text-[#166534]">
            Catálogo Integrado às Propostas Comerciais
          </p>
          <p className="text-emerald-800 leading-relaxed">
            Os dados cadastrados aqui (marca, modelo, potência em W para placas e em kW para
            inversores, descrição técnica e garantia em anos) são usados na geração de orçamentos e
            propostas comerciais fotovoltaicas da Delfos Solar. Mantenha as fotos e descrições
            padronizadas para uma apresentação profissional aos clientes.
          </p>
        </div>
      </div>

      {/* Barra de Filtros, Ordenação e Busca */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Tabs de Tipo */}
          <div className="inline-flex p-1 bg-gray-100 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setTabAtiva('todos')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tabAtiva === 'todos'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todos</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tabAtiva === 'todos'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {contagens.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva('inversor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tabAtiva === 'inversor'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>Inversores</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tabAtiva === 'inversor'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {contagens.inversores}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva('modulo_fv')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tabAtiva === 'modulo_fv'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>Módulos FV</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tabAtiva === 'modulo_fv'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {contagens.modulos}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva('outro')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tabAtiva === 'outro'
                  ? 'bg-white text-purple-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-purple-600" />
              <span>Outros</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tabAtiva === 'outro'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {contagens.outros}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva('configuracoes_monitoramento')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tabAtiva === 'configuracoes_monitoramento'
                  ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-emerald-300'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-emerald-600" />
              <span>Config. de Monitoramento</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tabAtiva === 'configuracoes_monitoramento'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {contagens.configuracoes}
              </span>
            </button>
          </div>

          {/* Busca e Totalizador */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72 md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
                placeholder="Buscar por marca, modelo, potência..."
                className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => handleBuscaChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap hidden sm:inline">
              Exibindo: <strong>{filtrados.length}</strong>
            </span>
          </div>
        </div>

        {/* Linha de Ordenação e Filtro por Fornecedor */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Fornecedor */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <label htmlFor="select-fornecedor-filtro" className="text-gray-500 font-medium">
                Fornecedor:
              </label>
              <select
                id="select-fornecedor-filtro"
                value={filtroFornecedor}
                onChange={(e) => setFiltroFornecedor(e.target.value)}
                className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-gray-200 bg-gray-50/60 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700"
              >
                <option value="todos">Todos os fornecedores</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_empresa}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Ordenação */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <label htmlFor="select-ordenacao" className="text-gray-500 font-medium">
                Ordenar por:
              </label>
              <select
                id="select-ordenacao"
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as CriterioOrdenacao)}
                className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-gray-200 bg-gray-50/60 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700"
              >
                <option value="recentes">Mais recentes (padrão)</option>
                <option value="marca_asc">Marca A-Z</option>
                <option value="modelo_asc">Modelo A-Z</option>
                <option value="potencia_desc">Maior potência</option>
                <option value="potencia_asc">Menor potência</option>
              </select>
            </div>
          </div>

          {(filtroFornecedor !== 'todos' || ordenacao !== 'recentes' || busca) && (
            <button
              type="button"
              onClick={() => {
                setFiltroFornecedor('todos')
                setOrdenacao('recentes')
                handleBuscaChange('')
              }}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
            >
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Se a tab ativa for Configurações de Monitoramento */}
      {tabAtiva === 'configuracoes_monitoramento' ? (
        <AbaConfiguracoesMonitoramento
          configuracoes={configuracoesMonitoramento}
          loading={loading}
          onRecarregar={async () => {
            await Promise.all([recarregarConfiguracoes(), carregar()])
          }}
        />
      ) : (
        <>
          {/* Lista / Grade de Cards */}
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-gray-500">
                Carregando catálogo de equipamentos...
              </p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3 border border-gray-200">
                {tabAtiva === 'inversor' ? (
                  <Cpu className="w-7 h-7 text-gray-400" />
                ) : tabAtiva === 'modulo_fv' ? (
                  <Sun className="w-7 h-7 text-gray-400" />
                ) : (
                  <Layers className="w-7 h-7 text-gray-400" />
                )}
              </div>
              <h3 className="text-base font-bold text-gray-800">Nenhum equipamento encontrado</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
                {busca
                  ? `Nenhum resultado corresponde à busca "${busca}". Tente outros termos.`
                  : 'Não há equipamentos cadastrados nesta categoria ainda.'}
              </p>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#15803D] shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Equipamento</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtrados.map((item) => {
                const fotoUrl = getFotoEquipamentoUrl(item)
                const isInversor = item.tipo === 'inversor'

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col group hover:shadow-md hover:border-emerald-300 transition-all duration-200"
                  >
                    {/* Cabeçalho Visual: Foto ou Placeholder Profissional */}
                    <div className="relative h-44 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden border-b border-gray-100">
                      {fotoUrl ? (
                        <img
                          src={fotoUrl}
                          alt={`${item.marca} ${item.modelo}`}
                          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-300 group-hover:text-emerald-500 transition-colors">
                          {isInversor ? (
                            <Cpu className="w-16 h-16 stroke-1 mb-1" />
                          ) : (
                            <Sun className="w-16 h-16 stroke-1 mb-1" />
                          )}
                          <span className="text-[11px] font-medium text-gray-400">
                            {isInversor ? 'Inversor Fotovoltaico' : 'Módulo Fotovoltaico'}
                          </span>
                        </div>
                      )}

                      {/* Badge de Tipo */}
                      <div className="absolute top-3 left-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                            isInversor
                              ? 'bg-blue-600 text-white'
                              : item.tipo === 'modulo_fv'
                                ? 'bg-amber-500 text-white'
                                : 'bg-purple-600 text-white'
                          }`}
                        >
                          {isInversor ? (
                            <Cpu className="w-3.5 h-3.5" />
                          ) : item.tipo === 'modulo_fv' ? (
                            <Sun className="w-3.5 h-3.5" />
                          ) : (
                            <Wrench className="w-3.5 h-3.5" />
                          )}
                          {isInversor
                            ? 'Inversor'
                            : item.tipo === 'modulo_fv'
                              ? 'Módulo FV'
                              : 'Outro'}
                        </span>
                      </div>

                      {/* Potência em Destaque */}
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-gray-900/80 text-white backdrop-blur-xs shadow-xs">
                          <Zap className="w-3 h-3 text-amber-300" />
                          {formatarPotenciaPorTipo(item.potencia_w, item.tipo)}
                        </span>
                      </div>
                    </div>

                    {/* Corpo do Card */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Marca e Modelo */}
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                          <span>{item.marca}</span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 leading-snug mt-0.5">
                          {item.modelo}
                        </h3>

                        {/* Metadados Técnicos: Garantia e Links */}
                        <div className="flex items-center flex-wrap gap-2 mt-2.5">
                          {item.garantia_anos !== undefined && item.garantia_anos !== null ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              <Shield className="w-3 h-3 text-emerald-600" />
                              Garantia: {item.garantia_anos}{' '}
                              {item.garantia_anos === 1 ? 'ano' : 'anos'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                              <Shield className="w-3 h-3 text-gray-300" />
                              Garantia não informada
                            </span>
                          )}

                          {/* Datasheet (link ou PDF) */}
                          {getDatasheetEquipamentoUrl(item) && (
                            <a
                              href={getDatasheetEquipamentoUrl(item)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 px-2.5 py-0.5 rounded-lg border border-emerald-300 transition-colors"
                              title="Abrir datasheet do equipamento"
                            >
                              <FileText className="w-3 h-3 text-emerald-700" />
                              <span>Datasheet</span>
                              <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-emerald-600" />
                            </a>
                          )}

                          {/* Item Anexado: Configuração de Monitoramento (mesmo formato visual do Datasheet) */}
                          {(() => {
                            // Buscar configuração vinculada via expand ou no catálogo
                            const cfgVinculada =
                              item.expand?.configuracao_monitoramento_id ||
                              configuracoesMonitoramento.find(
                                (c) => c.id === item.configuracao_monitoramento_id,
                              ) ||
                              (isInversor
                                ? configuracoesMonitoramento.find(
                                    (c) =>
                                      c.marca?.toLowerCase().trim() ===
                                      item.marca?.toLowerCase().trim(),
                                  )
                                : null)

                            if (!cfgVinculada) return null

                            return (
                              <MonitoramentoConfigBadge
                                configuracao={cfgVinculada}
                                rotulo="Config. de Monitoramento"
                                mostrarTipo
                              />
                            )
                          })()}

                          {/* Configurar Datalogger (URL direta legada caso exista e não tenha cfg vinculada) */}
                          {getDataloggerEquipamentoUrl(item) &&
                            !item.configuracao_monitoramento_id && (
                              <a
                                href={getDataloggerEquipamentoUrl(item)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100/70 hover:bg-blue-200/80 px-2.5 py-0.5 rounded-lg border border-blue-300 transition-colors"
                                title="Abrir página/link de configuração do datalogger"
                              >
                                <Settings className="w-3 h-3 text-blue-700" />
                                <span>Configurar Datalogger</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-blue-600" />
                              </a>
                            )}

                          {/* Contador de uso como ativo de usina */}
                          {Boolean(contagemUsinas[item.id]) && (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs"
                              title={`Este equipamento está vinculado como ativo em ${contagemUsinas[item.id]} usina(s)`}
                            >
                              <Building2 className="w-3 h-3 text-amber-600" />
                              <span>
                                Em uso em {contagemUsinas[item.id]}{' '}
                                {contagemUsinas[item.id] === 1 ? 'usina' : 'usinas'}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Bloco Fornecedor + Suporte */}
                        {(item.expand?.fornecedor_id || item.telefone_suporte_fornecedor) && (
                          <div className="mt-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                              <div className="truncate">
                                <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                                  Fornecedor / Suporte
                                </span>
                                <span className="font-semibold text-gray-800 truncate block text-xs">
                                  {item.expand?.fornecedor_id?.nome_empresa ||
                                    'Fornecedor cadastrado'}
                                </span>
                              </div>
                            </div>

                            {/* Botão Telefone / WhatsApp do Suporte */}
                            {(item.telefone_suporte_fornecedor ||
                              item.expand?.fornecedor_id?.telefone_suporte ||
                              item.expand?.fornecedor_id?.whatsapp ||
                              item.expand?.fornecedor_id?.telefone) && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {(() => {
                                  const tel =
                                    item.telefone_suporte_fornecedor ||
                                    item.expand?.fornecedor_id?.telefone_suporte ||
                                    item.expand?.fornecedor_id?.whatsapp ||
                                    item.expand?.fornecedor_id?.telefone ||
                                    ''
                                  return (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenWhatsAppSuporte(tel, item.marca, item.modelo)
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors"
                                      title={`Entrar em contato com o suporte: ${tel}`}
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{tel}</span>
                                    </button>
                                  )
                                })()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Descrição Padrão */}
                        <div className="mt-3">
                          {item.descricao_padrao ? (
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                              {item.descricao_padrao}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 italic">
                              Sem descrição técnica cadastrada.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rodapé do Card com Ações */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">ID: #{item.id.slice(-5)}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-200 hover:border-emerald-200"
                            title="Editar equipamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteConfirm(item)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir equipamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Criar / Editar Equipamento (reusável compartilhado) */}
      <ModalFormEquipamento
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingItem={editingItem}
        tipoInicial={
          tabAtiva === 'modulo_fv' ? 'modulo_fv' : tabAtiva === 'outro' ? 'outro' : 'inversor'
        }
        fornecedores={fornecedores}
        configuracoesMonitoramento={configuracoesMonitoramento}
        onSalvo={async () => {
          await carregar()
        }}
      />
      {/* Modal de Confirmação de Exclusão */}
      {modalDeleteConfirmOpen && itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-[2px] animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900">Excluir Equipamento?</h3>
              <p className="text-xs text-gray-600">
                Tem certeza que deseja remover o equipamento{' '}
                <strong className="text-gray-900">
                  {itemParaExcluir.marca} {itemParaExcluir.modelo}
                </strong>
                ? Esta ação não pode ser desfeita.
              </p>
              {Boolean(contagemUsinas[itemParaExcluir.id]) && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-left flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Atenção:</strong> Este equipamento está vinculado a{' '}
                    <strong>{contagemUsinas[itemParaExcluir.id]}</strong>{' '}
                    {contagemUsinas[itemParaExcluir.id] === 1 ? 'ativo' : 'ativos'} de usina.
                    Verifique antes de excluir.
                  </p>
                </div>
              )}
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalDeleteConfirmOpen(false)
                  setItemParaExcluir(null)
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EquipamentosPage
