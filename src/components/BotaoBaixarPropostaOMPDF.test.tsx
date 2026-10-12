import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { BotaoBaixarPropostaOMPDF, gerarPropostaOMPdfBlobBase64 } from './BotaoBaixarPropostaOMPDF'
import { PropostaOMPDFDocument } from './PropostaOMPDFDocument'
import { PreviewPropostaOMSecoes } from './PreviewPropostaOMSecoes'
import {
  calcularPropostaOM,
  gerarHTMLPropostaOM,
  type PropostaPDFInput,
} from '@/lib/propostaOMGenerator'

vi.mock('@react-pdf/renderer', () => ({
  PDFDownloadLink: ({
    children,
    fileName,
  }: {
    children: (state: { loading: boolean }) => React.ReactNode
    fileName: string
  }) => (
    <div data-testid="mock-pdf-download-link" data-filename={fileName}>
      {children({ loading: false })}
    </div>
  ),
  Document: ({ children }: any) => <div data-testid="doc">{children}</div>,
  Page: ({ children }: any) => <div data-testid="page">{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  Image: ({ src }: any) => <img data-testid="pdf-image" src={src} alt="pdf-img" />,
  StyleSheet: { create: (s: any) => s },
  pdf: () => ({
    toBlob: async () => new Blob(['pdf-mock'], { type: 'application/pdf' }),
  }),
}))

describe('Proposta O&M - Preview e PDF', () => {
  const calculosMock = calcularPropostaOM({
    geracaoMensalKwh: 1500,
    valorKwh: 0.92,
  })

  const propostaPDFDataMock: PropostaPDFInput = {
    cliente: {
      nome: 'Cliente Solar Teste Ltda',
      cpfOuCnpj: '12.345.678/0001-90',
      endereco: 'Rua das Flores, 100',
      municipio: 'Erechim / RS',
      email: 'contato@clientesolar.com.br',
      telefone: '(54) 99999-8888',
    },
    tecnico: {
      potenciaKwp: 12.5,
      geracaoMediaKwh: 1500,
      marcaInversores: 'Deye 12kW',
      tipoInstalacao: 'Telhado Cerâmico',
      numeroModulos: 28,
    },
    parametros: {
      valorKwh: 0.92,
      distanciaKm: 20,
      valorKm: 2.5,
    },
    calculos: calculosMock,
    dataEmissao: '2026-04-16T12:00:00.000Z',
    autor: 'Consultor Delfos',
  }

  it('exporta o componente BotaoBaixarPropostaOMPDF e utilitário gerarPropostaOMPdfBlobBase64', () => {
    expect(typeof BotaoBaixarPropostaOMPDF).toBe('function')
    expect(typeof gerarPropostaOMPdfBlobBase64).toBe('function')
  })

  it('renderiza o BotaoBaixarPropostaOMPDF com rótulo correto', async () => {
    render(<BotaoBaixarPropostaOMPDF dados={propostaPDFDataMock} rotulo="Baixar PDF" />)

    const btn = await screen.findByRole('button', { name: /Baixar PDF/i })
    expect(btn).toBeTruthy()
  })

  it('renderiza o PreviewPropostaOMSecoes com as seções identificáveis e dados do cliente/usina', () => {
    render(
      <PreviewPropostaOMSecoes
        propostaData={propostaPDFDataMock}
        observacoesAdicionais="Primeiro mês bonificado"
      />,
    )

    expect(screen.getByTestId('preview-proposta-om-secoes')).toBeTruthy()
    expect(screen.getByText(/Cliente Solar Teste Ltda/i)).toBeTruthy()
    expect(screen.getByText(/12,5 kWp/i)).toBeTruthy()
    expect(screen.getByText(/Deye 12kW/i)).toBeTruthy()
    expect(screen.getByText(/Plano Essencial/i)).toBeTruthy()
    expect(screen.getByText(/Plano Inspeção/i)).toBeTruthy()
    expect(screen.getByText(/Plano Completo/i)).toBeTruthy()
    expect(screen.getByText(/RECOMENDADO DELFOS/i)).toBeTruthy()
    expect(screen.getByText(/Primeiro mês bonificado/i)).toBeTruthy()
    // Título da seção 3 ajustado conforme pedido do usuário
    expect(screen.getByText(/PLANOS DE GESTÃO E MANUTENÇÃO \(Contrato Anual\)/i)).toBeTruthy()
    // Faturamento Anual removido dos cards dos planos
    expect(screen.queryByText(/Faturamento Anual/i)).toBeNull()
    // Rodapé e cabeçalho alinhados com o anexo do usuário
    expect(screen.getByText(/Proposta válida por 5 dias\./i)).toBeTruthy()
    expect(screen.getByText(/Rua Espírito Santo, 275 – Centro, Erechim\/RS/i)).toBeTruthy()
  })

  it('renderiza PropostaOMPDFDocument sem erros e com dados do rodapé oficial', () => {
    const { container } = render(
      <PropostaOMPDFDocument dados={propostaPDFDataMock} observacoesAdicionais="Obs teste" />,
    )
    expect(container).toBeTruthy()
    expect(screen.getByText(/Proposta válida por 5 dias\./i)).toBeTruthy()
    expect(screen.getByText(/CNPJ 21\.379\.952\/0001-38/i)).toBeTruthy()
    expect(screen.getByText(/PLANOS DE GESTÃO E MANUTENÇÃO \(Contrato Anual\)/i)).toBeTruthy()
    expect(screen.queryByText(/Faturamento Anual/i)).toBeNull()
  })

  it('gera HTML da proposta O&M com rodapé em fluxo natural no fim do documento e @media print enxuto', () => {
    const html = gerarHTMLPropostaOM(propostaPDFDataMock)
    // 1. Footer em fluxo natural no fim do documento (sem regras que fixam o rodapé na tela/página)
    expect(html).not.toContain('position: fixed !important;')
    expect(html).not.toContain('padding-bottom: 28mm !important;')
    // 2. @media print enxuto (apenas .no-print, body e .page-container)
    expect(html).toContain('.no-print {\n        display: none !important;\n      }')
    // 3. page-break-inside avoid no fluxo base para não cortar o rodapé
    expect(html).toContain('page-break-inside: avoid')
    // 4. Conteúdo do bloco cinza intacto
    expect(html).toContain('Delfos Engenharia Solar')
    expect(html).toContain('CNPJ 21.379.952/0001-38')
    expect(html).toContain('(54) 99129-2121')
    expect(html).toContain('www.delfos.eng.br')
    expect(html).toContain('Rua Espírito Santo, 275 – Centro, Erechim/RS')
    expect(html).toContain('Proposta válida por 5 dias.')
    // Validação dos ajustes no gerador HTML
    expect(html).toContain('PLANOS DE GESTÃO E MANUTENÇÃO (Contrato Anual)')
    expect(html).not.toContain('Faturamento Anual')
  })
})
