import { describe, it, expect, vi, beforeEach } from 'vitest'
import pb from '@/lib/pocketbase/client'
import { fetchContagemUsoEquipamentosEmUsinas } from './usinaEquipamentosService'

describe('usinaEquipamentosService - fetchContagemUsoEquipamentosEmUsinas', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna mapa de contagem de usinas distintas por equipamento', async () => {
    const mockRecords = [
      { id: 'ue1', equipamento_id: 'eq1', usina_id: 'usinaA' },
      { id: 'ue2', equipamento_id: 'eq1', usina_id: 'usinaB' },
      { id: 'ue3', equipamento_id: 'eq1', usina_id: 'usinaA' }, // repetida na mesma usina
      { id: 'ue4', equipamento_id: 'eq2', usina_id: 'usinaC' },
    ]

    vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
      if (colName === 'usina_equipamentos') {
        return {
          getFullList: vi.fn().mockResolvedValue(mockRecords),
        } as any
      }
      return {} as any
    })

    const contagem = await fetchContagemUsoEquipamentosEmUsinas()
    expect(contagem['eq1']).toBe(2) // usinaA e usinaB
    expect(contagem['eq2']).toBe(1) // usinaC
    expect(contagem['eq_inexistente']).toBeUndefined()
  })

  it('retorna objeto vazio em caso de erro na consulta', async () => {
    vi.spyOn(pb, 'collection').mockImplementation(() => {
      return {
        getFullList: vi.fn().mockRejectedValue(new Error('Falha de rede')),
      } as any
    })

    const contagem = await fetchContagemUsoEquipamentosEmUsinas()
    expect(contagem).toEqual({})
  })
})
