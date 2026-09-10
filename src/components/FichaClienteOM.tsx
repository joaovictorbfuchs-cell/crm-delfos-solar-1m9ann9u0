import React, { useState, useMemo } from 'react'
import {
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
  Check,
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
import {
  SERVICOS_CATALOGO_OM,
  SERVICOS_ADICIONAIS_OPCOES,
  ETAPAS_ANOMALIA,
} from '@/components/FichaOMDrawer'

interface FichaClienteOMProps {
  clienteId: string
  onNavigateToTab?: (tab: 'historico' | 'projeto' | 'om') => void
}

export const FichaClienteOM: React.FC<FichaClienteOMProps> = ({ clienteId, onNavigateToTab }) => {
  const {
    clientes,
    sistemas,
    contratosOM,
    anomaliasOM,
    servicosAdicionaisOM,
    profissionais,
    updateContratoOM,
    addContratoOM,
    addAnomaliaOM,
    updateAnomaliaOM,
    addServicoAdicionalOM,
    updateServicoAdicionalOM,
    addAtividade,
  } = useClientes()

  const [activeSubTab, setActiveSubTab] = useState<'plano' | 'adicionais' | 'anomalias'>('plano')

  // Modais de Criação
  const [modalNovaAnomalia, setModalNovaAnomalia] = useState(false)
  const [modalNovoAdicional, setModalNovoAdicional] = useState(false)
  const [modalOferecerPlano, setModalOferecerPlano] = useState(false)

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

  // Formulário Oferecer / Criar Contrato de Plano
  const [novoPlanoTipo, setNovoPlanoTipo] = useState<OMPlanoTipo>('Essencial')
  const [novoPlanoValorMensal, setNovoPlanoValorMensal] = useState<number>(190)
  const [novoPlanoObs, setNovoPlanoObs] = useState('')

  const cliente = useMemo(() => {
    return clientes.find((c) => c.id === clienteId) || null
  }, [clientes, clienteId])

  const sistema = useMemo(() => {
    return sistemas.find((s) => s.cliente_id === clienteId) || null
  }, [sistemas, clienteId])

  const contrato = useMemo(() => {
    return contratosOM.find((c) => c.cliente_id === clienteId) || null
  }, [contratosOM, clienteId])

  const clienteAnomalias = useMemo(() => {
    return anomaliasOM
      .filter((a) => a.cliente_id === clienteId)
      .sort((a, b) => new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime())
  }, [anomaliasOM, clienteId])

  const clienteAdicionais = useMemo(() => {
    return servicosAdicionaisOM
      .filter((s) => s.cliente_id === clienteId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [servicosAdicionaisOM, clienteId])

  if (!cliente) return null

  // Cálculos de dias até vencimento
  const diasAteVencimento = contrato?.data_vencimento
    ? Math.ceil(
        (new Date(contrato.data_vencimento).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0

  const getStatusBadge = (status?: OMStatusPlano) => {
    switch (status) {
      case 'Ativo':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Plano Ativo
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
        // Adicionar registro na timeline de atividades
        try {
          await addAtividade({
            cliente_id: cliente.id,
            tipo: 'limpeza_manutencao',
            titulo: `O&M: ${servicoNome} realizado`,
            descricao: `Serviço do Plano O&M marcado como concluído no sistema.`,
            data: new Date().toISOString(),
            status: 'concluida',
            autor: 'Equipe O&M Delfos',
          })
        } catch {
          /* intentionally ignored */
        }
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

  // Criar nova anomalia
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

    // Adiciona na timeline de atividades
    try {
      await addAtividade({
        cliente_id: cliente.id,
        tipo: 'garantia_equipamento',
        titulo: `Anomalia ${codigoGen}: ${novaAnomaliaTitulo.trim()}`,
        descricao:
          novaAnomaliaDesc.trim() ||
          `Severidade: ${novaAnomaliaSeveridade}. Etapa inicial: ${novaAnomaliaEtapa}.`,
        data: new Date().toISOString(),
        status: novaAnomaliaStatus === 'Resolvido' ? 'concluida' : 'pendente',
        autor: novaAnomaliaTecnico || 'Equipe O&M',
      })
    } catch {
      /* intentionally ignored */
    }

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

      try {
        const anom = anomaliasOM.find((a) => a.id === anomaliaId)
        await addAtividade({
          cliente_id: cliente.id,
          tipo: 'garantia_equipamento',
          titulo: `Anomalia ${anom?.codigo || ''}: Avançou para ${proxima}`,
          descricao: `Etapa atualizada de ${etapaAtual} para ${proxima}. Status: ${novoStatus}.`,
          data: new Date().toISOString(),
          status: novoStatus === 'Resolvido' ? 'concluida' : 'pendente',
          autor: anom?.tecnico_nome || 'Equipe O&M',
        })
      } catch {
        /* intentionally ignored */
      }
    }
  }

  // Criar serviço adicional
  const handleCriarAdicional = async (e: React.FormEvent) => {
    e.preventDefault()
    const op = SERVICOS_ADICIONAIS_OPCOES.find((o) => o.value === novoAdicTipo)
    const desc = novoAdicDesc.trim() || op?.label || 'Serviço adicional'

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

    // Adiciona na timeline de atividades
    try {
      await addAtividade({
        cliente_id: cliente.id,
        tipo: 'limpeza_manutencao',
        titulo: `Serviço Avulso: ${op?.label || desc}`,
        descricao: `${desc} — Valor: ${formatCurrency(novoAdicValor)} — Status: ${novoAdicStatus}${
          novoAdicTecnico ? ` — Resp: ${novoAdicTecnico}` : ''
        }`,
        data: new Date().toISOString(),
        status: novoAdicStatus === 'faturado' ? 'concluida' : 'pendente',
        autor: novoAdicTecnico || 'Equipe O&M',
      })
    } catch {
      /* intentionally ignored */
    }

    setNovoAdicDesc('')
    setModalNovoAdicional(false)
  }

  // Contratar / Oferecer Plano
  const handleOferecerPlano = async (e: React.FormEvent) => {
    e.preventDefault()
    const hoje = new Date()
    const vencimento = new Date()
    vencimento.setFullYear(vencimento.getFullYear() + 1)

    const valorMensal = Number(novoPlanoValorMensal) || 190
    const valorAnual = valorMensal * 12

    const novo = await addContratoOM({
      cliente_id: cliente.id,
      plano: novoPlanoTipo,
      status: 'Ativo',
      valor_mensal: valorMensal,
      valor_anual: valorAnual,
      data_inicio: hoje.toISOString(),
      data_vencimento: vencimento.toISOString(),
      servicos_realizados: [],
      servicos_agendados: [
        'Monitoramento da geração em horários comerciais',
        'Relatório mensal de desempenho',
      ],
      proxima_atividade_titulo: `Inspeção e monitoramento inicial - Plano ${novoPlanoTipo}`,
      proxima_atividade_data: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      observacoes: novoPlanoObs.trim(),
    })

    try {
      await addAtividade({
        cliente_id: cliente.id,
        tipo: 'proposta',
        titulo: `Contratação do Plano O&M ${novoPlanoTipo}`,
        descricao: `Plano ativado no valor de ${formatCurrency(valorMensal)}/mês (${formatCurrency(
          valorAnual,
        )}/ano) com vigência de 12 meses.`,
        data: hoje.toISOString(),
        status: 'concluida',
        autor: 'Equipe Comercial O&M',
      })
    } catch {
      /* intentionally ignored */
    }

    setModalOferecerPlano(false)
  }

  const potenciaExibida = sistema?.potencia_total_kwp ?? cliente.potencia_kwp ?? 0

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Mini-subabas internas do O&M para navegar entre Contrato/Serviços, Serviços Avulsos e Anomalias */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('plano')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'plano'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Plano O&M</span>
            {contrato && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-semibold">
                {contrato.plano}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('adicionais')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'adicionais'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Serviços Avulsos</span>
            {clienteAdicionais.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  activeSubTab === 'adicionais'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {clienteAdicionais.length}
              </span>
            )}
          </button>
        </div>

        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('historico')}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ver eventos na Timeline</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. SEÇÃO DO PLANO O&M                                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'plano' && (
        <div className="space-y-4">
          {!contrato ? (
            /* Cliente sem plano ativo: Destaque de Oportunidade e ações para ofertar */
            <div className="p-6 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 rounded-2xl border-2 border-dashed border-amber-300 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mb-1.5">
                    Oportunidade de Prospecção O&M
                  </div>
                  <h3 className="text-base font-bold text-gray-900">
                    Este cliente não possui plano O&M contratado
                  </h3>
                  <p className="text-xs text-gray-600 max-w-xl mt-1 leading-relaxed">
                    Sistemas sem plano de manutenção preventiva perdem até 25% de geração por
                    sujidade e têm maior tempo de inatividade em falhas elétricas. Você pode
                    oferecer um dos planos anuais ou registrar um serviço avulso avulso imediato
                    (ex.: limpeza ou diagnóstico).
                  </p>
                </div>
              </div>

              {/* Botões de Ação para o Cliente Sem Plano */}
              <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-amber-200/60">
                <button
                  type="button"
                  onClick={() => setModalOferecerPlano(true)}
                  className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Oferecer Plano O&M</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalNovoAdicional(true)
                    setActiveSubTab('adicionais')
                  }}
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-300 shadow-2xs transition-colors inline-flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>Registrar Serviço Avulso</span>
                </button>
              </div>
            </div>
          ) : (
            /* Cliente COM plano O&M contratado */
            <div className="space-y-4">
              {/* Header do Contrato com Vigência e Valores */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/30 space-y-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Contrato O&M Ativo
                      </div>
                      <h4 className="text-base font-bold text-gray-900">Plano {contrato.plano}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(contrato.status)}
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getPlanoColor(
                        contrato.plano,
                      )}`}
                    >
                      {contrato.plano}
                    </span>
                  </div>
                </div>

                {/* Métricas do Contrato */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                      Mensalidade
                    </span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {formatCurrency(contrato.valor_mensal)}/mês
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                      Total Anual
                    </span>
                    <span className="font-bold text-gray-800 text-sm">
                      {formatCurrency(contrato.valor_anual)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                      Vencimento
                    </span>
                    <span className="font-semibold text-gray-800">
                      {contrato.data_vencimento ? formatDate(contrato.data_vencimento) : 'n/d'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                      Dias Restantes
                    </span>
                    <span
                      className={`font-bold ${
                        diasAteVencimento < 0
                          ? 'text-rose-600'
                          : diasAteVencimento <= 30
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                      }`}
                    >
                      {diasAteVencimento < 0
                        ? `Vencido há ${Math.abs(diasAteVencimento)}d`
                        : `${diasAteVencimento} dias`}
                    </span>
                  </div>
                </div>

                {/* Próxima Atividade de O&M Agendada */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-blue-900">
                      Próximo atendimento agendado do plano:
                    </div>
                    <div className="text-gray-800 font-semibold mt-0.5">
                      {contrato.proxima_atividade_titulo || 'Aguardando agendamento'}
                    </div>
                    {contrato.proxima_atividade_data && (
                      <div className="text-blue-700 text-[11px] mt-0.5">
                        Data prevista: {formatDate(contrato.proxima_atividade_data)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabela de Serviços Inclusos no Plano com Check / Calendário */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {SERVICOS_CATALOGO_OM.map((srv, idx) => {
                    const isRealizado = (contrato.servicos_realizados || []).includes(srv.nome)
                    const isAgendado = (contrato.servicos_agendados || []).includes(srv.nome)

                    return
                    null
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Modal para Oferecer Plano */}
          {modalOferecerPlano && (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Contratar / Oferecer Plano O&M para {cliente.nome}
                </span>
                <button
                  type="button"
                  onClick={() => setModalOferecerPlano(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleOferecerPlano} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Tipo de Plano O&M
                    </label>
                    <select
                      value={novoPlanoTipo}
                      onChange={(e) => {
                        const val = e.target.value as OMPlanoTipo
                        setNovoPlanoTipo(val)
                        if (val === 'Essencial') setNovoPlanoValorMensal(190)
                        if (val === 'Prevenção') setNovoPlanoValorMensal(450)
                        if (val === 'Completo') setNovoPlanoValorMensal(1450)
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                    >
                      <option value="Essencial">Essencial (R$ 190/mês)</option>
                      <option value="Prevenção">Prevenção (R$ 450/mês)</option>
                      <option value="Completo">Completo (R$ 1.450/mês)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Valor Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={novoPlanoValorMensal}
                      onChange={(e) => setNovoPlanoValorMensal(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Observações do Contrato
                  </label>
                  <textarea
                    rows={2}
                    value={novoPlanoObs}
                    onChange={(e) => setNovoPlanoObs(e.target.value)}
                    placeholder="Condições especiais negociadas, número de visitas anuais..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOferecerPlano(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 text-xs hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#16A34A] text-white rounded-lg text-xs font-bold hover:bg-[#15803D]"
                  >
                    Ativar Contrato O&M
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SEÇÃO DE SERVIÇOS AVULSOS / ADICIONAIS                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'adicionais' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Serviços Avulsos / Adicionais Contratados
              </h3>
              <p className="text-xs text-gray-500">
                Serviços pagos à parte: limpezas avulsas, diagnósticos, termografia, substituições e
                auditorias.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalNovoAdicional(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Serviço Avulso</span>
            </button>
          </div>

          {/* Modal Inline Novo Serviço Adicional */}
          {modalNovoAdicional && (
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase">
                  Registrar Novo Serviço Avulso
                </span>
                <button
                  type="button"
                  onClick={() => setModalNovoAdicional(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleCriarAdicional} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Catálogo de Serviços O&M
                    </label>
                    <select
                      value={novoAdicTipo}
                      onChange={(e) => {
                        const val = e.target.value as OMServicoAdicionalTipo
                        setNovoAdicTipo(val)
                        const op = SERVICOS_ADICIONAIS_OPCOES.find((o) => o.value === val)
                        if (op) setNovoAdicValor(op.valorBase)
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                    >
                      {SERVICOS_ADICIONAIS_OPCOES.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label} (~{formatCurrency(op.valorBase)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Valor Cobrado (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={novoAdicValor}
                      onChange={(e) => setNovoAdicValor(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Descrição Detalhada do Serviço
                  </label>
                  <input
                    type="text"
                    value={novoAdicDesc}
                    onChange={(e) => setNovoAdicDesc(e.target.value)}
                    placeholder="Ex: Lavagem das 64 placas com água desmineralizada e verificação de conexões..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={novoAdicStatus}
                      onChange={(e) => setNovoAdicStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em execução">Em Execução</option>
                      <option value="faturado">Faturado / Concluído</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Técnico Responsável
                    </label>
                    <select
                      value={novoAdicTecnico}
                      onChange={(e) => setNovoAdicTecnico(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                    >
                      <option value="">Selecione um técnico...</option>
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
                    Salvar Serviço Avulso
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabela de Serviços Adicionais */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            {clienteAdicionais.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs space-y-2">
                <Wrench className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="font-semibold text-gray-700">Nenhum serviço avulso registrado</p>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Clique no botão "+ Novo Serviço Avulso" acima para registrar limpeza, termografia
                  ou manutenção corretiva.
                </p>
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
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
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
                            onClick={() => updateServicoAdicionalOM(srv.id, { status: 'faturado' })}
                            className="text-emerald-600 hover:text-emerald-800 font-semibold hover:underline"
                          >
                            Concluir / Faturar
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

      {/* ========================================================================= */}
      {/* 3. SEÇÃO DO PROTOCOLO DE ANOMALIAS                                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'anomalias' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Protocolo Operacional de Anomalias
              </h3>
              <p className="text-xs text-gray-500">
                Fluxo em 6 etapas: Detecção → Solicitação de Info → Triagem Remota → Diagnóstico In
                Loco → Execução → Faturamento
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalNovaAnomalia(true)}
              className="px-3.5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Anomalia</span>
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
                  className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
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
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
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
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Etapa Inicial</label>
                    <select
                      value={novaAnomaliaEtapa}
                      onChange={(e) => setNovaAnomaliaEtapa(e.target.value as OMAnomaliaEtapa)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
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
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
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
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
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

          {/* Lista de Anomalias com Pipeline */}
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
                    className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-4"
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
                              <div className="text-[11px] leading-tight truncate mt-0.5" title={et}>
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
    </div>
  )
}
