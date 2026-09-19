/**
 * Tabela de referência base com projeção tarifária de 2026 a 2051 (26 anos).
 *
 * Utilizada como FALLBACK quando o usuário ainda não tiver importado a planilha
 * tarifária oficial na coleção `projecao_tarifaria`.
 *
 * Parâmetros de cálculo:
 * - Reajuste tarifário anual de 9% a.a. (conforme Lei 14.300 e diretriz da concessionária).
 * - Fio B com transição da Lei 14.300 (2026: 60%, 2027: 75%, 2028: 90%, 2029+: 100%).
 * - Fatores de simultaneidade:
 *   * Residencial: 30% instantâneo (70% injetado sujeito ao Fio B)
 *   * Comercial: 70% instantâneo (30% injetado sujeito ao Fio B)
 */

export type TipoClienteProjecao = 'residencial' | 'comercial'

export interface LinhaReferenciaAno {
  ano: number
  /** Tarifa média cheia de energia da concessionária (R$/kWh) */
  tarifaBase: number
  /** Componente da tarifa correspondente ao Fio B / distribuição (R$/kWh) */
  fioBBase: number
  /** Percentual do Fio B cobrado da energia compensada pela Lei 14.300 (ex: 60%, 75%, 90%, 100%) */
  percentualFioBLei14300: number
  /** Fio B efetivamente tarifado no ano (R$/kWh) = fioBBase * percentualFioB */
  fioBEfetivo: number
}

export const TAXA_REAJUSTE_PADRAO_AA = 0.09 // 9% a.a.

/**
 * Gera a tabela de referência base com reajuste anual de 9% a.a. para os anos 2026 a 2051.
 * Tarifa base de partida em 2026: R$ 0,985/kWh. Fio B de partida em 2026: R$ 0,285/kWh.
 */
function gerarTabelaReferenciaBase(): LinhaReferenciaAno[] {
  const anos: LinhaReferenciaAno[] = []
  const anoInicial = 2026
  const totalAnos = 26 // 2026 até 2051

  let tarifa = 0.985
  let fioB = 0.285

  for (let i = 0; i < totalAnos; i++) {
    const ano = anoInicial + i

    // Transição Lei 14.300
    let percentualFioB = 1.0
    if (ano === 2026) percentualFioB = 0.6
    else if (ano === 2027) percentualFioB = 0.75
    else if (ano === 2028) percentualFioB = 0.9
    else percentualFioB = 1.0

    if (i > 0) {
      tarifa = tarifa * (1 + TAXA_REAJUSTE_PADRAO_AA)
      fioB = fioB * (1 + TAXA_REAJUSTE_PADRAO_AA)
    }

    const fioBEfetivo = fioB * percentualFioB

    anos.push({
      ano,
      tarifaBase: Number(tarifa.toFixed(4)),
      fioBBase: Number(fioB.toFixed(4)),
      percentualFioBLei14300: percentualFioB,
      fioBEfetivo: Number(fioBEfetivo.toFixed(4)),
    })
  }

  return anos
}

export const TABELA_REFERENCIA_BASE: LinhaReferenciaAno[] = gerarTabelaReferenciaBase()

export const FATORES_SIMULTANEIDADE: Record<TipoClienteProjecao, number> = {
  residencial: 0.3, // 30% de simultaneidade (autoconsumo imediato)
  comercial: 0.7, // 70% de simultaneidade (autoconsumo imediato)
}

/**
 * Tabela Oficial de Parâmetros Tarifários (2026 a 2051) extraída da Planilha de Orçamento.
 * Utilizada como referência estática direta e fallback prioritário.
 */
export interface ParametroTarifarioAno {
  ano: number
  classe: TipoClienteProjecao
  tarifa: number
  fio_b: number
  fs: number
  gd_eco_liquida: number
}

export const PARAMETROS_TARIFARIOS_OFICIAIS: Record<
  TipoClienteProjecao,
  Record<number, ParametroTarifarioAno>
> = {
  residencial: {
    2026: {
      ano: 2026,
      classe: 'residencial',
      tarifa: 1.1979,
      fio_b: 0.2239,
      fs: 0.3,
      gd_eco_liquida: 1.1039,
    },
    2027: {
      ano: 2027,
      classe: 'residencial',
      tarifa: 1.3057,
      fio_b: 0.2441,
      fs: 0.3,
      gd_eco_liquida: 1.1775,
    },
    2028: {
      ano: 2028,
      classe: 'residencial',
      tarifa: 1.4232,
      fio_b: 0.266,
      fs: 0.3,
      gd_eco_liquida: 1.2556,
    },
    2029: {
      ano: 2029,
      classe: 'residencial',
      tarifa: 1.5513,
      fio_b: 0.29,
      fs: 0.3,
      gd_eco_liquida: 1.3686,
    },
    2030: {
      ano: 2030,
      classe: 'residencial',
      tarifa: 1.6909,
      fio_b: 0.3161,
      fs: 0.3,
      gd_eco_liquida: 1.4918,
    },
    2031: {
      ano: 2031,
      classe: 'residencial',
      tarifa: 1.8431,
      fio_b: 0.3445,
      fs: 0.3,
      gd_eco_liquida: 1.6261,
    },
    2032: {
      ano: 2032,
      classe: 'residencial',
      tarifa: 2.009,
      fio_b: 0.3755,
      fs: 0.3,
      gd_eco_liquida: 1.7724,
    },
    2033: {
      ano: 2033,
      classe: 'residencial',
      tarifa: 2.1898,
      fio_b: 0.4093,
      fs: 0.3,
      gd_eco_liquida: 1.9319,
    },
    2034: {
      ano: 2034,
      classe: 'residencial',
      tarifa: 2.3869,
      fio_b: 0.4462,
      fs: 0.3,
      gd_eco_liquida: 2.1058,
    },
    2035: {
      ano: 2035,
      classe: 'residencial',
      tarifa: 2.6017,
      fio_b: 0.4863,
      fs: 0.3,
      gd_eco_liquida: 2.2953,
    },
    2036: {
      ano: 2036,
      classe: 'residencial',
      tarifa: 2.8359,
      fio_b: 0.5301,
      fs: 0.3,
      gd_eco_liquida: 2.5019,
    },
    2037: {
      ano: 2037,
      classe: 'residencial',
      tarifa: 3.0911,
      fio_b: 0.5778,
      fs: 0.3,
      gd_eco_liquida: 2.7271,
    },
    2038: {
      ano: 2038,
      classe: 'residencial',
      tarifa: 3.3693,
      fio_b: 0.6298,
      fs: 0.3,
      gd_eco_liquida: 2.9725,
    },
    2039: {
      ano: 2039,
      classe: 'residencial',
      tarifa: 3.6725,
      fio_b: 0.6865,
      fs: 0.3,
      gd_eco_liquida: 3.24,
    },
    2040: {
      ano: 2040,
      classe: 'residencial',
      tarifa: 4.003,
      fio_b: 0.7483,
      fs: 0.3,
      gd_eco_liquida: 3.5316,
    },
    2041: {
      ano: 2041,
      classe: 'residencial',
      tarifa: 4.3633,
      fio_b: 0.8156,
      fs: 0.3,
      gd_eco_liquida: 3.8495,
    },
    2042: {
      ano: 2042,
      classe: 'residencial',
      tarifa: 4.756,
      fio_b: 0.889,
      fs: 0.3,
      gd_eco_liquida: 4.1959,
    },
    2043: {
      ano: 2043,
      classe: 'residencial',
      tarifa: 5.184,
      fio_b: 0.969,
      fs: 0.3,
      gd_eco_liquida: 4.5735,
    },
    2044: {
      ano: 2044,
      classe: 'residencial',
      tarifa: 5.6506,
      fio_b: 1.0562,
      fs: 0.3,
      gd_eco_liquida: 4.9852,
    },
    2045: {
      ano: 2045,
      classe: 'residencial',
      tarifa: 6.1592,
      fio_b: 1.1513,
      fs: 0.3,
      gd_eco_liquida: 5.4339,
    },
    2046: {
      ano: 2046,
      classe: 'residencial',
      tarifa: 6.7135,
      fio_b: 1.2549,
      fs: 0.3,
      gd_eco_liquida: 5.9229,
    },
    2047: {
      ano: 2047,
      classe: 'residencial',
      tarifa: 7.3177,
      fio_b: 1.3678,
      fs: 0.3,
      gd_eco_liquida: 6.456,
    },
    2048: {
      ano: 2048,
      classe: 'residencial',
      tarifa: 7.9763,
      fio_b: 1.4909,
      fs: 0.3,
      gd_eco_liquida: 7.037,
    },
    2049: {
      ano: 2049,
      classe: 'residencial',
      tarifa: 8.6942,
      fio_b: 1.6251,
      fs: 0.3,
      gd_eco_liquida: 7.6704,
    },
    2050: {
      ano: 2050,
      classe: 'residencial',
      tarifa: 9.4766,
      fio_b: 1.7714,
      fs: 0.3,
      gd_eco_liquida: 8.3606,
    },
    2051: {
      ano: 2051,
      classe: 'residencial',
      tarifa: 10.3295,
      fio_b: 1.9308,
      fs: 0.3,
      gd_eco_liquida: 9.1131,
    },
  },
  comercial: {
    2026: {
      ano: 2026,
      classe: 'comercial',
      tarifa: 1.1979,
      fio_b: 0.2239,
      fs: 0.7,
      gd_eco_liquida: 1.1576,
    },
    2027: {
      ano: 2027,
      classe: 'comercial',
      tarifa: 1.3057,
      fio_b: 0.2441,
      fs: 0.7,
      gd_eco_liquida: 1.2508,
    },
    2028: {
      ano: 2028,
      classe: 'comercial',
      tarifa: 1.4232,
      fio_b: 0.266,
      fs: 0.7,
      gd_eco_liquida: 1.3514,
    },
    2029: {
      ano: 2029,
      classe: 'comercial',
      tarifa: 1.5513,
      fio_b: 0.29,
      fs: 0.7,
      gd_eco_liquida: 1.473,
    },
    2030: {
      ano: 2030,
      classe: 'comercial',
      tarifa: 1.6909,
      fio_b: 0.3161,
      fs: 0.7,
      gd_eco_liquida: 1.6056,
    },
    2031: {
      ano: 2031,
      classe: 'comercial',
      tarifa: 1.8431,
      fio_b: 0.3445,
      fs: 0.7,
      gd_eco_liquida: 1.7501,
    },
    2032: {
      ano: 2032,
      classe: 'comercial',
      tarifa: 2.009,
      fio_b: 0.3755,
      fs: 0.7,
      gd_eco_liquida: 1.9076,
    },
    2033: {
      ano: 2033,
      classe: 'comercial',
      tarifa: 2.1898,
      fio_b: 0.4093,
      fs: 0.7,
      gd_eco_liquida: 2.0793,
    },
    2034: {
      ano: 2034,
      classe: 'comercial',
      tarifa: 2.3869,
      fio_b: 0.4462,
      fs: 0.7,
      gd_eco_liquida: 2.2664,
    },
    2035: {
      ano: 2035,
      classe: 'comercial',
      tarifa: 2.6017,
      fio_b: 0.4863,
      fs: 0.7,
      gd_eco_liquida: 2.4704,
    },
    2036: {
      ano: 2036,
      classe: 'comercial',
      tarifa: 2.8359,
      fio_b: 0.5301,
      fs: 0.7,
      gd_eco_liquida: 2.6928,
    },
    2037: {
      ano: 2037,
      classe: 'comercial',
      tarifa: 3.0911,
      fio_b: 0.5778,
      fs: 0.7,
      gd_eco_liquida: 2.9351,
    },
    2038: {
      ano: 2038,
      classe: 'comercial',
      tarifa: 3.3693,
      fio_b: 0.6298,
      fs: 0.7,
      gd_eco_liquida: 3.1993,
    },
    2039: {
      ano: 2039,
      classe: 'comercial',
      tarifa: 3.6725,
      fio_b: 0.6865,
      fs: 0.7,
      gd_eco_liquida: 3.4871,
    },
    2040: {
      ano: 2040,
      classe: 'comercial',
      tarifa: 4.003,
      fio_b: 0.7483,
      fs: 0.7,
      gd_eco_liquida: 3.801,
    },
    2041: {
      ano: 2041,
      classe: 'comercial',
      tarifa: 4.3633,
      fio_b: 0.8156,
      fs: 0.7,
      gd_eco_liquida: 4.1431,
    },
    2042: {
      ano: 2042,
      classe: 'comercial',
      tarifa: 4.756,
      fio_b: 0.889,
      fs: 0.7,
      gd_eco_liquida: 4.516,
    },
    2043: {
      ano: 2043,
      classe: 'comercial',
      tarifa: 5.184,
      fio_b: 0.969,
      fs: 0.7,
      gd_eco_liquida: 4.9224,
    },
    2044: {
      ano: 2044,
      classe: 'comercial',
      tarifa: 5.6506,
      fio_b: 1.0562,
      fs: 0.7,
      gd_eco_liquida: 5.3654,
    },
    2045: {
      ano: 2045,
      classe: 'comercial',
      tarifa: 6.1592,
      fio_b: 1.1513,
      fs: 0.7,
      gd_eco_liquida: 5.8483,
    },
    2046: {
      ano: 2046,
      classe: 'comercial',
      tarifa: 6.7136,
      fio_b: 1.2549,
      fs: 0.7,
      gd_eco_liquida: 6.3747,
    },
    2047: {
      ano: 2047,
      classe: 'comercial',
      tarifa: 7.3179,
      fio_b: 1.3678,
      fs: 0.7,
      gd_eco_liquida: 6.9484,
    },
    2048: {
      ano: 2048,
      classe: 'comercial',
      tarifa: 7.9763,
      fio_b: 1.4909,
      fs: 0.7,
      gd_eco_liquida: 7.5738,
    },
    2049: {
      ano: 2049,
      classe: 'comercial',
      tarifa: 8.6942,
      fio_b: 1.6251,
      fs: 0.7,
      gd_eco_liquida: 8.2554,
    },
    2050: {
      ano: 2050,
      classe: 'comercial',
      tarifa: 9.4766,
      fio_b: 1.7714,
      fs: 0.7,
      gd_eco_liquida: 8.9983,
    },
    2051: {
      ano: 2051,
      classe: 'comercial',
      tarifa: 10.3295,
      fio_b: 1.9308,
      fs: 0.7,
      gd_eco_liquida: 9.8082,
    },
  },
}

/**
 * Obtém a GD Eco Líquida de um ano e classe específicos da tabela de parâmetros.
 * Se o ano não estiver cadastrado na tabela, faz fallback para cálculo baseado em tarifa, FS e Fio B.
 */
export function getGdEcoLiquidaAno(
  ano: number,
  classe: TipoClienteProjecao,
  fallbackCalculo?: { tarifa: number; fs: number; fioB: number },
): number {
  const param = PARAMETROS_TARIFARIOS_OFICIAIS[classe]?.[ano]
  if (param && param.gd_eco_liquida > 0) {
    return param.gd_eco_liquida
  }

  // Fallback para quando o ano não está cadastrado
  if (fallbackCalculo) {
    return Number((fallbackCalculo.tarifa - fallbackCalculo.fs * fallbackCalculo.fioB).toFixed(4))
  }

  return 1.1039 // Padrão 2026 residencial
}

export const CONSUMO_EXEMPLO_PADRAO_KWH_ANO = 4807.08

/**
 * Parâmetros de degradação padrão de módulos fotovoltaicos:
 * - LID (Light-Induced Degradation) no 1º ano: 2,0% (geração retém 98,00%)
 * - Degradação linear subsequente: 0,55% ao ano
 * - No ano 25: 100% - 2,0% - 24 * 0,55% = 84,80% (fator 0,8480)
 */
export const TAXA_DEGRADACAO_LID_ANO1 = 0.02 // 2.0% LID no ano 1
export const TAXA_DEGRADACAO_LINEAR_AA = 0.0055 // 0.55% a.a. a partir do ano 2

/**
 * Tabela com os fatores de retenção de potência/geração por ano (1 a 26):
 * Ano 1: 0.9800 (98,00%)
 * Ano 2: 0.9745 (97,45%)
 * Ano 3: 0.9690 (96,90%)
 * ...
 * Ano 25: 0.8480 (84,80%)
 * Ano 26: 0.8425 (84,25%)
 */
export const FATORES_DEGRADACAO_PAINEIS: readonly number[] = Object.freeze([
  0.98, // Ano 1
  0.9745, // Ano 2
  0.969, // Ano 3
  0.9635, // Ano 4
  0.958, // Ano 5
  0.9525, // Ano 6
  0.947, // Ano 7
  0.9415, // Ano 8
  0.936, // Ano 9
  0.9305, // Ano 10
  0.925, // Ano 11
  0.9195, // Ano 12
  0.914, // Ano 13
  0.9085, // Ano 14
  0.903, // Ano 15
  0.8975, // Ano 16
  0.892, // Ano 17
  0.8865, // Ano 18
  0.881, // Ano 19
  0.8755, // Ano 20
  0.87, // Ano 21
  0.8645, // Ano 22
  0.859, // Ano 23
  0.8535, // Ano 24
  0.848, // Ano 25 (exatamente 84,80%)
  0.8425, // Ano 26 (2051)
])

/**
 * Retorna o fator de geração retida pelo módulo para um dado ano (1-indexado).
 * Ex: ano 1 => 0.98, ano 25 => 0.8480.
 * Para anos além da tabela, continua a degradação linear de 0.55% a.a.
 */
export function getFatorDegradacaoPainel(anoIndice1: number): number {
  if (anoIndice1 <= 0) return 1.0
  const idx = anoIndice1 - 1
  if (idx < FATORES_DEGRADACAO_PAINEIS.length) {
    return FATORES_DEGRADACAO_PAINEIS[idx]
  }
  // Continuação linear caso haja anos adicionais
  const anosAlem = anoIndice1 - 1
  const fator = 1.0 - TAXA_DEGRADACAO_LID_ANO1 - (anosAlem - 1) * TAXA_DEGRADACAO_LINEAR_AA
  return Number(Math.max(0, fator).toFixed(4))
}
