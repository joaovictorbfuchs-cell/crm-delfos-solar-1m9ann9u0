import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ModalRegistrarDadosLeitura from './ModalRegistrarDadosLeitura'
import type { Atividade, Cliente } from '@/types/crm'

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock pocketbase client
vi.mock('@/lib/pocketbase/client', () => ({
  pb: {
    baseUrl: 'https://mock.goskip.app',
    authStore: { token: 'mock-token' },
    files: {
      getURL: vi.fn().mockReturnValue('https://mock.goskip.app/files/foto.jpg'),
    },
    collection: vi.fn(() => ({
      update: vi.fn().mockResolvedValue({ id: 'atv-1' }),
    })),
  },
}))

describe('ModalRegistrarDadosLeitura', () => {
  const clienteMock: Cliente = {
    id: 'cli-001',
    nome: 'Pedrinho Spassini',
    whatsapp: '54999991111',
    uc: '19688000193',
  } as unknown as Cliente

  const atividadePendente: Atividade = {
    id: 'atv-001',
    titulo: 'Registro de auto leitura — 15/01/2027',
    tipo: 'registro_auto_leitura',
    status: 'pendente',
    numero_uc: '196.880.001-93',
    created: '2026-11-10T12:00:00.000Z',
    updated: '2026-11-10T12:00:00.000Z',
  }

  it('renderiza campos 03, A3, Telefone do solicitante e botão Enviar para RGE quando protocolo_rge não preenchido', () => {
    render(
      <ModalRegistrarDadosLeitura
        isOpen={true}
        onClose={vi.fn()}
        atividade={atividadePendente}
        cliente={clienteMock}
      />,
    )

    // Campos solicitados
    expect(screen.getByText(/03 — Consumo ativo/i)).toBeInTheDocument()
    expect(screen.getByText(/A3 — Ativo reverso/i)).toBeInTheDocument()
    expect(screen.getByText(/Telefone do solicitante/i)).toBeInTheDocument()

    // Botão Enviar para RGE (laranja) e Salvar e Concluir visíveis
    expect(screen.getByRole('button', { name: /Enviar para RGE/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Salvar e Concluir/i })).toBeInTheDocument()
  })

  it('oculta botão Enviar para RGE e exibe dados do protocolo quando protocolo_rge estiver preenchido', () => {
    const atividadeComProtocolo: Atividade = {
      ...atividadePendente,
      status: 'concluida',
      protocolo_rge: 'RGE-2027-998877',
      valor_grandeza_03: '00040',
      valor_grandeza_103: '01985',
    }

    render(
      <ModalRegistrarDadosLeitura
        isOpen={true}
        onClose={vi.fn()}
        atividade={atividadeComProtocolo}
        cliente={clienteMock}
      />,
    )

    // Botão Enviar para RGE deve estar OCULTO
    expect(screen.queryByRole('button', { name: /Enviar para RGE/i })).not.toBeInTheDocument()

    // Protocolo e valores retornados devem estar visíveis
    expect(screen.getByText(/RGE-2027-998877/i)).toBeInTheDocument()
    expect(screen.getByText(/Leitura Concluída e Registrada na RGE/i)).toBeInTheDocument()
    expect(screen.getByText('00040')).toBeInTheDocument()
    expect(screen.getByText('01985')).toBeInTheDocument()
  })

  it('limita os campos 03 e A3 a números com no máximo 5 dígitos', () => {
    render(
      <ModalRegistrarDadosLeitura
        isOpen={true}
        onClose={vi.fn()}
        atividade={atividadePendente}
        cliente={clienteMock}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    // inputs[0] é 03, inputs[1] é A3
    const input03 = inputs[0]
    const inputA3 = inputs[1]

    fireEvent.change(input03, { target: { value: '123456abc' } })
    // apenas números são aceitos e o input tem maxLength={5}
    expect(input03).toHaveAttribute('maxLength', '5')
    expect((input03 as HTMLInputElement).value).toBe('123456')

    fireEvent.change(inputA3, { target: { value: '98765xyz' } })
    expect(inputA3).toHaveAttribute('maxLength', '5')
    expect((inputA3 as HTMLInputElement).value).toBe('98765')
  })
})
