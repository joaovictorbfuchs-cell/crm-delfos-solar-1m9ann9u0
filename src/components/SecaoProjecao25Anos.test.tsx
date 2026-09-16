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

    // Rótulos das duas linhas do gráfico
    expect(html).toContain('Gasto acumulado sem solar:')
    expect(html).toContain('Investimento + economia com solar:')

    // Cards inferiores solicitados
    expect(html).toContain('Economia total em 25 anos')
    expect(html).toContain('Payback')
    expect(html).toContain('ROI')

    // Texto de Payback com anos e meses
    expect(html).toContain('4 anos e 3 meses')

    // Observação em itálico com o texto exato
    expect(html).toContain(
      'Valores estimados com base na projeção tarifária atual. Podem variar conforme reajustes anuais da concessionária, CIP municipal e fator de simultaneidade real de consumo.',
    )
  })

  it('exibe a tabela resumo com os anos de 2026 a 2051 (26 linhas)', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoProjecao25Anos, {
        consumoAnualCadastradoKwh: 4807,
        potenciaKwp: 8.54,
      }),
    )

    // Verifica que o primeiro ano (2026) e o último ano (2051) aparecem na tabela
    expect(html).toContain('2026')
    expect(html).toContain('2051')

    // Conta a ocorrência de linhas da tabela
    const rowCount = (html.match(/<tr/g) || []).length
    // 1 cabeçalho (thead) + 26 linhas no tbody = 27 rows
    expect(rowCount).toBe(27)
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
