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

    // 4 cards de pagamento (sem as badges de destaque conforme solicitação)
    expect(html).toContain('À Vista')
    expect(html).not.toContain('Melhor condição')
    expect(html).toContain('Cartão de Crédito')
    expect(html).not.toContain('Condição facilitada')
    expect(html).toContain('Financiamento A')
    expect(html).not.toContain('Menor parcela')
    expect(html).toContain('Financiamento B')
    expect(html).not.toContain('Maior prazo')

    // Linhas comparativas inferiores idênticas à aba de parcelamento
    expect(html).toContain('Conta hoje s/ solar:')
    expect(html).toContain('Conta c/ solar:')
    expect(html).toContain('Economia/mês:')
    expect(html).toContain('Parcela + Conta:')

    // Título da seção de condições de pagamento
    expect(html).toContain('Condições de pagamento')

    // Mini-bloco de payback estimado abaixo dos cards
    expect(html).toContain('Payback estimado')
    expect(html).toContain('Quitação prevista:')

    // REMOVER COMPARATIVO: não deve mais conter o bloco de comparativo mensal
    expect(html).not.toContain('Comparativo de Custo Mensal')
    expect(html).not.toContain('Troque despesa por patrimônio')

    // CARD DE URGÊNCIA: textos removidos conforme pedido do usuário
    expect(html).not.toContain('Garantir Condição')
    expect(html).not.toContain('Reserve sua usina agora')
    expect(html).toContain('Condições válidas por 5 dias.')
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
        faturaMensalComSolar: 95.5,
        validadeDias: 10,
        nomeCliente: 'Carlos Silva',
      }),
    )

    // Cartão: 3333 + 95.5 = 3428.5
    expect(html).toContain('3.428,50')
    // Finan A: 1100 + 95.5 = 1195.5
    expect(html).toContain('1.195,50')
    // Finan B: 850 + 95.5 = 945.5
    expect(html).toContain('945,50')

    // Cliente e título
    expect(html).toContain('Carlos Silva')
    expect(html).toContain('60.000')

    // À vista com valor
    expect(html).toContain('57.000')
    expect(html).not.toContain('Economia de')

    // Cartão 18x
    expect(html).toContain('18x')
    expect(html).toContain('3.333')
    expect(html).not.toContain('Condição facilitada')

    // Financiamentos personalizados e badges
    expect(html).toContain('Banco Santander')
    expect(html).not.toContain('Menor parcela')
    expect(html).toContain('48x')
    expect(html).toContain('1.100')
    expect(html).toContain('12.000')

    expect(html).toContain('Banco BV')
    expect(html).not.toContain('Maior prazo')
    expect(html).toContain('84x')
    expect(html).toContain('850')
    expect(html).toContain('6.000')

    // Conta e parcela comparativa
    expect(html).toContain('1.450,50')
    expect(html).toContain('850')

    // Validade personalizada sem "Reserve sua usina agora"
    expect(html).toContain('Condições válidas por 10 dias.')
    expect(html).not.toContain('Reserve sua usina agora')
    expect(html).not.toContain('Garantir Condição')

    // Título da seção
    expect(html).toContain('Condições de pagamento')

    // Payback estimado abaixo dos cards
    expect(html).toContain('Payback estimado')
    expect(html).toContain('Quitação prevista:')

    // Ausência do comparativo mensal
    expect(html).not.toContain('Comparativo de Custo Mensal')
  })
})
