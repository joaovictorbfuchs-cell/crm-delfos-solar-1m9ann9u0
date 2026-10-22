import { describe, it, expect } from 'vitest'
import { dimensionarSistemaBaterias, calcularCustosBateria } from './bateriaCalculos'

describe('bateriaCalculos', () => {
  it('dimensiona corretamente a capacidade com base em consumo diário e horas de autonomia', () => {
    const res = dimensionarSistemaBaterias({
      consumoCriticoKwhDia: 12, // 0.5 kWh/hora
      autonomiaHorasDesejada: 10, // 5 kWh úteis necessários
      profundidadeDescargaDod: 90, // 90%
      eficienciaSistema: 90, // 90%
    })

    // 5 kWh / (0.9 * 0.9) = 5 / 0.81 = 6.17 kWh nominal
    expect(res.capacidadeUtilNecessariaKwh).toBe(5)
    expect(res.capacidadeNominalMinimaKwh).toBeCloseTo(6.17, 1)
    expect(res.quantidadeModulosSugerida).toBe(2) // 2 modulos de 5.12 kWh cobrem 6.17 kWh
    expect(res.potenciaInversorSugeridaKw).toBeGreaterThanOrEqual(3)
  })

  it('calcula custos de baterias garantindo fechamento contábil e alíquotas da Delfos', () => {
    const custos = calcularCustosBateria({
      materiaisEquipamentos: 20000,
      materiaisExtras: 1500,
      maoDeObra: 2000,
      riscoEngenharia: 500,
      opcaoImposto: 2,
      percentualAdministracaoAuto: 0.15,
      percentualIndicacaoAuto: 0,
    })

    expect(custos.valorTotal).toBeGreaterThan(24000)
    expect(custos.impostos).toBeGreaterThan(0)
    expect(custos.administracao).toBeGreaterThan(0)
    expect(custos.comissaoComercial).toBeGreaterThanOrEqual(600) // Piso de comissão

    // Invariante de soma: Base + Impostos + Admin + Comissao + Indicacao == Total
    const soma =
      24000 + custos.impostos + custos.administracao + custos.comissaoComercial + custos.indicacao
    expect(Math.abs(soma - custos.valorTotal)).toBeLessThanOrEqual(0.02)
  })
})
