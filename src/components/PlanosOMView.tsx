import React, { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Zap,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  MapPin,
  Maximize2,
  Layers,
  CheckCircle2,
  Settings,
  RefreshCcw,
  XCircle,
  FileText,
  ChevronRight,
  ExternalLink,
  Droplets,
  Wrench,
  Activity,
  FileCheck2,
  EyeOff,
  TrendingUp,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { ContratoOM, Cliente, OMPlanoTipo } from '@/types/crm'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { categorizarClienteOM, calcularDiasRestantesDefensivo } from '@/lib/omCategorizacao'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

export interface FiltrosPlanosOMState {
  busca: string
  proximaAtividade: 'todos' | 'hoje' | 'esta_semana' | 'este_mes' | 'atrasadas' | 'sem_atividade'
  tiposAtividade: string[] // 'Lavagem', 'Inspeção', 'Troca de componente', 'Auto leitura', 'Relatório de performance', 'Visita técnica'
  tempoUltimaAtividade: 'todos' | 'menos_30' | '30_60' | '60_90' | 'mais_90'
  performanceUsina: 'todos' | 'acima_meta' | 'na_meta' | 'abaixo_meta' | 'sem_monitoramento'
  potenciaDe: string
  potenciaAte: string
  validadePlano: 'todos' | 'ativo' | 'vencendo_30' | 'vencido'
}

const FILTROS_INICIAIS: FiltrosPlanosOMState = {
  busca: '',
  proximaAtividade: 'todos',
  tiposAtividade: [],
  tempoUltimaAtividade: 'todos',
  performanceUsina: 'todos',
  potenciaDe: '',
  potenciaAte: '',
  validadePlano: 'todos',
}

const TIPOS_ATIVIDADE_OPCOES = [
  'Lavagem',
  'Inspeção',
  'Troca de componente',
  'Auto leitura',
  'Relatório de performance',
  'Visita técnica',
]

interface PlanosOMViewProps {
  onOpenNovoContrato?: () => void
  onOpenFichaOM?: (clienteId: string) => void
}

export const PlanosOMView: React.FC<PlanosOMViewProps> = ({
  onOpenNovoContrato,
  onOpenFichaOM,
}) => {
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

  // Estados de formulário (antes de aplicar)
  const [formFiltros, setFormFiltros] = useState<FiltrosPlanosOMState>(FILTROS_INICIAIS)
  // Estados ativos aplicados
  const [filtrosAtivos, setFiltrosAtivos] = useState<FiltrosPlanosOMState>(FILTROS_INICIAIS)
  // Painel retrátil aberto/fechado
  const [painelAberto, setPainelAberto] = useState(false)
  // Modo de visualização: cards ou tabela
  const [modoVisualizacao, setModoVisualizacao] = useState<'cards' | 'tabela'>('cards')
  // Ordenação
  const [ordenacao, setOrdenacao] = useState<
    'proxima_atividade' | 'nome' | 'potencia' | 'vencimento' | 'performance'
  >('proxima_atividade')

  // Modais de Ação rápida
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

  const [contratoParaDetalhes, setContratoParaDetalhes] = useState<{
    contrato: ContratoOM
    cliente: Cliente
    potenciaKwp: number
  } | null>(null)

  // Coleções com garantia de array seguro
  const safeClientes = useMemo(() => (Array.isArray(clientes) ? clientes : []), [clientes])
  const safeContratos = useMemo(
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

  // Normalização unificada da base de planos O&M
  const listaBasePlanos = useMemo(() => {
    const list: Array<{
      contrato: ContratoOM
      cliente: Cliente
      sistema?: any
      potenciaKwp: number
      qtdModulos: number
      areaTelhado: number
      diasRestantesVencimento: number | null
      validadeCategoria: 'ativo' | 'vencendo_30' | 'vencido'
      tipoProximaAtividade: string
      dataProxStr?: string
      diffDiasProxima: number | null
      isHoje: boolean
      isEstaSemana: boolean
      isEsteMes: boolean
      isAtrasada: boolean
      temAtividadeAgendada: boolean
      diasUltima: number
      faixaUltimaAtividade: 'menos_30' | '30_60' | '60_90' | 'mais_90'
      performanceUsina: string
      statusCor: 'verde' | 'amarelo' | 'vermelho'
      statusMotivo: string
      semMonitoramento: boolean
    }> = []

    for (const contrato of safeContratos) {
      if (!contrato) continue
      const cliente =
        safeClientes.find((c) => c?.id === contrato.cliente_id) ||
        contrato.expand?.cliente_id ||
        ({
          id: contrato.cliente_id,
          nome: 'Cliente Delfos',
          cidade: 'Erechim',
          estado: 'RS',
        } as Cliente)

      const sistema = safeSistemas.find((s) => s?.cliente_id === cliente?.id)

      // Potência: contrato -> sistema -> cliente
      const potenciaKwp =
        Number(contrato.potencia_kwp) ||
        Number(sistema?.potencia_total_kwp) ||
        Number(cliente?.potencia_kwp) ||
        6.6

      // Quantidade de placas: contrato -> sistema -> cliente -> cálculo estimado
      const qtdModulos =
        Number(contrato.qtd_modulos) ||
        Number(sistema?.quantidade_modulos) ||
        Number(cliente?.placas_qtd) ||
        Math.max(4, Math.round(potenciaKwp / 0.55))

      // Área do telhado estimada
      const areaTelhado =
        Number(contrato.area_telhado_m2) ||
        Number(sistema?.area_necessaria_m2) ||
        Number((qtdModulos * 2.1).toFixed(1))

      // Validade do plano
      const diasRestantesVencimento = calcularDiasRestantesDefensivo(contrato.data_vencimento)
      const isVencido =
        contrato.status === 'Vencido' ||
        (diasRestantesVencimento !== null && diasRestantesVencimento < 0)
      const isVencendo30 =
        !isVencido &&
        (contrato.status === 'Vencendo em 30 dias' ||
          (diasRestantesVencimento !== null &&
            diasRestantesVencimento >= 0 &&
            diasRestantesVencimento <= 30))

      const validadeCategoria: 'ativo' | 'vencendo_30' | 'vencido' = isVencido
        ? 'vencido'
        : isVencendo30
          ? 'vencendo_30'
          : 'ativo'

      // Próxima atividade
      const tipoProximaAtividade =
        contrato.tipo_proxima_atividade ||
        (contrato.proxima_atividade_titulo?.toLowerCase().includes('lavagem')
          ? 'Lavagem'
          : contrato.proxima_atividade_titulo?.toLowerCase().includes('inspe')
            ? 'Inspeção'
            : contrato.proxima_atividade_titulo?.toLowerCase().includes('relat')
              ? 'Relatório de performance'
              : 'Inspeção')

      const dataProxStr = contrato.proxima_atividade_data
      let diffDiasProxima: number | null = null
      let isHoje = false
      let isEstaSemana = false
      let isEsteMes = false
      let isAtrasada = false

      if (dataProxStr) {
        const proxDate = new Date(dataProxStr)
        if (!isNaN(proxDate.getTime())) {
          const hoje = new Date()
          hoje.setHours(0, 0, 0, 0)
          const proxSemHora = new Date(proxDate)
          proxSemHora.setHours(0, 0, 0, 0)

          diffDiasProxima = Math.round(
            (proxSemHora.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
          )

          isHoje = diffDiasProxima === 0
          isEstaSemana = diffDiasProxima >= 0 && diffDiasProxima <= 7
          isEsteMes = diffDiasProxima >= 0 && diffDiasProxima <= 30
          isAtrasada = diffDiasProxima < 0
        }
      }

      // Tempo desde a última atividade
      const diasUltima =
        contrato.dias_desde_ultima_atividade ??
        (contrato.data_ultima_atividade
          ? Math.max(
              0,
              Math.round(
                (Date.now() - new Date(contrato.data_ultima_atividade).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 45)

      let faixaUltimaAtividade: 'menos_30' | '30_60' | '60_90' | 'mais_90' = '30_60'
      if (diasUltima < 30) faixaUltimaAtividade = 'menos_30'
      else if (diasUltima <= 60) faixaUltimaAtividade = '30_60'
      else if (diasUltima <= 90) faixaUltimaAtividade = '60_90'
      else faixaUltimaAtividade = 'mais_90'

      // Performance da usina
      const performanceUsina = (contrato.performance_usina as string) || 'na_meta'

      // Status visual do card:
      // Vermelho = atividade atrasada OU plano vencido
      // Amarelo = atividade nos próximos 7 dias OU plano próximo do vencimento (30 dias)
      // Verde = tudo em dia
      let statusCor: 'verde' | 'amarelo' | 'vermelho' = 'verde'
      let statusMotivo = 'Tudo em dia'

      if (isVencido || isAtrasada) {
        statusCor = 'vermelho'
        statusMotivo = isVencido ? 'Plano vencido' : 'Atividade atrasada'
      } else if (isVencendo30 || isEstaSemana) {
        statusCor = 'amarelo'
        statusMotivo = isVencendo30
          ? 'Vencimento em 30 dias'
          : isHoje
            ? 'Atividade hoje!'
            : 'Atividade nos próximos 7 dias'
      }

      // Sem monitoramento ativo
      const semMonitoramento =
        performanceUsina === 'sem_monitoramento' ||
        !cliente?.monitoramento_usuario ||
        cliente.monitoramento_usuario === ''

      list.push({
        contrato,
        cliente,
        sistema,
        potenciaKwp,
        qtdModulos,
        areaTelhado,
        diasRestantesVencimento,
        validadeCategoria,
        tipoProximaAtividade,
        dataProxStr,
        diffDiasProxima,
        isHoje,
        isEstaSemana,
        isEsteMes,
        isAtrasada,
        temAtividadeAgendada: Boolean(dataProxStr),
        diasUltima,
        faixaUltimaAtividade,
        performanceUsina,
        statusCor,
        statusMotivo,
        semMonitoramento,
      })
    }

    return list
  }, [safeContratos, safeClientes, safeSistemas])

  // Contagem de filtros ativos
  const totalFiltrosAtivos = useMemo(() => {
    let count = 0
    if (filtrosAtivos.busca.trim()) count++
    if (filtrosAtivos.proximaAtividade !== 'todos') count++
    if (filtrosAtivos.tiposAtividade.length > 0) count++
    if (filtrosAtivos.tempoUltimaAtividade !== 'todos') count++
    if (filtrosAtivos.performanceUsina !== 'todos') count++
    if (filtrosAtivos.potenciaDe || filtrosAtivos.potenciaAte) count++
    if (filtrosAtivos.validadePlano !== 'todos') count++
    return count
  }, [filtrosAtivos])

  // Filtragem efetiva dos planos
  const planosFiltrados = useMemo(() => {
    return listaBasePlanos
      .filter((item) => {
        // 1. Busca rápida por nome, cidade ou contrato
        if (filtrosAtivos.busca.trim()) {
          const termo = filtrosAtivos.busca.toLowerCase().trim()
          const nome = (item.cliente.nome || '').toLowerCase()
          const cidade = (item.cliente.cidade || '').toLowerCase()
          const contratoNum = (item.contrato.numero_contrato || '').toLowerCase()
          if (!nome.includes(termo) && !cidade.includes(termo) && !contratoNum.includes(termo)) {
            return false
          }
        }

        // 2. Próxima atividade agendada
        if (filtrosAtivos.proximaAtividade === 'hoje' && !item.isHoje) return false
        if (filtrosAtivos.proximaAtividade === 'esta_semana' && !item.isEstaSemana) return false
        if (filtrosAtivos.proximaAtividade === 'este_mes' && !item.isEsteMes) return false
        if (filtrosAtivos.proximaAtividade === 'atrasadas' && !item.isAtrasada) return false
        if (filtrosAtivos.proximaAtividade === 'sem_atividade' && item.temAtividadeAgendada)
          return false

        // 3. Tipos de atividade (checkboxes múltiplos)
        if (filtrosAtivos.tiposAtividade.length > 0) {
          const matchTipo = filtrosAtivos.tiposAtividade.some((tipoSel) =>
            item.tipoProximaAtividade.toLowerCase().includes(tipoSel.toLowerCase()),
          )
          if (!matchTipo) return false
        }

        // 4. Tempo desde a última atividade
        if (
          filtrosAtivos.tempoUltimaAtividade !== 'todos' &&
          item.faixaUltimaAtividade !== filtrosAtivos.tempoUltimaAtividade
        ) {
          return false
        }

        // 5. Performance da usina
        if (
          filtrosAtivos.performanceUsina !== 'todos' &&
          item.performanceUsina !== filtrosAtivos.performanceUsina
        ) {
          return false
        }

        // 6. Faixa de potência (kWp)
        if (filtrosAtivos.potenciaDe) {
          const min = parseFloat(filtrosAtivos.potenciaDe)
          if (!isNaN(min) && item.potenciaKwp < min) return false
        }
        if (filtrosAtivos.potenciaAte) {
          const max = parseFloat(filtrosAtivos.potenciaAte)
          if (!isNaN(max) && item.potenciaKwp > max) return false
        }

        // 7. Validade do plano O&M
        if (
          filtrosAtivos.validadePlano !== 'todos' &&
          item.validadeCategoria !== filtrosAtivos.validadePlano
        ) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        if (ordenacao === 'nome') {
          return (a.cliente.nome || '').localeCompare(b.cliente.nome || '')
        }
        if (ordenacao === 'potencia') {
          return b.potenciaKwp - a.potenciaKwp
        }
        if (ordenacao === 'vencimento') {
          const tA = new Date(a.contrato.data_vencimento || '').getTime() || 0
          const tB = new Date(b.contrato.data_vencimento || '').getTime() || 0
          return tA - tB
        }
        if (ordenacao === 'performance') {
          const pesoPerf = (p: string) => {
            if (p === 'abaixo_meta') return 1
            if (p === 'sem_monitoramento') return 2
            if (p === 'na_meta') return 3
            return 4
          }
          return pesoPerf(a.performanceUsina) - pesoPerf(b.performanceUsina)
        }
        // Padrão: priorizar atrasadas e próximas atividades
        const tA = a.dataProxStr ? new Date(a.dataProxStr).getTime() : 9999999999999
        const tB = b.dataProxStr ? new Date(b.dataProxStr).getTime() : 9999999999999
        return tA - tB
      })
  }, [listaBasePlanos, filtrosAtivos, ordenacao])

  // Ações de filtro
  const handleAplicarFiltros = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFiltrosAtivos({ ...formFiltros })
  }

  const handleLimparFiltros = () => {
    setFormFiltros(FILTROS_INICIAIS)
    setFiltrosAtivos(FILTROS_INICIAIS)
  }

  const handleRemoverTagFiltro = (chave: keyof FiltrosPlanosOMState, valorEspecifico?: string) => {
    if (chave === 'tiposAtividade' && valorEspecifico) {
      const novosTipos = filtrosAtivos.tiposAtividade.filter((t) => t !== valorEspecifico)
      setFormFiltros((prev) => ({ ...prev, tiposAtividade: novosTipos }))
      setFiltrosAtivos((prev) => ({ ...prev, tiposAtividade: novosTipos }))
      return
    }

    setFormFiltros((prev) => ({ ...prev, [chave]: FILTROS_INICIAIS[chave] }))
    setFiltrosAtivos((prev) => ({ ...prev, [chave]: FILTROS_INICIAIS[chave] }))
  }

  const toggleTipoAtividade = (tipo: string) => {
    setFormFiltros((prev) => {
      const existe = prev.tiposAtividade.includes(tipo)
      const tiposAtividade = existe
        ? prev.tiposAtividade.filter((t) => t !== tipo)
        : [...prev.tiposAtividade, tipo]
      return { ...prev, tiposAtividade }
    })
  }

  // Ações de renovação e encerramento
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

  const handleConfirmarEncerramento = async () => {
    if (!contratoParaEncerrar) return
    try {
      setIsEncerrando(true)
      await encerrarContratoOM(contratoParaEncerrar.contrato.id, {
        motivo_encerramento: 'Não renovação',
        data_encerramento: new Date().toISOString(),
        observacoes_encerramento: 'Encerrado via painel de Planos O&M',
      })
      toast.success(`Contrato encerrado. ${contratoParaEncerrar.cliente.nome} atualizado.`)
      setContratoParaEncerrar(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao encerrar contrato. Tente novamente.')
    } finally {
      setIsEncerrando(false)
    }
  }

  const renderBadgePerformance = (perf: string) => {
    switch (perf) {
      case 'acima_meta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            Acima da meta
          </span>
        )
      case 'abaixo_meta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Abaixo da meta
          </span>
        )
      case 'sem_monitoramento':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <EyeOff className="w-3 h-3 text-slate-500" />
            Sem monitoramento
          </span>
        )
      case 'na_meta':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Activity className="w-3 h-3 text-blue-600" />
            Na meta
          </span>
        )
    }
  }

  const isFiltroLavagemAtivo =
    filtrosAtivos.tiposAtividade.includes('Lavagem') ||
    filtrosAtivos.busca.toLowerCase().includes('lavag')

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* BARRA DE FILTROS AVANÇADOS RETRÁTIL (PADRÃO TELA PROPOSTAS)               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-2xs space-y-3">
        {/* Linha 1: Busca rápida, botões principais e alternador de filtros */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Campo Busca Rápida */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={formFiltros.busca}
              onChange={(e) => setFormFiltros((prev) => ({ ...prev, busca: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAplicarFiltros()
              }}
              placeholder="Buscar por cliente, cidade ou número do contrato O&M..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
            />
          </div>

          {/* Controles: Alternador Cards/Tabela, Ordenar e Filtros Avançados */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Alternador Cards / Tabela */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold text-gray-600">
              <button
                type="button"
                onClick={() => setModoVisualizacao('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  modoVisualizacao === 'cards'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'hover:text-gray-900'
                }`}
                title="Visualizar em Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('tabela')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  modoVisualizacao === 'tabela'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'hover:text-gray-900'
                }`}
                title="Visualizar em Tabela"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabela</span>
              </button>
            </div>

            {/* Ordenar */}
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              className="text-xs py-2 px-2.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="proxima_atividade">Próxima Atividade</option>
              <option value="nome">Nome do Cliente (A-Z)</option>
              <option value="potencia">Maior Potência (kWp)</option>
              <option value="vencimento">Vencimento do Plano</option>
              <option value="performance">Atenção na Performance</option>
            </select>

            {/* Botão retrátil de Filtros Avançados */}
            <button
              type="button"
              onClick={() => setPainelAberto((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                painelAberto
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filtros avançados</span>
              {totalFiltrosAtivos > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black inline-flex items-center justify-center">
                  {totalFiltrosAtivos}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  painelAberto ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Linha 2: Grade de Filtros Avançados Solicitados (Retrátil) */}
        {painelAberto && (
          <form
            onSubmit={handleAplicarFiltros}
            className="pt-3 border-t border-gray-100 space-y-3.5 animate-in fade-in duration-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {/* 1. Próxima atividade agendada: dropdown (Hoje, Esta semana, Este mês, Atrasadas, Sem atividade agendada) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Próxima atividade
                </label>
                <select
                  value={formFiltros.proximaAtividade}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      proximaAtividade: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todas as datas</option>
                  <option value="hoje">Hoje</option>
                  <option value="esta_semana">Esta semana</option>
                  <option value="este_mes">Este mês</option>
                  <option value="atrasadas">Atrasadas</option>
                  <option value="sem_atividade">Sem atividade agendada</option>
                </select>
              </div>

              {/* 2. Tempo desde a última atividade: dropdown (Menos de 30 dias, 30-60 dias, 60-90 dias, Mais de 90 dias) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Última atividade
                </label>
                <select
                  value={formFiltros.tempoUltimaAtividade}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      tempoUltimaAtividade: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Qualquer período</option>
                  <option value="menos_30">Menos de 30 dias</option>
                  <option value="30_60">30 a 60 dias</option>
                  <option value="60_90">60 a 90 dias</option>
                  <option value="mais_90">Mais de 90 dias</option>
                </select>
              </div>

              {/* 3. Performance da usina: dropdown (Acima da meta, Na meta, Abaixo da meta, Sem monitoramento) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Performance da usina
                </label>
                <select
                  value={formFiltros.performanceUsina}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      performanceUsina: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todas as performances</option>
                  <option value="acima_meta">Acima da meta</option>
                  <option value="na_meta">Na meta</option>
                  <option value="abaixo_meta">Abaixo da meta</option>
                  <option value="sem_monitoramento">Sem monitoramento</option>
                </select>
              </div>

              {/* 4. Potência do sistema: faixa de kWp (de/até) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Potência (kWp)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="De (mín)"
                    value={formFiltros.potenciaDe}
                    onChange={(e) =>
                      setFormFiltros((prev) => ({ ...prev, potenciaDe: e.target.value }))
                    }
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Até (máx)"
                    value={formFiltros.potenciaAte}
                    onChange={(e) =>
                      setFormFiltros((prev) => ({ ...prev, potenciaAte: e.target.value }))
                    }
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* 5. Validade do plano O&M: dropdown (Ativo, Próximo do vencimento - 30 dias, Vencido) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Validade do plano O&M
                </label>
                <select
                  value={formFiltros.validadePlano}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      validadePlano: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todos os status</option>
                  <option value="ativo">Ativo</option>
                  <option value="vencendo_30">Próximo do vencimento (30 dias)</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
            </div>

            {/* Sub-linha: Tipo de atividade (Checkboxes múltiplos) */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Tipo de atividade agendada (seleção múltipla):
              </label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_ATIVIDADE_OPCOES.map((tipo) => {
                  const checked = formFiltros.tiposAtividade.includes(tipo)
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => toggleTipoAtividade(tipo)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        checked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="rounded text-emerald-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer pointer-events-none"
                      />
                      <span>{tipo}</span>
                      {tipo === 'Lavagem' && (
                        <Droplets
                          className={`w-3.5 h-3.5 ${checked ? 'text-white' : 'text-blue-500'}`}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Botões de Ação: Aplicar Filtros & Limpar Filtros */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Aplicar filtros</span>
                </button>

                <button
                  type="button"
                  onClick={handleLimparFiltros}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Limpar filtros</span>
                </button>
              </div>

              {/* Tags de filtros ativos */}
              {totalFiltrosAtivos > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-700">Filtros ativos:</span>
                  {filtrosAtivos.busca && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Busca: "{filtrosAtivos.busca}"
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('busca')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filtrosAtivos.proximaAtividade !== 'todos' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Próxima: {filtrosAtivos.proximaAtividade.replace('_', ' ')}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('proximaAtividade')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filtrosAtivos.tiposAtividade.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('tiposAtividade', t)}
                        className="hover:text-blue-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {filtrosAtivos.performanceUsina !== 'todos' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Perf.: {filtrosAtivos.performanceUsina.replace('_', ' ')}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('performanceUsina')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filtrosAtivos.validadePlano !== 'todos' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Validade: {filtrosAtivos.validadePlano}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('validadePlano')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {(filtrosAtivos.potenciaDe || filtrosAtivos.potenciaAte) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Potência: {filtrosAtivos.potenciaDe || '0'} a{' '}
                      {filtrosAtivos.potenciaAte || 'max'} kWp
                      <button
                        type="button"
                        onClick={() => {
                          handleRemoverTagFiltro('potenciaDe')
                          handleRemoverTagFiltro('potenciaAte')
                        }}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </form>
        )}

        {/* Linha 3: Contador textual solicitado: "X planos encontrados" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-gray-900 text-sm">
              {planosFiltrados.length === 1
                ? '1 plano encontrado'
                : `${planosFiltrados.length} planos encontrados`}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 font-medium">
              Base monitorada: {listaBasePlanos.length} planos
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            {/* Legenda visual de cores por status */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Em dia</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Atividade próx. 7d / Vencendo</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Atrasado / Vencido</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LISTA DE CARDS OU TABELA DE PLANOS O&M                                     */}
      {/* ========================================================================= */}
      {planosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">Nenhum plano O&M encontrado</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            {totalFiltrosAtivos > 0
              ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os parâmetros ou limpar os filtros.'
              : 'Nenhum contrato de O&M cadastrado ainda no sistema.'}
          </p>
          {totalFiltrosAtivos > 0 ? (
            <button
              type="button"
              onClick={handleLimparFiltros}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <span>Limpar filtros</span>
            </button>
          ) : (
            onOpenNovoContrato && (
              <button
                type="button"
                onClick={onOpenNovoContrato}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Novo Contrato O&M
              </button>
            )
          )}
        </div>
      ) : modoVisualizacao === 'cards' ? (
        /* VISUALIZAÇÃO EM CARDS SOLICITADA */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {planosFiltrados.map((item) => {
            const {
              contrato,
              cliente,
              potenciaKwp,
              qtdModulos,
              areaTelhado,
              tipoProximaAtividade,
              dataProxStr,
              diffDiasProxima,
              statusCor,
              statusMotivo,
              semMonitoramento,
              performanceUsina,
            } = item

            // Borda e indicador de cor por status:
            // Verde = tudo em dia; Amarelo = atividade nos próximos 7 dias ou plano próximo do vencimento; Vermelho = atividade atrasada ou plano vencido
            const borderCorClass =
              statusCor === 'vermelho'
                ? 'border-rose-400 ring-1 ring-rose-300/40'
                : statusCor === 'amarelo'
                  ? 'border-amber-400 ring-1 ring-amber-300/40'
                  : 'border-emerald-300 hover:border-emerald-500'

            const statusDotClass =
              statusCor === 'vermelho'
                ? 'bg-rose-500 animate-pulse'
                : statusCor === 'amarelo'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500'

            const statusBadgeBg =
              statusCor === 'vermelho'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : statusCor === 'amarelo'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'

            const isLavagemCard =
              tipoProximaAtividade.toLowerCase().includes('lavag') || isFiltroLavagemAtivo

            return (
              <div
                key={contrato.id}
                onClick={() => {
                  if (openFichaCliente) openFichaCliente(cliente.id, 'om')
                  else if (onOpenFichaOM) onOpenFichaOM(cliente.id)
                }}
                className={`bg-white rounded-2xl border ${borderCorClass} shadow-2xs hover:shadow-md transition-all p-4 flex flex-col justify-between cursor-pointer group relative`}
              >
                <div>
                  {/* Topo do Card: Cliente, Cidade, Contrato e Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-gray-900 group-hover:text-emerald-700 text-sm truncate">
                          {cliente.nome}
                        </h4>
                        {/* Ícone de alerta quando não há monitoramento ativo ou dados de performance */}
                        {semMonitoramento && (
                          <span
                            className="inline-flex items-center text-amber-600 shrink-0"
                            title="Atenção: Usina sem monitoramento ativo cadastrado!"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{cliente.cidade || 'Erechim/RS'}</span>
                        {contrato.numero_contrato && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="font-bold text-slate-700">
                              Contrato nº {contrato.numero_contrato}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status do plano com indicador de cor */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black border ${statusBadgeBg}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusDotClass}`} />
                        <span>{statusMotivo}</span>
                      </span>
                      {contrato.plano && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {contrato.plano}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações Técnicas: Potência (kWp) e Módulos */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 rounded-xl mb-3 border border-gray-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">
                        Potência do Sistema
                      </span>
                      <span className="font-black text-gray-900 flex items-center gap-1 text-sm mt-0.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {potenciaKwp > 0 ? `${potenciaKwp.toFixed(2)} kWp` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">
                        Módulos Solares
                      </span>
                      <span className="font-extrabold text-emerald-800 text-sm mt-0.5 block">
                        {qtdModulos} placas
                      </span>
                    </div>
                  </div>

                  {/* Destaque especial quando a atividade é Lavagem ou filtrado por Lavagem */}
                  {isLavagemCard && (
                    <div className="bg-sky-50/80 rounded-xl p-2.5 border border-sky-200/90 mb-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-sky-900 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-sky-600" />
                          Dados para Insumos e Mão de Obra (Lavagem)
                        </span>
                        <span className="text-[10px] bg-sky-200/70 px-1.5 py-0.5 rounded text-sky-800">
                          {qtdModulos} placas
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-sky-800 pt-1">
                        <div>
                          <span className="text-gray-500 block text-[10px]">
                            Área Estimada do Telhado:
                          </span>
                          <span className="font-bold text-sky-950">
                            {areaTelhado > 0 ? `${areaTelhado} m²` : 'Não informada'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px]">
                            Consumo Médio Água/Solução:
                          </span>
                          <span className="font-semibold text-sky-950">
                            ~{(qtdModulos * 2.5).toFixed(0)} L água desmin.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Próxima Atividade Agendada */}
                  <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/80 text-xs mb-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        Próxima Atividade: {tipoProximaAtividade}
                      </span>
                      {dataProxStr ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.isAtrasada
                              ? 'bg-rose-100 text-rose-800'
                              : item.isHoje
                                ? 'bg-amber-100 text-amber-900 animate-pulse'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {formatDate(dataProxStr)}
                          {diffDiasProxima !== null && (
                            <span className="ml-1">
                              (
                              {item.isAtrasada
                                ? `${Math.abs(diffDiasProxima)}d atraso`
                                : `${diffDiasProxima}d`}
                              )
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Sem agendamento</span>
                      )}
                    </div>
                    {contrato.proxima_atividade_titulo && (
                      <p
                        className="text-[11px] text-gray-600 truncate"
                        title={contrato.proxima_atividade_titulo}
                      >
                        {contrato.proxima_atividade_titulo}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card: Performance da Usina, Valor Mensal e Ações */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div>{renderBadgePerformance(performanceUsina)}</div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-emerald-800 border border-gray-200 text-[11px] font-bold transition-all shadow-2xs"
                        >
                          <Settings className="w-3 h-3 text-emerald-600" />
                          <span>Gerenciar</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setContratoParaRenovar({ contrato, cliente })}
                          className="cursor-pointer gap-2 text-xs font-medium text-emerald-800"
                        >
                          <RefreshCcw className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Renovar Plano</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setContratoParaEncerrar({ contrato, cliente })}
                          className="cursor-pointer gap-2 text-xs font-medium text-rose-700"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Encerrar Plano</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (openFichaCliente) openFichaCliente(cliente.id, 'om')
                            else if (onOpenFichaOM) onOpenFichaOM(cliente.id)
                          }}
                          className="cursor-pointer gap-2 text-xs font-medium text-gray-700"
                        >
                          <FileText className="w-3.5 h-3.5 text-gray-500" />
                          <span>Abrir Ficha O&M</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                      type="button"
                      onClick={() => {
                        if (openFichaCliente) openFichaCliente(cliente.id, 'om')
                        else if (onOpenFichaOM) onOpenFichaOM(cliente.id)
                      }}
                      className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 text-[11px] px-1 py-1"
                    >
                      <span>Ficha</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA */
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cliente & Cidade</th>
                  <th className="py-3 px-4">Contrato O&M</th>
                  <th className="py-3 px-4">Potência (kWp) / Módulos</th>
                  <th className="py-3 px-4">Próxima Atividade</th>
                  <th className="py-3 px-4">Performance Usina</th>
                  <th className="py-3 px-4">Valor Mensal</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {planosFiltrados.map((item) => {
                  const {
                    contrato,
                    cliente,
                    potenciaKwp,
                    qtdModulos,
                    areaTelhado,
                    tipoProximaAtividade,
                    dataProxStr,
                    statusCor,
                    statusMotivo,
                    semMonitoramento,
                    performanceUsina,
                  } = item

                  const statusDotClass =
                    statusCor === 'vermelho'
                      ? 'bg-rose-500'
                      : statusCor === 'amarelo'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'

                  return (
                    <tr
                      key={contrato.id}
                      onClick={() => {
                        if (openFichaCliente) openFichaCliente(cliente.id, 'om')
                        else if (onOpenFichaOM) onOpenFichaOM(cliente.id)
                      }}
                      className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-bold text-[11px]">
                          <span className={`w-2.5 h-2.5 rounded-full ${statusDotClass}`} />
                          <span
                            className={
                              statusCor === 'vermelho'
                                ? 'text-rose-700'
                                : statusCor === 'amarelo'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                            }
                          >
                            {statusMotivo}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {cliente.nome}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{cliente.cidade || 'Erechim/RS'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {contrato.numero_contrato && (
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                              nº {contrato.numero_contrato}
                            </span>
                          )}
                          <span className="text-gray-600 font-medium">
                            {contrato.plano || 'Essencial'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{potenciaKwp > 0 ? `${potenciaKwp} kWp` : '—'}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {qtdModulos} placas {areaTelhado > 0 && `(~${areaTelhado}m²)`}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-emerald-900 flex items-center gap-1">
                          {tipoProximaAtividade.toLowerCase().includes('lavag') && (
                            <Droplets className="w-3 h-3 text-sky-600" />
                          )}
                          <span>{tipoProximaAtividade}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {dataProxStr ? formatDate(dataProxStr) : 'Sem data'}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {renderBadgePerformance(performanceUsina)}
                          {semMonitoramento && (
                            <span
                              title="Sem monitoramento ativo"
                              className="inline-flex items-center"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-emerald-700 text-sm">
                          {formatCurrency(Number(contrato.valor_mensal) || 0)}
                          <span className="text-[10px] font-normal text-gray-400">/mês</span>
                        </div>
                      </td>

                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (openFichaCliente) openFichaCliente(cliente.id, 'om')
                            else if (onOpenFichaOM) onOpenFichaOM(cliente.id)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                        >
                          <span>Ficha O&M</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Renovação Rápida */}
      {contratoParaRenovar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <RefreshCcw className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Renovar Plano O&M</h3>
                <p className="text-xs text-gray-500">{contratoParaRenovar.cliente.nome}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              O contrato nº {contratoParaRenovar.contrato.numero_contrato || '—'} será renovado por
              mais <strong>12 meses</strong> a contar do vencimento atual (
              {formatDate(contratoParaRenovar.contrato.data_vencimento)}).
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContratoParaRenovar(null)}
                disabled={isRenovando}
                className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRenovacao}
                disabled={isRenovando}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
              >
                {isRenovando ? 'Renovando...' : 'Confirmar Renovação (+12m)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Encerramento */}
      {contratoParaEncerrar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
                <XCircle className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Encerrar Plano O&M</h3>
                <p className="text-xs text-gray-500">{contratoParaEncerrar.cliente.nome}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Deseja realmente encerrar este contrato de O&M? O cliente continuará salvo no CRM na
              carteira de pós-vendas.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContratoParaEncerrar(null)}
                disabled={isEncerrando}
                className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEncerramento}
                disabled={isEncerrando}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
              >
                {isEncerrando ? 'Encerrando...' : 'Confirmar Encerramento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
