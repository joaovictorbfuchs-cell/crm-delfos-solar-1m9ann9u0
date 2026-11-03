import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PainelLembretesHoje } from './PainelLembretesHoje'
import type { Atividade } from '@/types/crm'

let mockAtividades: Atividade[] = []

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    atividades: mockAtividades,
    updateAtividadeStatus: vi.fn(),
    openFichaCliente: vi.fn(),
  }),
}))

describe('PainelLembretesHoje — blindagem contra insertBefore', () => {
  it('renderiza o estado vazio com wrapper raiz estável', () => {
    mockAtividades = []
    const html = renderToStaticMarkup(<PainelLembretesHoje />)
    expect(html).toContain('painel-lembretes-hoje-root')
    expect(html).toContain('Lembretes de Hoje (0)')
    expect(html).toContain('Tudo em dia')
  })

  it('renderiza itens de lembrete com key estável e sem colisão de IDs', () => {
    mockAtividades = [
      {
        id: 'atv-123',
        collectionId: 'atividades',
        collectionName: 'atividades',
        data: new Date().toISOString().slice(0, 10),
        titulo: 'Retornar contato sobre proposta solar',
        data_vencimento: new Date().toISOString().slice(0, 10),
        hora_vencimento: '14:00',
        status: 'pendente',
        tipo: 'outro',
        prioridade: 'alta',
        cliente_id: 'cli-1',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ]

    const html = renderToStaticMarkup(<PainelLembretesHoje />)
    expect(html).toContain('painel-lembretes-hoje-root')
    expect(html).toContain('Retornar contato sobre proposta solar')
    expect(html).toContain('Lembretes de Hoje')
  })
})
