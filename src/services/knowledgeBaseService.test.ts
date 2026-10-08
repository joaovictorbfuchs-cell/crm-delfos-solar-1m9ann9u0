import { describe, it, expect } from 'vitest'
import {
  listarCategorias,
  listarArtigos,
  getAnexoUrl,
  truncarTextoExtraido,
  MAX_TEXTO_EXTRAIDO_LENGTH,
} from '@/services/knowledgeBaseService'
import pb from '@/lib/pocketbase/client'
import { pb as pbNamed } from '@/lib/pocketbase/client'
import { isAuthSessionError } from '@/lib/pocketbase/errors'

describe('Base de Conhecimento & Verificação Crítica Delfos CRM', () => {
  it('garante que a exportação dupla pb (default e nomeada) está presente', () => {
    expect(pb).toBeDefined()
    expect(pbNamed).toBeDefined()
    expect(pb).toBe(pbNamed)
  })

  it('garante que isAuthSessionError identifica status 401 e 403', () => {
    expect(isAuthSessionError({ status: 401 })).toBe(true)
    expect(isAuthSessionError({ status: 403 })).toBe(true)
    expect(isAuthSessionError({ statusCode: 401 })).toBe(true)
    expect(isAuthSessionError({ message: 'Token is expired' })).toBe(true)
    expect(isAuthSessionError({ status: 500, message: 'Server error' })).toBe(false)
  })

  it('monta URLs de anexos da base de conhecimento corretamente', () => {
    const artigo = {
      id: 'art-123',
      collectionId: 'col-456',
      collectionName: 'knowledge_articles',
      categoria_id: 'cat-789',
      titulo: 'Manual RGE',
      conteudo: 'Regras de fatura',
      created: '2025-01-01',
    } as any

    const url = getAnexoUrl(artigo, 'documento_norma.pdf')
    expect(url).toContain('documento_norma.pdf')
    expect(url).toContain('art-123')
  })

  it('lida graciosamente com anexos e artigos nulos ou inválidos sem estourar exceção', () => {
    expect(getAnexoUrl(null as any, '')).toBe('#')
    expect(getAnexoUrl({} as any, '')).toBe('#')
  })

  it('trunca texto_extraido que excede o limite com segurança', () => {
    expect(truncarTextoExtraido(undefined)).toBe('')
    expect(truncarTextoExtraido('')).toBe('')
    const textoCurto = 'Texto de teste curto'
    expect(truncarTextoExtraido(textoCurto)).toBe(textoCurto)

    const textoLongo = 'A'.repeat(MAX_TEXTO_EXTRAIDO_LENGTH + 5000)
    const truncado = truncarTextoExtraido(textoLongo)
    expect(truncado.length).toBe(MAX_TEXTO_EXTRAIDO_LENGTH)
  })
})
