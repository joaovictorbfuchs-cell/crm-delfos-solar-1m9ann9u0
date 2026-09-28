import { describe, it, expect } from 'vitest'
import { calcularStatusGarantia, getLabelTipoAtivo } from './ativosService'

describe('ativosService - calcularStatusGarantia', () => {
  it('retorna nao_informada quando data não é fornecida', () => {
    const res = calcularStatusGarantia(undefined)
    expect(res.status).toBe('nao_informada')
    expect(res.label).toBe('Não informada')
  })

  it('retorna vencida quando a data de garantia já passou', () => {
    const res = calcularStatusGarantia('2020-01-01')
    expect(res.status).toBe('vencida')
    expect(res.label).toBe('Garantia Vencida')
  })

  it('retorna proxima_vencimento quando faltam até 60 dias', () => {
    const dataFutura = new Date()
    dataFutura.setDate(dataFutura.getDate() + 15)
    const res = calcularStatusGarantia(dataFutura.toISOString().split('T')[0])
    expect(res.status).toBe('proxima_vencimento')
  })

  it('retorna vigente quando a garantia é longa', () => {
    const dataFutura = new Date()
    dataFutura.setFullYear(dataFutura.getFullYear() + 5)
    const res = calcularStatusGarantia(dataFutura.toISOString().split('T')[0])
    expect(res.status).toBe('vigente')
    expect(res.label).toBe('Garantia Vigente')
  })
})

describe('ativosService - getLabelTipoAtivo', () => {
  it('retorna label correto para tipos conhecidos', () => {
    expect(getLabelTipoAtivo('inversor')).toBe('Inversor')
    expect(getLabelTipoAtivo('placa_solar')).toContain('Placa Solar')
    expect(getLabelTipoAtivo('bateria')).toBe('Bateria')
    expect(getLabelTipoAtivo('string_box')).toBe('String Box')
  })

  it('retorna descrição personalizada para outros', () => {
    expect(getLabelTipoAtivo('outros', 'Transformador 50kVA')).toBe('Transformador 50kVA')
  })
})
