/**
 * Módulo de Cálculos e Simulações de Energia Solar Fotovoltaica
 * Base de irradiação solar e fatores sazonais calibrados para a região de Erechim/RS e Alto Uruguai Gaúcho.
 */

import type { PadraoFasesSolar } from '../types/crm'

export type TipoClienteSolar = 'residencial' | 'comercial' | 'industrial' | 'rural'
export type TipoEstruturaSolar = 'ceramico' | 'metalico' | 'laje' | 'fibrocimento' | 'solo'
export type OrientacaoTelhadoSolar = 'leste' | 'oeste' | 'norte' | 'sul'
export type StatusOrcamentoSolar = 'Em elaboração' | 'Enviado ao cliente' | 'Aprovado' | 'Rejeitado'

export interface DadosCustosSolar {
  maoDeObra: number
  materiaisEquipamentos: number
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
  valorPorPlaca?: number
  opcaoImposto?: 1 | 2
  desconto?: number
}

export const CUSTOS_SOLAR_PADRAO: DadosCustosSolar = {
  maoDeObra: 0,
  materiaisEquipamentos: 0,
  materiaisExtras: 0,
  freteGuincho: 0,
  subestacao: 0,
  terceirizacao: 0,
  administracao: 0,
  marketingCombustivel: 0,
  riscoEngenharia: 400, // Risco de engenharia: preencher com valor padrão de R$ 400
  comissaoComercial: 0,
  indicacao: 0,
  impostos: 0,
  valorPorPlaca: 0,
  opcaoImposto: 1,
  desconto: 0,
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
  valorEntrada?: number // Valor de entrada opcional (abatido do principal)
  valorFinanciado?: number // Valor efetivamente financiado (valorInvestimento - valorEntrada)
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
  gastoSemSolarPaybackAnos?: number
  anosPaybackArredondado?: number
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

export const REAJUSTE_ANUAL_PADRAO = 0.09 // 9% a.a.

/**
 * Calcula o gasto acumulado sem energia solar ao longo de um número inteiro de anos,
 * considerando a taxa anual de reajuste tarifário (juros compostos por ano).
 * Fórmula: sum_{ano=0}^{anos-1} baseAnual * (1 + taxa)^ano
 */
export function calcularGastoAcumuladoSemSolar(
  anos: number,
  baseAnual: number,
  taxaReajusteAnual: number = REAJUSTE_ANUAL_PADRAO,
): number {
  const anosFinal = Math.max(0, Math.round(anos))
  if (anosFinal === 0 || baseAnual <= 0) return 0
  let acumulado = 0
  for (let ano = 0; ano < anosFinal; ano++) {
    acumulado += baseAnual * Math.pow(1 + taxaReajusteAnual, ano)
  }
  return Math.round(acumulado)
}

/**
 * Calcula os anos de payback arredondados para cima até fechar um ano inteiro.
 * Exemplo: 22 meses -> 2 anos; 25 meses -> 3 anos; 12 meses -> 1 ano; 0/inválido -> 5 anos (fallback).
 */
export function calcularAnosPaybackArredondado(
  paybackMeses?: number | null,
  valorInvestimento?: number | null,
  economiaMensal?: number | null,
): number {
  if (
    paybackMeses !== undefined &&
    paybackMeses !== null &&
    Number.isFinite(paybackMeses) &&
    paybackMeses > 0
  ) {
    return Math.max(1, Math.ceil(paybackMeses / 12))
  }
  const invest = Number(valorInvestimento) || 0
  const eco = Number(economiaMensal) || 0
  if (invest > 0 && eco > 0) {
    const meses = invest / eco
    return Math.max(1, Math.ceil(meses / 12))
  }
  return 5 // Fallback padrão
}

// Taxa média de Performance Ratio (PR) típica de sistemas bem dimensionados em telhados
export const DEFAULT_PERFORMANCE_RATIO = 0.8 // 80% considerando perdas térmicas, cabos, sujeira e inversor

// Fatores de orientação
export const FATORES_ORIENTACAO: Record<OrientacaoTelhadoSolar, number> = {
  norte: 1.0, // Ideal no hemisfério Sul
  leste: 0.92, // ~8% de perda comparado ao norte
  oeste: 0.91, // ~9% de perda comparado ao norte
  sul: 0.75, // Perda significativa no hemisfério sul
}

/**
 * Fatores de produtividade anual calibrados por orientação de telhado (kWh gerados por kWp instalado por ano).
 * Calibração baseada nos dados do usuário: sistema de 7,32 kWp produzindo:
 * - Norte: 9459 kWh/ano  => 9459 / 7.32 ≈ 1292.213 kWh/kWp/ano
 * - Oeste: 8894 kWh/ano  => 8894 / 7.32 ≈ 1215.027 kWh/kWp/ano
 * - Leste: 8894 kWh/ano  => 8894 / 7.32 ≈ 1215.027 kWh/kWp/ano
 * - Sul:   8224 kWh/ano  => 8224 / 7.32 ≈ 1123.497 kWh/kWp/ano
 */
export const FATORES_GERACAO_ANUAL_KWP: Record<OrientacaoTelhadoSolar, number> = {
  norte: 9459 / 7.32, // ≈ 1292.2131
  oeste: 8894 / 7.32, // ≈ 1215.0273
  leste: 8894 / 7.32, // ≈ 1215.0273
  sul: 8224 / 7.32, // ≈ 1123.4973
}

export interface DimensionamentoGeracaoResultado {
  geracaoPretendidaKwhAno: number
  orientacao: OrientacaoTelhadoSolar
  fatorKwhPorKwpAno: number
  potenciaKwpNecessaria: number
  numeroPlacasSugerido: number
  potenciaPlacaWp: number
}

/**
 * Dimensionamento automático de kWp e número de placas a partir da geração pretendida em kWh/ano.
 * Fórmula: kWp necessário = geração pretendida (kWh/ano) ÷ fator da orientação escolhida.
 * Placas sugeridas = Math.ceil(kWp × 1000 ÷ potenciaPlacaWp)
 */
export function dimensionarSistemaPorGeracaoPretendida(
  geracaoPretendidaKwhAno: number,
  orientacao: OrientacaoTelhadoSolar = 'norte',
  potenciaPlacaWp: number = 550,
): DimensionamentoGeracaoResultado | null {
  const geracao = Math.max(0, Number(geracaoPretendidaKwhAno) || 0)
  if (geracao <= 0) return null

  const fator = FATORES_GERACAO_ANUAL_KWP[orientacao] || FATORES_GERACAO_ANUAL_KWP.norte
  const kwpExato = geracao / fator
  const kwpArredondado = Number((Math.round(kwpExato * 100) / 100).toFixed(2))

  const wpPlaca = Math.max(100, Number(potenciaPlacaWp) || 550)
  const placas = Math.max(1, Math.ceil((kwpArredondado * 1000) / wpPlaca))

  return {
    geracaoPretendidaKwhAno: geracao,
    orientacao,
    fatorKwhPorKwpAno: Number(fator.toFixed(1)),
    potenciaKwpNecessaria: kwpArredondado,
    numeroPlacasSugerido: placas,
    potenciaPlacaWp: wpPlaca,
  }
}

// Custo de disponibilidade (taxa mínima em kWh conforme tipo de ligação por fases ANEEL RN 1.000/2021 ou classe de cliente)
export function getTaxaMinimaKwh(
  tipoCliente?: TipoClienteSolar | string,
  padraoFases?: PadraoFasesSolar | string,
): number {
  if (padraoFases) {
    const raw = String(padraoFases)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
    if (raw.includes('mono') || raw === '1' || raw === '1f') {
      return 30
    }
    if (raw.includes('bi') || raw === '2' || raw === '2f') {
      return 50
    }
    if (raw.includes('tri') || raw === '3' || raw === '3f') {
      return 100
    }
  }

  switch (tipoCliente) {
    case 'residencial':
      return 30 // Monofásico típico
    case 'comercial':
      return 100 // Trifásico
    case 'industrial':
      return 100
    case 'rural':
      return 50 // Bifásico rural
    default:
      return 30
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
    Number(c.materiaisEquipamentos || 0) +
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

/**
 * Formação de Preço na Aba de Custos conforme planilha Delfos Solar:
 * 1. Mão de obra de instalação = número de placas * valor por placa (editável)
 * 2. Administração = 15% do total do projeto (depois dos impostos)
 * 3. Comissão comercial = 3% do total do projeto com piso de R$ 600
 * 4. Indicação = 1% do total do projeto
 * 5. Impostos:
 *    - Opção 1: 9,23% sobre o total do projeto
 *    - Opção 2: 16% sobre (total do projeto - materiais/equipamentos)
 * 6. Risco de engenharia = padrão R$ 400 (editável)
 * Total do projeto = Base + Impostos + Administração + Comissão + Indicação (soma exata)
 */
export interface ParametrosCalculoCustosAba {
  materiais?: number
  materiaisEquipamentos?: number
  materiaisExtras?: number
  maoDeObra: number
  riscoEngenharia: number
  freteGuincho?: number
  subestacao?: number
  terceirizacao?: number
  marketingCombustivel?: number
  opcaoImposto: 1 | 2
  desconto?: number
  descontoPercentual?: number
  manualAdministracao?: boolean
  valorManualAdministracao?: number
  manualComissao?: boolean
  valorManualComissao?: number
  manualIndicacao?: boolean
  valorManualIndicacao?: number
}

export interface ResultadoCalculoCustosAba {
  impostos: number
  somaComImpostos: number // soma dos itens diretos + impostos (sem deduzir desconto)
  baseComDesconto: number // base líquida (somaComImpostos - desconto)
  desconto: number
  percentualDescontoProjeto: number // percentual que o desconto representa sobre o valor total do projeto (0 a 100)
  administracao: number // 15% do total do projeto (ou reduzido proporcionalmente por desconto, ou valor manual)
  administracaoSemDesconto: number
  administracaoDescontada: number
  manualAdministracao: boolean
  comissaoComercial: number // 3% do total (com piso de R$ 600), com redução de desconto mantendo piso se couber (ou manual)
  comissaoPura3Pct: number
  comissaoSemDesconto: number
  comissaoDescontada: number
  comissaoUsouPisoMinimo: boolean
  manualComissao: boolean
  indicacao: number // 1% do total (ou reduzido proporcionalmente por desconto, ou valor manual)
  indicacaoSemDesconto: number
  indicacaoDescontada: number
  manualIndicacao: boolean
  valorTotal: number
}

export function calcularCustosAba(params: ParametrosCalculoCustosAba): ResultadoCalculoCustosAba {
  // Se informados materiaisEquipamentos ou materiaisExtras, sua soma compõe os materiais totais.
  // Caso contrário, usa o campo legado materiais.
  const materiaisEquip = Math.max(0, Number(params.materiaisEquipamentos) || 0)
  const matExtras = Math.max(0, Number(params.materiaisExtras) || 0)
  const materiaisLegado = Math.max(0, Number(params.materiais) || 0)
  const materiais =
    params.materiaisEquipamentos !== undefined || params.materiaisExtras !== undefined
      ? materiaisEquip + matExtras
      : materiaisLegado

  const maoDeObra = Math.max(0, Number(params.maoDeObra) || 0)
  const risco = Math.max(0, Number(params.riscoEngenharia) || 0)
  const frete = Math.max(0, Number(params.freteGuincho) || 0)
  const subestacao = Math.max(0, Number(params.subestacao) || 0)
  const terceirizacao = Math.max(0, Number(params.terceirizacao) || 0)
  const marketing = Math.max(0, Number(params.marketingCombustivel) || 0)

  // Subtotal base (itens diretos sem impostos, administração, comissão e indicação)
  const subtotalBase =
    materiais + maoDeObra + risco + frete + subestacao + terceirizacao + marketing

  // Na Opção 2 da planilha, a base de dedução de materiais é estritamente Materiais/Equipamentos (se informado)
  // Caso não informado, utiliza materiais totais como fallback.
  const materiaisDeduziveisImposto =
    params.materiaisEquipamentos !== undefined && Number(params.materiaisEquipamentos) > 0
      ? materiaisEquip
      : materiais

  const manualAdmin = Boolean(params.manualAdministracao)
  const manualComiss = Boolean(params.manualComissao)
  const manualInd = Boolean(params.manualIndicacao)

  const valManualAdmin = manualAdmin ? Math.max(0, Number(params.valorManualAdministracao) || 0) : 0
  const valManualComiss = manualComiss ? Math.max(0, Number(params.valorManualComissao) || 0) : 0
  const valManualInd = manualInd ? Math.max(0, Number(params.valorManualIndicacao) || 0) : 0

  // Frações dinâmicas de cada item sobre o Total (quando em modo automático)
  const fAdmin = manualAdmin ? 0 : 0.15
  const fInd = manualInd ? 0 : 0.01

  // Alíquota de imposto sobre Total (tImposto) e termo independente do imposto (constImposto)
  // Opção 1: Imposto = 0.0923 * Total
  // Opção 2: Imposto = 0.16 * (Total - Mat) = 0.16 * Total - 0.16 * Mat
  const tImposto = params.opcaoImposto === 1 ? 0.0923 : 0.16
  const constImposto = params.opcaoImposto === 1 ? 0 : -0.16 * materiaisDeduziveisImposto

  // Termo fixo que entra no numerador da equação do Total:
  // Base direta + constImposto + valores manuais informados
  const termoFixoBase = subtotalBase + constImposto + valManualAdmin + valManualInd

  let valorTotal = 0
  let impostos = 0
  let administracaoSemDesconto = 0
  let comissaoSemDesconto = 0
  let comissaoPura3Pct = 0
  let comissaoUsouPisoMinimo = false
  let indicacaoSemDesconto = 0

  if (subtotalBase > 0) {
    if (manualComiss) {
      // Comissão é valor manual fixo
      const termoFixoTotal = termoFixoBase + valManualComiss
      const denominador = 1 - tImposto - fAdmin - fInd
      valorTotal = denominador > 0 ? termoFixoTotal / denominador : termoFixoTotal
      comissaoSemDesconto = valManualComiss
      comissaoPura3Pct = valorTotal * 0.03
      comissaoUsouPisoMinimo = false
    } else {
      // Comissão é automática: pode ser piso R$ 600 ou 3% do Total
      // Hipótese 1: Comissão = R$ 600 (piso)
      const termoFixoPiso = termoFixoBase + 600
      const denPiso = 1 - tImposto - fAdmin - fInd
      const totalComPiso = denPiso > 0 ? termoFixoPiso / denPiso : termoFixoPiso
      const comissao3Pct = totalComPiso * 0.03

      if (comissao3Pct <= 600) {
        valorTotal = totalComPiso
        comissaoSemDesconto = 600
        comissaoPura3Pct = comissao3Pct
        comissaoUsouPisoMinimo = true
      } else {
        // Hipótese 2: Comissão = 3% sobre Total
        const den3Pct = 1 - tImposto - fAdmin - 0.03 - fInd
        valorTotal = den3Pct > 0 ? termoFixoBase / den3Pct : termoFixoBase
        comissaoPura3Pct = valorTotal * 0.03
        comissaoSemDesconto = comissaoPura3Pct
        comissaoUsouPisoMinimo = false
      }
    }

    if (params.opcaoImposto === 1) {
      impostos = valorTotal * 0.0923
    } else {
      impostos = Math.max(0, (valorTotal - materiaisDeduziveisImposto) * 0.16)
    }

    administracaoSemDesconto = manualAdmin ? valManualAdmin : valorTotal * 0.15
    indicacaoSemDesconto = manualInd ? valManualInd : valorTotal * 0.01
  }

  // Desconto sobre o total do projeto:
  let desconto = 0
  let percentualDescontoProjeto = 0

  if (params.descontoPercentual !== undefined && params.descontoPercentual !== null) {
    percentualDescontoProjeto = Math.max(0, Number(params.descontoPercentual) || 0)
    desconto = valorTotal > 0 ? (valorTotal * percentualDescontoProjeto) / 100 : 0
  } else {
    desconto = Math.max(0, Number(params.desconto) || 0)
    percentualDescontoProjeto = valorTotal > 0 && desconto > 0 ? (desconto / valorTotal) * 100 : 0
  }

  // Redução proporcional pelo desconto:
  // Aplica sobre os campos em modo AUTOMÁTICO (alíquotas variáveis: 15%, 3% se acima do piso, 1%).
  // Campos em modo manual são valores fixos definidos pelo usuário e não sofrem redução de alíquota proporcional.
  // Caso todos estejam em modo manual, a taxa variável é 0.
  const taxaAdminAuto = manualAdmin ? 0 : 0.15
  const taxaComissaoAuto = manualComiss || comissaoUsouPisoMinimo ? 0 : 0.03
  const taxaIndicacaoAuto = manualInd ? 0 : 0.01

  const somaTaxasVariaveis = taxaAdminAuto + taxaComissaoAuto + taxaIndicacaoAuto

  const proporcaoAdmin = somaTaxasVariaveis > 0 ? taxaAdminAuto / somaTaxasVariaveis : 0
  const proporcaoComissao = somaTaxasVariaveis > 0 ? taxaComissaoAuto / somaTaxasVariaveis : 0
  const proporcaoIndicacao = somaTaxasVariaveis > 0 ? taxaIndicacaoAuto / somaTaxasVariaveis : 0

  const reducaoAdmin = desconto * proporcaoAdmin
  const reducaoComissao = desconto * proporcaoComissao
  const reducaoIndicacao = desconto * proporcaoIndicacao

  const administracao = Math.max(0, administracaoSemDesconto - reducaoAdmin)
  const administracaoDescontada = Math.max(0, administracaoSemDesconto - administracao)

  let comissaoComercial = Math.max(0, comissaoSemDesconto - reducaoComissao)
  if (!manualComiss && subtotalBase > 0 && comissaoComercial < 600) {
    comissaoComercial = 600
  }
  const comissaoDescontada = Math.max(0, comissaoSemDesconto - comissaoComercial)

  const indicacao = Math.max(0, indicacaoSemDesconto - reducaoIndicacao)
  const indicacaoDescontada = Math.max(0, indicacaoSemDesconto - indicacao)

  const somaComImpostos = subtotalBase + impostos
  const baseComDesconto = Math.max(0, somaComImpostos - desconto)

  return {
    impostos: Math.round(impostos * 100) / 100,
    somaComImpostos: Math.round(somaComImpostos * 100) / 100,
    baseComDesconto: Math.round(baseComDesconto * 100) / 100,
    desconto: Math.round(desconto * 100) / 100,
    percentualDescontoProjeto: Math.round(percentualDescontoProjeto * 100) / 100,
    administracao: Math.round(administracao * 100) / 100,
    administracaoSemDesconto: Math.round(administracaoSemDesconto * 100) / 100,
    administracaoDescontada: Math.round(administracaoDescontada * 100) / 100,
    manualAdministracao: manualAdmin,
    comissaoComercial: Math.round(comissaoComercial * 100) / 100,
    comissaoPura3Pct: Math.round(comissaoPura3Pct * 100) / 100,
    comissaoSemDesconto: Math.round(comissaoSemDesconto * 100) / 100,
    comissaoDescontada: Math.round(comissaoDescontada * 100) / 100,
    comissaoUsouPisoMinimo,
    manualComissao: manualComiss,
    indicacao: Math.round(indicacao * 100) / 100,
    indicacaoSemDesconto: Math.round(indicacaoSemDesconto * 100) / 100,
    indicacaoDescontada: Math.round(indicacaoDescontada * 100) / 100,
    manualIndicacao: manualInd,
    valorTotal: Math.round(valorTotal * 100) / 100,
  }
}

export interface ConfiguracaoParcelamentosInput {
  parcelasCartao?: number
  jurosCartao?: number
  entradaCartao?: number
  parcelasBanco1?: number
  jurosBanco1?: number
  entradaBanco1?: number
  parcelasBanco2?: number
  jurosBanco2?: number
  entradaBanco2?: number
}

export interface InputCalculoSolar {
  consumoKwhMes: number
  tipoCliente?: TipoClienteSolar
  padraoFases?: PadraoFasesSolar | string
  tarifaKwh: number
  potenciaKwp: number
  orientacaoTelhado?: OrientacaoTelhadoSolar
  custos?: Partial<DadosCustosSolar>
  valorInvestimentoInformado?: number
  configParcelamentos?: ConfiguracaoParcelamentosInput
  geracaoSimuladaKwhAno?: number
}

/**
 * Motor de cálculos solares completo para orçamentos da Delfos Solar
 */
export function calcularOrcamentoSolar(input: InputCalculoSolar): CalculosSolarResultado {
  const consumoKwhMes = Math.max(0, Number(input.consumoKwhMes) || 0)
  const tarifaKwh = Math.max(0.01, Number(input.tarifaKwh) || 1.19)
  const potenciaKwp = Math.max(0, Number(input.potenciaKwp) || 0)
  const tipoCliente = input.tipoCliente || 'residencial'
  const orientacao = input.orientacaoTelhado || 'norte'
  const fatorOrientacao = FATORES_ORIENTACAO[orientacao] || 1.0
  const geracaoSimuladaKwhAno =
    input.geracaoSimuladaKwhAno !== undefined &&
    input.geracaoSimuladaKwhAno !== null &&
    Number(input.geracaoSimuladaKwhAno) > 0
      ? Number(input.geracaoSimuladaKwhAno)
      : undefined

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
  let geracaoAnualCalculadaKit = 0

  const geracaoMensalDetalhada: GeracaoMensalItem[] = DADOS_CLIMATICOS_ERECHIM.map(
    (mesData, index) => {
      // Geração mensal = Potência(kWp) * HSP diário * dias * PR
      const geracaoMes = Math.round(potenciaKwp * mesData.hspDiario * mesData.dias * pr)
      geracaoAnualCalculadaKit += geracaoMes
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

  // Quando geracaoSimuladaKwhAno for informada (> 0), ela assume como a base de geração:
  // geração anual = geracaoSimuladaKwhAno, geração mensal = geracaoSimuladaKwhAno / 12.
  // A curva detalhada sazonal é reescalonada proporcionalmente à simulação (ou uniforme se kit = 0).
  const geracaoAnualTotal =
    geracaoSimuladaKwhAno !== undefined ? geracaoSimuladaKwhAno : geracaoAnualCalculadaKit

  const geracaoMediaMensalKwh =
    geracaoSimuladaKwhAno !== undefined
      ? Math.round(geracaoSimuladaKwhAno / 12)
      : geracaoMensalDetalhada.length > 0
        ? Math.round(geracaoAnualTotal / 12)
        : 0

  if (geracaoSimuladaKwhAno !== undefined) {
    if (geracaoAnualCalculadaKit > 0) {
      const fatorEscala = geracaoSimuladaKwhAno / geracaoAnualCalculadaKit
      geracaoMensalDetalhada.forEach((item) => {
        item.geracaoKwh = Math.round(item.geracaoKwh * fatorEscala)
      })
    } else {
      const valorMesUniforme = Math.round(geracaoSimuladaKwhAno / 12)
      geracaoMensalDetalhada.forEach((item) => {
        item.geracaoKwh = valorMesUniforme
      })
    }
  }

  // Atualizar fator sazonal relativo à média
  geracaoMensalDetalhada.forEach((item) => {
    item.fatorSazonal =
      geracaoMediaMensalKwh > 0 ? Number((item.geracaoKwh / geracaoMediaMensalKwh).toFixed(2)) : 1
  })

  // 3. Contas de Energia
  // REGRA DE NEGÓCIO: para todos os cálculos de economia e gasto de energia, deve ser considerada
  // a energia gerada real no dimensionamento, e a consumida também igual à gerada (paridade total).
  // consumoEfetivo = geracaoReal
  const consumoKwhMesEfetivo = geracaoMediaMensalKwh > 0 ? geracaoMediaMensalKwh : consumoKwhMes
  const consumoAnualEfetivo = geracaoAnualTotal > 0 ? geracaoAnualTotal : consumoKwhMesEfetivo * 12

  const taxaMinimaKwh = getTaxaMinimaKwh(tipoCliente, input.padraoFases)
  const taxaMinimaReais = taxaMinimaKwh * tarifaKwh

  // Conta atual sem solar: baseada na geração real dimensionada * tarifa
  const contaAtualSemSolarMes = consumoKwhMesEfetivo * tarifaKwh
  const contaAtualSemSolarAno = consumoAnualEfetivo * tarifaKwh

  // Como consumo = geração, energia não compensada = 0.
  // A conta com solar fica com a taxa mínima de disponibilidade + iluminação pública (CIP ~30% da taxa mínima):
  // contaPrimeiroMesComSolar = taxaMinimaReais * 1.30.
  const contaPrimeiroMesComSolar = taxaMinimaReais * 1.3

  // Economia mensal no primeiro mês
  const economia1Mes = Math.max(0, contaAtualSemSolarMes - contaPrimeiroMesComSolar)
  const economia1Ano = economia1Mes * 12

  // 4. Projeções com Reajuste Tarifário Anual de 9% ao ano
  const REAJUSTE_ANUAL = 0.09 // 9% a.a.

  // Sem solar: somatório de (contaAnual * (1 + reajuste)^ano)
  function calcularGastoAcumulado(anos: number, baseAnual: number): number {
    return calcularGastoAcumuladoSemSolar(anos, baseAnual, REAJUSTE_ANUAL)
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

  // 2) Cartão de crédito (padrão: 18x e 1.49% a.m. ou configurado)
  const parcelasCartao = Math.max(
    1,
    input.configParcelamentos?.parcelasCartao !== undefined
      ? Number(input.configParcelamentos.parcelasCartao) || 18
      : 18,
  )
  const taxaCartao = Math.max(
    0,
    input.configParcelamentos?.jurosCartao !== undefined
      ? Number(input.configParcelamentos.jurosCartao) || 0
      : 1.49,
  )
  const entradaCartaoBruta = Number(input.configParcelamentos?.entradaCartao) || 0
  const entradaCartao = Math.min(valorInvestimento, Math.max(0, entradaCartaoBruta))
  const principalCartao = Math.max(0, valorInvestimento - entradaCartao)
  const parcelaCartao = calcularParcelaPrice(principalCartao, taxaCartao, parcelasCartao)
  const cartao18x: ParcelamentoItem = {
    titulo: `Cartão de Crédito ${parcelasCartao}x`,
    descricao: `${parcelasCartao}x no cartão de crédito`,
    numeroParcelas: parcelasCartao,
    taxaJurosMensal: taxaCartao,
    valorParcela: parcelaCartao,
    valorTotal: entradaCartao + parcelaCartao * parcelasCartao,
    contaSemSolar: contaAtualSemSolarMes,
    contaComSolar: contaPrimeiroMesComSolar,
    desembolsoMensal: parcelaCartao + contaPrimeiroMesComSolar,
    economiaMensalLiquida: contaAtualSemSolarMes - (parcelaCartao + contaPrimeiroMesComSolar),
    valorEntrada: entradaCartao,
    valorFinanciado: principalCartao,
  }

  // 3) Financiamento Banco 1 (padrão: 60x e 1.90% a.m. ou configurado)
  const parcelasBanco1 = Math.max(
    1,
    input.configParcelamentos?.parcelasBanco1 !== undefined
      ? Number(input.configParcelamentos.parcelasBanco1) || 60
      : 60,
  )
  const taxaBanco1 = Math.max(
    0,
    input.configParcelamentos?.jurosBanco1 !== undefined
      ? Number(input.configParcelamentos.jurosBanco1) || 0
      : 1.9,
  )
  const entradaBanco1Bruta = Number(input.configParcelamentos?.entradaBanco1) || 0
  const entradaBanco1 = Math.min(valorInvestimento, Math.max(0, entradaBanco1Bruta))
  const principalBanco1 = Math.max(0, valorInvestimento - entradaBanco1)
  const parcelaFinancBanco1 = calcularParcelaPrice(principalBanco1, taxaBanco1, parcelasBanco1)
  const financiamentoBanco1: ParcelamentoItem = {
    titulo: 'Financiamento Banco 1',
    descricao: `Até ${parcelasBanco1}x com juros de ${taxaBanco1.toFixed(2).replace('.', ',')}% a.m.`,
    numeroParcelas: parcelasBanco1,
    taxaJurosMensal: taxaBanco1,
    valorParcela: parcelaFinancBanco1,
    valorTotal: entradaBanco1 + parcelaFinancBanco1 * parcelasBanco1,
    contaSemSolar: contaAtualSemSolarMes,
    contaComSolar: contaPrimeiroMesComSolar,
    desembolsoMensal: parcelaFinancBanco1 + contaPrimeiroMesComSolar,
    economiaMensalLiquida: contaAtualSemSolarMes - (parcelaFinancBanco1 + contaPrimeiroMesComSolar),
    valorEntrada: entradaBanco1,
    valorFinanciado: principalBanco1,
  }

  // 4) Financiamento Banco 2 (padrão: 60x e 0.99% a.m. ou configurado)
  const parcelasBanco2 = Math.max(
    1,
    input.configParcelamentos?.parcelasBanco2 !== undefined
      ? Number(input.configParcelamentos.parcelasBanco2) || 60
      : 60,
  )
  const taxaBanco2 = Math.max(
    0,
    input.configParcelamentos?.jurosBanco2 !== undefined
      ? Number(input.configParcelamentos.jurosBanco2) || 0
      : 0.99,
  )
  const entradaBanco2Bruta = Number(input.configParcelamentos?.entradaBanco2) || 0
  const entradaBanco2 = Math.min(valorInvestimento, Math.max(0, entradaBanco2Bruta))
  const principalBanco2 = Math.max(0, valorInvestimento - entradaBanco2)
  const parcelaFinancBanco2 = calcularParcelaPrice(principalBanco2, taxaBanco2, parcelasBanco2)
  const financiamentoBanco2: ParcelamentoItem = {
    titulo: 'Financiamento Banco 2',
    descricao: `Até ${parcelasBanco2}x com juros de ${taxaBanco2.toFixed(2).replace('.', ',')}% a.m.`,
    numeroParcelas: parcelasBanco2,
    taxaJurosMensal: taxaBanco2,
    valorParcela: parcelaFinancBanco2,
    valorTotal: entradaBanco2 + parcelaFinancBanco2 * parcelasBanco2,
    contaSemSolar: contaAtualSemSolarMes,
    contaComSolar: contaPrimeiroMesComSolar,
    desembolsoMensal: parcelaFinancBanco2 + contaPrimeiroMesComSolar,
    economiaMensalLiquida: contaAtualSemSolarMes - (parcelaFinancBanco2 + contaPrimeiroMesComSolar),
    valorEntrada: entradaBanco2,
    valorFinanciado: principalBanco2,
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
    gastoSemSolarPaybackAnos: calcularGastoAcumulado(
      Math.max(1, Math.ceil(paybackMeses > 0 ? paybackMeses / 12 : 5)),
      contaAtualSemSolarAno,
    ),
    anosPaybackArredondado: Math.max(1, Math.ceil(paybackMeses > 0 ? paybackMeses / 12 : 5)),
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
