import { describe, it, expect, vi, beforeEach } from 'vitest'
import pb from '@/lib/pocketbase/client'
import { createEtapaFollowUp, updateEtapaFollowUp } from '@/services/fluxosFollowUpService'

describe('fluxosFollowUpService - dias_apos = 0 (envio imediato na primeira etapa)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve persistir dias_apos = 0 ao criar primeira etapa sem forçar fallback para 1', async () => {
    const mockCreatedRecord = {
      id: 'etapa_123',
      fluxo_id: 'fluxo_abc',
      ordem: 1,
      nome: '1ª Mensagem Imediata',
      dias_apos: 0,
      mensagem: 'Mensagem inicial sem espera',
      ativa: true,
      desvio_acao: 'nenhuma',
      desvio_dias: 0,
      desvio_fluxo_id: '',
      created: '2025-01-01',
      updated: '2025-01-01',
    }

    const createSpy = vi
      .spyOn(pb.collection('etapas_follow_up'), 'create')
      .mockResolvedValue(mockCreatedRecord as any)

    const etapa = await createEtapaFollowUp({
      fluxo_id: 'fluxo_abc',
      ordem: 1,
      nome: '1ª Mensagem Imediata',
      dias_apos: 0,
      mensagem: 'Mensagem inicial sem espera',
    })

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fluxo_id: 'fluxo_abc',
        ordem: 1,
        dias_apos: 0,
        mensagem: 'Mensagem inicial sem espera',
        desvio_acao: 'nenhuma',
        desvio_dias: 0,
      }),
    )
    expect(etapa.dias_apos).toBe(0)
    expect(etapa.desvio_dias).toBe(0)
  })

  it('deve atualizar etapa para dias_apos = 0 mantendo 0 no payload', async () => {
    const mockUpdatedRecord = {
      id: 'etapa_123',
      fluxo_id: 'fluxo_abc',
      ordem: 1,
      nome: '1ª Mensagem Imediata',
      dias_apos: 0,
      mensagem: 'Mensagem inicial sem espera',
      ativa: true,
      created: '2025-01-01',
      updated: '2025-01-01',
    }

    const updateSpy = vi
      .spyOn(pb.collection('etapas_follow_up'), 'update')
      .mockResolvedValue(mockUpdatedRecord as any)

    const etapa = await updateEtapaFollowUp('etapa_123', {
      dias_apos: 0,
      nome: '1ª Mensagem Imediata',
    })

    expect(updateSpy).toHaveBeenCalledWith(
      'etapa_123',
      expect.objectContaining({
        dias_apos: 0,
        nome: '1ª Mensagem Imediata',
      }),
    )
    expect(etapa.dias_apos).toBe(0)
  })

  it('deve atualizar etapa com desvio_dias = 0 e dias_apos = 0 sem erro de validação', async () => {
    const mockUpdatedRecord = {
      id: 'etapa_123',
      fluxo_id: 'fluxo_abc',
      ordem: 1,
      nome: '1ª Mensagem Imediata',
      dias_apos: 0,
      desvio_acao: 'nenhuma',
      desvio_dias: 0,
      mensagem: 'Mensagem sem espera',
      ativa: true,
      created: '2025-01-01',
      updated: '2025-01-01',
    }

    const updateSpy = vi
      .spyOn(pb.collection('etapas_follow_up'), 'update')
      .mockResolvedValue(mockUpdatedRecord as any)

    const etapa = await updateEtapaFollowUp('etapa_123', {
      dias_apos: 0,
      desvio_acao: 'nenhuma',
      desvio_dias: 0,
    })

    expect(updateSpy).toHaveBeenCalledWith(
      'etapa_123',
      expect.objectContaining({
        dias_apos: 0,
        desvio_acao: 'nenhuma',
        desvio_dias: 0,
      }),
    )
    expect(etapa.dias_apos).toBe(0)
    expect(etapa.desvio_dias).toBe(0)
  })

  it('deve manter dias_apos >= 1 para etapas seguintes', async () => {
    const mockCreatedRecord = {
      id: 'etapa_456',
      fluxo_id: 'fluxo_abc',
      ordem: 2,
      nome: '2ª Mensagem',
      dias_apos: 5,
      mensagem: 'Follow-up após 5 dias',
      ativa: true,
      created: '2025-01-01',
      updated: '2025-01-01',
    }

    const createSpy = vi
      .spyOn(pb.collection('etapas_follow_up'), 'create')
      .mockResolvedValue(mockCreatedRecord as any)

    const etapa = await createEtapaFollowUp({
      fluxo_id: 'fluxo_abc',
      ordem: 2,
      nome: '2ª Mensagem',
      dias_apos: 5,
      mensagem: 'Follow-up após 5 dias',
    })

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ordem: 2,
        dias_apos: 5,
      }),
    )
    expect(etapa.dias_apos).toBe(5)
  })
})
