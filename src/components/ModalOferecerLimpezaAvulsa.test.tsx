import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ModalOferecerLimpezaAvulsa } from './ModalOferecerLimpezaAvulsa'
import * as configuracoesService from '@/services/configuracoesService'

// Mock do hook useClientes
const mockUseClientes = vi.fn()
vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => mockUseClientes(),
}))

// Mock de sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ModalOferecerLimpezaAvulsa - Cálculo de Limpeza com Valor Editável por Placa', () => {
  const clienteMock = {
    id: 'cli_teste_1',
    nome: 'Empresa Teste Solar',
    cidade: 'Erechim',
    placas_qtd: 200, // 200 placas
    whatsapp: '(54) 99999-8888',
    telefone: '(54) 99999-8888',
  }

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()

    mockUseClientes.mockReturnValue({
      clientes: [clienteMock],
      contatosAdicionais: [],
      sistemas: [],
      sendWhatsAppMessage: vi.fn(),
      addAtividade: vi.fn(),
      updateCliente: vi.fn(),
      whatsAppConfig: null,
      isSessionExpired: false,
    })
  })

  it('exibe por padrão R$ 8,00 por placa e calcula 200 × R$ 8,00 = R$ 1.600,00', async () => {
    render(
      <ModalOferecerLimpezaAvulsa
        open={true}
        onOpenChange={vi.fn()}
        initialClienteId={clienteMock.id}
        modoIndividual={true}
        clienteContexto={clienteMock as any}
      />,
    )

    // O campo de valor cobrado por placa deve exibir 8
    const inputPorPlaca = screen.getByLabelText(/Cobrado por placa/i) as HTMLInputElement
    expect(inputPorPlaca).toBeDefined()
    expect(inputPorPlaca.value).toBe('8')

    // O critério exibido deve ser "200 × R$ 8,00"
    expect(screen.getByText(/200 × R\$ 8,00/i)).toBeDefined()

    // O valor sugerido de limpeza e o valor total devem refletir R$ 1.600,00 (200 * 8)
    const valores1600 = screen.getAllByText(/R\$ 1\.600,00/i)
    expect(valores1600.length).toBeGreaterThan(0)
  })

  it('permite editar o valor por km de deslocamento com padrão R$ 1,50 e recalcula na hora', async () => {
    render(
      <ModalOferecerLimpezaAvulsa
        open={true}
        onOpenChange={vi.fn()}
        initialClienteId={clienteMock.id}
        modoIndividual={true}
        clienteContexto={clienteMock as any}
      />,
    )

    // Ativa checkbox "Incluir deslocamento"
    const checkboxDeslocamento = screen.getByLabelText(/Incluir deslocamento/i) as HTMLInputElement
    fireEvent.click(checkboxDeslocamento)
    expect(checkboxDeslocamento.checked).toBe(true)

    // O campo de valor por km deve existir com valor padrão 1.5
    const inputValorPorKm = screen.getByLabelText(/Valor por km/i) as HTMLInputElement
    expect(inputValorPorKm).toBeDefined()
    expect(inputValorPorKm.value).toBe('1.5')

    // Define a distância para 35 km
    const inputDistancia = screen.getByLabelText(/Distância \(km\)/i) as HTMLInputElement
    fireEvent.change(inputDistancia, { target: { value: '35' } })

    // Resumo padrão: 35 km × R$ 1,50 × 2 = R$ 105,00
    await waitFor(() => {
      expect(screen.getByText(/35 km × R\$ 1,50 × 2/i)).toBeDefined()
      expect(screen.getAllByText(/R\$ 105,00/i).length).toBeGreaterThan(0)
    })

    // Altera o valor por km para 2 (R$ 2,00 por km)
    fireEvent.change(inputValorPorKm, { target: { value: '2' } })

    // Recalcula na hora: 35 km × R$ 2,00 × 2 = R$ 140,00
    await waitFor(() => {
      expect(screen.getByText(/35 km × R\$ 2,00 × 2/i)).toBeDefined()
      expect(screen.getAllByText(/R\$ 140,00/i).length).toBeGreaterThan(0)
    })
  })

  it('recalcula em tempo real quando o usuário altera o valor por placa e persiste como novo padrão', async () => {
    const spySetPadrao = vi.spyOn(configuracoesService, 'setValorLimpezaPorPlacaPadrao')

    render(
      <ModalOferecerLimpezaAvulsa
        open={true}
        onOpenChange={vi.fn()}
        initialClienteId={clienteMock.id}
        modoIndividual={true}
        clienteContexto={clienteMock as any}
      />,
    )

    const inputPorPlaca = screen.getByLabelText(/Cobrado por placa/i) as HTMLInputElement

    // Usuário altera o valor por placa de R$ 8,00 para R$ 10,00
    fireEvent.change(inputPorPlaca, { target: { value: '10' } })

    // Deve salvar como novo padrão chamando setValorLimpezaPorPlacaPadrao(10)
    await waitFor(() => {
      expect(spySetPadrao).toHaveBeenCalledWith(10)
    })

    // O texto do critério agora deve refletir 200 × R$ 10,00
    expect(screen.getByText(/200 × R\$ 10,00/i)).toBeDefined()

    // O valor sugerido de limpeza e total comercial recalculam para R$ 2.000,00 (200 * 10)
    const valores2000 = screen.getAllByText(/R\$ 2\.000,00/i)
    expect(valores2000.length).toBeGreaterThan(0)
  })

  it('o botão "Restaurar sugerido" restaura o valor de serviço com base no valor por placa vigente', async () => {
    render(
      <ModalOferecerLimpezaAvulsa
        open={true}
        onOpenChange={vi.fn()}
        initialClienteId={clienteMock.id}
        modoIndividual={true}
        clienteContexto={clienteMock as any}
      />,
    )

    // Altera manualmente o valor do serviço para R$ 500
    const inputServico = screen.getByLabelText(/Valor do Serviço de Limpeza/i) as HTMLInputElement
    fireEvent.change(inputServico, { target: { value: '500' } })
    expect(inputServico.value).toBe('500')

    // Clica no botão de restaurar sugerido
    const botaoRestaurar = screen.getByRole('button', { name: /Restaurar sugerido/i })
    fireEvent.click(botaoRestaurar)

    // O input do serviço deve voltar para o sugerido (200 * 8 = 1600)
    await waitFor(() => {
      expect(inputServico.value).toBe('1600')
    })
  })
})
