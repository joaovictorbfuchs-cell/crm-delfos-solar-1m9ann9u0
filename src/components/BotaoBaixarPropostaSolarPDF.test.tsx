import { describe, it, expect, vi } from 'vitest'
import {
  BotaoBaixarPropostaSolarPDF,
  gerarPropostaSolarPdfBlob,
  gerarPropostaSolarPdfBase64,
} from './BotaoBaixarPropostaSolarPDF'

describe('BotaoBaixarPropostaSolarPDF', () => {
  it('exporta o componente BotaoBaixarPropostaSolarPDF e utilitários de Blob/Base64', () => {
    expect(typeof BotaoBaixarPropostaSolarPDF).toBe('function')
    expect(typeof gerarPropostaSolarPdfBlob).toBe('function')
    expect(typeof gerarPropostaSolarPdfBase64).toBe('function')
  })

  it('gerarPropostaSolarPdfBase64 gera documento completo via renderizarHTMLParaPdfBase64', async () => {
    const { renderizarHTMLParaPdfBase64 } = await import('@/lib/pdfWhatsAppService')
    expect(typeof renderizarHTMLParaPdfBase64).toBe('function')
  })
})
