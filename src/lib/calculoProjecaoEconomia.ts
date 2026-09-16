import {
  TABELA_REFERENCIA_BASE,
  FATORES_SIMULTANEIDADE,
  CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
  getFatorDegradacaoPainel,
  type TipoClienteProjecao,
} from '@/data/planilhaBaseProjecao'
import type { ProjecaoTarifariaRecord } from '@/services/projecaoTarifariaService'

export interface LinhaProjecaoEconomia {
  ano: number
  /** Índice do ano no período de projeção (1 a 26) */
  indiceAno?: number
  consumoKwhAno: number
  tarifaKwh: number
  fioBKwh: number
  gdEcoLiquidaKwh: number
  /** Fator de degradação do módulo solar aplicado neste ano (ex: 0.98 no ano 1, 0.848 no ano 25) */
  fatorDegradacao: number
  /** Economia anual nominal sem degradação */
  economiaAnualSemDegradacao?: number
  /** Economia anual efetiva considerando a degradação dos painéis */
  economiaAnual: number
  /** Economia acumulada somando a economia anual degradada */
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
  /** Indica se os dados vieram do banco (planilha importada) ou do fallback estimado */
  origemDados: 'banco' | 'estimativa'
  /** Projeção completa linha a linha */
  linhas: LinhaProjecaoEconomia[]
}

export interface CalcularProjecaoOptions {
  tipoCliente?: TipoClienteProjecao
  consumoKwhAno?: number
  tarifaPersonalizadaPrimeiroAno?: number
  /** Registros da coleção projecao_tarifaria (quando existirem) */
  dadosTarifariosCustomizados?: ProjecaoTarifariaRecord[] | null
}

/**
 * Calcula a Projeção de Economia na Conta de Energia ano a ano (2026-2051).
 *
 * Se `dadosTarifariosCustomizados` tiver registros para o `tipoCliente`, utiliza
 * diretamente as tarifas, fio B e GD Eco Líquida importadas da planilha do usuário.
 *
 * Caso contrário, utiliza o fallback da tabela de referência estimada interna
 * com reajuste de 9% a.a. e metodologia da Lei 14.300.
 *
 * Fórmulas preservadas:
 * - Economia Anual (R$) = Consumo Anual * GD Eco Líquida * Fator Degradação (LID 2% ano 1 + 0,55% a.a.)
 * - Gasto Sem Solar (R$) = Consumo Anual * Tarifa (sem alteração — usa tarifa cheia sobre consumo)
 * - Economia Acumulada soma a Economia Anual (com degradação) ano a ano.
 * - Gasto Acumulado soma o Gasto Sem Solar ano a ano.
 * - Valor perdido por mês de postergação = Economia do 1º ano / 12 (com degradação do 1º ano).
 */
export function calcularProjecaoEconomia({
  tipoCliente = 'residencial',
  consumoKwhAno,
  tarifaPersonalizadaPrimeiroAno,
  dadosTarifariosCustomizados,
}: CalcularProjecaoOptions = {}): ResumoProjecaoEconomia {
  const consumoFinal =
    consumoKwhAno !== undefined && consumoKwhAno !== null && consumoKwhAno > 0
      ? consumoKwhAno
      : CONSUMO_EXEMPLO_PADRAO_KWH_ANO

  const fatorSimultaneidade = FATORES_SIMULTANEIDADE[tipoCliente] ?? 0.3
  const parcelaInjetada = 1 - fatorSimultaneidade

  // Verificar se há dados importados no banco válidos para este tipoCliente
  const dadosBanco = (dadosTarifariosCustomizados || [])
    .filter((d) => d.tipo_cliente === tipoCliente)
    .sort((a, b) => a.ano - b.ano)

  const usarDadosBanco = dadosBanco.length > 0
  const origemDados: 'banco' | 'estimativa' = usarDadosBanco ? 'banco' : 'estimativa'

  let ecoAcum = 0
  let gastoAcum = 0
  let economiaTotal25Anos = 0
  let gastoTotalSemSolar25Anos = 0

  let linhas: LinhaProjecaoEconomia[] = []

  if (usarDadosBanco) {
    // Usar os dados da planilha oficial importada no banco
    linhas = dadosBanco.map((rec, idx) => {
      const indiceAno = idx + 1
      const fatorDegradacao = getFatorDegradacaoPainel(indiceAno)
      const tarifaKwh = Number(rec.tarifa_kwh || 0)
      const fioBKwh = Number(rec.fio_b_kwh || 0)

      // Se a GD Eco Líquida já veio informada na planilha, usamos ela; se zero, calcula pela fórmula
      let gdEcoLiquidaKwh = Number(rec.gd_eco_liquida || 0)
      if (!gdEcoLiquidaKwh && tarifaKwh) {
        gdEcoLiquidaKwh = Number((tarifaKwh - fioBKwh * parcelaInjetada).toFixed(4))
      }

      // Aplica a degradação anual dos painéis fotovoltaicos sobre a economia anual
      const economiaAnualSemDegradacao = Number((consumoFinal * gdEcoLiquidaKwh).toFixed(2))
      const economiaAnual = Number((consumoFinal * gdEcoLiquidaKwh * fatorDegradacao).toFixed(2))
      const gastoSemSolarAnual = Number((consumoFinal * tarifaKwh).toFixed(2))

      ecoAcum += economiaAnual
      gastoAcum += gastoSemSolarAnual

      if (idx === 24) {
        economiaTotal25Anos = ecoAcum
        gastoTotalSemSolar25Anos = gastoAcum
      }

      return {
        ano: rec.ano,
        indiceAno,
        consumoKwhAno: consumoFinal,
        tarifaKwh,
        fioBKwh,
        gdEcoLiquidaKwh,
        fatorDegradacao,
        economiaAnualSemDegradacao,
        economiaAnual,
        economiaAcumulada: Number(ecoAcum.toFixed(2)),
        gastoSemSolarAnual,
        gastoSemSolarAcumulado: Number(gastoAcum.toFixed(2)),
      }
    })
  } else {
    // Usar o fallback da tabela estimada interna (com reajuste de 9% a.a.)
    let multiplicadorTarifa = 1
    if (
      tarifaPersonalizadaPrimeiroAno &&
      tarifaPersonalizadaPrimeiroAno > 0 &&
      TABELA_REFERENCIA_BASE[0]
    ) {
      multiplicadorTarifa = tarifaPersonalizadaPrimeiroAno / TABELA_REFERENCIA_BASE[0].tarifaBase
    }

    linhas = TABELA_REFERENCIA_BASE.map((ref, idx) => {
      const indiceAno = idx + 1
      const fatorDegradacao = getFatorDegradacaoPainel(indiceAno)
      const tarifaKwh = Number((ref.tarifaBase * multiplicadorTarifa).toFixed(4))
      const fioBKwh = Number((ref.fioBEfetivo * multiplicadorTarifa).toFixed(4))

      const gdEcoLiquidaKwh = Number((tarifaKwh - fioBKwh * parcelaInjetada).toFixed(4))
      const economiaAnualSemDegradacao = Number((consumoFinal * gdEcoLiquidaKwh).toFixed(2))
      const economiaAnual = Number((consumoFinal * gdEcoLiquidaKwh * fatorDegradacao).toFixed(2))
      const gastoSemSolarAnual = Number((consumoFinal * tarifaKwh).toFixed(2))

      ecoAcum += economiaAnual
      gastoAcum += gastoSemSolarAnual

      if (idx === 24) {
        economiaTotal25Anos = ecoAcum
        gastoTotalSemSolar25Anos = gastoAcum
      }

      return {
        ano: ref.ano,
        indiceAno,
        consumoKwhAno: consumoFinal,
        tarifaKwh,
        fioBKwh,
        gdEcoLiquidaKwh,
        fatorDegradacao,
        economiaAnualSemDegradacao,
        economiaAnual,
        economiaAcumulada: Number(ecoAcum.toFixed(2)),
        gastoSemSolarAnual,
        gastoSemSolarAcumulado: Number(gastoAcum.toFixed(2)),
      }
    })
  }

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
    origemDados,
    linhas,
  }
}
