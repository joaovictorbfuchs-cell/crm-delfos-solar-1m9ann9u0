import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  FileCode2,
  Check,
  X,
  Image as ImageIcon,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { DocumentoUsinaRegistro } from '@/types/crm'
import {
  fetchDocumentosUsina,
  uploadMultiplosDocumentosUsina,
  updateDocumentoUsina,
  deleteDocumentoUsina,
  getDocumentoUsinaFileUrl,
  isArquivoImagem,
  isArquivoPdf,
} from '@/services/documentosUsinaService'

interface SecaoDocumentosUsinaProps {
  usinaId: string
  usinaNome?: string
  /**
   * Quando readOnly = true (ex.: na ficha de execução em campo da OS),
   * os botões de upload e exclusão ficam ocultos ou desabilitados,
   * permitindo que a equipe visualize e baixe os documentos.
   */
  readOnly?: boolean
  /**
   * Callback opcional disparado quando a lista de documentos é alterada
   */
  onDocumentosChanged?: (docs: DocumentoUsinaRegistro[]) => void
}

interface ItemFilaUpload {
  id: string
  file: File
  previewUrl?: string
  descricao: string
}

export const SecaoDocumentosUsina: React.FC<SecaoDocumentosUsinaProps> = ({
  usinaId,
  usinaNome = 'Usina',
  readOnly = false,
  onDocumentosChanged,
}) => {
  const [documentos, setDocumentos] = useState<DocumentoUsinaRegistro[]>([])
  const [carregando, setCarregando] = useState<boolean>(true)
  const [enviando, setEnviando] = useState<boolean>(false)

  // Fila de upload múltiplo
  const [filaUpload, setFilaUpload] = useState<ItemFilaUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Edição inline de descrição de documento salvo
  const [editandoDocId, setEditandoDocId] = useState<string | null>(null)
  const [editandoDescricao, setEditandoDescricao] = useState<string>('')
  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false)

  // Modal de exclusão com confirmação
  const [docParaExcluir, setDocParaExcluir] = useState<DocumentoUsinaRegistro | null>(null)
  const [excluindo, setExcluindo] = useState<boolean>(false)

  // Visualização lightbox simples para imagens
  const [previewImagem, setPreviewImagem] = useState<{ url: string; nome: string } | null>(null)

  // Carrega documentos da usina
  const carregarDocumentos = async () => {
    if (!usinaId) {
      setDocumentos([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    try {
      const data = await fetchDocumentosUsina(usinaId)
      setDocumentos(data)
      onDocumentosChanged?.(data)
    } catch (err) {
      console.error('Erro ao carregar documentos da usina:', err)
      toast.error('Não foi possível carregar os documentos da usina.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDocumentos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usinaId])

  // Selecionador de arquivos (upload múltiplo de imagens e PDFs)
  const handleSelecionarArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const novosItens: ItemFilaUpload[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Validação de tamanho (até 20MB por arquivo)
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`O arquivo "${file.name}" excede o limite máximo de 20MB.`)
        continue
      }

      const ehImagem = isArquivoImagem(file.name) || file.type.startsWith('image/')
      const previewUrl = ehImagem ? URL.createObjectURL(file) : undefined

      novosItens.push({
        id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`,
        file,
        previewUrl,
        descricao: '',
      })
    }

    if (novosItens.length > 0) {
      setFilaUpload((prev) => [...prev, ...novosItens])
      toast.info(
        `${novosItens.length} arquivo(s) selecionado(s). Preencha a descrição de cada um e clique em "Enviar Documentos".`,
      )
    }

    // Limpa o input para permitir selecionar os mesmos arquivos novamente se quiser
    e.target.value = ''
  }

  const handleRemoverItemFila = (id: string) => {
    setFilaUpload((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
      return prev.filter((i) => i.id !== id)
    })
  }

  const handleAtualizarDescricaoFila = (id: string, descricao: string) => {
    setFilaUpload((prev) => prev.map((item) => (item.id === id ? { ...item, descricao } : item)))
  }

  // Ação de upload em lote de todos os arquivos da fila
  const handleEnviarFila = async () => {
    if (!usinaId) {
      toast.warning('Usina não identificada para o upload.')
      return
    }
    if (filaUpload.length === 0) {
      toast.warning('Nenhum arquivo na fila de envio.')
      return
    }

    setEnviando(true)
    try {
      const payload = filaUpload.map((item) => ({
        file: item.file,
        descricao: item.descricao,
      }))

      const salvos = await uploadMultiplosDocumentosUsina(usinaId, payload)

      // Libera as previews de memória
      filaUpload.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
      setFilaUpload([])

      toast.success(
        `${salvos.length} ${salvos.length === 1 ? 'documento salvo' : 'documentos salvos'} com sucesso!`,
      )
      await carregarDocumentos()
    } catch (err) {
      console.error('Erro ao enviar documentos:', err)
      toast.error('Ocorreu um erro ao enviar os documentos. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // Iniciar edição inline de descrição
  const handleIniciarEdicaoDescricao = (doc: DocumentoUsinaRegistro) => {
    if (readOnly) return
    setEditandoDocId(doc.id)
    setEditandoDescricao(doc.descricao || '')
  }

  // Salvar edição inline
  const handleSalvarEdicaoDescricao = async (docId: string) => {
    setSalvandoEdicao(true)
    try {
      await updateDocumentoUsina(docId, {
        descricao: editandoDescricao,
      })
      toast.success('Descrição atualizada com sucesso.')
      setEditandoDocId(null)
      setEditandoDescricao('')
      await carregarDocumentos()
    } catch (err) {
      console.error('Erro ao atualizar descrição:', err)
      toast.error('Não foi possível salvar a descrição.')
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // Cancelar edição inline
  const handleCancelarEdicaoDescricao = () => {
    setEditandoDocId(null)
    setEditandoDescricao('')
  }

  // Excluir documento
  const handleConfirmarExclusao = async () => {
    if (!docParaExcluir) return
    setExcluindo(true)
    try {
      await deleteDocumentoUsina(docParaExcluir.id)
      toast.success('Documento excluído com sucesso.')
      setDocParaExcluir(null)
      await carregarDocumentos()
    } catch (err) {
      console.error('Erro ao excluir documento:', err)
      toast.error('Erro ao excluir documento.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/40 shadow-xs space-y-4">
      {/* Cabeçalho no padrão visual Delfos Solar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 border-b border-emerald-200/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0F2038] text-[#16A34A] shadow-xs">
            <FileText className="w-5 h-5 text-[#4ade80]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#0F2038] uppercase tracking-wider">
                Documentos da Usina
              </span>
              <Badge
                variant="outline"
                className="bg-white text-emerald-800 text-[11px] font-bold border-emerald-300 shadow-2xs"
              >
                {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Fotos da instalação, laudos, projetos executivos, medições, comprovantes e ARTs da
              usina "{usinaNome}".
            </p>
          </div>
        </div>

        {/* Botão de Upload Múltiplo (Apenas em modo edição) */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleSelecionarArquivos}
            />

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs shadow-2xs h-8 px-3 rounded-lg flex items-center gap-1.5 transition-transform active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5 text-white" />
              <span>Upload de Arquivos</span>
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FILA DE ARQUIVOS SELECIONADOS PARA UPLOAD (Com campo de descrição ao lado)*/}
      {/* ========================================================================= */}
      {!readOnly && filaUpload.length > 0 && (
        <div className="p-3.5 bg-white rounded-xl border border-emerald-300 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0F2038] uppercase tracking-wider">
                Arquivos Selecionados para Envio ({filaUpload.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Informe a descrição de cada documento antes de enviar
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              disabled={enviando}
              onClick={handleEnviarFila}
              className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold text-xs h-7 px-3 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {enviando ? (
                <div className="contents">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#4ade80]" />
                  <span>Enviando {filaUpload.length} arquivo(s)...</span>
                </div>
              ) : (
                <div className="contents">
                  <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Enviar Todos</span>
                </div>
              )}
            </Button>
          </div>

          <div className="space-y-2.5">
            {filaUpload.map((item, idx) => {
              const ehImg = Boolean(item.previewUrl)
              const tamanhoKb = (item.file.size / 1024).toFixed(0)

              return (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Thumbnail / Ícone + Nome do Arquivo */}
                  <div className="flex items-center gap-2.5 min-w-0 sm:w-1/3">
                    <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                      {ehImg ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-6 h-6 text-rose-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {ehImg ? 'Foto / Imagem' : 'Documento PDF'} • {tamanhoKb} KB
                      </p>
                    </div>
                  </div>

                  {/* Campo de Descrição ao lado do arquivo */}
                  <div className="flex-1 w-full sm:w-auto">
                    <Input
                      type="text"
                      value={item.descricao}
                      placeholder="Do que se trata? (ex: laudo, projeto, medição, comprovante, foto da instalação...)"
                      onChange={(e) => handleAtualizarDescricaoFila(item.id, e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  {/* Ação de remover da fila antes do upload */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => handleRemoverItemFila(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remover arquivo da seleção"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LISTA DE DOCUMENTOS SALVOS E VISÍVEIS                                      */}
      {/* ========================================================================= */}
      {carregando ? (
        <div className="py-8 text-center text-xs text-emerald-800 flex items-center justify-center gap-2 bg-white rounded-xl border border-dashed border-emerald-300">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Carregando documentos da usina...</span>
        </div>
      ) : documentos.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 bg-white/70 rounded-xl border border-dashed border-slate-200 space-y-1.5 p-4">
          <FileText className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-700">Nenhum documento salvo para esta usina ainda.</p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            {readOnly
              ? 'Nenhum laudo, projeto, medição ou foto foi anexado à usina até o momento.'
              : 'Clique no botão "Upload de Arquivos" acima para enviar vários arquivos de uma vez (fotos e PDFs) e informar a descrição de cada um.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => {
            const ehImg = isArquivoImagem(doc.nome_original || doc.arquivo)
            const ehPdf = isArquivoPdf(doc.nome_original || doc.arquivo)
            const urlArquivo = getDocumentoUsinaFileUrl(doc)
            const urlThumb = ehImg ? getDocumentoUsinaFileUrl(doc, '100x100') : ''
            const estaEditando = editandoDocId === doc.id
            const nomeExibicao = doc.nome_original || doc.arquivo || 'Documento da Usina'

            return (
              <div
                key={doc.id}
                className="p-3 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors shadow-2xs"
              >
                {/* Thumbnail / Ícone do arquivo + Nome original */}
                <div className="flex items-center gap-3 min-w-0 md:w-1/3">
                  <div
                    onClick={() => {
                      if (ehImg && urlArquivo) {
                        setPreviewImagem({ url: urlArquivo, nome: nomeExibicao })
                      }
                    }}
                    className={`w-11 h-11 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs ${
                      ehImg ? 'cursor-pointer hover:opacity-90' : ''
                    }`}
                    title={ehImg ? 'Clique para ampliar imagem' : 'Arquivo PDF'}
                  >
                    {ehImg ? (
                      <img
                        src={urlThumb || urlArquivo}
                        alt={nomeExibicao}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-5 h-5 text-rose-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="font-bold text-slate-900 text-xs truncate max-w-sm"
                      title={nomeExibicao}
                    >
                      {nomeExibicao}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-semibold ${
                          ehImg
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : ehPdf
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {ehImg ? 'Foto / Imagem' : ehPdf ? 'PDF' : 'Arquivo'}
                      </Badge>
                      {doc.created && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(doc.created).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Campo de Descrição (Visualização ou Edição Inline) */}
                <div className="flex-1 w-full md:w-auto px-1">
                  {estaEditando ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="text"
                        autoFocus
                        value={editandoDescricao}
                        onChange={(e) => setEditandoDescricao(e.target.value)}
                        placeholder="Informe a descrição (ex: laudo, projeto, medição...)"
                        className="text-xs h-7 bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSalvarEdicaoDescricao(doc.id)
                          if (e.key === 'Escape') handleCancelarEdicaoDescricao()
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={salvandoEdicao}
                        onClick={() => handleSalvarEdicaoDescricao(doc.id)}
                        className="h-7 px-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shrink-0"
                      >
                        {salvandoEdicao ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={salvandoEdicao}
                        onClick={handleCancelarEdicaoDescricao}
                        className="h-7 px-2 text-slate-500 hover:text-slate-700 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleIniciarEdicaoDescricao(doc)}
                      className={`text-xs rounded-lg px-2.5 py-1.5 border transition-colors ${
                        !readOnly
                          ? 'cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/40'
                          : ''
                      } ${
                        doc.descricao && doc.descricao.trim()
                          ? 'bg-slate-50/70 border-slate-200 text-slate-800'
                          : 'bg-slate-50/40 border-dashed border-slate-200 text-slate-400 italic'
                      }`}
                      title={!readOnly ? 'Clique para editar a descrição' : undefined}
                    >
                      {doc.descricao && doc.descricao.trim() ? (
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{doc.descricao}</span>
                          {!readOnly && (
                            <span className="text-[10px] text-slate-400 shrink-0 font-normal ml-1">
                              (editar)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span>
                          {readOnly
                            ? 'Sem descrição informada'
                            : '+ Adicionar descrição (laudo, projeto, medição, foto...)'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Ações: Visualizar/Abrir, Download e Excluir */}
                <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                  {/* Abrir / Visualizar */}
                  {urlArquivo && (
                    <div className="contents">
                      {ehImg ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewImagem({ url: urlArquivo, nome: nomeExibicao })}
                          className="h-7 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 border-slate-200"
                          title="Visualizar imagem"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Visualizar</span>
                        </Button>
                      ) : (
                        <a
                          href={urlArquivo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 h-7 px-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors shadow-2xs"
                          title="Abrir PDF em nova aba"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Visualizar</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                        </a>
                      )}

                      {/* Download */}
                      <a
                        href={urlArquivo}
                        download={nomeExibicao}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 h-7 px-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors shadow-2xs"
                        title="Baixar arquivo"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Baixar</span>
                      </a>
                    </div>
                  )}

                  {/* Excluir (apenas quando não é readOnly) */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setDocParaExcluir(doc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Excluir documento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL LIGHTBOX DE VISUALIZAÇÃO DE IMAGEM                                  */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(previewImagem)}
        onOpenChange={(aberto) => !aberto && setPreviewImagem(null)}
      >
        <DialogContent className="max-w-3xl p-3 sm:p-4 bg-slate-900 border-slate-800 text-white">
          <DialogHeader className="pb-2 border-b border-slate-800">
            <DialogTitle className="text-sm font-bold text-white flex items-center justify-between">
              <span className="truncate">{previewImagem?.nome || 'Imagem da Usina'}</span>
            </DialogTitle>
          </DialogHeader>

          {previewImagem && (
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center p-2 bg-black/50 rounded-xl">
              <img
                src={previewImagem.url}
                alt={previewImagem.nome}
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Visualização inline</span>
            {previewImagem && (
              <a
                href={previewImagem.url}
                download={previewImagem.nome}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar arquivo original</span>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE DOCUMENTO                             */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(docParaExcluir)}
        onOpenChange={(aberto) => !aberto && setDocParaExcluir(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Confirmar Exclusão de Documento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Deseja realmente remover o documento{' '}
              <strong>"{docParaExcluir?.nome_original || docParaExcluir?.arquivo}"</strong> da usina{' '}
              <strong>"{usinaNome}"</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
            Esta ação não poderá ser desfeita. O documento deixará de aparecer na usina e nas ordens
            de serviço em campo.
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={excluindo}
              onClick={() => setDocParaExcluir(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={excluindo}
              onClick={handleConfirmarExclusao}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              {excluindo ? (
                <div className="contents">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Excluindo...</span>
                </div>
              ) : (
                <div className="contents">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Excluir Documento</span>
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
