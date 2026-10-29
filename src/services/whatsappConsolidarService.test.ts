import { describe, it, expect, vi, beforeEach } from 'vitest'
import pb from '@/lib/pocketbase/client'
import { consolidarConversasDuplicadasWhatsApp } from './whatsappConsolidarService'

vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    send: vi.fn(),
  },
}))

describe('whatsappConsolidarService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve chamar o endpoint /backend/v1/whatsapp/consolidar-duplicadas com dry_run=true por padrão', async () => {
    const mockResponse = {
      ok: true,
      dryRun: true,
      totalConversasAnalisadas: 50,
      totalGruposDuplicados: 1,
      totalConversasRemovidas: 2,
      totalMensagensMovidas: 1,
      totalMensagensDuplicadasExcluidas: 2,
      grupos: [
        {
          chave: 'tel_549393405',
          principalId: 'zf45tvzt03p5quz',
          principalNumero: '555499393405',
          principalCreated: '2026-10-29 15:08:16.468Z',
          totalDuplicatas: 2,
          duplicatas: [
            {
              id: 'de5w0adxqa2ufe1',
              numero: '555499393405',
              created: '2026-10-29 15:08:28.486Z',
              mensagensContidas: 1,
              mensagensMovidas: 0,
              mensagensDuplicadasExcluidas: 1,
            },
            {
              id: 'u1x1kxsmtljdbjl',
              numero: '555499393405',
              created: '2026-10-29 15:08:28.490Z',
              mensagensContidas: 10,
              mensagensMovidas: 9,
              mensagensDuplicadasExcluidas: 1,
            },
          ],
          mensagensAMover: 9,
          mensagensDuplicadasIgnoradas: 2,
        },
      ],
    }

    vi.mocked(pb.send).mockResolvedValue(mockResponse)

    const resultado = await consolidarConversasDuplicadasWhatsApp()

    expect(pb.send).toHaveBeenCalledTimes(1)
    expect(pb.send).toHaveBeenCalledWith('/backend/v1/whatsapp/consolidar-duplicadas', {
      method: 'POST',
      body: {
        dry_run: true,
      },
    })
    expect(resultado.dryRun).toBe(true)
    expect(resultado.totalGruposDuplicados).toBe(1)
    expect(resultado.grupos[0].duplicatas).toHaveLength(2)
  })

  it('deve chamar o endpoint com dry_run=false quando explicitado', async () => {
    vi.mocked(pb.send).mockResolvedValue({
      ok: true,
      dryRun: false,
      totalConversasAnalisadas: 50,
      totalGruposDuplicados: 0,
      totalConversasRemovidas: 0,
      totalMensagensMovidas: 0,
      totalMensagensDuplicadasExcluidas: 0,
      grupos: [],
    })

    const resultado = await consolidarConversasDuplicadasWhatsApp(false)

    expect(pb.send).toHaveBeenCalledWith('/backend/v1/whatsapp/consolidar-duplicadas', {
      method: 'POST',
      body: {
        dry_run: false,
      },
    })
    expect(resultado.dryRun).toBe(false)
  })
})
