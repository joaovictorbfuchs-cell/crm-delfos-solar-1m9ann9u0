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
  Sun,
  Wrench,
  Info,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { Cliente } from '@/types/crm'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { gerarBase64OrcamentoSolar, gerarBase64PropostaOM } from '@/lib/pdfWhatsAppService'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import type { PropostaPDFInput } from '@/lib/propostaOMGenerator'

export interface ModalEnviarDocumentoWhatsAppProps {
  isOpen: boolean
  onClose: () => void
  cliente: Cliente
  tipo: 'orcamento_solar' | 'proposta_om'
  referenciaId?: string
  dadosSolar?: PropostaSolarPDFInput
  dadosOM?: PropostaPDFInput
  onSuccess?: () => void
}

export const ModalEnviarDocumentoWhatsApp: React.FC<ModalEnviarDocumentoWhatsAppProps> = ({
  isOpen,
  onClose,
  cliente,
  tipo,
  referenciaId,
  dadosSolar,
  dadosOM,
  onSuccess,
}) => {
  const { sendWhatsAppDocument, updateCliente, whatsAppConfig } = useClientes()

  const [telefone, setTelefone] = useState<string>(cliente.whatsapp || cliente.telefone || '')
  const [mensagem, setMensagem] = useState<string>('')
  const [nomeArquivo, setNomeArquivo] = useState<string>('')
  const [base64Doc, setBase64Doc] = useState<string>('')
  const [textoFallback, setTextoFallback] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(true)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{
    tipo: 'success' | 'warning' | 'error'
    texto: string
  } | null>(null)

  // Gerar PDF em base64 e definir sugestão inicial de mensagem e nome de arquivo
  useEffect(() => {
    if (!isOpen) return

    setTelefone(cliente.whatsapp || cliente.telefone || '')
    setFeedback(null)
    setIsGenerating(true)

    const clientePrimeiroNome = cliente.nome ? cliente.nome.split(' ')[0] : 'Cliente'
    const safeClienteNome = (cliente.nome || 'Cliente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')

    async function prepararDocumento() {
      try {
        if (tipo === 'orcamento_solar' && dadosSolar) {
          const defaultFileName = `Orcamento-Solar-${safeClienteNome}.pdf`
          setNomeArquivo(defaultFileName)

          const msgSugerida = `Olá ${clientePrimeiroNome}! Segue em anexo a proposta técnica de energia solar da Delfos Solar. Ficamos à disposição para tirar qualquer dúvida!`
          setMensagem(msgSugerida)

          const res = await gerarBase64OrcamentoSolar(dadosSolar)
          setBase64Doc(res.base64)
          setTextoFallback(res.fallbackText)
        } else if (tipo === 'proposta_om' && dadosOM) {
          const defaultFileName = `Proposta-OM-${safeClienteNome}.pdf`
          setNomeArquivo(defaultFileName)

          const msgSugerida = `Olá ${clientePrimeiroNome}! Segue a proposta oficial de Operação e Manutenção (O&M) da Delfos Solar para proteger seu ativo fotovoltaico. Qualquer dúvida estou à disposição!`
          setMensagem(msgSugerida)

          const res = await gerarBase64PropostaOM(dadosOM)
          setBase64Doc(res.base64)
          setTextoFallback(res.fallbackText)
        } else {
          // Fallback genérico se os dados completos não tiverem sido fornecidos
          setNomeArquivo(`Proposta-Delfos-${safeClienteNome}.pdf`)
          setMensagem(`Olá ${clientePrimeiroNome}! Segue o documento técnico da Delfos Solar.`)
        }
      } catch (err) {
        console.error('Erro ao preparar PDF para WhatsApp:', err)
      } finally {
        setIsGenerating(false)
      }
    }

    prepararDocumento()
  }, [isOpen, cliente, tipo, dadosSolar, dadosOM])

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
      // Atualizar número no cadastro do cliente se alterado
      if (telLimpo !== cliente.whatsapp) {
        try {
          await updateCliente(cliente.id, {
            whatsapp: formatWhatsAppPhone(telLimpo),
          })
        } catch {
          /* intentionally ignored */
        }
      }

      // Se por algum motivo o PDF não puder ser gerado no navegador, usar mensagem de texto de fallback com o resumo
      const base64Final = base64Doc || ''
      const legendaFinal = base64Doc ? mensagem.trim() : `${mensagem.trim()}\n\n${textoFallback}`

      const res = await sendWhatsAppDocument({
        cliente_id: cliente.id,
        telefone_destino: telLimpo,
        tipo: tipo,
        referencia_id: referenciaId,
        legenda: legendaFinal,
        nome_arquivo: nomeArquivo || 'proposta-delfos.pdf',
        base64: base64Final,
      })

      if (res.sent) {
        setFeedback({
          tipo: 'success',
          texto: 'Documento PDF enviado com sucesso para o WhatsApp do cliente!',
        })
        if (onSuccess) onSuccess()
        setTimeout(() => {
          onClose()
        }, 1200)
      } else if (res.gatewayConfigured === false) {
        setFeedback({
          tipo: 'warning',
          texto:
            'Documento registrado no histórico com status "falha" pois os Secrets WHATSAPP_API_URL e WHATSAPP_API_KEY ainda não foram configurados no backend.',
        })
      } else {
        setFeedback({
          tipo: 'warning',
          texto: `Envio registrado: ${res.message || 'Status retornado: ' + (res.status || 'falha')}`,
        })
      }
    } catch (err: unknown) {
      console.error('Erro ao enviar documento via WhatsApp:', err)
      const errStr = err instanceof Error ? err.message : String(err)
      setFeedback({
        tipo: 'error',
        texto: `Falha no envio: ${errStr}`,
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
              {tipo === 'orcamento_solar' ? (
                <Sun className="w-5 h-5 text-white" />
              ) : (
                <Wrench className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Enviar por WhatsApp
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {tipo === 'orcamento_solar' ? 'Orçamento Solar' : 'Proposta O&M'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Dispara o arquivo PDF oficial com mensagem direta para o cliente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
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
                  {nomeArquivo || 'documento.pdf'}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <span>Documento PDF (Formato Oficial Delfos Solar)</span>
                  {isGenerating && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Preparando...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-800 shrink-0">
              {base64Doc ? 'PDF Pronto' : 'Resumo'}
            </span>
          </div>

          {/* Campo de Telefone de Destino */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Telefone WhatsApp do Cliente *</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                Cliente: <strong>{cliente.nome}</strong>
              </span>
            </div>

            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(formatWhatsAppPhone(e.target.value))}
              placeholder="(54) 99999-9999"
              className={`w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border ${
                !temNumeroValido ? 'border-amber-400 bg-amber-50/30' : 'border-gray-300 bg-white'
              } text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs`}
            />

            {!temNumeroValido && (
              <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Informe o número com DDD para habilitar o envio.
              </p>
            )}
          </div>

          {/* Nome do Arquivo proposto */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nome do Arquivo PDF</span>
            </label>
            <input
              type="text"
              value={nomeArquivo}
              onChange={(e) => setNomeArquivo(e.target.value)}
              placeholder="Nome-do-arquivo.pdf"
              className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          {/* Mensagem Opcional / Legenda */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Mensagem / Legenda do Envio (Opcional)
              </label>
              <span className="text-[11px] text-gray-400">Sugestão pronta</span>
            </div>
            <textarea
              rows={3}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite uma mensagem ou utilize o texto sugerido acima..."
              className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs leading-relaxed"
            />
          </div>

          {/* Aviso sobre Fallback se PDF falhar */}
          {!base64Doc && !isGenerating && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Modo Fallback Ativo:</strong> Se o PDF não for gerado no dispositivo, os
                dados completos e o resumo da proposta serão enviados como mensagem formatada via
                WhatsApp.
              </span>
            </div>
          )}

          {/* Informação sobre Gateway Z-API */}
          {whatsAppConfig?.isZApi && (
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Gateway: Z-API Conectada</span>
              <span className="text-emerald-700 font-semibold">Envio de PDF nativo ativo</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSending || isGenerating || !temNumeroValido}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.02]"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando Documento...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default ModalEnviarDocumentoWhatsApp
