import { describe, it, expect } from 'vitest'
import {
  MARGIN_HORIZONTAL_007CM,
  MARGIN_VERTICAL_25MM,
  PropostaSolarPDFDocument,
  isPropostaSolarPDFInput,
} from './PropostaSolarPDFDocument'

describe('PropostaSolarPDFDocument', () => {
  it('aplica margens laterais de 0,07cm e verticais de 25mm', () => {
    // 0,07cm = 0.7mm = 0.7 * 72 / 25.4 pt = ~1.984pt
    expect(MARGIN_HORIZONTAL_007CM).toBeCloseTo(1.98, 1)
    // 25mm = 25 * 72 / 25.4 pt = ~70.87pt
    expect(MARGIN_VERTICAL_25MM).toBeCloseTo(70.87, 1)
  })

  it('exporta o componente de documento PropostaSolarPDFDocument', () => {
    expect(typeof PropostaSolarPDFDocument).toBe('function')
  })

  it('identifica corretamente PropostaSolarPDFInput', () => {
    const inputSimulado = {
      cliente: { nome: 'Carlos' },
      sistema: { potenciaKwp: 5.5 },
      calculos: { investimento: 20000 },
    }
    expect(isPropostaSolarPDFInput(inputSimulado)).toBe(true)
    expect(isPropostaSolarPDFInput({ cliente: { nome: 'Carlos' } })).toBe(false)
  })
})
