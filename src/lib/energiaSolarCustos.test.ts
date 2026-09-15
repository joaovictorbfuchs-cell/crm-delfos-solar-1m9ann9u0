import { describe, it, expect } from 'vitest'
import { calcularCustosAba } from './energiaSolar'

describe('calcularCustosAba - Desconto e Comissão Mínima', () => {
  it('aplica desconto apenas na base de administração e comissão comercial', () => {
    // Cenário base com materiais = 10000, mão de obra = 1500, risco = 400
    // subtotalBase = 11900
    // Opção 1: valorTotal = (11900 * 1.18) / 0.8838 = 15888.21, impostos = 1429.94
    // somaComImpostos = 11900 + 1429.94 = 13329.94
    const resSemDesconto = calcularCustosAba({
      materiais: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 0,
    })

    const resComDesconto = calcularCustosAba({
      materiais: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 1000,
    })

    // Desconto NÃO altera impostos nem valor total do projeto
    expect(resComDesconto.impostos).toBe(resSemDesconto.impostos)
    expect(resComDesconto.valorTotal).toBe(resSemDesconto.valorTotal)
    expect(resComDesconto.somaComImpostos).toBe(resSemDesconto.somaComImpostos)

    // Base com desconto reduz exatamente em 1000
    expect(resComDesconto.baseComDesconto).toBe(
      Math.round((resSemDesconto.somaComImpostos - 1000) * 100) / 100,
    )

    // Administração passa a ser (baseComDesconto * 0.15)
    expect(resComDesconto.administracao).toBe(
      Math.round(resComDesconto.baseComDesconto * 0.15 * 100) / 100,
    )
    expect(resComDesconto.administracao).toBeLessThan(resSemDesconto.administracao)
    expect(resComDesconto.administracaoDescontada).toBe(
      Math.round((resSemDesconto.administracao - resComDesconto.administracao) * 100) / 100,
    )

    // Indicação agora também reflete o desconto: (baseComDesconto * 0.01)
    expect(resComDesconto.indicacao).toBe(
      Math.round(resComDesconto.baseComDesconto * 0.01 * 100) / 100,
    )
    expect(resComDesconto.indicacao).toBeLessThan(resSemDesconto.indicacao)
    expect(resComDesconto.indicacaoDescontada).toBe(
      Math.round((resSemDesconto.indicacao - resComDesconto.indicacao) * 100) / 100,
    )

    // Percentual do desconto em relação ao projeto
    const expectedPct = Math.round((1000 / resSemDesconto.valorTotal) * 100 * 100) / 100
    expect(resComDesconto.percentualDescontoProjeto).toBe(expectedPct)
  })

  it('aplica piso de R$ 600 na comissão se 3% for menor que 600 e exibe o 3% puro ao lado', () => {
    // Base pequena onde 3% é bem menor que 600 (ex: subtotalBase = 5000)
    // somaComImpostos ~ 5600 -> 3% ~ 168
    const res = calcularCustosAba({
      materiais: 3000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 0,
    })

    expect(res.comissaoPura3Pct).toBeLessThan(600)
    expect(res.comissaoComercial).toBe(600)
    expect(res.comissaoUsouPisoMinimo).toBe(true)
  })

  it('mantém comissão superior a 600 quando 3% ultrapassar o piso', () => {
    // Base grande: materiais = 30000, 3% > 600
    const res = calcularCustosAba({
      materiais: 30000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 0,
    })

    expect(res.comissaoPura3Pct).toBeGreaterThan(600)
    expect(res.comissaoComercial).toBe(res.comissaoPura3Pct)
    expect(res.comissaoUsouPisoMinimo).toBe(false)
  })

  it('reflete o desconto proporcionalmente na comissão quando acima do piso', () => {
    const resSemDesc = calcularCustosAba({
      materiais: 30000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 0,
    })

    const resComDesc = calcularCustosAba({
      materiais: 30000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 2000,
    })

    expect(resComDesc.comissaoUsouPisoMinimo).toBe(false)
    expect(resComDesc.comissaoComercial).toBe(
      Math.round(resComDesc.baseComDesconto * 0.03 * 100) / 100,
    )
    expect(resComDesc.comissaoDescontada).toBe(
      Math.round((resSemDesc.comissaoComercial - resComDesc.comissaoComercial) * 100) / 100,
    )
    expect(resComDesc.comissaoDescontada).toBe(60) // 2000 * 0.03 = 60
    expect(resComDesc.administracaoDescontada).toBe(300) // 2000 * 0.15 = 300
    expect(resComDesc.indicacaoDescontada).toBe(20) // 2000 * 0.01 = 20
  })

  it('respeita piso de 600 na comissão mesmo com desconto e calcula diferença efetiva descontada', () => {
    const resComDescPiso = calcularCustosAba({
      materiais: 3000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 500,
    })

    expect(resComDescPiso.comissaoComercial).toBe(600)
    expect(resComDescPiso.comissaoUsouPisoMinimo).toBe(true)
    // Como ambos sem desconto e com desconto batem no piso de 600, o valor descontado efetivo na comissão é 0
    expect(resComDescPiso.comissaoDescontada).toBe(0)
    // Mas administração e indicação continuam com o desconto proporcional
    expect(resComDescPiso.administracaoDescontada).toBe(75) // 500 * 0.15 = 75
    expect(resComDescPiso.indicacaoDescontada).toBe(5) // 500 * 0.01 = 5
  })
})
