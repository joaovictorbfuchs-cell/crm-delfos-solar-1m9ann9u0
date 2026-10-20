import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModalGerarProcuracaoOM } from './ModalGerarProcuracaoOM'
import * as emailService from '@/lib/emailService'
import * as crmService from '@/services/crmService'

// Mock dos serviços de envio
vi.mock('@/lib/emailService', async () => {
  const actual = await vi.importActual<typeof import('@/lib/emailService')>('@/lib/emailService')
  return {
    ...actual,
    enviarEmail: vi.fn().mockResolvedValue({
      ok: true,
      sucesso: true,
      id: 'resend_email_test_123',
      message: 'E-mail enviado com sucesso via Resend.',
    }),
  }
})

vi.mock('@/components/BotaoBaixarProcuracaoPDF', () => ({
  gerarProcuracaoPdfBlobBase64: vi.fn().mockResolvedValue({
    blob: new Blob(['fake-pdf'], { type: 'application/pdf' }),
    base64: 'data:application/pdf;base64,ZmFrZS1wZGY=',
    fileName: 'Procuracao_Delfos_Test_Client.pdf',
  }),
  default: () => <button type="button">Baixar como PDF</button>,
  BotaoBaixarProcuracaoPDF: () => <button type="button">Baixar como PDF</button>,
}))

vi.mock('@/services/crmService', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/crmService')>('@/services/crmService')
  return {
    ...actual,
    createAtividade: vi.fn().mockResolvedValue({ id: 'atv_fake_1' }),
  }
})

describe('ModalGerarProcuracaoOM — Envio por E-mail da Procuração', () => {
  const clienteComEmail = {
    id: 'cli-email-1',
    nome: 'Carlos Eduardo Oliveira',
    cpf: '123.456.789-00',
    telefone: '54999998888',
    whatsapp: '54999998888',
    email: 'carlos.oliveira@empresa.com.br',
    endereco: 'Rua Principal, 500',
    cidade: 'Erechim/RS',
  }

  const clienteSemEmail = {
    id: 'cli-no-email-2',
    nome: 'Mariana Silva',
    cpf: '987.654.321-11',
    telefone: '54988887777',
    whatsapp: '54988887777',
    endereco: 'Av. Sete de Setembro, 100',
    cidade: 'Passo Fundo/RS',
  }

  it('exibe o campo de e-mail na etapa de revisão e botão "Enviar por e-mail" na pré-visualização', () => {
    const { rerender } = render(
      React.createElement(ModalGerarProcuracaoOM, {
        open: true,
        onOpenChange: () => {},
        cliente: clienteComEmail as any,
        modoVisualizacaoDireta: false,
      }),
    )

    // Na etapa de revisão, deve mostrar o campo de e-mail com valor pré-preenchido
    const inputEmail = screen.getByPlaceholderText('cliente@exemplo.com.br') as HTMLInputElement
    expect(inputEmail).toBeDefined()
    expect(inputEmail.value).toBe('carlos.oliveira@empresa.com.br')

    // Alternar para pré-visualização direta
    rerender(
      React.createElement(ModalGerarProcuracaoOM, {
        open: true,
        onOpenChange: () => {},
        cliente: clienteComEmail as any,
        modoVisualizacaoDireta: true,
      }),
    )

    expect(screen.getByText('Enviar pelo WhatsApp')).toBeDefined()
    expect(screen.getByText('Enviar por e-mail')).toBeDefined()
    expect(screen.getByText('Imprimir')).toBeDefined()
  })

  it('avisa claramente na revisão e na pré-visualização quando o cliente não tem e-mail', () => {
    const { rerender } = render(
      React.createElement(ModalGerarProcuracaoOM, {
        open: true,
        onOpenChange: () => {},
        cliente: clienteSemEmail as any,
        modoVisualizacaoDireta: false,
      }),
    )

    // Aviso na tela de revisão
    expect(screen.getByText(/Cliente sem e-mail cadastrado/i)).toBeDefined()

    // Na tela de pré-visualização
    rerender(
      React.createElement(ModalGerarProcuracaoOM, {
        open: true,
        onOpenChange: () => {},
        cliente: clienteSemEmail as any,
        modoVisualizacaoDireta: true,
      }),
    )

    expect(screen.getByText(/E-mail não cadastrado/i)).toBeDefined()
  })

  it('abre o modal de conferência de e-mail, permite editar destinatário e dispara via Resend com anexo PDF', async () => {
    render(
      React.createElement(ModalGerarProcuracaoOM, {
        open: true,
        onOpenChange: () => {},
        cliente: clienteComEmail as any,
        modoVisualizacaoDireta: true,
      }),
    )

    const botaoEmail = screen.getByText('Enviar por e-mail')
    fireEvent.click(botaoEmail)

    // Modal de conferência aberto
    expect(screen.getByText('Conferir e Enviar por E-mail')).toBeDefined()
    expect(screen.getByText(/Remetente Oficial:/i)).toBeDefined()
    expect(screen.getByText(emailService.DEFAULT_EMAIL_FROM)).toBeDefined()

    // Campo de destinatário editável com valor inicial do cliente
    const inputDestino = screen.getByDisplayValue('carlos.oliveira@empresa.com.br')
    expect(inputDestino).toBeDefined()

    // Clicar em "Confirmar e Enviar E-mail"
    const botaoConfirmar = screen.getByText('Confirmar e Enviar E-mail')
    fireEvent.click(botaoConfirmar)

    await waitFor(() => {
      expect(emailService.enviarEmail).toHaveBeenCalled()
      expect(crmService.createAtividade).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'gerar_procuracao',
          titulo: 'Procuração Particular O&M Enviada via E-mail',
        }),
      )
    })
  })
})
