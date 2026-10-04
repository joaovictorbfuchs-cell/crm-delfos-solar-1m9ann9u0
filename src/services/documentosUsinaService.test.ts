import { describe, it, expect, vi } from 'vitest'
import { isArquivoImagem, isArquivoPdf, getDocumentoUsinaFileUrl } from './documentosUsinaService'

describe('documentosUsinaService', () => {
  it('deve identificar extensões de imagem corretamente', () => {
    expect(isArquivoImagem('foto.jpg')).toBe(true)
    expect(isArquivoImagem('foto.jpeg')).toBe(true)
    expect(isArquivoImagem('imagem.PNG')).toBe(true)
    expect(isArquivoImagem('foto.webp')).toBe(true)
    expect(isArquivoImagem('projeto.pdf')).toBe(false)
    expect(isArquivoImagem('')).toBe(false)
  })

  it('deve identificar extensões de PDF corretamente', () => {
    expect(isArquivoPdf('laudo_tecnico.pdf')).toBe(true)
    expect(isArquivoPdf('PROJETO_EXECUTIVO.PDF')).toBe(true)
    expect(isArquivoPdf('foto.png')).toBe(false)
    expect(isArquivoPdf('')).toBe(false)
  })

  it('deve montar a URL do arquivo no PocketBase', () => {
    const docMock = {
      id: 'doc123',
      collectionId: 'col_docs_usina',
      arquivo: 'meu_arquivo_abc.pdf',
    }
    const url = getDocumentoUsinaFileUrl(docMock)
    expect(url).toContain('meu_arquivo_abc.pdf')
    expect(url).toContain('doc123')
  })
})
