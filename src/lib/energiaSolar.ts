/**
 * Módulo de Cálculos e Simulações de Energia Solar Fotovoltaica
 * Base de irradiação solar e fatores sazonais calibrados para a região de Erechim/RS e Alto Uruguai Gaúcho.
 */

export type TipoClienteSolar = 'residencial' | 'comercial' | 'industrial' | 'rural'
export type TipoEstruturaSolar = 'ceramico' | 'metalico' | 'laje' | 'fibrocimento' | 'solo'
export type OrientacaoTelhadoSolar = 'leste' | 'oeste' | 'norte' | 'sul'
export type StatusOrcamentoSolar = 'Em elaboração' | 'Enviado ao cliente' | 'Aprovado' | 'Rejeitado'

export interface DadosCustosSolar {
  maoDeObra: number
  materiaisExtras: number
  freteGuincho: number
  subestacao: number
  terceirizacao: number
  administracao: number
  marketingCombustivel: number
  riscoEngenharia: number
  comissaoComercial: number
  indicacao: number
  impostos: number
}

export const CUSTOS_SOLAR_PADRAO: DadosCustosSolar = {
  maoDeObra: 0,
  materiaisExtras: 0,
  freteGuincho: 0,
  subestacao: 0,
  terceirizacao: 0,
  administracao: 0,
  marketingCombustivel: 0,
  riscoEngenharia: 0,
  comissaoComercial: 0,
  indicacao: 0,
  impostos: 0,
}

export interface GeracaoMensalItem {
  mesIndex: number // 0 a 11
  mesNome: string // Jan, Fev, ...
  dias: number
  irradiacaoHSP: number // Horas de Sol Pleno diárias médias (kWh/m²/dia)
  fatorSazonal: number // Proporção em relação à média anual
  geracaoKwh: number
}

export interface ParcelamentoItem {
  titulo: string
  descricao: string
  numeroParcelas: number
  taxaJurosMensal: number // em percentual, ex: 1.9
  valorParcela: number
  valorTotal: number
  contaSemSolar: number
  contaComSolar: number
  desembolsoMensal: number // Parcela + Conta com solar
  economiaMensalLiquida: number // Conta sem solar - desembolso
}

export interface CalculosSolarResultado {
  // Geração
  geracaoAnualEstimadaKwh: number
  geracaoMediaMensalKwh: number
  geracaoMensalDetalhada: GeracaoMensalItem[]

  // Custos do projeto
  valorTotalCustos: number
  valorInvestimento: number // Valor final do projeto (base payback)
  custoPorKwpInstalado: number

  // Contas de energia
  contaAtualSemSolarMes: number
  contaAtualSemSolarAno: number
  contaPrimeiroMesComSolar: number
  tarifaEfetiva: number
  taxaMinimaDisponibilidadeKwh: number
  taxaMinimaDisponibilidadeReais: number

  // Projeção sem solar com reajuste de 9% ao ano
  gastoSemSolar1Ano: number
  gastoSemSolar5Anos: number
  gastoSemSolar10Anos: number
  gastoSemSolar25Anos: number

  // Economia acumulada com solar
  economia1Mes: number
  economia1Ano: number
  economia5Anos: number
  economia10Anos: number
  economia25Anos: number

  // Contas futuras com reajuste de 9%
  reajusteAnualPercentual: number // 9%
  contaSemSolar4AnosComReajuste: number
  contaComSolar4AnosComReajuste: number
  contaSemSolar10AnosComReajuste: number
  contaComSolar10AnosComReajuste: number

  // Payback
  paybackMeses: number
  paybackAnos: number

  // Parcelamentos
  parcelamentos: {
    aVista: ParcelamentoItem
    cartao18x: ParcelamentoItem
    financiamentoBanco1: ParcelamentoItem // até 60x a 1,9% a.m.
    financiamentoBanco2: ParcelamentoItem // menor taxa a 0,99% a.m.
  }
}

/**
 * Fatores de irradiação solar e HSP diários (Horas de Sol Pleno - kWh/m²/dia)
 * Mapeados para latitude ~ -27.63° (Erechim - RS, Norte Gaúcho)
 * Considera dias do mês e variação sazonal verão/inverno no Sul do Brasil.
 */
export const DADOS_CLIMATICOS_ERECHIM: Array<{
  mes: string
  dias: number
  hspDiario: number // kWh/m²/dia
}> = [
  { mes: 'Janeiro', dias: 31, hspDiario: 5.65 },
  { mes: 'Fevereiro', dias: 28, hspDiario: 5.35 },
  { mes: 'Março', dias: 31, hspDiario: 4.8 },
  { mes: 'Abril', dias: 30, hspDiario: 4.05 },
  { mes: 'Maio', dias: 31, hspDiario: 3.25 },
  { mes: 'Junho', dias: 30, hspDiario: 2.95 },
  { mes: 'Julho', dias: 31, hspDiario: 3.15 },
  { mes: 'Agosto', dias: 31, hspDiario: 3.9 },
  { mes: 'Setembro', dias: 30, hspDiario: 4.25 },
  { mes: 'Outubro', dias: 31, hspDiario: 4.95 },
  { mes: 'Novembro', dias: 30, hspDiario: 5.6 },
  { mes: 'Dezembro', dias: 31, hspDiario: 5.85 },
]

// Taxa média de Performance Ratio (PR) típica de sistemas bem dimensionados em telhados
export const DEFAULT_PERFORMANCE_RATIO = 0.8 // 80% considerando perdas térmicas, cabos, sujeira e inversor

// Fatores de orientação
export const FATORES_ORIENTACAO: Record<OrientacaoTelhadoSolar, number> = {
  norte: 1.0, // Ideal no hemisfério Sul
  leste: 0.92, // ~8% de perda comparado ao norte
  oeste: 0.91, // ~9% de perda comparado ao norte
  sul: 0.75, // Perda significativa no hemisfério sul
}

// Custo de disponibilidade (taxa mínima em kWh conforme tipo de ligação típica ou classe)
export function getTaxaMinimaKwh(tipoCliente: TipoClienteSolar): number {
  switch (tipoCliente) {
    case 'residencial':
      return 30 // Monofásico típico (30) a bifásico (50)
    case 'comercial':
      return 100 // Trifásico
    case 'industrial':
      return 100
    case 'rural':
      return 50 // Bifásico rural
    default:
      return 50
  }
}

/**
 * Cálculo da prestação pela Tabela Price (amortização francesa com juros compostos)
 * PMT = PV * ( i * (1 + i)^n ) / ( (1 + i)^n - 1 )
 */
export function calcularParcelaPrice(
  valorPresente: number,
  taxaMensalPct: number,
  nMeses: number,
): number {
  if (valorPresente <= 0 || nMeses <= 0) return 0
  if (taxaMensalPct <= 0) return valorPresente / nMeses

  const i = taxaMensalPct / 100
  const fator = Math.pow(1 + i, nMeses)
  const parcela = (valorPresente * (i * fator)) / (fator - 1)
  return parcela
}

/**
 * Soma dos custos diretos preenchidos na aba de custos
 */
export function somarCustosSolar(custos: Partial<DadosCustosSolar> = {}): number {
  const c = { ...CUSTOS_SOLAR_PADRAO, ...custos }
  return (
    Number(c.maoDeObra || 0) +
    Number(c.materiaisExtras || 0) +
    Number(c.freteGuincho || 0) +
    Number(c.subestacao || 0) +
    Number(c.terceirizacao || 0) +
    Number(c.administracao || 0) +
    Number(c.marketingCombustivel || 0) +
    Number(c.riscoEngenharia || 0) +
    Number(c.comissaoComercial || 0) +
    Number(c.indicacao || 0) +
    Number(c.impostos || 0)
  )
}

export interface InputCalculoSolar {
  consumoKwhMes: number
  tipoCliente: TipoClienteSolar
  tarifaKwh: number
  potenciaKwp: number
  orientacaoTelhado?: OrientacaoTelhadoSolar
  custos?: Partial<DadosCustosSolar>
  valorInvestimentoInformado?: number
}

/**
 * Motor de cálculos solares completo para orçamentos da Delfos Solar
 */
export function calcularOrcamentoSolar(input: InputCalculoSolar): CalculosSolarResultado {
  const consumoKwhMes = Math.max(0, Number(input.consumoKwhMes) || 0)
  const tarifaKwh = Math.max(0.01, Number(input.tarifaKwh) || 0.95)
  const potenciaKwp = Math.max(0, Number(input.potenciaKwp) || 0)
  const tipoCliente = input.tipoCliente || 'residencial'
  const orientacao = input.orientacaoTelhado || 'norte'
  const fatorOrientacao = FATORES_ORIENTACAO[orientacao] || 1.0

  // 1. Custos e Investimento
  const valorTotalCustos = somarCustosSolar(input.custos)
  const valorInvestimento =
    input.valorInvestimentoInformado && input.valorInvestimentoInformado > 0
      ? input.valorInvestimentoInformado
      : valorTotalCustos > 0
        ? valorTotalCustos
        : potenciaKwp > 0
          ? Math.round(potenciaKwp * 3800) // estimativa padrão de mercado R$ 3.800/kWp se nada for informado
          : 0

  const custoPorKwpInstalado = potenciaKwp > 0 ? valorInvestimento / potenciaKwp : 0

  // 2. Geração Mês a Mês (Erechim/RS)
  const pr = DEFAULT_PERFORMANCE_RATIO * fatorOrientacao
  let geracaoAnualTotal = 0

  const geracaoMensalDetalhada: GeracaoMensalItem[] = DADOS_CLIMATICOS_ERECHIM.map(
    (mesData, index) => {
      // Geração mensal = Potência(kWp) * HSP diário * dias * PR
      const geracaoMes = Math.round(potenciaKwp * mesData.hspDiario * mesData.dias * pr)
      geracaoAnualTotal += geracaoMes
      return {
        mesIndex: index,
        mesNome: mesData.mes.slice(0, 3),
        dias: mesData.dias,
        irradiacaoHSP: mesData.hspDiario,
        fatorSazonal: 1, // ajustado logo abaixo
        geracaoKwh: geracaoMes,
      }
    },
  )

  const geracaoMediaMensalKwh =
    geracaoMensalDetalhada.length > 0 ? Math.round(geracaoAnualTotal / 12) : 0

  // Atualizar fator sazonal relativo à média
  geracaoMensalDetalhada.forEach((item) => {
    item.fatorSazonal =
      geracaoMediaMensalKwh > 0 ? Number((item.geracaoKwh / geracaoMediaMensalKwh).toFixed(2)) : 1
  })

  // 3. Contas de Energia
  const taxaMinimaKwh = getTaxaMinimaKwh(tipoCliente)
  const taxaMinimaReais = taxaMinimaKwh * tarifaKwh

  // Conta atual sem solar: consumo total * tarifa
  const contaAtualSemSolarMes = consumoKwhMes * tarifaKwh
  const contaAtualSemSolarAno = contaAtualSemSolarMes * 12

  // Conta após instalar solar:
  // Se a geração cobrir o consumo, o cliente paga apenas o custo de disponibilidade (taxa mínima)
  // + iluminação pública típica (~R$ 25 a R$ 35, usamos taxa mínima como piso regulatório)
  const energiaNaoCompensadaKwh = Math.max(0, consumoKwhMes - geracaoMediaMensalKwh)
  const contaPrimeiroMesComSolar = Math.max(
    taxaMinimaReais,
    energiaNaoCompensadaKwh * tarifaKwh + taxaMinimaReais * 0.3, // taxa mínima / iluminação
  )

  // Economia mensal no primeiro mês
  const economia1Mes = Math.max(0, contaAtualSemSolarMes - contaPrimeiroMesComSolar)
  const economia1Ano = economia1Mes * 12

  // 4. Projeções com Reajuste Tarifário Anual de 9% ao ano
  const REAJUSTE_ANUAL = 0.09 // 9% a.a.

  // Sem solar: somatório de (contaAnual * (1 + reajuste)^ano)
  function calcularGastoAcumulado(anos: number, baseAnual: number): number {
    let acumulado = 0
    for (let ano = 0; ano < anos; ano++) {
      acumulado += baseAnual * Math.pow(1 + REAJUSTE_ANUAL, ano)
    }
    return acumulado
  }

  // Economia acumulada com solar:
  // Economia anual indexada pelo reajuste da tarifa menos a perda leve de degradação anual de 0.6%
  function calcularEconomiaAcumulada(anos: number, economiaBaseAnual: number): number {
    let acumulado = 0
    for (let ano = 0; ano < anos; ano++) {
      const fatorTarifa = Math.pow(1 + REAJUSTE_ANUAL, ano)
      const fatorDegradacao = Math.pow(1 - 0.006, ano) // 0.6% de degradação anual dos módulos
      acumulado += economiaBaseAnual * fatorTarifa * fatorDegradacao
    }
    return acumulado
  }

  const gastoSemSolar1Ano = contaAtualSemSolarAno
  const gastoSemSolar5Anos = calcularGastoAcumulado(5, contaAtualSemSolarAno)
  const gastoSemSolar10Anos = calcularGastoAcumulado(10, contaAtualSemSolarAno)
  const gastoSemSolar25Anos = calcularGastoAcumulado(25, contaAtualSemSolarAno)

  const economia5Anos = calcularEconomiaAcumulada(5, economia1Ano)
  const economia10Anos = calcularEconomiaAcumulada(10, economia1Ano)
  const economia25Anos = calcularEconomiaAcumulada(25, economia1Ano)

  // Valores de contas futuras reajustadas (mês)
  // Daqui a 4 anos: tarifa = tarifa * (1 + 0.09)^4
  const fatorReajuste4Anos = Math.pow(1 + REAJUSTE_ANUAL, 4)
  const fatorReajuste10Anos = Math.pow(1 + REAJUSTE_ANUAL, 10)

  const contaSemSolar4AnosComReajuste = contaAtualSemSolarMes * fatorReajuste4Anos
  const contaComSolar4AnosComReajuste = contaPrimeiroMesComSolar * fatorReajuste4Anos

  const contaSemSolar10AnosComReajuste = contaAtualSemSolarMes * fatorReajuste10Anos
  const contaComSolar10AnosComReajuste = contaPrimeiroMesComSolar * fatorReajuste10Anos

  // 5. Payback (em meses)
  // Payback simples dinâmico considerando a economia mensal inicial
  let paybackMeses = 0
  if (valorInvestimento > 0 && economia1Mes > 0) {
    let saldoInvestimento = valorInvestimento
    let mes = 0
    while (saldoInvestimento > 0 && mes < 300) {
      mes++
      const anoAtual = Math.floor(mes / 12)
      const economiaDoMes = economia1Mes * Math.pow(1 + REAJUSTE_ANUAL, anoAtual)
      saldoInvestimento -= economiaDoMes
    }
    paybackMeses = mes
  }
  const paybackAnos = Number((paybackMeses / 12).toFixed(1))

  // 6. Parcelamentos (4 Opções solicitadas):
  // 1) À vista
  const aVista: ParcelamentoItem = {
    titulo: 'À Vista',
    descricao: 'Investimento total sem juros',
    numeroParcelas: 1,
    taxaJurosMensal: 0,
    valorParcela: valorInvestimento,
    valorTotal: valorInvestimento,
    contaSemSolar: contaAtualSemSolarMes,
    contaComSolar: contaPrimeiroMesComSolar,
    desembolsoMensal: contaPrimeiroMesComSolar,
    economiaMensalLiquida: economia1Mes,
  }

  // 2) Cartão de crédito em 18 vezes com juros típicos (ex: 1.49% a.m.)
  const taxaCartao18x = 1.49
  const parcelaCartao18x = calcularParcelaPrice(valorInvestimento, taxaCartao18x, 18)
  const cartao18x: ParcelamentoItem = {
    titulo: 'Cartão de Crédito 18x',
    descricao: '18x no cartão de crédito',
    numeroParcelas: 18,
    taxaJurosMensal: taxaCartao18x,
    valorParcela: parcelaCartao18x,
    valorTotal: parcelaCartao18x * 18,
    contaSemSolar: contaAtualSemSolarMes,
    contaComSolar: contaPrimeiroMesComSolar,
    desembolsoMensal: parcelaCartao18x + contaPrimeiroMesComSolar,
    economiaMensalLiquida: contaAtualSemSolarMes - (parcelaCartao18x + contaPrimeiroMesComSolar),
  }

  // 3) Financiamento Banco 1: em até 60 vezes com juros de 1,9% ao mês
  const taxaFinancBanco1 = 1.9
  const parcelaFinancBanco1 = calcularParcelaPrice(valorInvestimento, taxaFinancBanco1, 60)
  const financiamentoBanco1: ParcelamentoItem = {
    titulo: 'Financiamento Banco 1',
    descricao: 'Até 60x com juros de 1,9% a.m.',
    numeroParcelas: 60,
    taxaJurosMensal: taxaFinancBanco1,
    valorParcela: parcelaFinancBanco1,
    valorTotal: parcelaFinancBanco1 * 60,
    contaSemSolar: contaAtualSemSolarMes,
    contaComSolar: contaPrimeiroMesComSolar,
    desembolsoMensal: parcelaFinancBanco1 + contaPrimeiroMesComSolar,
    economiaMensalLiquida: contaAtualSemSolarMes - (parcelaFinancBanco1 + contaPrimeiroMesComSolar),
  }

  // 4) Financiamento Banco 2: parcela menor com juros de 0,99% ao mês (ex: 60x a 0,99% a.m. cooperativas/linhas verdes)
  const taxaFinancBanco2 = 0.99
  const parcelaFinancBanco2 = calcularParcelaPrice(valorInvestimento, taxaFinancBanco2, 60)
  const financiamentoBanco2: ParcelamentoItem = {
    titulo: 'Financiamento Banco 2',
    descricao: 'Até 60x com juros reduzidos de 0,99% a.m.',
    numeroParcelas: 60,
    taxaJurosMensal: taxaFinancBanco2,
    valorParcela: parcelaFinancBanco2,
    valorTotal: parcelaFinancBanco2 * 60,
    contaSemSolar: contaAtualSemSolarMes,
    contaComSolar: contaPrimeiroMesComSolar,
    desembolsoMensal: parcelaFinancBanco2 + contaPrimeiroMesComSolar,
    economiaMensalLiquida: contaAtualSemSolarMes - (parcelaFinancBanco2 + contaPrimeiroMesComSolar),
  }

  return {
    geracaoAnualEstimadaKwh: geracaoAnualTotal,
    geracaoMediaMensalKwh,
    geracaoMensalDetalhada,
    valorTotalCustos,
    valorInvestimento,
    custoPorKwpInstalado,
    contaAtualSemSolarMes,
    contaAtualSemSolarAno,
    contaPrimeiroMesComSolar,
    tarifaEfetiva: tarifaKwh,
    taxaMinimaDisponibilidadeKwh: taxaMinimaKwh,
    taxaMinimaDisponibilidadeReais: taxaMinimaReais,
    gastoSemSolar1Ano,
    gastoSemSolar5Anos,
    gastoSemSolar10Anos,
    gastoSemSolar25Anos,
    economia1Mes,
    economia1Ano,
    economia5Anos,
    economia10Anos,
    economia25Anos,
    reajusteAnualPercentual: 9,
    contaSemSolar4AnosComReajuste,
    contaComSolar4AnosComReajuste,
    contaSemSolar10AnosComReajuste,
    contaComSolar10AnosComReajuste,
    paybackMeses,
    paybackAnos,
    parcelamentos: {
      aVista,
      cartao18x,
      financiamentoBanco1,
      financiamentoBanco2,
    },
  }
}
