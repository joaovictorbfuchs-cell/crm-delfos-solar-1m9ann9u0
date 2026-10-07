import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getValorLimpezaPorPlacaPadrao,
  getValorLimpezaPorPlacaCacheSync,
  setValorLimpezaPorPlacaPadrao,
  STORAGE_KEY_VALOR_POR_PLACA,
  VALOR_POR_PLACA_PADRAO_SISTEMA,
} from './configuracoesService'
import pb from '@/lib/pocketbase/client'

describe('configuracoesService - valor de limpeza por placa', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('retorna R$ 8,00 como valor padrão quando sem cache e sem PocketBase', async () => {
    vi.spyOn(pb, 'collection').mockReturnValue({
      getFirstListItem: vi.fn().mockRejectedValue(new Error('Record not found')),
    } as any)

    const syncVal = getValorLimpezaPorPlacaCacheSync()
    expect(syncVal).toBe(VALOR_POR_PLACA_PADRAO_SISTEMA)
    expect(syncVal).toBe(8.0)

    const asyncVal = await getValorLimpezaPorPlacaPadrao()
    expect(asyncVal).toBe(8.0)
  })

  it('salva novo valor no localStorage e persiste no PocketBase', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: 'rec_1' })
    const mockCreate = vi.fn().mockResolvedValue({ id: 'rec_2' })
    const mockGet = vi.fn().mockResolvedValue({
      id: 'rec_1',
      chave: 'valor_limpeza_por_placa',
      valor: '8.00',
    })

    vi.spyOn(pb, 'collection').mockReturnValue({
      getFirstListItem: mockGet,
      update: mockUpdate,
      create: mockCreate,
    } as any)

    const novo = await setValorLimpezaPorPlacaPadrao(9.5)
    expect(novo).toBe(9.5)
    expect(localStorage.getItem(STORAGE_KEY_VALOR_POR_PLACA)).toBe('9.5')
    expect(mockUpdate).toHaveBeenCalledWith(
      'rec_1',
      expect.objectContaining({
        chave: 'valor_limpeza_por_placa',
        valor: '9.50',
      }),
    )

    // A leitura síncrona agora deve retornar o valor em cache
    expect(getValorLimpezaPorPlacaCacheSync()).toBe(9.5)
  })

  it('cria registro no PocketBase caso ainda não exista ao salvar novo valor', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'rec_novo' })
    const mockGet = vi.fn().mockRejectedValue(new Error('Not found'))

    vi.spyOn(pb, 'collection').mockReturnValue({
      getFirstListItem: mockGet,
      create: mockCreate,
    } as any)

    const salvo = await setValorLimpezaPorPlacaPadrao(12.0)
    expect(salvo).toBe(12.0)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        chave: 'valor_limpeza_por_placa',
        valor: '12.00',
      }),
    )
  })

  it('lê valor do PocketBase e atualiza o localStorage', async () => {
    vi.spyOn(pb, 'collection').mockReturnValue({
      getFirstListItem: vi.fn().mockResolvedValue({
        id: 'cfg_1',
        chave: 'valor_limpeza_por_placa',
        valor: '11.50',
        dados: { valor_por_placa: 11.5 },
      }),
    } as any)

    const val = await getValorLimpezaPorPlacaPadrao()
    expect(val).toBe(11.5)
    expect(localStorage.getItem(STORAGE_KEY_VALOR_POR_PLACA)).toBe('11.5')
    expect(getValorLimpezaPorPlacaCacheSync()).toBe(11.5)
  })
})
