import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { MobileKanbanViewport, type MobileKanbanStage } from './MobileKanbanViewport'

describe('MobileKanbanViewport', () => {
  const mockStages: MobileKanbanStage[] = [
    {
      id: 'etapa-1',
      title: '1. Novo Lead',
      shortTitle: 'Novo Lead',
      count: 3,
      totalSubtitle: 'Acumulado: R$ 50.000,00',
      content: <div data-testid="content-etapa-1">Card Lead A, Card Lead B</div>,
    },
    {
      id: 'etapa-2',
      title: '2. Levantamento',
      shortTitle: 'Levantamento',
      count: 2,
      totalSubtitle: 'Acumulado: R$ 30.000,00',
      content: <div data-testid="content-etapa-2">Card Lead C</div>,
    },
    {
      id: 'etapa-3',
      title: '3. Proposta',
      shortTitle: 'Proposta Enviada',
      count: 5,
      totalSubtitle: 'Acumulado: R$ 120.000,00',
      content: <div data-testid="content-etapa-3">Card Lead D</div>,
    },
  ]

  it('renderiza o indicador da etapa inicial e o contador', () => {
    render(<MobileKanbanViewport stages={mockStages} />)

    // Nome da etapa atual
    expect(screen.getByText('Novo Lead')).toBeDefined()
    // Contador da etapa
    expect(screen.getByText('3')).toBeDefined()
    // Subtítulo acumulado
    expect(screen.getByText('Acumulado: R$ 50.000,00')).toBeDefined()
    // Conteúdo da etapa está presente
    expect(screen.getByTestId('content-etapa-1')).toBeDefined()
  })

  it('navega para a próxima etapa através do botão de seta', () => {
    const handleStageChange = vi.fn()
    render(<MobileKanbanViewport stages={mockStages} onStageChange={handleStageChange} />)

    const nextBtn = screen.getByLabelText('Próxima etapa')
    fireEvent.click(nextBtn)

    expect(handleStageChange).toHaveBeenCalledWith(1, 'etapa-2')
    expect(screen.getByText('Levantamento')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('Acumulado: R$ 30.000,00')).toBeDefined()
  })

  it('navega para a etapa anterior através do botão de seta', () => {
    render(<MobileKanbanViewport stages={mockStages} initialStageIndex={1} />)

    expect(screen.getByText('Levantamento')).toBeDefined()

    const prevBtn = screen.getByLabelText('Etapa anterior')
    fireEvent.click(prevBtn)

    expect(screen.getByText('Novo Lead')).toBeDefined()
  })

  it('permite navegação direta clicando nos pontos (pills) de progresso', () => {
    render(<MobileKanbanViewport stages={mockStages} />)

    const pill3 = screen.getByLabelText('Ir para etapa 3: 3. Proposta')
    fireEvent.click(pill3)

    expect(screen.getByText('Proposta Enviada')).toBeDefined()
    expect(screen.getByText('5')).toBeDefined()
  })

  it('responde a gestos de swipe touch horizontal para avançar e voltar', () => {
    render(<MobileKanbanViewport stages={mockStages} />)

    const container = screen.getByText('Card Lead A, Card Lead B').closest('.touch-pan-y')
    expect(container).not.toBeNull()

    if (container) {
      // Simula swipe para a esquerda (diffX = -80px) -> deve avançar etapa
      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 120, clientY: 100 }],
      })
      fireEvent.touchEnd(container)

      // Agora deve estar na etapa 2
      expect(screen.getByText('Levantamento')).toBeDefined()

      // Simula swipe para a direita (diffX = +80px) -> deve voltar etapa
      fireEvent.touchStart(container, {
        touches: [{ clientX: 120, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchEnd(container)

      // Agora deve voltar para a etapa 1
      expect(screen.getByText('Novo Lead')).toBeDefined()
    }
  })
})
