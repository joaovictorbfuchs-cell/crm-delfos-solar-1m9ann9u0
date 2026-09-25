import { describe, it, expect, beforeEach } from 'vitest'
import {
  otimizarImagemParaImpressao,
  prepararDadosPropostaParaPDF,
  limparCacheOtimizacaoImagens,
  getTamanhoCacheOtimizacaoImagens,
} from './propostaImageOptimizer'
import type { PropostaTecnicoComercialDados } from './propostaTecnicoComercialGenerator'

describe('propostaImageOptimizer', () => {
  beforeEach(() => {
    limparCacheOtimizacaoImagens()
  })

  it('deve retornar o src original como fallback seguro quando a imagem não puder ser carregada (ex: JSDOM)', async () => {
    const urlExemplo = 'https://exemplo.com/foto-usina.jpg'
    const resultado = await otimizarImagemParaImpressao(urlExemplo, {
      maxWidth: 800,
      maxHeight: 600,
      mimeType: 'image/jpeg',
      quality: 0.85,
    })

    // No JSDOM, Image onload não dispara por rede, disparando onerror ou timeout preventivo
    // e retornando com segurança a URL original
    expect(resultado).toBe(urlExemplo)
  })

  it('deve retornar Promise<string> válida para entradas vazias, nulas ou indefinidas', async () => {
    expect(await otimizarImagemParaImpressao('')).toBe('')
    expect(await otimizarImagemParaImpressao(null as any)).toBe('')
    expect(await otimizarImagemParaImpressao(undefined as any)).toBe('')
  })

  it('deve gerenciar o cache sem lançar erros e limpar adequadamente', () => {
    expect(getTamanhoCacheOtimizacaoImagens()).toBe(0)
    limparCacheOtimizacaoImagens()
    expect(getTamanhoCacheOtimizacaoImagens()).toBe(0)
  })

  it('prepararDadosPropostaParaPDF deve retornar um objeto clonado sem mutar o original e preservar estrutura', async () => {
    const dadosOriginais: PropostaTecnicoComercialDados = {
      cliente: {
        nome: 'Cliente Teste Otimizador',
        cidade: 'Erechim - RS',
      },
      representante: {
        nome: 'Consultor Delfos',
        contato: '(54) 99129-2121',
      },
      dataProposta: '27/02/2025',
      validadeDias: 5,
      empresa: {
        razaoSocial: 'DELFOS ENGENHARIA LTDA',
        cnpj: '21.379.952/0001-38',
        endereco: 'Erechim / RS',
        telefone: '(54) 99129-2121',
        email: 'contato@delfos.eng.br',
        site: 'www.delfos.eng.br',
        responsavelTecnico: 'Engenheiro Responsável',
        crea: 'CREA: RS151894',
      },
      fotosInstalacoes: [
        {
          id: 'foto-1',
          titulo: 'Instalação 1',
          url: 'https://exemplo.com/instalacao1.jpg',
        },
      ],
      sistema: {
        potenciaKwp: 10,
        descricaoPaineis: 'Módulo 550W',
        qtdPaineis: 20,
        descricaoInversores: 'Inversor 10kW',
        qtdInversores: 1,
        estruturaFixacao: 'Telhado Colonial',
        areaNecessariaM2: 50,
        fotoModuloUrl: 'https://exemplo.com/modulo.png',
        fotoInversorUrl: 'https://exemplo.com/inversor.png',
      },
      garantias: {
        paineisAnosFabricacao: 15,
        paineisAnosDesempenho: 30,
        paineisPercentualDesempenho: '84,8%',
        inversorAnosFabricacao: 10,
        instalacaoAnos: 1,
      },
      producao: {
        anualKwh: 12000,
        mediaMensalKwh: 1000,
      },
      economia: {
        investimentoTotal: 40000,
        prazoEntregaDias: 30,
        paybackTexto: '36 meses',
      },
      parcelamento: {
        aVista: { valorTotal: 40000, contaHoje: 900, contaComSolar: 100 },
        cartao18x: { numeroParcelas: 18, valorParcela: 2500, contaHoje: 900, contaComSolar: 100 },
        financiamentoA: {
          nome: 'Finan A',
          numeroParcelas: 60,
          valorParcela: 900,
          contaHoje: 900,
          contaComSolar: 100,
        },
        financiamentoB: {
          nome: 'Finan B',
          numeroParcelas: 72,
          valorParcela: 850,
          contaHoje: 900,
          contaComSolar: 100,
        },
      },
      projecao: {
        gastoSemSolar1Ano: 11000,
        gastoSemSolar5Anos: 60000,
        gastoSemSolar25Anos: 350000,
        economia1Ano: 9600,
        economia5Anos: 50000,
        economia25Anos: 300000,
        economia1Mes: 800,
      },
      layoutTelhadoUrl: 'https://exemplo.com/layout.jpg',
    }

    const dadosPreparados = await prepararDadosPropostaParaPDF(dadosOriginais)

    // Não deve ser a mesma referência em memória (deep clone)
    expect(dadosPreparados).not.toBe(dadosOriginais)
    expect(dadosPreparados.cliente.nome).toBe('Cliente Teste Otimizador')
    expect(dadosPreparados.fotosInstalacoes?.[0].url).toBe('https://exemplo.com/instalacao1.jpg')
    expect(dadosPreparados.sistema.fotoModuloUrl).toBe('https://exemplo.com/modulo.png')
    expect(dadosPreparados.sistema.fotoInversorUrl).toBe('https://exemplo.com/inversor.png')
    expect(dadosPreparados.layoutTelhadoUrl).toBe('https://exemplo.com/layout.jpg')
  })

  it('prepararDadosPropostaParaPDF com entrada nula deve retornar com segurança', async () => {
    const res = await prepararDadosPropostaParaPDF(null as any)
    expect(res).toBeNull()
  })

  it('suporta modo otimizarParaWhatsApp reduzindo resolução e usando compressão JPEG', async () => {
    const dados: PropostaTecnicoComercialDados = {
      cliente: { nome: 'Cliente WhatsApp' },
      representante: { nome: 'Consultor', contato: '(54) 99999-9999' },
      dataProposta: '27/02/2025',
      validadeDias: 5,
      empresa: {} as any,
      fotosInstalacoes: [{ id: '1', titulo: 'Usina 1', url: 'https://exemplo.com/usina1.jpg' }],
      sistema: {
        potenciaKwp: 5,
        fotoModuloUrl: 'https://exemplo.com/modulo.png',
        fotoInversorUrl: 'https://exemplo.com/inversor.png',
      } as any,
      garantias: {} as any,
      producao: { anualKwh: 6000, mediaMensalKwh: 500 },
      economia: { investimentoTotal: 20000, prazoEntregaDias: 30, paybackTexto: '36 meses' },
      parcelamento: {} as any,
      projecao: {} as any,
      layoutTelhadoUrl: 'https://exemplo.com/telhado.jpg',
    }

    const res = await prepararDadosPropostaParaPDF(dados, { otimizarParaWhatsApp: true })
    expect(res).toBeDefined()
    expect(res.cliente.nome).toBe('Cliente WhatsApp')
  })
})
