import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModalNovaAtividade } from '@/components/ModalNovaAtividade'

// Mock de hooks e dependências
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-admin-1', name: 'Administrador', email: 'admin@delfos.com' },
  }),
}))

const mockClientes = [
  {
    id: 'cli-1',
    nome: 'Carlos Alberto Mendes',
    endereco: 'Rua das Camélias, 350',
    cidade: 'Erechim',
    estado: 'RS',
    uc: '7001458923',
    whatsapp: '54999998888',
  },
]

const mockUsuarios = [
  { id: 'usr-admin-1', name: 'Administrador', email: 'admin@delfos.com', role: 'admin' },
]

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    clientes: mockClientes,
    usuarios: mockUsuarios,
    addAtividade: vi.fn(),
    tiposAtividadesCustom: [],
  }),
}))

vi.mock('@/services/crmService', () => ({
  fetchUsinasByClienteId: vi.fn().mockResolvedValue([
    {
      id: 'usi-1',
      nome: 'Usina Solar Fazenda Progresso',
      numero_uc: '7001458923',
      endereco: 'Linha Progresso, Erechim - RS',
      cidade: 'Erechim',
      estado: 'RS',
    },
  ]),
}))

vi.mock('@/lib/pocketbase/client', () => ({
  pb: {
    collection: vi.fn(() => ({
      getOne: vi.fn().mockResolvedValue({
        id: 'qvmkpl0mj2pun1i',
        conteudo:
          'Olá [nome do cliente]! Leitura da {{usina}} (UC: {{numero_uc}}) agendada para [data]. Enviar até [dia anterior]. Endereço: {{endereco}}.',
      }),
      update: vi.fn().mockResolvedValue({ id: 'qvmkpl0mj2pun1i' }),
    })),
  },
  default: {
    collection: vi.fn(() => ({
      getOne: vi.fn().mockResolvedValue({
        id: 'qvmkpl0mj2pun1i',
        conteudo:
          'Olá [nome do cliente]! Leitura da {{usina}} (UC: {{numero_uc}}) agendada para [data]. Enviar até [dia anterior]. Endereço: {{endereco}}.',
      }),
      update: vi.fn().mockResolvedValue({ id: 'qvmkpl0mj2pun1i' }),
    })),
  },
}))

describe('ModalNovaAtividade - Pré-visualização da mensagem Auto Leitura', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza o quadro de pré-visualização quando o tipo selecionado é auto_leitura_rge', async () => {
    render(
      <ModalNovaAtividade
        isOpen={true}
        onClose={vi.fn()}
        initialTipo="auto_leitura_rge"
        initialClienteId="cli-1"
      />,
    )

    // Verifica presença da seção de Auto Leitura
    expect(screen.getByText('Configuração da Auto Leitura RGE')).not.toBeNull()

    // Verifica a presença do quadro de pré-visualização
    await waitFor(() => {
      expect(screen.getByText('Pré-visualização da mensagem ao cliente')).not.toBeNull()
      expect(screen.getByText('Disparo via WhatsApp')).not.toBeNull()
    })
  })

  it('substitui variáveis em tempo real conforme o usuário digita na mensagem e adiciona datas', async () => {
    const { container } = render(
      <ModalNovaAtividade
        isOpen={true}
        onClose={vi.fn()}
        initialTipo="auto_leitura_rge"
        initialClienteId="cli-1"
      />,
    )

    // Adiciona uma data de leitura
    const inputDate = container.querySelector('input[type="date"]')
    if (inputDate) {
      fireEvent.change(inputDate, { target: { value: '2026-10-15' } })
    }

    const btnAdicionar = screen.getByRole('button', { name: /adicionar/i })
    fireEvent.click(btnAdicionar)

    // Altera o textarea para testar as variáveis
    const textarea = screen.getByPlaceholderText(
      /Digite a mensagem que o cliente receberá pelo WhatsApp/i,
    )
    fireEvent.change(textarea, {
      target: {
        value:
          'Olá, [nome do cliente]! Leitura da {{usina}} agendada para [data] (UC {{numero_uc}}). Lembrete: [dia anterior].',
      },
    })

    // No balão de pré-visualização, as variáveis devem estar resolvidas
    await waitFor(() => {
      // Nome do cliente vinculado: Carlos Alberto Mendes
      // Data de leitura: 15/10/2026
      // Lembrete (2 dias antes): 13/10/2026
      expect(container.textContent).toContain('Olá, Carlos Alberto Mendes!')
      expect(container.textContent).toContain('15/10/2026')
      expect(container.textContent).toContain('13/10/2026')
    })
  })
})
