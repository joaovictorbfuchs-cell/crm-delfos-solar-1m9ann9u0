import { describe, it, expect, vi, beforeEach } from 'vitest'
import pb from '@/lib/pocketbase/client'
import { dispararEmailDiarioAtividadesManual } from './emailDiarioAtividadesService'

vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    send: vi.fn(),
  },
}))

describe('emailDiarioAtividadesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve chamar /backend/v1/email-diario/executar com dry_run=true', async () => {
    const mockResponse = {
      ok: true,
      hoje: '12/10/2026',
      totalUsuarios: 4,
      enviados: 2,
      pulados: 2,
      falhas: 0,
      detalhes: [],
    }
    vi.mocked(pb.send).mockResolvedValueOnce(mockResponse)

    const result = await dispararEmailDiarioAtividadesManual(true)

    expect(pb.send).toHaveBeenCalledWith('/backend/v1/email-diario/executar', {
      method: 'POST',
      body: {
        dry_run: true,
        user_id: undefined,
      },
    })
    expect(result.ok).toBe(true)
    expect(result.enviados).toBe(2)
  })

  it('deve passar user_id quando fornecido', async () => {
    const mockResponse = {
      ok: true,
      hoje: '12/10/2026',
      totalUsuarios: 1,
      enviados: 1,
      pulados: 0,
      falhas: 0,
      detalhes: [],
    }
    vi.mocked(pb.send).mockResolvedValueOnce(mockResponse)

    const result = await dispararEmailDiarioAtividadesManual(false, 'usr_123')

    expect(pb.send).toHaveBeenCalledWith('/backend/v1/email-diario/executar', {
      method: 'POST',
      body: {
        dry_run: false,
        user_id: 'usr_123',
      },
    })
    expect(result.enviados).toBe(1)
  })
})
