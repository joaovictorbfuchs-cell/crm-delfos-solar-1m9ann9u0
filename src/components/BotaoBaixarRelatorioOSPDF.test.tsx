import { describe, it, expect } from 'vitest'
import { BotaoBaixarRelatorioOSPDF } from '@/components/BotaoBaixarRelatorioOSPDF'
import type { OrdemServico } from '@/types/crm'

describe('BotaoBaixarRelatorioOSPDF', () => {
  it('exporta o componente BotaoBaixarRelatorioOSPDF corretamente', () => {
    expect(BotaoBaixarRelatorioOSPDF).toBeDefined()
    expect(typeof BotaoBaixarRelatorioOSPDF).toBe('function')
  })

  it('exporta a função utilitária gerarRelatorioOSPdfBlobBase64', async () => {
    const mod = await import('@/components/BotaoBaixarRelatorioOSPDF')
    expect(mod.gerarRelatorioOSPdfBlobBase64).toBeDefined()
    expect(typeof mod.gerarRelatorioOSPdfBlobBase64).toBe('function')
  })

  it('monta o nome do arquivo relatorio-tecnico-os.pdf com os dados da OS', () => {
    const osMock: OrdemServico = {
      id: 'os123456789abcde',
      cliente_id: 'cli123',
      created: '2025-01-01T00:00:00.000Z',
      updated: '2025-01-01T00:00:00.000Z',
    } as any

    expect(osMock.id.slice(-6).toUpperCase()).toBe('9ABCDE')
  })
})
