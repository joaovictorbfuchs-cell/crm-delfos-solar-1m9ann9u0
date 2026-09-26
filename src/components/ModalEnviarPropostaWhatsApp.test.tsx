import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ModalEnviarPropostaWhatsApp } from '@/components/ModalEnviarPropostaWhatsApp'
import type { OrcamentoSolar, Cliente } from '@/types/crm'

// Mock de ClientesContext
const mockSendWhatsAppDocument = vi.fn().mockResolvedValue({ sent: true, ok: true })
const mockSendWhatsAppMessage = vi.fn().mockResolvedValue({ sent: true, ok: true })
const mockUpdateCliente = vi.fn().mockResolvedValue({})

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    sendWhatsAppDocument: mockSendWhatsAppDocument,
    sendWhatsAppMessage: mockSendWhatsAppMessage,
    updateCliente: mockUpdateCliente,
    whatsAppConfig: { isZApi: true },
    whatsAppTemplates: [
      {
        id: 'tpl-prop-1',
        nome: 'Proposta Completa WhatsApp',
        categoria: 'proposta',
        conteudo: 'Olá {nome_cliente}, sua proposta de {potencia} está pronta!',
        ativo: true,
      },
    ],
  }),
}))

// Mock de gerarBase64OrcamentoSolar
vi.mock('@/lib/pdfWhatsAppService', () => ({
  gerarBase64OrcamentoSolar: vi.fn().mockResolvedValue({
    base64: 'JVBERi0xLjQKJS4uLg==',
    fallbackText: 'Texto da proposta',
    fileName: 'Proposta-Solar-Teste.pdf',
  }),
}))

describe('ModalEnviarPropostaWhatsApp', () => {
  const orcamentoMock: Partial<OrcamentoSolar> = {
    id: 'orc-123',
    cliente_id: 'cli-123',
    numero_revisao: 1,
    potencia_kwp: 8.5,
    valor_investimento: 32000,
    consumo_kwh_mes: 750,
    economia_1_mes: 800,
    payback_meses: 36,
    tipo_cliente: 'residencial',
    created: '2025-01-01',
    updated: '2025-01-01',
  }

  const clienteMock: Partial<Cliente> = {
    id: 'cli-123',
    nome: 'Maria da Silva',
    cidade: 'Erechim',
    estado: 'RS',
    whatsapp: '54999887766',
    telefone: '5433210000',
    created: '2025-01-01',
    updated: '2025-01-01',
  }

  it('renderiza o modal aberto com número de WhatsApp do cliente preenchido e templates disponíveis', () => {
    render(
      <ModalEnviarPropostaWhatsApp
        isOpen={true}
        onClose={vi.fn()}
        orcamento={orcamentoMock as OrcamentoSolar}
        cliente={clienteMock as Cliente}
      />,
    )

    expect(screen.getByText(/Enviar Proposta por WhatsApp/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('(54) 99988-7766')).toBeInTheDocument()
    expect(screen.getByText(/Anexar PDF do computador/i)).toBeInTheDocument()
  })

  it('permite anexar arquivo PDF do computador', async () => {
    render(
      <ModalEnviarPropostaWhatsApp
        isOpen={true}
        onClose={vi.fn()}
        orcamento={orcamentoMock as OrcamentoSolar}
        cliente={clienteMock as Cliente}
      />,
    )

    // Cria um arquivo PDF fake
    const file = new File(['%PDF-1.4 dummy content'], 'Proposta-Gerada.pdf', {
      type: 'application/pdf',
    })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()

    // Dispara seleção de arquivo
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Proposta-Gerada.pdf')).toBeInTheDocument()
      expect(screen.getByText('Do computador')).toBeInTheDocument()
    })
  })

  it('troca mensagem ao selecionar outro template da lista', async () => {
    render(
      <ModalEnviarPropostaWhatsApp
        isOpen={true}
        onClose={vi.fn()}
        orcamento={orcamentoMock as OrcamentoSolar}
        cliente={clienteMock as Cliente}
      />,
    )

    // O template do sistema "Proposta Completa WhatsApp" deve estar na lista de botões
    const botaoTemplate = screen.getByText('Proposta Completa WhatsApp')
    expect(botaoTemplate).toBeInTheDocument()

    fireEvent.click(botaoTemplate)

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(
        /Digite sua mensagem personalizada/i,
      ) as HTMLTextAreaElement
      expect(textarea.value).toContain('Olá Maria')
      expect(textarea.value).toContain('8.50 kWp')
    })
  })
})
