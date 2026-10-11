import React, { useEffect, useRef, useState } from 'react'
import {
  FileText,
  Plus,
  Eye,
  Download,
  Trash2,
  Paperclip,
  RefreshCw,
  FolderOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/formatters'
import type { DocumentoContratoOMCategoria, DocumentoContratoOMRegistro } from '@/types/crm'
import {
  fetchDocumentosContratoOM,
  uploadDocumentoContratoOM,
  deleteDocumentoContratoOM,
  getDocumentoContratoOMFileUrl,
} from '@/services/documentosContratoOMService'

interface ItemParaClassificar {
  id: string
  file: File
  categoria: DocumentoContratoOMCategoria
}

interface BlocoDocumentosContratoOMProps {
  contratoId: string
  clienteNome?: string
}

const CATEGORIAS_CONTRATO_OM: DocumentoContratoOMCategoria[] = [
  'Procuração assinada',
  'Contrato assinado',
  'Outros',
]

export const BlocoDocumentosContratoOM: React.FC<BlocoDocumentosContratoOMProps> = ({
  contratoId,
  clienteNome,
}) => {
  const [documentos, setDocumentos] = useState<DocumentoContratoOMRegistro[]>([])
  const [carregando, setCarregando] = useState(false)

  // Upload modal states
  const [uploadModalAberto, setUploadModalAberto] = useState(false)
  const [arquivosParaClassificar, setArquivosParaClassificar] = useState<ItemParaClassificar[]>([])
  const [uploadSalvando, setUploadSalvando] = useState(false)
  const inputManualRef = useRef<HTMLInputElement | null>(null)

  // Exclusão modal state
  const [docParaExcluir, setDocParaExcluir] = useState<DocumentoContratoOMRegistro | null>(null)
  const [removendoDoc, setRemovendoDoc] = useState(false)

  const carregarDocumentos = async () => {
    if (!contratoId) return
    setCarregando(true)
    try {
      const docs = await fetchDocumentosContratoOM(contratoId)
      setDocumentos(docs)
    } catch (err) {
      console.error('Erro ao buscar documentos do contrato O&M:', err)
      toast.error('Erro ao carregar documentos do contrato.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDocumentos()
  }, [contratoId])

  const handleSalvarUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!arquivosParaClassificar || arquivosParaClassificar.length === 0) {
      toast.warning('Selecione ao menos um arquivo para upload.')
      return
    }

    setUploadSalvando(true)
    let sucessos = 0
    let falhas = 0

    try {
      for (const item of arquivosParaClassificar) {
        try {
          await uploadDocumentoContratoOM({
            contrato_id: contratoId,
            arquivo: item.file,
            nome_original: item.file.name,
            categoria: item.categoria,
            tamanho: item.file.size,
            ativo: true,
          })
          sucessos++
        } catch (itemErr) {
          console.error(`Erro ao enviar arquivo "${item.file.name}":`, itemErr)
          falhas++
        }
      }

      if (sucessos > 0) {
        if (falhas === 0) {
          if (sucessos === 1) {
            toast.success(
              `Documento "${arquivosParaClassificar[0].file.name}" anexado com sucesso!`,
            )
          } else {
            toast.success(`${sucessos} documentos anexados com sucesso!`)
          }
        } else {
          toast.warning(
            `${sucessos} documento(s) salvo(s) com sucesso, mas ${falhas} arquivo(s) falharam.`,
          )
        }
        await carregarDocumentos()
        setUploadModalAberto(false)
        setArquivosParaClassificar([])
      } else {
        toast.error('Nenhum documento pôde ser processado. Tente novamente.')
      }
    } catch (err) {
      console.error('Erro ao salvar documentos do contrato:', err)
      toast.error('Erro ao anexar documento(s).')
    } finally {
      setUploadSalvando(false)
    }
  }

  const handleConfirmarExcluirDoc = async () => {
    if (!docParaExcluir) return
    setRemovendoDoc(true)
    try {
      await deleteDocumentoContratoOM(docParaExcluir.id)
      toast.success(
        `Documento "${docParaExcluir.nome_original || 'documento'}" removido com sucesso.`,
      )
      setDocParaExcluir(null)
      await carregarDocumentos()
    } catch (err) {
      console.error('Erro ao excluir documento do contrato:', err)
      toast.error('Erro ao excluir documento.')
    } finally {
      setRemovendoDoc(false)
    }
  }

  const getCategoriaBadgeStyle = (cat?: DocumentoContratoOMCategoria) => {
    switch (cat) {
      case 'Procuração assinada':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300'
      case 'Contrato assinado':
        return 'bg-blue-50 text-blue-800 border-blue-300'
      default:
        return 'bg-amber-50 text-amber-800 border-amber-300'
    }
  }

  return (
    <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
      {/* Cabeçalho do Bloco */}
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
            <FolderOpen className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900">Documentos do Contrato</h4>
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 bg-slate-50 text-slate-600 border-slate-200"
              >
                {documentos.length} {documentos.length === 1 ? 'arquivo' : 'arquivos'}
              </Badge>
            </div>
            <p className="text-[11px] text-gray-500">
              Anexe procurações, contratos assinados e outros documentos vinculados a este contrato
              O&M.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setUploadModalAberto(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer"
          title="Anexar documentos ao contrato"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Anexar documentos</span>
        </button>
      </div>

      {/* Listagem compacta */}
      {carregando ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Carregando documentos...</span>
        </div>
      ) : documentos.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-1">
          <FileText className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700">Nenhum documento anexado ainda.</p>
          <p className="text-[11px] text-slate-400">
            Clique em "Anexar documentos" para fazer upload de procurações ou contratos assinados.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {documentos.map((doc) => {
            const url = getDocumentoContratoOMFileUrl(doc)
            const nomeExibido = doc.nome_original || doc.arquivo || 'documento'
            const cat = (doc.categoria || 'Outros') as DocumentoContratoOMCategoria

            return (
              <div
                key={doc.id}
                className="px-2.5 py-1 bg-slate-50/70 hover:bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2 transition-colors text-xs min-h-[32px]"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span
                    className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs shrink-0"
                    title={nomeExibido}
                  >
                    {nomeExibido}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 font-semibold border shrink-0 ${getCategoriaBadgeStyle(cat)}`}
                  >
                    {cat}
                  </Badge>
                  {doc.created && (
                    <span className="text-[10px] text-slate-400 shrink-0 hidden md:inline">
                      {formatDate(doc.created)}
                    </span>
                  )}
                  {doc.tamanho && doc.tamanho > 0 && (
                    <span className="text-[10px] text-slate-400 shrink-0 hidden lg:inline">
                      • {(doc.tamanho / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {url ? (
                    <div className="contents">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-200 transition-colors shadow-2xs"
                        title="Visualizar documento em nova aba"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span className="hidden sm:inline">Visualizar</span>
                      </a>

                      <a
                        href={url}
                        download={nomeExibido}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-200 transition-colors shadow-2xs"
                        title="Baixar arquivo"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span className="hidden sm:inline">Download</span>
                      </a>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Sem URL</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setDocParaExcluir(doc)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                    title="Excluir documento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Dialog
        open={Boolean(docParaExcluir)}
        onOpenChange={(val) => !val && setDocParaExcluir(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              Confirmar Exclusão do Documento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tem certeza que deseja remover o documento{' '}
              <strong>"{docParaExcluir?.nome_original || docParaExcluir?.arquivo}"</strong> do
              contrato O&M?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 text-xs text-red-800">
            Esta ação não poderá ser desfeita. O documento deixará de aparecer na lista de
            documentos do contrato.
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={removendoDoc}
              onClick={() => setDocParaExcluir(null)}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={removendoDoc}
              onClick={handleConfirmarExcluirDoc}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {removendoDoc ? (
                <div className="contents">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Removendo...</span>
                </div>
              ) : (
                <span>Sim, Excluir Documento</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Anexar Documentos com Classificação Individual */}
      <Dialog
        open={uploadModalAberto}
        onOpenChange={(val) => {
          setUploadModalAberto(val)
          if (!val) {
            setArquivosParaClassificar([])
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-blue-600" />
              Anexar Documentos ao Contrato
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione um ou mais arquivos e classifique cada documento
              {clienteNome ? ` do cliente ${clienteNome}` : ''}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarUpload} className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Selecionar Arquivo(s) (PDF, Imagem, Word) *
              </label>
              <input
                ref={inputManualRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : []
                  if (files.length > 0) {
                    const novosItens: ItemParaClassificar[] = files.map((file, idx) => ({
                      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                      file,
                      categoria: 'Outros' as DocumentoContratoOMCategoria,
                    }))
                    setArquivosParaClassificar((prev) => [...prev, ...novosItens])
                    if (inputManualRef.current) {
                      inputManualRef.current.value = ''
                    }
                  }
                }}
                className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-xl p-1.5 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Dica: Você pode selecionar vários arquivos de uma vez.
              </p>
            </div>

            {/* Fila de arquivos para envio */}
            {arquivosParaClassificar.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase">
                  <span>Arquivos para envio ({arquivosParaClassificar.length})</span>
                  <span className="text-slate-400 font-normal">Classifique cada arquivo</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {arquivosParaClassificar.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-semibold text-slate-800 truncate text-[11px]"
                            title={item.file.name}
                          >
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(item.file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={item.categoria}
                          onChange={(e) => {
                            const novaCat = e.target.value as DocumentoContratoOMCategoria
                            setArquivosParaClassificar((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, categoria: novaCat } : it)),
                            )
                          }}
                          className="text-[11px] font-medium px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {CATEGORIAS_CONTRATO_OM.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setArquivosParaClassificar((prev) => prev.filter((_, i) => i !== idx))
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Remover arquivo da fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUploadModalAberto(false)
                  setArquivosParaClassificar([])
                }}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploadSalvando || arquivosParaClassificar.length === 0}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {uploadSalvando ? (
                  <div className="contents">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Salvando...</span>
                  </div>
                ) : (
                  <span>
                    Salvar{' '}
                    {arquivosParaClassificar.length > 1
                      ? `Todos (${arquivosParaClassificar.length})`
                      : 'Documento'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
