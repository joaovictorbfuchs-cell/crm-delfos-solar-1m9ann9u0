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

  it('contém referências às 6 seções canônicas e não contém termos legados', async () => {
    const doc = await gerarPropostaSolarDocx(dadosExemploMarceloBecker)
    const jsonStr = JSON.stringify(doc)

    // As 6 seções canônicas devem estar presentes
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
    expect(jsonStr).toContain('Projeção de Economia na Conta de Energia')
    expect(jsonStr).toContain('ECONOMIA TOTAL EM 25 ANOS')
    expect(jsonStr).toContain('GASTO TOTAL SEM SOLAR')
    expect(jsonStr).toContain('CUSTO DE POSTERGAÇÃO')
    expect(jsonStr).toContain('Projeção de Economia em 25 Anos')
    expect(jsonStr).toContain('ECONOMIA EM 1 ANO')
    expect(jsonStr).toContain('ECONOMIA EM 5 ANOS')
    expect(jsonStr).toContain('ECONOMIA EM 25 ANOS')
    expect(jsonStr).toContain('Investimento e Condições de Pagamento')
    expect(jsonStr).toContain('Fatura c/ solar + parcela:')
    expect(jsonStr).toContain('Custo atual:')

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
})
