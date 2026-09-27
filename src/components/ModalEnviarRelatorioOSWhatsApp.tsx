import React, { useState, useEffect } from 'react'
import {
  X,
  Send,
  FileText,
  Phone,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  FileCheck,
  Wrench,
  Download,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { OrdemServico, Cliente, Sistema } from '@/types/crm'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { gerarPdfRelatorioOS } from '@/lib/relatorioOSPdf'
import pb from '@/lib/pocketbase/client'

export interface ModalEnviarRelatorioOSWhatsAppProps {
  isOpen: boolean
  onClose: () => void
  os: OrdemServico
  cliente?: Cliente
  sistema?: Sistema | null
  onSuccess?: () => void
}

export const ModalEnviarRelatorioOSWhatsApp: React.FC<ModalEnviarRelatorioOSWhatsAppProps> = ({
  isOpen,
  onClose,
  os,
  cliente = os.expand?.cliente_id,
  sistema,
  onSuccess,
}) => {
  const { sendWhatsAppDocument, updateCliente, whatsAppConfig } = useClientes()

  const [telefone, setTelefone] = useState<string>('')
  const [mensagem, setMensagem] = useState<string>('')
  const [nomeArquivo, setNomeArquivo] = useState<string>('')
  const [base64Doc, setBase64Doc] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(true)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [pdfUrlExistente, setPdfUrlExistente] = useState<string>('')
  const [feedback, setFeedback] = useState<{
    tipo: 'success' | 'warning' | 'error'
    texto: string
  } | null>(null)

  const handleSafeClose = () => {
    setIsSending(false)
    setFeedback(null)
    onClose()
  }

  // Listener para tecla Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleSafeClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const telInicial = cliente?.whatsapp || cliente?.telefone || ''
    setTelefone(telInicial)
    setFeedback(null)
    setIsGenerating(true)

    const clientePrimeiroNome = cliente?.nome ? cliente.nome.split(' ')[0] : 'Cliente'
    const osIdCurto = os.id.slice(-6).toUpperCase()
    const defaultFileName = `Relatorio_OS_${osIdCurto}.pdf`
    setNomeArquivo(defaultFileName)

    const msgSugerida = `Olá ${clientePrimeiroNome}! Segue o Relatório Técnico de Execução da Ordem de Serviço #${osIdCurto} (${os.tipo_servico || 'Serviço em Campo'}) realizada pela equipe da Delfos Solar. Qualquer dúvida, estamos à disposição!`
    setMensagem(msgSugerida)

    async function prepararRelatorio() {
      try {
        // Se a OS já possui arquivo gravado no PocketBase, podemos usar a URL ou carregar o base64
        let url = ''
        if (os.relatorio_pdf) {
          try {
            url = pb.files.getURL(os, os.relatorio_pdf)
            setPdfUrlExistente(url)
          } catch {
            url = ''
          }
        }

        // Se já tiver URL direta, tentar obter base64 via fetch ou gerar sob demanda
        let base64Pronto = ''
        if (url) {
          try {
            const resp = await fetch(url)
            const blob = await resp.blob()
            base64Pronto = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => resolve(String(reader.result || ''))
              reader.onerror = () => resolve('')
              reader.readAsDataURL(blob)
            })
          } catch (e) {
            console.warn('Falha ao baixar PDF existente da OS para base64, gerando sob demanda:', e)
          }
        }

        // Se não conseguiu base64 (não tinha PDF salvo ou falha no download), gera sob demanda
        if (!base64Pronto) {
          const res = await gerarPdfRelatorioOS(os, {
            cliente,
            sistema,
          })
          base64Pronto = res.base64
          setNomeArquivo(res.fileName || defaultFileName)
        }

        setBase64Doc(base64Pronto)
        if (!base64Pronto) {
          setFeedback({
            tipo: 'warning',
            texto: 'Não foi possível gerar o PDF do relatório. Verifique os dados da OS.',
          })
        }
      } catch (err) {
        console.error('Erro ao preparar relatório de OS para WhatsApp:', err)
        setBase64Doc('')
        setFeedback({
          tipo: 'error',
          texto: 'Não foi possível compilar o PDF do relatório.',
        })
      } finally {
        setIsGenerating(false)
      }
    }

    prepararRelatorio()
  }, [isOpen, os, cliente, sistema])

  if (!isOpen) return null

  const temNumeroValido = Boolean(telefone.trim().replace(/\D/g, '').length >= 10)

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    const telLimpo = telefone.trim()
    if (!telLimpo || telLimpo.replace(/\D/g, '').length < 10) {
      setFeedback({
        tipo: 'error',
        texto: 'Por favor, informe um número de WhatsApp válido com DDD (ex: 54 99999-9999).',
      })
      return
    }

    setIsSending(true)
    try {
      // Se alterou telefone e o cliente tem id, atualiza no cadastro autoritativo
      if (cliente?.id && telLimpo !== cliente.whatsapp) {
        try {
          await updateCliente(cliente.id, {
            whatsapp: formatWhatsAppPhone(telLimpo),
          })
        } catch {
          /* ignore */
        }
      }

      if (!base64Doc) {
        setFeedback({
          tipo: 'error',
          texto: 'O arquivo PDF do relatório não foi gerado com sucesso. Tente novamente.',
        })
        setIsSending(false)
        return
      }

      const res = await sendWhatsAppDocument({
        cliente_id: cliente?.id,
        telefone_destino: telLimpo,
        tipo: 'documento',
        referencia_id: os.id,
        legenda: mensagem.trim(),
        nome_arquivo: nomeArquivo || `Relatorio_OS_${os.id.slice(-6).toUpperCase()}.pdf`,
        base64: base64Doc,
      })

      if (res.sent) {
        setFeedback({
          tipo: 'success',
          texto: 'Relatório da OS enviado com sucesso para o WhatsApp do cliente!',
        })
        if (onSuccess) onSuccess()
        setTimeout(() => {
          onClose()
        }, 1300)
      } else if (res.gatewayConfigured === false) {
        setFeedback({
          tipo: 'warning',
          texto:
            'Envio registrado no histórico com status "falha" pois as credenciais da Z-API ainda não foram configuradas.',
        })
      } else {
        setFeedback({
          tipo: 'warning',
          texto: `Envio registrado: ${res.message || 'Status retornado: ' + (res.status || 'falha')}`,
        })
      }
    } catch (err: unknown) {
      console.error('Erro ao disparar relatório de OS via WhatsApp:', err)
      const errStr = err instanceof Error ? err.message : String(err)
      setFeedback({
        tipo: 'error',
        texto: `Falha no envio: ${errStr}`,
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleDownloadPdf = () => {
    if (!base64Doc) return
    const a = document.createElement('a')
    a.href = base64Doc
    a.download = nomeArquivo || `Relatorio_OS_${os.id.slice(-6).toUpperCase()}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSafeClose()
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Enviar Relatório por WhatsApp
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  OS #{os.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Dispara o Relatório Técnico em PDF oficial diretamente para o cliente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSafeClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleEnviar} className="p-4 sm:p-5 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                feedback.tipo === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : feedback.tipo === 'warning'
                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {feedback.tipo === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {feedback.tipo === 'warning' && (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              {feedback.tipo === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{feedback.texto}</div>
            </div>
          )}

          {/* Card do Arquivo Anexo */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                <FileCheck className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">
                  {nomeArquivo || 'Relatorio_OS.pdf'}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <span>Relatório de Execução Técnica (Delfos Solar)</span>
                  {isGenerating && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Processando PDF...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {base64Doc && (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  title="Baixar cópia do PDF"
                  className="p-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-800">
                {base64Doc ? 'Pronto' : isGenerating ? 'Gerando...' : 'Pendente'}
              </span>
            </div>
          </div>

          {/* Campo de Telefone de Destino */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp do Cliente *</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                Cliente: <strong>{cliente?.nome || 'Cliente Solar'}</strong>
              </span>
            </div>

            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(formatWhatsAppPhone(e.target.value))}
              placeholder="(54) 99999-9999"
              className={`w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border ${
                !temNumeroValido ? 'border-amber-400 bg-amber-50/30' : 'border-gray-300 bg-white'
              } text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs`}
            />

            {!temNumeroValido && (
              <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Informe o número com DDD para habilitar o envio.
              </p>
            )}
          </div>

          {/* Nome do Arquivo */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nome do Arquivo PDF</span>
            </label>
            <input
              type="text"
              value={nomeArquivo}
              onChange={(e) => setNomeArquivo(e.target.value)}
              placeholder="Relatorio_OS.pdf"
              className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          {/* Mensagem / Legenda */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Mensagem / Legenda de Acompanhamento
              </label>
              <span className="text-[11px] text-gray-400">Texto padrão sugerido</span>
            </div>
            <textarea
              rows={3}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite uma mensagem ou utilize o texto sugerido..."
              className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs leading-relaxed"
            />
          </div>

          {/* Informação sobre Gateway Z-API */}
          {whatsAppConfig?.isZApi && (
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Gateway: Z-API Conectada</span>
              <span className="text-emerald-700 font-semibold">Envio nativo de documento</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleSafeClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSending || isGenerating || !temNumeroValido || !base64Doc}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.02]"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Relatório por WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalEnviarRelatorioOSWhatsApp
