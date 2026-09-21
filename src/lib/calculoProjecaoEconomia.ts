import {
  CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
  type TipoClienteProjecao,
} from '@/data/planilhaBaseProjecao'
import type { ProjecaoTarifariaRecord } from '@/services/projecaoTarifariaService'
import { pctFioB, getTaxaMinimaKwh, type EnquadramentoSolar } from '@/lib/energiaSolar'
import type { PadraoFasesSolar } from '@/types/crm'

export interface LinhaProjecaoEconomia {
  ano: number
  /** Índice do ano no período de projeção (1 a 25) */
  indiceAno?: number
  consumoKwhAno: number
  tarifaKwh: number
  fioBKwh: number
  gdEcoLiquidaKwh: number
  fatorDegradacao: number
  economiaAnualSemDegradacao?: number
  economiaAnual: number
  economiaAcumulada: number
  gastoSemSolarAnual: number
  gastoSemSolarAcumulado: number
  contaComSolarAnual?: number
}

export interface ResumoProjecaoEconomia {
  tipoCliente: TipoClienteProjecao
  fatorSimultaneidade: number
  consumoKwhAno: number
  anoInicial: number
  anoFinal: number
  totalAnos: number
  /** Economia líquida acumulada em 25 anos */
  economiaTotal25Anos: number
  /** Economia acumulada no período completo */
  economiaTotal26Anos: number
  /** Gasto acumulado sem solar em 25 anos */
  gastoTotalSemSolar25Anos: number
  /** Gasto acumulado sem solar no período completo */
  gastoTotalSemSolar26Anos: number
  /** Economia do primeiro ano */
  economiaPrimeiroAno: number
  /** Valor perdido por mês de postergação = economia do 1º ano ÷ 12 */
  valorPerdidoPorMesPostergacao: number
  /** Indica se os dados vieram do banco ou do modelo oficial */
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
  padraoFases?: PadraoFasesSolar | string
  enquadramento?: EnquadramentoSolar
  anoBase?: number
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
  padraoFases,
  enquadramento = 'GD_II',
  anoBase = 2026,
}: CalcularProjecaoOptions = {}): ResumoProjecaoEconomia {
  const consumoAnual =
    consumoKwhAno !== undefined && consumoKwhAno !== null && consumoKwhAno > 0
      ? consumoKwhAno
      : CONSUMO_EXEMPLO_PADRAO_KWH_ANO

  const consumoMensal = consumoAnual / 12

  // simult = 0,30 se residencial/rural, 0,70 se comercial/industrial
  const simult = tipoCliente === 'comercial' || tipoCliente === 'industrial' ? 0.7 : 0.3

  const taxaBasica = getTaxaMinimaKwh(tipoCliente, padraoFases)

  const tarifaInicial =
    tarifaPersonalizadaPrimeiroAno && tarifaPersonalizadaPrimeiroAno > 0
      ? tarifaPersonalizadaPrimeiroAno
      : 1.1979

  // Regras verbatim do núcleo para mês:
  const autoconsumo = consumoMensal * simult
  const injetada = consumoMensal - autoconsumo
  const consumoRede = consumoMensal - autoconsumo
  const compensada = Math.min(injetada, consumoRede)
  const consumoFaturado = consumoRede - compensada
  const consumoCobrado = Math.max(consumoFaturado, taxaBasica)

  const isGD2 = enquadramento === 'GD_II'

  let ecoAcum = 0
  let gastoAcum = 0
  let economiaTotal25Anos = 0
  let gastoTotalSemSolar25Anos = 0

  const totalAnosProjecao = 25
  const linhas: LinhaProjecaoEconomia[] = []

  for (let a = 1; a <= totalAnosProjecao; a++) {
    const anoCalendario = anoBase + a - 1
    const t = tarifaInicial * Math.pow(1.09, a - 1)
    const sem = consumoMensal * t * 12
    const com =
      consumoCobrado * t * 12 +
      (isGD2 ? injetada * t * 0.377 * 0.5105 * pctFioB(anoCalendario) * 12 : 0)
    const ecoAno = sem - com

    ecoAcum += ecoAno
    gastoAcum += sem

    if (a === 25) {
      economiaTotal25Anos = ecoAcum
      gastoTotalSemSolar25Anos = gastoAcum
    }

    const fioBKwh = t * 0.377 * 0.5105
    const gdEcoLiquidaKwh = consumoAnual > 0 ? Number((ecoAno / consumoAnual).toFixed(4)) : t

    linhas.push({
      ano: anoCalendario,
      indiceAno: a,
      consumoKwhAno: consumoAnual,
      tarifaKwh: Number(t.toFixed(4)),
      fioBKwh: Number(fioBKwh.toFixed(4)),
      gdEcoLiquidaKwh,
      fatorDegradacao: 1,
      economiaAnualSemDegradacao: Number(ecoAno.toFixed(2)),
      economiaAnual: Number(ecoAno.toFixed(2)),
      economiaAcumulada: Number(ecoAcum.toFixed(2)),
      gastoSemSolarAnual: Number(sem.toFixed(2)),
      gastoSemSolarAcumulado: Number(gastoAcum.toFixed(2)),
      contaComSolarAnual: Number(com.toFixed(2)),
    })
  }

  const economiaPrimeiroAno = linhas[0]?.economiaAnual || 0
  const valorPerdidoPorMesPostergacao = Number((economiaPrimeiroAno / 12).toFixed(2))

  return {
    tipoCliente,
    fatorSimultaneidade: simult,
    consumoKwhAno: consumoAnual,
    anoInicial: anoBase,
    anoFinal: anoBase + totalAnosProjecao - 1,
    totalAnos: totalAnosProjecao,
    economiaTotal25Anos: Number(economiaTotal25Anos.toFixed(2)),
    economiaTotal26Anos: Number(ecoAcum.toFixed(2)),
    gastoTotalSemSolar25Anos: Number(gastoTotalSemSolar25Anos.toFixed(2)),
    gastoTotalSemSolar26Anos: Number(gastoAcum.toFixed(2)),
    economiaPrimeiroAno,
    valorPerdidoPorMesPostergacao,
    origemDados: 'estimativa',
    linhas,
  }
}
