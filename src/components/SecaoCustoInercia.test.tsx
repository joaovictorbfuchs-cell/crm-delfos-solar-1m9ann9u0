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

    // Gastos Acumulados Sem Solar em 3 grandes cards
    expect(html).toContain('Gastos Acumulados Sem Solar: 1, 5 e 25 Anos')
    expect(html).toContain('Gasto em 1 Ano')
    expect(html).toContain('Gasto em 5 Anos')
    expect(html).toContain('Gasto em 25 Anos')
    expect(html).toContain('Valores Acumulados em Reais')
    expect(html).toContain('Curto prazo')
    expect(html).toContain('Médio prazo')
    expect(html).toContain('Longo prazo')
    expect(html).toContain('Média mensal:')

    // Não deve conter barras ou comparação com solar nesta seção
    expect(html).not.toContain('Com energia solar Delfos')
    expect(html).not.toContain('recharts')

    // Não deve conter o alerta vermelho de perda acumulada ("esta parte pode retirar")
    expect(html).not.toContain('Alerta de Perda Acumulada')
    expect(html).not.toContain('Esse dinheiro poderia estar no seu bolso')
    expect(html).not.toContain('Gasto Sem Retorno')

    // Mantém a linha reflexiva intacta
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

    // 2 cards em grid de consumo e custos
    expect(html).toContain('grid-cols-1 md:grid-cols-2')

    // 3 cards de gastos acumulados sem solar
    expect(html).toContain('Gasto em 1 Ano')
    expect(html).toContain('Gasto em 5 Anos')
    expect(html).toContain('Gasto em 25 Anos')
    expect(html).toContain('62.000,00')

    // Não deve conter o conector
    expect(html).not.toContain('Convertido em')
  })

  it('renderiza card do meio dinâmico com payback de 22 meses -> Gasto em 2 Anos', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoCustoInercia, {
        contaMensal: 1000,
        contaAnual: 12000,
        paybackMeses: 22,
      }),
    )

    // 22 meses / 12 = 1.83 -> arredonda para cima para 2 anos
    expect(html).toContain('Gastos Acumulados Sem Solar: 1, 2 Anos e 25 Anos')
    expect(html).toContain('Gasto em 2 Anos')

    // Gasto acumulado em 2 anos com reajuste de 9% a.a.:
    // ano 0: 12.000, ano 1: 12.000 * 1.09 = 13.080 -> total = 25.080
    expect(html).toContain('25.080,00')
  })

  it('renderiza card do meio dinâmico com payback de 25 meses -> Gasto em 3 Anos', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoCustoInercia, {
        contaMensal: 1000,
        contaAnual: 12000,
        paybackMeses: 25,
      }),
    )

    // 25 meses / 12 = 2.08 -> arredonda para cima para 3 anos
    expect(html).toContain('Gastos Acumulados Sem Solar: 1, 3 Anos e 25 Anos')
    expect(html).toContain('Gasto em 3 Anos')

    // Gasto acumulado em 3 anos com reajuste de 9% a.a.:
    // ano 0: 12.000, ano 1: 13.080, ano 2: 12.000 * (1.09)^2 = 14.257,20 -> total = 39.337,20 (arredondado 39.337)
    expect(html).toContain('39.337,00')
  })

  it('aplica fallback para 5 anos quando investimento ou economia forem inválidos/zerados', () => {
    const htmlSemPayback = renderToStaticMarkup(
      React.createElement(SecaoCustoInercia, {
        contaMensal: 1000,
        contaAnual: 12000,
        paybackMeses: 0,
        valorInvestimento: 0,
        economiaMensal: 0,
      }),
    )

    // Fallback padrão de 5 anos
    expect(htmlSemPayback).toContain('Gastos Acumulados Sem Solar: 1, 5 Anos e 25 Anos')
    expect(htmlSemPayback).toContain('Gasto em 5 Anos')
  })

  it('calcula o período dinâmico a partir de valorInvestimento e economiaMensal se paybackMeses não for passado', () => {
    // 30.000 / 1.000 = 30 meses -> 30 / 12 = 2.5 anos -> arredonda para cima para 3 anos
    const htmlCalculado = renderToStaticMarkup(
      React.createElement(SecaoCustoInercia, {
        contaMensal: 1000,
        contaAnual: 12000,
        valorInvestimento: 30000,
        economiaMensal: 1000,
      }),
    )

    expect(htmlCalculado).toContain('Gastos Acumulados Sem Solar: 1, 3 Anos e 25 Anos')
    expect(htmlCalculado).toContain('Gasto em 3 Anos')
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
