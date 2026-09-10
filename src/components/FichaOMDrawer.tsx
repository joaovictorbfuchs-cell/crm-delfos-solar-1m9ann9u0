import React, { useState, useMemo } from 'react'
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Plus,
  Clock,
  Wrench,
  FileText,
  DollarSign,
  User,
  Zap,
  Activity,
  History,
  TrendingUp,
  Building,
  MapPin,
  CalendarClock,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type {
  OMPlanoTipo,
  OMStatusPlano,
  OMAnomaliaEtapa,
  OMAnomaliaStatus,
  OMServicoAdicionalTipo,
  OMServicoAdicionalStatus,
} from '@/types/crm'

export const SERVICOS_CATALOGO_OM = [
  { id: 's1', nome: 'Monitoramento da geração em horários comerciais', freq: 'Contínuo' },
  { id: 's2', nome: 'Relatório mensal de desempenho', freq: 'Mensal' },
  { id: 's3', nome: 'Suporte técnico especializado', freq: 'Ilimitado' },
  { id: 's4', nome: 'Intermediação com a RGE', freq: 'Conforme demanda' },
  { id: 's5', nome: 'Configuração e suporte remoto', freq: 'Remoto' },
  { id: 's6', nome: 'Inspeção preventiva anual', freq: 'Anual' },
  { id: 's7', nome: 'Reaperto de conexões e grampos', freq: 'Anual' },
  {
    id: 's8',
    nome: 'Verificação de desempenho (pontos quentes, sombreamento, falhas)',
    freq: 'Anual/Semestral',
  },
  {
    id: 's9',
    nome: 'Limpeza de placas solares (1x ou 2x ao ano, conforme o plano)',
    freq: '1x ou 2x/ano',
  },
]

export const SERVICOS_ADICIONAIS_OPCOES: {
  value: OMServicoAdicionalTipo
  label: string
  valorBase: number
}[] = [
  { value: 'diagnostico_tecnico', label: 'Diagnóstico técnico', valorBase: 350 },
  { value: 'manutencao_corretiva', label: 'Manutenção corretiva', valorBase: 550 },
  { value: 'inspecao_termografica', label: 'Inspeção termográfica', valorBase: 480 },
  { value: 'limpeza_avulsa', label: 'Limpeza avulsa de placas', valorBase: 400 },
  {
    value: 'testes_inversor',
    label: 'Testes em inversor (curva I-V / isolamento)',
    valorBase: 380,
  },
  { value: 'substituicao_inversor', label: 'Substituição de inversor', valorBase: 750 },
  { value: 'relatorio_seguradora', label: 'Relatório técnico para seguradora', valorBase: 650 },
  {
    value: 'configuracao_datalogger',
    label: 'Configuração de datalogger / telemetria',
    valorBase: 290,
  },
  { value: 'gestao_rateio', label: 'Gestão de rateio de créditos', valorBase: 420 },
  { value: 'auditoria_faturamento', label: 'Auditoria de faturamento tarifário', valorBase: 500 },
  { value: 'manutencao_ativos', label: 'Manutenção de ativos e subestações', valorBase: 1200 },
]

export const ETAPAS_ANOMALIA: OMAnomaliaEtapa[] = [
  'Detecção',
  'Solicitação de Informações',
  'Triagem Remota',
  'Diagnóstico In Loco',
  'Execução',
  'Faturamento',
]

export const FichaOMDrawer: React.FC = () => {
  const {
    selectedOMClienteId,
    closeFichaOM,
    clientes,
    sistemas,
    contratosOM,
    anomaliasOM,
    servicosAdicionaisOM,
    timelineOM,
    profissionais,
    updateContratoOM,
    addAnomaliaOM,
    updateAnomaliaOM,
    addServicoAdicionalOM,
    updateServicoAdicionalOM,
  } = useClientes()

  const [activeTab, setActiveTab] = useState<
    'contrato' | 'servicos' | 'anomalias' | 'adicionais' | 'historico'
  >('contrato')

  // Modais de Criação
  const [modalNovaAnomalia, setModalNovaAnomalia] = useState(false)
  const [modalNovoAdicional, setModalNovoAdicional] = useState(false)

  // Formulário Nova Anomalia
  const [novaAnomaliaTitulo, setNovaAnomaliaTitulo] = useState('')
  const [novaAnomaliaDesc, setNovaAnomaliaDesc] = useState('')
  const [novaAnomaliaEtapa, setNovaAnomaliaEtapa] = useState<OMAnomaliaEtapa>('Detecção')
  const [novaAnomaliaStatus, setNovaAnomaliaStatus] = useState<OMAnomaliaStatus>('Aberto')
  const [novaAnomaliaTecnico, setNovaAnomaliaTecnico] = useState('')
  const [novaAnomaliaSeveridade, setNovaAnomaliaSeveridade] = useState<
    'Baixa' | 'Média' | 'Alta' | 'Crítica'
  >('Média')

  // Formulário Novo Adicional
  const [novoAdicTipo, setNovoAdicTipo] = useState<OMServicoAdicionalTipo>('diagnostico_tecnico')
  const [novoAdicDesc, setNovoAdicDesc] = useState('')
  const [novoAdicValor, setNovoAdicValor] = useState<number>(350)
  const [novoAdicStatus, setNovoAdicStatus] = useState<OMServicoAdicionalStatus>('pendente')
  const [novoAdicTecnico, setNovoAdicTecnico] = useState('')

  const cliente = useMemo(() => {
    if (!selectedOMClienteId) return null
    return clientes.find((c) => c.id === selectedOMClienteId) || null
  }, [clientes, selectedOMClienteId])

  const sistema = useMemo(() => {
    if (!selectedOMClienteId) return null
    return sistemas.find((s) => s.cliente_id === selectedOMClienteId) || null
  }, [sistemas, selectedOMClienteId])

  const contrato = useMemo(() => {
    if (!selectedOMClienteId) return null
    return contratosOM.find((c) => c.cliente_id === selectedOMClienteId) || null
  }, [contratosOM, selectedOMClienteId])

  const clienteAnomalias = useMemo(() => {
    if (!selectedOMClienteId) return []
    return anomaliasOM
      .filter((a) => a.cliente_id === selectedOMClienteId)
      .sort((a, b) => new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime())
  }, [anomaliasOM, selectedOMClienteId])

  const clienteAdicionais = useMemo(() => {
    if (!selectedOMClienteId) return []
    return servicosAdicionaisOM
      .filter((s) => s.cliente_id === selectedOMClienteId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [servicosAdicionaisOM, selectedOMClienteId])

  const clienteTimeline = useMemo(() => {
    if (!selectedOMClienteId) return []
    return timelineOM
      .filter((t) => t.cliente_id === selectedOMClienteId)
      .sort(
        (a, b) => new Date(b.data || b.created).getTime() - new Date(a.data || a.created).getTime(),
      )
  }, [timelineOM, selectedOMClienteId])

  if (!selectedOMClienteId || !cliente) {
    return null
  }

  // Cálculos de dias até vencimento
  const diasAteVencimento = contrato?.data_vencimento
    ? Math.ceil(
        (new Date(contrato.data_vencimento).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0

  // Cores de status do plano
  const getStatusBadge = (status?: OMStatusPlano) => {
    switch (status) {
      case 'Ativo':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Ativo
          </span>
        )
      case 'Vencendo em 30 dias':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Vencendo em 30 dias
          </span>
        )
      case 'Vencido':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Vencido
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status || 'Sem contrato'}
          </span>
        )
    }
  }

  const getPlanoColor = (plano?: OMPlanoTipo) => {
    switch (plano) {
      case 'Completo':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Prevenção':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Essencial':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
  }

  // Toggle serviço realizado / agendado no contrato
  const handleToggleServico = async (servicoNome: string, tipo: 'realizado' | 'agendado') => {
    if (!contrato) return
    const realizados = new Set(contrato.servicos_realizados || [])
    const agendados = new Set(contrato.servicos_agendados || [])

    if (tipo === 'realizado') {
      if (realizados.has(servicoNome)) {
        realizados.delete(servicoNome)
      } else {
        realizados.add(servicoNome)
        agendados.delete(servicoNome)
      }
    } else {
      if (agendados.has(servicoNome)) {
        agendados.delete(servicoNome)
      } else {
        agendados.add(servicoNome)
      }
    }

    await updateContratoOM(contrato.id, {
      servicos_realizados: Array.from(realizados),
      servicos_agendados: Array.from(agendados),
    })
  }

  // Salvar nova anomalia
  const handleCriarAnomalia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaAnomaliaTitulo.trim()) return

    const totalAno = anomaliasOM.length + 1
    const codigoGen = `ANO-2026-${String(totalAno).padStart(3, '0')}`

    await addAnomaliaOM({
      cliente_id: cliente.id,
      contrato_id: contrato?.id,
      codigo: codigoGen,
      titulo: novaAnomaliaTitulo.trim(),
      descricao: novaAnomaliaDesc.trim(),
      etapa: novaAnomaliaEtapa,
      status: novaAnomaliaStatus,
      severidade: novaAnomaliaSeveridade,
      data_abertura: new Date().toISOString(),
      tecnico_nome: novaAnomaliaTecnico || 'Lucas Gabriel Zanin',
    })

    setNovaAnomaliaTitulo('')
    setNovaAnomaliaDesc('')
    setModalNovaAnomalia(false)
  }

  // Avançar etapa de anomalia
  const handleAvancarEtapaAnomalia = async (anomaliaId: string, etapaAtual: OMAnomaliaEtapa) => {
    const idx = ETAPAS_ANOMALIA.indexOf(etapaAtual)
    if (idx < ETAPAS_ANOMALIA.length - 1) {
      const proxima = ETAPAS_ANOMALIA[idx + 1]
      const novoStatus: OMAnomaliaStatus = proxima === 'Faturamento' ? 'Resolvido' : 'Em execução'
      await updateAnomaliaOM(anomaliaId, {
        etapa: proxima,
        status: novoStatus,
        data_resolucao: proxima === 'Faturamento' ? new Date().toISOString() : undefined,
      })
    }
  }

  // Salvar novo serviço adicional
  const handleCriarAdicional = async (e: React.FormEvent) => {
    e.preventDefault()
    const desc =
      novoAdicDesc.trim() ||
      SERVICOS_ADICIONAIS_OPCOES.find((o) => o.value === novoAdicTipo)?.label ||
      'Serviço adicional'

    await addServicoAdicionalOM({
      cliente_id: cliente.id,
      contrato_id: contrato?.id,
      tipo: novoAdicTipo,
      descricao: desc,
      valor: Number(novoAdicValor) || 0,
      status: novoAdicStatus,
      data: new Date().toISOString(),
      tecnico_nome: novoAdicTecnico || 'Lucas Gabriel Zanin',
    })

    setNovoAdicDesc('')
    setModalNovoAdicional(false)
  }

  const potenciaExibida = sistema?.potencia_total_kwp ?? cliente.potencia_kwp ?? 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={closeFichaOM}
        aria-hidden="true"
      />

      {/* Drawer largo (~780px ou quase tela inteira no desktop) */}
      <div className="relative z-50 w-full sm:w-[820px] lg:w-[860px] max-w-full bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">
                  {cliente.nome}
                </h2>
                {contrato && getStatusBadge(contrato.status)}
                {contrato && (
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getPlanoColor(
                      contrato.plano,
                    )}`}
                  >
                    Plano {contrato.plano}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {cliente.cidade || 'Erechim/RS'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {potenciaExibida > 0 ? `${potenciaExibida} kWp` : 'Potência n/d'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={closeFichaOM}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0"
            title="Fechar ficha de O&M"
            aria-label="Fechar ficha"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 bg-[#F8FAF9] border-b border-gray-200/90 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('contrato')}
            className={`px-3 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'contrato'
                ? 'border-[#16A34A] text-[#166534] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>1. Dados do Contrato</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adicionais')}
            className={`px-3 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'adicionais'
                ? 'border-[#16A34A] text-[#166534] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Wrench className="w-4 h-4 text-blue-600" />
            <span>4. Serviços Adicionais</span>
            {clienteAdicionais.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                {clienteAdicionais.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'historico'
                ? 'border-[#16A34A] text-[#166534] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <History className="w-4 h-4 text-gray-600" />
            <span>5. Histórico</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-[#F8FAF9]/60">
          {/* ======================================================== */}
          {/* 1. SEÇÃO: DADOS DO CONTRATO                              */}
          {/* ======================================================== */}
          {activeTab === 'contrato' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Cards de Métricas Principais do Contrato */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                    Plano Contratado
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-bold text-gray-900">
                      {contrato?.plano || 'Nenhum'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Garantia e cobertura operacional Delfos
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                    Valor Mensal
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-bold text-emerald-700">
                      {formatCurrency(contrato?.valor_mensal || 0)}
                    </span>
                    <span className="text-xs text-gray-400">/mês</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Cobrança recorrente mensal</div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                    Total Anual
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(contrato?.valor_anual || 0)}
                    </span>
                    <span className="text-xs text-gray-400">/ano</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">12 parcelas contratadas</div>
                </div>
              </div>

              {/* Vigência & Dias até Vencimento */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-emerald-600" />
                  Vigência e Validade do Contrato
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                    <div className="text-xs text-gray-500">Início da Vigência</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">
                      {contrato?.data_inicio ? formatDate(contrato.data_inicio) : 'n/d'}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                    <div className="text-xs text-gray-500">Data de Vencimento</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">
                      {contrato?.data_vencimento ? formatDate(contrato.data_vencimento) : 'n/d'}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70">
                    <div className="text-xs text-emerald-800 font-medium">Dias até Vencimento</div>
                    <div className="text-base font-extrabold mt-0.5 flex items-center gap-1.5">
                      {diasAteVencimento < 0 ? (
                        <span className="text-rose-600">
                          Vencido há {Math.abs(diasAteVencimento)} dias
                        </span>
                      ) : diasAteVencimento <= 30 ? (
                        <span className="text-amber-600">
                          {diasAteVencimento} dias restantes (atenção)
                        </span>
                      ) : (
                        <span className="text-emerald-700">{diasAteVencimento} dias</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Próxima atividade agendada destacada */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                      Próxima Atividade de O&M Agendada
                    </div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">
                      {contrato?.proxima_atividade_titulo ||
                        'Nenhuma atividade agendada no momento'}
                    </div>
                    {contrato?.proxima_atividade_data && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Previsto para {formatDate(contrato.proxima_atividade_data)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações / Notas do contrato */}
                {contrato?.observacoes && (
                  <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200 text-xs text-gray-600">
                    <span className="font-bold text-gray-700">Observações contratuais:</span>{' '}
                    {contrato.observacoes}
                  </div>
                )}
              </div>

              {/* Resumo do Sistema Fotovoltaico do Cliente */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Dados do Sistema Fotovoltaico Conectado
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block">Potência Pico</span>
                    <span className="font-bold text-gray-800 text-sm">
                      {potenciaExibida > 0 ? `${potenciaExibida} kWp` : 'n/d'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block">Inversor</span>
                    <span className="font-bold text-gray-800 text-sm truncate block">
                      {sistema?.modelo_inversores || cliente.inversor_marca || 'Fronius/Huawei'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block">Módulos</span>
                    <span className="font-bold text-gray-800 text-sm">
                      {sistema?.quantidade_modulos || cliente.placas_qtd || '—'} placas
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block">Unidade Consumidora</span>
                    <span className="font-bold text-gray-800 text-sm">
                      {sistema?.numero_uc || cliente.uc || 'n/d'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. SEÇÃO: SERVIÇOS DO PLANO                              */}
          {/* ======================================================== */}
          {activeTab === 'servicos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-emerald-900">
                    Cobertura Operacional do Plano {contrato?.plano || 'O&M'}
                  </div>
                  <div className="text-emerald-700 mt-0.5">
                    Marque os serviços com check (já realizados) ou calendário (próximos agendados).
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Realizado
                  </span>
                  <span className="inline-flex items-center gap-1 text-blue-700">
                    <Calendar className="w-4 h-4 text-blue-600" /> Agendado
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 shadow-xs overflow-hidden">
                {SERVICOS_CATALOGO_OM.map((srv, idx) => {
                  const isRealizado = (contrato?.servicos_realizados || []).includes(srv.nome)
                  const isAgendado = (contrato?.servicos_agendados || []).includes(srv.nome)

                  return (
                    <div
                      key={srv.id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            isRealizado
                              ? 'bg-emerald-100 text-emerald-700'
                              : isAgendado
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <span>{srv.nome}</span>
                            {isRealizado && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Realizado
                              </span>
                            )}
                            {isAgendado && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                <Calendar className="w-3 h-3 text-blue-600" /> Agendado
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Frequência prevista: {srv.freq}
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação Rápida */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleServico(srv.nome, 'realizado')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                            isRealizado
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                          title="Alternar status de realizado"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isRealizado ? 'Concluído' : 'Marcar Check'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleServico(srv.nome, 'agendado')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                            isAgendado
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                          title="Alternar status de agendado"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{isAgendado ? 'Agendado' : 'Agendar'}</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. SEÇÃO: PROTOCOLO DE ANOMALIAS                         */}
          {/* ======================================================== */}
          {activeTab === 'anomalias' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Protocolo Operacional de Anomalias
                  </h3>
                  <p className="text-xs text-gray-500">
                    Acompanhamento passo-a-passo: Detecção, Triagem, Diagnóstico, Execução e
                    Faturamento
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNovaAnomalia(true)}
                  className="px-3.5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Anomalia
                </button>
              </div>

              {/* Modal Inline Nova Anomalia */}
              {modalNovaAnomalia && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase">
                      Registrar Nova Anomalia Detectada
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalNovaAnomalia(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                  <form onSubmit={handleCriarAnomalia} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Título / Falha Detectada *
                      </label>
                      <input
                        type="text"
                        required
                        value={novaAnomaliaTitulo}
                        onChange={(e) => setNovaAnomaliaTitulo(e.target.value)}
                        placeholder="Ex: Aquecimento em conector MC4 da String 2"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Descrição Técnica
                      </label>
                      <textarea
                        rows={2}
                        value={novaAnomaliaDesc}
                        onChange={(e) => setNovaAnomaliaDesc(e.target.value)}
                        placeholder="Detalhes observados via telemetria ou relato do cliente..."
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Etapa Inicial
                        </label>
                        <select
                          value={novaAnomaliaEtapa}
                          onChange={(e) => setNovaAnomaliaEtapa(e.target.value as OMAnomaliaEtapa)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                        >
                          {ETAPAS_ANOMALIA.map((et) => (
                            <option key={et} value={et}>
                              {et}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Técnico Responsável
                        </label>
                        <select
                          value={novaAnomaliaTecnico}
                          onChange={(e) => setNovaAnomaliaTecnico(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                        >
                          <option value="">Selecione um técnico...</option>
                          {profissionais.map((p) => (
                            <option key={p.id} value={p.nome}>
                              {p.nome} ({p.especialidade})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Severidade</label>
                        <select
                          value={novaAnomaliaSeveridade}
                          onChange={(e) => setNovaAnomaliaSeveridade(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                        >
                          <option value="Baixa">Baixa</option>
                          <option value="Média">Média</option>
                          <option value="Alta">Alta</option>
                          <option value="Crítica">Crítica</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setModalNovaAnomalia(false)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 text-xs hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#16A34A] text-white rounded-lg text-xs font-bold hover:bg-[#15803D]"
                      >
                        Salvar Anomalia
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Lista de Anomalias com Visualização de Pipeline */}
              {clienteAnomalias.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-800">Nenhuma anomalia ativa</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    O sistema opera normalmente dentro dos parâmetros ideais de geração solar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clienteAnomalias.map((anom) => {
                    const etapaIdx = ETAPAS_ANOMALIA.indexOf(anom.etapa)

                    return (
                      <div
                        key={anom.id}
                        className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-bold">
                                {anom.codigo || 'ANO-2026'}
                              </span>
                              <h4 className="text-sm font-bold text-gray-900">{anom.titulo}</h4>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  anom.status === 'Resolvido'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : anom.status === 'Em execução'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {anom.status}
                              </span>
                              {anom.severidade && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                  {anom.severidade}
                                </span>
                              )}
                            </div>
                            {anom.descricao && (
                              <p className="text-xs text-gray-600 mt-1.5">{anom.descricao}</p>
                            )}
                          </div>

                          <div className="text-right text-xs text-gray-500 shrink-0">
                            <div>Aberto em {formatDate(anom.data_abertura)}</div>
                            {anom.data_resolucao && (
                              <div className="text-emerald-700 font-medium">
                                Resolvido em {formatDate(anom.data_resolucao)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pipeline de 6 Etapas */}
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                            Progresso do Protocolo:
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
                            {ETAPAS_ANOMALIA.map((et, idx) => {
                              const isCompleted = idx < etapaIdx
                              const isCurrent = idx === etapaIdx
                              const isPending = idx > etapaIdx

                              return (
                                <div
                                  key={et}
                                  className={`p-2 rounded-lg text-center border transition-all ${
                                    isCurrent
                                      ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                                      : isCompleted
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                                        : 'bg-gray-50 text-gray-400 border-gray-200/60'
                                  }`}
                                >
                                  <div className="text-[10px] opacity-80">Etapa {idx + 1}</div>
                                  <div
                                    className="text-[11px] leading-tight truncate mt-0.5"
                                    title={et}
                                  >
                                    {et}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Técnico & Ações */}
                        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              Técnico responsável:{' '}
                              <strong className="text-gray-800">
                                {anom.tecnico_nome || 'A definir'}
                              </strong>
                            </span>
                          </div>

                          {anom.etapa !== 'Faturamento' && (
                            <button
                              type="button"
                              onClick={() => handleAvancarEtapaAnomalia(anom.id, anom.etapa)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Avançar para próxima etapa</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. SEÇÃO: SERVIÇOS ADICIONAIS                            */}
          {/* ======================================================== */}
          {activeTab === 'adicionais' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Serviços Adicionais Contratados
                  </h3>
                  <p className="text-xs text-gray-500">
                    Inspeções pontuais, trocas de inversores, termografia e manutenções corretivas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNovoAdicional(true)}
                  className="px-3.5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Serviço Extra
                </button>
              </div>

              {/* Modal Novo Serviço Adicional */}
              {modalNovoAdicional && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 uppercase">
                      Lançar Serviço Adicional
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalNovoAdicional(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                  <form onSubmit={handleCriarAdicional} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Tipo de Serviço
                        </label>
                        <select
                          value={novoAdicTipo}
                          onChange={(e) => {
                            const val = e.target.value as OMServicoAdicionalTipo
                            setNovoAdicTipo(val)
                            const op = SERVICOS_ADICIONAIS_OPCOES.find((o) => o.value === val)
                            if (op) setNovoAdicValor(op.valorBase)
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                        >
                          {SERVICOS_ADICIONAIS_OPCOES.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Valor Cobrado (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={novoAdicValor}
                          onChange={(e) => setNovoAdicValor(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Descrição / Escopo
                      </label>
                      <input
                        type="text"
                        value={novoAdicDesc}
                        onChange={(e) => setNovoAdicDesc(e.target.value)}
                        placeholder="Ex: Auditoria de rateio das 3 contas filiais..."
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Status</label>
                        <select
                          value={novoAdicStatus}
                          onChange={(e) => setNovoAdicStatus(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em execução">Em Execução</option>
                          <option value="faturado">Faturado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Técnico Encarregado
                        </label>
                        <select
                          value={novoAdicTecnico}
                          onChange={(e) => setNovoAdicTecnico(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                        >
                          <option value="">Selecione...</option>
                          {profissionais.map((p) => (
                            <option key={p.id} value={p.nome}>
                              {p.nome} ({p.especialidade})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setModalNovoAdicional(false)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 text-xs hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                      >
                        Salvar Serviço Extra
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tabela de Serviços Adicionais */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                {clienteAdicionais.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs">
                    Nenhum serviço adicional contratado até o momento.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAF9] border-b border-gray-200 font-semibold text-gray-600 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Descrição do Serviço</th>
                        <th className="py-3 px-4">Técnico</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clienteAdicionais.map((srv) => (
                        <tr key={srv.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 text-gray-500 font-medium whitespace-nowrap">
                            {formatDate(srv.data)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900">{srv.descricao}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {srv.tecnico_nome || '—'}
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                            {formatCurrency(srv.valor)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                srv.status === 'faturado'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : srv.status === 'em execução'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {srv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {srv.status !== 'faturado' && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateServicoAdicionalOM(srv.id, { status: 'faturado' })
                                }
                                className="text-emerald-600 hover:text-emerald-800 font-semibold hover:underline"
                              >
                                Faturar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. SEÇÃO: HISTÓRICO DE ATENDIMENTOS (TIMELINE)           */}
          {/* ======================================================== */}
          {activeTab === 'historico' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Linha do Tempo de Atendimentos
                  </h3>
                  <p className="text-xs text-gray-500">
                    Histórico cronológico completo: anomalias, serviços realizados, relatórios e
                    contatos
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-medium">Mais recente no topo</span>
              </div>

              {clienteTimeline.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
                  <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Nenhum evento registrado ainda.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {clienteTimeline.map((item) => {
                    return (
                      <div key={item.id} className="relative group">
                        {/* Dot indicador */}
                        <div
                          className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                            item.tipo === 'anomalia'
                              ? 'bg-amber-500'
                              : item.tipo === 'servico_plano'
                                ? 'bg-emerald-500'
                                : item.tipo === 'servico_adicional'
                                  ? 'bg-blue-500'
                                  : item.tipo === 'relatorio'
                                    ? 'bg-purple-500'
                                    : 'bg-gray-400'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>

                        {/* Card do Evento */}
                        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs space-y-2 hover:border-emerald-300 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-900">{item.titulo}</span>
                              {item.status_tag && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                  {item.status_tag}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                              {formatDate(item.data)}
                            </span>
                          </div>

                          {item.descricao && (
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {item.descricao}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                            <span>Registrado por: {item.autor || 'Sistema Delfos'}</span>
                            <span className="capitalize">{item.tipo.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
