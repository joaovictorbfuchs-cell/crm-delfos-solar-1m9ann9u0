import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Image as ImageIcon,
  Video,
  FileText,
  Upload,
  X,
  AlertCircle,
  FileCheck,
  Send,
  Loader2,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export type TipoMidiaEnvio = 'imagem' | 'video' | 'documento'

interface ModalEnviarMidiaWhatsAppProps {
  isOpen: boolean
  onClose: () => void
  tipoInicial?: TipoMidiaEnvio
  telefoneDestino: string
  clienteId?: string
  conversaId?: string
  clienteNome?: string
}

export const ModalEnviarMidiaWhatsApp: React.FC<ModalEnviarMidiaWhatsAppProps> = ({
  isOpen,
  onClose,
  tipoInicial = 'imagem',
  telefoneDestino,
  clienteId,
  conversaId,
  clienteNome,
}) => {
  const { sendWhatsAppImageMessage, sendWhatsAppVideoMessage, sendWhatsAppDocument } = useClientes()
  const { toast } = useToast()

  const [tipoMidia, setTipoMidia] = useState<TipoMidiaEnvio>(tipoInicial)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [legenda, setLegenda] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Sincroniza o tipo inicial quando abre o modal
  useEffect(() => {
    if (isOpen) {
      setTipoMidia(tipoInicial)
      setErroEnvio(null)
    } else {
      setSelectedFile(null)
      if (filePreview && filePreview.startsWith('blob:')) {
        URL.revokeObjectURL(filePreview)
      }
      setFilePreview(null)
      setLegenda('')
      setErroEnvio(null)
      setIsUploading(false)
    }
  }, [isOpen, tipoInicial])

  // Ajusta accept de arquivo por tipo
  const acceptTypes = {
    imagem: 'image/png,image/jpeg,image/jpg,image/webp,image/gif',
    video: 'video/mp4,video/3gpp,video/quicktime,video/webm',
    documento:
      '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain',
  }

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErroEnvio(null)

    // Validação de tamanho orientativa (Z-API aceita vídeos até ~16MB/30MB e documentos até ~100MB)
    if (tipoMidia === 'video' && file.size > 50 * 1024 * 1024) {
      setErroEnvio('Vídeos maiores que 50MB podem não ser suportados pelo WhatsApp/Z-API.')
    } else if (file.size > 100 * 1024 * 1024) {
      setErroEnvio('O arquivo excede o limite máximo recomendado de 100MB.')
      return
    }

    setSelectedFile(file)

    // Gerar preview para imagem e vídeo
    if (tipoMidia === 'imagem' || tipoMidia === 'video') {
      const objectUrl = URL.createObjectURL(file)
      setFilePreview(objectUrl)
    } else {
      setFilePreview(null)
    }
  }

  const handleRemoverArquivo = () => {
    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview)
    }
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleTrocarTipo = (novoTipo: TipoMidiaEnvio) => {
    if (novoTipo === tipoMidia) return
    handleRemoverArquivo()
    setTipoMidia(novoTipo)
    setErroEnvio(null)
  }

  // Converter arquivo pequeno em Base64 como garantia alternativa
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  const handleEnviar = async () => {
    if (!selectedFile) {
      setErroEnvio('Por favor, selecione um arquivo para enviar.')
      return
    }

    if (!telefoneDestino) {
      setErroEnvio('Telefone de destino não informado.')
      return
    }

    setIsUploading(true)
    setErroEnvio(null)

    try {
      // 1. Fazer upload do arquivo criando um registro na coleção 'whatsapp_mensagens'
      // Isso armazena com perfeição o arquivo no PocketBase e gera a URL pública de mídia
      const formData = new FormData()
      formData.append('arquivo', selectedFile)
      formData.append('tipo_mensagem', tipoMidia)
      formData.append('direcao', 'enviada')
      formData.append('tipo_disparo', 'manual')
      formData.append('telefone_destino', telefoneDestino)
      formData.append('nome_arquivo', selectedFile.name)
      formData.append(
        'conteudo_final',
        legenda.trim() ||
          (tipoMidia === 'imagem'
            ? '[Imagem]'
            : tipoMidia === 'video'
              ? '[Vídeo]'
              : selectedFile.name),
      )
      formData.append('status', 'enviando')
      if (clienteId) formData.append('cliente_id', clienteId)
      if (conversaId) formData.append('conversa_id', conversaId)

      let createdMsgRecord = await pb.collection('whatsapp_mensagens').create(formData)

      // Obter URL pública do arquivo armazenado no PocketBase
      const mediaPbUrl = pb.files.getURL(createdMsgRecord, createdMsgRecord.arquivo)

      // Se for imagem ou documento pequeno (< 6MB), enviar também o Base64 para máxima compatibilidade Z-API
      let base64Fallback = ''
      if (selectedFile.size <= 6 * 1024 * 1024) {
        try {
          base64Fallback = await fileToBase64(selectedFile)
        } catch {
          /* intentionally ignored */
        }
      }

      let res: {
        ok: boolean
        sent?: boolean
        status?: string
        message: string
      }

      if (tipoMidia === 'imagem') {
        res = await sendWhatsAppImageMessage({
          cliente_id: clienteId,
          conversa_id: conversaId,
          telefone_destino: telefoneDestino,
          imagem: base64Fallback || mediaPbUrl,
          imagem_url: mediaPbUrl,
          legenda: legenda.trim(),
          nome_arquivo: selectedFile.name,
          record_id: createdMsgRecord.id,
        })
      } else if (tipoMidia === 'video') {
        res = await sendWhatsAppVideoMessage({
          cliente_id: clienteId,
          conversa_id: conversaId,
          telefone_destino: telefoneDestino,
          video: mediaPbUrl || base64Fallback,
          video_url: mediaPbUrl,
          legenda: legenda.trim(),
          nome_arquivo: selectedFile.name,
          record_id: createdMsgRecord.id,
        })
      } else {
        res = await sendWhatsAppDocument({
          cliente_id: clienteId,
          conversa_id: conversaId,
          telefone_destino: telefoneDestino,
          tipo: 'documento',
          nome_arquivo: selectedFile.name,
          base64: base64Fallback,
          documento_url: mediaPbUrl,
          legenda: legenda.trim(),
          record_id: createdMsgRecord.id,
        })
      }

      if (res.sent) {
        toast({
          title: 'Mídia enviada!',
          description: `${tipoMidia === 'imagem' ? 'Imagem' : tipoMidia === 'video' ? 'Vídeo' : 'Documento'} entregue via Z-API.`,
        })
        onClose()
      } else {
        // Envio no gateway falhou, mas ficou gravado no histórico
        const warnMsg =
          res.message ||
          'Arquivo salvo no histórico, porém o envio falhou no gateway da Z-API. Verifique sua conexão e limites.'
        setErroEnvio(warnMsg)
        toast({
          title: 'Falha no gateway WhatsApp',
          description: warnMsg,
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      console.error('Erro ao enviar mídia por WhatsApp:', err)
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor'
      setErroEnvio(msg)
      toast({
        title: 'Erro no envio',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isUploading && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-xl">
        <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              {tipoMidia === 'imagem' && <ImageIcon className="w-5 h-5 text-emerald-300" />}
              {tipoMidia === 'video' && <Video className="w-5 h-5 text-emerald-300" />}
              {tipoMidia === 'documento' && <FileText className="w-5 h-5 text-emerald-300" />}
              <span>
                Enviar{' '}
                {tipoMidia === 'imagem' ? 'Imagem' : tipoMidia === 'video' ? 'Vídeo' : 'Documento'}
              </span>
            </DialogTitle>
          </div>
          <p className="text-xs text-emerald-100/90 mt-1">
            Destinatário:{' '}
            <span className="font-semibold text-white">{clienteNome || telefoneDestino}</span> (
            {telefoneDestino})
          </p>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Seletor de Tipo de Mídia */}
          <div className="flex items-center gap-2 p-1 bg-[#f0f2f5] rounded-xl border border-gray-200">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => handleTrocarTipo('imagem')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tipoMidia === 'imagem'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>Imagem</span>
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => handleTrocarTipo('video')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tipoMidia === 'video'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Video className="w-4 h-4 text-emerald-600" />
              <span>Vídeo</span>
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => handleTrocarTipo('documento')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tipoMidia === 'documento'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Documento</span>
            </button>
          </div>

          {/* Dica / limite por formato */}
          <div className="text-[11px] text-gray-500 flex items-center justify-between">
            {tipoMidia === 'imagem' && (
              <span>Formatos aceitos: JPG, PNG, WEBP, GIF. Exibição direta no chat.</span>
            )}
            {tipoMidia === 'video' && (
              <span>Formatos aceitos: MP4, 3GP, MOV (recomendado até ~16MB para WhatsApp).</span>
            )}
            {tipoMidia === 'documento' && (
              <span>Aceita PDF, DOCX, XLSX, TXT, CSV e outros documentos corporativos.</span>
            )}
          </div>

          {/* Input invisível */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes[tipoMidia]}
            onChange={handleSelectFile}
            className="hidden"
          />

          {/* Área de Seleção / Dropzone */}
          {!selectedFile ? (
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-gray-50/60 hover:bg-emerald-50/20 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-800">
                Clique para selecionar{' '}
                {tipoMidia === 'imagem'
                  ? 'uma foto'
                  : tipoMidia === 'video'
                    ? 'um vídeo'
                    : 'um documento'}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Ou arraste o arquivo até aqui</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate max-w-[240px] sm:max-w-[320px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'arquivo'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleRemoverArquivo}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Trocar arquivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview Visual */}
              {filePreview && tipoMidia === 'imagem' && (
                <div className="relative rounded-lg overflow-hidden max-h-56 bg-black/5 flex items-center justify-center border border-gray-200">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="max-h-56 w-auto object-contain rounded-lg"
                  />
                </div>
              )}

              {filePreview && tipoMidia === 'video' && (
                <div className="relative rounded-lg overflow-hidden max-h-56 bg-black flex items-center justify-center">
                  <video controls src={filePreview} className="max-h-56 w-full object-contain" />
                </div>
              )}
            </div>
          )}

          {/* Campo Legenda (Caption) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>Legenda (opcional)</span>
              <span className="text-[11px] text-gray-400">Acompanha a mídia no WhatsApp</span>
            </Label>
            <Textarea
              rows={2}
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              disabled={isUploading}
              placeholder={
                tipoMidia === 'documento'
                  ? 'Ex.: Segue a minuta contratual para análise...'
                  : 'Ex.: Segue a foto do inversor instalado...'
              }
              className="text-xs resize-none"
            />
          </div>

          {/* Feedback de Erro */}
          {erroEnvio && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Aviso de envio</span>
                <span className="text-[11px] text-rose-700">{erroEnvio}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isUploading}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleEnviar}
            disabled={!selectedFile || isUploading}
            className="bg-[#00a884] hover:bg-[#008f6f] text-white text-xs gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando mídia...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar pelo WhatsApp</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
