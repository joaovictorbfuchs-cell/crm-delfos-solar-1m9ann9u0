import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { SecaoInvestimentoPagamento } from './SecaoInvestimentoPagamento'

describe('SecaoInvestimentoPagamento Component', () => {
  it('renderiza com dados de fallback padrão quando nenhum prop é passado', () => {
    const html = renderToStaticMarkup(React.createElement(SecaoInvestimentoPagamento, {}))

    // Título no topo
    expect(html).toContain('Seu investimento')

    // Subtítulo do valor total
    expect(html).toContain('Investimento único — o sistema é seu')

    // Valor padrão R$ 45.000
    expect(html).toContain('45.000')

    // 4 cards de pagamento
    expect(html).toContain('À Vista')
    expect(html).toContain('Melhor condição')
    expect(html).toContain('Cartão')
    expect(html).toContain('Sem juros')
    expect(html).toContain('Financiamento A')
    expect(html).toContain('Menor parcela')
    expect(html).toContain('Financiamento B')
    expect(html).toContain('Maior prazo')

    // Linha comparativa
    expect(html).toContain('Hoje você paga')
    expect(html).toContain('de energia para a concessionária.')
    expect(html).toContain('Com solar, sua parcela do financiamento é')
    expect(html).toContain('— e o sistema passa a ser seu patrimônio.')

    // Badge de urgência
    expect(html).toContain('Condições válidas por 5 dias. Reserve sua usina agora.')
  })

  it('respeita os valores reais passados via props', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoInvestimentoPagamento, {
        valorInvestimento: 60000,
        valorAVista: 57000,
        descontoAVistaReais: 3000,
        parcelasCartao: 18,
        valorParcelaCartao: 3333,
        cartaoSemJuros: false,
        nomeFinanciamentoA: 'Banco Santander',
        entradaFinanciamentoA: 12000,
        parcelasFinanciamentoA: 48,
        valorParcelaFinanciamentoA: 1100,
        nomeFinanciamentoB: 'Banco BV',
        entradaFinanciamentoB: 6000,
        parcelasFinanciamentoB: 84,
        valorParcelaFinanciamentoB: 850,
        contaMensalAtual: 1450.5,
        validadeDias: 10,
        nomeCliente: 'Carlos Silva',
      }),
    )

    // Cliente e título
    expect(html).toContain('Carlos Silva')
    expect(html).toContain('60.000')

    // À vista com desconto de R$ 3.000
    expect(html).toContain('57.000')
    expect(html).toContain('3.000')

    // Cartão 18x
    expect(html).toContain('18x')
    expect(html).toContain('3.333')
    expect(html).toContain('Condição facilitada')

    // Financiamentos personalizados
    expect(html).toContain('Banco Santander')
    expect(html).toContain('48x')
    expect(html).toContain('1.100')
    expect(html).toContain('12.000')

    expect(html).toContain('Banco BV')
    expect(html).toContain('84x')
    expect(html).toContain('850')
    expect(html).toContain('6.000')

    // Conta e parcela comparativa
    expect(html).toContain('1.450,50')
    expect(html).toContain('850')

    // Validade personalizada
    expect(html).toContain('Condições válidas por 10 dias. Reserve sua usina agora.')
  })
})
