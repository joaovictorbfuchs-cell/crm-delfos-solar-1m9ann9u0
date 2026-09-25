import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validarNumeroWhatsApp,
  extrairContextoProposta,
  aplicarPlaceholdersProposta,
  construirPropostaSolarPDFInput,
  TEMPLATES_PROPOSTA_WHATSAPP,
} from './propostaWhatsAppService'
import { gerarBase64OrcamentoSolar, gerarBase64PropostaOM } from './pdfWhatsAppService'
import * as propostaSolarGenerator from './propostaSolarGenerator'
import * as propostaImageOptimizer from './propostaImageOptimizer'
import * as propostaTecnicoComercialGenerator from './propostaTecnicoComercialGenerator'
import { getConteudoPropostaDefaults } from './conteudoProposta'
import type { OrcamentoSolar, Cliente } from '@/types/crm'

describe('propostaWhatsAppService', () => {
  it('valida telefones brasileiros com e sem DDD', () => {
    const resValido = validarNumeroWhatsApp('(54) 99999-1234')
    expect(resValido.valido).toBe(true)
    expect(resValido.numeroLimpo).toBe('54999991234')
    expect(resValido.numeroFormatado).toBe('(54) 99999-1234')

    const resInvalido = validarNumeroWhatsApp('123')
    expect(resInvalido.valido).toBe(false)
  })

  it('extrai contexto corretamente da proposta solar', () => {
    const orc: Partial<OrcamentoSolar> = {
      id: 'orc-1',
      cliente_id: 'cli-1',
      potencia_kwp: 10.5,
      valor_investimento: 38000,
      consumo_kwh_mes: 1200,
      economia_1_mes: 1100,
      payback_meses: 32,
      tipo_cliente: 'residencial',
      created: '2025-01-01',
      updated: '2025-01-01',
    }

    const cli: Partial<Cliente> = {
      id: 'cli-1',
      nome: 'João da Silva',
      cidade: 'Passo Fundo',
      estado: 'RS',
      whatsapp: '54999998888',
      created: '2025-01-01',
      updated: '2025-01-01',
    }

    const ctx = extrairContextoProposta(orc as OrcamentoSolar, cli as Cliente)
    expect(ctx.nome_cliente).toBe('João')
    expect(ctx.potencia).toBe('10.50 kWp')
    expect(ctx.cidade).toBe('Passo Fundo')
  })

  it('aplica placeholders de mensagem corretamente', () => {
    const template = TEMPLATES_PROPOSTA_WHATSAPP[0].conteudo
    const contexto = {
      nome_cliente: 'Carlos',
      potencia: '8.20 kWp',
      valor: 'R$ 29.900,00',
      economia_mensal: 'R$ 1.100,00',
      cidade: 'Erechim / RS',
      consultor: 'João Victor Bagetti Fuchs',
      tipo: 'Residencial',
      empresa: 'Delfos Solar',
    }

    const formatada = aplicarPlaceholdersProposta(template, contexto)
    expect(formatada).toContain('Olá Carlos!')
    expect(formatada).toContain('8.20 kWp')
    expect(formatada).toContain('R$ 29.900,00')
  })

  it('constrói PropostaSolarPDFInput repassando personalizações (conteudo_proposta, secoes_habilitadas, fotos)', () => {
    const conteudoCustom = getConteudoPropostaDefaults()
    conteudoCustom.capa.titulo = 'Título Customizado'

    const orc: Partial<OrcamentoSolar> = {
      id: 'orc-2',
      cliente_id: 'cli-2',
      potencia_kwp: 6.5,
      valor_investimento: 25000,
      conteudo_proposta: conteudoCustom,
      secoes_habilitadas: {
        layoutTelhado: true,
        fotosProjeto: true,
        sazonalidadeSolar: true,
        portfolioUsinas: true,
      },
      layout_telhado: 'https://example.com/telhado.jpg',
      layout_telhado_habilitado: true,
      instalacoes_selecionadas: ['inst-1', 'inst-2'],
      created: '2025-01-01',
      updated: '2025-01-01',
    }

    const inputPdf = construirPropostaSolarPDFInput(orc as OrcamentoSolar)
    expect(inputPdf.sistema.potenciaKwp).toBe(6.5)
    expect(inputPdf.conteudo?.capa.titulo).toBe('Título Customizado')
    expect(inputPdf.secoesHabilitadas?.portfolioUsinas).toBe(true)
    expect(inputPdf.layoutTelhadoUrl).toBe('https://example.com/telhado.jpg')
    expect(inputPdf.layoutTelhadoHabilitado).toBe(true)
    expect(inputPdf.instalacoesSelecionadasIds).toEqual(['inst-1', 'inst-2'])
  })
})

describe('pdfWhatsAppService — pipeline oficial da proposta', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('gerarBase64OrcamentoSolar invoca os 4 passos canônicos da proposta oficial', async () => {
    const spyConverter = vi.spyOn(propostaSolarGenerator, 'converterInputParaTemplateComercial')
    const spyOtimizar = vi.spyOn(propostaImageOptimizer, 'prepararDadosPropostaParaPDF')
    const spyGerarHTML = vi.spyOn(
      propostaTecnicoComercialGenerator,
      'gerarHTMLPropostaTecnicoComercial',
    )

    // Mock do html2pdf no window
    const mockOutputPdf = vi
      .fn()
      .mockResolvedValue('data:application/pdf;base64,JVBERi0xLjQKJS4uLg==')
    const mockWorker = {
      set: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      outputPdf: mockOutputPdf,
    }
    const mockHtml2PdfFn = vi.fn(() => mockWorker)
    ;(window as any).html2pdf = mockHtml2PdfFn

    const conteudoCustom = getConteudoPropostaDefaults()

    const orc: Partial<OrcamentoSolar> = {
      id: 'orc-oficial',
      cliente_id: 'cli-3',
      potencia_kwp: 7.2,
      valor_investimento: 28000,
      conteudo_proposta: conteudoCustom,
      secoes_habilitadas: {
        layoutTelhado: true,
        fotosProjeto: true,
        sazonalidadeSolar: true,
        portfolioUsinas: true,
      },
      created: '2025-01-01',
      updated: '2025-01-01',
    }

    const inputPdf = construirPropostaSolarPDFInput(orc as OrcamentoSolar)
    const resultado = await gerarBase64OrcamentoSolar(inputPdf)

    // Passo 1: converterInputParaTemplateComercial
    expect(spyConverter).toHaveBeenCalledWith(inputPdf)

    // Passo 2: prepararDadosPropostaParaPDF
    expect(spyOtimizar).toHaveBeenCalled()

    // Passo 3: gerarHTMLPropostaTecnicoComercial
    expect(spyGerarHTML).toHaveBeenCalled()

    // Passo 4: html2pdf outputPdf datauristring
    expect(mockOutputPdf).toHaveBeenCalledWith('datauristring')

    expect(resultado.base64).toBe('data:application/pdf;base64,JVBERi0xLjQKJS4uLg==')
    expect(resultado.fileName).toContain('Proposta_Solar_Delfos')
  })

  it('não utiliza gerador simplificado de 1 página no fluxo solar', async () => {
    const inputPdf = construirPropostaSolarPDFInput({
      id: 'orc-check',
      cliente_id: 'cli-c',
      potencia_kwp: 5.0,
      valor_investimento: 19000,
      tipo_cliente: 'residencial',
      created: '2025-01-01',
      updated: '2025-01-01',
    } as any)

    const res = await gerarBase64OrcamentoSolar(inputPdf)
    // O fallbackText continua disponível para mensagem descritiva se desejado,
    // mas o documento gerado é o A4 completo do HTML comercial
    expect(res.fallbackText).toContain('Delfos Solar')
    expect(res.fallbackText).toContain('5.00 kWp')
  })
})
