import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { KanbanProjetos } from './KanbanProjetos'
import type { Projeto, Profissional } from '@/types/crm'

// Mock do hook useClientes
const mockUpdateProjetoEtapa = vi.fn()
const mockRefreshData = vi.fn()
const mockToast = vi.fn()

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    updateProjetoEtapa: mockUpdateProjetoEtapa,
    refreshData: mockRefreshData,
    atividades: [],
    orcamentosSolar: [],
    clientes: [],
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

describe('KanbanProjetos - Drag and Drop e Transição de Etapa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateProjetoEtapa.mockImplementation(async (id, etapa, options) => {
      return {
        id,
        collectionId: 'col-proj',
        collectionName: 'projetos',
        created: '2026-01-01',
        updated: '2026-01-01',
        etapa,
        titulo_usina: 'Usina Solar Teste',
        potencia_kwp: 10,
        ...options,
      } as Projeto
    })
    mockRefreshData.mockResolvedValue(undefined)
  })

  const mockProjetos: Projeto[] = [
    {
      id: 'proj-1',
      collectionId: 'col-proj',
      collectionName: 'projetos',
      created: '2026-01-01',
      updated: '2026-01-01',
      cliente_id: 'cli-1',
      cliente_nome: 'Cliente Solar ABC',
      titulo_usina: 'Usina Solar ABC',
      etapa: 'Levantamento de Informações',
      potencia_kwp: 12.5,
      cidade: 'Erechim',
      uf: 'RS',
    },
    {
      id: 'proj-2',
      collectionId: 'col-proj',
      collectionName: 'projetos',
      created: '2026-01-01',
      updated: '2026-01-01',
      cliente_id: 'cli-2',
      cliente_nome: 'Fazenda Boa Esperança',
      titulo_usina: 'Usina Rural 50kW',
      etapa: 'Elaboração de Projeto',
      potencia_kwp: 50,
      cidade: 'Passo Fundo',
      uf: 'RS',
    },
  ]

  const mockProfissionais: Profissional[] = [
    {
      id: 'prof-1',
      collectionId: 'col-prof',
      collectionName: 'profissionais',
      created: '2026-01-01',
      updated: '2026-01-01',
      nome: 'Carlos Engenheiro',
      ativo: true,
      tipo: 'engenheiro',
    },
  ]

  it('não muta o objeto original de projetos e chama updateProjetoEtapa ao soltar no desktop', async () => {
    const onOpenAtribuirModal = vi.fn()
    const onProjetoUpdated = vi.fn()

    render(
      <KanbanProjetos
        projetos={mockProjetos}
        profissionais={mockProfissionais}
        onOpenAtribuirModal={onOpenAtribuirModal}
        onProjetoUpdated={onProjetoUpdated}
      />,
    )

    // O projeto 1 começa em 'Levantamento de Informações'
    expect(mockProjetos[0].etapa).toBe('Levantamento de Informações')

    // Localiza a coluna de destino 'Pedido de Compra'
    const colunaAlvo = document.querySelector('[data-projeto-column-id="Pedido de Compra"]')
    expect(colunaAlvo).not.toBeNull()

    // Simula evento de drop com o id do projeto
    fireEvent.drop(colunaAlvo!, {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? 'proj-1' : ''),
      },
    })

    await waitFor(() => {
      expect(mockUpdateProjetoEtapa).toHaveBeenCalledWith('proj-1', 'Pedido de Compra', {
        abrirModalAtribuir: false,
      })
    })

    // CRÍTICO: Garante que a mutação direta NÃO ocorreu no array/objeto passado por props
    expect(mockProjetos[0].etapa).toBe('Levantamento de Informações')

    // Toast de sucesso foi disparado após o update
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Etapa atualizada',
      }),
    )

    // refreshData foi chamado para sincronizar com o banco
    expect(mockRefreshData).toHaveBeenCalled()
  })

  it('no mobile simula touch drag and drop e dispara moverEtapaProjeto', async () => {
    const onOpenAtribuirModal = vi.fn()

    render(
      <KanbanProjetos
        projetos={mockProjetos}
        profissionais={mockProfissionais}
        onOpenAtribuirModal={onOpenAtribuirModal}
      />,
    )

    // Encontra o card do projeto 1
    const cardEl = screen.getAllByText('Usina Solar ABC')[0].closest('[draggable="true"]')
    expect(cardEl).not.toBeNull()

    // Simula touchstart no card
    fireEvent.touchStart(cardEl!, {
      touches: [{ clientX: 100, clientY: 100 }],
    })

    // Aguarda o timer de long press (260ms) para ativar o arrasto
    await new Promise((r) => setTimeout(r, 280))

    // Mock do document.elementFromPoint para apontar para a coluna 'Aguardando Material'
    const colunaAlvo = document.querySelector('[data-projeto-column-id="Aguardando Material"]')
    expect(colunaAlvo).not.toBeNull()

    const originalElementFromPoint = document.elementFromPoint
    document.elementFromPoint = vi.fn(() => colunaAlvo)

    try {
      // Simula touchend
      fireEvent.touchEnd(cardEl!, {
        changedTouches: [{ clientX: 200, clientY: 200 }],
      })

      await waitFor(() => {
        expect(mockUpdateProjetoEtapa).toHaveBeenCalledWith('proj-1', 'Aguardando Material', {
          abrirModalAtribuir: false,
        })
      })

      // O objeto original não sofreu mutação in-place antes do contexto processar
      expect(mockProjetos[0].etapa).toBe('Levantamento de Informações')
    } finally {
      document.elementFromPoint = originalElementFromPoint
    }
  })

  it('abre modal de atribuir profissional se mover para Instalação sem profissional', async () => {
    const onOpenAtribuirModal = vi.fn()

    render(
      <KanbanProjetos
        projetos={mockProjetos}
        profissionais={mockProfissionais}
        onOpenAtribuirModal={onOpenAtribuirModal}
      />,
    )

    const colunaInstalacao = document.querySelector('[data-projeto-column-id="Instalação"]')
    expect(colunaInstalacao).not.toBeNull()

    fireEvent.drop(colunaInstalacao!, {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? 'proj-1' : ''),
      },
    })

    await waitFor(() => {
      expect(mockUpdateProjetoEtapa).toHaveBeenCalledWith('proj-1', 'Instalação', {
        abrirModalAtribuir: true,
      })
      expect(onOpenAtribuirModal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'proj-1' }),
        'Instalação',
      )
    })
  })
})
