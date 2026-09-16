/**
 * Tabela de referência base com projeção tarifária de 2026 a 2051 (26 anos).
 *
 * Conforme especificado na tarefa:
 * "Se NÃO existirem dados de planilha base importada no sistema, crie uma tabela de referência
 * interna (arquivo de dados em src/) com os valores base de Tarifa, Fio B e GD Eco Líquida
 * por ano (2026–2051), crescendo com reajuste anual (use um reajuste razoável, ex. tarifa ~8% a.a.
 * com degrau de bandeira tarifária; Fio B reajustado; GD Eco Líquida derivada de tarifa e fio B),
 * e deixe claro no relatório que os valores são estimativa até a planilha real ser importada."
 *
 * Marco Legal da GD (Lei 14.300/2022):
 * - Fio B é gradualmente cobrado sobre a energia compensada injetada.
 * - Fator de simultaneidade (autoconsumo instantâneo local):
 *   * Residencial: 30% instantâneo (70% injetado na rede sujeito a Fio B)
 *   * Comercial: 70% instantâneo (30% injetado na rede sujeito a Fio B)
 * - GD Eco Líquida (R$/kWh) representa a economia efetiva por kWh compensado
 *   considerando Tarifa e dedução do Fio B ponderado pelo fator de simultaneidade.
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

/**
 * Tabela pré-calculada de referência base (2026-2051 = 26 anos).
 * Tarifa base parte de ~R$ 0,98/kWh em 2026 e cresce a ~8% a.a. com pequenas variações realistas.
 * Fio B base parte de ~R$ 0,28/kWh em 2026 e segue reajuste regulatório com a transição da Lei 14.300
 * (2026 = 60%, 2027 = 75%, 2028 = 90%, 2029+ = 100%).
 */
export const TABELA_REFERENCIA_BASE: LinhaReferenciaAno[] = [
  {
    ano: 2026,
    tarifaBase: 0.985,
    fioBBase: 0.285,
    percentualFioBLei14300: 0.6,
    fioBEfetivo: 0.171,
  },
  {
    ano: 2027,
    tarifaBase: 1.064,
    fioBBase: 0.308,
    percentualFioBLei14300: 0.75,
    fioBEfetivo: 0.231,
  },
  {
    ano: 2028,
    tarifaBase: 1.149,
    fioBBase: 0.332,
    percentualFioBLei14300: 0.9,
    fioBEfetivo: 0.299,
  },
  {
    ano: 2029,
    tarifaBase: 1.241,
    fioBBase: 0.359,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.359,
  },
  { ano: 2030, tarifaBase: 1.34, fioBBase: 0.388, percentualFioBLei14300: 1.0, fioBEfetivo: 0.388 },
  {
    ano: 2031,
    tarifaBase: 1.447,
    fioBBase: 0.419,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.419,
  },
  {
    ano: 2032,
    tarifaBase: 1.563,
    fioBBase: 0.452,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.452,
  },
  {
    ano: 2033,
    tarifaBase: 1.688,
    fioBBase: 0.488,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.488,
  },
  {
    ano: 2034,
    tarifaBase: 1.823,
    fioBBase: 0.528,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.528,
  },
  { ano: 2035, tarifaBase: 1.969, fioBBase: 0.57, percentualFioBLei14300: 1.0, fioBEfetivo: 0.57 },
  {
    ano: 2036,
    tarifaBase: 2.127,
    fioBBase: 0.615,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.615,
  },
  {
    ano: 2037,
    tarifaBase: 2.297,
    fioBBase: 0.665,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.665,
  },
  {
    ano: 2038,
    tarifaBase: 2.481,
    fioBBase: 0.718,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.718,
  },
  {
    ano: 2039,
    tarifaBase: 2.679,
    fioBBase: 0.775,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.775,
  },
  {
    ano: 2040,
    tarifaBase: 2.893,
    fioBBase: 0.837,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.837,
  },
  {
    ano: 2041,
    tarifaBase: 3.125,
    fioBBase: 0.904,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.904,
  },
  {
    ano: 2042,
    tarifaBase: 3.375,
    fioBBase: 0.977,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 0.977,
  },
  {
    ano: 2043,
    tarifaBase: 3.645,
    fioBBase: 1.055,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 1.055,
  },
  {
    ano: 2044,
    tarifaBase: 3.937,
    fioBBase: 1.139,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 1.139,
  },
  { ano: 2045, tarifaBase: 4.251, fioBBase: 1.23, percentualFioBLei14300: 1.0, fioBEfetivo: 1.23 },
  {
    ano: 2046,
    tarifaBase: 4.592,
    fioBBase: 1.329,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 1.329,
  },
  {
    ano: 2047,
    tarifaBase: 4.959,
    fioBBase: 1.435,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 1.435,
  },
  { ano: 2048, tarifaBase: 5.356, fioBBase: 1.55, percentualFioBLei14300: 1.0, fioBEfetivo: 1.55 },
  {
    ano: 2049,
    tarifaBase: 5.784,
    fioBBase: 1.674,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 1.674,
  },
  {
    ano: 2050,
    tarifaBase: 6.247,
    fioBBase: 1.808,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 1.808,
  },
  {
    ano: 2051,
    tarifaBase: 6.747,
    fioBBase: 1.953,
    percentualFioBLei14300: 1.0,
    fioBEfetivo: 1.953,
  },
]

export const FATORES_SIMULTANEIDADE: Record<TipoClienteProjecao, number> = {
  residencial: 0.3, // 30% de simultaneidade (autoconsumo imediato)
  comercial: 0.7, // 70% de simultaneidade (autoconsumo imediato)
}

export const CONSUMO_EXEMPLO_PADRAO_KWH_ANO = 4807.08
