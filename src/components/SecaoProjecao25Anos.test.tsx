import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { SecaoProjecao25Anos } from './SecaoProjecao25Anos'

describe('SecaoProjecao25Anos Component', () => {
  it('renderiza o título exato e os textos solicitados pelo usuário', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoProjecao25Anos, {
        consumoAnualCadastradoKwh: 4807,
        potenciaKwp: 8.54,
        valorInvestimento: 22500,
        paybackMeses: 51, // 4 anos e 3 meses
        tipoClienteInicial: 'residencial',
      }),
    )

    // Título no topo
    expect(html).toContain('Sua economia ao longo do tempo')

    // Cards inferiores solicitados mantidos com a nova tríade 1, 5 e 25 anos
    expect(html).toContain('Economia em 1 ano')
    expect(html).toContain('Economia em 5 anos')
    expect(html).toContain('Economia em 25 anos')

    // Garantir que Payback e ROI não apareçam nos cards
    expect(html).not.toContain('⏱️ Payback')
    expect(html).not.toContain('Ano de quitação')
    expect(html).not.toContain('Rentabilidade superior')

    // Textos de apoio dos cards novos
    expect(html).toContain('Economia acumulada no primeiro ano de operação do sistema.')
    expect(html).toContain('Economia acumulada nos primeiros 5 anos de geração fotovoltaica.')
    expect(html).toContain(
      'Total poupado pelo cliente na conta de energia durante a vida útil do sistema.',
    )
    expect(html).toContain('Primeiro ano de geração')
    expect(html).toContain('Início imediato')
    expect(html).toContain('Meio decênio de economia')
    expect(html).toContain('Consolidação do ganho')
    expect(html).toContain('Vida útil do sistema')
    expect(html).toContain('Proteção inflacionária')

    // Observação em itálico com o texto exato
    expect(html).toContain(
      'Valores estimados com base na projeção tarifária atual. Podem variar conforme reajustes anuais da concessionária, CIP municipal e fator de simultaneidade real de consumo.',
    )

    // Gráfico e tabela foram removidos conforme solicitação do usuário
    expect(html).not.toContain('Gráfico Comparativo')
    expect(html).not.toContain('Tabela Resumo Ano a Ano')
    expect(html).not.toContain('<table')
  })

  it('renderiza os valores de economia de 1, 5 e 25 anos formatados em moeda', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoProjecao25Anos, {
        consumoAnualCadastradoKwh: 4807,
        valorInvestimento: 25000,
        paybackMeses: 51,
      }),
    )

    // Os 3 cards devem estar presentes com R$
    expect(html).toContain('Economia em 1 ano')
    expect(html).toContain('Economia em 5 anos')
    expect(html).toContain('Economia em 25 anos')
    expect(html).toContain('R$')
  })
})
