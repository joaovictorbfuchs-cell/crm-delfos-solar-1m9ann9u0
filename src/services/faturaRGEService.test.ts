import { describe, it, expect } from 'vitest'
import { isFaturaRGEProvavel } from './faturaRGEService'
import { FATURA_RGE_EXEMPLO_TEXTO } from '@/data/faturaRGESinteticaExemplo'

describe('faturaRGEService', () => {
  it('detecta corretamente se um documento ou arquivo é fatura RGE', () => {
    expect(isFaturaRGEProvavel(FATURA_RGE_EXEMPLO_TEXTO, 'fatura_mar_2025.pdf')).toBe(true)
    expect(isFaturaRGEProvavel('Comprovante de pagamento bancário', 'comprovante.png')).toBe(false)
    expect(isFaturaRGEProvavel('Conta da RGE Energia Março', 'doc.pdf')).toBe(true)
  })

  it('calcula métricas de histórico de consumo com precisão numérica', () => {
    const historicoSintetico = [
      { mes_ano: 'Mar/25', consumo_kwh: 920, dias_ciclo: 30 },
      { mes_ano: 'Fev/25', consumo_kwh: 980, dias_ciclo: 29 },
      { mes_ano: 'Jan/25', consumo_kwh: 1050, dias_ciclo: 31 },
      { mes_ano: 'Dez/24', consumo_kwh: 890, dias_ciclo: 31 },
      { mes_ano: 'Nov/24', consumo_kwh: 820, dias_ciclo: 30 },
      { mes_ano: 'Out/24', consumo_kwh: 790, dias_ciclo: 31 },
      { mes_ano: 'Set/24', consumo_kwh: 750, dias_ciclo: 30 },
      { mes_ano: 'Ago/24', consumo_kwh: 710, dias_ciclo: 31 },
      { mes_ano: 'Jul/24', consumo_kwh: 680, dias_ciclo: 31 },
      { mes_ano: 'Jun/24', consumo_kwh: 690, dias_ciclo: 30 },
      { mes_ano: 'Mai/24', consumo_kwh: 740, dias_ciclo: 31 },
      { mes_ano: 'Abr/24', consumo_kwh: 780, dias_ciclo: 30 },
    ]

    const total = historicoSintetico.reduce((acc, h) => acc + h.consumo_kwh, 0)
    const media = Math.round((total / historicoSintetico.length) * 100) / 100
    const totalDias = historicoSintetico.reduce((acc, h) => acc + h.dias_ciclo, 0)
    const mediaDiaria = Math.round((total / totalDias) * 100) / 100

    expect(total).toBe(9800)
    expect(media).toBe(816.67)
    expect(mediaDiaria).toBe(26.85)

    const maior = historicoSintetico.reduce((m, h) => (h.consumo_kwh > m.consumo_kwh ? h : m))
    const menor = historicoSintetico.reduce((m, h) => (h.consumo_kwh < m.consumo_kwh ? h : m))

    expect(maior.mes_ano).toBe('Jan/25')
    expect(maior.consumo_kwh).toBe(1050)
    expect(menor.mes_ano).toBe('Jul/24')
    expect(menor.consumo_kwh).toBe(680)
  })
})
