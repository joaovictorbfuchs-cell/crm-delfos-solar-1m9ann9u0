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
