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

    // Cards do resumo mantidos
    expect(html).toContain('Economia Total em 25 Anos')
    expect(html).toContain('Gasto Total Sem Solar em 25 Anos')
    expect(html).toContain('Custo de Postergação')

    // Card do payback removido de dentro de SecaoProjecaoEconomia (movido para após investimento)
    expect(html).not.toContain('Tempo de Retorno do Investimento')
    expect(html).not.toContain('Payback Estimado')
    expect(html).not.toContain('Payback do Sistema')
    expect(html).not.toContain('4 anos e 1 mês')

    // Cabeçalho verde removido
    expect(html).not.toContain('Marco Legal da GD (Lei 14.300/2022)')
    expect(html).not.toContain('Simulação de 26 anos (2026 a 2051)')

    // Quadro tipo de cliente & simultaneidade removido
    expect(html).not.toContain('Tipo de Cliente & Simultaneidade')
    expect(html).not.toContain('Residencial (30%)')
    expect(html).not.toContain('Comercial (70%)')

    // Bloco de valores oficiais / valores de referência removido
    expect(html).not.toContain('Valores oficiais carregados')
    expect(html).not.toContain('Valores de referência estimados')

    // Gráfico e tabela removidos
    expect(html).not.toContain('recharts-responsive-container')
    expect(html).not.toContain('Evolução da Economia Acumulada x Gasto sem Solar')
    expect(html).not.toContain('Tabela Projeção Ano a Ano')
    expect(html).not.toContain('<table')

    // Quadro de Fator de Simultaneidade no cabeçalho removido conforme solicitação
    expect(html).not.toContain('Fator de Simultaneidade')
  })
})
