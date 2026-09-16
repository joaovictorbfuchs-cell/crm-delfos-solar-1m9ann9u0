import { describe, it, expect } from 'vitest'
import {
  gerarHTMLPropostaTecnicoComercial,
  DADOS_FIXOS_EMPRESA_DELFOS,
  type PropostaTecnicoComercialDados,
} from './propostaTecnicoComercialGenerator'

describe('Proposta Técnico-Comercial Generator', () => {
  const dadosExemplo: PropostaTecnicoComercialDados = {
    cliente: {
      nome: 'João Silva Teste',
      cpfOuCnpj: '123.456.789-00',
      endereco: 'Rua das Palmeiras, 100',
      municipio: 'Erechim / RS',
    },
    representante: {
      nome: 'João Victor Bagetti Fuchs',
      contato: '(54) 99129-2121',
    },
    dataProposta: '15/05/2025',
    validadeDias: 5,
    empresa: DADOS_FIXOS_EMPRESA_DELFOS,
    fotosInstalacoes: [
      {
        id: '1',
        titulo: 'Usina 114 Kwp Barra do Rio Azul/ RS',
        url: 'https://img.usecurling.com/p/800/600?q=solar+plant',
      },
      {
        id: '2',
        titulo: 'Usina Cassul 185 Kwp Erechim',
        url: 'https://img.usecurling.com/p/800/600?q=solar+plant',
      },
      {
        id: '3',
        titulo: 'Usina Clanel 123,5 Kwp Erechim/ RS',
        url: 'https://img.usecurling.com/p/800/600?q=solar+plant',
      },
      {
        id: '4',
        titulo: 'Estacionamento - System 75Kw Erechim',
        url: 'https://img.usecurling.com/p/800/600?q=solar+plant',
      },
    ],
    incluirImagemComoFunciona: true,
    incluirImagemMonitoramento: true,
    sistema: {
      potenciaKwp: 10.5,
      descricaoPaineis: 'Canadian Solar 550W Tier-1 Monocristalino',
      qtdPaineis: 20,
      descricaoInversores: 'Growatt 10kW On-Grid com WiFi',
      qtdInversores: 1,
      estruturaFixacao: 'Alumínio para telhado cerâmico',
      codigoFiname: 'FINAME-12345',
      areaNecessariaM2: 50,
    },
    garantias: {
      paineisAnosFabricacao: 12,
      paineisAnosDesempenho: 25,
      paineisPercentualDesempenho: '84,8%',
      inversorAnosFabricacao: 10,
      instalacaoAnos: 1,
    },
    producao: {
      anualKwh: 15000,
      mediaMensalKwh: 1250,
      geracaoMensal: [
        {
          mesNome: 'Jan',
          mesIndex: 0,
          dias: 31,
          irradiacaoHSP: 5.65,
          fatorSazonal: 1.1,
          geracaoKwh: 1400,
        },
        {
          mesNome: 'Fev',
          mesIndex: 1,
          dias: 28,
          irradiacaoHSP: 5.35,
          fatorSazonal: 1.0,
          geracaoKwh: 1300,
        },
        {
          mesNome: 'Mar',
          mesIndex: 2,
          dias: 31,
          irradiacaoHSP: 4.8,
          fatorSazonal: 1.0,
          geracaoKwh: 1250,
        },
        {
          mesNome: 'Abr',
          mesIndex: 3,
          dias: 30,
          irradiacaoHSP: 4.05,
          fatorSazonal: 0.9,
          geracaoKwh: 1100,
        },
        {
          mesNome: 'Mai',
          mesIndex: 4,
          dias: 31,
          irradiacaoHSP: 3.25,
          fatorSazonal: 0.7,
          geracaoKwh: 900,
        },
        {
          mesNome: 'Jun',
          mesIndex: 5,
          dias: 30,
          irradiacaoHSP: 2.95,
          fatorSazonal: 0.68,
          geracaoKwh: 850,
        },
        {
          mesNome: 'Jul',
          mesIndex: 6,
          dias: 31,
          irradiacaoHSP: 3.15,
          fatorSazonal: 0.73,
          geracaoKwh: 920,
        },
        {
          mesNome: 'Ago',
          mesIndex: 7,
          dias: 31,
          irradiacaoHSP: 3.9,
          fatorSazonal: 0.84,
          geracaoKwh: 1050,
        },
        {
          mesNome: 'Set',
          mesIndex: 8,
          dias: 30,
          irradiacaoHSP: 4.25,
          fatorSazonal: 0.92,
          geracaoKwh: 1150,
        },
        {
          mesNome: 'Out',
          mesIndex: 9,
          dias: 31,
          irradiacaoHSP: 4.95,
          fatorSazonal: 1.04,
          geracaoKwh: 1300,
        },
        {
          mesNome: 'Nov',
          mesIndex: 10,
          dias: 30,
          irradiacaoHSP: 5.6,
          fatorSazonal: 1.12,
          geracaoKwh: 1400,
        },
        {
          mesNome: 'Dez',
          mesIndex: 11,
          dias: 31,
          irradiacaoHSP: 5.85,
          fatorSazonal: 1.16,
          geracaoKwh: 1450,
        },
      ],
    },
    economia: {
      investimentoTotal: 45000,
      prazoEntregaDias: 40,
      paybackTexto: '4,2 anos (50 meses)',
    },
    parcelamento: {
      aVista: {
        valorTotal: 45000,
        contaHoje: 950,
        contaComSolar: 85,
      },
      cartao18x: {
        numeroParcelas: 18,
        valorParcela: 2800,
        contaHoje: 950,
        contaComSolar: 85,
      },
      financiamentoA: {
        nome: 'FINANCIAMENTO A',
        numeroParcelas: 60,
        valorParcela: 1035,
        contaHoje: 950,
        contaComSolar: 85,
      },
      financiamentoB: {
        nome: 'FINANCIAMENTO B',
        numeroParcelas: 72,
        valorParcela: 900,
        contaHoje: 950,
        contaComSolar: 85,
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

  it('deve gerar HTML contendo todos os blocos fixos e dinâmicos exigidos', () => {
    const html = gerarHTMLPropostaTecnicoComercial(dadosExemplo)

    // Cabeçalho e Título
    expect(html).toContain('PROPOSTA TÉCNICO - COMERCIAL')
    expect(html).toContain('DELFOS SOLAR')
    expect(html).toContain('João Silva Teste')
    expect(html).toContain('João Victor Bagetti Fuchs')

    // QUEM SOMOS
    expect(html).toContain('QUEM SOMOS')
    expect(html).toContain('A Delfos Solar é especialista em transformar contas de energia')
    expect(html).toContain('12 anos de atuação ininterrupta no mercado de energia')
    expect(html).toContain('Mais de 2.500 projetos entregues e homologados')

    // Galeria de Usinas
    expect(html).toContain('Usina Cassul 185 Kwp Erechim')
    expect(html).toContain('Usina Clanel 123,5 Kwp Erechim/ RS')

    // Monitoramento
    expect(html).toContain('MONITORAMENTO')
    expect(html).toContain(
      'O sistema de monitoramento permite ao usuário acessar remotamente o desempenho do seu gerador via smartphone e computador.',
    )
    expect(html).toContain('COMO FUNCIONA O SISTEMA SOLAR ON-GRID')

    // Especificações Técnicas
    expect(html).toContain('ESPECIFICAÇÕES TÉCNICAS DO SISTEMA')
    expect(html).toContain('10,50 kWp')
    expect(html).toContain('Canadian Solar 550W Tier-1 Monocristalino')
    expect(html).toContain('20 unid.')
    expect(html).toContain('Área necessária para instalação:')

    // Serviços Inclusos e Garantias
    expect(html).toContain('SERVIÇOS INCLUSOS:')
    expect(html).toContain(
      'Elaboração do projeto fotovoltaico e homologação junto à concessionária de energia',
    )
    expect(html).toContain('GARANTIAS')
    expect(html).toContain(
      'Não são cobertas as garantias de peças ou componentes por desgaste natural, como disjuntores e DPS',
    )

    // Produção e Tabela Mensal
    expect(html).toContain('PRODUÇÃO DE ENERGIA')
    expect(html).toContain('GERAÇÃO MENSAL (KWH)')
    expect(html).toContain('Jan')
    expect(html).toContain('Dez')

    // Economia e Simulação de Parcelamento (4 colunas)
    expect(html).toContain('SUA PROPOSTA DE ECONOMIA ENERGÉTICA')
    expect(html).toContain('SIMULAÇÃO DE PARCELAMENTO')
    expect(html).toContain('À VISTA')
    expect(html).toContain('CARTÃO 18X')
    expect(html).toContain('FINANCIAMENTO A')
    expect(html).toContain('FINANCIAMENTO B')
    expect(html).toContain('Maior Economia')
    expect(html).toContain('Sem Burocracia')
    expect(html).toContain('Sem Entrada')
    expect(html).toContain('Menor Parcela')

    // Desperdício x Economia
    expect(html).toContain('PROJEÇÃO DE DESPERDÍCIO X ECONOMIA ACUMULADA')
    expect(html).toContain('jogados fora')
    expect(html).toContain('economizados')
    expect(html).toContain('TOTAL ECONOMIZADO EM 25 ANOS')
    expect(html).toContain('Custo da Postergação')

    // Rodapé
    expect(html).toContain('VALIDADE DA PROPOSTA: 5 dias a partir da apresentação da proposta.')
    expect(html).toContain('RESPONSÁVEL TÉCNICO: JOÃO VICTOR BAGETTI FUCHS')
    expect(html).toContain('CREA: RS151894')
    expect(html).toContain('DELFOS ENGENHARIA LTDA')
    expect(html).toContain('21.379.952/0001-38')

    // Validação da divisão em 4 páginas e quebras para impressão
    expect(html).toContain('id="pagina-1"')
    expect(html).toContain('id="pagina-2"')
    expect(html).toContain('id="pagina-3"')
    expect(html).toContain('id="pagina-4"')
    expect(html).toContain('Página 1 de 4')
    expect(html).toContain('Página 4 de 4')
  })
})
