import { describe, it, expect } from 'vitest'
import { gerarPropostaSolarDocx, gerarBlobPropostaSolarDocx } from './propostaSolarDocxGenerator'
import { calcularOrcamentoSolar } from './energiaSolar'
import type { PropostaSolarPDFInput } from './propostaSolarGenerator'

describe('propostaSolarDocxGenerator', () => {
  const calculos = calcularOrcamentoSolar({
    consumoKwhMes: 750,
    tipoCliente: 'residencial',
    tarifaKwh: 0.95,
    potenciaKwp: 6.6,
    orientacaoTelhado: 'norte',
    valorInvestimentoInformado: 25080,
  })

  const dadosExemploMarceloBecker: PropostaSolarPDFInput = {
    cliente: {
      nome: 'Marcelo Becker',
      cpfOuCnpj: '123.456.789-00',
      endereco: 'Rua das Flores, 120, Centro',
      municipio: 'Erechim / RS',
      email: 'marcelo.becker@exemplo.com.br',
      telefone: '(54) 99999-8888',
      tipoCliente: 'residencial',
    },
    representanteComercial: 'Consultor Delfos Solar',
    sistema: {
      potenciaKwp: 6.6,
      consumoKwhMes: 750,
      numeroPlacas: 12,
      potenciaPlacaWp: 550,
      marcaPlacas: 'Canadian Solar 550W BiHiKu7',
      marcaInversor: 'Growatt MIN 6000TL-X',
      quantidadeInversores: 1,
      tipoEstrutura: 'ceramico',
      orientacaoTelhado: 'norte',
      areaNecessariaM2: 29,
      codigoFiname: 'FINAME-SOLAR-BR',
      prazoEntregaDias: 30,
    },
    calculos,
    dataEmissao: '2025-05-10T12:00:00.000Z',
    validadeDias: 5,
    observacoes: 'Projeto piloto com homologação RGE inclusa.',
  }

  it('deve instanciar o documento docx sem erros', async () => {
    const doc = await gerarPropostaSolarDocx(dadosExemploMarceloBecker)
    expect(doc).toBeDefined()
  })

  it('deve gerar um Blob de tamanho positivo para download', async () => {
    const blob = await gerarBlobPropostaSolarDocx(dadosExemploMarceloBecker)
    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(1000)
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
  })

  it('contém referências às 5 seções canônicas e não contém termos legados', async () => {
    const doc = await gerarPropostaSolarDocx(dadosExemploMarceloBecker)
    const jsonStr = JSON.stringify(doc)

    // As 5 seções canônicas devem estar presentes
    expect(jsonStr).toContain('PROPOSTA COMERCIAL EXCLUSIVA')
    expect(jsonStr).toContain('Situação Atual')
    expect(jsonStr).toContain('GASTO EM 1 ANO')
    expect(jsonStr).toContain('GASTO EM 25 ANOS')
    expect(jsonStr).not.toContain('Consumo convertido em custo')
    expect(jsonStr).not.toContain('DIAGNÓSTICO FINANCEIRO DE PERDA ACUMULADA')
    expect(jsonStr).not.toContain('Esse dinheiro poderia estar no seu bolso')
    expect(jsonStr).not.toContain('Decisão Inteligente • Concessionária vs. Patrimônio Solar')
    expect(jsonStr).not.toContain('Seu Ativo Próprio')
    expect(jsonStr).not.toContain('não recebe nada em troca')
    expect(jsonStr).toContain('Seu Sistema Fotovoltaico')
    expect(jsonStr).toContain('Garantia de performance (degradação):')
    expect(jsonStr).toContain('Garantia contra defeitos de fabricação:')
    expect(jsonStr).toContain('Garantia do inversor:')
    expect(jsonStr).not.toContain('Garantia da instalação:')
    // Tabela Compacta de Geração Mensal Prevista (Janeiro a Dezembro — Erechim/RS)
    expect(jsonStr).toContain('Geração Mensal Prevista (Janeiro a Dezembro — Erechim/RS)')
    expect(jsonStr).toContain('Total anual: ')
    expect(jsonStr).toContain('Média mensal: ')
    expect(jsonStr).not.toContain('IRRADIAÇÃO (HSP)')
    expect(jsonStr).not.toContain('FATOR SAZONAL')
    // Seção legada de Projeção na Conta de Energia removida
    expect(jsonStr).not.toContain('Projeção de Economia na Conta de Energia')
    expect(jsonStr).not.toContain('ECONOMIA TOTAL EM 25 ANOS')
    expect(jsonStr).not.toContain('GASTO TOTAL SEM SOLAR')
    expect(jsonStr).not.toContain('FATOR DE SIMULTANEIDADE')
    expect(jsonStr).not.toContain('MARCO LEGAL DA GD')
    // Seção 4: Projeção de Economia em 25 Anos
    expect(jsonStr).toContain('4. Projeção de Economia em 25 Anos')
    expect(jsonStr).toContain('ECONOMIA EM 1 ANO')
    expect(jsonStr).toContain('ECONOMIA EM 5 ANOS')
    expect(jsonStr).toContain('ECONOMIA EM 25 ANOS')
    // Seção 5: Investimento e Condições de Pagamento com Card de Postergação
    expect(jsonStr).toContain('5. Investimento e Condições de Pagamento')
    expect(jsonStr).toContain('Condições de pagamento')
    expect(jsonStr).toContain('Conta hoje: ')
    expect(jsonStr).not.toContain('Conta s/ solar: ')
    expect(jsonStr).toContain('Fatura c/ solar + parcela:')
    expect(jsonStr).toContain('Custo atual:')
    expect(jsonStr).toContain('Payback do Sistema:')
    expect(jsonStr).toContain('DESDE 2014')
    expect(jsonStr).toContain('FINANCIAMENTO 1')
    expect(jsonStr).toContain('FINANCIAMENTO 2')
    expect(jsonStr).toContain('CUSTO DE POSTERGAÇÃO')
    expect(jsonStr).toContain('VALOR PERDIDO POR MÊS')
    expect(jsonStr).not.toContain('troque despesa por patrimônio')

    // Termos legados não devem existir no docx
    expect(jsonStr).not.toContain('Quem Somos')
    expect(jsonStr).not.toContain('Como Funciona o Sistema Solar On-Grid')
    expect(jsonStr).not.toContain('Monitoramento do Sistema Solar em Tempo Real')
  })

  it('gera card do meio dinâmico com período de payback arredondado para cima (22 meses -> GASTO EM 2 ANOS)', async () => {
    const dados22Meses: PropostaSolarPDFInput = {
      ...dadosExemploMarceloBecker,
      calculos: {
        ...dadosExemploMarceloBecker.calculos,
        paybackMeses: 22,
        anosPaybackArredondado: 2,
        gastoSemSolarPaybackAnos: undefined,
      },
    }

    const doc = await gerarPropostaSolarDocx(dados22Meses)
    const jsonStr = JSON.stringify(doc)

    expect(jsonStr).toContain('Gastos Acumulados Sem Solar: 1, 2 Anos e 25 Anos')
    expect(jsonStr).toContain('GASTO EM 2 ANOS')
  })

  it('gera card do meio dinâmico com payback de 25 meses -> GASTO EM 3 ANOS e acumulação com 9% a.a.', async () => {
    const dados25Meses: PropostaSolarPDFInput = {
      ...dadosExemploMarceloBecker,
      calculos: {
        ...dadosExemploMarceloBecker.calculos,
        paybackMeses: 25,
        anosPaybackArredondado: undefined,
        gastoSemSolarPaybackAnos: undefined,
      },
    }

    const doc = await gerarPropostaSolarDocx(dados25Meses)
    const jsonStr = JSON.stringify(doc)

    expect(jsonStr).toContain('Gastos Acumulados Sem Solar: 1, 3 Anos e 25 Anos')
    expect(jsonStr).toContain('GASTO EM 3 ANOS')
  })

  it('aplica fallback para 5 anos (GASTO EM 5 ANOS) quando payback for zerado ou inválido', async () => {
    const dadosFallback: PropostaSolarPDFInput = {
      ...dadosExemploMarceloBecker,
      calculos: {
        ...dadosExemploMarceloBecker.calculos,
        paybackMeses: 0,
        anosPaybackArredondado: undefined,
        gastoSemSolarPaybackAnos: undefined,
      },
    }

    const doc = await gerarPropostaSolarDocx(dadosFallback)
    const jsonStr = JSON.stringify(doc)

    expect(jsonStr).toContain('Gastos Acumulados Sem Solar: 1, 5 Anos e 25 Anos')
    expect(jsonStr).toContain('GASTO EM 5 ANOS')
  })

  it('evita duplicidade de "GASTO EM 1 ANO" quando payback for menor que 12 meses (ex.: 5 meses -> GASTO EM 5 ANOS)', async () => {
    const dados5Meses: PropostaSolarPDFInput = {
      ...dadosExemploMarceloBecker,
      calculos: {
        ...dadosExemploMarceloBecker.calculos,
        paybackMeses: 5,
        anosPaybackArredondado: undefined,
        gastoSemSolarPaybackAnos: undefined,
      },
    }

    const doc = await gerarPropostaSolarDocx(dados5Meses)
    const jsonStr = JSON.stringify(doc)

    expect(jsonStr).toContain('Gastos Acumulados Sem Solar: 1, 5 Anos e 25 Anos')
    expect(jsonStr).toContain('GASTO EM 1 ANO')
    expect(jsonStr).toContain('GASTO EM 5 ANOS')
    expect(jsonStr).toContain('GASTO EM 25 ANOS')
  })

  it('respeita secoesHabilitadas.portfolioUsinas: false omitindo o portfólio no docx', async () => {
    const dadosSemPortfolio: PropostaSolarPDFInput = {
      ...dadosExemploMarceloBecker,
      secoesHabilitadas: {
        portfolioUsinas: false,
      },
    }
    const doc = await gerarPropostaSolarDocx(dadosSemPortfolio)
    const jsonStr = JSON.stringify(doc)
    expect(jsonStr).not.toContain('PORTFÓLIO DE USINAS INSTALADAS')
  })

  it('respeita secoesHabilitadas.sazonalidadeSolar: false omitindo a sazonalidade no docx', async () => {
    const dadosSemSazonalidade: PropostaSolarPDFInput = {
      ...dadosExemploMarceloBecker,
      secoesHabilitadas: {
        sazonalidadeSolar: false,
      },
    }
    const doc = await gerarPropostaSolarDocx(dadosSemSazonalidade)
    const jsonStr = JSON.stringify(doc)
    expect(jsonStr).not.toContain('Geração Mensal Prevista (Janeiro a Dezembro — Erechim/RS)')
  })

  it('no bloco de assinaturas do docx, não exibe "Não informado" quando dados cadastrais do cliente faltam', async () => {
    const dadosSemCadastro: PropostaSolarPDFInput = {
      ...dadosExemploMarceloBecker,
      cliente: {
        nome: 'Marcelo Becker',
      },
    }
    const doc = await gerarPropostaSolarDocx(dadosSemCadastro)
    const jsonStr = JSON.stringify(doc)
    expect(jsonStr).toContain('EMPRESA CONTRATADA')
    expect(jsonStr).toContain('CLIENTE / CONTRATANTE')
    expect(jsonStr).toContain('MARCELO BECKER')
    expect(jsonStr).toContain('De acordo com as especificações e valores da proposta')
    expect(jsonStr).toContain('CPF/CNPJ: ')
    expect(jsonStr).toContain('Endereço: ')
    expect(jsonStr).toContain('Contato: ')
    expect(jsonStr).not.toContain('Não informado')
  })

  it('omite a tabela de geração mensal detalhada quando geracaoMensalDetalhada for vazio ou nulo (fallback)', async () => {
    const dadosSemGeracao: PropostaSolarPDFInput = {
      ...dadosExemploMarceloBecker,
      calculos: {
        ...dadosExemploMarceloBecker.calculos,
        geracaoMensalDetalhada: [] as any,
      },
    }
    const doc = await gerarPropostaSolarDocx(dadosSemGeracao)
    const jsonStr = JSON.stringify(doc)
    expect(jsonStr).not.toContain('Geração Mensal Prevista')
  })

  it('renderiza o novo rodapé limpo em uma linha com endereço e site sem slogan e sem CREA/responsável no rodapé', async () => {
    const doc = await gerarPropostaSolarDocx(dadosExemploMarceloBecker)
    const jsonStr = JSON.stringify(doc)
    expect(jsonStr).toContain('Delfos Engenharia Solar')
    expect(jsonStr).toContain('21.379.952/0001-38')
    expect(jsonStr).toContain('(54) 99129-2121')
    expect(jsonStr).toContain('www.delfos.eng.br')
    expect(jsonStr).toContain('Rua Espírito Santo, 275 – Centro, Erechim/RS')
    expect(jsonStr).toContain('Proposta válida por 5 dias.')

    // O rodapé não deve conter o slogan nem "Condições especiais..."
    expect(jsonStr).not.toContain('Energia que gera retorno')
    expect(jsonStr).not.toContain('Condições especiais para fechamento imediato')
    expect(jsonStr).not.toContain('Seção 1 de 6')
  })

  it('renderiza a tabela de Projeção com Reajuste Tarifário de 9% ao ano no DOCX', async () => {
    const doc = await gerarPropostaSolarDocx(dadosExemploMarceloBecker)
    const jsonStr = JSON.stringify(doc)
    expect(jsonStr).toContain('Reajuste Tarifário de 9%')
    expect(jsonStr).toContain('daqui a 4 anos')
    expect(jsonStr).toContain('daqui a 10 anos')
    expect(jsonStr).toContain('com solar')
  })

  it('exibe a linha "Inclui IOF de R$ ..." nos cartões de financiamento quando valorIof for informado', async () => {
    const dadosComIof: PropostaSolarPDFInput = {
      ...dadosExemploMarceloBecker,
      calculos: {
        ...dadosExemploMarceloBecker.calculos,
        parcelamentos: {
          ...dadosExemploMarceloBecker.calculos.parcelamentos,
          financiamentoBanco1: {
            ...dadosExemploMarceloBecker.calculos.parcelamentos.financiamentoBanco1,
            valorIof: 1759.98,
          },
          financiamentoBanco2: {
            ...dadosExemploMarceloBecker.calculos.parcelamentos.financiamentoBanco2,
            valorIof: 2150.25,
          },
        },
      },
    }

    const doc = await gerarPropostaSolarDocx(dadosComIof)
    const jsonStr = JSON.stringify(doc)
    expect(jsonStr).toContain('Inclui IOF de')
    expect(jsonStr).toContain('1.759,98')
    expect(jsonStr).toContain('2.150,25')
  })
})
