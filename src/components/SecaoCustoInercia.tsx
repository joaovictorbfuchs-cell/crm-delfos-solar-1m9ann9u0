import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  DollarSign,
  Calendar,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

export interface SecaoCustoInerciaProps {
  /** Consumo mensal atual em kWh/mês */
  consumoMensalKwh?: number | null
  /** Consumo anual atual em kWh/ano */
  consumoAnualKwh?: number | null
  /** Custo mensal atual da conta de energia (R$) */
  contaMensal?: number | null
  /** Custo anual atual da conta de energia (R$) */
  contaAnual?: number | null
  /** Gasto acumulado sem solar em 1 ano (R$) */
  gastoSemSolar1Ano?: number | null
  /** Gasto acumulado sem solar em 5 anos (R$) */
  gastoSemSolar5Anos?: number | null
  /** Gasto acumulado sem solar no período do payback arredondado para cima (R$) */
  gastoSemSolarPaybackAnos?: number | null
  /** Payback em meses (para cálculo dinâmico do período arredondado em anos) */
  paybackMeses?: number | null
  /** Anos de payback arredondados para cima até fechar o ano */
  anosPayback?: number | null
  /** Gasto acumulado sem solar em 25 anos (R$) */
  gastoSemSolar25Anos?: number | null
  /** Valor do investimento solar Delfos (R$) */
  valorInvestimento?: number | null
  /** Economia mensal estimada (R$) */
  economiaMensal?: number | null
  /** Economia líquida acumulada em 1 ano com solar (R$) */
  economia1Ano?: number | null
  /** Economia líquida acumulada em 5 anos com solar (R$) */
  economia5Anos?: number | null
  /** Economia líquida acumulada em 25 anos com solar (R$) */
  economia25Anos?: number | null
  className?: string
}

/**
 * Seção 2 — Situação Atual (Consumo & Custos + Gastos Acumulados Sem Solar)
 *
 * Estrutura:
 * 1. Título "Situação Atual" e badge "Situação Atual"
 * 2. Visualização em cards arredondados com sombra suave:
 *    - Consumo mensal (kWh/mês)
 *    - Consumo no ano (kWh/ano)
 *    - Custo mensal (R$ — conta mensal atual)
 *    - Custo no ano (R$ — conta anual)
 * 3. Gastos Acumulados Sem Solar: 1, 5 e 25 Anos:
 *    - 3 cards grandes de destaque em R$ (formato pt-BR)
 *    - Sem comparação com solar (conforme solicitação do usuário)
 *    - Progressão visual sutil de gravidade (âmbar claro → âmbar escuro → vermelho)
 *    - Linha de contexto com média mensal aproximada e impacto tarifário
 */
export const SecaoCustoInercia: React.FC<SecaoCustoInerciaProps> = ({
  consumoMensalKwh,
  consumoAnualKwh,
  contaMensal,
  contaAnual,
  gastoSemSolar1Ano,
  gastoSemSolar5Anos,
  gastoSemSolarPaybackAnos,
  paybackMeses,
  anosPayback,
  gastoSemSolar25Anos,
  valorInvestimento,
  economiaMensal,
  economia1Ano: _economia1Ano,
  economia5Anos: _economia5Anos,
  economia25Anos: _economia25Anos,
  className = '',
}) => {
  // =========================================================================
  // DADOS COM FALLBACK CONSISTENTE:
  // Custo mensal base
  const contaMensalFinal =
    contaMensal !== undefined && contaMensal !== null && contaMensal > 0
      ? contaMensal
      : economiaMensal !== undefined && economiaMensal !== null && economiaMensal > 0
        ? economiaMensal
        : 928.75

  // Custo anual base
  const contaAnualFinal =
    contaAnual !== undefined && contaAnual !== null && contaAnual > 0
      ? contaAnual
      : Math.round(contaMensalFinal * 12)

  // Consumo mensal base (estimado a partir de ~R$ 0,95/kWh se não informado)
  const consumoMensalFinal =
    consumoMensalKwh !== undefined && consumoMensalKwh !== null && consumoMensalKwh > 0
      ? consumoMensalKwh
      : consumoAnualKwh !== undefined && consumoAnualKwh !== null && consumoAnualKwh > 0
        ? Math.round(consumoAnualKwh / 12)
        : Math.round(contaMensalFinal / 0.95)

  // Consumo anual base
  const consumoAnualFinal =
    consumoAnualKwh !== undefined && consumoAnualKwh !== null && consumoAnualKwh > 0
      ? consumoAnualKwh
      : Math.round(consumoMensalFinal * 12)

  // Determinação dos anos de payback arredondados para cima até fechar o ano (fallback: 5 anos; se <= 1 ano, usa 5 para evitar duplicar com 1 Ano)
  const anosCalculadosInercia = (() => {
    if (paybackMeses !== undefined && paybackMeses !== null && paybackMeses > 0) {
      return Math.ceil(paybackMeses / 12)
    }
    const invest = Number(valorInvestimento) || 0
    const eco = Number(economiaMensal) || 0
    if (invest > 0 && eco > 0) {
      return Math.ceil(invest / eco / 12)
    }
    return 5
  })()

  const anosPaybackFinal = (() => {
    if (anosPayback !== undefined && anosPayback !== null && anosPayback > 1) {
      return Math.round(anosPayback)
    }
    return anosCalculadosInercia <= 1 ? 5 : anosCalculadosInercia
  })()

  // Gasto acumulado em 1 ano
  const gasto1AnoFinal =
    gastoSemSolar1Ano !== undefined && gastoSemSolar1Ano !== null && gastoSemSolar1Ano > 0
      ? gastoSemSolar1Ano
      : Math.round(contaMensalFinal * 12 * 1.045) // ~11.650

  // Gasto acumulado em 5 anos (fallback/referência)
  const gasto5AnosFinal =
    gastoSemSolar5Anos !== undefined && gastoSemSolar5Anos !== null && gastoSemSolar5Anos > 0
      ? gastoSemSolar5Anos
      : 71000

  // Gasto acumulado no período do payback arredondado (card do meio)
  const gastoCardMeioFinal = (() => {
    if (anosPaybackFinal === 5 && gastoSemSolar5Anos && gastoSemSolar5Anos > 0) {
      return gastoSemSolar5Anos
    }
    if (
      gastoSemSolarPaybackAnos !== undefined &&
      gastoSemSolarPaybackAnos !== null &&
      gastoSemSolarPaybackAnos > 0 &&
      anosPaybackFinal !== 5
    ) {
      return gastoSemSolarPaybackAnos
    }
    let acumulado = 0
    for (let ano = 0; ano < anosPaybackFinal; ano++) {
      acumulado += contaAnualFinal * Math.pow(1 + 0.09, ano)
    }
    return Math.round(acumulado)
  })()

  const gasto25AnosFinal =
    gastoSemSolar25Anos !== undefined && gastoSemSolar25Anos !== null && gastoSemSolar25Anos > 0
      ? gastoSemSolar25Anos
      : Math.round(gasto5AnosFinal * 11.9) // ~845.000

  // Título e label do período do card do meio dinâmico
  const rotuloPeriodoCardMeio = `${anosPaybackFinal} Anos`
  const tituloCardMeio = `Gasto em ${rotuloPeriodoCardMeio}`
  const totalMesesCardMeio = anosPaybackFinal * 12

  // Média mensal aproximada ao longo de cada período (considerando reajustes)
  const mediaMensal1Ano = Math.round(gasto1AnoFinal / 12)
  const mediaMensalCardMeio = Math.round(gastoCardMeioFinal / totalMesesCardMeio)
  const mediaMensal25Anos = Math.round(gasto25AnosFinal / 300)

  return (
    <section
      className={`bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden transition-all ${className}`}
      aria-label="Situação Atual"
    >
      {/* ========================================================================= */}
      {/* CABEÇALHO DA SEÇÃO: Situação Atual                                        */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-emerald-50/40 via-amber-50/30 to-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Activity className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">Situação Atual</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Situação Atual
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
              Panorama do seu padrão de consumo energético e despesas recorrentes pagas à
              concessionária sem qualquer retorno patrimonial, além da projeção de gastos futuros
              sem a tecnologia solar.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-red-200 shadow-2xs text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-pulse" />
            <span className="font-bold text-red-700">Sem energia solar</span>
            <span className="text-gray-400 text-[11px]">• Desembolso direto</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 bg-[#FAFCFA]">
        {/* ========================================================================= */}
        {/* 1. CARDS DA SITUAÇÃO ATUAL (Consumo mensal/anual e Custos mensal/anual)   */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Diagnóstico de Consumo e Custos Recorrentes
            </span>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Padrão Energético Atual
            </span>
          </div>

          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Card 1 — Consumo Energético (Mensal acima, Anual abaixo) */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-2xs">
                      <Zap className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                        Consumo de Energia
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Volume consumido da concessionária
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    kWh
                  </span>
                </div>

                {/* Bloco 1: Consumo Mensal */}
                <div className="space-y-1 pb-4 border-b border-dashed border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Consumo Mensal
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Mensal
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {Math.round(Number(consumoMensalFinal) || 0).toLocaleString('pt-BR')}{' '}
                    <span className="text-base font-bold text-blue-600">kWh/mês</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Média mensal de energia consumida da rede
                  </p>
                </div>

                {/* Bloco 2: Consumo no Ano (logo abaixo) */}
                <div className="space-y-1 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Consumo no Ano
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      Anual
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {Math.round(Number(consumoAnualFinal) || 0).toLocaleString('pt-BR')}{' '}
                    <span className="text-base font-bold text-indigo-600">kWh/ano</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Volume total anual faturado pela concessionária (12 meses)
                  </p>
                </div>
              </div>

              {/* Card 2 — Custos em R$ (Mensal acima, Anual abaixo) */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600 shadow-2xs">
                      <DollarSign className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 tracking-tight whitespace-nowrap">
                        Custos com Concessionária
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Desembolso financeiro sem retorno patrimonial
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200 whitespace-nowrap shrink-0">
                    R$ Reais
                  </span>
                </div>

                {/* Bloco 1: Custo Mensal (Conta Atual) */}
                <div className="space-y-1 pb-4 border-b border-dashed border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Custo Mensal
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      Conta Atual
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
                    {formatCurrency(contaMensalFinal)}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Despesa média paga todo mês à concessionária
                  </p>
                </div>

                {/* Bloco 2: Custo no Ano (logo abaixo) */}
                <div className="space-y-1 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Custo no Ano
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Gasto Anual
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
                    {formatCurrency(contaAnualFinal)}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Total desembolsado em 12 faturas sem retorno
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. GASTOS ACUMULADOS SEM SOLAR: 1 ANO, PAYBACK E 25 ANOS                  */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2 whitespace-nowrap shrink-0">
                <TrendingUp className="w-4 h-4 text-red-600 shrink-0" />
                Gastos Acumulados Sem Solar: 1, {rotuloPeriodoCardMeio} e 25 Anos
              </h3>
              <p className="text-xs text-gray-500">
                Total faturado pela concessionária ao longo do tempo considerando o reajuste
                tarifário histórico da rede elétrica
              </p>
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200 flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <ShieldAlert className="w-3 h-3 text-red-600 shrink-0" />
              Valores Acumulados em Reais
            </span>
          </div>

          {/* 3 Grandes Cards de Gasto Acumulado Sem Solar lado a lado (empilhados no mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* Card 1: Gasto em 1 Ano */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-2 border-amber-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                      <Calendar className="w-4 h-4 text-amber-700" />
                    </div>
                    <span className="text-[10.5px] font-bold text-amber-900 uppercase tracking-tight whitespace-nowrap">
                      Gasto em 1 Ano
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded-full border border-amber-200 whitespace-nowrap shrink-0">
                    Curto prazo
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 block">
                    Sem energia solar
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
                    {formatCurrency(gasto1AnoFinal)}
                  </div>
                </div>
              </div>

              <div className="pt-3.5 mt-3.5 border-t border-amber-200/80 relative z-10 space-y-1 text-[11px] text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Média mensal:</span>
                  <strong className="text-gray-900 font-bold">
                    ≈ {formatCurrency(mediaMensal1Ano)}/mês
                  </strong>
                </div>
                <div className="text-[10px] text-gray-500 leading-tight">
                  12 faturas com reajuste inicial
                </div>
              </div>
            </div>

            {/* Card 2: Gasto no Período do Payback (X Anos arredondados para cima) */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 border-2 border-orange-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-800 shrink-0">
                      <Clock className="w-4 h-4 text-orange-700" />
                    </div>
                    <span className="text-[10.5px] font-bold text-orange-950 uppercase tracking-tight whitespace-nowrap">
                      {tituloCardMeio}
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight text-orange-900 bg-orange-100 px-1.5 py-0.5 rounded-full border border-orange-200 whitespace-nowrap shrink-0">
                    Médio prazo
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 block">
                    Sem energia solar
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-orange-800 tracking-tight">
                    {formatCurrency(gastoCardMeioFinal)}
                  </div>
                </div>
              </div>

              <div className="pt-3.5 mt-3.5 border-t border-orange-200/80 relative z-10 space-y-1 text-[11px] text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Média mensal:</span>
                  <strong className="text-gray-900 font-bold">
                    ≈ {formatCurrency(mediaMensalCardMeio)}/mês
                  </strong>
                </div>
                <div className="text-[10px] text-orange-700 font-semibold leading-tight">
                  Supera o valor de uma usina própria
                </div>
              </div>
            </div>

            {/* Card 3: Gasto em 25 Anos */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-red-50/90 via-white to-rose-50/40 border-2 border-red-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-300 flex items-center justify-center text-red-800 shrink-0">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="text-[10.5px] font-bold text-red-950 uppercase tracking-tight whitespace-nowrap">
                      Gasto em 25 Anos
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tight text-red-900 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200 whitespace-nowrap shrink-0">
                    Longo prazo
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 block">
                    Sem energia solar
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
                    {formatCurrency(gasto25AnosFinal)}
                  </div>
                </div>
              </div>

              <div className="pt-3.5 mt-3.5 border-t border-red-200/80 relative z-10 space-y-1 text-[11px] text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Média mensal:</span>
                  <strong className="text-gray-900 font-bold">
                    ≈ {formatCurrency(mediaMensal25Anos)}/mês
                  </strong>
                </div>
                <div className="text-[10px] text-red-700 font-semibold leading-tight">
                  Desembolso acumulado com inflação da rede
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SecaoCustoInercia
