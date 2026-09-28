import { describe, it, expect, vi } from 'vitest'
import {
  getUsinasByContratoId,
  getContratosByUsinaId,
  vincularUsinaAoContrato,
  desvincularUsinaDoContrato,
} from './contratosUsinasService'
import pb from '@/lib/pocketbase/client'

vi.mock('@/lib/pocketbase/client', () => {
  const collectionMock = {
    getFullList: vi.fn(),
    getList: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }
  return {
    default: {
      collection: vi.fn(() => collectionMock),
    },
    pb: {
      collection: vi.fn(() => collectionMock),
    },
  }
})

describe('contratosUsinasService', () => {
  it('deve listar usinas por contrato', async () => {
    const mockUsinas = [
      { id: 'rel1', contrato_id: 'c1', usina_id: 'u1', ativo: true },
      { id: 'rel2', contrato_id: 'c1', usina_id: 'u2', ativo: true },
    ]
    const colMock = pb.collection('contratos_usinas') as any
    colMock.getFullList.mockResolvedValueOnce(mockUsinas)

    const res = await getUsinasByContratoId('c1')
    expect(res).toHaveLength(2)
    expect(colMock.getFullList).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: 'contrato_id = "c1"',
      }),
    )
  })

  it('deve listar histórico de contratos por usina', async () => {
    const mockContratos = [
      {
        id: 'rel1',
        contrato_id: 'c1',
        usina_id: 'u1',
        ativo: false,
        data_desvinculo: '2025-01-01',
      },
      { id: 'rel2', contrato_id: 'c2', usina_id: 'u1', ativo: true },
    ]
    const colMock = pb.collection('contratos_usinas') as any
    colMock.getFullList.mockResolvedValueOnce(mockContratos)

    const res = await getContratosByUsinaId('u1')
    expect(res).toHaveLength(2)
    expect(colMock.getFullList).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: 'usina_id = "u1"',
      }),
    )
  })

  it('deve vincular nova usina e atualizar usina.contrato_id', async () => {
    const colContratosUsinas = {
      getList: vi.fn().mockResolvedValueOnce({ items: [] }),
      create: vi.fn().mockResolvedValueOnce({
        id: 'rel_novo',
        contrato_id: 'c1',
        usina_id: 'u1',
        ativo: true,
      }),
      update: vi.fn(),
    }
    const colUsinas = {
      update: vi.fn().mockResolvedValueOnce({ id: 'u1', contrato_id: 'c1' }),
    }

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'contratos_usinas') return colContratosUsinas as any
      if (name === 'usinas') return colUsinas as any
      return {} as any
    })

    const res = await vincularUsinaAoContrato({
      contrato_id: 'c1',
      usina_id: 'u1',
      observacoes: 'Teste de vínculo',
    })

    expect(res.id).toBe('rel_novo')
    expect(colContratosUsinas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contrato_id: 'c1',
        usina_id: 'u1',
        ativo: true,
        observacoes: 'Teste de vínculo',
      }),
      expect.anything(),
    )
    expect(colUsinas.update).toHaveBeenCalledWith('u1', { contrato_id: 'c1' })
  })

  it('deve desvincular usina sem apagar registro (ativo = false) e preservar histórico', async () => {
    const mockVinculoAtual = {
      id: 'rel_existente',
      contrato_id: 'c1',
      usina_id: 'u1',
      ativo: true,
      observacoes: 'Inicial',
    }
    const colContratosUsinas = {
      getOne: vi.fn().mockResolvedValueOnce(mockVinculoAtual),
      update: vi.fn().mockResolvedValueOnce({
        ...mockVinculoAtual,
        ativo: false,
        data_desvinculo: '2026-03-31T12:00:00Z',
      }),
      getList: vi.fn().mockResolvedValueOnce({ items: [] }),
    }
    const colUsinas = {
      getOne: vi.fn().mockResolvedValueOnce({ id: 'u1', contrato_id: 'c1' }),
      update: vi.fn().mockResolvedValueOnce({ id: 'u1', contrato_id: null }),
    }

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'contratos_usinas') return colContratosUsinas as any
      if (name === 'usinas') return colUsinas as any
      return {} as any
    })

    const res = await desvincularUsinaDoContrato('rel_existente', 'Término de vigência')
    expect(res.ativo).toBe(false)
    expect(colContratosUsinas.update).toHaveBeenCalledWith(
      'rel_existente',
      expect.objectContaining({
        ativo: false,
      }),
      expect.anything(),
    )
    expect(colUsinas.update).toHaveBeenCalledWith('u1', { contrato_id: null })
  })
})
