import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  ShieldCheck,
  Zap,
  AlertTriangle,
  MapPin,
  RefreshCcw,
  XCircle,
  Droplets,
  Activity,
  EyeOff,
  TrendingUp,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { ContratoOM, Cliente } from '@/types/crm'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { calcularDiasRestantesDefensivo } from '@/lib/omCategorizacao'
import { toast } from 'sonner'

export interface FiltrosPlanosOMState {
  busca: string
  planoTipo: 'todos' | 'Essencial' | 'Prevenção' | 'Completo' | string
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
  planoTipo: 'todos',
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
  painelAberto?: boolean
  onTogglePainel?: () => void
  onFiltrosInfoChange?: (info: { totalFiltrosAtivos: number; totalPlanosFiltrados: number }) => void
  renderTopFilterButton?: boolean
}

export const PlanosOMView: React.FC<PlanosOMViewProps> = ({
  onOpenNovoContrato,
  onOpenFichaOM,
  painelAberto: externalPainelAberto,
  onTogglePainel,
  onFiltrosInfoChange,
  renderTopFilterButton = false,
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
  // Painel retrátil aberto/fechado (controlado externamente ou interno)
  const [internalPainelAberto, setInternalPainelAberto] = useState(false)
  const painelAberto =
    externalPainelAberto !== undefined ? externalPainelAberto : internalPainelAberto
  const handleTogglePainel = () => {
    if (onTogglePainel) {
      onTogglePainel()
    } else {
      setInternalPainelAberto((prev) => !prev)
    }
  }
  // Ordenação
  const [ordenacao, setOrdenacao] = useState<
    'proxima_atividade' | 'nome' | 'potencia' | 'valor' | 'vencimento' | 'performance'
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

  // Coleções com garantia de array seguro
  const safeClientes = useMemo(() => (Array.isArray(clientes) ? clientes : []), [clientes])
  const safeContratos = useMemo(
    () => (Array.isArray(contratosOM) ? contratosOM : []),
    [contratosOM],
  )
  const safeSistemas = useMemo(() => (Array.isArray(sistemas) ? sistemas : []), [sistemas])

  // Normalização unificada da base de planos O&M
  const listaBasePlanos = useMemo(() => {
    const list: Array<{
      contrato: ContratoOM
      cliente: Cliente
      sistema?: any
      plano: string
      valorMensal: number
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

      const plano = contrato.plano || 'Essencial'
      const valorMensal = Number(contrato.valor_mensal) || 0

      list.push({
        contrato,
        cliente,
        sistema,
        plano,
        valorMensal,
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
    if (filtrosAtivos.planoTipo !== 'todos') count++
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

        // 1.1 Filtro por Tipo de Plano (Essencial, Prevenção, Completo)
        if (filtrosAtivos.planoTipo !== 'todos') {
          if (item.plano?.toLowerCase() !== filtrosAtivos.planoTipo.toLowerCase()) {
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
        if (ordenacao === 'valor') {
          return b.valorMensal - a.valorMensal
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

  // Notificar pai sobre contagem de filtros e planos
  useEffect(() => {
    if (onFiltrosInfoChange) {
      onFiltrosInfoChange({
        totalFiltrosAtivos,
        totalPlanosFiltrados: planosFiltrados.length,
      })
    }
  }, [totalFiltrosAtivos, planosFiltrados.length, onFiltrosInfoChange])

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

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* BARRA DE FILTROS AVANÇADOS RETRÁTIL (PADRÃO TELA PROPOSTAS)               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 shadow-2xs space-y-3">
        {/* Linha 1: Contador de planos encontrados e botão opcional caso renderTopFilterButton seja true */}
        {!renderTopFilterButton && !painelAberto ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-gray-900 text-sm">
                {planosFiltrados.length === 1
                  ? '1 plano encontrado'
                  : `${planosFiltrados.length} planos encontrados`}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 font-medium text-xs">
                Base monitorada: {listaBasePlanos.length} planos
              </span>
            </div>
          </div>
        ) : renderTopFilterButton ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-gray-900 text-sm">
                {planosFiltrados.length === 1
                  ? '1 plano encontrado'
                  : `${planosFiltrados.length} planos encontrados`}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 font-medium text-xs">
                Base monitorada: {listaBasePlanos.length} planos
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePainel}
                aria-expanded={painelAberto}
                title={painelAberto ? 'Recolher filtros' : 'Expandir filtros'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  painelAberto
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>Filtros</span>
                {totalFiltrosAtivos > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black inline-flex items-center justify-center">
                    {totalFiltrosAtivos}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                    painelAberto ? 'rotate-180 text-emerald-700' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-gray-900 text-sm">
                {planosFiltrados.length === 1
                  ? '1 plano encontrado'
                  : `${planosFiltrados.length} planos encontrados`}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 font-medium text-xs">
                Base monitorada: {listaBasePlanos.length} planos
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
              Painel de filtros aberto
            </span>
          </div>
        )}

        {/* Linha 2: Grade de Filtros Avançados Solicitados (Retrátil) com Busca e Ordenação integradas */}
        {painelAberto && (
          <form
            onSubmit={handleAplicarFiltros}
            className="pt-3 border-t border-gray-100 space-y-3.5 animate-in fade-in duration-200"
          >
            {/* Busca Rápida + Ordenação integradas no topo do painel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 relative">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Buscar por cliente ou contrato
                </label>
                <div className="relative">
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
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Ordenar por
                </label>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as any)}
                  className="w-full text-xs py-2 px-2.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="proxima_atividade">Próxima visita agendada</option>
                  <option value="nome">Nome do cliente (A-Z)</option>
                  <option value="potencia">Maior potência (kWp)</option>
                  <option value="valor">Maior valor mensal (R$)</option>
                  <option value="vencimento">Vencimento do Plano</option>
                  <option value="performance">Atenção na Performance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* 0. Filtro por Tipo de Plano O&M (Essencial / Prevenção / Completo) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Plano O&M
                </label>
                <select
                  value={formFiltros.planoTipo}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      planoTipo: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todos os Planos</option>
                  <option value="Essencial">Essencial</option>
                  <option value="Prevenção">Prevenção</option>
                  <option value="Completo">Completo</option>
                </select>
              </div>

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
                  {filtrosAtivos.planoTipo !== 'todos' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                      Plano: {filtrosAtivos.planoTipo}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('planoTipo')}
                        className="hover:text-purple-950 font-bold ml-0.5"
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
      </div>

      {/* ========================================================================= */}
      {/* TABELA DE PLANOS O&M (VISUALIZAÇÃO ÚNICA E PERMANENTE)                    */}
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
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cliente & Cidade</th>
                  <th className="py-3 px-4">Contrato O&M</th>
                  <th className="py-3 px-4">Potência</th>
                  <th className="py-3 px-4">Nº de Placas</th>
                  <th className="py-3 px-4">Próxima Atividade</th>
                  <th className="py-3 px-4">Valor Mensal</th>
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
                        {areaTelhado > 0 && (
                          <div className="text-[11px] text-gray-500">~{areaTelhado}m²</div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {qtdModulos > 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {qtdModulos}
                            </span>
                            <span className="text-[11px] text-gray-500 font-normal">
                              {qtdModulos === 1 ? 'placa' : 'placas'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">—</span>
                        )}
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
                        <div className="font-extrabold text-emerald-700 text-sm">
                          {formatCurrency(Number(contrato.valor_mensal) || 0)}
                          <span className="text-[10px] font-normal text-gray-400">/mês</span>
                        </div>
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
