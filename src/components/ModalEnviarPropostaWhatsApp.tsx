import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Send,
  FileCheck,
  Phone,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sun,
  MapPin,
  DollarSign,
  Zap,
  Sparkles,
  Info,
  Copy,
  Check,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { Cliente, OrcamentoSolar } from '@/types/crm'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'
import { gerarBase64OrcamentoSolar } from '@/lib/pdfWhatsAppService'
import {
  TEMPLATES_PROPOSTA_WHATSAPP,
  validarNumeroWhatsApp,
  aplicarPlaceholdersProposta,
  extrairContextoProposta,
  construirPropostaSolarPDFInput,
} from '@/lib/propostaWhatsAppService'

export interface ModalEnviarPropostaWhatsAppProps {
  isOpen: boolean
  onClose: () => void
  orcamento: OrcamentoSolar
  cliente?: Cliente | null
  onSuccess?: () => void
}

export const ModalEnviarPropostaWhatsApp: React.FC<ModalEnviarPropostaWhatsAppProps> = ({
  isOpen,
  onClose,
  orcamento,
  cliente,
  onSuccess,
}) => {
  const { sendWhatsAppDocument, sendWhatsAppMessage, updateCliente, whatsAppConfig } = useClientes()

  // O WhatsApp é o número autoritativo do cliente neste CRM (regra do projeto)
  const numeroInicial = cliente?.whatsapp || cliente?.telefone || ''

  const [telefone, setTelefone] = useState<string>(numeroInicial)
  const [mensagem, setMensagem] = useState<string>('')
  const [templateAtivoId, setTemplateAtivoId] = useState<string>('proposta_pronta')
  const [incluirPdf, setIncluirPdf] = useState<boolean>(true)
  const [nomeArquivo, setNomeArquivo] = useState<string>('')
  const [base64Doc, setBase64Doc] = useState<string>('')
  const [textoFallback, setTextoFallback] = useState<string>('')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(true)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [copiado, setCopiado] = useState(false)
  const [feedback, setFeedback] = useState<{
    tipo: 'success' | 'warning' | 'error'
    texto: string
  } | null>(null)

  // Contexto da proposta para os placeholders
  const contexto = useMemo(() => {
    return extrairContextoProposta(orcamento, cliente)
  }, [orcamento, cliente])

  // Validação dinâmica do número digitado
  const validacaoNumero = useMemo(() => {
    return validarNumeroWhatsApp(telefone)
  }, [telefone])

  // Inicializar estado ao abrir
  useEffect(() => {
    if (!isOpen) return

    const numAutoritativo = cliente?.whatsapp || cliente?.telefone || ''
    setTelefone(formatWhatsAppPhone(numAutoritativo))
    setFeedback(null)
    setTemplateAtivoId('proposta_pronta')

    // Gerar mensagem inicial com o primeiro template
    const templatePadrao = TEMPLATES_PROPOSTA_WHATSAPP[0]
    const msgInicial = aplicarPlaceholdersProposta(templatePadrao.conteudo, contexto)
    setMensagem(msgInicial)

    // Nome de arquivo amigável
    const safeNome = (cliente?.nome || 'Cliente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
    const revNum = orcamento.numero_revisao || 1
    setNomeArquivo(`Proposta-Solar-Delfos-${safeNome}-Rev${revNum}.pdf`)

    // Gerar PDF em segundo plano
    let isCancelled = false
    setIsGeneratingPdf(true)

    async function prepararPdf() {
      try {
        const inputPdf = construirPropostaSolarPDFInput(orcamento, cliente)
        const res = await gerarBase64OrcamentoSolar(inputPdf)
        if (!isCancelled) {
          setBase64Doc(res.base64 || '')
          setTextoFallback(res.fallbackText)
          if (!res.base64) {
            setFeedback({
              tipo: 'warning',
              texto:
                'Não foi possível gerar o PDF oficial completo. Tente novamente ou desmarque "Anexar PDF" para enviar somente a mensagem de texto.',
            })
          }
        }
      } catch (err) {
        console.error('Erro ao preparar PDF solar para WhatsApp:', err)
        if (!isCancelled) {
          setBase64Doc('')
          setFeedback({
            tipo: 'error',
            texto:
              'Não foi possível gerar o PDF oficial completo. Tente novamente ou desmarque "Anexar PDF" para enviar somente a mensagem de texto.',
          })
        }
      } finally {
        if (!isCancelled) {
          setIsGeneratingPdf(false)
        }
      }
    }

    prepararPdf()

    return () => {
      isCancelled = true
    }
  }, [isOpen, orcamento, cliente, contexto])

  // Seleção de um novo template
  const handleSelecionarTemplate = (templateId: string) => {
    setTemplateAtivoId(templateId)
    const tpl = TEMPLATES_PROPOSTA_WHATSAPP.find((t) => t.id === templateId)
    if (tpl) {
      const novaMensagem = aplicarPlaceholdersProposta(tpl.conteudo, contexto)
      setMensagem(novaMensagem)
    }
  }

  // Copiar mensagem para área de transferência (facilitador)
  const handleCopiarMensagem = async () => {
    try {
      await navigator.clipboard.writeText(mensagem)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (!isOpen) return null

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (!validacaoNumero.valido) {
      setFeedback({
        tipo: 'error',
        texto:
          validacaoNumero.mensagemErro ||
          'Informe um número de WhatsApp válido com DDD (ex: 54 99999-9999).',
      })
      return
    }

    const mensagemLimpa = mensagem.trim()
    if (!mensagemLimpa) {
      setFeedback({
        tipo: 'error',
        texto: 'Por favor, digite ou selecione uma mensagem para enviar.',
      })
      return
    }

    setIsSending(true)
    try {
      // 1. O WhatsApp é o número autoritativo do cliente: sincronizar se o usuário alterou no modal
      if (cliente && validacaoNumero.numeroLimpo !== cliente.whatsapp?.replace(/\D/g, '')) {
        try {
          await updateCliente(cliente.id, {
            whatsapp: validacaoNumero.numeroFormatado,
          })
        } catch (errAtualizar) {
          console.warn('Aviso ao sincronizar WhatsApp autoritativo do cliente:', errAtualizar)
        }
      }

      const clienteId = cliente?.id || orcamento.cliente_id
      let resultado: {
        ok?: boolean
        sent?: boolean
        gatewayConfigured?: boolean
        status?: string
        message?: string
        error?: string
      }

      // 2. Enviar com PDF oficial anexo via Z-API ou texto puro
      if (incluirPdf) {
        if (!base64Doc) {
          setFeedback({
            tipo: 'error',
            texto:
              'Não foi possível gerar o PDF oficial completo. Tente novamente ou desmarque "Anexar PDF" para enviar somente a mensagem de texto.',
          })
          setIsSending(false)
          return
        }

        resultado = await sendWhatsAppDocument({
          cliente_id: clienteId,
          telefone_destino: validacaoNumero.numeroLimpo,
          tipo: 'orcamento_solar',
          referencia_id: orcamento.id,
          legenda: mensagemLimpa,
          nome_arquivo: nomeArquivo || 'Proposta-Solar-Delfos.pdf',
          base64: base64Doc,
        })
      } else {
        // Envio somente de texto
        resultado = await sendWhatsAppMessage({
          cliente_id: clienteId,
          telefone_destino: validacaoNumero.numeroLimpo,
          conteudo_final: mensagemLimpa,
          tipo_disparo: 'manual',
          referencia_id: orcamento.id,
        })
      }

      if (resultado.sent) {
        setFeedback({
          tipo: 'success',
          texto: `Proposta enviada com sucesso para ${validacaoNumero.numeroFormatado} via WhatsApp!`,
        })
        if (onSuccess) onSuccess()
        setTimeout(() => {
          onClose()
        }, 1300)
      } else if (resultado.gatewayConfigured === false) {
        setFeedback({
          tipo: 'warning',
          texto:
            'Mensagem registrada no histórico como pendente/falha. WHATSAPP_API_URL e WHATSAPP_API_KEY devem estar configuradas nos Secrets do backend.',
        })
      } else {
        setFeedback({
          tipo: 'warning',
          texto: `Disparo registrado: ${resultado.message || resultado.error || 'Status: ' + (resultado.status || 'concluído')}`,
        })
      }
    } catch (err: unknown) {
      console.error('Erro ao enviar proposta via WhatsApp:', err)
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
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden max-h-[92vh]">
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  Enviar Proposta por WhatsApp
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Rev. {orcamento.numero_revisao || 1}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                  Z-API Integrada
                </span>
              </div>

              {/* Resumo contextual da proposta */}
              <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 flex-wrap">
                <span className="font-bold text-gray-900">
                  {cliente?.nome || 'Cliente Selecionado'}
                </span>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-extrabold">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  {contexto.valor}
                </span>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1 text-gray-700 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {contexto.potencia}
                </span>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1 text-gray-500">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  {contexto.cidade}
                </span>
              </div>
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

        {/* Corpo do Modal com Scroll */}
        <form onSubmit={handleEnviar} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                feedback.tipo === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium'
                  : feedback.tipo === 'warning'
                    ? 'bg-amber-50 border border-amber-200 text-amber-900 font-medium'
                    : 'bg-rose-50 border border-rose-200 text-rose-900 font-medium'
              }`}
            >
              {feedback.tipo === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {feedback.tipo === 'warning' && (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              {feedback.tipo === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{feedback.texto}</div>
            </div>
          )}

          {/* Seleção de Templates de Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Modelos de Mensagem (Templates)</span>
              </label>
              <span className="text-[11px] text-gray-400">
                Substituição automática de variáveis
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEMPLATES_PROPOSTA_WHATSAPP.map((tpl) => {
                const isSelected = templateAtivoId === tpl.id
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelecionarTemplate(tpl.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 font-bold ring-1 ring-emerald-400 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{tpl.titulo}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    {tpl.descricao && (
                      <span className="text-[10px] text-gray-400 font-normal line-clamp-1 mt-1">
                        {tpl.descricao}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Destinatário: Número do WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Número de WhatsApp do Destinatário *</span>
              </label>

              {validacaoNumero.valido ? (
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Formatado: <strong>{validacaoNumero.numeroFormatado}</strong>
                </span>
              ) : (
                <span className="text-[11px] text-amber-700 font-medium">
                  {validacaoNumero.mensagemErro || 'Mínimo 10 dígitos com DDD'}
                </span>
              )}
            </div>

            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(formatWhatsAppPhone(e.target.value))}
              placeholder="(54) 99999-9999"
              className={`w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border ${
                !validacaoNumero.valido
                  ? 'border-amber-400 bg-amber-50/30 text-amber-950'
                  : 'border-gray-300 bg-white text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs transition-colors`}
            />

            <p className="text-[11px] text-gray-500 mt-1">
              No Delfos Solar o WhatsApp é o número autoritativo do cliente. Se alterado aqui, o
              cadastro é sincronizado automaticamente.
            </p>
          </div>

          {/* Editor da Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Mensagem a ser enviada
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopiarMensagem}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
                >
                  {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiado ? 'Copiado!' : 'Copiar texto'}</span>
                </button>
                <span className="text-[11px] text-gray-400 font-medium">
                  {mensagem.length} caracteres
                </span>
              </div>
            </div>

            <textarea
              rows={6}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite sua mensagem personalizada..."
              className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs leading-relaxed font-sans"
            />
          </div>

          {/* Anexo PDF da Proposta */}
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                <FileCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">
                  {nomeArquivo || 'Proposta-Solar-Delfos.pdf'}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 mt-0.5">
                  <span>PDF Oficial com estudo técnico e comercial</span>
                  {isGeneratingPdf && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Gerando documento...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={incluirPdf}
                  onChange={(e) => setIncluirPdf(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="hidden sm:inline">Anexar PDF</span>
              </label>

              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-800">
                {base64Doc ? 'PDF Pronto' : isGeneratingPdf ? 'Gerando...' : 'Pendente'}
              </span>
            </div>
          </div>

          {/* Aviso se PDF falhar */}
          {!base64Doc && !isGeneratingPdf && incluirPdf && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Não foi possível gerar o PDF oficial completo. Tente novamente ou desmarque
                &apos;Anexar PDF&apos; para enviar somente a mensagem de texto.
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2.5">
            <div className="text-[11px] text-gray-500 hidden sm:block">
              {whatsAppConfig?.isZApi ? (
                <span className="text-emerald-700 font-medium">Gateway: Z-API Conectada</span>
              ) : (
                <span>Envio direto via WhatsApp API</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
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
                disabled={
                  isSending ||
                  isGeneratingPdf ||
                  !validacaoNumero.valido ||
                  (incluirPdf && !base64Doc)
                }
                className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.02]"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Disparando WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Proposta por WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalEnviarPropostaWhatsApp
