import { describe, it, expect } from 'vitest'
import { normalizarNumeroMes, parsearRelatorioSolergo } from './ocrSolergoService'

describe('ocrSolergoService', () => {
  it('normaliza strings numéricas com vírgula e ponto', () => {
    expect(normalizarNumeroMes('420')).toBe(420)
    expect(normalizarNumeroMes('420,5')).toBe(420.5)
    expect(normalizarNumeroMes('1.250,00')).toBe(1250)
    expect(normalizarNumeroMes('1,250.00')).toBe(1250)
    expect(normalizarNumeroMes('385 kWh')).toBe(385)
  })

  it('extrai os 12 meses do formato texto Solergo com nome de cada mês', () => {
    const rawText = `
      Relatório de Simulação Solergo 2025
      Produção mensal estimada (kWh):
      Janeiro: 420
      Fevereiro: 390
      Março: 380
      Abril: 330
      Maio: 290
      Junho: 270
      Julho: 280
      Agosto: 320
      Setembro: 350
      Outubro: 380
      Novembro: 400
      Dezembro: 390
      Total: 4200 kWh
    `

    const resultado = parsearRelatorioSolergo(rawText, 4807)
    expect(resultado.sucesso).toBe(true)
    expect(resultado.valoresMensais).toHaveLength(12)
    expect(resultado.valoresMensais[0]).toBe(420) // Jan
    expect(resultado.valoresMensais[5]).toBe(270) // Jun
    expect(resultado.valoresMensais[11]).toBe(390) // Dez
    expect(resultado.totalAnual).toBe(4200)
  })

  it('extrai sequência horizontal de 12 meses', () => {
    const rawText = `
      SOLERGO - Estimativa de Geração
      Jan Fev Mar Abr Mai Jun Jul Ago Set Out Nov Dez
      410 380 370 330 290 270 280 320 350 380 410 410
    `

    const resultado = parsearRelatorioSolergo(rawText, 4807)
    expect(resultado.valoresMensais).toHaveLength(12)
    expect(resultado.totalAnual).toBe(4200)
  })

  it('fornece fallback plausível quando o texto não possui todos os meses', () => {
    const rawText = 'Imagem ilegível ou ruído'
    const resultado = parsearRelatorioSolergo(rawText, 4807)
    expect(resultado.valoresMensais).toHaveLength(12)
    expect(resultado.totalAnual).toBeGreaterThan(0)
    expect(resultado.aviso).toBeDefined()
  })
})
