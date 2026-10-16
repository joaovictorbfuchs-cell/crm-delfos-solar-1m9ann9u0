import { describe, it, expect, vi } from 'vitest'
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

  it('lista categorias e artigos pelas coleções canônicas knowledge_categories e knowledge_articles', async () => {
    const originalCollection = pb.collection.bind(pb)
    const mockCategories = [
      { id: 'yic90bj6dns9uzy', titulo: 'Análise de Faturas', icone: 'FileSpreadsheet', ordem: 1 },
      { id: 'a0n1jaf0vnq8gmh', titulo: 'Suporte Comercial', icone: 'TrendingUp', ordem: 2 },
      { id: 'sg71ebmr3rjyqhd', titulo: 'Suporte Técnico', icone: 'Wrench', ordem: 3 },
    ]
    const mockArticles = [
      { id: 'art-1', categoria_id: 'yic90bj6dns9uzy', titulo: 'Tarifa RGE', conteudo: 'TUSD + TE' },
      { id: 'art-2', categoria_id: 'a0n1jaf0vnq8gmh', titulo: 'Vendas', conteudo: 'Objeções' },
    ]

    const spy = vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
      if (colName === 'knowledge_categories') {
        return {
          getFullList: vi.fn().mockResolvedValue(mockCategories),
        } as any
      }
      if (colName === 'knowledge_articles') {
        return {
          getFullList: vi.fn().mockImplementation((opts?: any) => {
            if (opts?.fields === 'id,categoria_id') {
              return Promise.resolve(
                mockArticles.map((a) => ({ id: a.id, categoria_id: a.categoria_id })),
              )
            }
            return Promise.resolve(mockArticles)
          }),
        } as any
      }
      return originalCollection(colName)
    })

    const cats = await listarCategorias()
    expect(cats.length).toBe(3)
    expect(cats[0].artigos_count).toBe(1)
    expect(cats[1].artigos_count).toBe(1)
    expect(cats[2].artigos_count).toBe(0)

    const arts = await listarArtigos({ categoriaId: 'yic90bj6dns9uzy' })
    expect(arts.length).toBe(2)

    spy.mockRestore()
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

  it('perguntarAssistenteDelfos retorna mensagem amigável quando backend retorna erro 400 Input too long', async () => {
    const { perguntarAssistenteDelfos } = await import('@/services/knowledgeBaseService')
    const originalFetch = globalThis.fetch

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: '400 Input too long: 1632032 input tokens, limit is 1048576 for this model',
      }),
    }) as any

    const res = await perguntarAssistenteDelfos({
      pergunta: 'Como funciona a tarifa?',
      historico: [
        { role: 'user', content: 'Mensagem antiga 1' },
        { role: 'assistant', content: 'Resposta antiga 1' },
      ],
    })

    expect(res.ok).toBe(false)
    expect(res.resposta).toContain('ultrapassaram o limite de leitura')
    expect(res.error).toContain('Input too long')

    globalThis.fetch = originalFetch
  })
})
