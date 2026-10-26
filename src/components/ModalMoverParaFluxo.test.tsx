import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ModalMoverParaFluxo } from './ModalMoverParaFluxo'
import * as fluxosService from '@/services/fluxosFollowUpService'
import * as disparosService from '@/services/disparosMassaService'

vi.mock('@/services/fluxosFollowUpService', () => ({
  fetchFluxosFollowUp: vi.fn(),
}))

vi.mock('@/services/disparosMassaService', () => ({
  moverDestinatariosParaFluxo: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

describe('ModalMoverParaFluxo', () => {
  const mockFluxos = [
    {
      id: 'fluxo_pos_preco',
      nome: 'Pós-Preço',
      descricao: 'Follow-up focado em propostas enviadas',
      ativo: true,
      is_padrao: true,
      etapas: [
        {
          id: 'etapa_1',
          nome: '1º Contato Proposta',
          dias_apos: 0,
          mensagem: 'Olá [nome do cliente], conseguiu analisar nossa proposta?',
          ativa: true,
          ordem: 1,
        },
        {
          id: 'etapa_2',
          nome: '2º Contato Dúvidas',
          dias_apos: 3,
          mensagem: 'Ficou alguma dúvida técnica?',
          ativa: true,
          ordem: 2,
        },
      ],
    },
    {
      id: 'fluxo_reativacao',
      nome: 'Reativação Fria',
      descricao: 'Reativação de clientes antigos',
      ativo: true,
      is_padrao: false,
      etapas: [
        {
          id: 'etapa_r1',
          nome: 'Check de interesse',
          dias_apos: 2,
          mensagem: 'Temos novas condições...',
          ativa: true,
          ordem: 1,
        },
      ],
    },
  ]

  const mockDestinatarios = [
    {
      cliente_id: 'cli_1',
      nome: 'João da Silva',
      telefone: '54999998888',
      status: 'pendente' as const,
      origem_entrada: 'por_disparo' as const,
    },
  ]

  it('renderiza corretamente os fluxos ativos e destaca a 1ª etapa imediata', async () => {
    vi.spyOn(fluxosService, 'fetchFluxosFollowUp').mockResolvedValue(mockFluxos as any)

    render(
      <ModalMoverParaFluxo
        open={true}
        onOpenChange={vi.fn()}
        destinatarios={mockDestinatarios}
        lotesExistentes={[]}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Pós-Preço')).toBeTruthy()
      expect(screen.getByText('Reativação Fria')).toBeTruthy()
    })

    // Verifica aviso de 1ª etapa imediata (dias_apos = 0)
    expect(screen.getByText('1ª Etapa Imediata (na hora)')).toBeTruthy()
    expect(screen.getByText('João da Silva')).toBeTruthy()
  })

  it('chama moverDestinatariosParaFluxo ao clicar em confirmar', async () => {
    vi.spyOn(fluxosService, 'fetchFluxosFollowUp').mockResolvedValue(mockFluxos as any)
    const moverSpy = vi.spyOn(disparosService, 'moverDestinatariosParaFluxo').mockResolvedValue({
      success: true,
      total: 1,
      sucessoCount: 1,
      jaAtivoCount: 0,
      erroCount: 0,
      resultados: [{ sucesso: true, clienteId: 'cli_1', imediata: true }],
    })

    const onSucessoMock = vi.fn()
    const onOpenChangeMock = vi.fn()

    render(
      <ModalMoverParaFluxo
        open={true}
        onOpenChange={onOpenChangeMock}
        destinatarios={mockDestinatarios}
        lotesExistentes={[]}
        onSucesso={onSucessoMock}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Pós-Preço')).toBeTruthy()
    })

    const botaoConfirmar = screen.getByRole('button', { name: /confirmar e mover/i })
    fireEvent.click(botaoConfirmar)

    await waitFor(() => {
      expect(moverSpy).toHaveBeenCalledWith(['cli_1'], 'fluxo_pos_preco')
      expect(onSucessoMock).toHaveBeenCalled()
      expect(onOpenChangeMock).toHaveBeenCalledWith(false)
    })
  })

  it('exibe alerta de idempotência se cliente já está ativo no mesmo fluxo', async () => {
    vi.spyOn(fluxosService, 'fetchFluxosFollowUp').mockResolvedValue(mockFluxos as any)

    const loteComClienteAtivo = [
      {
        id: 'lote_existente',
        titulo: 'Lote Teste',
        status: 'ativo' as const,
        fluxo_id: 'fluxo_pos_preco',
        destinatarios: [
          {
            cliente_id: 'cli_1',
            nome: 'João da Silva',
            telefone: '54999998888',
            status: 'pendente' as const,
          },
        ],
      },
    ]

    render(
      <ModalMoverParaFluxo
        open={true}
        onOpenChange={vi.fn()}
        destinatarios={mockDestinatarios}
        lotesExistentes={loteComClienteAtivo as any}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/já possui acompanhamento ativo neste mesmo fluxo/i)).toBeTruthy()
    })

    // Botão de confirmar deve estar desabilitado
    const botaoConfirmar = screen.getByRole('button', {
      name: /confirmar e mover/i,
    }) as HTMLButtonElement
    expect(botaoConfirmar.disabled).toBe(true)
  })
})
