import {
  TABELA_REFERENCIA_BASE,
  FATORES_SIMULTANEIDADE,
  CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
  type TipoClienteProjecao,
} from '@/data/planilhaBaseProjecao'

export interface LinhaProjecaoEconomia {
  ano: number
  consumoKwhAno: number
  tarifaKwh: number
  fioBKwh: number
  gdEcoLiquidaKwh: number
  economiaAnual: number
  economiaAcumulada: number
  gastoSemSolarAnual: number
  gastoSemSolarAcumulado: number
}

export interface ResumoProjecaoEconomia {
  tipoCliente: TipoClienteProjecao
  fatorSimultaneidade: number
  consumoKwhAno: number
  anoInicial: number
  anoFinal: number
  totalAnos: number
  /** Economia líquida acumulada em 25 anos (2026-2050) */
  economiaTotal25Anos: number
  /** Economia acumulada no período completo de 26 anos (2026-2051) */
  economiaTotal26Anos: number
  /** Gasto acumulado sem solar em 25 anos (2026-2050) */
  gastoTotalSemSolar25Anos: number
  /** Gasto acumulado sem solar no período completo de 26 anos (2026-2051) */
  gastoTotalSemSolar26Anos: number
  /** Economia do primeiro ano (2026) */
  economiaPrimeiroAno: number
  /** Valor perdido por mês de postergação = economia do 1º ano ÷ 12 */
  valorPerdidoPorMesPostergacao: number
  /** Projeção completa linha a linha */
  linhas: LinhaProjecaoEconomia[]
}

export interface CalcularProjecaoOptions {
  tipoCliente?: TipoClienteProjecao
  consumoKwhAno?: number
  tarifaPersonalizadaPrimeiroAno?: number
}

/**
 * Calcula a Projeção de Economia na Conta de Energia ano a ano (2026-2051).
 *
 * Fórmulas:
 * - Fator de simultaneidade (f): Residencial = 0.30 (30%), Comercial = 0.70 (70%)
 * - Parcela injetada = (1 - f)
 * - GD Eco Líquida (R$/kWh) = Tarifa - (Fio B efetivo * Parcela injetada)
 *   * No autoconsumo imediato (f), não há dedução do Fio B.
 *   * Na parcela injetada e compensada (1 - f), abate-se o Fio B regulamentado.
 *   * Portanto: GD Eco Líquida = f * Tarifa + (1 - f) * (Tarifa - Fio B efetivo)
 *     = Tarifa - (1 - f) * Fio B efetivo.
 * - Economia Anual (R$) = Consumo Anual * GD Eco Líquida
 * - Gasto Sem Solar (R$) = Consumo Anual * Tarifa
 * - Economia Acumulada e Gasto Acumulado somam ano a ano.
 * - Valor perdido por mês de postergação = Economia do 1º ano / 12.
 */
export function calcularProjecaoEconomia({
  tipoCliente = 'residencial',
  consumoKwhAno,
  tarifaPersonalizadaPrimeiroAno,
}: CalcularProjecaoOptions = {}): ResumoProjecaoEconomia {
  const consumoFinal =
    consumoKwhAno !== undefined && consumoKwhAno !== null && consumoKwhAno > 0
      ? consumoKwhAno
      : CONSUMO_EXEMPLO_PADRAO_KWH_ANO

  const fatorSimultaneidade = FATORES_SIMULTANEIDADE[tipoCliente] ?? 0.3
  const parcelaInjetada = 1 - fatorSimultaneidade

  // Fator multiplicador se o usuário passou uma tarifa base diferente para o primeiro ano
  let multiplicadorTarifa = 1
  if (
    tarifaPersonalizadaPrimeiroAno &&
    tarifaPersonalizadaPrimeiroAno > 0 &&
    TABELA_REFERENCIA_BASE[0]
  ) {
    multiplicadorTarifa = tarifaPersonalizadaPrimeiroAno / TABELA_REFERENCIA_BASE[0].tarifaBase
  }

  let ecoAcum = 0
  let gastoAcum = 0
  let economiaTotal25Anos = 0
  let gastoTotalSemSolar25Anos = 0

  const linhas: LinhaProjecaoEconomia[] = TABELA_REFERENCIA_BASE.map((ref, idx) => {
    const tarifaKwh = Number((ref.tarifaBase * multiplicadorTarifa).toFixed(4))
    const fioBKwh = Number((ref.fioBEfetivo * multiplicadorTarifa).toFixed(4))

    // GD Eco Líquida ajustada pelo fator de simultaneidade:
    // A parcela simultânea (f) economiza a tarifa cheia.
    // A parcela injetada (1 - f) economiza tarifa - fio B.
    // GD Eco Líquida = Tarifa - (fio B * (1 - f))
    const gdEcoLiquidaKwh = Number((tarifaKwh - fioBKwh * parcelaInjetada).toFixed(4))

    const economiaAnual = Number((consumoFinal * gdEcoLiquidaKwh).toFixed(2))
    const gastoSemSolarAnual = Number((consumoFinal * tarifaKwh).toFixed(2))

    ecoAcum += economiaAnual
    gastoAcum += gastoSemSolarAnual

    // Salvar acumulado de 25 anos (anos 0 a 24, isto é, 2026 até 2050 inclusive)
    if (idx === 24) {
      economiaTotal25Anos = ecoAcum
      gastoTotalSemSolar25Anos = gastoAcum
    }

    return {
      ano: ref.ano,
      consumoKwhAno: consumoFinal,
      tarifaKwh,
      fioBKwh,
      gdEcoLiquidaKwh,
      economiaAnual,
      economiaAcumulada: Number(ecoAcum.toFixed(2)),
      gastoSemSolarAnual,
      gastoSemSolarAcumulado: Number(gastoAcum.toFixed(2)),
    }
  })

  // Se por ventura a tabela tiver 25 anos ou menos, fecha com o acumulado final
  if (linhas.length <= 25) {
    economiaTotal25Anos = ecoAcum
    gastoTotalSemSolar25Anos = gastoAcum
  }

  const economiaPrimeiroAno = linhas[0]?.economiaAnual || 0
  const valorPerdidoPorMesPostergacao = Number((economiaPrimeiroAno / 12).toFixed(2))

  return {
    tipoCliente,
    fatorSimultaneidade,
    consumoKwhAno: consumoFinal,
    anoInicial: linhas[0]?.ano || 2026,
    anoFinal: linhas[linhas.length - 1]?.ano || 2051,
    totalAnos: linhas.length,
    economiaTotal25Anos: Number(economiaTotal25Anos.toFixed(2)),
    economiaTotal26Anos: Number(ecoAcum.toFixed(2)),
    gastoTotalSemSolar25Anos: Number(gastoTotalSemSolar25Anos.toFixed(2)),
    gastoTotalSemSolar26Anos: Number(gastoAcum.toFixed(2)),
    economiaPrimeiroAno,
    valorPerdidoPorMesPostergacao,
    linhas,
  }
}
