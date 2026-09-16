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
