import pb from '@/lib/pocketbase/client'
import type { DocumentoUsinaRegistro } from '@/types/crm'

export interface UploadDocumentoUsinaPayload {
  usina_id: string
  arquivo: File
  nome_original?: string
  descricao?: string
  ativo?: boolean
}

/**
 * Busca todos os documentos ativos vinculados a uma usina
 */
export async function fetchDocumentosUsina(usinaId: string): Promise<DocumentoUsinaRegistro[]> {
  if (!usinaId) return []
  try {
    return await pb.collection('documentos_usina').getFullList<DocumentoUsinaRegistro>({
      filter: `usina_id = "${usinaId}" && ativo != false`,
      sort: '-created',
      expand: 'usina_id',
    })
  } catch (err) {
    console.error(`Erro ao buscar documentos da usina ${usinaId}:`, err)
    return []
  }
}

/**
 * Faz upload de um único documento para a usina
 */
export async function uploadDocumentoUsina(
  payload: UploadDocumentoUsinaPayload,
): Promise<DocumentoUsinaRegistro> {
  const formData = new FormData()
  formData.append('usina_id', payload.usina_id)
  formData.append('arquivo', payload.arquivo)
  formData.append('nome_original', payload.nome_original || payload.arquivo.name)
  formData.append('descricao', payload.descricao ? payload.descricao.trim() : '')
  formData.append('ativo', String(payload.ativo !== undefined ? payload.ativo : true))

  return await pb.collection('documentos_usina').create<DocumentoUsinaRegistro>(formData)
}

/**
 * Faz upload múltiplo de arquivos em paralelo ou sequência para uma usina
 */
export async function uploadMultiplosDocumentosUsina(
  usinaId: string,
  arquivos: { file: File; descricao?: string }[],
): Promise<DocumentoUsinaRegistro[]> {
  if (!usinaId || arquivos.length === 0) return []

  const resultados: DocumentoUsinaRegistro[] = []
  for (const item of arquivos) {
    try {
      const doc = await uploadDocumentoUsina({
        usina_id: usinaId,
        arquivo: item.file,
        nome_original: item.file.name,
        descricao: item.descricao || '',
        ativo: true,
      })
      resultados.push(doc)
    } catch (err) {
      console.error(`Erro ao enviar arquivo ${item.file.name} para usina ${usinaId}:`, err)
      throw err
    }
  }
  return resultados
}

/**
 * Atualiza campos de um documento da usina (ex: descrição ou status ativo)
 */
export async function updateDocumentoUsina(
  id: string,
  dados: {
    descricao?: string
    nome_original?: string
    ativo?: boolean
  },
): Promise<DocumentoUsinaRegistro> {
  const payload: Record<string, any> = {}
  if (dados.descricao !== undefined) payload.descricao = dados.descricao.trim()
  if (dados.nome_original !== undefined) payload.nome_original = dados.nome_original.trim()
  if (dados.ativo !== undefined) payload.ativo = dados.ativo

  return await pb.collection('documentos_usina').update<DocumentoUsinaRegistro>(id, payload)
}

/**
 * Exclui um documento da usina pelo ID
 */
export async function deleteDocumentoUsina(id: string): Promise<boolean> {
  await pb.collection('documentos_usina').delete(id)
  return true
}

/**
 * Retorna a URL pública ou autenticada de download/visualização do arquivo no PocketBase
 */
export function getDocumentoUsinaFileUrl(
  doc: Pick<DocumentoUsinaRegistro, 'arquivo' | 'collectionId' | 'id'>,
  thumb?: string,
): string {
  if (!doc || !doc.arquivo) return ''
  return pb.files.getURL(doc as any, doc.arquivo, thumb ? { thumb } : undefined)
}

/**
 * Detecta se o arquivo é imagem com base no nome original ou extensão do arquivo
 */
export function isArquivoImagem(nome?: string): boolean {
  if (!nome) return false
  return /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(nome)
}

/**
 * Detecta se o arquivo é PDF com base no nome original ou extensão do arquivo
 */
export function isArquivoPdf(nome?: string): boolean {
  if (!nome) return false
  return /\.pdf$/i.test(nome)
}
