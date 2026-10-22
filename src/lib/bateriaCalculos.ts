import { calcularCustosAba, calcularParcelaPrice } from '@/lib/energiaSolar'
import type { ParametrosCalculoCustosAba, ResultadoCalculoCustosAba } from '@/lib/energiaSolar'

export interface DimensionamentoBateriaInput {
  consumoCriticoKwhDia: number // Consumo diário essencial a ser mantido pelas baterias (kWh/dia)
  autonomiaHorasDesejada: number // Quantas horas de autonomia ininterrupta o cliente deseja (ex: 8h, 12h, 24h)
  profundidadeDescargaDod?: number // DOD em % (ex: 90% para Lítio LiFePO4, 50% para Chumbo)
  eficienciaSistema?: number // Rendimento inversor + bateria (ex: 0.90 = 90%)
  potenciaPicoCargasKw?: number // Demanda instantânea de pico dos circuitos críticos (kW)
}

export interface DimensionamentoBateriaResultado {
  capacidadeNominalMinimaKwh: number
  capacidadeUtilNecessariaKwh: number
  potenciaInversorSugeridaKw: number
  quantidadeModulosSugerida: number // Considerando módulos padrão de ~5.12 kWh
  autonomiaCalculadaHoras: number
}

/**
 * Dimensiona a capacidade do banco de baterias baseado no consumo crítico diário e na autonomia desejada
 */
export function dimensionarSistemaBaterias(
  input: DimensionamentoBateriaInput,
): DimensionamentoBateriaResultado {
  const consumoDia = Math.max(0.1, Number(input.consumoCriticoKwhDia) || 10)
  const autonomiaHoras = Math.max(1, Number(input.autonomiaHorasDesejada) || 12)
  const dodFracao = Math.min(
    0.95,
    Math.max(0.4, (Number(input.profundidadeDescargaDod) || 90) / 100),
  )
  const rendimento = Math.min(1.0, Math.max(0.7, (Number(input.eficienciaSistema) || 90) / 100))

  // Consumo por hora dos circuitos críticos
  const consumoMedioHorarioKwh = consumoDia / 24

  // Energia útil total necessária no período de autonomia
  const energiaUtilNecessaria = consumoMedioHorarioKwh * autonomiaHoras

  // Capacidade nominal necessária levando em consideração o DOD e o rendimento global
  const capacidadeNominalKwh = energiaUtilNecessaria / (dodFracao * rendimento)

  // Potência sugerida para o inversor híbrido: pico informado ou pelo menos 1.5x o consumo horário com piso de 3 kW
  const potenciaPico = Number(input.potenciaPicoCargasKw) || 0
  const potenciaInversorKw = Math.max(
    3.0,
    potenciaPico > 0 ? potenciaPico * 1.2 : consumoMedioHorarioKwh * 2.5,
  )

  // Módulos comerciais padrão LiFePO4 (5.12 kWh / 100Ah 51.2V)
  const moduloKwhPadrao = 5.12
  const qtdModulos = Math.max(1, Math.ceil(capacidadeNominalKwh / moduloKwhPadrao))

  return {
    capacidadeNominalMinimaKwh: Math.round(capacidadeNominalKwh * 100) / 100,
    capacidadeUtilNecessariaKwh: Math.round(energiaUtilNecessaria * 100) / 100,
    potenciaInversorSugeridaKw: Math.round(potenciaInversorKw * 10) / 10,
    quantidadeModulosSugerida: qtdModulos,
    autonomiaCalculadaHoras: Math.round(autonomiaHoras * 10) / 10,
  }
}

export interface CustosBateriaInput {
  materiaisEquipamentos: number
  materiaisExtras?: number
  maoDeObra?: number
  riscoEngenharia?: number
  freteGuincho?: number
  subestacao?: number
  terceirizacao?: number
  marketingCombustivel?: number
  opcaoImposto?: number // 1 (9,23% total) ou 2 (16% sobre serviços/margens)
  desconto?: number
  descontoPercentual?: number
  percentualAdministracaoAuto?: number // padrão 0.15 (15%)
  percentualIndicacaoAuto?: number // padrão 0
  manualAdministracao?: boolean
  manualComissao?: boolean
  manualIndicacao?: boolean
  valorManualAdministracao?: number
  valorManualComissao?: number
  valorManualIndicacao?: number
}

/**
 * Executa a formação de custos e preço de venda para sistemas de bateria,
 * reutilizando exatamente as mesmas fórmulas, alíquotas e garantias de fechamento
 * contábil do gerador solar Delfos (calcularCustosAba).
 */
export function calcularCustosBateria(input: CustosBateriaInput): ResultadoCalculoCustosAba {
  const params: ParametrosCalculoCustosAba = {
    materiaisEquipamentos: input.materiaisEquipamentos || 0,
    materiaisExtras: input.materiaisExtras || 0,
    maoDeObra: input.maoDeObra || 0,
    riscoEngenharia: input.riscoEngenharia || 0,
    freteGuincho: input.freteGuincho || 0,
    subestacao: input.subestacao || 0,
    terceirizacao: input.terceirizacao || 0,
    marketingCombustivel: input.marketingCombustivel || 0,
    opcaoImposto: input.opcaoImposto === 1 ? 1 : 2,
    desconto: input.desconto || 0,
    descontoPercentual: input.descontoPercentual,
    percentualAdministracaoAuto: input.percentualAdministracaoAuto,
    percentualIndicacaoAuto: input.percentualIndicacaoAuto,
    manualAdministracao: input.manualAdministracao,
    manualComissao: input.manualComissao,
    manualIndicacao: input.manualIndicacao,
    valorManualAdministracao: input.valorManualAdministracao,
    valorManualComissao: input.valorManualComissao,
    valorManualIndicacao: input.valorManualIndicacao,
  }

  return calcularCustosAba(params)
}

export { calcularParcelaPrice }
