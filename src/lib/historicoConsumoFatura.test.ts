import { describe, it, expect } from 'vitest'
import {
  extrairAnoMes,
  formatarRotuloMesAno,
  normalizarEOordenarHistorico,
  calcularMetricasHistorico,
} from './historicoConsumoFatura'

describe('historicoConsumoFatura utils', () => {
  it('converte diferentes formatos de mes_ano corretamente', () => {
    expect(extrairAnoMes('SET 26')).toEqual({ ano: 2026, mes: 9 })
    expect(extrairAnoMes('AGO 26')).toEqual({ ano: 2026, mes: 8 })
    expect(extrairAnoMes('SET 25')).toEqual({ ano: 2025, mes: 9 })
    expect(extrairAnoMes('Mar/25')).toEqual({ ano: 2025, mes: 3 })
    expect(extrairAnoMes('03/2025')).toEqual({ ano: 2025, mes: 3 })
    expect(extrairAnoMes('2025-03')).toEqual({ ano: 2025, mes: 3 })
    expect(extrairAnoMes('Dezembro 2024')).toEqual({ ano: 2024, mes: 12 })
    expect(extrairAnoMes('jan/24')).toEqual({ ano: 2024, mes: 1 })
    expect(extrairAnoMes('FEV/26')).toEqual({ ano: 2026, mes: 2 })
  })

  it('formata o rótulo no padrão MMM/YY', () => {
    expect(formatarRotuloMesAno(2026, 9)).toBe('SET/26')
    expect(formatarRotuloMesAno(2025, 3)).toBe('MAR/25')
    expect(formatarRotuloMesAno(2024, 12)).toBe('DEZ/24')
  })

  it('ordena o histórico cronologicamente do mais antigo para o mais recente', () => {
    const listaFaturaRGEOriginal = [
      { mes_ano: 'SET 26', consumo_kwh: 132, dias_ciclo: 29 },
      { mes_ano: 'AGO 26', consumo_kwh: 124, dias_ciclo: 30 },
      { mes_ano: 'JUL 26', consumo_kwh: 264, dias_ciclo: 32 },
      { mes_ano: 'JUN 26', consumo_kwh: 143, dias_ciclo: 30 },
      { mes_ano: 'MAI 26', consumo_kwh: 74, dias_ciclo: 30 },
      { mes_ano: 'ABR 26', consumo_kwh: 118, dias_ciclo: 31 },
      { mes_ano: 'MAR 26', consumo_kwh: 145, dias_ciclo: 30 },
      { mes_ano: 'FEV 26', consumo_kwh: 115, dias_ciclo: 28 },
      { mes_ano: 'JAN 26', consumo_kwh: 79, dias_ciclo: 29 },
      { mes_ano: 'DEZ 25', consumo_kwh: 96, dias_ciclo: 33 },
      { mes_ano: 'NOV 25', consumo_kwh: 71, dias_ciclo: 29 },
      { mes_ano: 'OUT 25', consumo_kwh: 90, dias_ciclo: 33 },
      { mes_ano: 'SET 25', consumo_kwh: 1, dias_ciclo: 30 },
    ]

    const ordenado = normalizarEOordenarHistorico(listaFaturaRGEOriginal)

    expect(ordenado).toHaveLength(13)
    // Primeiro mês deve ser o mais antigo (SET/25)
    expect(ordenado[0].mes_ano).toBe('SET/25')
    expect(ordenado[0].consumo_kwh).toBe(1)
    expect(ordenado[0].dias_ciclo).toBe(30)

    // Segundo mês: OUT/25
    expect(ordenado[1].mes_ano).toBe('OUT/25')
    expect(ordenado[1].consumo_kwh).toBe(90)

    // Último mês deve ser o mais recente (SET/26)
    expect(ordenado[12].mes_ano).toBe('SET/26')
    expect(ordenado[12].consumo_kwh).toBe(132)
    expect(ordenado[12].dias_ciclo).toBe(29)
  })

  it('deduplica itens com o mesmo mês/ano', () => {
    const listaComDuplicatas = [
      { mes_ano: 'SET 26', consumo_kwh: 132, dias_ciclo: 29 },
      { mes_ano: 'Set/26', consumo_kwh: 132, dias_ciclo: 29 },
      { mes_ano: 'AGO 26', consumo_kwh: 124, dias_ciclo: 30 },
    ]

    const deduplicado = normalizarEOordenarHistorico(listaComDuplicatas)
    expect(deduplicado).toHaveLength(2)
    expect(deduplicado[0].mes_ano).toBe('AGO/26')
    expect(deduplicado[1].mes_ano).toBe('SET/26')
  })

  it('calcula métricas corretamente a partir do histórico normalizado', () => {
    const historico = normalizarEOordenarHistorico([
      { mes_ano: 'SET 25', consumo_kwh: 100, dias_ciclo: 30 },
      { mes_ano: 'OUT 25', consumo_kwh: 200, dias_ciclo: 30 },
      { mes_ano: 'NOV 25', consumo_kwh: 300, dias_ciclo: 30 },
    ])

    const metricas = calcularMetricasHistorico(historico)
    expect(metricas.quantidade_meses_historico).toBe(3)
    expect(metricas.somatorio_consumo_anual_kwh).toBe(600)
    expect(metricas.media_mensal_consumo_kwh).toBe(200)
    expect(metricas.consumo_medio_diario_kwh).toBeCloseTo(6.67, 1)
    expect(metricas.maior_consumo_periodo).toEqual({ mes_ano: 'NOV/25', consumo_kwh: 300 })
    expect(metricas.menor_consumo_periodo).toEqual({ mes_ano: 'SET/25', consumo_kwh: 100 })
  })
})
