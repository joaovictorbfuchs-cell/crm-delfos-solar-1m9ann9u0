import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  AlertTriangle,
  FileText,
  DollarSign,
  Sun,
  PieChart,
  ShieldAlert,
  Send,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Info,
  BarChart3,
  Receipt,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  obterRelatorioFaturaPorToken,
  type AnaliseFaturaRegistro,
  type AnaliseFaturaCompletaDados,
} from '@/services/analiseFaturaService'
import { ModalEnviarAnaliseWhatsApp } from '@/components/ModalEnviarAnaliseWhatsApp'
import { useToast } from '@/hooks/use-toast'

interface ConsumoHistoricoItem {
  mes: string
  consumo_kwh: number
  dias_ciclo?: number
  isMax?: boolean
  isMin?: boolean
}

export const RelatorioFaturaPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const { toast } = useToast()

  const [registro, setRegistro] = useState<AnaliseFaturaRegistro | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [clienteTelefone, setClienteTelefone] = useState('')

  useEffect(() => {
    async function carregar() {
      if (!token) {
        setError('Token de análise não fornecido na URL.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await obterRelatorioFaturaPorToken(token)
        setRegistro(data)

        if (data.cliente_id) {
          try {
            const clientModule = await import('@/lib/pocketbase/client')
            const pbInst = (clientModule as any).pb || clientModule.default
            const cli = await pbInst.collection('clientes').getOne(data.cliente_id!)
            let contatosDoCli: any[] = []
            try {
              contatosDoCli = await pbInst.collection('contatos_adicionais').getFullList({
                filter: `cliente_id = "${data.cliente_id}"`,
              })
            } catch {
              /* ignore */
            }

            const { resolverNumeroDestinoCliente } =
              await import('@/lib/resolverNumeroDestinoCliente')
            const resolucao = await resolverNumeroDestinoCliente(cli, {
              contatosAdicionais: contatosDoCli,
            })
            if (resolucao.numeroFormatado || resolucao.numero) {
              setClienteTelefone(resolucao.numeroFormatado || resolucao.numero)
            }
          } catch {
            /* intentionally ignored */
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao carregar relatório.'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [token])

  const dados: AnaliseFaturaCompletaDados | null = useMemo(() => {
    return (registro?.dados_completos as AnaliseFaturaCompletaDados) || null
  }, [registro])

  const linkCompleto = useMemo(() => {
    return window.location.href
  }, [])

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkCompleto)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2000)
    toast({
      title: 'Link copiado!',
      description: 'Link direto da análise copiado para compartilhar com o cliente.',
    })
  }

  // Desestruturação segura dos campos da análise
  const cad = dados?.dados_cadastrais_fatura || {}
  const periodo = dados?.periodo || {}
  const papelGd = dados?.papel_gd || {}
  const medicao = dados?.medicao_e_creditos || {}
  const itens = dados?.itens_faturados || []
  const totais = dados?.totais || {}
  const impostos = dados?.impostos || {}
  const indicadores = dados?.indicadores || {}
  const alertas = dados?.alertas || []
  const recomendacoes = dados?.conclusoes_recomendacoes || []

  // --- 1. LÓGICA DE GD E FLUXO DE CRÉDITOS ---
  const gdCalculada = useMemo(() => {
    const injetada =
      typeof medicao.energia_injetada_geracao?.kwh_injetados_mes === 'number'
        ? medicao.energia_injetada_geracao.kwh_injetados_mes
        : registro?.energia_injetada_kwh || 0

    const compensadosMesAtual =
      typeof medicao.creditos?.creditos_compensados_mes_atual_kwh === 'number'
        ? medicao.creditos.creditos_compensados_mes_atual_kwh
        : typeof medicao.creditos?.total_creditos_recebidos_kwh === 'number'
          ? medicao.creditos.total_creditos_recebidos_kwh
          : registro?.creditos_compensados_kwh || 0

    const saldoAtualInstalacao =
      typeof medicao.saldo_energia?.saldo_atual_instalacao_kwh === 'number'
        ? medicao.saldo_energia.saldo_atual_instalacao_kwh
        : registro?.saldo_energia_kwh || 0

    const saldoGeradoNaoUsado = Math.max(
      0,
      Math.round((injetada - compensadosMesAtual) * 100) / 100,
    )
    const acumulouProprio = saldoAtualInstalacao >= saldoGeradoNaoUsado && saldoGeradoNaoUsado > 0

    let participacao = 100
    let retidoPercent = 100
    let kwhEnviados = 0
    let kwhRetidos = injetada
    let detalheFluxo = ''

    if (injetada > 0 && saldoGeradoNaoUsado > 0) {
      if (!acumulouProprio) {
        // Foi para outra instalação do arranjo (autoconsumo remoto)
        participacao = 0
        retidoPercent = injetada > 0 ? Math.round((compensadosMesAtual / injetada) * 1000) / 10 : 0
        kwhEnviados = saldoGeradoNaoUsado
        kwhRetidos = compensadosMesAtual
        detalheFluxo = `${saldoGeradoNaoUsado.toLocaleString('pt-BR')} kWh gerados e não consumidos aqui foram creditados em outra(s) UC(s) do arranjo (autoconsumo remoto).`
      } else {
        participacao = 100
        retidoPercent = 100
        kwhEnviados = 0
        kwhRetidos = injetada
        detalheFluxo = `100% da geração excedente (${saldoGeradoNaoUsado.toLocaleString('pt-BR')} kWh) foi acumulada como saldo nesta própria instalação.`
      }
    } else if (injetada > 0) {
      participacao = 100
      retidoPercent = 100
      kwhEnviados = 0
      kwhRetidos = injetada
      detalheFluxo = `Toda a energia injetada no ciclo (${injetada.toLocaleString('pt-BR')} kWh) foi compensada integralmente nesta instalação.`
    }

    // Se o backend forneceu campos explícitos já calculados, priorizar
    if (
      papelGd.participacao_geracao_percentual !== undefined &&
      papelGd.participacao_geracao_percentual !== null
    ) {
      participacao = papelGd.participacao_geracao_percentual
    }
    if (
      papelGd.percentual_energia_fica_instalacao !== undefined &&
      papelGd.percentual_energia_fica_instalacao !== null
    ) {
      retidoPercent = papelGd.percentual_energia_fica_instalacao
    }
    if (papelGd.kwh_enviados_outras_ucs !== undefined && papelGd.kwh_enviados_outras_ucs !== null) {
      kwhEnviados = papelGd.kwh_enviados_outras_ucs
    }
    if (papelGd.fluxo_creditos_detalhe) {
      detalheFluxo = papelGd.fluxo_creditos_detalhe
    }

    return {
      injetada,
      compensadosMesAtual,
      saldoGeradoNaoUsado,
      saldoAtualInstalacao,
      participacao,
      retidoPercent,
      kwhEnviados,
      kwhRetidos,
      detalheFluxo,
    }
  }, [medicao, registro, papelGd])

  // --- 2. HISTÓRICO DE CONSUMO MENSAL PARA O GRÁFICO ---
  const historicoConsumoFormatado: ConsumoHistoricoItem[] = useMemo(() => {
    const rawList = dados?.historico_consumo || medicao.historico_consumo || []

    if (!Array.isArray(rawList) || rawList.length === 0) {
      // Se não houver histórico extraído, usar ao menos o mês atual se disponível
      const consumoAtual =
        medicao.energia_ativa_consumida?.consumo_mes_kwh || registro?.consumo_kwh || 0
      if (consumoAtual > 0) {
        return [
          {
            mes: periodo.mes_referencia || 'Mês Atual',
            consumo_kwh: consumoAtual,
            isMax: true,
            isMin: true,
          },
        ]
      }
      return []
    }

    const items: ConsumoHistoricoItem[] = rawList.map((item) => {
      const rawKwh =
        typeof item.consumo_kwh === 'number'
          ? item.consumo_kwh
          : parseFloat(String(item.consumo_kwh || 0)) || 0
      const mesStr = String(item.mes || item.mes_ano || 'Mês')
      return {
        mes: mesStr,
        consumo_kwh: Math.round(rawKwh * 10) / 10,
        dias_ciclo: item.dias_ciclo,
      }
    })

    if (items.length === 0) return []

    // Encontrar maior e menor consumo para destaque visual
    let maxVal = -Infinity
    let minVal = Infinity
    items.forEach((it) => {
      if (it.consumo_kwh > maxVal) maxVal = it.consumo_kwh
      if (it.consumo_kwh < minVal) minVal = it.consumo_kwh
    })

    return items.map((it) => ({
      ...it,
      isMax: it.consumo_kwh === maxVal,
      isMin: it.consumo_kwh === minVal && it.consumo_kwh !== maxVal,
    }))
  }, [dados, medicao, registro, periodo])

  const maiorConsumo = useMemo(() => {
    if (historicoConsumoFormatado.length === 0) return null
    return [...historicoConsumoFormatado].sort((a, b) => b.consumo_kwh - a.consumo_kwh)[0]
  }, [historicoConsumoFormatado])

  const menorConsumo = useMemo(() => {
    if (historicoConsumoFormatado.length === 0) return null
    return [...historicoConsumoFormatado].sort((a, b) => a.consumo_kwh - b.consumo_kwh)[0]
  }, [historicoConsumoFormatado])

  const mediaConsumo = useMemo(() => {
    if (historicoConsumoFormatado.length === 0) return 0
    const soma = historicoConsumoFormatado.reduce((acc, curr) => acc + curr.consumo_kwh, 0)
    return Math.round(soma / historicoConsumoFormatado.length)
  }, [historicoConsumoFormatado])

  // --- 3. RESUMO DE IMPOSTOS E FINANCEIRO ---
  const resumoImpostos = useMemo(() => {
    let baseIcms = 0
    let aliqIcms: number | null = null
    let valorIcms = impostos.impostos_atuais?.icms_total_rs || 0

    let basePis = 0
    let valorPis = impostos.impostos_atuais?.pis_total_rs || 0

    let baseCofins = 0
    let valorCofins = impostos.impostos_atuais?.cofins_total_rs || 0

    // Se houver itens faturados, somar as bases de cálculo e alíquotas com precisão
    if (itens && itens.length > 0) {
      itens.forEach((it) => {
        if (it.icms?.base_calculo && it.icms.base_calculo > baseIcms) {
          baseIcms = Math.max(baseIcms, it.icms.base_calculo)
        }
        if (it.icms?.aliquota && it.icms.aliquota > 0) {
          aliqIcms = it.icms.aliquota
        }
        if (it.pis?.base_calculo && it.pis.base_calculo > basePis) {
          basePis = Math.max(basePis, it.pis.base_calculo)
        }
        if (it.cofins?.base_calculo && it.cofins.base_calculo > baseCofins) {
          baseCofins = Math.max(baseCofins, it.cofins.base_calculo)
        }
      })
    }

    const totalTributos = valorIcms + valorPis + valorCofins

    return {
      baseIcms,
      aliqIcms,
      valorIcms,
      basePis,
      valorPis,
      baseCofins,
      valorCofins,
      totalPisCofins: valorPis + valorCofins,
      totalTributos,
    }
  }, [impostos, itens])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg animate-pulse">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Carregando Relatório de Auditoria da Fatura RGE...
          </h2>
          <p className="text-sm text-gray-500">
            Recuperando dados regulatórios, balanço energético e detalhamento tributário
          </p>
        </div>
      </div>
    )
  }

  if (error || !registro || !dados) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Relatório não encontrado</h2>
          <p className="text-sm text-gray-600">
            {error || 'Não foi possível carregar os dados desta análise.'}
          </p>
          <Link
            to="/central-atividades"
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Atividades
          </Link>
        </div>
      </div>
    )
  }

  // Rótulo do papel de GD
  const papelLabel =
    papelGd.papel_uc === 'geradora'
      ? 'UC Geradora (Possui Usina)'
      : papelGd.papel_uc === 'receptora_autoconsumo_remoto'
        ? 'UC Receptora (Autoconsumo Remoto)'
        : gdCalculada.kwhEnviados > 0
          ? 'UC Geradora com Autoconsumo Remoto'
          : 'UC Mista (Consumo e Geração)'

  const saldoExpirar = medicao.saldo_energia?.saldo_a_expirar_proximo_mes_kwh || 0
  const totalDistribuidora =
    totais.total_distribuidora_rs || totais.total_a_pagar_rs || registro.total_pagar || 0
  const totalPagar = totais.total_a_pagar_rs || registro.total_pagar || 0
  const formaPagto = totais.forma_pagamento || 'Código de barras / Boleto / PIX'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Barra de Navegação Superior */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/central-atividades"
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              title="Voltar ao CRM"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                DS
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base text-gray-900 leading-none block">
                  Delfos Solar
                </span>
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                  Auditoria Regulatória de Fatura
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopiarLink}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              {linkCopiado ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Link Copiado</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setModalWhatsAppOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-emerald-600/25 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Enviar para o cliente</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Relatório */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner do Cabeçalho do Cliente e Concessionária */}
        <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-emerald-300 border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auditoria Técnica Inteligente RGE</span>
                <span className="opacity-40">•</span>
                <span>{periodo.mes_referencia || 'Ciclo Atual'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {cad.titular || registro.cliente_nome || 'Cliente Delfos Solar'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100/90 font-mono">
                <span>
                  <strong>UC:</strong> {cad.uc || registro.uc}
                </span>
                <span>•</span>
                <span>
                  <strong>NF:</strong> {periodo.numero_fatura_nf || 'Não informada'}
                </span>
                <span>•</span>
                <span>
                  <strong>Vencimento:</strong> {periodo.vencimento || 'A definir'}
                </span>
                <span>•</span>
                <span>
                  <strong>Classificação:</strong> {cad.classificacao || 'Convencional B3'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center min-w-[140px]">
                <span className="text-[11px] text-emerald-200 uppercase font-semibold tracking-wider block">
                  Papel no Arranjo GD
                </span>
                <span className="text-sm font-bold text-white mt-0.5 block">{papelLabel}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center min-w-[140px]">
                <span className="text-[11px] text-emerald-200 uppercase font-semibold tracking-wider block">
                  Total da Fatura
                </span>
                <span className="text-lg font-black text-emerald-300 mt-0.5 block">
                  R${' '}
                  {totalPagar.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Sugestão de Preenchimento Cadastral caso detectada */}
          {cad.sugestao_preenchimento_crm && (
            <div className="mt-5 p-3.5 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-100">
                  Atualização Cadastral Sugerida pela Fatura:
                </strong>{' '}
                {cad.sugestao_preenchimento_crm}
              </div>
            </div>
          )}
        </section>

        {/* Alertas Críticos destacados em Vermelho */}
        {(saldoExpirar > 0 || alertas.length > 0) && (
          <section className="space-y-3">
            {saldoExpirar > 0 && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex items-start gap-3 shadow-xs">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-900 uppercase tracking-wide">
                    Alerta Crítico: Saldo a Expirar no Próximo Mês (
                    {saldoExpirar.toLocaleString('pt-BR')} kWh)
                  </h4>
                  <p className="text-xs text-red-800">
                    A concessionária RGE registrará expiração de{' '}
                    {saldoExpirar.toLocaleString('pt-BR')} kWh de créditos se não forem consumidos
                    ou transferidos para outra UC do mesmo CPF/CNPJ até o próximo ciclo faturado.
                  </p>
                </div>
              </div>
            )}

            {alertas.map((alerta, i) => {
              const isAlerta = alerta.nivel === 'alerta'
              return (
                <div
                  key={i}
                  className={`p-4 rounded-2xl flex items-start gap-3 border shadow-2xs ${
                    isAlerta
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : alerta.nivel === 'atencao'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      isAlerta
                        ? 'text-red-600'
                        : alerta.nivel === 'atencao'
                          ? 'text-amber-600'
                          : 'text-blue-600'
                    }`}
                  />
                  <div className="space-y-0.5">
                    <h5 className="text-xs sm:text-sm font-bold">{alerta.titulo}</h5>
                    <p className="text-xs leading-relaxed opacity-90">{alerta.mensagem}</p>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* 1. KPIs no Topo */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Consumo do Mês */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              Consumo do Mês
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-baseline gap-1">
              {(medicao.energia_ativa_consumida?.consumo_mes_kwh || 0).toLocaleString('pt-BR')}
              <span className="text-xs text-gray-400 font-normal">kWh</span>
            </div>
            <span className="text-[10px] text-gray-400 block">Medido pela distribuidora</span>
          </div>

          {/* Energia Injetada */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Energia Injetada
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 flex items-baseline gap-1">
              {gdCalculada.injetada.toLocaleString('pt-BR')}
              <span className="text-xs text-emerald-600/70 font-normal">kWh</span>
            </div>
            <span className="text-[10px] text-gray-400 block">Injetada na rede RGE</span>
          </div>

          {/* Créditos Compensados no Mês */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider block">
              Compensados no Mês
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-sky-600 flex items-baseline gap-1">
              {gdCalculada.compensadosMesAtual.toLocaleString('pt-BR')}
              <span className="text-xs text-sky-600/70 font-normal">kWh</span>
            </div>
            <span className="text-[10px] text-gray-400 block">Abatidos nesta fatura</span>
          </div>

          {/* Saldo de Energia */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
              Saldo Acumulado
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-600 flex items-baseline gap-1">
              {(medicao.saldo_energia?.saldo_atual_instalacao_kwh || 0).toLocaleString('pt-BR')}
              <span className="text-xs text-purple-600/70 font-normal">kWh</span>
            </div>
            <span className="text-[10px] text-gray-400 block">
              {medicao.saldo_energia?.meses_cobertura_saldo
                ? `Cobre ${medicao.saldo_energia.meses_cobertura_saldo} meses`
                : 'Reserva na concessionária'}
            </span>
          </div>

          {/* Total a Pagar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              Total a Pagar
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-gray-900">
              R$ {totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-gray-400 truncate block">{formaPagto}</span>
          </div>

          {/* Economia Estimada */}
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Economia no Ciclo
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
              R${' '}
              {(indicadores.economia_estimada_mes_rs || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
            <span className="text-[10px] text-emerald-700 font-medium block">
              vs. sem geração solar
            </span>
          </div>
        </section>

        {/* 2. GRÁFICO DE CONSUMO MENSAL (HISTÓRICO DA FATURA) */}
        <section className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Histórico de Consumo Mensal (Mês a Mês - kWh)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Consumo histórico faturado pela concessionária RGE nos últimos ciclos
              </p>
            </div>

            {historicoConsumoFormatado.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {maiorConsumo && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      Maior: <strong>{maiorConsumo.consumo_kwh.toLocaleString('pt-BR')} kWh</strong>{' '}
                      ({maiorConsumo.mes})
                    </span>
                  </span>
                )}
                {menorConsumo && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-medium">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Menor: <strong>{menorConsumo.consumo_kwh.toLocaleString('pt-BR')} kWh</strong>{' '}
                      ({menorConsumo.mes})
                    </span>
                  </span>
                )}
                {mediaConsumo > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium">
                    <span>
                      Média: <strong>{mediaConsumo.toLocaleString('pt-BR')} kWh/mês</strong>
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          {historicoConsumoFormatado.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              Histórico de consumo mês a mês não informado detalhadamente na fatura enviada.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-64 sm:h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={historicoConsumoFormatado}
                    margin={{ top: 20, right: 10, left: -15, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickFormatter={(val) => `${val}`}
                    />
                    <RechartsTooltip
                      formatter={(val: number) => [
                        `${Number(val).toLocaleString('pt-BR')} kWh`,
                        'Consumo',
                      ]}
                      labelFormatter={(label) => `Mês: ${label}`}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                      }}
                    />
                    <Bar dataKey="consumo_kwh" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      {historicoConsumoFormatado.map((entry, index) => {
                        // Destaque visual: maior consumo (âmbar/vermelho), menor consumo (esmeralda brilhante), demais (azul ardósia/verde água)
                        let barColor = '#059669' // Esmeralda padrão
                        if (entry.isMax)
                          barColor = '#D97706' // Âmbar para o pico
                        else if (entry.isMin)
                          barColor = '#10B981' // Esmeralda mais claro para o mínimo
                        else barColor = '#0284C7' // Azul céu para regular
                        return <Cell key={`cell-${index}`} fill={barColor} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda visual do gráfico */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-600 inline-block" />
                  <span>Maior consumo faturado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  <span>Menor consumo faturado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-600 inline-block" />
                  <span>Consumo mensal nos demais ciclos</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 3. RESUMO FINANCEIRO DO QUE FOI PAGO E DOS IMPOSTOS */}
        <section className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Resumo do que Foi Pago e dos Impostos</span>
            </h3>
            <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-semibold border border-slate-200">
              {totais.forma_pagamento || 'Boleto / PIX'}
            </span>
          </div>

          {/* Cards Financeiros do Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-gray-500 uppercase font-semibold tracking-wider block">
                Total Faturado pela Distribuidora
              </span>
              <div className="text-2xl font-black text-gray-900 font-mono">
                R$ {totalDistribuidora.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-gray-400 block">Valor bruto apurado na fatura</span>
            </div>

            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-1">
              <span className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider block">
                Total Efetivamente a Pagar
              </span>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                R$ {totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-emerald-800/80 block">
                Forma: <strong>{formaPagto}</strong>
              </span>
            </div>

            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-1">
              <span className="text-[11px] text-purple-900 uppercase font-bold tracking-wider block">
                Total de Tributos Inclusos
              </span>
              <div className="text-2xl font-black text-purple-700 font-mono">
                R${' '}
                {resumoImpostos.totalTributos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-purple-800/80 block">
                ICMS + PIS/PASEP + COFINS
              </span>
            </div>
          </div>

          {/* Tabela de Impostos (Base, Alíquota e Valor) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Quadro Detalhado de Impostos na Fatura
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Tributo</th>
                    <th className="py-2.5 px-4 text-right">Base de Cálculo (R$)</th>
                    <th className="py-2.5 px-4 text-right">Alíquota (%)</th>
                    <th className="py-2.5 px-4 text-right">Valor do Imposto (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      ICMS (Imposto sobre Circulação de Mercadorias)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-700">
                      {resumoImpostos.baseIcms > 0
                        ? `R$ ${resumoImpostos.baseIcms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-700">
                      {resumoImpostos.aliqIcms !== null
                        ? `${resumoImpostos.aliqIcms.toFixed(2)}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      R${' '}
                      {resumoImpostos.valorIcms.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      PIS / PASEP (Programa de Integração Social)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-700">
                      {resumoImpostos.basePis > 0
                        ? `R$ ${resumoImpostos.basePis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-500">
                      Conforme tabela distribuidora
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      R${' '}
                      {resumoImpostos.valorPis.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      COFINS (Contribuição Financiamento Seguridade Social)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-700">
                      {resumoImpostos.baseCofins > 0
                        ? `R$ ${resumoImpostos.baseCofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-500">
                      Conforme tabela distribuidora
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      R${' '}
                      {resumoImpostos.valorCofins.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300">
                    <td className="py-3 px-4">Total Consolidado de Impostos</td>
                    <td colSpan={2}></td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-purple-800">
                      R${' '}
                      {resumoImpostos.totalTributos.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

        {/* 4. Arranjo de Geração Distribuída (GD) & Fluxo de Créditos Corrigido */}
        <section className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Arranjo de Geração Distribuída (GD) e Fluxo de Créditos</span>
            </h3>
            <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full font-bold border border-emerald-200">
              {papelLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 md:col-span-2">
              <span className="font-bold text-gray-700 block uppercase tracking-wide text-[11px]">
                Diagnóstico Regulatório e Fluxo de Compensação
              </span>
              <p className="text-gray-600 leading-relaxed">
                {papelGd.descricao_arranjo ||
                  'Esta instalação participa do Sistema de Compensação de Energia Elétrica (SCEE) conforme a Lei 14.300/2022 e REN ANEEL 1.000/2021.'}
              </p>

              {/* Destaque do fluxo real de créditos */}
              <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-gray-800 text-[11px] block">Balanço do Ciclo:</span>
                <p className="text-gray-700 leading-relaxed">{gdCalculada.detalheFluxo}</p>
                {gdCalculada.kwhEnviados > 0 && (
                  <p className="text-amber-800 font-medium pt-1">
                    ℹ️ Como os{' '}
                    <strong>{gdCalculada.saldoGeradoNaoUsado.toLocaleString('pt-BR')} kWh</strong>{' '}
                    gerados não foram acumulados no saldo desta instalação ({cad.uc || registro.uc}
                    ), foram creditados em outra(s) UC(s) vinculada(s) à mesma titularidade
                    (autoconsumo remoto). Portanto, a participação nesta instalação é de{' '}
                    <strong>{gdCalculada.participacao}%</strong>.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
              <span className="font-bold text-emerald-900 block uppercase tracking-wide text-[11px]">
                Participação e Retenção
              </span>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Participação na Geração:</span>
                  <strong className="text-emerald-800 font-mono text-sm">
                    {gdCalculada.participacao}%
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Energia que Fica no Local:</span>
                  <strong className="text-emerald-800 font-mono text-sm">
                    {gdCalculada.retidoPercent}%
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Compensada aqui:</span>
                  <strong className="text-gray-900 font-mono">
                    {gdCalculada.compensadosMesAtual.toLocaleString('pt-BR')} kWh
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Enviada a outras UCs:</span>
                  <strong className="text-sky-800 font-mono">
                    {gdCalculada.kwhEnviados.toLocaleString('pt-BR')} kWh
                  </strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-200/60">
                  <span className="text-gray-600">Custo de disponibilidade:</span>
                  <strong className="text-gray-800">
                    {indicadores.taxa_minima_disponibilidade_kwh ||
                      (cad.tipo_fornecimento === 'Trifásico'
                        ? 100
                        : cad.tipo_fornecimento === 'Bifásico'
                          ? 50
                          : 30)}{' '}
                    kWh
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Dados do Período de Leitura */}
        <section className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Dados do Ciclo e Período de Leitura</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 block text-[11px]">Leitura Anterior</span>
              <strong className="text-gray-900 text-sm font-semibold">
                {periodo.data_leitura_anterior || '—'}
              </strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 block text-[11px]">Leitura Atual</span>
              <strong className="text-gray-900 text-sm font-semibold">
                {periodo.data_leitura_atual || '—'}
              </strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 block text-[11px]">Dias do Ciclo</span>
              <strong className="text-gray-900 text-sm font-semibold">
                {periodo.dias_ciclo || 30} dias
              </strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 block text-[11px]">Próxima Leitura Prevista</span>
              <strong className="text-gray-900 text-sm font-semibold">
                {periodo.proxima_leitura_prevista || '—'}
              </strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 block text-[11px]">Data de Emissão</span>
              <strong className="text-gray-900 text-sm font-semibold">
                {periodo.data_emissao || '—'}
              </strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 block text-[11px]">Vencimento</span>
              <strong className="text-emerald-700 text-sm font-bold">
                {periodo.vencimento || '—'}
              </strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 block text-[11px]">Bandeira Tarifária</span>
              <strong className="text-gray-900 text-sm font-semibold">
                {totais.bandeira_tarifaria?.cor || 'Verde'}
              </strong>
            </div>
          </div>
        </section>

        {/* 6. Tabela de Medição, Créditos e Saldo */}
        <section className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <span>Medição, Créditos e Balanço Energético</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Grandeza / Item de Medição</th>
                  <th className="py-3 px-4">Leitura Anterior</th>
                  <th className="py-3 px-4">Leitura Atual</th>
                  <th className="py-3 px-4">Multiplicador</th>
                  <th className="py-3 px-4 text-right">Volume Faturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 font-semibold text-gray-800">
                    Energia Ativa Consumida (kWh)
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {medicao.energia_ativa_consumida?.leitura_anterior ?? '—'}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {medicao.energia_ativa_consumida?.leitura_atual ?? '—'}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {medicao.energia_ativa_consumida?.multiplicador ?? 1}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900 font-mono">
                    {(medicao.energia_ativa_consumida?.consumo_mes_kwh || 0).toLocaleString(
                      'pt-BR',
                    )}{' '}
                    kWh
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-emerald-700">
                    Energia Injetada Solar (kWh)
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {medicao.energia_injetada_geracao?.leitura_anterior ?? '—'}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {medicao.energia_injetada_geracao?.leitura_atual ?? '—'}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {medicao.energia_injetada_geracao?.multiplicador ?? 1}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">
                    -{gdCalculada.injetada.toLocaleString('pt-BR')} kWh
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-sky-700">
                    Créditos Compensados (Mês Atual)
                  </td>
                  <td className="py-3 px-4 text-gray-400 font-mono">—</td>
                  <td className="py-3 px-4 text-gray-400 font-mono">—</td>
                  <td className="py-3 px-4 text-gray-400 font-mono">—</td>
                  <td className="py-3 px-4 text-right font-bold text-sky-600 font-mono">
                    -{gdCalculada.compensadosMesAtual.toLocaleString('pt-BR')} kWh
                  </td>
                </tr>
                {Boolean(medicao.creditos?.creditos_antigos_competencias_anteriores_kwh) && (
                  <tr>
                    <td className="py-3 px-4 font-semibold text-amber-700">
                      Créditos de Competências Anteriores
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono">—</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">—</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">—</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600 font-mono">
                      -
                      {(
                        medicao.creditos?.creditos_antigos_competencias_anteriores_kwh || 0
                      ).toLocaleString('pt-BR')}{' '}
                      kWh
                    </td>
                  </tr>
                )}
                <tr className="bg-purple-50/50 font-bold">
                  <td className="py-3 px-4 text-purple-900">Saldo Atual da Instalação (kWh)</td>
                  <td className="py-3 px-4 text-gray-400 font-mono">—</td>
                  <td className="py-3 px-4 text-gray-400 font-mono">—</td>
                  <td className="py-3 px-4 text-gray-400 font-mono">—</td>
                  <td className="py-3 px-4 text-right text-purple-700 font-mono text-sm">
                    {(medicao.saldo_energia?.saldo_atual_instalacao_kwh || 0).toLocaleString(
                      'pt-BR',
                    )}{' '}
                    kWh
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Tabela de Itens Faturados com Tarifas, Valores e Impostos */}
        <section className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>
                Itens Faturados e Desdobramento Tributário (TUSD / TE / ICMS / PIS / COFINS)
              </span>
            </h3>
            <span className="text-xs text-gray-500 font-mono">
              Tarifa Cheia Efetiva:{' '}
              <strong>R$ {(indicadores.tarifa_cheia_efetiva_rs_kwh || 1.15).toFixed(4)}/kWh</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Item / Operação</th>
                  <th className="py-3 px-3 text-right">Qtd (kWh)</th>
                  <th className="py-3 px-3 text-right">Tarifa (R$/kWh)</th>
                  <th className="py-3 px-3 text-right">Valor Total (R$)</th>
                  <th className="py-3 px-3 text-right">ICMS (R$)</th>
                  <th className="py-3 px-3 text-right">PIS/COFINS (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-400">
                      Nenhum item faturado detalhado detectado.
                    </td>
                  </tr>
                ) : (
                  itens.map((it, idx) => {
                    const isCredito = it.valor_total_rs < 0
                    const pisCofins = (it.pis?.valor || 0) + (it.cofins?.valor || 0)
                    return (
                      <tr key={idx} className={isCredito ? 'bg-emerald-50/30' : ''}>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{it.item}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {it.quantidade_kwh !== null && it.quantidade_kwh !== undefined
                            ? it.quantidade_kwh.toLocaleString('pt-BR')
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {it.tarifa_com_impostos
                            ? it.tarifa_com_impostos.toFixed(4)
                            : it.tarifa_base
                              ? it.tarifa_base.toFixed(4)
                              : '—'}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold font-mono ${
                            isCredito ? 'text-emerald-700' : 'text-gray-900'
                          }`}
                        >
                          R${' '}
                          {it.valor_total_rs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                          {it.icms?.valor ? `R$ ${it.icms.valor.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                          {pisCofins > 0 ? `R$ ${pisCofins.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300">
                  <td className="py-3 px-3">Total Faturado pela Distribuidora</td>
                  <td colSpan={2}></td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-800">
                    R${' '}
                    {totalPagar.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-gray-700">
                    R$ {resumoImpostos.valorIcms.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-gray-700">
                    R$ {resumoImpostos.totalPisCofins.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* 8. Conclusões e Recomendações Acionáveis */}
        <section className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Conclusões e Recomendações Técnicas Acionáveis</span>
          </h3>

          <div className="space-y-2.5">
            {recomendacoes.length === 0 ? (
              <p className="text-xs text-gray-500">
                O gerador solar e o arranjo de compensação encontram-se em funcionamento regular.
                Mantenha o acompanhamento mensal pela Delfos Solar.
              </p>
            ) : (
              recomendacoes.map((rec, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-3 text-xs text-gray-800"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="leading-relaxed pt-0.5">{rec}</div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Rodapé do Relatório */}
        <footer className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Delfos Solar CRM</span>
            <span>•</span>
            <span>
              Relatório emitido em {new Date(registro.created).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopiarLink}
              className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar link único do cliente</span>
            </button>
          </div>
        </footer>
      </main>

      {/* Modal de Envio via WhatsApp */}
      <ModalEnviarAnaliseWhatsApp
        isOpen={modalWhatsAppOpen}
        onClose={() => setModalWhatsAppOpen(false)}
        analise={registro}
        linkRelatorio={linkCompleto}
        telefoneDestino={clienteTelefone}
      />
    </div>
  )
}

export default RelatorioFaturaPage
