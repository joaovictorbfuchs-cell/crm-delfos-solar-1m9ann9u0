import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  Calendar,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  User,
  Plus,
  Wrench,
  Layers,
  ArrowUpDown,
  Building,
  Sparkles,
  Phone,
  MapPin,
  RefreshCw,
  FolderKanban,
  Check,
  DollarSign,
  FileCheck,
  Settings,
  RefreshCcw,
  XCircle,
  FileText,
  AlertCircle,
  ExternalLink,
  Send,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type {
  OMPlanoTipo,
  Cliente,
  ServicoAvulso,
  ContratoOM,
  OMMotivoEncerramento,
} from '@/types/crm'
import { categorizarClienteOM, calcularDiasRestantesDefensivo } from '@/lib/omCategorizacao'
import { ModalRegistrarServicoAvulso } from '@/components/ModalRegistrarServicoAvulso'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { toast } from 'sonner'

export type SituacaoOM =
  | 'com_plano_ativo'
  | 'com_servico_avulso'
  | 'plano_vencido'
  | 'sem_plano'
  | 'anomalia_aberta'

export type AbaPrincipalOM = 'com_plano' | 'pos_vendas'

interface ListaOMProps {
  onOpenFichaOM: (clienteId: string) => void
  onOpenNovoContrato?: () => void
  activeSubTab?: AbaPrincipalOM
  onSubTabChange?: (tab: AbaPrincipalOM) => void
}

export const ListaOM: React.FC<ListaOMProps> = ({
  onOpenFichaOM,
  onOpenNovoContrato,
  activeSubTab: externalActiveSubTab,
  onSubTabChange,
}) => {
  const navigate = useNavigate()
  const {
    clientes,
    contratosOM,
    sistemas,
    servicosAdicionaisOM,
    servicosAvulsos,
    anomaliasOM,
    openFichaCliente,
    encerrarContratoOM,
    renovarContratoOM,
  } = useClientes()

  const [internalSubTab, setInternalSubTab] = useState<AbaPrincipalOM>('com_plano')
  const currentSubTab = externalActiveSubTab || internalSubTab

  const setSubTab = (tab: AbaPrincipalOM) => {
    if (onSubTabChange) onSubTabChange(tab)
    else setInternalSubTab(tab)
  }

  const [busca, setBusca] = useState('')
  const [filtroPlano, setFiltroPlano] = useState<string>('todos')
  const [filtroPosVendas, setFiltroPosVendas] = useState<
    'todos' | 'oportunidades' | 'servico_avulso' | 'sem_plano' | 'projetos' | 'om'
  >('todos')
  const [ordenacao, setOrdenacao] = useState<'nome' | 'potencia' | 'valor' | 'proxima_visita'>(
    'nome',
  )

  // Estado para abrir modal de registrar serviço avulso diretamente da lista
  const [clienteParaServicoAvulso, setClienteParaServicoAvulso] = useState<Cliente | null>(null)

  // Estados para Gestão de Contrato (Renovar, Encerrar, Ver Detalhes)
  const [contratoParaRenovar, setContratoParaRenovar] = useState<{
    contrato: ContratoOM
    cliente: Cliente
  } | null>(null)
  const [isRenovando, setIsRenovando] = useState(false)

  const [contratoParaEncerrar, setContratoParaEncerrar] = useState<{
    contrato: ContratoOM
    cliente: Cliente
  } | null>(null)
  const [isEncerrando, setIsEncerrando] = useState(false)
  const [motivoEncerramento, setMotivoEncerramento] =
    useState<OMMotivoEncerramento>('Não renovação')
  const [dataEncerramento, setDataEncerramento] = useState<string>(
    () => new Date().toISOString().split('T')[0],
  )
  const [obsEncerramento, setObsEncerramento] = useState('')

  const [contratoParaDetalhes, setContratoParaDetalhes] = useState<{
    contrato: ContratoOM
    cliente: Cliente
    potenciaKwp: number
  } | null>(null)

  // Fallbacks seguros para coleções do ClientesContext
  const safeClientes = useMemo(() => (Array.isArray(clientes) ? clientes : []), [clientes])
  const safeContratosOM = useMemo(
    () => (Array.isArray(contratosOM) ? contratosOM : []),
    [contratosOM],
  )
  const safeSistemas = useMemo(() => (Array.isArray(sistemas) ? sistemas : []), [sistemas])
  const safeServicosAdicionais = useMemo(
    () => (Array.isArray(servicosAdicionaisOM) ? servicosAdicionaisOM : []),
    [servicosAdicionaisOM],
  )
  const safeServicosAvulsos = useMemo(
    () => (Array.isArray(servicosAvulsos) ? servicosAvulsos : []),
    [servicosAvulsos],
  )
  const safeAnomalias = useMemo(
    () => (Array.isArray(anomaliasOM) ? anomaliasOM : []),
    [anomaliasOM],
  )

  // 1. Clientes com Plano de Manutenção
  const clientesComPlano = useMemo(() => {
    return safeClientes
      .map((cliente) => {
        if (!cliente?.id) return null
        const sistema = safeSistemas.find((s) => s?.cliente_id === cliente.id)
        const potencia = Number(sistema?.potencia_total_kwp ?? cliente?.potencia_kwp) || 0

        const { categoria, contratoAtivo } = categorizarClienteOM(
          cliente.id,
          safeContratosOM,
          safeServicosAdicionais,
          safeAnomalias,
          safeServicosAvulsos,
        )

        if (categoria !== 'plano_ativo' || !contratoAtivo) return null

        const diasRestantes = calcularDiasRestantesDefensivo(contratoAtivo.data_vencimento)
        const isVencendo30Dias = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30

        return {
          cliente,
          contrato: contratoAtivo,
          potenciaKwp: potencia,
          valorMensal: Number(contratoAtivo.valor_mensal) || 0,
          statusPlano: isVencendo30Dias ? 'Vencendo em 30 dias' : contratoAtivo.status || 'Ativo',
          plano: contratoAtivo.plano || 'Essencial',
          dataVencimento: contratoAtivo.data_vencimento || '',
          diasRestantes,
          isVencendo30Dias,
          proximaVisitaData: contratoAtivo.proxima_atividade_data,
          proximaVisitaTitulo: contratoAtivo.proxima_atividade_titulo,
        }
      })
      .filter(Boolean) as {
      cliente: Cliente
      contrato: NonNullable<ReturnType<typeof categorizarClienteOM>['contratoAtivo']>
      potenciaKwp: number
      valorMensal: number
      statusPlano: string
      plano: OMPlanoTipo
      dataVencimento: string
      diasRestantes: number | null
      isVencendo30Dias: boolean
      proximaVisitaData?: string
      proximaVisitaTitulo?: string
    }[]
  }, [
    safeClientes,
    safeContratosOM,
    safeSistemas,
    safeServicosAdicionais,
    safeAnomalias,
    safeServicosAvulsos,
  ])

  // 2. Clientes Pós-Vendas (apenas clientes qualificados: transferido_pos_vendas = true ou status Fechado ou com credenciais de monitoramento)
  const clientesPosVendas = useMemo(() => {
    return safeClientes
      .map((cliente) => {
        if (!cliente?.id) return null
        const sistema = safeSistemas.find((s) => s?.cliente_id === cliente.id)
        const potencia = Number(sistema?.potencia_total_kwp ?? cliente?.potencia_kwp) || 0

        const { categoria, ultimoServicoAvulso, isPosVenda } = categorizarClienteOM(
          cliente.id,
          safeContratosOM,
          safeServicosAdicionais,
          safeAnomalias,
          safeServicosAvulsos,
          cliente,
        )

        // Se tem plano ativo, NÃO entra no Pós-Vendas (vai para a Lista 1: Clientes com Plano de Manutenção)
        if (categoria === 'plano_ativo') return null
        if (!isPosVenda) return null

        const avulsosDoCliente = safeServicosAvulsos.filter((s) => s?.cliente_id === cliente.id)
        const adicionaisDoCliente = safeServicosAdicionais.filter(
          (s) => s?.cliente_id === cliente.id,
        )
        const totalServicosAvulsos = avulsosDoCliente.length + adicionaisDoCliente.length

        const statusVal = String(cliente.status || '')
        const instalouSolar =
          potencia > 0 ||
          Boolean(cliente.data_instalacao) ||
          statusVal === 'Fechado' ||
          statusVal === 'Concluído' ||
          cliente.produto === 'Energia Solar'

        const isOportunidadeOM = instalouSolar

        const proximoServicoAgendado = avulsosDoCliente.find((s) => s?.status === 'agendado')
        const servicoMaisRecente = ultimoServicoAvulso || avulsosDoCliente[0]

        const isContaAzul =
          Boolean(cliente.dados_importados?.['Razão Social / Nome']) ||
          Boolean(cliente.dados_importados?.['Data do Cadastro']) ||
          cliente.origem_lead === 'Outro'
        const isImportado = Boolean(
          cliente.dados_importados && Object.keys(cliente.dados_importados).length > 0,
        )

        return {
          cliente,
          potenciaKwp: potencia,
          instalouSolar,
          isOportunidadeOM,
          temServicoAvulso: totalServicosAvulsos > 0,
          totalServicosAvulsos,
          ultimoServicoAvulso: servicoMaisRecente,
          proximoServicoAgendado,
          dataInstalacao: sistema?.data_instalacao || cliente.data_instalacao,
          isContaAzul,
          isImportado,
        }
      })
      .filter(Boolean) as {
      cliente: Cliente
      potenciaKwp: number
      instalouSolar: boolean
      isOportunidadeOM: boolean
      temServicoAvulso: boolean
      totalServicosAvulsos: number
      ultimoServicoAvulso?: ServicoAvulso
      proximoServicoAgendado?: ServicoAvulso
      dataInstalacao?: string
      isContaAzul: boolean
      isImportado: boolean
    }[]
  }, [
    safeClientes,
    safeContratosOM,
    safeSistemas,
    safeServicosAdicionais,
    safeAnomalias,
    safeServicosAvulsos,
  ])

  // Contagens
  const countComPlano = clientesComPlano.length
  const countPosVendas = clientesPosVendas.length
  const countOportunidadesOM = clientesPosVendas.filter((p) => p.isOportunidadeOM).length
  const countComServicoAvulso = clientesPosVendas.filter((p) => p.temServicoAvulso).length
  const countSemPlano = clientesPosVendas.filter(
    (p) => !p.isOportunidadeOM && !p.temServicoAvulso,
  ).length

  // Filtragem da lista 1 (Com Plano)
  const itensPlanoFiltrados = useMemo(() => {
    const safeParseTime = (dateStr?: string | null) => {
      if (!dateStr) return 0
      const t = new Date(dateStr).getTime()
      return isNaN(t) ? 0 : t
    }

    return clientesComPlano
      .filter((item) => {
        const nomeCliente = item.cliente?.nome || 'Cliente'
        const cidadeCliente = item.cliente?.cidade || ''
        const matchBusca =
          !busca.trim() ||
          nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
          cidadeCliente.toLowerCase().includes(busca.toLowerCase())
        const matchPlano = filtroPlano === 'todos' || item.plano === filtroPlano
        return matchBusca && matchPlano
      })
      .sort((a, b) => {
        const nomeA = a.cliente?.nome || ''
        const nomeB = b.cliente?.nome || ''
        if (ordenacao === 'nome') return nomeA.localeCompare(nomeB)
        if (ordenacao === 'potencia') return (b.potenciaKwp || 0) - (a.potenciaKwp || 0)
        if (ordenacao === 'valor') return (b.valorMensal || 0) - (a.valorMensal || 0)
        if (ordenacao === 'proxima_visita') {
          const tA = safeParseTime(a.proximaVisitaData)
          const tB = safeParseTime(b.proximaVisitaData)
          return tA - tB
        }
        return 0
      })
  }, [clientesComPlano, busca, filtroPlano, ordenacao])

  // Função auxiliar para verificar se o cliente foi transferido do funil há 7 dias ou menos
  const isVindoDoFunilRecente = (cliente: Cliente): boolean => {
    if (!cliente.transferido_pos_vendas && cliente.origem_pos_vendas !== 'funil_comercial') {
      return false
    }
    const dataRef = cliente.data_transferencia_pos_vendas || cliente.updated || cliente.created
    if (!dataRef) return true // se foi marcado como transferido sem data, mostra o badge
    const diffMs = Date.now() - new Date(dataRef).getTime()
    if (isNaN(diffMs) || diffMs < 0) return true
    const diffDias = diffMs / (1000 * 60 * 60 * 24)
    return diffDias <= 7
  }

  // Filtragem da lista 2 (Pós-Vendas)
  const itensPosVendasFiltrados = useMemo(() => {
    return clientesPosVendas
      .filter((item) => {
        const nomeCliente = item.cliente?.nome || 'Cliente'
        const cidadeCliente = item.cliente?.cidade || ''
        const matchBusca =
          !busca.trim() ||
          nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
          cidadeCliente.toLowerCase().includes(busca.toLowerCase())

        if (filtroPosVendas === 'projetos') {
          return matchBusca && item.cliente.area_destino === 'projetos'
        }
        if (filtroPosVendas === 'om') {
          return matchBusca && item.cliente.area_destino === 'om'
        }
        if (filtroPosVendas === 'oportunidades') {
          return matchBusca && item.isOportunidadeOM
        }
        if (filtroPosVendas === 'servico_avulso') {
          return matchBusca && item.temServicoAvulso
        }
        if (filtroPosVendas === 'sem_plano') {
          return matchBusca && !item.isOportunidadeOM && !item.temServicoAvulso
        }
        return matchBusca
      })
      .sort((a, b) => {
        // Priorizar no topo quem foi recém-transferido do funil comercial
        const aFunil = isVindoDoFunilRecente(a.cliente)
        const bFunil = isVindoDoFunilRecente(b.cliente)
        if (aFunil !== bFunil) {
          return aFunil ? -1 : 1
        }
        // Depois, quem é Oportunidade de O&M
        if (a.isOportunidadeOM !== b.isOportunidadeOM) {
          return a.isOportunidadeOM ? -1 : 1
        }
        const nomeA = a.cliente?.nome || ''
        const nomeB = b.cliente?.nome || ''
        if (ordenacao === 'nome') return nomeA.localeCompare(nomeB)
        if (ordenacao === 'potencia') return (b.potenciaKwp || 0) - (a.potenciaKwp || 0)
        return 0
      })
  }, [clientesPosVendas, busca, filtroPosVendas, ordenacao])

  const handleConfirmarRenovacao = async () => {
    if (!contratoParaRenovar) return
    try {
      setIsRenovando(true)
      await renovarContratoOM(contratoParaRenovar.contrato.id, 12)
      toast.success(
        `Contrato de ${contratoParaRenovar.cliente.nome} renovado com sucesso por +12 meses!`,
      )
      setContratoParaRenovar(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao renovar contrato. Tente novamente.')
    } finally {
      setIsRenovando(false)
    }
  }

  const handleAbrirModalEncerramento = (item: { contrato: ContratoOM; cliente: Cliente }) => {
    setContratoParaEncerrar(item)
    setMotivoEncerramento('Não renovação')
    setDataEncerramento(new Date().toISOString().split('T')[0])
    setObsEncerramento('')
  }

  const handleConfirmarEncerramento = async () => {
    if (!contratoParaEncerrar) return
    try {
      setIsEncerrando(true)
      await encerrarContratoOM(contratoParaEncerrar.contrato.id, {
        motivo_encerramento: motivoEncerramento,
        data_encerramento: new Date(dataEncerramento).toISOString(),
        observacoes_encerramento: obsEncerramento.trim(),
      })
      toast.success(
        `Contrato encerrado. ${contratoParaEncerrar.cliente.nome} foi movido para Clientes Pós-Vendas.`,
      )
      setContratoParaEncerrar(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao encerrar contrato. Tente novamente.')
    } finally {
      setIsEncerrando(false)
    }
  }

  const renderPlanoBadge = (plano: OMPlanoTipo) => {
    switch (plano) {
      case 'Completo':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Plano Completo
          </span>
        )
      case 'Prevenção':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Plano Prevenção
          </span>
        )
      case 'Essencial':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Plano Essencial
          </span>
        )
    }
  }

  const renderStatusPlanoBadge = (status: string) => {
    if (status === 'Ativo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Ativo
        </span>
      )
    }
    if (status === 'Vencendo em 30 dias') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Vencendo
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* ========================================================================= */}
      {/* SELETOR DAS 2 LISTAS PRINCIPAIS EXIGIDAS:                                  */}
      {/* 1. Clientes com Plano de Manutenção                                       */}
      {/* 2. Clientes Pós-Vendas                                                    */}
      {/* ========================================================================= */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 flex-1 max-w-2xl">
          {/* Sub-aba 1: Clientes com Plano de Manutenção */}
          <button
            type="button"
            onClick={() => setSubTab('com_plano')}
            className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 rounded-xl transition-all text-left ${
              currentSubTab === 'com_plano'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'bg-gray-50/80 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                currentSubTab === 'com_plano'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold truncate">
                1. Clientes com Plano de Manutenção
              </div>
              <div
                className={`text-[11px] truncate ${
                  currentSubTab === 'com_plano' ? 'text-emerald-100' : 'text-gray-500'
                }`}
              >
                {countComPlano} {countComPlano === 1 ? 'contrato ativo' : 'contratos ativos'}
              </div>
            </div>
          </button>

          {/* Sub-aba 2: Clientes Pós-Vendas */}
          <button
            type="button"
            onClick={() => setSubTab('pos_vendas')}
            className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 rounded-xl transition-all text-left ${
              currentSubTab === 'pos_vendas'
                ? 'bg-slate-900 text-white shadow-md font-bold'
                : 'bg-gray-50/80 text-gray-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                currentSubTab === 'pos_vendas'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold truncate">2. Clientes Pós-Vendas</div>
              <div
                className={`text-[11px] truncate ${
                  currentSubTab === 'pos_vendas' ? 'text-slate-300' : 'text-gray-500'
                }`}
              >
                {countPosVendas} clientes • {countOportunidadesOM} oportunidades O&M
              </div>
            </div>
          </button>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {currentSubTab === 'com_plano' ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/importar-contratos-om')}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-xs transition-all"
                title="Importar contratos O&M de planilhas Conta Azul Pro, PDF ou Word"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Importar Contratos O&M</span>
              </button>

              <button
                type="button"
                onClick={onOpenNovoContrato}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Contrato O&M</span>
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-500 hidden sm:block pr-2">
              Clique em{' '}
              <strong className="text-emerald-700 font-semibold">Oferecer Serviço Avulso</strong> em
              qualquer cliente para registrar atendimentos técnicos.
            </div>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo Busca */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={
              currentSubTab === 'com_plano'
                ? 'Buscar por cliente com plano ou cidade...'
                : 'Buscar clientes pós-vendas por nome ou cidade...'
            }
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Filtros específicos da sub-aba ativa */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {currentSubTab === 'com_plano' ? (
            <>
              {/* Filtro Plano */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium hidden sm:inline">Plano:</span>
                <select
                  value={filtroPlano}
                  onChange={(e) => setFiltroPlano(e.target.value)}
                  className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
                >
                  <option value="todos">Todos os Planos</option>
                  <option value="Essencial">Essencial</option>
                  <option value="Prevenção">Prevenção</option>
                  <option value="Completo">Completo</option>
                </select>
              </div>

              {/* Ordenar */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium hidden sm:inline">Ordenar:</span>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as any)}
                  className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
                >
                  <option value="nome">Nome do cliente (A-Z)</option>
                  <option value="potencia">Maior potência (kWp)</option>
                  <option value="valor">Maior valor mensal (R$)</option>
                  <option value="proxima_visita">Próxima visita agendada</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Filtro Pós-Vendas */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium hidden sm:inline">Filtrar por:</span>
                <select
                  value={filtroPosVendas}
                  onChange={(e) => setFiltroPosVendas(e.target.value as any)}
                  className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
                >
                  <option value="todos">Todos os Clientes Pós-Vendas ({countPosVendas})</option>
                  <option value="projetos">📁 Área Projetos (Levantamento de Informações)</option>
                  <option value="om">🔧 Área O&M (Planos de Manutenção)</option>
                  <option value="oportunidades">
                    ⭐ Oportunidades de O&M (Solar instalado) ({countOportunidadesOM})
                  </option>
                  <option value="sem_plano">Clientes sem plano ativo ({countSemPlano})</option>
                  <option value="servico_avulso">
                    Com serviço avulso realizado ({countComServicoAvulso})
                  </option>
                </select>
              </div>

              {/* Ordenar */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium hidden sm:inline">Ordenar:</span>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as any)}
                  className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
                >
                  <option value="nome">Nome do cliente (A-Z)</option>
                  <option value="potencia">Maior potência instalada (kWp)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LISTA 1: CLIENTES COM PLANO DE MANUTENÇÃO                                  */}
      {/* ========================================================================= */}
      {currentSubTab === 'com_plano' && (
        <div className="space-y-3">
          {itensPlanoFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-800">
                Nenhum cliente com plano O&M ativo encontrado
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Tente ajustar a busca ou registre um novo contrato O&M para começar.
              </p>
              {onOpenNovoContrato && (
                <button
                  type="button"
                  onClick={onOpenNovoContrato}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  Novo Contrato O&M
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden lg:block bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Cliente & Local</th>
                      <th className="py-3.5 px-4">Dados do Contrato</th>
                      <th className="py-3.5 px-4">Potência (kWp)</th>
                      <th className="py-3.5 px-4">Valor Mensal</th>
                      <th className="py-3.5 px-4">Próxima Visita Agendada</th>
                      <th className="py-3.5 px-4">Status do Plano</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itensPlanoFiltrados.map((item) => {
                      return (
                        <tr
                          key={item.cliente.id}
                          onClick={() => {
                            if (openFichaCliente) {
                              openFichaCliente(item.cliente.id, 'om')
                            } else {
                              onOpenFichaOM(item.cliente.id)
                            }
                          }}
                          className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                        >
                          {/* Cliente & Local */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                {item.cliente.nome}
                              </span>
                              {item.isVencendo30Dias && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs animate-pulse"
                                  title={`Contrato vence em ${item.diasRestantes} dia(s). Oferta proativa de renovação recomendada.`}
                                >
                                  <AlertCircle className="w-3 h-3 text-amber-700" />
                                  <span>Renovação em 30 dias</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {item.cliente.cidade || 'Erechim/RS'}
                            </div>
                          </td>

                          {/* Dados do Contrato */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <div>{renderPlanoBadge(item.plano)}</div>
                              <span className="text-[11px] text-gray-500">
                                Vigência até {formatDate(item.dataVencimento)}
                              </span>
                            </div>
                          </td>

                          {/* Potência do Sistema */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-gray-800 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span>{item.potenciaKwp > 0 ? `${item.potenciaKwp} kWp` : '—'}</span>
                            </div>
                          </td>

                          {/* Valor Mensal */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-extrabold text-emerald-700 text-sm">
                              {formatCurrency(item.valorMensal)}
                              <span className="text-[11px] font-normal text-gray-400">/mês</span>
                            </div>
                          </td>

                          {/* Próxima Visita Agendada */}
                          <td className="py-3.5 px-4 max-w-[220px]">
                            {item.proximaVisitaData ? (
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <span>{formatDate(item.proximaVisitaData)}</span>
                                </div>
                                <p
                                  className="text-[11px] text-gray-600 truncate"
                                  title={item.proximaVisitaTitulo}
                                >
                                  {item.proximaVisitaTitulo || 'Visita técnica preventiva'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">
                                Nenhuma visita agendada
                              </span>
                            )}
                          </td>

                          {/* Status do Plano */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderStatusPlanoBadge(item.statusPlano)}
                          </td>

                          {/* Ação */}
                          <td
                            className="py-3.5 px-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão Dropdown "Gerenciar Contrato" */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs hover:scale-[1.02]"
                                    title="Gerenciar contrato O&M"
                                  >
                                    <Settings className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Gerenciar Contrato</span>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setContratoParaRenovar({
                                        contrato: item.contrato,
                                        cliente: item.cliente,
                                      })
                                    }
                                    className="cursor-pointer gap-2 text-xs font-medium text-emerald-800 focus:text-emerald-900 focus:bg-emerald-50"
                                  >
                                    <RefreshCcw className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Renovar Contrato</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleAbrirModalEncerramento({
                                        contrato: item.contrato,
                                        cliente: item.cliente,
                                      })
                                    }
                                    className="cursor-pointer gap-2 text-xs font-medium text-rose-700 focus:text-rose-900 focus:bg-rose-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Encerrar Contrato</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() =>
                                      setContratoParaDetalhes({
                                        contrato: item.contrato,
                                        cliente: item.cliente,
                                        potenciaKwp: item.potenciaKwp,
                                      })
                                    }
                                    className="cursor-pointer gap-2 text-xs font-medium text-gray-700 focus:text-gray-900"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Ver Detalhes</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* Acesso rápido Ficha O&M */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (openFichaCliente) {
                                    openFichaCliente(item.cliente.id, 'om')
                                  } else {
                                    onOpenFichaOM(item.cliente.id)
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Abrir Ficha do cliente na aba O&M"
                              >
                                <span>Ficha</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div className="lg:hidden space-y-3">
                {itensPlanoFiltrados.map((item) => (
                  <div
                    key={item.cliente.id}
                    onClick={() => {
                      if (openFichaCliente) {
                        openFichaCliente(item.cliente.id, 'om')
                      } else {
                        onOpenFichaOM(item.cliente.id)
                      }
                    }}
                    className="bg-white rounded-xl border border-emerald-200/90 p-4 shadow-xs hover:border-emerald-400 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-gray-900 text-sm">{item.cliente.nome}</h4>
                          {item.isVencendo30Dias && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                              title={`Contrato vence em ${item.diasRestantes} dia(s)`}
                            >
                              <AlertCircle className="w-3 h-3 text-amber-700" />
                              <span>Renovação em 30 dias</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {item.cliente.cidade || 'Erechim/RS'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {renderPlanoBadge(item.plano)}
                        {renderStatusPlanoBadge(item.statusPlano)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Potência do Sistema</span>
                        <span className="font-bold text-gray-800 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {item.potenciaKwp > 0 ? `${item.potenciaKwp} kWp` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Valor Mensal</span>
                        <span className="font-extrabold text-emerald-700">
                          {formatCurrency(item.valorMensal)}/mês
                        </span>
                      </div>
                    </div>

                    {item.proximaVisitaData && (
                      <div className="bg-blue-50/70 p-2.5 rounded-lg text-xs space-y-0.5">
                        <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Próxima Visita: {formatDate(item.proximaVisitaData)}
                        </span>
                        <p className="text-gray-700 text-[11px] truncate">
                          {item.proximaVisitaTitulo || 'Visita preventiva agendada'}
                        </p>
                      </div>
                    )}

                    <div
                      className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-gray-400 text-[11px]">
                        Vigência até {formatDate(item.dataVencimento)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold"
                            >
                              <Settings className="w-3 h-3" />
                              <span>Gerenciar</span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() =>
                                setContratoParaRenovar({
                                  contrato: item.contrato,
                                  cliente: item.cliente,
                                })
                              }
                              className="cursor-pointer gap-2 text-xs font-medium text-emerald-800"
                            >
                              <RefreshCcw className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Renovar Contrato</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleAbrirModalEncerramento({
                                  contrato: item.contrato,
                                  cliente: item.cliente,
                                })
                              }
                              className="cursor-pointer gap-2 text-xs font-medium text-rose-700"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Encerrar Contrato</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                setContratoParaDetalhes({
                                  contrato: item.contrato,
                                  cliente: item.cliente,
                                  potenciaKwp: item.potenciaKwp,
                                })
                              }
                              className="cursor-pointer gap-2 text-xs font-medium text-gray-700"
                            >
                              <FileText className="w-3.5 h-3.5 text-gray-500" />
                              <span>Ver Detalhes</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <button
                          type="button"
                          onClick={() => {
                            if (openFichaCliente) {
                              openFichaCliente(item.cliente.id, 'om')
                            } else {
                              onOpenFichaOM(item.cliente.id)
                            }
                          }}
                          className="font-bold text-emerald-700 flex items-center gap-1 text-[11px]"
                        >
                          <span>Ficha</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LISTA 2: CLIENTES PÓS-VENDAS                                               */}
      {/* ========================================================================= */}
      {currentSubTab === 'pos_vendas' && (
        <div className="space-y-3">
          {/* Banner Explicativo da Lista Pós-Vendas */}
          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200/80 p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                <Sparkles className="w-5 h-5 text-amber-700" />
              </div>
              <div className="text-xs text-slate-700 leading-relaxed">
                <p className="font-bold text-slate-900 text-sm">
                  Base de Relacionamento Pós-Vendas (Clientes Qualificados sem Plano O&M)
                </p>
                <p className="mt-0.5 leading-relaxed">
                  Reúne clientes fechados do funil comercial e clientes com credenciais de
                  monitoramento importadas que ainda não possuem plano O&M ativo. Clientes com
                  energia solar instalada têm o destaque especial{' '}
                  <strong className="text-amber-800 font-bold">⭐ Oportunidade de O&M</strong> para
                  oferta de planos preventivos, monitoramento e limpezas periódicas.
                </p>
              </div>
            </div>
          </div>

          {itensPosVendasFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-800">
                Nenhum cliente pós-vendas encontrado
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                {busca
                  ? 'Nenhum resultado corresponde à sua pesquisa. Tente limpar os filtros.'
                  : 'Sua base de pós-vendas será listada aqui para oferta de planos O&M, limpezas e suporte preventivo.'}
              </p>
              {busca && (
                <button
                  type="button"
                  onClick={() => {
                    setBusca('')
                    setFiltroPosVendas('todos')
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Limpar busca e filtros
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden lg:block bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Cliente & Local</th>
                      <th className="py-3.5 px-4">Potência / Sistema</th>
                      <th className="py-3.5 px-4">Classificação Pós-Vendas</th>
                      <th className="py-3.5 px-4">Serviços Avulsos Realizados</th>
                      <th className="py-3.5 px-4">Último / Próximo Atendimento</th>
                      <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itensPosVendasFiltrados.map((item) => {
                      return (
                        <tr
                          key={item.cliente.id}
                          className="hover:bg-amber-50/30 transition-colors group"
                        >
                          {/* Cliente & Local */}
                          <td
                            className="py-3.5 px-4 cursor-pointer"
                            onClick={() => openFichaCliente(item.cliente.id)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                {item.cliente.nome}
                              </span>
                              {item.cliente.area_destino === 'projetos' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-600" />
                                  Projetos / Levantamento
                                </span>
                              )}
                              {item.cliente.area_destino === 'om' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                                  <Wrench className="w-2.5 h-2.5 text-blue-600" />
                                  O&M / Planos
                                </span>
                              )}
                              {!item.cliente.area_destino &&
                                isVindoDoFunilRecente(item.cliente) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                    <Send className="w-2.5 h-2.5 text-emerald-600" />
                                    Vindo do funil
                                  </span>
                                )}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {item.cliente.cidade || 'Erechim/RS'}
                              {item.cliente.telefone && ` • ${item.cliente.telefone}`}
                            </div>
                            {item.cliente.valor_estimado ? (
                              <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                                Projeto: {formatCurrency(item.cliente.valor_estimado)}
                                {item.cliente.data_fechamento &&
                                  ` • Fechado em: ${formatDate(item.cliente.data_fechamento)}`}
                              </div>
                            ) : null}
                          </td>

                          {/* Potência / Sistema */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.potenciaKwp > 0 ? (
                              <div>
                                <span className="font-bold text-gray-900 flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                  {item.potenciaKwp} kWp instalado
                                </span>
                                {item.dataInstalacao && (
                                  <span className="text-[10px] text-gray-400 block">
                                    Instalação: {formatDate(item.dataInstalacao)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">
                                Sem usina cadastrada
                              </span>
                            )}
                          </td>

                          {/* Classificação: Badge automático "Oportunidade de O&M" ou "Cliente Pós-Vendas" */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.isOportunidadeOM ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                                  ⭐ Oportunidade de O&M
                                </span>
                                <span className="text-[10px] text-amber-700 font-medium pl-1">
                                  Instalou solar sem plano O&M
                                </span>
                              </div>
                            ) : item.temServicoAvulso ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                  <Wrench className="w-3 h-3 text-blue-600" />
                                  Serviço Avulso Realizado
                                </span>
                                <span className="text-[10px] text-blue-700 font-medium pl-1">
                                  Cliente Delfos sem plano fixo
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  <User className="w-3 h-3 text-slate-500" />
                                  Cliente sem Plano
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium pl-1">
                                  {item.isImportado
                                    ? 'Importado Conta Azul / CRM'
                                    : 'Base de clientes Delfos'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Serviços Avulsos */}
                          <td className="py-3.5 px-4">
                            {item.totalServicosAvulsos > 0 ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Wrench className="w-3 h-3" />
                                  {item.totalServicosAvulsos}{' '}
                                  {item.totalServicosAvulsos === 1 ? 'serviço' : 'serviços'}
                                </span>
                                {item.ultimoServicoAvulso && (
                                  <p
                                    className="text-[11px] text-gray-500 truncate max-w-[200px]"
                                    title={item.ultimoServicoAvulso.observacoes_tecnicas}
                                  >
                                    Último:{' '}
                                    {item.ultimoServicoAvulso.tipo_servico.replace('_', ' ')} (
                                    {formatDate(item.ultimoServicoAvulso.data_servico)})
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">
                                Nenhum serviço registrado
                              </span>
                            )}
                          </td>

                          {/* Último / Próximo Atendimento */}
                          <td className="py-3.5 px-4 max-w-[220px]">
                            {item.proximoServicoAgendado ? (
                              <div className="space-y-0.5">
                                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Agendado: {formatDate(item.proximoServicoAgendado.data_servico)}
                                </span>
                                <p className="text-[11px] text-gray-600 truncate">
                                  {item.proximoServicoAgendado.tipo_servico.replace('_', ' ')}
                                </p>
                              </div>
                            ) : item.ultimoServicoAvulso ? (
                              <div className="space-y-0.5">
                                <span className="text-[11px] font-medium text-gray-600 block">
                                  Realizado em {formatDate(item.ultimoServicoAvulso.data_servico)}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-bold block">
                                  Status: {item.ultimoServicoAvulso.status}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-600 font-medium">
                                Pronto para contato O&M
                              </span>
                            )}
                          </td>

                          {/* Ações Rápidas */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setClienteParaServicoAvulso(item.cliente)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all hover:scale-[1.02]"
                                title="Oferecer serviço avulso (limpeza, visita, etc)"
                              >
                                <Wrench className="w-3.5 h-3.5 text-amber-700" />
                                <span>Oferecer Serviço</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openFichaCliente(item.cliente.id)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all hover:scale-[1.02]"
                                title="Abrir ficha do cliente"
                              >
                                <span>Ficha</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div className="lg:hidden space-y-3">
                {itensPosVendasFiltrados.map((item) => (
                  <div
                    key={item.cliente.id}
                    onClick={() => openFichaCliente(item.cliente.id)}
                    className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs hover:border-amber-300 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900 text-sm">{item.cliente.nome}</h4>
                          {item.cliente.area_destino === 'projetos' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-600" />
                              Projetos / Levantamento
                            </span>
                          )}
                          {item.cliente.area_destino === 'om' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <Wrench className="w-2.5 h-2.5 text-blue-600" />
                              O&M / Planos
                            </span>
                          )}
                          {!item.cliente.area_destino && isVindoDoFunilRecente(item.cliente) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Send className="w-2.5 h-2.5 text-emerald-600" />
                              Vindo do funil
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {item.cliente.cidade || 'Erechim/RS'}
                          {item.cliente.telefone && ` • ${item.cliente.telefone}`}
                        </p>
                        {item.cliente.valor_estimado ? (
                          <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            Projeto: {formatCurrency(item.cliente.valor_estimado)}
                            {item.cliente.data_fechamento &&
                              ` • Fechado em: ${formatDate(item.cliente.data_fechamento)}`}
                          </p>
                        ) : null}
                      </div>
                      {item.isOportunidadeOM ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          Oportunidade O&M
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          Pós-Vendas
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Sistema Solar</span>
                        <span className="font-bold text-gray-800 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {item.potenciaKwp > 0 ? `${item.potenciaKwp} kWp` : 'Não possui'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Serviços Avulsos</span>
                        <span className="font-bold text-gray-800">
                          {item.totalServicosAvulsos > 0
                            ? `${item.totalServicosAvulsos} registrado(s)`
                            : 'Nenhum'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setClienteParaServicoAvulso(item.cliente)
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold"
                      >
                        <Wrench className="w-3.5 h-3.5 text-amber-700" />
                        <span>Oferecer Serviço Avulso</span>
                      </button>

                      <span className="font-bold text-emerald-700 flex items-center gap-1 text-xs">
                        Ver Ficha
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Registrar Serviço Avulso (acionado pela lista) */}
      {clienteParaServicoAvulso && (
        <ModalRegistrarServicoAvulso
          open={Boolean(clienteParaServicoAvulso)}
          onOpenChange={(open) => !open && setClienteParaServicoAvulso(null)}
          cliente={clienteParaServicoAvulso}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RENOVAR CONTRATO O&M                                             */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(contratoParaRenovar)}
        onOpenChange={(open) => !open && setContratoParaRenovar(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-emerald-900">
              <RefreshCcw className="w-5 h-5 text-emerald-600" />
              <span>Renovar Contrato O&M</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Estender a vigência do contrato O&M ativo e atualizar o cronograma preventivo.
            </DialogDescription>
          </DialogHeader>

          {contratoParaRenovar && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">
                    {contratoParaRenovar.cliente.nome}
                  </span>
                  {renderPlanoBadge(contratoParaRenovar.contrato.plano)}
                </div>
                <div className="text-gray-600 flex items-center justify-between">
                  <span>Valor Mensal:</span>
                  <strong className="text-emerald-700">
                    {formatCurrency(contratoParaRenovar.contrato.valor_mensal)}/mês
                  </strong>
                </div>
                <div className="text-gray-600 flex items-center justify-between">
                  <span>Vencimento Atual:</span>
                  <span className="font-medium">
                    {formatDate(contratoParaRenovar.contrato.data_vencimento)}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1">
                <span className="font-bold text-gray-800 text-xs block">O que será realizado:</span>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600 text-[11px]">
                  <li>
                    Acréscimo de <strong>+12 meses de vigência</strong> a partir da data de
                    vencimento.
                  </li>
                  <li>Limpeza do alerta de renovação em 30 dias.</li>
                  <li>Reagendamento das próximas visitas técnicas preventivas do plano.</li>
                  <li>Registro da renovação na linha do tempo do cliente.</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              disabled={isRenovando}
              onClick={() => setContratoParaRenovar(null)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isRenovando}
              onClick={handleConfirmarRenovacao}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${isRenovando ? 'animate-spin' : ''}`} />
              <span>{isRenovando ? 'Renovando...' : 'Confirmar Renovação (+12 meses)'}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: ENCERRAR CONTRATO O&M (COM FORMULÁRIO DE MOTIVO/DATA/OBS)        */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(contratoParaEncerrar)}
        onOpenChange={(open) => !open && setContratoParaEncerrar(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-rose-900">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>Encerrar Contrato O&M</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Preencha os dados do encerramento. O cliente sairá da lista de contratos ativos e
              passará automaticamente para a lista <strong>Clientes Pós-Vendas</strong> com todo o
              histórico preservado.
            </DialogDescription>
          </DialogHeader>

          {contratoParaEncerrar && (
            <div className="space-y-4 py-2 text-xs">
              {/* Resumo do Cliente e Plano */}
              <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">
                    {contratoParaEncerrar.cliente.nome}
                  </span>
                  {renderPlanoBadge(contratoParaEncerrar.contrato.plano)}
                </div>
                <p className="text-[11px] text-rose-800">
                  O contrato antigo continuará acessível para consulta na ficha do cliente e na
                  timeline.
                </p>
              </div>

              {/* Formulário de Encerramento */}
              <div className="space-y-3">
                {/* Motivo do Encerramento */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">
                    Motivo do Encerramento <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={motivoEncerramento}
                    onChange={(e) => setMotivoEncerramento(e.target.value as OMMotivoEncerramento)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-800 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                  >
                    <option value="Não renovação">Não renovação</option>
                    <option value="Rescisão por inadimplemento">Rescisão por inadimplemento</option>
                    <option value="Encerramento por conveniência">
                      Encerramento por conveniência
                    </option>
                  </select>
                </div>

                {/* Data de Encerramento */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">
                    Data de Encerramento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dataEncerramento}
                    onChange={(e) => setDataEncerramento(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-800 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                {/* Observações */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">
                    Observações do Encerramento
                  </label>
                  <textarea
                    rows={3}
                    value={obsEncerramento}
                    onChange={(e) => setObsEncerramento(e.target.value)}
                    placeholder="Descreva detalhes adicionais, feedback do cliente ou justificativa..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              disabled={isEncerrando}
              onClick={() => setContratoParaEncerrar(null)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isEncerrando || !dataEncerramento}
              onClick={handleConfirmarEncerramento}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{isEncerrando ? 'Encerrando...' : 'Confirmar Encerramento'}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: VER DETALHES DO CONTRATO                                         */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(contratoParaDetalhes)}
        onOpenChange={(open) => !open && setContratoParaDetalhes(null)}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-gray-900">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Detalhes do Contrato O&M</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Visão completa das condições, valores, vigência e serviços do plano contratado.
            </DialogDescription>
          </DialogHeader>

          {contratoParaDetalhes && (
            <div className="space-y-4 py-2 text-xs">
              {/* Header do Cliente */}
              <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-gray-200 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    {contratoParaDetalhes.cliente.nome}
                  </h4>
                  <p className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {contratoParaDetalhes.cliente.cidade || 'Erechim/RS'}
                    {contratoParaDetalhes.cliente.telefone &&
                      ` • ${contratoParaDetalhes.cliente.telefone}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {renderPlanoBadge(contratoParaDetalhes.contrato.plano)}
                  {renderStatusPlanoBadge(contratoParaDetalhes.contrato.status)}
                </div>
              </div>

              {/* Grid com Dados do Contrato */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Valor Mensal
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {formatCurrency(contratoParaDetalhes.contrato.valor_mensal)}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Valor Anual
                  </span>
                  <span className="text-sm font-extrabold text-gray-800">
                    {formatCurrency(contratoParaDetalhes.contrato.valor_anual)}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Potência da Usina
                  </span>
                  <span className="text-sm font-extrabold text-amber-600 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-amber-500" />
                    {contratoParaDetalhes.potenciaKwp > 0
                      ? `${contratoParaDetalhes.potenciaKwp} kWp`
                      : '—'}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Início da Vigência
                  </span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(contratoParaDetalhes.contrato.data_inicio)}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Data de Vencimento
                  </span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(contratoParaDetalhes.contrato.data_vencimento)}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Dias Restantes
                  </span>
                  <span className="font-bold text-gray-800">
                    {calcularDiasRestantesDefensivo(
                      contratoParaDetalhes.contrato.data_vencimento,
                    ) !== null
                      ? `${calcularDiasRestantesDefensivo(contratoParaDetalhes.contrato.data_vencimento)} dias`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Próxima Visita / Atividade */}
              {contratoParaDetalhes.contrato.proxima_atividade_titulo && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    Próxima Atividade Técnica Agendada
                  </span>
                  <p className="font-semibold text-gray-900">
                    {contratoParaDetalhes.contrato.proxima_atividade_titulo}
                  </p>
                  {contratoParaDetalhes.contrato.proxima_atividade_data && (
                    <span className="text-[11px] text-blue-700 font-medium block">
                      Data prevista:{' '}
                      {formatDate(contratoParaDetalhes.contrato.proxima_atividade_data)}
                    </span>
                  )}
                </div>
              )}

              {/* Observações */}
              {contratoParaDetalhes.contrato.observacoes && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">
                    Observações Gerais
                  </span>
                  <p className="text-gray-700 italic">
                    "{contratoParaDetalhes.contrato.observacoes}"
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => {
                const clienteId = contratoParaDetalhes?.cliente.id
                setContratoParaDetalhes(null)
                if (clienteId) onOpenFichaOM(clienteId)
              }}
              className="px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              <span>Abrir Ficha Completa O&M</span>
            </button>
            <button
              type="button"
              onClick={() => setContratoParaDetalhes(null)}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ListaOM
