import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { BotaoBaixarContratoOMPDF } from './BotaoBaixarContratoOMPDF'
import { SERVICOS_ADICIONAIS_PADRAO } from '@/lib/contratoGenerator'

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

describe('BotaoBaixarContratoOMPDF', () => {
  const dadosMock = {
    nomeRazaoSocial: 'Fazenda Estrela',
    cpfCnpj: '00.000.000/0001-00',
    municipio: 'Erechim/RS',
    enderecoInstalacao: 'Rodovia RS 135',
    telefone: '(54) 98888-7777',
    email: 'estrela@exemplo.com',
    planoSelecionado: 'Essencial' as const,
    valorMensal: 190,
    valorTotal: 2280,
    valorEscritoMensal: 'cento e noventa reais',
    valorEscritoTotal: 'dois mil duzentos e oitenta reais',
    numeroModulos: 64,
    marcaInversores: 'Growatt 20kW',
    localInstalacao: 'Telhado' as const,
    enderecoInstalacaoDiferente: '',
    dataPorExtenso: '14 de setembro de 2026',
    cidadeAssinatura: 'Erechim',
    servicosAdicionais: SERVICOS_ADICIONAIS_PADRAO,
  }

  it('renderiza o botão com texto de download', async () => {
    render(<BotaoBaixarContratoOMPDF dados={dadosMock} />)

    const btn = await screen.findByRole('button', { name: /Baixar como PDF/i })
    expect(btn).toBeTruthy()
  })
})
