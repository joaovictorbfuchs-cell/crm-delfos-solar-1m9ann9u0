import React from 'react'
import {
  Wallet,
  CreditCard,
  Building2,
  Landmark,
  PiggyBank,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

export interface SecaoInvestimentoPagamentoProps {
  /** Valor total do investimento solar (R$) */
  valorInvestimento?: number | null
  /** Valor à vista com desconto (R$) */
  valorAVista?: number | null
  /** Percentual ou valor de desconto à vista */
  descontoAVistaReais?: number | null
  /** Quantidade de parcelas no cartão */
  parcelasCartao?: number | null
  /** Valor da parcela no cartão (R$) */
  valorParcelaCartao?: number | null
  /** Se o cartão é sem juros (default true no exemplo) */
  cartaoSemJuros?: boolean
  /** Financiamento A: Nome/Rótulo */
  nomeFinanciamentoA?: string
  /** Financiamento A: Valor da entrada (R$) */
  entradaFinanciamentoA?: number | null
  /** Financiamento A: Quantidade de parcelas */
  parcelasFinanciamentoA?: number | null
  /** Financiamento A: Valor da parcela (R$) */
  valorParcelaFinanciamentoA?: number | null
  /** Financiamento B: Nome/Rótulo */
  nomeFinanciamentoB?: string
  /** Financiamento B: Valor da entrada (R$) */
  entradaFinanciamentoB?: number | null
  /** Financiamento B: Quantidade de parcelas */
  parcelasFinanciamentoB?: number | null
  /** Financiamento B: Valor da parcela (R$) */
  valorParcelaFinanciamentoB?: number | null
  /** Valor da conta de energia atual paga à concessionária (R$/mês) */
  contaMensalAtual?: number | null
  /** Valor estimado da fatura de energia pós-solar (taxa mínima / disponibilidade / Fio B) em R$/mês */
  faturaMensalComSolar?: number | null
  /** Alias aceito para faturaMensalComSolar */
  contaMensalComSolar?: number | null
  /** Fatura com solar específica por modalidade (opcional) */
  contaComSolarCartao?: number | null
  contaComSolarFinanA?: number | null
  contaComSolarFinanB?: number | null
  /** Validade da proposta em dias (fallback: 5 dias) */
  validadeDias?: number | null
  /** Nome do cliente para contextualização */
  nomeCliente?: string | null
  className?: string
}

/**
 * Seção "Investimento e Condições de Pagamento"
 *
 * Apresenta ao cliente o valor do sistema e as 4 formas de pagamento
 * de maneira limpa, moderna e persuasiva:
 * - Topo: 'Seu investimento'
 * - Valor total em destaque: R$ [valor] com subtítulo 'Investimento único — o sistema é seu'
 * - 4 cards de pagamento lado a lado (2x2 em mobile):
 *     1. À Vista: R$ [valor à vista], Desconto: R$ [economia], 'Melhor condição'
 *     2. Cartão: [X] parcelas de R$ [valor], Sem juros, 'Parcele em até [X]x'
 *     3. Financiamento A: Entrada R$ [entrada], [X] parcelas de R$ [valor], 'Menor parcela'
 *     4. Financiamento B: Entrada R$ [entrada], [X] parcelas de R$ [valor], 'Maior prazo'
 * - Linha comparativa:
 *     "Hoje você paga R$ [conta] de energia para a concessionária."
 *     "Com solar, sua parcela do financiamento é R$ [parcela] — e o sistema passa a ser seu patrimônio."
 * - Badge de urgência: 'Condições válidas por [X] dias. Reserve sua usina agora.'
 */
export const SecaoInvestimentoPagamento: React.FC<SecaoInvestimentoPagamentoProps> = ({
  valorInvestimento,
  valorAVista,
  descontoAVistaReais,
  parcelasCartao,
  valorParcelaCartao,
  cartaoSemJuros = true,
  nomeFinanciamentoA,
  entradaFinanciamentoA,
  parcelasFinanciamentoA,
  valorParcelaFinanciamentoA,
  nomeFinanciamentoB,
  entradaFinanciamentoB,
  parcelasFinanciamentoB,
  valorParcelaFinanciamentoB,
  contaMensalAtual,
  faturaMensalComSolar,
  contaMensalComSolar,
  contaComSolarCartao,
  contaComSolarFinanA,
  contaComSolarFinanB,
  validadeDias,
  nomeCliente,
  className = '',
}) => {
  const totalFinal =
    valorInvestimento !== undefined && valorInvestimento !== null && valorInvestimento > 0
      ? valorInvestimento
      : 45000

  // Conta de energia atual sem solar
  const contaAtualFinal =
    contaMensalAtual !== undefined && contaMensalAtual !== null && contaMensalAtual > 0
      ? contaMensalAtual
      : 928.75

  // Fatura mensal residual COM solar (taxa mínima da concessionária)
  const faturaComSolarFinal =
    faturaMensalComSolar !== undefined && faturaMensalComSolar !== null && faturaMensalComSolar >= 0
      ? faturaMensalComSolar
      : contaMensalComSolar !== undefined &&
          contaMensalComSolar !== null &&
          contaMensalComSolar >= 0
        ? contaMensalComSolar
        : 70

  const contaSolarCartao =
    contaComSolarCartao !== undefined && contaComSolarCartao !== null && contaComSolarCartao >= 0
      ? contaComSolarCartao
      : faturaComSolarFinal

  const contaSolarFinanA =
    contaComSolarFinanA !== undefined && contaComSolarFinanA !== null && contaComSolarFinanA >= 0
      ? contaComSolarFinanA
      : faturaComSolarFinal

  const contaSolarFinanB =
    contaComSolarFinanB !== undefined && contaComSolarFinanB !== null && contaComSolarFinanB >= 0
      ? contaComSolarFinanB
      : faturaComSolarFinal

  // 1. À Vista (se não informado, aplica 5% sobre totalFinal ou valorAVista explícito)
  const aVistaFinal =
    valorAVista !== undefined && valorAVista !== null && valorAVista > 0
      ? valorAVista
      : Math.round(totalFinal * 0.95)

  const descontoAVistaFinal =
    descontoAVistaReais !== undefined && descontoAVistaReais !== null && descontoAVistaReais > 0
      ? descontoAVistaReais
      : Math.max(0, totalFinal - aVistaFinal)

  // 2. Cartão de Crédito
  const parcelasCartaoFinal =
    parcelasCartao !== undefined && parcelasCartao !== null && parcelasCartao > 0
      ? parcelasCartao
      : 12

  const valorParcelaCartaoFinal =
    valorParcelaCartao !== undefined && valorParcelaCartao !== null && valorParcelaCartao > 0
      ? valorParcelaCartao
      : Math.round(totalFinal / parcelasCartaoFinal)

  // 3. Financiamento A (Menor parcela / 60x ou banco 1)
  const parcelasFinanAFinal =
    parcelasFinanciamentoA !== undefined &&
    parcelasFinanciamentoA !== null &&
    parcelasFinanciamentoA > 0
      ? parcelasFinanciamentoA
      : 60

  // Entrada Financiamento A: se fornecida usa, senão ~20% do investimento ou 9000
  const entradaFinanAFinal =
    entradaFinanciamentoA !== undefined && entradaFinanciamentoA !== null
      ? entradaFinanciamentoA
      : Math.round(totalFinal * 0.2)

  const valorParcelaFinanAFinal =
    valorParcelaFinanciamentoA !== undefined &&
    valorParcelaFinanciamentoA !== null &&
    valorParcelaFinanciamentoA > 0
      ? valorParcelaFinanciamentoA
      : 720

  // 4. Financiamento B (Maior prazo / 120x ou banco 2)
  const parcelasFinanBFinal =
    parcelasFinanciamentoB !== undefined &&
    parcelasFinanciamentoB !== null &&
    parcelasFinanciamentoB > 0
      ? parcelasFinanciamentoB
      : 120

  // Entrada Financiamento B: se fornecida usa, senão ~10% do investimento ou 4500
  const entradaFinanBFinal =
    entradaFinanciamentoB !== undefined && entradaFinanciamentoB !== null
      ? entradaFinanciamentoB
      : Math.round(totalFinal * 0.1)

  const valorParcelaFinanBFinal =
    valorParcelaFinanciamentoB !== undefined &&
    valorParcelaFinanciamentoB !== null &&
    valorParcelaFinanciamentoB > 0
      ? valorParcelaFinanciamentoB
      : 450

  // Totais mensais somando fatura com solar + parcela
  const totalMensalCartao = contaSolarCartao + valorParcelaCartaoFinal
  const totalMensalFinanA = contaSolarFinanA + valorParcelaFinanAFinal
  const totalMensalFinanB = contaSolarFinanB + valorParcelaFinanBFinal

  // Validade
  const diasValidadeFinal =
    validadeDias !== undefined && validadeDias !== null && validadeDias > 0 ? validadeDias : 5

  // Parcela de comparação: usa a menor parcela do financiamento (Financiamento B ou A)
  const menorParcelaFinanciamento = Math.min(
    valorParcelaFinanAFinal > 0 ? valorParcelaFinanAFinal : Infinity,
    valorParcelaFinanBFinal > 0 ? valorParcelaFinanBFinal : Infinity,
  )
  const parcelaComparativa =
    menorParcelaFinanciamento !== Infinity ? menorParcelaFinanciamento : valorParcelaFinanBFinal

  return (
    <section
      className={`bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden transition-all ${className}`}
      aria-label="Investimento e Condições de Pagamento"
    >
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO & DESTAQUE DO INVESTIMENTO                                   */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 via-teal-50/20 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">Proposta Financeira</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Seu investimento
            </h2>
            {nomeCliente && (
              <p className="text-xs text-gray-500 font-medium">
                Condições exclusivas para: <strong className="text-gray-700">{nomeCliente}</strong>
              </p>
            )}
          </div>

          {/* Destaque do Valor Total */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs flex flex-col items-start sm:items-end">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Valor Total do Sistema
            </span>
            <span className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight">
              {formatCurrency(totalFinal)}
            </span>
            <span className="text-xs font-semibold text-gray-600 mt-0.5">
              Investimento único — o sistema é seu
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 bg-[#FAFCFA]">
        {/* ========================================================================= */}
        {/* 2. GRADE DE 4 CARDS DE PAGAMENTO (1 col mobile, 2 col sm, 4 col lg)      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: À VISTA */}
          <div className="relative bg-white rounded-2xl p-5 border-2 border-emerald-500/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            {/* Tag no Topo */}
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                Melhor condição
              </span>
            </div>

            <div className="space-y-1 my-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">À Vista</h3>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {formatCurrency(aVistaFinal)}
              </div>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Economia de {formatCurrency(descontoAVistaFinal)} à vista
                </span>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-gray-500">
                <span>Custo com energia atual:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(contaAtualFinal)}/mês
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                <span>Fatura pós-solar:</span>
                <span>{formatCurrency(faturaComSolarFinal)}/mês</span>
              </div>
            </div>
          </div>

          {/* CARD 2: CARTÃO */}
          <div className="relative bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Parcele em até {parcelasCartaoFinal}x
                </span>
              </div>

              <div className="space-y-1 my-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Cartão</h3>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  <span className="text-lg font-bold text-gray-600">
                    {parcelasCartaoFinal}x de{' '}
                  </span>
                  {formatCurrency(valorParcelaCartaoFinal)}
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {cartaoSemJuros ? 'Sem juros' : 'Condição facilitada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Comparativo: Fatura com Solar + Parcela e Custo Atual */}
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200/70 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Fatura mensal com solar + parcela:
                </span>
                <div className="font-black text-blue-950 text-xs">
                  {formatCurrency(contaSolarCartao + valorParcelaCartaoFinal)}/mês
                  <span className="font-normal text-blue-800 text-[10px] block sm:inline sm:ml-1">
                    ({formatCurrency(contaSolarCartao)} conta +{' '}
                    {formatCurrency(valorParcelaCartaoFinal)} parc.)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] px-1 text-gray-600 font-medium">
                <span>Custo com energia atual:</span>
                <strong className="text-red-700 font-bold">
                  {formatCurrency(contaAtualFinal)}/mês
                </strong>
              </div>
            </div>
          </div>

          {/* CARD 3: FINANCIAMENTO A */}
          <div className="relative bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Menor parcela
                </span>
              </div>

              <div className="space-y-1 my-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {nomeFinanciamentoA || 'Financiamento A'}
                </h3>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  <span className="text-lg font-bold text-gray-600">
                    {parcelasFinanAFinal}x de{' '}
                  </span>
                  {formatCurrency(valorParcelaFinanAFinal)}
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200">
                    Entrada: {formatCurrency(entradaFinanAFinal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Comparativo: Fatura com Solar + Parcela e Custo Atual */}
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/70 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                  Fatura mensal com solar + parcela:
                </span>
                <div className="font-black text-amber-950 text-xs">
                  {formatCurrency(contaSolarFinanA + valorParcelaFinanAFinal)}/mês
                  <span className="font-normal text-amber-800 text-[10px] block sm:inline sm:ml-1">
                    ({formatCurrency(contaSolarFinanA)} conta +{' '}
                    {formatCurrency(valorParcelaFinanAFinal)} parc.)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] px-1 text-gray-600 font-medium">
                <span>Custo com energia atual:</span>
                <strong className="text-red-700 font-bold">
                  {formatCurrency(contaAtualFinal)}/mês
                </strong>
              </div>
            </div>
          </div>

          {/* CARD 4: FINANCIAMENTO B */}
          <div className="relative bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                  Maior prazo
                </span>
              </div>

              <div className="space-y-1 my-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {nomeFinanciamentoB || 'Financiamento B'}
                </h3>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  <span className="text-lg font-bold text-gray-600">
                    {parcelasFinanBFinal}x de{' '}
                  </span>
                  {formatCurrency(valorParcelaFinanBFinal)}
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-900 bg-purple-50/80 px-2 py-0.5 rounded-md border border-purple-200">
                    Entrada: {formatCurrency(entradaFinanBFinal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Comparativo: Fatura com Solar + Parcela e Custo Atual */}
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-200/70 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 block">
                  Fatura mensal com solar + parcela:
                </span>
                <div className="font-black text-purple-950 text-xs">
                  {formatCurrency(contaSolarFinanB + valorParcelaFinanBFinal)}/mês
                  <span className="font-normal text-purple-800 text-[10px] block sm:inline sm:ml-1">
                    ({formatCurrency(contaSolarFinanB)} conta +{' '}
                    {formatCurrency(valorParcelaFinanBFinal)} parc.)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] px-1 text-gray-600 font-medium">
                <span>Custo com energia atual:</span>
                <strong className="text-red-700 font-bold">
                  {formatCurrency(contaAtualFinal)}/mês
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. LINHA COMPARATIVA (Texto persuasivo fiel aos requisitos)               */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
              <PiggyBank className="w-6 h-6 text-emerald-700" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <span>Comparativo de Custo Mensal</span>
              </div>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-normal">
                Hoje você paga{' '}
                <strong className="text-red-600 font-extrabold underline decoration-red-300 decoration-2 underline-offset-2">
                  {formatCurrency(contaAtualFinal)}
                </strong>{' '}
                de energia para a concessionária.
              </p>
              <p className="text-sm sm:text-base text-gray-900 leading-relaxed font-bold">
                Com solar, sua parcela do financiamento é{' '}
                <span className="text-emerald-700 font-black text-base sm:text-lg">
                  {formatCurrency(parcelaComparativa)}
                </span>{' '}
                — e o sistema passa a ser seu patrimônio.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-end md:self-center">
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Troque despesa por patrimônio</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. BADGE DE URGÊNCIA NA PARTE INFERIOR                                    */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-100 animate-pulse" />
            </div>
            <div>
              <span className="text-xs uppercase font-black tracking-widest text-amber-100 block">
                Oportunidade por Tempo Limitado
              </span>
              <p className="text-sm sm:text-base font-extrabold text-white">
                Condições válidas por {diasValidadeFinal} dias. Reserve sua usina agora.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-orange-600 font-black text-xs shadow-xs hover:bg-amber-50 transition-colors">
            <span>Garantir Condição</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </section>
  )
}

export default SecaoInvestimentoPagamento
