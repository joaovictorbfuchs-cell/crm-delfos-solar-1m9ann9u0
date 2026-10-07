import { describe, it, expect, vi } from 'vitest'
import {
  normalizarDadosProcuracao,
  formatarDataExtenso,
  gerarHTMLProcuracao,
  gerarPDFBinarioProcuracao,
  gerarBase64Procuracao,
  baixarProcuracaoPDF,
  abrirProcuracaoImpressao,
  DADOS_FIXOS_CONTRATADA_PROCURACAO,
} from './procuracaoGenerator'

describe('procuracaoGenerator - Procuração Particular Delfos Solar O&M', () => {
  const dadosMarceloBecker = {
    nome: 'Marcelo Becker',
    cpf: '412.589.630-18',
    endereco: 'Linha São João, Km 12, S/N, Zona Rural',
    municipio: 'Passo Fundo/RS',
    telefone: '(54) 99712-8844',
  }

  it('deve conter os outorgados fixos exatos da Delfos Solar', () => {
    expect(DADOS_FIXOS_CONTRATADA_PROCURACAO.outorgados).toHaveLength(2)

    const daniel = DADOS_FIXOS_CONTRATADA_PROCURACAO.outorgados[0]
    expect(daniel.nome).toBe('Daniel Rotava')
    expect(daniel.cpf).toBe('047.838.700-80')
    expect(daniel.rg).toBe('1131962548')

    const joao = DADOS_FIXOS_CONTRATADA_PROCURACAO.outorgados[1]
    expect(joao.nome).toBe('João Victor Bagetti Fuchs')
    expect(joao.cpf).toBe('811.562.780-15')
    expect(joao.rg).toBe('5073762014')

    expect(DADOS_FIXOS_CONTRATADA_PROCURACAO.enderecoProfissional).toBe(
      'Rua Espírito Santo, 275 Bairro Fátima, Erechim – RS, CEP 99.709-296',
    )
    expect(DADOS_FIXOS_CONTRATADA_PROCURACAO.concessionariaPadrao).toBe(
      'Concessionária de Energia RGE',
    )
  })

  it('deve normalizar dados e formatar data por extenso em português', () => {
    const normalizados = normalizarDadosProcuracao(dadosMarceloBecker)
    expect(normalizados.nome).toBe('Marcelo Becker')
    expect(normalizados.cpf).toBe('412.589.630-18')
    expect(normalizados.municipio).toBe('Passo Fundo/RS')
    expect(normalizados.telefone).toBe('(54) 99712-8844')

    const dataExtenso = formatarDataExtenso(new Date(2026, 8, 13)) // mês 8 = setembro
    expect(dataExtenso).toBe('13 de setembro de 2026')
  })

  it('deve gerar o HTML com o texto exato do modelo e dados do outorgante Marcelo Becker', () => {
    const html = gerarHTMLProcuracao(dadosMarceloBecker)

    expect(html).toContain('PROCURAÇÃO PARTICULAR')
    expect(html).toContain('OUTORGANTE: Marcelo Becker,</strong> CPF nº 412.589.630-18')
    expect(html).toContain('domiciliado na Linha São João, Km 12, S/N, Zona Rural, Passo Fundo/RS.')
    expect(html).toContain('Daniel Rotava')
    expect(html).toContain('047.838.700-80')
    expect(html).toContain('1131962548')
    expect(html).toContain('João Victor Bagetti Fuchs')
    expect(html).toContain('811.562.780-15')
    expect(html).toContain('5073762014')
    expect(html).toContain('Rua Espírito Santo, 275 Bairro Fátima, Erechim – RS, CEP 99.709-296')
    expect(html).toContain('Concessionária de Energia RGE')
    expect(html).toContain('Assinatura do(a) Outorgante')
  })

  it('deve aplicar a formatação A4 especificada no HTML gerado (margem 25mm, Times 12pt, justificado, bloco 320px)', () => {
    const html = gerarHTMLProcuracao(dadosMarceloBecker)

    expect(html).toContain('size: A4 portrait; margin: 25mm;')
    expect(html).toContain('width: 210mm')
    expect(html).toContain('min-height: 297mm')
    expect(html).toContain('padding: 25mm')
    expect(html).toContain('box-sizing: border-box')
    expect(html).toContain('font-size: 12pt')
    expect(html).toContain('line-height: 1.6')
    expect(html).toContain('text-align: justify')
    expect(html).toContain('text-justify: inter-word')
    expect(html).toContain('width: 320px')
    expect(html).toContain('margin-left: auto')
  })

  it('deve gerar PDF binário nativo A4 sem cabeçalho institucional Delfos e com caracteres especiais WinAnsi corretos', () => {
    const pdfBytes = gerarPDFBinarioProcuracao(dadosMarceloBecker)
    expect(pdfBytes).toBeInstanceOf(Uint8Array)
    expect(pdfBytes.length).toBeGreaterThan(500)

    // Decodifica como Latin1 para inspecionar os comandos do stream do PDF
    let pdfString = ''
    for (let i = 0; i < pdfBytes.length; i++) {
      pdfString += String.fromCharCode(pdfBytes[i])
    }

    expect(pdfString.startsWith('%PDF-1.4')).toBe(true)

    // 1. NÃO deve conter o cabeçalho institucional prévio (regra do usuário)
    expect(pdfString).not.toContain('DELFOS ENGENHARIA LTDA • CRM SOLAR')
    expect(pdfString).not.toContain('DELFOS ENGENHARIA LTDA')

    // 2. Deve conter o título "PROCURAÇÃO PARTICULAR" com acentuação WinAnsi
    expect(pdfString).toContain('PROCURA\\307\\303O PARTICULAR')

    // 3. Deve conter o símbolo "nº" codificado em WinAnsi (\272) em vez de corrompido ou omitido
    expect(pdfString).toContain('CPF n\\272')

    // 4. Deve conter "Concessionária" com acentuação WinAnsi (\341)
    expect(pdfString).toContain('Concession\\341ria de Energia RGE')

    // 5. Deve conter o travessão "–" em "Erechim – RS" (\226)
    expect(pdfString).toContain('Erechim \\226 RS')

    // 6. Deve conter a linha de assinatura do Outorgante
    expect(pdfString).toContain('Assinatura do(a) Outorgante')
    expect(pdfString).toContain('Marcelo Becker')
    expect(pdfString).toContain('CPF: 412.589.630-18')
  })

  it('deve formatar o texto e parâmetros de envio de WhatsApp da procuração via Z-API (sem link wa.me)', () => {
    const telefoneLimpo = (dadosMarceloBecker.telefone || '').replace(/\D/g, '')
    expect(telefoneLimpo).toBe('54997128844')
    expect(telefoneLimpo.length).toBeGreaterThanOrEqual(10)

    const primeiroNome = dadosMarceloBecker.nome.split(' ')[0]
    const mensagem = `Olá ${primeiroNome}! Segue em anexo a procuração da Delfos Solar para conferência e assinatura, autorizando os trâmites junto à concessionária de energia. Por favor, assine no campo indicado e nos devolva a via preenchida. Ficamos à disposição!`

    // Valida o conteúdo da mensagem enviada via Z-API
    expect(mensagem).toContain('Olá Marcelo!')
    expect(mensagem).toContain('procuração da Delfos Solar')
    expect(mensagem).toContain('concessionária de energia')

    // Confirma que não é uma URL wa.me nem faz encoding de query param para link externo
    expect(mensagem).not.toContain('wa.me')
    expect(mensagem).not.toContain('api.whatsapp.com')
    expect(mensagem).not.toContain('https://')

    // Formato de payload esperado pela Z-API via sendWhatsAppMensagem
    const payloadEnvioZApi = {
      clienteId: 'demo-client-id',
      telefone: telefoneLimpo,
      mensagem,
      origem: 'modal_procuracao_om',
    }
    expect(payloadEnvioZApi.telefone).toBe('54997128844')
    expect(payloadEnvioZApi.origem).toBe('modal_procuracao_om')
    expect(payloadEnvioZApi.mensagem).toBe(mensagem)
  })

  it('deve permitir emitir procuração para cliente sem proposta O&M cadastrada (ex: PATRICK RECH RAMOS)', () => {
    const dadosPatrick = {
      nome: 'PATRICK RECH RAMOS',
      cpf: '',
      endereco: '',
      municipio: 'Erechim',
      telefone: '',
    }
    const normalizados = normalizarDadosProcuracao(dadosPatrick)
    expect(normalizados.nome).toBe('PATRICK RECH RAMOS')
    expect(normalizados.municipio).toBe('Erechim')

    const pdfBytes = gerarPDFBinarioProcuracao(normalizados)
    expect(pdfBytes).toBeInstanceOf(Uint8Array)
    expect(pdfBytes.length).toBeGreaterThan(500)
  })

  it('deve manter abrirProcuracaoImpressao e gerarHTMLProcuracao preservados para o botão Imprimir', () => {
    const html = gerarHTMLProcuracao(dadosMarceloBecker)
    expect(typeof html).toBe('string')
    expect(html).toContain('PROCURAÇÃO PARTICULAR')
    expect(html).toContain('OUTORGANTE: Marcelo Becker')

    const spyOpen = vi.spyOn(window, 'open').mockReturnValue({
      addEventListener: vi.fn(),
      print: vi.fn(),
    } as any)

    abrirProcuracaoImpressao(dadosMarceloBecker, false)
    expect(spyOpen).toHaveBeenCalled()
    spyOpen.mockRestore()
  })

  it('deve gerar Base64 da procuração usando o HTML canônico A4 com renderizador oficial', async () => {
    const mockOutputPdf = vi
      .fn()
      .mockResolvedValue('data:application/pdf;base64,JVBERi0xLjQKJS4uLg==')
    const mockWorker = {
      set: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      outputPdf: mockOutputPdf,
    }
    ;(window as any).html2pdf = vi.fn(() => mockWorker)

    const res = await gerarBase64Procuracao(dadosMarceloBecker)

    expect(res.base64).toBe('data:application/pdf;base64,JVBERi0xLjQKJS4uLg==')
    expect(res.fileName).toBe('Procuracao_Delfos_Marcelo_Becker.pdf')
    expect(res.fallbackText).toContain('Marcelo')
    expect(res.fallbackText).toContain('procuração da Delfos Solar')
    expect(mockWorker.set).toHaveBeenCalledWith(
      expect.objectContaining({
        jsPDF: expect.objectContaining({ format: 'a4', orientation: 'portrait' }),
      }),
    )
  })

  it('deve realizar download direto do PDF oficial via baixarProcuracaoPDF a partir do gerador A4', async () => {
    const mockOutputPdf = vi
      .fn()
      .mockResolvedValue('data:application/pdf;base64,JVBERi0xLjQKJS4uLg==')
    const mockWorker = {
      set: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      outputPdf: mockOutputPdf,
    }
    ;(window as any).html2pdf = vi.fn(() => mockWorker)

    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName)
      if (tagName === 'a') {
        el.click = clickSpy
      }
      return el
    })

    await baixarProcuracaoPDF(dadosMarceloBecker)
    expect(clickSpy).toHaveBeenCalled()

    vi.restoreAllMocks()
  })

  it('deve acionar abrirProcuracaoImpressao como fallback seguro quando a geração assíncrona falha', async () => {
    // Simula falha do módulo pdfWhatsAppService (ex: erro de rede/CDN)
    const originalHtml2pdf = (window as any).html2pdf
    ;(window as any).html2pdf = vi.fn(() => {
      throw new Error('Falha simulada de CDN/adblock')
    })

    const spyOpen = vi.spyOn(window, 'open').mockReturnValue({
      addEventListener: vi.fn(),
      print: vi.fn(),
    } as any)

    await baixarProcuracaoPDF(dadosMarceloBecker)

    expect(spyOpen).toHaveBeenCalled()
    spyOpen.mockRestore()
    ;(window as any).html2pdf = originalHtml2pdf
  })

  it('deve selecionar .page-a4 e zerar estilos de tela ao renderizar procuração para PDF Base64', async () => {
    let capturedElement: any = null
    const mockOutputPdf = vi
      .fn()
      .mockResolvedValue('data:application/pdf;base64,JVBERi0xLjQKJS4uLg==')
    const mockWorker = {
      set: vi.fn().mockReturnThis(),
      from: vi.fn().mockImplementation((el: any) => {
        capturedElement = el
        return mockWorker
      }),
      outputPdf: mockOutputPdf,
    }
    ;(window as any).html2pdf = vi.fn(() => mockWorker)

    const res = await gerarBase64Procuracao(dadosMarceloBecker)

    expect(res.base64).toBe('data:application/pdf;base64,JVBERi0xLjQKJS4uLg==')
    expect(capturedElement).not.toBeNull()
    // O elemento capturado deve ser a folha .page-a4 (não o body com fundo cinza)
    expect(capturedElement?.classList?.contains('page-a4')).toBe(true)
    // Os estilos de tela devem ter sido normalizados para margem zero e sem box-shadow
    expect(capturedElement?.style?.margin).toBe('0px')
    expect(capturedElement?.style?.boxShadow).toBe('none')
    expect(capturedElement?.style?.width).toBe('100%')
  })
})
