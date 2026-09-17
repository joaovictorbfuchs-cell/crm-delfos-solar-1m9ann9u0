import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { SecaoCustoInercia } from './SecaoCustoInercia'

describe('SecaoCustoInercia Component', () => {
  it('renderiza com dados de fallback padrão', () => {
    const html = renderToStaticMarkup(React.createElement(SecaoCustoInercia, {}))

    // Título e badge
    expect(html).toContain('Situação Atual')
    expect(html).toContain('Diagnóstico de Consumo e Custos Recorrentes')

    // 2 grandes cards organizados (Consumo de Energia e Custos com Concessionária)
    expect(html).toContain('Consumo de Energia')
    expect(html).toContain('Custos com Concessionária')

    // Conector visual removido conforme solicitação do usuário
    expect(html).not.toContain('Convertido em')
    expect(html).not.toContain('Consumo gera o custo')

    // Valores mensal e anual empilhados para consumo
    expect(html).toContain('Consumo Mensal')
    expect(html).toContain('Consumo no Ano')
    expect(html).toContain('kWh/mês')
    expect(html).toContain('kWh/ano')

    // Valores mensal e anual empilhados para custos
    expect(html).toContain('Custo Mensal')
    expect(html).toContain('Custo no Ano')
    expect(html).toContain('Conta Atual')
    expect(html).toContain('Gasto Anual')

    // Marcos acumulados 1, 5 e 25 anos
    expect(html).toContain('1 ano')
    expect(html).toContain('5 anos')
    expect(html).toContain('25 anos')

    // Alerta de perda acumulada e linha reflexiva
    expect(html).toContain('Alerta de Perda Acumulada')
    expect(html).toContain('Decisão Inteligente • Concessionária vs. Patrimônio Solar')
  })

  it('respeita os valores dinâmicos informados via props', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoCustoInercia, {
        consumoMensalKwh: 850,
        consumoAnualKwh: 10200,
        contaMensal: 807.5,
        contaAnual: 9690,
        gastoSemSolar5Anos: 62000,
        valorInvestimento: 34000,
      }),
    )

    // Consumo Mensal e Anual
    expect(html).toContain('850')
    expect(html).toContain('10.200')
    expect(html).toContain('kWh/mês')
    expect(html).toContain('kWh/ano')

    // Custos formatados
    expect(html).toContain('807,50')
    expect(html).toContain('9.690,00')

    // 2 cards em grid
    expect(html).toContain('grid-cols-1 md:grid-cols-2')

    // Não deve conter o conector
    expect(html).not.toContain('Convertido em')
  })

  it('lida defensivamente com consumo ou custo zero sem erro', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoCustoInercia, {
        consumoMensalKwh: 0,
        contaMensal: 0,
      }),
    )

    expect(html).toContain('Situação Atual')
    expect(html).not.toContain('Convertido em')
    // Não quebrou e não gerou NaN ou Infinity
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('Infinity')
  })
})
