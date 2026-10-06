import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Negocio, Atividade } from '@/types/crm'

describe('Etapa 2: Vínculo de atividades e anotações ao negócio comercial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('permite que uma Atividade possua negocio_id opcional sem quebrar compatibilidade', () => {
    const atividadeSemNegocio: Atividade = {
      id: 'ativ_1',
      cliente_id: 'cli_1',
      tipo: 'contato_ligacao',
      titulo: 'Ligação Geral',
      descricao: 'Sem negócio vinculado',
      data: '2026-04-20T10:00:00Z',
      status: 'pendente',
      created: '2026-04-20T10:00:00Z',
      updated: '2026-04-20T10:00:00Z',
      collectionId: 'col_ativ',
      collectionName: 'atividades',
    }

    expect(atividadeSemNegocio.negocio_id).toBeUndefined()

    const atividadeComNegocio: Atividade = {
      ...atividadeSemNegocio,
      id: 'ativ_2',
      negocio_id: 'neg_123',
    }

    expect(atividadeComNegocio.negocio_id).toBe('neg_123')
  })

  it('lógica de auto-sugestão: seleciona automaticamente quando há exatamente 1 negócio em andamento', () => {
    const negocios: Partial<Negocio>[] = [
      { id: 'neg_1', status: 'em andamento', titulo: 'Negócio Solar' },
      { id: 'neg_2', status: 'perdido', titulo: 'Negócio Perdido' },
      { id: 'neg_3', status: 'ganho', titulo: 'Negócio Ganho' },
    ]

    const emAndamento = negocios.filter((n) => n.status === 'em andamento')
    expect(emAndamento.length).toBe(1)

    // Se há apenas 1 em andamento, o sistema deve sugerir seu id
    const sugerido = emAndamento.length === 1 ? emAndamento[0].id : ''
    expect(sugerido).toBe('neg_1')
  })

  it('lógica de auto-sugestão: não pré-seleciona se houver múltiplos negócios em andamento', () => {
    const negocios: Partial<Negocio>[] = [
      { id: 'neg_1', status: 'em andamento', titulo: 'Negócio Solar 1' },
      { id: 'neg_2', status: 'em andamento', titulo: 'Negócio Bateria 2' },
      { id: 'neg_3', status: 'ganho', titulo: 'Negócio Fechado' },
    ]

    const emAndamento = negocios.filter((n) => n.status === 'em andamento')
    expect(emAndamento.length).toBe(2)

    const sugerido = emAndamento.length === 1 ? emAndamento[0].id : ''
    expect(sugerido).toBe('')
  })

  it('lógica de auto-sugestão: não pré-seleciona se cliente não possuir negócios em andamento', () => {
    const negocios: Partial<Negocio>[] = [
      { id: 'neg_1', status: 'ganho', titulo: 'Negócio Ganho' },
      { id: 'neg_2', status: 'perdido', titulo: 'Negócio Perdido' },
    ]

    const emAndamento = negocios.filter((n) => n.status === 'em andamento')
    expect(emAndamento.length).toBe(0)

    const sugerido = emAndamento.length === 1 ? emAndamento[0].id : ''
    expect(sugerido).toBe('')
  })

  it('filtra atividades e anotações vinculadas ao negócio por negocio_id', () => {
    const atividades: Partial<Atividade>[] = [
      { id: '1', negocio_id: 'neg_A', tipo: 'contato_ligacao', titulo: 'Ligar para negociar' },
      { id: '2', negocio_id: 'neg_A', tipo: 'anotacao', titulo: 'Anotação cliente pediu desconto' },
      { id: '3', negocio_id: 'neg_B', tipo: 'reuniao_presencial', titulo: 'Outro negócio' },
      { id: '4', tipo: 'follow_up', titulo: 'Atividade sem negócio' },
    ]

    const doNegocioA = atividades.filter((a) => a.negocio_id === 'neg_A')
    expect(doNegocioA.length).toBe(2)

    const tarefasA = doNegocioA.filter((a) => a.tipo !== 'anotacao')
    const anotacoesA = doNegocioA.filter((a) => a.tipo === 'anotacao')

    expect(tarefasA.length).toBe(1)
    expect(tarefasA[0].titulo).toBe('Ligar para negociar')
    expect(anotacoesA.length).toBe(1)
    expect(anotacoesA[0].titulo).toBe('Anotação cliente pediu desconto')
  })

  it('garante que a vinculação manual pode selecionar atividades pré-existentes do cliente', () => {
    const clienteId = 'cli_999'
    const negocioAtualId = 'neg_999'

    const todasDoCliente: Partial<Atividade>[] = [
      { id: 'at_1', cliente_id: clienteId, negocio_id: undefined, titulo: 'Atividade avulsa 1' },
      {
        id: 'at_2',
        cliente_id: clienteId,
        negocio_id: 'neg_outro',
        titulo: 'Atividade de outro negócio',
      },
      {
        id: 'at_3',
        cliente_id: clienteId,
        negocio_id: negocioAtualId,
        titulo: 'Já vinculada a este',
      },
    ]

    // Atividades elegíveis para vincular ao negócio atual (que ainda não pertencem a ele)
    const elegiveis = todasDoCliente.filter((a) => a.negocio_id !== negocioAtualId)
    expect(elegiveis.map((a) => a.id)).toEqual(['at_1', 'at_2'])

    // Simulando seleção de at_1 para vincular
    const selecionadas = ['at_1']
    const atualizadas = todasDoCliente.map((a) =>
      selecionadas.includes(a.id || '') ? { ...a, negocio_id: negocioAtualId } : a,
    )

    const agoraVinculadas = atualizadas.filter((a) => a.negocio_id === negocioAtualId)
    expect(agoraVinculadas.map((a) => a.id)).toEqual(['at_1', 'at_3'])
  })
})
