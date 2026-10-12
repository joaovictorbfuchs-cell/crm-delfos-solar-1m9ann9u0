import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { BotaoBaixarPropostaOMPDF, gerarPropostaOMPdfBlobBase64 } from './BotaoBaixarPropostaOMPDF'
import { PropostaOMPDFDocument } from './PropostaOMPDFDocument'
import { PreviewPropostaOMSecoes } from './PreviewPropostaOMSecoes'
import { calcularPropostaOM, type PropostaPDFInput } from '@/lib/propostaOMGenerator'

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
    expect(screen.getByText(/Essencial/i)).toBeTruthy()
    expect(screen.getByText(/Primeiro mês bonificado/i)).toBeTruthy()
  })

  it('renderiza PropostaOMPDFDocument sem erros', () => {
    const { container } = render(
      <PropostaOMPDFDocument dados={propostaPDFDataMock} observacoesAdicionais="Obs teste" />,
    )
    expect(container).toBeTruthy()
  })
})
