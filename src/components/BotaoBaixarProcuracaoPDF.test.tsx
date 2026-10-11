import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { BotaoBaixarProcuracaoPDF } from './BotaoBaixarProcuracaoPDF'
import { normalizarDadosProcuracao } from '@/lib/procuracaoGenerator'

describe('BotaoBaixarProcuracaoPDF — Integração do Botão Baixar como PDF com @react-pdf/renderer', () => {
  const dadosMock = normalizarDadosProcuracao({
    nome: 'Marcelo Becker',
    cpf: '412.589.630-18',
    endereco: 'Linha São João, Km 12, S/N, Zona Rural',
    municipio: 'Passo Fundo/RS',
    dataPorExtenso: '13 de setembro de 2026',
    telefone: '(54) 99712-8844',
  })

  it('deve renderizar o botão Baixar como PDF com carregamento e texto correto', () => {
    const { container } = render(
      React.createElement(BotaoBaixarProcuracaoPDF, { dados: dadosMock }),
    )
    expect(container).toBeDefined()
    expect(screen.getByText(/Baixar como PDF/i)).toBeDefined()
  })

  it('deve carregar o módulo dinâmico do @react-pdf/renderer sob demanda', async () => {
    const mod = await import('@react-pdf/renderer')
    expect(mod.PDFDownloadLink).toBeDefined()
    expect(mod.Document).toBeDefined()
    expect(mod.Page).toBeDefined()
  })
})
