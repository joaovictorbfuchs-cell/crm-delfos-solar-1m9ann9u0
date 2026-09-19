import React from 'react'
import {
  Wallet,
  CreditCard,
  Building2,
  Landmark,
  Clock,
  Sparkles,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency, formatarMesAnoQuitacao } from '@/lib/formatters'

export interface SecaoInvestimentoPagamentoProps {
  /** Data base do orçamento ou proposta (para cálculo do mês de quitação) */
  dataOrcamento?: string | Date | null
  /** Valor total do investimento solar (R$) */
  valorInvestimento?: number | null
  /** Valor à vista com desconto (R$) */
  valorAVista?: number | null
  /** Percentual ou valor de desconto à vista */
  descontoAVistaReais?: number | null
  /** Quantidade de parcelas no cartão */
  parcelasCartao?: number | null
  /** Valor da entrada no cartão (R$) */
  entradaCartao?: number | null
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
  /** Financiamento A: Valor do IOF (R$) */
  iofFinanciamentoA?: number | null
  /** Financiamento B: Nome/Rótulo */
  nomeFinanciamentoB?: string
  /** Financiamento B: Valor da entrada (R$) */
  entradaFinanciamentoB?: number | null
  /** Financiamento B: Quantidade de parcelas */
  parcelasFinanciamentoB?: number | null
  /** Financiamento B: Valor da parcela (R$) */
  valorParcelaFinanciamentoB?: number | null
  /** Financiamento B: Valor do IOF (R$) */
  iofFinanciamentoB?: number | null
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
  /** Valores projetados com reajuste tarifário de 9% a.a. */
  contaSemSolar4AnosComReajuste?: number | null
  contaComSolar4AnosComReajuste?: number | null
  contaSemSolar10AnosComReajuste?: number | null
  contaComSolar10AnosComReajuste?: number | null
  /** Validade da proposta em dias (fallback: 5 dias) */
  validadeDias?: number | null
  /** Nome do cliente para contextualização */
  nomeCliente?: string | null
  /** Payback em meses (calculado ou persistido no orçamento) */
  paybackMeses?: number | null
  /** Texto personalizado de payback (ex: '1 ano e 9 meses') */
  paybackTexto?: string | null
  /** Se deve exibir o card de payback integrado ao final da seção (default: true) */
  exibirPaybackAbaixo?: boolean
  /** Custo de postergação mensal estimado (R$/mês que o cliente perde a cada mês sem energia solar) */
  custoPostergacao?: number | null
  /** Dados opcionais da empresa para o bloco de assinaturas (fallback: Delfos Engenharia Ltda) */
  dadosEmpresa?: {
    razaoSocial?: string
    cnpj?: string
    responsavelTecnico?: string
    crea?: string
    endereco?: string
    telefone?: string
    email?: string
  }
  /** Dados opcionais do cliente para o bloco de assinaturas (fallback: props nomeCliente e não informado) */
  dadosCliente?: {
    nome?: string
    cpfOuCnpj?: string
    endereco?: string
    municipio?: string
    telefone?: string
    email?: string
  }
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
  dataOrcamento,
  valorInvestimento,
  valorAVista,
  descontoAVistaReais,
  parcelasCartao,
  entradaCartao,
  valorParcelaCartao,
  cartaoSemJuros = true,
  nomeFinanciamentoA,
  entradaFinanciamentoA,
  parcelasFinanciamentoA,
  valorParcelaFinanciamentoA,
  iofFinanciamentoA,
  nomeFinanciamentoB,
  entradaFinanciamentoB,
  parcelasFinanciamentoB,
  valorParcelaFinanciamentoB,
  iofFinanciamentoB,
  contaMensalAtual,
  faturaMensalComSolar,
  contaMensalComSolar,
  contaComSolarCartao,
  contaComSolarFinanA,
  contaComSolarFinanB,
  contaSemSolar4AnosComReajuste,
  contaComSolar4AnosComReajuste,
  contaSemSolar10AnosComReajuste,
  contaComSolar10AnosComReajuste,
  validadeDias,
  nomeCliente,
  paybackMeses,
  paybackTexto,
  exibirPaybackAbaixo = true,
  custoPostergacao,
  dadosEmpresa,
  dadosCliente,
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
        : 0

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

  const entradaCartaoFinal = Math.max(0, entradaCartao || 0)

  const valorParcelaCartaoFinal =
    valorParcelaCartao !== undefined && valorParcelaCartao !== null && valorParcelaCartao > 0
      ? valorParcelaCartao
      : Math.round(Math.max(0, totalFinal - entradaCartaoFinal) / parcelasCartaoFinal)

  // 3. Financiamento A (Menor parcela / 60x ou banco 1)
  const parcelasFinanAFinal =
    parcelasFinanciamentoA !== undefined &&
    parcelasFinanciamentoA !== null &&
    parcelasFinanciamentoA > 0
      ? parcelasFinanciamentoA
      : 60

  const entradaFinanAFinal = Math.max(0, entradaFinanciamentoA || 0)

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

  const entradaFinanBFinal = Math.max(0, entradaFinanciamentoB || 0)

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

  // Projeção com reajuste tarifário de 9% a.a. (4 anos e 10 anos)
  const contaSemSolar4AnosFinal =
    contaSemSolar4AnosComReajuste !== undefined &&
    contaSemSolar4AnosComReajuste !== null &&
    contaSemSolar4AnosComReajuste > 0
      ? contaSemSolar4AnosComReajuste
      : contaAtualFinal * Math.pow(1.09, 4)

  const contaComSolar4AnosFinal =
    contaComSolar4AnosComReajuste !== undefined &&
    contaComSolar4AnosComReajuste !== null &&
    contaComSolar4AnosComReajuste >= 0
      ? contaComSolar4AnosComReajuste
      : faturaComSolarFinal * Math.pow(1.09, 4)

  const contaSemSolar10AnosFinal =
    contaSemSolar10AnosComReajuste !== undefined &&
    contaSemSolar10AnosComReajuste !== null &&
    contaSemSolar10AnosComReajuste > 0
      ? contaSemSolar10AnosComReajuste
      : contaAtualFinal * Math.pow(1.09, 10)

  const contaComSolar10AnosFinal =
    contaComSolar10AnosComReajuste !== undefined &&
    contaComSolar10AnosComReajuste !== null &&
    contaComSolar10AnosComReajuste >= 0
      ? contaComSolar10AnosComReajuste
      : faturaComSolarFinal * Math.pow(1.09, 10)

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

  // Economia mensal líquida à vista (Conta s/ solar - Conta c/ solar)
  const economiaMensalAVista = Math.max(0, contaAtualFinal - faturaComSolarFinal)

  // Custo de postergação mensal (fallback: Math.max(0, contaAtualFinal - faturaComSolarFinal))
  const custoPostergacaoFinal =
    custoPostergacao !== undefined && custoPostergacao !== null && custoPostergacao > 0
      ? custoPostergacao
      : Math.max(0, contaAtualFinal - faturaComSolarFinal)

  // Cálculo e formatação do Payback (anos, meses e mês/ano de quitação)
  const infoPayback = React.useMemo(() => {
    let texto = paybackTexto || ''
    let mesesTotais =
      paybackMeses !== undefined && paybackMeses !== null && paybackMeses > 0
        ? paybackMeses
        : totalFinal > 0 && Math.max(0, contaAtualFinal - faturaComSolarFinal) > 0
          ? Math.round((totalFinal / Math.max(1, contaAtualFinal - faturaComSolarFinal)) * 10) / 10
          : 22

    if (paybackTexto && paybackTexto.trim()) {
      const matchAnos = paybackTexto.match(/(\d+)\s*(?:anos?|a)/i)
      const matchMeses = paybackTexto.match(/(\d+)\s*m[eê]s(?:es)?/i)
      if (matchAnos && matchAnos[1]) {
        const anos = parseInt(matchAnos[1], 10)
        const mesesExtra = matchMeses && matchMeses[1] ? parseInt(matchMeses[1], 10) : 0
        mesesTotais = anos * 12 + mesesExtra
      }
    } else {
      const anos = Math.floor(mesesTotais / 12)
      const meses = Math.round(mesesTotais % 12)
      texto = `${anos} anos`
      if (anos === 1) texto = '1 ano'
      if (anos === 0) texto = `${meses} meses`
      else if (meses > 0) {
        texto = `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`
      }
    }

    const quitacaoMesAno = formatarMesAnoQuitacao(dataOrcamento, mesesTotais)

    return {
      texto,
      quitacaoMesAno,
    }
  }, [paybackTexto, paybackMeses, totalFinal, contaAtualFinal, faturaComSolarFinal, dataOrcamento])

  return (
    <section
      className={`bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden transition-all ${className}`}
      aria-label="Investimento e Condições de Pagamento"
    >
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DO VALOR TOTAL (PREMIUM, CLEAN)                              */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 bg-white border-t border-b border-[#1a3a5c] text-left">
        <div className="text-[12pt] font-semibold text-[#374151] leading-tight">
          Investimento Total
        </div>
        <div className="text-[24pt] sm:text-[28pt] font-extrabold text-[#1a3a5c] leading-tight tracking-tight mt-1 mb-1">
          {formatCurrency(totalFinal)}
        </div>
        <div className="inline-flex items-center gap-1.5 text-[10pt] font-semibold text-[#166534]">
          <span className="text-xs leading-none">▲</span>
          <span>Economia mensal estimada: {formatCurrency(economiaMensalAVista)}</span>
        </div>
        {nomeCliente && (
          <p className="text-xs text-gray-500 font-medium mt-2">
            Condições exclusivas para: <strong className="text-gray-700">{nomeCliente}</strong>
          </p>
        )}
      </div>

      <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 bg-[#FAFCFA]">
        {/* ========================================================================= */}
        {/* 2. TÍTULO E GRADE DE 4 CARDS DE PAGAMENTO (1 col mobile, 2 col sm, 4 col lg) */}
        {/* ========================================================================= */}
        <div>
          <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight mb-3">
            Condições de pagamento
          </h3>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {/* CARD 1: À VISTA */}
            <div className="p-3.5 rounded-xl border-2 border-[#16a34a] bg-white flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-shadow min-w-0">
              <div>
                {/* Cabeçalho com título à esquerda e badge Sem Juros no canto sup. direito */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-950 truncate">
                    À Vista
                  </span>
                  <span className="text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] px-2 py-0.5 rounded-full shrink-0">
                    Sem Juros
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-black text-[#16a34a] tracking-tight mt-1">
                  {formatCurrency(aVistaFinal)}
                </div>
                <p className="text-[10pt] text-gray-500 mt-1 leading-snug">
                  {descontoAVistaFinal > 0
                    ? `Desconto de ${formatCurrency(descontoAVistaFinal)} aplicado`
                    : 'Valor total do projeto à vista'}
                </p>
              </div>

              {/* 3 Linhas comparativas inferiores */}
              <div className="pt-2.5 border-t border-emerald-200 space-y-1 text-[10pt]">
                <div className="flex justify-between gap-1">
                  <span className="text-gray-500">Conta hoje:</span>
                  <span className="font-bold text-red-600 text-right">
                    {formatCurrency(contaAtualFinal)}
                  </span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-gray-500">Conta c/ solar:</span>
                  <span className="font-bold text-[#16a34a] text-right">
                    {formatCurrency(faturaComSolarFinal)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-200 font-extrabold text-emerald-900 gap-1">
                  <span>Economia/mês:</span>
                  <span className="text-right">{formatCurrency(economiaMensalAVista)}</span>
                </div>
              </div>
            </div>

            {/* CARD 2: CARTÃO */}
            <div className="p-3.5 rounded-xl border border-gray-200 bg-white flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-shadow min-w-0">
              <div>
                {/* Cabeçalho com título e badge de parcelas no canto superior direito */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-gray-900 truncate">
                    Cartão
                  </span>
                  <span className="text-[10pt] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full shrink-0">
                    {parcelasCartaoFinal}x
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-1">
                  {formatCurrency(valorParcelaCartaoFinal)}
                </div>
                <div className="text-[10pt] text-gray-500 mt-1 leading-snug">
                  {entradaCartaoFinal > 0 && (
                    <span className="block text-emerald-800 font-semibold">
                      Entrada: {formatCurrency(entradaCartaoFinal)}
                    </span>
                  )}
                  <span>
                    Total do projeto:{' '}
                    {formatCurrency(
                      entradaCartaoFinal + valorParcelaCartaoFinal * parcelasCartaoFinal,
                    )}
                  </span>
                </div>
              </div>

              {/* 3 Linhas comparativas inferiores */}
              <div className="pt-2.5 border-t border-gray-100 space-y-1 text-[10pt]">
                <div className="flex justify-between gap-1">
                  <span className="text-gray-500">Conta hoje:</span>
                  <span className="font-bold text-red-600 text-right">
                    {formatCurrency(contaAtualFinal)}
                  </span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-gray-500">Conta c/ solar:</span>
                  <span className="font-bold text-[#16a34a] text-right">
                    {formatCurrency(contaSolarCartao)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-100 font-bold text-gray-900 gap-1">
                  <span>Parcela + Conta:</span>
                  <span className="text-right">{formatCurrency(totalMensalCartao)}</span>
                </div>
              </div>
            </div>

            {/* CARD 3: FINANCIAMENTO A */}
            <div className="p-3.5 rounded-xl border border-[#60A5FA] bg-[#F0F9FF] flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-shadow min-w-0">
              <div>
                {/* Cabeçalho com título sem truncamento e badge de parcelas no canto superior direito */}
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span
                    className="font-extrabold text-[10pt] uppercase tracking-wider text-blue-950 break-words leading-tight"
                    title={nomeFinanciamentoA || 'Financiamento A'}
                  >
                    {nomeFinanciamentoA || 'Financiamento A'}
                  </span>
                  <span className="text-[10pt] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full shrink-0">
                    {parcelasFinanAFinal}x
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight mt-1">
                  {formatCurrency(valorParcelaFinanAFinal)}
                </div>
                {iofFinanciamentoA !== undefined &&
                  iofFinanciamentoA !== null &&
                  iofFinanciamentoA > 0 && (
                    <span className="block text-[10pt] font-semibold text-emerald-700 mt-1 leading-snug">
                      Inclui IOF de {formatCurrency(iofFinanciamentoA)}
                    </span>
                  )}
                <p className="text-[10pt] text-gray-500 mt-1 leading-snug">
                  {entradaFinanAFinal > 0 && (
                    <span className="block text-blue-900 font-semibold">
                      Entrada: {formatCurrency(entradaFinanAFinal)}
                    </span>
                  )}
                  Total:{' '}
                  {formatCurrency(
                    entradaFinanAFinal + valorParcelaFinanAFinal * parcelasFinanAFinal,
                  )}
                </p>
              </div>

              {/* 3 Linhas comparativas inferiores */}
              <div className="pt-2.5 border-t border-blue-200 space-y-1 text-[10pt]">
                <div className="flex justify-between gap-1">
                  <span className="text-gray-500">Conta hoje:</span>
                  <span className="font-bold text-red-600 text-right">
                    {formatCurrency(contaAtualFinal)}
                  </span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-gray-500">Conta c/ solar:</span>
                  <span className="font-bold text-[#16a34a] text-right">
                    {formatCurrency(contaSolarFinanA)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-blue-200 font-bold text-blue-950 gap-1">
                  <span>Parcela + Conta:</span>
                  <span className="text-right">{formatCurrency(totalMensalFinanA)}</span>
                </div>
              </div>
            </div>

            {/* CARD 4: FINANCIAMENTO B */}
            <div className="p-3.5 rounded-xl border border-[#60A5FA] bg-[#F0F9FF] flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-shadow min-w-0">
              <div>
                {/* Cabeçalho com título sem truncamento e badge de parcelas no canto superior direito */}
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span
                    className="font-extrabold text-[10pt] uppercase tracking-wider text-blue-950 break-words leading-tight"
                    title={nomeFinanciamentoB || 'Financiamento B'}
                  >
                    {nomeFinanciamentoB || 'Financiamento B'}
                  </span>
                  <span className="text-[10pt] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full shrink-0">
                    {parcelasFinanBFinal}x
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight mt-1">
                  {formatCurrency(valorParcelaFinanBFinal)}
                </div>
                {iofFinanciamentoB !== undefined &&
                  iofFinanciamentoB !== null &&
                  iofFinanciamentoB > 0 && (
                    <span className="block text-[10pt] font-semibold text-blue-800 mt-1 leading-snug">
                      Inclui IOF de {formatCurrency(iofFinanciamentoB)}
                    </span>
                  )}
                <p className="text-[10pt] text-gray-500 mt-1 leading-snug">
                  {entradaFinanBFinal > 0 && (
                    <span className="block text-blue-900 font-semibold">
                      Entrada: {formatCurrency(entradaFinanBFinal)}
                    </span>
                  )}
                  Total:{' '}
                  {formatCurrency(
                    entradaFinanBFinal + valorParcelaFinanBFinal * parcelasFinanBFinal,
                  )}
                </p>
              </div>

              {/* 3 Linhas comparativas inferiores */}
              <div className="pt-2.5 border-t border-blue-200 space-y-1 text-[10pt]">
                <div className="flex justify-between gap-1">
                  <span className="text-gray-500">Conta hoje:</span>
                  <span className="font-bold text-red-600 text-right">
                    {formatCurrency(contaAtualFinal)}
                  </span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-gray-500">Conta c/ solar:</span>
                  <span className="font-bold text-[#16a34a] text-right">
                    {formatCurrency(contaSolarFinanB)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-blue-200 font-bold text-blue-950 gap-1">
                  <span>Parcela + Conta:</span>
                  <span className="text-right">{formatCurrency(totalMensalFinanB)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2.1 PROJEÇÃO COM REAJUSTE TARIFÁRIO DE 9% AO ANO (CONCESSIONÁRIA)         */}
        {/* ========================================================================= */}
        <div className="p-4 bg-gradient-to-r from-amber-50/80 to-amber-100/50 rounded-xl border border-amber-300 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-950 uppercase tracking-wide">
            <TrendingUp className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Projeção com Reajuste Tarifário de 9% ao ano (Concessionária)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-3 rounded-lg border border-amber-200">
              <span className="text-[11px] text-gray-500 block">Conta daqui a 4 anos:</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-red-700 font-bold line-through">
                  {formatCurrency(contaSemSolar4AnosFinal)}
                </span>
                <span className="text-emerald-700 font-black text-sm">
                  {formatCurrency(contaComSolar4AnosFinal)} com solar
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-amber-200">
              <span className="text-[11px] text-gray-500 block">Conta daqui a 10 anos:</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-red-700 font-bold line-through">
                  {formatCurrency(contaSemSolar10AnosFinal)}
                </span>
                <span className="text-emerald-700 font-black text-sm">
                  {formatCurrency(contaComSolar10AnosFinal)} com solar
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. MINI-BLOCO DE PAYBACK ESTIMADO (ABAIXO DOS CARDS DE COND. DE PAGTO)    */}
        {/* ========================================================================= */}
        {exibirPaybackAbaixo && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50/60 via-amber-50/20 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
                <Clock className="w-5 h-5 text-amber-700 shrink-0" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300/80">
                    <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                    <span>Payback estimado</span>
                  </span>
                  <span className="text-xs font-semibold text-amber-900/85">
                    Quitação prevista: {infoPayback.quitacaoMesAno}
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                  Tempo estimado para que a economia gerada pague integralmente o investimento.
                </p>
              </div>
            </div>

            <div className="shrink-0 self-end sm:self-center bg-amber-100/90 border border-amber-300/80 px-3.5 py-1.5 rounded-xl">
              <span className="text-base sm:text-lg font-black text-amber-900 tracking-tight">
                {infoPayback.texto}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3.1 CARD DE CUSTO DE POSTERGAÇÃO (DESTAQUE ÂMBAR / LARANJA)               */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50/40 rounded-2xl p-4 sm:p-5 border-2 border-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-800 shrink-0" />
                  <span>Custo de Postergação</span>
                </span>
                <span className="text-xs font-bold text-amber-950">
                  Cada mês sem energia solar custa dinheiro
                </span>
              </div>
              <p className="text-xs text-gray-700 font-medium">
                Adiar a decisão significa continuar pagando a conta cheia para a concessionária sem
                construir patrimônio.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center bg-white border border-amber-300 px-4 py-2 rounded-xl text-right shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Valor perdido por mês
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-700 tracking-tight">
              {formatCurrency(custoPostergacaoFinal)}
              <span className="text-xs font-bold text-gray-500">/mês</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. BADGE DE URGÊNCIA NA PARTE INFERIOR                                    */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-100 animate-pulse" />
          </div>
          <div>
            <span className="text-xs uppercase font-black tracking-widest text-amber-100 block">
              Oportunidade por Tempo Limitado
            </span>
            <p className="text-sm sm:text-base font-extrabold text-white">
              Condições válidas por {diasValidadeFinal} dias.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. BLOCO CANÔNICO DE ASSINATURAS E APROVAÇÃO (2 COLUNAS)                 */}
        {/* ========================================================================= */}
        {(() => {
          const nomeClienteAssinatura = dadosCliente?.nome || nomeCliente || 'Cliente'
          const dataPropostaFormatada = dataOrcamento
            ? new Date(dataOrcamento).toLocaleDateString('pt-BR')
            : new Date().toLocaleDateString('pt-BR')

          const empRazaoSocial = dadosEmpresa?.razaoSocial ?? 'DELFOS ENGENHARIA LTDA'
          const empCnpj = dadosEmpresa?.cnpj ?? '21.379.952/0001-38'
          const empRespTecnico = dadosEmpresa?.responsavelTecnico ?? 'João Victor Bagetti Fuchs'
          const empCrea = dadosEmpresa?.crea ?? 'CREA RS151894'
          const empEndereco =
            dadosEmpresa?.endereco ?? 'Rua Espírito Santo, nº 275 – Centro, Erechim/RS'
          const empTelefone = dadosEmpresa?.telefone ?? '(54) 99129-2121'
          const empEmail = dadosEmpresa?.email ?? 'contato@delfos.eng.br'
          const empContato = [empTelefone, empEmail].filter(Boolean).join(' • ')

          const cliCpfCnpj = dadosCliente?.cpfOuCnpj || ''
          const cliEndereco = dadosCliente?.endereco
            ? `${dadosCliente.endereco}${dadosCliente?.municipio ? `, ${dadosCliente.municipio}` : ''}`
            : dadosCliente?.municipio || ''
          const cliContato = [dadosCliente?.telefone, dadosCliente?.email]
            .filter(Boolean)
            .join(' • ')

          return (
            <div className="pt-2 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coluna 1: EMPRESA CONTRATADA */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col justify-between">
                  {/* 1. Topo: Categoria e Local/Data */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-extrabold uppercase tracking-wider text-[#065F46] text-[11px]">
                      EMPRESA CONTRATADA
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Erechim / RS, {dataPropostaFormatada}
                    </span>
                  </div>

                  {/* Espaço generoso livre para assinatura à mão (~60px) */}
                  <div className="pt-16" />

                  {/* 2. Linha de assinatura */}
                  <div className="h-[1.5px] bg-gray-900 w-full" />

                  {/* 3. Nome de quem assina + subtítulo (espaçamento vertical confortável abaixo da linha) */}
                  <div className="text-center pt-2.5 pb-3 space-y-0.5">
                    <div className="text-sm font-black text-gray-900 uppercase tracking-wide">
                      {empRespTecnico}
                    </div>
                    <div className="text-[11px] font-bold text-[#065F46]">
                      Responsável Técnico{empCrea ? ` — ${empCrea}` : ''}
                    </div>
                  </div>

                  {/* 4. Divisor tracejado + Bloco de dados compactos */}
                  <div className="border-t border-dashed border-gray-300 pt-3 text-[11px] text-gray-600 space-y-1">
                    <div>
                      <strong className="text-gray-900 font-semibold">Razão Social:</strong>{' '}
                      {empRazaoSocial ? `${empRazaoSocial} (Delfos Solar)` : ''}
                    </div>
                    <div>
                      <strong className="text-gray-900 font-semibold">CNPJ:</strong> {empCnpj}
                    </div>
                    <div>
                      <strong className="text-gray-900 font-semibold">Resp. Técnico:</strong>{' '}
                      {empRespTecnico
                        ? empCrea
                          ? `${empRespTecnico} (${empCrea})`
                          : empRespTecnico
                        : ''}
                    </div>
                    <div>
                      <strong className="text-gray-900 font-semibold">Endereço:</strong>{' '}
                      {empEndereco}
                    </div>
                    <div>
                      <strong className="text-gray-900 font-semibold">Contato:</strong> {empContato}
                    </div>
                  </div>
                </div>

                {/* Coluna 2: CLIENTE / CONTRATANTE */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col justify-between">
                  {/* 1. Topo: Categoria e Local/Data */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-extrabold uppercase tracking-wider text-[#1E40AF] text-[11px]">
                      CLIENTE / CONTRATANTE
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Local e data: ______________________, ____/____/________
                    </span>
                  </div>

                  {/* Espaço generoso livre para assinatura à mão (~60px) */}
                  <div className="pt-16" />

                  {/* 2. Linha de assinatura */}
                  <div className="h-[1.5px] bg-gray-900 w-full" />

                  {/* 3. Nome do cliente + subtítulo (espaçamento vertical confortável abaixo da linha) */}
                  <div className="text-center pt-2.5 pb-3 space-y-0.5">
                    <div className="text-sm font-black text-gray-900 uppercase tracking-wide">
                      {nomeClienteAssinatura}
                    </div>
                    <div className="text-[11px] font-bold text-[#1E40AF]">
                      De acordo com as especificações e valores da proposta
                    </div>
                  </div>

                  {/* 4. Divisor tracejado + Bloco de dados compactos */}
                  <div className="border-t border-dashed border-gray-300 pt-3 text-[11px] text-gray-600 space-y-1">
                    <div>
                      <strong className="text-gray-900 font-semibold">Nome/Razão Social:</strong>{' '}
                      {nomeClienteAssinatura}
                    </div>
                    <div>
                      <strong className="text-gray-900 font-semibold">CPF/CNPJ:</strong>{' '}
                      {cliCpfCnpj}
                    </div>
                    <div>
                      <strong className="text-gray-900 font-semibold">Endereço:</strong>{' '}
                      {cliEndereco}
                    </div>
                    <div>
                      <strong className="text-gray-900 font-semibold">Contato:</strong> {cliContato}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </section>
  )
}

export default SecaoInvestimentoPagamento
