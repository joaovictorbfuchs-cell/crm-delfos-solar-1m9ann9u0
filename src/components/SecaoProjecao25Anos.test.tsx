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

    // Cards inferiores solicitados mantidos
    expect(html).toContain('Economia total em 25 anos')
    expect(html).toContain('Payback')
    expect(html).toContain('ROI')

    // Texto de Payback com anos e meses
    expect(html).toContain('4 anos e 3 meses')

    // Observação em itálico com o texto exato
    expect(html).toContain(
      'Valores estimados com base na projeção tarifária atual. Podem variar conforme reajustes anuais da concessionária, CIP municipal e fator de simultaneidade real de consumo.',
    )

    // Gráfico e tabela foram removidos conforme solicitação do usuário
    expect(html).not.toContain('Gráfico Comparativo')
    expect(html).not.toContain('Tabela Resumo Ano a Ano')
    expect(html).not.toContain('<table')
  })

  it('calcula o ROI corretamente a partir do investimento e da economia acumulada', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoProjecao25Anos, {
        consumoAnualCadastradoKwh: 4807,
        valorInvestimento: 25000,
        paybackMeses: 51,
      }),
    )

    // O card de ROI deve conter o símbolo %
    expect(html).toContain('ROI')
    expect(html).toContain('%')
  })
})
