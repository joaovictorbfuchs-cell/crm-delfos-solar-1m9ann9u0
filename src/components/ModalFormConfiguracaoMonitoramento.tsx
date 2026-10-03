import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  FileText,
  Link as LinkIcon,
  Upload,
  RefreshCw,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Video,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  ConfiguracaoMonitoramento,
  SalvarConfiguracaoMonitoramentoDados,
  TipoProcedimentoMonitoramento,
} from '@/types/equipamentos'
import {
  createConfiguracaoMonitoramento,
  updateConfiguracaoMonitoramento,
  getPdfConfiguracaoMonitoramentoUrl,
} from '@/services/configuracoesMonitoramentoService'

export interface ModalFormConfiguracaoMonitoramentoProps {
  isOpen: boolean
  onClose: () => void
  editingItem?: ConfiguracaoMonitoramento | null
  marcaSugerida?: string
  onSalvo?: (item: ConfiguracaoMonitoramento, isEdicao: boolean) => void | Promise<void>
}

export function ModalFormConfiguracaoMonitoramento({
  isOpen,
  onClose,
  editingItem = null,
  marcaSugerida = '',
  onSalvo,
}: ModalFormConfiguracaoMonitoramentoProps) {
  const [marca, setMarca] = useState<string>('')
  const [titulo, setTitulo] = useState<string>('')
  const [tipoProcedimento, setTipoProcedimento] = useState<TipoProcedimentoMonitoramento>('pdf')
  const [linkProcedimento, setLinkProcedimento] = useState<string>('')
  const [instrucoes, setInstrucoes] = useState<string>('')
  const [ativo, setAtivo] = useState<boolean>(true)

  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [pdfExistenteUrl, setPdfExistenteUrl] = useState<string | null>(null)
  const [removerPdfExistente, setRemoverPdfExistente] = useState<boolean>(false)

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return

    if (editingItem) {
      setMarca(editingItem.marca || '')
      setTitulo(editingItem.titulo || '')
      setTipoProcedimento(
        editingItem.tipo_procedimento || (editingItem.arquivo_pdf ? 'pdf' : 'link'),
      )
      setLinkProcedimento(editingItem.link_procedimento || '')
      setInstrucoes(editingItem.instrucoes || '')
      setAtivo(editingItem.ativo !== undefined ? editingItem.ativo : true)
      setSelectedPdf(null)
      setRemoverPdfExistente(false)
      const url = getPdfConfiguracaoMonitoramentoUrl(editingItem)
      setPdfExistenteUrl(url)
      setErrorMessage(null)
    } else {
      setMarca(marcaSugerida || '')
      setTitulo(marcaSugerida ? `Configuração Datalogger - ${marcaSugerida}` : '')
      setTipoProcedimento('pdf')
      setLinkProcedimento('')
      setInstrucoes('')
      setAtivo(true)
      setSelectedPdf(null)
      setPdfExistenteUrl(null)
      setRemoverPdfExistente(false)
      setErrorMessage(null)
    }
  }, [isOpen, editingItem, marcaSugerida])

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Por favor, selecione um arquivo em formato PDF.')
      return
    }

    const maxBytes = 20 * 1024 * 1024
    if (file.size > maxBytes) {
      toast.error('O arquivo PDF ultrapassa o limite de 20 MB.')
      return
    }

    setSelectedPdf(file)
    setRemoverPdfExistente(false)
    setTipoProcedimento('pdf')
    setErrorMessage(null)
  }

  const handleRemovePdf = () => {
    setSelectedPdf(null)
    setPdfExistenteUrl(null)
    setRemoverPdfExistente(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!marca.trim()) {
      setErrorMessage('Por favor, informe a marca de inversor compatível.')
      return
    }

    const temPdf = Boolean(selectedPdf || (pdfExistenteUrl && !removerPdfExistente))
    const temLink = Boolean(linkProcedimento.trim())

    if (tipoProcedimento === 'pdf' && !temPdf) {
      setErrorMessage('Por favor, selecione o arquivo PDF do passo a passo ou alterne para link.')
      return
    }

    if (tipoProcedimento === 'link' && !temLink) {
      setErrorMessage(
        'Por favor, informe o link do procedimento (ex.: vídeo de instrução, portal web ou IP).',
      )
      return
    }

    try {
      setIsSubmitting(true)

      const dados: SalvarConfiguracaoMonitoramentoDados = {
        marca: marca.trim(),
        titulo: titulo.trim() || `Configuração Datalogger - ${marca.trim()}`,
        tipo_procedimento: tipoProcedimento,
        link_procedimento:
          tipoProcedimento === 'link'
            ? linkProcedimento.trim()
            : temLink
              ? linkProcedimento.trim()
              : '',
        instrucoes: instrucoes.trim(),
        ativo,
      }

      let salvo: ConfiguracaoMonitoramento
      if (editingItem) {
        salvo = await updateConfiguracaoMonitoramento(
          editingItem.id,
          dados,
          selectedPdf || undefined,
          removerPdfExistente,
        )
        toast.success(`Configuração para "${salvo.marca}" atualizada com sucesso!`)
      } else {
        salvo = await createConfiguracaoMonitoramento(dados, selectedPdf || undefined)
        toast.success(`Configuração para "${salvo.marca}" cadastrada com sucesso!`)
      }

      if (onSalvo) {
        await onSalvo(salvo, Boolean(editingItem))
      }
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar configuração de monitoramento:', err)
      const msg = err?.message || 'Falha ao salvar configuração. Tente novamente.'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-[2px] animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Topo do Modal */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
              {editingItem ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {editingItem
                  ? 'Editar Configuração de Monitoramento'
                  : 'Nova Configuração de Monitoramento'}
              </h2>
              <p className="text-[11px] text-gray-500">
                Procedimento de configuração de datalogger por marca de inversor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Não foi possível salvar</p>
                <p className="text-red-700 mt-0.5">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Marca de Inversor */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
              Marca de Inversor Atendida *
            </label>
            <input
              type="text"
              required
              value={marca}
              onChange={(e) => {
                setMarca(e.target.value)
                if (!titulo || titulo.startsWith('Configuração Datalogger -')) {
                  setTitulo(e.target.value ? `Configuração Datalogger - ${e.target.value}` : '')
                }
              }}
              placeholder="Ex: Huawei, Growatt, Solis, Deye, Fronius, Sungrow"
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <span className="text-[10px] text-gray-500 block mt-1">
              Ao cadastrar um inversor desta marca, o sistema sugerirá esta configuração
              automaticamente.
            </span>
          </div>

          {/* Título / Identificador do Procedimento */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
              Título do Procedimento
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Procedimento Datalogger ShineWiFi - Growatt"
              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Seleção do Formato: PDF OU Link */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1.5">
              Formato do Procedimento * (PDF ou Link alternativo)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoProcedimento('pdf')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  tipoProcedimento === 'pdf'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText
                  className={`w-4 h-4 ${tipoProcedimento === 'pdf' ? 'text-emerald-600' : 'text-gray-400'}`}
                />
                <span>Upload de PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoProcedimento('link')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  tipoProcedimento === 'link'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <LinkIcon
                  className={`w-4 h-4 ${tipoProcedimento === 'link' ? 'text-blue-600' : 'text-gray-400'}`}
                />
                <span>Link Externo / Vídeo</span>
              </button>
            </div>
            <span className="text-[10px] text-gray-400 block mt-1">
              São formas alternativas: anexe um documento PDF com o passo a passo OU informe um link
              clicável.
            </span>
          </div>

          {/* Bloco PDF */}
          {tipoProcedimento === 'pdf' && (
            <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2 animate-in fade-in">
              <label className="text-[11px] font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>Arquivo PDF do Passo a Passo</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                onChange={handlePdfChange}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {selectedPdf || (pdfExistenteUrl && !removerPdfExistente)
                      ? 'Trocar Arquivo PDF'
                      : 'Selecionar Documento PDF'}
                  </span>
                </button>

                {(selectedPdf || (pdfExistenteUrl && !removerPdfExistente)) && (
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
                  >
                    Remover PDF
                  </button>
                )}

                {pdfExistenteUrl && !selectedPdf && !removerPdfExistente && (
                  <a
                    href={pdfExistenteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-300 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ver PDF Atual</span>
                  </a>
                )}
              </div>

              {selectedPdf && (
                <div className="mt-2 p-2 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-gray-800 truncate">{selectedPdf.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      ({(selectedPdf.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
              )}
            </div>
          )}

          {/* Bloco Link */}
          {tipoProcedimento === 'link' && (
            <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-2 animate-in fade-in">
              <label className="text-[11px] font-bold text-blue-950 uppercase flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-blue-700" />
                <span>Link Clicável / Vídeo de Instrução (URL) *</span>
              </label>

              <input
                type="url"
                required
                value={linkProcedimento}
                onChange={(e) => setLinkProcedimento(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://server.exemplo.com"
                className="w-full text-xs px-3 py-2 rounded-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <span className="text-[10px] text-blue-800/80 block">
                Ao clicar no item anexado no cadastro do equipamento, o link será aberto em uma nova
                aba (target _blank).
              </span>
            </div>
          )}

          {/* Instruções / Observações Técnicas */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
              Instruções resumidas / Notas do procedimento (opcional)
            </label>
            <textarea
              rows={3}
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              placeholder="Ex: Conectar na rede Wi-Fi AP gerada pelo datalogger (senha admin123) e configurar a rede local do cliente no IP 10.10.100.254..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            />
          </div>

          {/* Status Ativo */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cfg-ativo-checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
            />
            <label
              htmlFor="cfg-ativo-checkbox"
              className="text-xs font-semibold text-gray-700 select-none cursor-pointer"
            >
              Ativo para sugestão automática em cadastros de inversores
            </label>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{editingItem ? 'Salvar Alterações' : 'Cadastrar Configuração'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalFormConfiguracaoMonitoramento
