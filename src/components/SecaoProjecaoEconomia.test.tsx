import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { SecaoProjecaoEconomia } from './SecaoProjecaoEconomia'

describe('SecaoProjecaoEconomia Component', () => {
  it('renderiza os cards de resumo e o card de payback sem gráfico nem tabela', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoProjecaoEconomia, {
        consumoAnualCadastradoKwh: 4807.08,
        tipoClienteInicial: 'residencial',
        paybackMeses: 49,
        valorInvestimento: 30000,
      }),
    )

    // Título da seção
    expect(html).toContain('Projeção de Economia na Conta de Energia')
    expect(html).toContain('Resumo da Projeção de Economia')

    // Cards do resumo
    expect(html).toContain('Economia Total em 25 Anos')
    expect(html).toContain('Gasto Total Sem Solar em 25 Anos')
    expect(html).toContain('Custo de Postergação')

    // Card do payback abaixo
    expect(html).toContain('Tempo de Retorno do Investimento')
    expect(html).toContain('Payback Estimado')
    expect(html).toContain('Payback do Sistema')
    expect(html).toContain('4 anos e 1 mês')

    // Gráfico e tabela removidos
    expect(html).not.toContain('recharts-responsive-container')
    expect(html).not.toContain('Evolução da Economia Acumulada x Gasto sem Solar')
    expect(html).not.toContain('Tabela Projeção Ano a Ano')
    expect(html).not.toContain('<table')
  })
})
