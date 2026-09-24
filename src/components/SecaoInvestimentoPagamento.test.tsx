import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { SecaoInvestimentoPagamento } from './SecaoInvestimentoPagamento'

describe('SecaoInvestimentoPagamento Component', () => {
  it('renderiza com dados de fallback padrão quando nenhum prop é passado', () => {
    const html = renderToStaticMarkup(React.createElement(SecaoInvestimentoPagamento, {}))

    // Cabeçalho Investimento Total
    expect(html).toContain('Investimento Total')
    expect(html).toContain('Economia mensal estimada:')

    // Valor padrão R$ 45.000
    expect(html).toContain('45.000')

    // 4 cards de pagamento (sem as badges de destaque conforme solicitação e sem "Pagamento único com desconto" quando desconto for 0)
    expect(html).toContain('À Vista')
    expect(html).not.toContain('Melhor condição')
    expect(html).not.toContain('Pagamento único com desconto')
    expect(html).toContain('Cartão')
    expect(html).not.toContain('Condição facilitada')
    expect(html).toContain('Financiamento 1')
    expect(html).not.toContain('Menor parcela')
    expect(html).toContain('Financiamento 2')
    expect(html).not.toContain('Maior prazo')

    // Linhas comparativas inferiores idênticas à aba de parcelamento
    expect(html).toContain('Conta hoje:')
    expect(html).not.toContain('Conta s/ solar:')
    expect(html).not.toContain('Conta hoje s/ solar:')
    expect(html).toContain('Conta c/ solar:')
    expect(html).toContain('Economia/mês:')
    expect(html).toContain('Parc. + Conta =')
    expect(html).toContain('Valor total do projeto')
    expect(html).toContain('Prazo de entrega:')

    // Título da seção de condições de pagamento
    expect(html).toContain('Condições de pagamento')

    // Bloco de Projeção com Reajuste Tarifário 9% a.a.
    expect(html).toContain('Projeção com Reajuste Tarifário de 9% ao ano (Concessionária)')
    expect(html).toContain('Conta daqui a 4 anos:')
    expect(html).toContain('Conta daqui a 10 anos:')
    expect(html).toContain('com solar')

    // Mini-bloco de payback estimado abaixo dos cards
    expect(html).toContain('Payback do Sistema:')
    expect(html).toContain('Quitação prevista:')

    // Nota de rodapé financeira (Premissas novas)
    expect(html).toContain('Valores estimados sem iluminação pública.')
    expect(html).toContain('Consumo considerado igual à energia gerada.')
    expect(html).toContain('Fio B progressivo até 2029 conforme Lei 14.300/2021 (GD II).')
    expect(html).toContain('Reajuste tarifário de 9% a.a. é premissa comercial.')

    // REMOVER COMPARATIVO: não deve mais conter o bloco de comparativo mensal
    expect(html).not.toContain('Comparativo de Custo Mensal')
    expect(html).not.toContain('Troque despesa por patrimônio')

    // CARD DE URGÊNCIA: textos removidos conforme pedido do usuário
    expect(html).not.toContain('Garantir Condição')
    expect(html).not.toContain('Reserve sua usina agora')
    expect(html).toContain('Condições válidas por 5 dias.')

    // Bloco de Assinaturas Canônico (2 colunas)
    expect(html).toContain('EMPRESA CONTRATADA')
    expect(html).toContain('CLIENTE / CONTRATANTE')
    expect(html).toContain('DELFOS ENGENHARIA LTDA')
    expect(html).toContain('21.379.952/0001-38')
    expect(html).toContain('João Victor Bagetti Fuchs')
    expect(html).toContain('De acordo com as especificações e valores da proposta')

    // Linhas removidas do card EMPRESA CONTRATADA
    expect(html).not.toContain('Resp. Técnico: JOÃO VICTOR BAGETTI FUCHS')
    expect(html).not.toContain('RS151894')
    expect(html).not.toContain('Rua Espírito Santo')
    expect(html).not.toContain('contato@delfos.eng.br')
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
    expect(html).toContain('Payback do Sistema:')
    expect(html).toContain('Quitação prevista:')

    // Ausência do comparativo mensal
    expect(html).not.toContain('Comparativo de Custo Mensal')

    // Bloco de assinaturas com dados do cliente
    expect(html).toContain('Carlos Silva')
    expect(html).toContain('De acordo com as especificações e valores da proposta')
  })

  it('NÃO exibe a linha "Inclui IOF de R$ X" e normaliza títulos para Financiamento 1 e Financiamento 2', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoInvestimentoPagamento, {
        valorInvestimento: 40000,
        nomeFinanciamentoA: 'Financiamento Banco 1',
        parcelasFinanciamentoA: 60,
        valorParcelaFinanciamentoA: 850,
        iofFinanciamentoA: 1759.98,
        nomeFinanciamentoB: 'Financiamento Banco 2',
        parcelasFinanciamentoB: 60,
        valorParcelaFinanciamentoB: 720,
        iofFinanciamentoB: 1250.5,
      }),
    )

    expect(html).not.toContain('Inclui IOF de')
    expect(html).not.toContain('1.759,98')
    expect(html).not.toContain('1.250,50')
    expect(html).toContain('Financiamento 1')
    expect(html).toContain('Financiamento 2')
    expect(html).not.toContain('Financiamento Banco 1')
    expect(html).not.toContain('Financiamento Banco 2')
  })

  it('exibe texto de desconto apenas quando descontoAVistaReais for maior que 0', () => {
    const htmlComDesconto = renderToStaticMarkup(
      React.createElement(SecaoInvestimentoPagamento, {
        valorInvestimento: 40000,
        valorAVista: 38000,
        descontoAVistaReais: 2000,
      }),
    )
    expect(htmlComDesconto).toContain('Desconto de')
    expect(htmlComDesconto).toContain('2.000,00')
    expect(htmlComDesconto).not.toContain('Pagamento único com desconto')

    const htmlSemDesconto = renderToStaticMarkup(
      React.createElement(SecaoInvestimentoPagamento, {
        valorInvestimento: 40000,
        valorAVista: 40000,
        descontoAVistaReais: 0,
      }),
    )
    expect(htmlSemDesconto).not.toContain('Desconto de')
    expect(htmlSemDesconto).not.toContain('Pagamento único com desconto')
  })

  it('no bloco de assinaturas, não exibe o texto "Não informado" quando dados do cliente não estão disponíveis', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoInvestimentoPagamento, {
        nomeCliente: 'Ana Souza',
        dadosCliente: {
          nome: 'Ana Souza',
        },
      }),
    )

    // A ordem canônica é preservada
    expect(html).toContain('EMPRESA CONTRATADA')
    expect(html).toContain('CLIENTE / CONTRATANTE')
    expect(html).toContain('Ana Souza')
    expect(html).toContain('De acordo com as especificações e valores da proposta')
    expect(html).toContain('CPF/CNPJ:')

    // NUNCA deve conter o fallback "Não informado" nem linhas de contato/endereço removidas
    expect(html).not.toContain('Não informado')
    expect(html).not.toContain('Endereço:')
    expect(html).not.toContain('Contato:')
  })

  it('renderiza com entradaCartao={5000} e espera "Entrada: R$ 5.000,00" no card de cartão; e com entrada 0 a linha não aparece', () => {
    // Com entradaCartao = 5000
    const htmlComEntrada = renderToStaticMarkup(
      React.createElement(SecaoInvestimentoPagamento, {
        valorInvestimento: 40000,
        parcelasCartao: 10,
        entradaCartao: 5000,
      }),
    )

    expect(htmlComEntrada).toContain('5.000,00')
    expect(htmlComEntrada).toContain('Entrada:')

    // Com entradaCartao = 0 ou omitida
    const htmlSemEntrada = renderToStaticMarkup(
      React.createElement(SecaoInvestimentoPagamento, {
        valorInvestimento: 40000,
        parcelasCartao: 10,
        entradaCartao: 0,
        entradaFinanciamentoA: 0,
        entradaFinanciamentoB: 0,
      }),
    )

    expect(htmlSemEntrada).not.toContain('Entrada:')
  })

  it('exibe prazo de entrega customizado e padrão', () => {
    const htmlPadrao = renderToStaticMarkup(React.createElement(SecaoInvestimentoPagamento, {}))
    expect(htmlPadrao).toContain(
      'Prazo de entrega: <strong class="text-gray-900">30 dias úteis</strong>',
    )

    const htmlCustom = renderToStaticMarkup(
      React.createElement(SecaoInvestimentoPagamento, { prazoEntregaDias: 45 }),
    )
    expect(htmlCustom).toContain(
      'Prazo de entrega: <strong class="text-gray-900">45 dias úteis</strong>',
    )
  })

  it('renderiza o bloco de Projeção com Reajuste Tarifário de 9% ao ano com valores calculados e fornecidos via props', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoInvestimentoPagamento, {
        valorInvestimento: 45000,
        contaSemSolar4AnosComReajuste: 1311.08,
        contaComSolar4AnosComReajuste: 141.16,
        contaSemSolar10AnosComReajuste: 2198.81,
        contaComSolar10AnosComReajuste: 236.74,
      }),
    )

    expect(html).toContain('Projeção com Reajuste Tarifário de 9% ao ano (Concessionária)')
    expect(html).toContain('Conta daqui a 4 anos:')
    expect(html).toContain('Conta daqui a 10 anos:')
    expect(html).toContain('1.311,08')
    expect(html).toContain('141,16')
    expect(html).toContain('2.198,81')
    expect(html).toContain('236,74')
    expect(html).toContain('com solar')
  })
})
