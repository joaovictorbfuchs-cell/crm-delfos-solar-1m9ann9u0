import { describe, it, expect } from 'vitest'
import {
  gerarHTMLPropostaTecnicoComercial,
  DADOS_FIXOS_EMPRESA_DELFOS,
  type PropostaTecnicoComercialDados,
} from './propostaTecnicoComercialGenerator'
import { gerarHTMLPropostaSolar, type PropostaSolarPDFInput } from './propostaSolarGenerator'

describe('Proposta Técnico-Comercial Generator (6 Seções Oficiais)', () => {
  const dadosExemplo: PropostaTecnicoComercialDados = {
    cliente: {
      nome: 'João Silva Teste',
      cpfOuCnpj: '123.456.789-00',
      endereco: 'Rua das Palmeiras, 100',
      municipio: 'Erechim / RS',
      tipoCliente: 'residencial',
    },
    representante: {
      nome: 'João Victor Bagetti Fuchs',
      contato: '(54) 99129-2121',
    },
    dataProposta: '15/05/2025',
    validadeDias: 5,
    empresa: DADOS_FIXOS_EMPRESA_DELFOS,
    sistema: {
      potenciaKwp: 10.5,
      descricaoPaineis: 'Canadian Solar 550W Tier-1 Monocristalino',
      qtdPaineis: 20,
      descricaoInversores: 'Growatt 10kW On-Grid com WiFi',
      qtdInversores: 1,
      estruturaFixacao: 'Alumínio para telhado cerâmico',
      codigoFiname: 'FINAME-12345',
      areaNecessariaM2: 50,
      potenciaPlacaWp: 550,
    },
    garantias: {
      paineisAnosFabricacao: 15,
      paineisAnosDesempenho: 30,
      paineisPercentualDesempenho: '84,8%',
      inversorAnosFabricacao: 10,
      instalacaoAnos: 1,
      instalacaoTexto: '1 ano de garantia direta Delfos Engenharia',
    },
    producao: {
      anualKwh: 15000,
      mediaMensalKwh: 1250,
    },
    economia: {
      investimentoTotal: 45000,
      prazoEntregaDias: 40,
      paybackTexto: '4 anos e 2 meses',
      paybackMeses: 50,
    },
    parcelamento: {
      aVista: {
        valorTotal: 42750,
        contaHoje: 950,
        contaComSolar: 85,
        descontoReais: 2250,
      },
      cartao18x: {
        numeroParcelas: 18,
        valorParcela: 2500,
        contaHoje: 950,
        contaComSolar: 85,
        semJuros: true,
      },
      financiamentoA: {
        nome: 'FINANCIAMENTO A (60X)',
        numeroParcelas: 60,
        valorParcela: 1035,
        contaHoje: 950,
        contaComSolar: 85,
        entrada: 9000,
      },
      financiamentoB: {
        nome: 'FINANCIAMENTO B (120X)',
        numeroParcelas: 120,
        valorParcela: 690,
        contaHoje: 950,
        contaComSolar: 85,
        entrada: 4500,
      },
    },
    projecao: {
      gastoSemSolar1Ano: 11400,
      gastoSemSolar5Anos: 66000,
      gastoSemSolar25Anos: 438000,
      economia1Ano: 10380,
      economia5Anos: 57000,
      economia25Anos: 393000,
      economia1Mes: 865,
    },
  }

  it('deve gerar HTML contendo exatamente as 6 SEÇÕES NOVAS na ordem prescrita', () => {
    const html = gerarHTMLPropostaTecnicoComercial(dadosExemplo)

    // IDs das 6 seções
    expect(html).toContain('id="secao-1-capa"')
    expect(html).toContain('id="secao-2-custo-inercia"')
    expect(html).toContain('id="secao-3-seu-sistema"')
    expect(html).toContain('id="secao-4-projecao-economia"')
    expect(html).toContain('id="secao-5-projecao-25anos"')
    expect(html).toContain('id="secao-6-investimento-pagamento"')

    // SEÇÃO 1: Capa (logo Delfos, cliente, potência kWp, geração, consultor, data)
    expect(html).toContain('João Silva Teste')
    expect(html).toContain('10,50 kWp')
    expect(html).toContain('1.250 kWh/mês')
    expect(html).toContain('João Victor Bagetti Fuchs')
    expect(html).toContain('15/05/2025')
    expect(html).toContain('Economize')

    // SEÇÃO 2: Situação Atual (cards de consumo e custo mensal/anual + comparativo 1/5/25 anos + box vermelho + linha reflexiva)
    expect(html).toContain('Situação Atual')
    expect(html).toContain('Consumo Mensal')
    expect(html).toContain('Consumo no Ano')
    expect(html).toContain('Custo Mensal')
    expect(html).toContain('Custo no Ano')
    expect(html).toContain('Convertido em')
    expect(html).toContain('conector-situacao-badge')
    expect(html).toContain('/kWh')
    expect(html).toContain('1 ano')
    expect(html).toContain('5 anos')
    expect(html).toContain('25 anos')
    expect(html).toContain('Sem solar, em 5 anos você pagará')
    expect(html).toContain('Hoje você paga')
    expect(html).toContain('para a concessionária e')
    expect(html).toContain('não recebe nada em troca')

    // SEÇÃO 3: Seu Sistema Fotovoltaico (cards: potência, geração, módulos, inversor, área, garantias 30a/10a/Delfos, faixa 24/7)
    expect(html).toContain('Seu Sistema Fotovoltaico')
    expect(html).toContain('Potência do Sistema')
    expect(html).toContain('Geração Estimada')
    expect(html).toContain('Módulos Fotovoltaicos')
    expect(html).toContain('Canadian Solar 550W Tier-1 Monocristalino')
    expect(html).toContain('Inversor Solar')
    expect(html).toContain('Growatt 10kW On-Grid com WiFi')
    expect(html).toContain('Área Necessária')
    expect(html).toContain('30 ANOS')
    expect(html).toContain('10 ANOS')
    expect(html).toContain('Monitoramento Inteligente 24/7 pelo Smartphone')

    // SEÇÃO 4: Projeção de Economia na Conta de Energia (tabela 2026–2051 com Fio B e GD Eco Líquida)
    expect(html).toContain('Projeção de Economia na Conta de Energia (2026–2051)')
    expect(html).toContain('GD Eco Líq.')
    expect(html).toContain('Fio B')
    expect(html).toContain('2026')
    expect(html).toContain('2051')

    // SEÇÃO 5: Projeção de Economia em 25 Anos (curvas gasto sem solar vs economia, marcador de payback, cards)
    expect(html).toContain('Projeção de Economia em 25 Anos')
    expect(html).toContain('Gasto acumulado sem solar:')
    expect(html).toContain('Investimento + economia com solar:')
    expect(html).toContain('Payback no cruzamento:')
    expect(html).toContain('Economia Total Acumulada')
    expect(html).toContain('Tempo de Retorno (Payback)')
    expect(html).toContain('Retorno Sobre Investimento (ROI)')

    // SEÇÃO 6: Investimento e Condições de Pagamento (cards À vista / Cartão / Finan A / Finan B, comparativo conta, validade)
    expect(html).toContain('Investimento e Condições de Pagamento')
    expect(html).toContain('Seu Investimento')
    expect(html).toContain('À VISTA')
    expect(html).toContain('CARTÃO')
    expect(html).toContain('FINANCIAMENTO A (60X)')
    expect(html).toContain('FINANCIAMENTO B (120X)')
    expect(html).toContain('Hoje você paga')
    expect(html).toContain('sua parcela do financiamento é')
    expect(html).toContain('Condições comerciais válidas por')

    // CSS de impressão A4 obrigatório
    expect(html).toContain('size: A4 portrait')
    expect(html).toContain('print-color-adjust: exact')
    expect(html).toContain('page-break-before: always')

    // Não deve conter modelo antigo ("Quem Somos" corporativo antigo)
    expect(html).not.toContain('A Delfos Solar é especialista em transformar contas de energia')
    expect(html).not.toContain('Mais de 2.500 projetos entregues e homologados')
    expect(html).not.toContain('id="pagina-1"')
    expect(html).not.toContain('id="pagina-4"')
  })

  it('gerarHTMLPropostaSolar deve redirecionar para o mesmo modelo de 6 seções', () => {
    const inputSolar: PropostaSolarPDFInput = {
      cliente: {
        nome: 'Maria Solar Teste',
        cpfOuCnpj: '987.654.321-99',
        municipio: 'Erechim / RS',
        tipoCliente: 'residencial',
      },
      representanteComercial: 'Consultor Delfos',
      sistema: {
        potenciaKwp: 7.2,
        consumoKwhMes: 600,
        numeroPlacas: 12,
        potenciaPlacaWp: 600,
        marcaPlacas: 'JA Solar',
        marcaInversor: 'Huawei 6kW',
        quantidadeInversores: 1,
        tipoEstrutura: 'ceramico',
        orientacaoTelhado: 'norte',
        areaNecessariaM2: 28,
      },
      calculos: {
        geracaoMediaMensalKwh: 650,
        geracaoAnualEstimadaKwh: 7800,
        valorInvestimento: 29000,
        economia1Mes: 550,
        economia1Ano: 6600,
        economia5Anos: 36000,
        economia10Anos: 82000,
        economia25Anos: 260000,
        gastoSemSolar1Ano: 7500,
        gastoSemSolar5Anos: 44000,
        gastoSemSolar10Anos: 110000,
        gastoSemSolar25Anos: 390000,
        paybackMeses: 52,
        paybackAnos: 4.3,
        reajusteAnualPercentual: 9,
        tarifaEfetiva: 0.95,
        taxaMinimaDisponibilidadeKwh: 30,
        taxaMinimaDisponibilidadeReais: 28.5,
        contaAtualSemSolarMes: 600,
        contaAtualSemSolarAno: 7200,
        contaPrimeiroMesComSolar: 70,
        valorTotalCustos: 22000,
        custoPorKwpInstalado: 4027.77,
        contaSemSolar4AnosComReajuste: 846,
        contaComSolar4AnosComReajuste: 98,
        contaSemSolar10AnosComReajuste: 1420,
        contaComSolar10AnosComReajuste: 165,
        geracaoMensalDetalhada: [],
        parcelamentos: {
          aVista: {
            titulo: 'À Vista com Desconto',
            descricao: 'Pagamento à vista',
            numeroParcelas: 1,
            valorParcela: 27550,
            valorTotal: 27550,
            taxaJurosMensal: 0,
            desembolsoMensal: 27550,
            contaComSolar: 70,
            contaSemSolar: 600,
            economiaMensalLiquida: 530,
          },
          cartao18x: {
            titulo: 'Cartão de Crédito 18x',
            descricao: 'Sem juros na maquininha',
            numeroParcelas: 18,
            valorParcela: 1611,
            valorTotal: 29000,
            taxaJurosMensal: 0,
            desembolsoMensal: 1681,
            contaComSolar: 70,
            contaSemSolar: 600,
            economiaMensalLiquida: -1081,
          },
          financiamentoBanco1: {
            titulo: 'BV Financeira (60x)',
            descricao: 'Financiamento bancário 60 meses',
            numeroParcelas: 60,
            valorParcela: 690,
            valorTotal: 41400,
            taxaJurosMensal: 1.39,
            desembolsoMensal: 760,
            contaComSolar: 70,
            contaSemSolar: 600,
            economiaMensalLiquida: -160,
          },
          financiamentoBanco2: {
            titulo: 'Santander Solar (120x)',
            descricao: 'Financiamento bancário 120 meses',
            numeroParcelas: 120,
            valorParcela: 430,
            valorTotal: 51600,
            taxaJurosMensal: 1.45,
            desembolsoMensal: 500,
            contaComSolar: 70,
            contaSemSolar: 600,
            economiaMensalLiquida: 100,
          },
        },
      },
    }

    const htmlSolar = gerarHTMLPropostaSolar(inputSolar)

    // Confirma seções novas
    expect(htmlSolar).toContain('id="secao-1-capa"')
    expect(htmlSolar).toContain('id="secao-2-custo-inercia"')
    expect(htmlSolar).toContain('id="secao-3-seu-sistema"')
    expect(htmlSolar).toContain('id="secao-4-projecao-economia"')
    expect(htmlSolar).toContain('id="secao-5-projecao-25anos"')
    expect(htmlSolar).toContain('id="secao-6-investimento-pagamento"')
    expect(htmlSolar).toContain('Maria Solar Teste')
    expect(htmlSolar).toContain('7,20 kWp')

    // Confirma que não há conteúdos legados
    expect(htmlSolar).not.toContain('Quem Somos')
    expect(htmlSolar).not.toContain('Como Funciona o Sistema Solar On-Grid')
    expect(htmlSolar).not.toContain('Monitoramento do Sistema Solar em Tempo Real')
  })
})
