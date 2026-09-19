import { describe, it, expect } from 'vitest'
import {
  gerarHTMLPropostaTecnicoComercial,
  DADOS_FIXOS_EMPRESA_DELFOS,
  type PropostaTecnicoComercialDados,
} from './propostaTecnicoComercialGenerator'
import { gerarHTMLPropostaSolar, type PropostaSolarPDFInput } from './propostaSolarGenerator'
import {
  logoOficialPngAsset,
  onGridPngAsset,
  monitoramentoPngAsset,
} from './propostaIlustracoesAssets'

describe('Proposta Técnico-Comercial Generator (5 Seções Oficiais)', () => {
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

  it('deve gerar HTML contendo exatamente as 5 SEÇÕES NOVAS na ordem prescrita', () => {
    const html = gerarHTMLPropostaTecnicoComercial(dadosExemplo)

    // IDs das 5 seções
    expect(html).toContain('id="secao-1-capa"')
    expect(html).toContain('id="secao-2-custo-inercia"')
    expect(html).toContain('id="secao-3-seu-sistema"')
    expect(html).toContain('id="secao-4-projecao-25anos"')
    expect(html).toContain('id="secao-5-investimento-pagamento"')
    expect(html).not.toContain('id="secao-4-projecao-economia"')
    expect(html).not.toContain('id="secao-6-investimento-pagamento"')

    // SEÇÃO 1: Capa (badge oficial, título, subtítulo, cliente, imóvel/cidade, consultor, rodapé, logo Delfos)
    expect(html).toContain('PROPOSTA TÉCNICO-COMERCIAL')
    expect(html).toContain('Energia que<br />gera retorno')
    expect(html).toContain('Sistema fotovoltaico projetado exclusivamente para você')
    expect(html).toContain('PREPARADA PARA:')
    expect(html).toContain('João Silva Teste')
    expect(html).toContain('Residência • Erechim / RS')
    expect(html).toContain(
      'Consultor: <strong>João Victor Bagetti Fuchs</strong> • (54) 99129-2121',
    )
    expect(html).toContain('www.delfos.eng.br • contato@delfos.eng.br')
    expect(html).toContain('data:image/png;base64,')
    expect(html).not.toContain('/src/assets/prancheta-1-049a2.png')
    // Ausência dos textos de contato legados abaixo do logo na capa
    expect(html).not.toContain('(54) 3712-2460')
    expect(html).not.toContain('@delfosenergia')

    // SEÇÃO 2: Situação Atual (cards de consumo e custo mensal/anual + 3 cards de gastos acumulados sem solar 1/5/25 anos, sem linha reflexiva e sem o box vermelho)
    expect(html).toContain('Situação Atual')
    expect(html).toContain('Consumo Mensal')
    expect(html).toContain('Consumo no Ano')
    expect(html).toContain('Custo Mensal')
    expect(html).toContain('Custo no Ano')
    expect(html).not.toContain('conector-situacao-badge')
    expect(html).not.toContain('Convertido em')
    expect(html).toContain('Gastos Acumulados Sem Solar: 1, 5 e 25 Anos')
    expect(html).toContain('Gasto em 1 Ano')
    expect(html).toContain('Gasto em 5 Anos')
    expect(html).toContain('Gasto em 25 Anos')
    expect(html).not.toContain('Sem solar, em 5 anos você pagará')
    expect(html).not.toContain('Alerta de Perda Acumulada')
    expect(html).not.toContain('Gasto Sem Retorno')
    expect(html).not.toContain('Decisão Inteligente • Concessionária vs. Patrimônio Solar')
    expect(html).not.toContain('Seu Ativo Próprio')
    expect(html).not.toContain('não recebe nada em troca')

    // SEÇÃO 3: Seu Sistema Fotovoltaico (cards: potência, geração, módulos com garantia, inversor com garantia, área, faixa 24/7)
    expect(html).toContain('Seu Sistema Fotovoltaico')
    expect(html).toContain('Potência do Sistema')
    expect(html).toContain('Geração Estimada')
    expect(html).toContain('Módulos Fotovoltaicos')
    expect(html).toContain('Canadian Solar 550W Tier-1 Monocristalino')
    expect(html).toContain('Garantia de performance (degradação):')
    expect(html).toContain('Garantia contra defeitos de fabricação:')
    expect(html).toContain('Inversor Solar')
    expect(html).toContain('Growatt 10kW On-Grid com WiFi')
    expect(html).toContain('Garantia do inversor:')
    expect(html).not.toContain('Garantia da instalação:')
    expect(html).toContain('Área Necessária')
    expect(html).not.toContain('Tranquilidade e Garantias Asseguradas')
    expect(html).toContain('Monitoramento pelo Smartphone')
    expect(html).not.toContain('24/7')

    // Bloco como funciona e bloco monitoramento com imagens embutidas (data:image)
    expect(html).toContain('Como funciona o sistema solar (On-Grid)')
    expect(html).toContain('alt="Como funciona o sistema solar (On-Grid)"')
    expect(html).toContain('alt="Monitoramento"')
    // Garante que ambos os blocos possuem imagens em data:image
    expect(html).toContain(`src="${logoOficialPngAsset}"`)
    expect(html).toContain(`src="${onGridPngAsset}"`)
    expect(html).toContain(`src="${monitoramentoPngAsset}"`)

    // SEÇÃO 4: Projeção de Economia em 25 Anos (cards de economia 1, 5 e 25 anos sem payback ou ROI)
    expect(html).toContain('Projeção de Economia em 25 Anos')
    expect(html).toContain('Economia em 1 ano')
    expect(html).toContain('Economia em 5 anos')
    expect(html).toContain('Economia em 25 anos')
    expect(html).not.toContain('Retorno Sobre Investimento (ROI)')

    // SEÇÃO 5: Investimento e Condições de Pagamento (cards À vista / Cartão / Finan A / Finan B, título "Condições de pagamento", validade E PAYBACK AO FINAL + CUSTO DE POSTERGAÇÃO)
    expect(html).toContain('Investimento e Condições de Pagamento')
    expect(html).toContain('Investimento Total')
    expect(html).toContain('Economia mensal estimada:')
    expect(html).toContain('Condições de pagamento')
    expect(html).toContain('À VISTA')
    expect(html).toContain('CARTÃO')
    expect(html).toContain('FINANCIAMENTO A (60X)')
    expect(html).toContain('FINANCIAMENTO B (120X)')
    expect(html).toContain('Conta hoje:')
    expect(html).not.toContain('Conta s/ solar:')
    expect(html).toContain('Custo com energia atual:')
    expect(html).toContain('Fatura c/ solar + parcela:')
    expect(html).not.toContain('Hoje você paga')
    expect(html).not.toContain('Troque despesa por patrimônio')
    expect(html).toContain('Payback Estimado')
    expect(html).toContain('Tempo de Retorno do Investimento')
    expect(html).toContain('Custo de Postergação')
    expect(html).toContain('Valor perdido por mês')
    expect(html).toContain('Condições válidas por')

    // CSS de impressão A4 obrigatório e fluxo natural contínuo
    expect(html).toContain('size: A4 portrait')
    expect(html).toContain('print-color-adjust: exact')
    expect(html).toContain('page-break-before: auto')
    expect(html).toContain('break-before: auto')
    expect(html).toContain('break-inside: avoid')
    expect(html).toContain('background: #f5f5f5')
    expect(html).toContain('Tier-1 Global')
    expect(html).toContain('doc-footer')

    // Não deve conter modelo antigo ("Quem Somos" corporativo antigo)
    expect(html).not.toContain('A Delfos Solar é especialista em transformar contas de energia')
    expect(html).not.toContain('Mais de 2.500 projetos entregues e homologados')
    expect(html).not.toContain('id="pagina-1"')
    expect(html).not.toContain('id="pagina-4"')
  })

  it('gerarHTMLPropostaSolar deve redirecionar para o mesmo modelo de 5 seções', () => {
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
        fioBKwh: 0.2239,
        fatorSimultaneidade: 0.3,
        gdEcoLiquidaKwh: 0.8828,
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
    expect(htmlSolar).toContain('id="secao-4-projecao-25anos"')
    expect(htmlSolar).toContain('id="secao-5-investimento-pagamento"')
    expect(htmlSolar).not.toContain('id="secao-4-projecao-economia"')
    expect(htmlSolar).not.toContain('id="secao-6-investimento-pagamento"')
    expect(htmlSolar).toContain('Maria Solar Teste')
    expect(htmlSolar).toContain('7,20 kWp')

    // Confirma que não há conteúdos legados
    expect(htmlSolar).not.toContain('Quem Somos')
    expect(htmlSolar).not.toContain('Como Funciona o Sistema Solar On-Grid')
    expect(htmlSolar).not.toContain('Monitoramento do Sistema Solar em Tempo Real')

    // Confirma o gráfico de Geração Mensal Prevista (Janeiro a Dezembro — Erechim/RS)
    expect(htmlSolar).toContain('Geração Mensal Prevista (Janeiro a Dezembro — Erechim/RS)')
    expect(htmlSolar).toContain('Total anual:')
    expect(htmlSolar).toContain('Média mensal:')
    expect(htmlSolar).not.toContain('Irradiação (HSP)')
    expect(htmlSolar).not.toContain('Fator Sazonal')
  })

  it('omite a seção de geração mensal no HTML quando geracaoMensal for nulo/vazio (fallback)', () => {
    const dadosSemGeracao: PropostaTecnicoComercialDados = {
      ...dadosExemplo,
      producao: {
        ...dadosExemplo.producao,
        geracaoMensal: undefined,
      },
    }

    const html = gerarHTMLPropostaTecnicoComercial(dadosSemGeracao)
    expect(html).not.toContain('Geração Mensal Prevista')
  })

  it('exibe card do meio dinâmico com período de payback arredondado para cima (22 meses -> Gasto em 2 Anos)', () => {
    const dadosCustom: PropostaTecnicoComercialDados = {
      ...dadosExemplo,
      economia: {
        ...dadosExemplo.economia,
        paybackMeses: 22,
        paybackTexto: '1 ano e 10 meses',
      },
      projecao: {
        ...dadosExemplo.projecao,
        anosPaybackArredondado: 2,
        gastoSemSolarPaybackAnos: undefined,
      },
      parcelamento: {
        ...dadosExemplo.parcelamento,
        aVista: {
          ...dadosExemplo.parcelamento.aVista,
          contaHoje: 1000,
        },
      },
    }

    const html = gerarHTMLPropostaTecnicoComercial(dadosCustom)

    expect(html).toContain('Gastos Acumulados Sem Solar: 1, 2 Anos e 25 Anos')
    expect(html).toContain('Gasto em 2 Anos')
    // Gasto 2 anos com 9% a.a. para conta anual de 12.000: 12.000 + 13.080 = 25.080
    expect(html).toContain('25.080')
  })

  it('exibe card do meio dinâmico com payback de 25 meses -> Gasto em 3 Anos com 9% a.a.', () => {
    const dadosCustom: PropostaTecnicoComercialDados = {
      ...dadosExemplo,
      economia: {
        ...dadosExemplo.economia,
        paybackMeses: 25,
        paybackTexto: '2 anos e 1 mês',
      },
      projecao: {
        ...dadosExemplo.projecao,
        anosPaybackArredondado: undefined,
        gastoSemSolarPaybackAnos: undefined,
      },
      parcelamento: {
        ...dadosExemplo.parcelamento,
        aVista: {
          ...dadosExemplo.parcelamento.aVista,
          contaHoje: 1000,
        },
      },
    }

    const html = gerarHTMLPropostaTecnicoComercial(dadosCustom)

    expect(html).toContain('Gastos Acumulados Sem Solar: 1, 3 Anos e 25 Anos')
    expect(html).toContain('Gasto em 3 Anos')
    // Gasto 3 anos com 9% a.a. para conta anual de 12.000: 12.000 + 13.080 + 14.257,20 = 39.337
    expect(html).toContain('39.337')
  })

  it('aplica fallback para 5 anos no card do meio quando payback/investimento/economia forem zerados ou ausentes', () => {
    const dadosFallback: PropostaTecnicoComercialDados = {
      ...dadosExemplo,
      economia: {
        investimentoTotal: 0,
        prazoEntregaDias: 30,
        paybackTexto: '',
        paybackMeses: 0,
      },
      projecao: {
        ...dadosExemplo.projecao,
        anosPaybackArredondado: undefined,
        gastoSemSolarPaybackAnos: undefined,
        gastoSemSolar5Anos: 66000,
      },
    }

    const html = gerarHTMLPropostaTecnicoComercial(dadosFallback)

    expect(html).toContain('Gastos Acumulados Sem Solar: 1, 5 Anos e 25 Anos')
    expect(html).toContain('Gasto em 5 Anos')
  })

  it('filtra as usinas de acordo com instalacoesSelecionadasIds', () => {
    const dadosComFiltro: PropostaTecnicoComercialDados = {
      ...dadosExemplo,
      fotosInstalacoes: [
        {
          id: 'usina-1',
          titulo: 'Usina Solar Comercial Alpha',
          url: 'https://img.usecurling.com/p/800/600?q=solar',
          cidade: 'Erechim / RS',
          potenciaKwp: 120,
        },
        {
          id: 'usina-2',
          titulo: 'Usina Solar Rural Beta',
          url: 'https://img.usecurling.com/p/800/600?q=solar',
          cidade: 'Getúlio Vargas / RS',
          potenciaKwp: 45,
        },
      ],
      instalacoesSelecionadasIds: ['usina-1'],
    }

    const html = gerarHTMLPropostaTecnicoComercial(dadosComFiltro)
    expect(html).toContain('Usina Solar Comercial Alpha')
    expect(html).not.toContain('Usina Solar Rural Beta')
  })

  it('no bloco de assinaturas da Proposta Técnico-Comercial, não exibe "Não informado" quando dados cadastrais do cliente faltam', () => {
    const dadosSemCadastro: PropostaTecnicoComercialDados = {
      ...dadosExemplo,
      cliente: {
        nome: 'Marcos Oliveira',
      },
    }

    const html = gerarHTMLPropostaTecnicoComercial(dadosSemCadastro)
    expect(html).toContain('EMPRESA CONTRATADA')
    expect(html).toContain('CLIENTE / CONTRATANTE')
    expect(html).toContain('Marcos Oliveira')
    expect(html).toContain('De acordo com as especificações e valores da proposta')
    expect(html).toContain('linha-assinatura-final')
    expect(html).toContain('<strong>CPF/CNPJ:</strong>')
    expect(html).toContain('<strong>Endereço:</strong>')
    expect(html).toContain('<strong>Contato:</strong>')
    // Não deve conter a expressão "Não informado"
    expect(html).not.toContain('Não informado')
  })

  it('renderiza o novo rodapé limpo e moderno em uma linha com endereço e site sem CREA/responsável e sem slogan', () => {
    const html = gerarHTMLPropostaTecnicoComercial(dadosExemplo)
    // Novo formato em uma linha nas seções internas (doc-footer)
    expect(html).toContain('Delfos Engenharia Solar | CNPJ 21.379.952/0001-38')
    expect(html).toContain('(54) 99129-2121')
    expect(html).toContain('www.delfos.eng.br')
    expect(html).toContain('Rua Espírito Santo, 275 – Centro, Erechim/RS')
    expect(html).toContain('Proposta válida por 5 dias.')

    // O rodapé doc-footer não deve mais conter o CREA nem o slogan
    expect(html).not.toContain('Condições especiais para fechamento imediato')
    expect(html).not.toContain('Seção 1 de 6')
    expect(html).not.toContain('Seção 2 de 6')
    expect(html).not.toContain('de 6')
  })

  it('renderiza o bloco de Projeção com Reajuste Tarifário de 9% ao ano na Seção 5', () => {
    const html = gerarHTMLPropostaTecnicoComercial(dadosExemplo)
    expect(html).toContain('Reajuste Tarifário de 9%')
    expect(html).toContain('daqui a 4 anos')
    expect(html).toContain('daqui a 10 anos')
    expect(html).toContain('com solar')
  })

  it('exibe a linha "Inc. IOF R$ ..." nos blocos de Financiamento A e B quando valorIof for informado', () => {
    const dadosComIof: PropostaTecnicoComercialDados = {
      ...dadosExemplo,
      parcelamento: {
        ...dadosExemplo.parcelamento,
        financiamentoA: {
          ...dadosExemplo.parcelamento.financiamentoA,
          valorIof: 1759.98,
        },
        financiamentoB: {
          ...dadosExemplo.parcelamento.financiamentoB,
          valorIof: 2450.5,
        },
      },
    }

    const html = gerarHTMLPropostaTecnicoComercial(dadosComIof)
    expect(html).toContain('Inc. IOF')
    expect(html).toContain('1.759,98')
    expect(html).toContain('2.450,50')
  })

  it('valida em detalhe a estrutura e asserções da Seção 1 (Capa Oficial)', () => {
    const html = gerarHTMLPropostaTecnicoComercial(dadosExemplo)

    // 1. Badge com texto "PROPOSTA TÉCNICO-COMERCIAL"
    expect(html).toContain('capa-badge-amarelo')
    expect(html).toContain('PROPOSTA TÉCNICO-COMERCIAL')

    // 2. Título e subtítulo
    expect(html).toContain('capa-titulo-destaque')
    expect(html).toContain('Energia que<br />gera retorno')
    expect(html).toContain('capa-subtitulo-cinza')
    expect(html).toContain('Sistema fotovoltaico projetado exclusivamente para você')

    // 3. Bloco PREPARADA PARA com cliente e tipo de imóvel/cidade
    expect(html).toContain('capa-preparada-box')
    expect(html).toContain('PREPARADA PARA:')
    expect(html).toContain('João Silva Teste')
    expect(html).toContain('Residência • Erechim / RS')

    // 4. Linha do consultor dinâmica (autor do orçamento)
    expect(html).toContain('capa-consultor-linha')
    expect(html).toContain(
      'Consultor: <strong>João Victor Bagetti Fuchs</strong> • (54) 99129-2121',
    )

    // 5. Rodapé discreto da capa
    expect(html).toContain('capa-bottom-site-email')
    expect(html).toContain('www.delfos.eng.br')
    expect(html).toContain('contato@delfos.eng.br')

    // 6. Referência ao asset do logo oficial Delfos embutido em Base64
    expect(html).toContain('capa-logo-container')
    expect(html).toContain('data:image/png;base64,')
    expect(html).not.toContain('/src/assets/prancheta-1-049a2.png')

    // 7. Ausência dos contatos embutidos legados abaixo do logo
    expect(html).not.toContain('(54) 3712-2460')
    expect(html).not.toContain('@delfosenergia')
  })

  describe('Toggle do Layout do Telhado (Solergo / Engenharia Delfos)', () => {
    const layoutUrlValida = 'https://img.usecurling.com/p/800/600?q=rooftop'

    it('quando layoutTelhadoHabilitado for true e layoutTelhadoUrl for válida, o HTML DEVE conter o título "Veja como ficará sua usina no telhado" e a imagem', () => {
      const dadosComLayout: PropostaTecnicoComercialDados = {
        ...dadosExemplo,
        layoutTelhadoHabilitado: true,
        layoutTelhadoUrl: layoutUrlValida,
      }

      const html = gerarHTMLPropostaTecnicoComercial(dadosComLayout)
      expect(html).toContain('Veja como ficará sua usina no telhado')
      expect(html).toContain('Engenharia &amp; Posicionamento')
      expect(html).toContain('Layout técnico do projeto')
      expect(html).toContain(layoutUrlValida)
    })

    it('quando layoutTelhadoHabilitado for false, o HTML NÃO deve conter o título nem a seção de layout do telhado, mesmo se layoutTelhadoUrl for fornecida', () => {
      const dadosSemLayout: PropostaTecnicoComercialDados = {
        ...dadosExemplo,
        layoutTelhadoHabilitado: false,
        layoutTelhadoUrl: layoutUrlValida,
      }

      const html = gerarHTMLPropostaTecnicoComercial(dadosSemLayout)
      expect(html).not.toContain('Veja como ficará sua usina no telhado')
      expect(html).not.toContain('Layout técnico do projeto')
      expect(html).not.toContain(layoutUrlValida)
    })

    it('quando layoutTelhadoUrl for nula ou vazia, o HTML NÃO deve conter a seção de layout do telhado mesmo com layoutTelhadoHabilitado true', () => {
      const dadosSemUrl: PropostaTecnicoComercialDados = {
        ...dadosExemplo,
        layoutTelhadoHabilitado: true,
        layoutTelhadoUrl: null,
      }

      const html = gerarHTMLPropostaTecnicoComercial(dadosSemUrl)
      expect(html).not.toContain('Veja como ficará sua usina no telhado')
      expect(html).not.toContain('Layout técnico do projeto')
    })

    it('HTML do preview deve ser rigorosamente idêntico ao HTML do PDF (mesma função, mesma entrada → mesmo output)', () => {
      const inputSolar: PropostaSolarPDFInput = {
        cliente: {
          nome: 'Carlos Eduardo Teste',
          cpfOuCnpj: '111.222.333-44',
          municipio: 'Erechim / RS',
          tipoCliente: 'residencial',
        },
        representanteComercial: 'João Victor Bagetti Fuchs',
        sistema: {
          potenciaKwp: 8.5,
          consumoKwhMes: 750,
          numeroPlacas: 14,
          potenciaPlacaWp: 610,
          marcaPlacas: 'Canadian Solar',
          marcaInversor: 'Huawei 8kW',
          quantidadeInversores: 1,
          tipoEstrutura: 'ceramico',
          orientacaoTelhado: 'norte',
          areaNecessariaM2: 32,
        },
        calculos: {
          ...dadosExemplo.producao,
          geracaoMediaMensalKwh: 800,
          geracaoAnualEstimadaKwh: 9600,
          valorInvestimento: 35000,
          fioBKwh: 0.2239,
          fatorSimultaneidade: 0.3,
          gdEcoLiquidaKwh: 0.8828,
          economia1Mes: 680,
          economia1Ano: 8160,
          economia5Anos: 44000,
          economia10Anos: 102000,
          economia25Anos: 320000,
          gastoSemSolar1Ano: 9200,
          gastoSemSolar5Anos: 53000,
          gastoSemSolar10Anos: 135000,
          gastoSemSolar25Anos: 470000,
          paybackMeses: 49,
          paybackAnos: 4.1,
          reajusteAnualPercentual: 9,
          tarifaEfetiva: 0.95,
          taxaMinimaDisponibilidadeKwh: 30,
          taxaMinimaDisponibilidadeReais: 28.5,
          contaAtualSemSolarMes: 750,
          contaAtualSemSolarAno: 9000,
          contaPrimeiroMesComSolar: 75,
          valorTotalCustos: 26000,
          custoPorKwpInstalado: 4117.65,
          contaSemSolar4AnosComReajuste: 1058,
          contaComSolar4AnosComReajuste: 105,
          contaSemSolar10AnosComReajuste: 1775,
          contaComSolar10AnosComReajuste: 177,
          geracaoMensalDetalhada: [],
          parcelamentos: {
            aVista: {
              titulo: 'À Vista',
              descricao: 'Pagamento à vista',
              numeroParcelas: 1,
              valorParcela: 33250,
              valorTotal: 33250,
              taxaJurosMensal: 0,
              desembolsoMensal: 33250,
              contaComSolar: 75,
              contaSemSolar: 750,
              economiaMensalLiquida: 675,
            },
            cartao18x: {
              titulo: 'Cartão 18x',
              descricao: 'Cartão 18x',
              numeroParcelas: 18,
              valorParcela: 1944,
              valorTotal: 35000,
              taxaJurosMensal: 0,
              desembolsoMensal: 2019,
              contaComSolar: 75,
              contaSemSolar: 750,
              economiaMensalLiquida: -1269,
            },
            financiamentoBanco1: {
              titulo: 'Cresol (60x)',
              descricao: 'Financiamento 60x',
              numeroParcelas: 60,
              valorParcela: 805,
              valorTotal: 48300,
              taxaJurosMensal: 1.39,
              desembolsoMensal: 880,
              contaComSolar: 75,
              contaSemSolar: 750,
              economiaMensalLiquida: -130,
              valorIof: 375.78,
            },
            financiamentoBanco2: {
              titulo: 'Santander (120x)',
              descricao: 'Financiamento 120x',
              numeroParcelas: 120,
              valorParcela: 520,
              valorTotal: 62400,
              taxaJurosMensal: 1.45,
              desembolsoMensal: 595,
              contaComSolar: 75,
              contaSemSolar: 750,
              economiaMensalLiquida: 155,
              valorIof: 520.15,
            },
          },
        },
        layoutTelhadoHabilitado: true,
        layoutTelhadoUrl: layoutUrlValida,
      }

      // Preview gerado com os dados de entrada
      const htmlPreview = gerarHTMLPropostaSolar(inputSolar)
      // PDF gerado com os MESMOS dados de entrada
      const htmlPDF = gerarHTMLPropostaSolar(inputSolar)

      // Identidade estrita entre preview e PDF
      expect(htmlPreview).toBe(htmlPDF)
      expect(htmlPreview).toContain('Veja como ficará sua usina no telhado')
      expect(htmlPreview).toContain('Inc. IOF')
      expect(htmlPreview).toContain('375,78')
    })

    it('controla a visibilidade de seções opcionais via secoesHabilitadas', () => {
      const baseDados: PropostaTecnicoComercialDados = {
        ...dadosExemplo,
        layoutTelhadoHabilitado: true,
        layoutTelhadoUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        sistema: {
          ...dadosExemplo.sistema,
          fotoModuloUrl: 'https://exemplo.com/modulo.jpg',
          fotoInversorUrl: 'https://exemplo.com/inversor.jpg',
        },
        producao: {
          ...dadosExemplo.producao,
          geracaoMensal: [
            {
              mesIndex: 0,
              mesNome: 'Janeiro',
              dias: 31,
              irradiacaoHSP: 5.2,
              fatorSazonal: 1.15,
              geracaoKwh: 680,
            },
            {
              mesIndex: 1,
              mesNome: 'Fevereiro',
              dias: 28,
              irradiacaoHSP: 4.8,
              fatorSazonal: 1.05,
              geracaoKwh: 620,
            },
          ],
        },
      }

      // 1. Todas as seções habilitadas (ou padrão)
      const htmlCompleto = gerarHTMLPropostaTecnicoComercial({
        ...baseDados,
        secoesHabilitadas: {
          layoutTelhado: true,
          fotosProjeto: true,
          sazonalidadeSolar: true,
          portfolioUsinas: true,
        },
      })
      expect(htmlCompleto).toContain('id="secao-apresentacao-empresa"')
      expect(htmlCompleto).toContain('A Delfos Solar')
      expect(htmlCompleto).toContain('Energia que gera retorno')
      expect(htmlCompleto).toContain('Conheça algumas de nossas instalações')
      expect(htmlCompleto).toContain('https://exemplo.com/modulo.jpg')
      expect(htmlCompleto).toContain('https://exemplo.com/inversor.jpg')
      expect(htmlCompleto).toContain('Estimativa de Geração Mês a Mês')
      expect(htmlCompleto).toContain('id="secao-layout-telhado"')

      // 2. Portfólio de usinas desligado (Parte 1 permanece; Parte 2 é omitida)
      const htmlSemPortfolio = gerarHTMLPropostaTecnicoComercial({
        ...baseDados,
        secoesHabilitadas: {
          portfolioUsinas: false,
        },
      })
      expect(htmlSemPortfolio).toContain('id="secao-apresentacao-empresa"')
      expect(htmlSemPortfolio).toContain('A Delfos Solar')
      expect(htmlSemPortfolio).toContain('Energia que gera retorno')
      expect(htmlSemPortfolio).not.toContain('Conheça algumas de nossas instalações')
      expect(htmlSemPortfolio).toContain('https://exemplo.com/modulo.jpg')
      expect(htmlSemPortfolio).toContain('Estimativa de Geração Mês a Mês')

      // 3. Fotos do projeto desligadas
      const htmlSemFotos = gerarHTMLPropostaTecnicoComercial({
        ...baseDados,
        secoesHabilitadas: {
          fotosProjeto: false,
        },
      })
      expect(htmlSemFotos).not.toContain('https://exemplo.com/modulo.jpg')
      expect(htmlSemFotos).not.toContain('https://exemplo.com/inversor.jpg')
      expect(htmlSemFotos).toContain('Tier-1 Global')
      expect(htmlSemFotos).toContain('id="secao-apresentacao-empresa"')

      // 4. Sazonalidade solar desligada
      const htmlSemSazonalidade = gerarHTMLPropostaTecnicoComercial({
        ...baseDados,
        secoesHabilitadas: {
          sazonalidadeSolar: false,
        },
      })
      expect(htmlSemSazonalidade).not.toContain('Estimativa de Geração Mês a Mês')
      expect(htmlSemSazonalidade).toContain('id="secao-apresentacao-empresa"')

      // 5. Layout do telhado desligado via secoesHabilitadas
      const htmlSemLayout = gerarHTMLPropostaTecnicoComercial({
        ...baseDados,
        secoesHabilitadas: {
          layoutTelhado: false,
        },
      })
      expect(htmlSemLayout).not.toContain('id="secao-layout-telhado"')

      // 6. Preview e PDF idênticos para mesmos dados com flags desligadas
      const dadosDesligados: PropostaTecnicoComercialDados = {
        ...baseDados,
        secoesHabilitadas: {
          layoutTelhado: false,
          fotosProjeto: false,
          sazonalidadeSolar: false,
          portfolioUsinas: false,
        },
      }
      const previewDesligado = gerarHTMLPropostaTecnicoComercial(dadosDesligados)
      const pdfDesligado = gerarHTMLPropostaTecnicoComercial(dadosDesligados)
      expect(previewDesligado).toBe(pdfDesligado)
      expect(previewDesligado).toContain('id="secao-apresentacao-empresa"')
      expect(previewDesligado).toContain('A Delfos Solar')
      expect(previewDesligado).not.toContain('Conheça algumas de nossas instalações')
      expect(previewDesligado).not.toContain('Estimativa de Geração Mês a Mês')
      expect(previewDesligado).not.toContain('id="secao-layout-telhado"')
      expect(previewDesligado).not.toContain('https://exemplo.com/modulo.jpg')
    })

    it('validação programática C: proposta comercial de Claiton Gasparetto Filho', () => {
      // Cenário Claiton Gasparetto Filho: 3,75 kWp, 6 placas 625W, tarifa R$ 1,19, consumo 300 kWh/mês
      const dadosClaiton: PropostaTecnicoComercialDados = {
        ...dadosExemplo,
        cliente: {
          ...dadosExemplo.cliente,
          nome: 'Claiton Gasparetto Filho',
          cidade: 'Erechim / RS',
        },
        sistema: {
          ...dadosExemplo.sistema,
          potenciaKwp: 3.75,
          qtdPaineis: 6,
          potenciaPlacaWp: 625,
          descricaoPaineis: 'Módulo Fotovoltaico 625W Tier-1',
          descricaoInversores: 'Inversor 3.0 kW Monofásico',
          areaNecessariaM2: 18,
        },
        producao: {
          ...dadosExemplo.producao,
          mediaMensalKwh: 300,
        },
      }

      // 1. Gera o HTML com portfólio habilitado (ou omitido, fallback true)
      const htmlClaiton = gerarHTMLPropostaTecnicoComercial(dadosClaiton)

      // Verificações obrigatórias do item C:
      expect(htmlClaiton).toContain('A Delfos Solar')
      expect(htmlClaiton).toContain('Energia que gera retorno')
      expect(htmlClaiton).toContain('Conheça algumas de nossas instalações')
      expect(htmlClaiton).toContain('Erechim')
      expect(htmlClaiton).toContain('Pato Branco')

      // 6 ocorrências de card de usina na grade 3x2 do portfólio
      const matchesCard = htmlClaiton.match(/class="card-portfolio-usina"/g)
      expect(matchesCard).not.toBeNull()
      expect(matchesCard?.length).toBe(6)

      // 2. Confirmação com secoesHabilitadas.portfolioUsinas === false:
      // A Parte 1 (Quem Somos) DEVE aparecer mesmo com o portfólio desligado
      const htmlClaitonSemPortfolio = gerarHTMLPropostaTecnicoComercial({
        ...dadosClaiton,
        secoesHabilitadas: {
          portfolioUsinas: false,
        },
      })
      expect(htmlClaitonSemPortfolio).toContain('id="secao-apresentacao-empresa"')
      expect(htmlClaitonSemPortfolio).toContain('A Delfos Solar')
      expect(htmlClaitonSemPortfolio).toContain('Energia que gera retorno')
      expect(htmlClaitonSemPortfolio).toContain('12 anos de atuação no mercado de energia')
      expect(htmlClaitonSemPortfolio).not.toContain('Conheça algumas de nossas instalações')
      expect(htmlClaitonSemPortfolio.match(/class="card-portfolio-usina"/g)).toBeNull()
    })
  })

  describe('Integração Solergo (ajuste excepcional de curva de geração)', () => {
    it('com ajusteSolergoAtivo:true + geracaoMensalSolergo somando 4.200, o HTML contém nota e "4.200"', () => {
      // Usina 3,75 kWp com 12 meses customizados do Solergo somando 4.200 kWh/ano
      const mesesSolergo = [420, 390, 380, 330, 290, 270, 280, 320, 350, 380, 400, 390]
      const totalSolergo = mesesSolergo.reduce((acc, curr) => acc + curr, 0)
      expect(totalSolergo).toBe(4200)

      const dadosSolergo: PropostaTecnicoComercialDados = {
        ...dadosExemplo,
        ajusteSolergoAtivo: true,
        geracaoMensalSolergo: mesesSolergo,
        producao: {
          anualKwh: 4200,
          mediaMensalKwh: 350,
          geracaoMensal: [
            {
              mesIndex: 1,
              mesNome: 'Jan',
              geracaoKwh: 420,
              irradiacaoHSP: 5.2,
              dias: 31,
              fatorSazonal: 1.1,
            },
            {
              mesIndex: 2,
              mesNome: 'Fev',
              geracaoKwh: 390,
              irradiacaoHSP: 4.8,
              dias: 28,
              fatorSazonal: 1.05,
            },
            {
              mesIndex: 3,
              mesNome: 'Mar',
              geracaoKwh: 380,
              irradiacaoHSP: 4.5,
              dias: 31,
              fatorSazonal: 1.0,
            },
            {
              mesIndex: 4,
              mesNome: 'Abr',
              geracaoKwh: 330,
              irradiacaoHSP: 3.9,
              dias: 30,
              fatorSazonal: 0.9,
            },
            {
              mesIndex: 5,
              mesNome: 'Mai',
              geracaoKwh: 290,
              irradiacaoHSP: 3.2,
              dias: 31,
              fatorSazonal: 0.78,
            },
            {
              mesIndex: 6,
              mesNome: 'Jun',
              geracaoKwh: 270,
              irradiacaoHSP: 2.9,
              dias: 30,
              fatorSazonal: 0.72,
            },
            {
              mesIndex: 7,
              mesNome: 'Jul',
              geracaoKwh: 280,
              irradiacaoHSP: 3.1,
              dias: 31,
              fatorSazonal: 0.75,
            },
            {
              mesIndex: 8,
              mesNome: 'Ago',
              geracaoKwh: 320,
              irradiacaoHSP: 3.7,
              dias: 31,
              fatorSazonal: 0.85,
            },
            {
              mesIndex: 9,
              mesNome: 'Set',
              geracaoKwh: 350,
              irradiacaoHSP: 4.1,
              dias: 30,
              fatorSazonal: 0.92,
            },
            {
              mesIndex: 10,
              mesNome: 'Out',
              geracaoKwh: 380,
              irradiacaoHSP: 4.6,
              dias: 31,
              fatorSazonal: 1.02,
            },
            {
              mesIndex: 11,
              mesNome: 'Nov',
              geracaoKwh: 400,
              irradiacaoHSP: 5.0,
              dias: 30,
              fatorSazonal: 1.1,
            },
            {
              mesIndex: 12,
              mesNome: 'Dez',
              geracaoKwh: 390,
              irradiacaoHSP: 4.9,
              dias: 31,
              fatorSazonal: 1.15,
            },
          ],
        },
      }

      const html = gerarHTMLPropostaTecnicoComercial(dadosSolergo)
      expect(html).toContain('Geração ajustada conforme relatório Solergo')
      expect(html).toContain('4.200')
    })

    it('sem ajuste Solergo, o HTML mantém 4.807 e NÃO contém a nota', () => {
      const dadosSemSolergo: PropostaTecnicoComercialDados = {
        ...dadosExemplo,
        ajusteSolergoAtivo: false,
        producao: {
          anualKwh: 4807,
          mediaMensalKwh: 401,
          geracaoMensal: [
            {
              mesIndex: 1,
              mesNome: 'Jan',
              geracaoKwh: 480,
              irradiacaoHSP: 5.2,
              dias: 31,
              fatorSazonal: 1.1,
            },
            {
              mesIndex: 2,
              mesNome: 'Fev',
              geracaoKwh: 440,
              irradiacaoHSP: 4.8,
              dias: 28,
              fatorSazonal: 1.05,
            },
            {
              mesIndex: 3,
              mesNome: 'Mar',
              geracaoKwh: 430,
              irradiacaoHSP: 4.5,
              dias: 31,
              fatorSazonal: 1.0,
            },
            {
              mesIndex: 4,
              mesNome: 'Abr',
              geracaoKwh: 380,
              irradiacaoHSP: 3.9,
              dias: 30,
              fatorSazonal: 0.9,
            },
            {
              mesIndex: 5,
              mesNome: 'Mai',
              geracaoKwh: 340,
              irradiacaoHSP: 3.2,
              dias: 31,
              fatorSazonal: 0.78,
            },
            {
              mesIndex: 6,
              mesNome: 'Jun',
              geracaoKwh: 310,
              irradiacaoHSP: 2.9,
              dias: 30,
              fatorSazonal: 0.72,
            },
            {
              mesIndex: 7,
              mesNome: 'Jul',
              geracaoKwh: 320,
              irradiacaoHSP: 3.1,
              dias: 31,
              fatorSazonal: 0.75,
            },
            {
              mesIndex: 8,
              mesNome: 'Ago',
              geracaoKwh: 370,
              irradiacaoHSP: 3.7,
              dias: 31,
              fatorSazonal: 0.85,
            },
            {
              mesIndex: 9,
              mesNome: 'Set',
              geracaoKwh: 400,
              irradiacaoHSP: 4.1,
              dias: 30,
              fatorSazonal: 0.92,
            },
            {
              mesIndex: 10,
              mesNome: 'Out',
              geracaoKwh: 430,
              irradiacaoHSP: 4.6,
              dias: 31,
              fatorSazonal: 1.02,
            },
            {
              mesIndex: 11,
              mesNome: 'Nov',
              geracaoKwh: 450,
              irradiacaoHSP: 5.0,
              dias: 30,
              fatorSazonal: 1.1,
            },
            {
              mesIndex: 12,
              mesNome: 'Dez',
              geracaoKwh: 457,
              irradiacaoHSP: 4.9,
              dias: 31,
              fatorSazonal: 1.15,
            },
          ],
        },
      }

      const html = gerarHTMLPropostaTecnicoComercial(dadosSemSolergo)
      expect(html).toContain('4.807')
      expect(html).not.toContain('Geração ajustada conforme relatório Solergo')
    })
  })
})
