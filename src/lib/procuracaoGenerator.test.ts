import { describe, it, expect } from 'vitest'
import {
  normalizarDadosProcuracao,
  formatarDataExtenso,
  gerarHTMLProcuracao,
  gerarPDFBinarioProcuracao,
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
      'Rua Espírito Santo, 275, Bairro Fátima, Erechim/RS, CEP 99.709-296',
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
    expect(html).toContain('Rua Espírito Santo, 275, Bairro Fátima, Erechim/RS, CEP 99.709-296')
    expect(html).toContain('Concessionária de Energia RGE')
    expect(html).toContain('Assinatura do(a) Outorgante')
  })

  it('deve gerar PDF binário nativo A4 com assinatura e cabeçalho válidos', () => {
    const pdfBytes = gerarPDFBinarioProcuracao(dadosMarceloBecker)
    expect(pdfBytes).toBeInstanceOf(Uint8Array)
    expect(pdfBytes.length).toBeGreaterThan(500)

    const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 50))
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true)
  })

  it('deve montar a URL do wa.me corretamente com DDI 55 e telefone do cliente', () => {
    const telefoneLimpo = (dadosMarceloBecker.telefone || '').replace(/\D/g, '')
    const ddiNumero = telefoneLimpo.startsWith('55') ? telefoneLimpo : `55${telefoneLimpo}`
    expect(ddiNumero).toBe('5554997128844')

    const primeiroNome = dadosMarceloBecker.nome.split(' ')[0]
    const mensagem = `Olá ${primeiroNome}! Segue em anexo a procuração da Delfos Solar para conferência e assinatura, autorizando os trâmites junto à concessionária de energia. Por favor, assine no campo indicado e nos devolva a via preenchida. Ficamos à disposição!`

    const url = `https://wa.me/${ddiNumero}?text=${encodeURIComponent(mensagem)}`
    expect(url).toContain('https://wa.me/5554997128844?text=')
    expect(url).toContain('Marcelo')
    expect(url).toContain('concession%C3%A1ria')
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
})
