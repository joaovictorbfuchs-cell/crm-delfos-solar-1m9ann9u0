import pb from '@/lib/pocketbase/client'
import { prepareDocumentForExtraction, readFileAsBase64 } from '@/lib/documentExtractor'

export interface KnowledgeCategory {
  id: string
  titulo: string
  descricao?: string
  icone?: string
  ordem?: number
  created?: string
  updated?: string
  artigos_count?: number
}

export interface KnowledgeArticle {
  id: string
  categoria_id: string
  titulo: string
  conteudo: string
  texto_extraido?: string
  anexos?: string[]
  criado_por?: string
  autor_nome?: string
  tags?: string
  created: string
  updated?: string
  expand?: {
    categoria_id?: KnowledgeCategory
    criado_por?: {
      id: string
      name?: string
      email?: string
    }
  }
}

export interface AssistenteDelfosResposta {
  ok: boolean
  resposta: string
  encontrado: boolean
  categoria_origem?: string | null
  artigos_utilizados?: Array<{ id: string; titulo: string; categoria: string }>
  model_used?: string
  error?: string
}

export interface AssistenteMensagem {
  id: string
  remetente: 'user' | 'assistente'
  texto: string
  horario: string
  categoriaOrigem?: string | null
  artigosUtilizados?: Array<{ id: string; titulo: string; categoria: string }>
  erro?: boolean
}

/**
 * Lista todas as categorias da base de conhecimento
 */
export async function listarCategorias(): Promise<KnowledgeCategory[]> {
  try {
    const records = await pb.collection('knowledge_categories').getFullList<KnowledgeCategory>({
      sort: 'ordem,created',
    })

    // Contar artigos por categoria
    try {
      const articles = await pb
        .collection('knowledge_articles')
        .getFullList<{ id: string; categoria_id: string }>({
          fields: 'id,categoria_id',
        })
      const counts: Record<string, number> = {}
      if (Array.isArray(articles)) {
        for (const a of articles) {
          if (a && a.categoria_id) {
            counts[a.categoria_id] = (counts[a.categoria_id] || 0) + 1
          }
        }
      }
      return records.map((c) => ({
        ...c,
        artigos_count: counts[c.id] || 0,
      }))
    } catch {
      return Array.isArray(records) ? records : []
    }
  } catch (err) {
    console.warn('[knowledgeBaseService] Erro ao listar categorias:', err)
    return []
  }
}

/**
 * Cria nova categoria (apenas administradores)
 */
export async function criarCategoria(dados: {
  titulo: string
  descricao?: string
  icone?: string
  ordem?: number
}): Promise<KnowledgeCategory> {
  const record = await pb.collection('knowledge_categories').create<KnowledgeCategory>(dados)
  return record
}

/**
 * Atualiza categoria (apenas administradores)
 */
export async function atualizarCategoria(
  id: string,
  dados: {
    titulo?: string
    descricao?: string
    icone?: string
    ordem?: number
  },
): Promise<KnowledgeCategory> {
  const record = await pb.collection('knowledge_categories').update<KnowledgeCategory>(id, dados)
  return record
}

/**
 * Exclui categoria (apenas administradores)
 */
export async function excluirCategoria(id: string): Promise<boolean> {
  return await pb.collection('knowledge_categories').delete(id)
}

/**
 * Lista artigos com filtro opcional por categoria ou termo de busca
 */
export async function listarArtigos(options?: {
  categoriaId?: string
  busca?: string
}): Promise<KnowledgeArticle[]> {
  try {
    const filters: string[] = []
    if (options?.categoriaId) {
      filters.push(`categoria_id = '${options.categoriaId}'`)
    }
    if (options?.busca && options.busca.trim()) {
      const q = options.busca.trim().replace(/['"\\]/g, '')
      filters.push(
        `(titulo ~ '${q}' || conteudo ~ '${q}' || tags ~ '${q}' || texto_extraido ~ '${q}')`,
      )
    }

    const records = await pb.collection('knowledge_articles').getFullList<KnowledgeArticle>({
      filter: filters.length > 0 ? filters.join(' && ') : '',
      sort: '-created',
      expand: 'categoria_id,criado_por',
    })

    return records
  } catch (err) {
    console.warn('[knowledgeBaseService] Erro ao listar artigos:', err)
    return []
  }
}

/**
 * Obtém artigo por id
 */
export async function obterArtigoPorId(id: string): Promise<KnowledgeArticle | null> {
  try {
    const record = await pb.collection('knowledge_articles').getOne<KnowledgeArticle>(id, {
      expand: 'categoria_id,criado_por',
    })
    return record
  } catch {
    return null
  }
}

/**
 * Extrai texto de anexos (PDFs, Word, Imagens) para indexar e consultar com o Assistente
 */
export async function processarTextoDeArquivos(
  files: File[],
  onProgresso?: (msg: string) => void,
  onAviso?: (msg: string) => void,
): Promise<string> {
  if (!files || !Array.isArray(files) || files.length === 0) return ''

  const trechos: string[] = []
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const token = pb.authStore.token

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (!f || !f.name) continue

    onProgresso?.(`Processando anexo [${i + 1}/${files.length}]: ${f.name}...`)

    try {
      // 1. Tentar ler e preparar documento no client com proteção total
      let prep: any = null
      try {
        prep = await prepareDocumentForExtraction(f)
      } catch (errPrep) {
        console.warn(
          `[knowledgeBaseService] Falha ao ler documento localmente (${f.name}):`,
          errPrep,
        )
        onAviso?.(`Não foi possível ler o texto de "${f.name}". O arquivo será salvo normalmente.`)
      }

      const mimeType = f.type || prep?.mimeType || 'application/octet-stream'
      let b64 = prep?.imageBase64 || ''

      // Se não tiver base64 e for imagem ou pdf, tenta ler com fallback seguro
      if (!b64 && (mimeType.startsWith('image/') || f.name.toLowerCase().endsWith('.pdf'))) {
        try {
          b64 = await readFileAsBase64(f)
        } catch {
          /* intentionally ignored */
        }
      }

      // Se já temos texto extraído de alta qualidade no client (pdf ou docx)
      if (
        prep?.textContent &&
        typeof prep.textContent === 'string' &&
        prep.textContent.trim().length > 30
      ) {
        trechos.push(`[Arquivo: ${f.name}]\n${prep.textContent.trim()}`)
        continue
      }

      // Se não há baseUrl ou endpoint indisponível, continua sem falhar
      if (!baseUrl) {
        continue
      }

      // Envia ao backend para extração e OCR com Gemini Vision caso haja payload
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 40000)

        const res = await fetch(`${baseUrl}/backend/v1/extrair-texto-anexo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: token } : {}),
          },
          body: JSON.stringify({
            file_name: f.name,
            mime_type: mimeType,
            file_base64: b64,
            text_content: prep?.textContent || '',
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))

        if (res.ok) {
          const json = await res.json()
          if (
            json?.texto_extraido &&
            typeof json.texto_extraido === 'string' &&
            json.texto_extraido.trim()
          ) {
            trechos.push(`[Arquivo: ${f.name}]\n${json.texto_extraido.trim()}`)
          }
        }
      } catch (errFetch) {
        console.warn(
          `[knowledgeBaseService] Erro na requisição de extração de ${f.name}:`,
          errFetch,
        )
      }
    } catch (err) {
      console.warn(`[knowledgeBaseService] Erro inesperado ao extrair texto de ${f.name}:`, err)
      onAviso?.(`Texto do anexo "${f.name}" não pôde ser indexado. O anexo foi preservado.`)
    }
  }

  return trechos.join('\n\n')
}

/**
 * Cria novo artigo com upload de arquivos e texto extraído indexado
 */
export async function criarArtigo(
  dados: {
    categoria_id: string
    titulo: string
    conteudo: string
    tags?: string
    texto_extraido?: string
    anexos?: File[]
  },
  onProgresso?: (msg: string) => void,
  onAviso?: (msg: string) => void,
): Promise<KnowledgeArticle> {
  const user = pb.authStore.record
  let textoFinalExtraido = dados.texto_extraido || ''

  if (dados.anexos && dados.anexos.length > 0) {
    try {
      onProgresso?.('Extraindo texto e tabelas dos documentos anexados...')
      const textoAnexos = await processarTextoDeArquivos(dados.anexos, onProgresso, onAviso)
      if (textoAnexos) {
        textoFinalExtraido = (textoFinalExtraido ? textoFinalExtraido + '\n\n' : '') + textoAnexos
      }
    } catch (errExt) {
      console.warn(
        '[knowledgeBaseService] Falha na extração de texto, prosseguindo com upload:',
        errExt,
      )
      onAviso?.(
        'Não foi possível extrair o texto de alguns anexos, mas eles foram anexados com sucesso.',
      )
    }
  }

  const formData = new FormData()
  formData.append('categoria_id', dados.categoria_id)
  formData.append('titulo', dados.titulo)
  formData.append('conteudo', dados.conteudo)
  formData.append('tags', dados.tags || '')
  formData.append('texto_extraido', textoFinalExtraido)
  if (user?.id) {
    formData.append('criado_por', user.id)
    formData.append('autor_nome', (user.name as string) || 'Equipe Delfos')
  }

  if (dados.anexos && dados.anexos.length > 0) {
    for (const file of dados.anexos) {
      if (file && file.size > 0) {
        formData.append('anexos', file)
      }
    }
  }

  onProgresso?.('Salvando artigo na Base de Conhecimento...')
  const record = await pb.collection('knowledge_articles').create<KnowledgeArticle>(formData)
  return record
}

/**
 * Atualiza artigo existente
 */
export async function atualizarArtigo(
  id: string,
  dados: {
    categoria_id?: string
    titulo?: string
    conteudo?: string
    tags?: string
    texto_extraido?: string
    novosAnexos?: File[]
  },
  onProgresso?: (msg: string) => void,
  onAviso?: (msg: string) => void,
): Promise<KnowledgeArticle> {
  let textoFinalExtraido = dados.texto_extraido

  if (dados.novosAnexos && dados.novosAnexos.length > 0) {
    try {
      onProgresso?.('Extraindo texto dos novos anexos...')
      const textoNovos = await processarTextoDeArquivos(dados.novosAnexos, onProgresso, onAviso)
      if (textoNovos) {
        textoFinalExtraido = (textoFinalExtraido ? textoFinalExtraido + '\n\n' : '') + textoNovos
      }
    } catch (errExt) {
      console.warn('[knowledgeBaseService] Falha na extração de texto dos novos anexos:', errExt)
      onAviso?.('Não foi possível extrair o texto dos novos anexos, mas eles serão salvos.')
    }
  }

  const formData = new FormData()
  if (dados.categoria_id) formData.append('categoria_id', dados.categoria_id)
  if (dados.titulo) formData.append('titulo', dados.titulo)
  if (dados.conteudo) formData.append('conteudo', dados.conteudo)
  if (dados.tags !== undefined) formData.append('tags', dados.tags)
  if (textoFinalExtraido !== undefined) formData.append('texto_extraido', textoFinalExtraido)

  if (dados.novosAnexos && dados.novosAnexos.length > 0) {
    for (const file of dados.novosAnexos) {
      if (file && file.size > 0) {
        formData.append('anexos', file)
      }
    }
  }

  onProgresso?.('Atualizando artigo...')
  const record = await pb.collection('knowledge_articles').update<KnowledgeArticle>(id, formData)
  return record
}

/**
 * Exclui artigo
 */
export async function excluirArtigo(id: string): Promise<boolean> {
  return await pb.collection('knowledge_articles').delete(id)
}

/**
 * Retorna URL de download do anexo
 */
export function getAnexoUrl(article: KnowledgeArticle, filename: string): string {
  try {
    if (!article || !filename) return '#'
    return pb.files.getURL(article, filename)
  } catch (err) {
    console.warn('[knowledgeBaseService] Erro ao obter getAnexoUrl:', err)
    return '#'
  }
}

/**
 * Consulta o Assistente Delfos (chat com RAG nos artigos e Gemini)
 */
export async function perguntarAssistenteDelfos(params: {
  pergunta: string
  categoria_id?: string | null
}): Promise<AssistenteDelfosResposta> {
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const token = pb.authStore.token

  const res = await fetch(`${baseUrl}/backend/v1/assistente-delfos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify({
      pergunta: params.pergunta,
      categoria_id: params.categoria_id || null,
    }),
  })

  if (!res.ok) {
    let errMsg = 'Erro na comunicação com o assistente.'
    try {
      const errJson = await res.json()
      if (errJson?.error) errMsg = errJson.error
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      resposta:
        'Não encontrei essa informação na base de conhecimento. Deseja cadastrar um novo artigo sobre este tema?',
      encontrado: false,
      error: errMsg,
    }
  }

  const json = (await res.json()) as AssistenteDelfosResposta
  return json
}
