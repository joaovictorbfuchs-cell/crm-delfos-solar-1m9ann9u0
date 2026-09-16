import { describe, it, expect } from 'vitest'
import { calcularProjecaoEconomia } from './calculoProjecaoEconomia'
import {
  TABELA_REFERENCIA_BASE,
  FATORES_SIMULTANEIDADE,
  CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
} from '@/data/planilhaBaseProjecao'

describe('Cálculo da Projeção de Economia na Conta de Energia (2026-2051)', () => {
  it('deve conter exatamente 26 anos na tabela de referência (2026 a 2051)', () => {
    expect(TABELA_REFERENCIA_BASE).toHaveLength(26)
    expect(TABELA_REFERENCIA_BASE[0].ano).toBe(2026)
    expect(TABELA_REFERENCIA_BASE[25].ano).toBe(2051)
  })

  it('deve aplicar os fatores de simultaneidade corretos: Residencial (30%) e Comercial (70%)', () => {
    expect(FATORES_SIMULTANEIDADE.residencial).toBe(0.3)
    expect(FATORES_SIMULTANEIDADE.comercial).toBe(0.7)

    const projRes = calcularProjecaoEconomia({ tipoCliente: 'residencial' })
    const projCom = calcularProjecaoEconomia({ tipoCliente: 'comercial' })

    expect(projRes.fatorSimultaneidade).toBe(0.3)
    expect(projCom.fatorSimultaneidade).toBe(0.7)
  })

  it('deve calcular corretamente a projeção com o consumo de exemplo de 4.807,08 kWh/ano', () => {
    const proj = calcularProjecaoEconomia({
      tipoCliente: 'residencial',
      consumoKwhAno: CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
    })

    expect(proj.consumoKwhAno).toBe(4807.08)
    expect(proj.totalAnos).toBe(26)
    expect(proj.linhas).toHaveLength(26)

    // Ano 1: 2026
    const linha1 = proj.linhas[0]
    expect(linha1.ano).toBe(2026)
    expect(linha1.consumoKwhAno).toBe(4807.08)
    expect(linha1.tarifaKwh).toBe(0.985)
    expect(linha1.fioBKwh).toBe(0.171)

    // GD Eco Líquida Residencial = Tarifa - Fio B * (1 - 0.3) = 0.985 - 0.171 * 0.7 = 0.985 - 0.1197 = 0.8653
    expect(linha1.gdEcoLiquidaKwh).toBe(0.8653)

    // Economia 1º ano
    const ecoEsperada1 = Number((4807.08 * 0.8653).toFixed(2))
    expect(linha1.economiaAnual).toBe(ecoEsperada1)

    // Gasto sem solar 1º ano
    const gastoEsperado1 = Number((4807.08 * 0.985).toFixed(2))
    expect(linha1.gastoSemSolarAnual).toBe(gastoEsperado1)

    // Valor perdido por mês de postergação = economia ano 1 / 12
    expect(proj.valorPerdidoPorMesPostergacao).toBe(Number((ecoEsperada1 / 12).toFixed(2)))
  })

  it('cenário Comercial deve render maior economia que Residencial devido à simultaneidade de 70%', () => {
    const res = calcularProjecaoEconomia({
      tipoCliente: 'residencial',
      consumoKwhAno: CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
    })
    const com = calcularProjecaoEconomia({
      tipoCliente: 'comercial',
      consumoKwhAno: CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
    })

    // No Comercial, apenas 30% da energia paga Fio B vs 70% no Residencial.
    // Portanto a GD Eco Líquida comercial deve ser estritamente maior que residencial.
    expect(com.linhas[0].gdEcoLiquidaKwh).toBeGreaterThan(res.linhas[0].gdEcoLiquidaKwh)
    expect(com.economiaTotal25Anos).toBeGreaterThan(res.economiaTotal25Anos)
    expect(com.valorPerdidoPorMesPostergacao).toBeGreaterThan(res.valorPerdidoPorMesPostergacao)
  })

  it('colunas acumuladas devem ser monotonamente crescentes', () => {
    const proj = calcularProjecaoEconomia({
      tipoCliente: 'residencial',
      consumoKwhAno: CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
    })

    for (let i = 1; i < proj.linhas.length; i++) {
      expect(proj.linhas[i].economiaAcumulada).toBeGreaterThan(proj.linhas[i - 1].economiaAcumulada)
      expect(proj.linhas[i].gastoSemSolarAcumulado).toBeGreaterThan(
        proj.linhas[i - 1].gastoSemSolarAcumulado,
      )
    }

    // Economia total em 25 anos deve ser positiva e substancial
    expect(proj.economiaTotal25Anos).toBeGreaterThan(50000)
    expect(proj.gastoTotalSemSolar25Anos).toBeGreaterThan(proj.economiaTotal25Anos)
  })
})
