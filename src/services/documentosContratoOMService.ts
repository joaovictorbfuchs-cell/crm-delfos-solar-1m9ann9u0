import pb from '@/lib/pocketbase/client'
import type { DocumentoContratoOMCategoria, DocumentoContratoOMRegistro } from '@/types/crm'

export interface UploadDocumentoContratoOMPayload {
  contrato_id: string
  arquivo: File
  nome_original?: string
  categoria?: DocumentoContratoOMCategoria
  tamanho?: number
  ativo?: boolean
}

/**
 * Busca todos os documentos ativos vinculados a um contrato O&M
 */
export async function fetchDocumentosContratoOM(
  contratoId: string,
): Promise<DocumentoContratoOMRegistro[]> {
  if (!contratoId) return []
  try {
    return await pb.collection('documentos_contrato_om').getFullList<DocumentoContratoOMRegistro>({
      filter: `contrato_id = "${contratoId}" && ativo != false`,
      sort: '-created',
      expand: 'contrato_id',
    })
  } catch (err) {
    console.error(`Erro ao buscar documentos do contrato ${contratoId}:`, err)
    return []
  }
}

/**
 * Faz upload de um único documento para o contrato O&M
 */
export async function uploadDocumentoContratoOM(
  payload: UploadDocumentoContratoOMPayload,
): Promise<DocumentoContratoOMRegistro> {
  const formData = new FormData()
  formData.append('contrato_id', payload.contrato_id)
  formData.append('arquivo', payload.arquivo)
  formData.append('nome_original', payload.nome_original || payload.arquivo.name)
  formData.append('categoria', payload.categoria || 'Outros')
  formData.append(
    'tamanho',
    String(payload.tamanho !== undefined ? payload.tamanho : payload.arquivo.size),
  )
  formData.append('ativo', String(payload.ativo !== undefined ? payload.ativo : true))

  return await pb.collection('documentos_contrato_om').create<DocumentoContratoOMRegistro>(formData)
}

/**
 * Faz upload de múltiplos documentos para um contrato O&M
 */
export async function uploadMultiplosDocumentosContratoOM(
  contratoId: string,
  arquivos: { file: File; categoria?: DocumentoContratoOMCategoria }[],
): Promise<DocumentoContratoOMRegistro[]> {
  if (!contratoId || arquivos.length === 0) return []

  const resultados: DocumentoContratoOMRegistro[] = []
  for (const item of arquivos) {
    const doc = await uploadDocumentoContratoOM({
      contrato_id: contratoId,
      arquivo: item.file,
      nome_original: item.file.name,
      categoria: item.categoria || 'Outros',
      tamanho: item.file.size,
      ativo: true,
    })
    resultados.push(doc)
  }
  return resultados
}

/**
 * Exclui um documento do contrato O&M pelo ID
 */
export async function deleteDocumentoContratoOM(id: string): Promise<boolean> {
  await pb.collection('documentos_contrato_om').delete(id)
  return true
}

/**
 * Retorna a URL para download ou visualização do arquivo no PocketBase
 */
export function getDocumentoContratoOMFileUrl(
  doc: Pick<DocumentoContratoOMRegistro, 'arquivo' | 'collectionId' | 'id'>,
  thumb?: string,
): string {
  if (!doc || !doc.arquivo) return ''
  return pb.files.getURL(doc as any, doc.arquivo, thumb ? { thumb } : undefined)
}
