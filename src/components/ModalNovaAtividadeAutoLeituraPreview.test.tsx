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

  it('permite desmarcar a obrigatoriedade de usina e criar atividade de manutenção sem usina vinculada', async () => {
    const addAtividadeMock = vi.fn().mockResolvedValue({ id: 'atv-sem-usina-1' })
    const { useClientes } = await import('@/contexts/ClientesContext')
    vi.mocked(useClientes).mockReturnValue({
      clientes: [
        {
          id: 'cli-sem-usina',
          nome: 'Cliente Sem Usina',
          endereco: 'Rua Teste, 100',
          cidade: 'Erechim',
          estado: 'RS',
        },
      ],
      usuarios: [
        { id: 'usr-admin-1', name: 'Administrador', email: 'admin@delfos.com', role: 'admin' },
      ],
      addAtividade: addAtividadeMock,
      tiposAtividadesCustom: [],
    } as any)

    const { fetchUsinasByClienteId } = await import('@/services/crmService')
    vi.mocked(fetchUsinasByClienteId).mockResolvedValue([])

    const { container } = render(
      <ModalNovaAtividade
        isOpen={true}
        onClose={vi.fn()}
        apenasManutencao={true}
        initialTipo="manutencao_preventiva"
        initialClienteId="cli-sem-usina"
      />,
    )

    // O aviso de que o cliente não possui usinas cadastradas deve ser renderizado
    await waitFor(() => {
      expect(
        screen.getByText(/O cliente selecionado não possui usinas cadastradas/i),
      ).not.toBeNull()
    })

    // O checkbox de obrigatoriedade deve estar presente e inicialmente marcado
    const checkbox = container.querySelector('#check-usina-obrigatoria') as HTMLInputElement | null
    expect(checkbox).not.toBeNull()
    expect(checkbox?.checked).toBe(true)

    // Tentar submeter com obrigatoriedade ativa gera o erro de usina obrigatória
    const form = container.querySelector('form')
    if (form) fireEvent.submit(form)

    await waitFor(() => {
      expect(
        screen.getByText(/A usina é obrigatória para atividades de manutenção e administrativas/i),
      ).not.toBeNull()
    })

    // Agora o usuário desmarca a obrigatoriedade
    fireEvent.click(checkbox!)
    expect(checkbox?.checked).toBe(false)

    // O aviso de bloqueio é limpo e indica que pode salvar sem usina
    await waitFor(() => {
      expect(
        screen.getByText(
          /Obrigatoriedade dispensada: você pode salvar e agendar esta atividade sem usina vinculada/i,
        ),
      ).not.toBeNull()
    })

    // Submete o formulário com a obrigatoriedade desligada
    if (form) fireEvent.submit(form)

    await waitFor(() => {
      expect(addAtividadeMock).toHaveBeenCalled()
      const payloadEnviado = addAtividadeMock.mock.calls[0][0]
      expect(payloadEnviado.usina_id).toBeUndefined()
      expect(payloadEnviado.cliente_id).toBe('cli-sem-usina')
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
