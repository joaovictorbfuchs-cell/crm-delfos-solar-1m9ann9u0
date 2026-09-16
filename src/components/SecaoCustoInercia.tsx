import React from 'react'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  PiggyBank,
  CheckCircle2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'

export interface SecaoCustoInerciaProps {
  /** Gasto acumulado sem solar em 1 ano (R$) */
  gastoSemSolar1Ano?: number | null
  /** Gasto acumulado sem solar em 5 anos (R$) */
  gastoSemSolar5Anos?: number | null
  /** Gasto acumulado sem solar em 25 anos (R$) */
  gastoSemSolar25Anos?: number | null
  /** Valor do investimento solar Delfos (R$) */
  valorInvestimento?: number | null
  /** Economia mensal estimada (R$) */
  economiaMensal?: number | null
  /** Valor da conta de luz mensal atual (R$) */
  contaMensal?: number | null
  /** Economia líquida acumulada em 1 ano com solar (R$) */
  economia1Ano?: number | null
  /** Economia líquida acumulada em 5 anos com solar (R$) */
  economia5Anos?: number | null
  /** Economia líquida acumulada em 25 anos com solar (R$) */
  economia25Anos?: number | null
  className?: string
}

/**
 * Seção 2 — O Custo da Inércia (Diagnóstico Visual)
 *
 * Título: "O quanto você já perdeu sem solar?"
 *
 * Gráfico de barras comparativo lado a lado (Recharts):
 * - Barra vermelha crescente: "Sua conta de luz sem solar" — gasto acumulado em 1, 5 e 25 anos
 * - Barra verde estável: "Com energia solar Delfos" — investimento único + economia nos marcos de 1, 5 e 25 anos
 *
 * Destaque em box:
 * "Sem solar, em 5 anos você pagará R$ [gasto acumulado 5 anos]. Esse dinheiro poderia estar no seu bolso."
 *
 * Linha comparativa abaixo:
 * "Hoje você paga R$ [conta mensal] para a concessionária e não recebe nada em troca. Com solar, você investe e o sistema passa a ser seu patrimônio."
 */
export const SecaoCustoInercia: React.FC<SecaoCustoInerciaProps> = ({
  gastoSemSolar1Ano,
  gastoSemSolar5Anos,
  gastoSemSolar25Anos,
  valorInvestimento,
  economiaMensal,
  contaMensal,
  economia1Ano,
  economia5Anos,
  economia25Anos,
  className = '',
}) => {
  // =========================================================================
  // DADOS COM FALLBACK CONSISTENTE (exemplos especificados pelo usuário):
  // Cliente com conta de R$ 928,75/mês, gasto acumulado 5 anos R$ 71.000,
  // investimento solar R$ 45.000, economia mensal R$ 928,75.
  // 1 ano sem solar ≈ 928,75 * 12 * 1.045 ≈ 11.600
  // 25 anos sem solar ≈ coerente com a projeção (ex: R$ 850.000 com inflação de 9% a.a.)
  // =========================================================================

  const contaMensalFinal =
    contaMensal !== undefined && contaMensal !== null && contaMensal > 0
      ? contaMensal
      : economiaMensal !== undefined && economiaMensal !== null && economiaMensal > 0
        ? economiaMensal
        : 928.75

  const investimentoFinal =
    valorInvestimento !== undefined && valorInvestimento !== null && valorInvestimento > 0
      ? valorInvestimento
      : 45000

  const gasto5AnosFinal =
    gastoSemSolar5Anos !== undefined && gastoSemSolar5Anos !== null && gastoSemSolar5Anos > 0
      ? gastoSemSolar5Anos
      : 71000

  const gasto1AnoFinal =
    gastoSemSolar1Ano !== undefined && gastoSemSolar1Ano !== null && gastoSemSolar1Ano > 0
      ? gastoSemSolar1Ano
      : Math.round(contaMensalFinal * 12 * 1.045) // ~11.650

  const gasto25AnosFinal =
    gastoSemSolar25Anos !== undefined && gastoSemSolar25Anos !== null && gastoSemSolar25Anos > 0
      ? gastoSemSolar25Anos
      : Math.round(gasto5AnosFinal * 11.9) // ~845.000

  // Com solar: investimento único quitado + custos mínimos de taxa de conexão
  // Em 1 ano: investimento total + taxa residual (ou o próprio valor do investimento fixo que vira ativo)
  // Como o usuário pediu: "Barra verde estável: 'Com energia solar Delfos' — mostrando o investimento único + economia"
  const comSolar1Ano = Math.round(investimentoFinal)
  const comSolar5Anos = Math.round(investimentoFinal)
  const comSolar25Anos = Math.round(investimentoFinal)

  // Economias líquidas geradas
  const eco1AnoFinal =
    economia1Ano !== undefined && economia1Ano !== null && economia1Ano > 0
      ? economia1Ano
      : Math.round(contaMensalFinal * 12)

  const eco5AnosFinal =
    economia5Anos !== undefined && economia5Anos !== null && economia5Anos > 0
      ? economia5Anos
      : Math.round(gasto5AnosFinal - investimentoFinal)

  const eco25AnosFinal =
    economia25Anos !== undefined && economia25Anos !== null && economia25Anos > 0
      ? economia25Anos
      : Math.round(gasto25AnosFinal - investimentoFinal)

  // Dados do gráfico de barras para o Recharts
  const dadosGrafico = [
    {
      marco: '1 ano',
      rotulo: 'Em 1 ano',
      semSolar: Math.round(gasto1AnoFinal),
      comSolar: comSolar1Ano,
      diferenca: Math.max(0, gasto1AnoFinal - comSolar1Ano),
    },
    {
      marco: '5 anos',
      rotulo: 'Em 5 anos',
      semSolar: Math.round(gasto5AnosFinal),
      comSolar: comSolar5Anos,
      diferenca: Math.round(gasto5AnosFinal - comSolar5Anos),
    },
    {
      marco: '25 anos',
      rotulo: 'Em 25 anos',
      semSolar: Math.round(gasto25AnosFinal),
      comSolar: comSolar25Anos,
      diferenca: Math.round(gasto25AnosFinal - comSolar25Anos),
    },
  ]

  // Formatter compacto para eixo Y
  const formatarEixoY = (valor: number | unknown) => {
    const num = Number(valor) || 0
    if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `R$ ${(num / 1000).toFixed(0)}k`
    return `R$ ${Math.round(num)}`
  }

  return (
    <section
      className={`bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden transition-all ${className}`}
      aria-label="O Custo da Inércia"
    >
      {/* ========================================================================= */}
      {/* CABEÇALHO DA SEÇÃO                                                        */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-red-50/40 via-amber-50/20 to-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">Diagnóstico Financeiro</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              O quanto você já perdeu sem solar?
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
              A energia elétrica da concessionária é um custo contínuo e crescente que nunca vira
              patrimônio. Veja o comparativo real entre continuar pagando boletos e ter sua própria
              usina.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-2xs text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-[#DC2626] inline-block" />
            <span className="font-semibold text-gray-700">Sem solar</span>
            <span className="text-gray-300 mx-1">|</span>
            <span className="w-3 h-3 rounded-sm bg-[#16A34A] inline-block" />
            <span className="font-semibold text-gray-700">Com solar Delfos</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 bg-[#FAFCFA]">
        {/* ========================================================================= */}
        {/* GRÁFICO DE BARRAS COMPARATIVO LADO A LADO                                 */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Comparativo Acumulado: Gasto Concessionária vs. Investimento Delfos
              </h3>
              <p className="text-xs text-gray-500">
                Evolução nos marcos de 1, 5 e 25 anos com reajuste tarifário histórico da rede
              </p>
            </div>
            <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
              Valores acumulados em R$
            </span>
          </div>

          {/* Container do Gráfico Recharts */}
          <div className="w-full h-72 sm:h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosGrafico}
                margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="marco"
                  tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={formatarEixoY}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  width={72}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(243, 244, 246, 0.6)' }}
                  formatter={(value: unknown, name: unknown) => {
                    const num = typeof value === 'number' ? value : Number(value) || 0
                    const label = String(name || '')
                    return [formatCurrency(num), label]
                  }}
                  labelFormatter={(label) => `Marco temporal: ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '1rem',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '10px 14px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingBottom: '8px' }}
                />
                {/* Barra Vermelha Crescente: Sua conta de luz sem solar */}
                <Bar
                  dataKey="semSolar"
                  name="Sua conta de luz sem solar"
                  fill="#DC2626"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={64}
                />
                {/* Barra Verde Estável: Com energia solar Delfos */}
                <Bar
                  dataKey="comSolar"
                  name="Com energia solar Delfos"
                  fill="#16A34A"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={64}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cards Rápidos de Detalhe por Marco */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
            {/* Marco 1 ano */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Marco 1 ano</span>
                <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                  Curto prazo
                </span>
              </div>
              <div className="text-xs space-y-0.5 text-gray-700">
                <div className="flex justify-between">
                  <span>Sem solar:</span>
                  <strong className="text-red-600">{formatCurrency(gasto1AnoFinal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Investimento:</span>
                  <strong className="text-emerald-700">{formatCurrency(investimentoFinal)}</strong>
                </div>
              </div>
              <div className="text-[11px] text-emerald-700 font-bold pt-1 border-t border-gray-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>Economia de {formatCurrency(eco1AnoFinal)}</span>
              </div>
            </div>

            {/* Marco 5 anos */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                <span>Marco 5 anos</span>
                <span className="text-[10px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                  Retorno (Payback)
                </span>
              </div>
              <div className="text-xs space-y-0.5 text-gray-700">
                <div className="flex justify-between">
                  <span>Sem solar:</span>
                  <strong className="text-red-600">{formatCurrency(gasto5AnosFinal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Investimento quitado:</span>
                  <strong className="text-emerald-700">{formatCurrency(investimentoFinal)}</strong>
                </div>
              </div>
              <div className="text-[11px] text-emerald-800 font-bold pt-1 border-t border-amber-200 flex items-center gap-1">
                <PiggyBank className="w-3 h-3 shrink-0 text-emerald-700" />
                <span>Sobram {formatCurrency(eco5AnosFinal)} no bolso</span>
              </div>
            </div>

            {/* Marco 25 anos */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                <span>Marco 25 anos</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Longo prazo
                </span>
              </div>
              <div className="text-xs space-y-0.5 text-gray-700">
                <div className="flex justify-between">
                  <span>Sem solar:</span>
                  <strong className="text-red-600">{formatCurrency(gasto25AnosFinal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Investimento:</span>
                  <strong className="text-emerald-700">{formatCurrency(investimentoFinal)}</strong>
                </div>
              </div>
              <div className="text-[11px] text-emerald-800 font-bold pt-1 border-t border-emerald-200 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 shrink-0 text-emerald-700" />
                <span>Economia acumulada: {formatCurrency(eco25AnosFinal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESTAQUE EM BOX (Exatamente conforme pedido pelo usuário)                 */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-4 z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-black tracking-widest text-red-200 block">
                Alerta de Perda Acumulada
              </span>
              <p className="text-base sm:text-lg md:text-xl font-extrabold text-white leading-snug">
                Sem solar, em 5 anos você pagará{' '}
                <span className="underline decoration-amber-300 decoration-2 underline-offset-4 font-black">
                  {formatCurrency(gasto5AnosFinal)}
                </span>
                . Esse dinheiro poderia estar no seu bolso.
              </p>
            </div>
          </div>

          <div className="shrink-0 z-10 self-end sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-red-700 text-xs font-black shadow-xs">
              <TrendingDown className="w-4 h-4" />
              <span>Gasto Sem Retorno</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LINHA COMPARATIVA ABAIXO (Texto reflexivo fiel ao prompt)                 */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold text-gray-500 tracking-wider block">
                Decisão Inteligente • Concessionária vs. Patrimônio Solar
              </span>
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed font-medium">
                Hoje você paga{' '}
                <strong className="text-red-600 font-extrabold">
                  {formatCurrency(contaMensalFinal)}
                </strong>{' '}
                para a concessionária e não recebe nada em troca. Com solar, você investe e o
                sistema passa a ser seu patrimônio.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <span>Seu Ativo Próprio</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SecaoCustoInercia
