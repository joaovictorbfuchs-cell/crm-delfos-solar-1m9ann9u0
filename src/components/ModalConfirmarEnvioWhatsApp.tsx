import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  Send,
  Phone,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  MessageSquare,
  FileText,
} from 'lucide-react'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { validarNumeroWhatsApp } from '@/lib/propostaWhatsAppService'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export interface ModalConfirmarEnvioWhatsAppProps {
  isOpen: boolean
  onClose: () => void
  titulo?: string
  subtitulo?: string
  destinatarioNome?: string
  telefoneInicial: string
  mensagemInicial: string
  templates?: Array<{
    id: string
    titulo: string
    conteudo: string
    descricao?: string
  }>
  templatePadraoId?: string
  contextoVariaveis?: Record<string, string>
  onConfirmarEnvio: (dados: {
    telefone: string
    mensagem: string
  }) => Promise<{ ok: boolean; sent?: boolean; message?: string; error?: string } | void>
  confirmLabel?: string
  onSincronizarTelefone?: (novoTelefone: string) => Promise<void> | void
}

function interpolarVariaveis(texto: string, contexto: Record<string, string> = {}): string {
  if (!texto) return ''
  let resultado = texto
  Object.entries(contexto).forEach(([chave, valor]) => {
    const val = valor || ''
    resultado = resultado.replace(new RegExp(`\\{${chave}\\}`, 'gi'), val)
    resultado = resultado.replace(new RegExp(`\\{\\{${chave}\\}\\}`, 'gi'), val)
  })
  return resultado
}

export const ModalConfirmarEnvioWhatsAppContent: React.FC<ModalConfirmarEnvioWhatsAppProps> = ({
  isOpen,
  onClose,
  titulo = 'Conferência de Envio via WhatsApp',
  subtitulo = 'Verifique o número de destino e personalize a mensagem antes do disparo.',
  destinatarioNome,
  telefoneInicial,
  mensagemInicial,
  templates = [],
  templatePadraoId,
  contextoVariaveis = {},
  onConfirmarEnvio,
  confirmLabel = 'Confirmar e Enviar via WhatsApp',
  onSincronizarTelefone,
}) => {
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current !== null) {
        clearTimeout(sendTimeoutRef.current)
        sendTimeoutRef.current = null
      }
    }
  }, [])

  const [telefone, setTelefone] = useState<string>('')
  const [mensagem, setMensagem] = useState<string>('')
  const [templateAtivoId, setTemplateAtivoId] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)
  const [copiado, setCopiado] = useState(false)
  const [feedback, setFeedback] = useState<{
    tipo: 'success' | 'warning' | 'error'
    texto: string
  } | null>(null)

  // Inicializa dados ao abrir o modal
  useEffect(() => {
    if (!isOpen) return

    const telFormatado = formatWhatsAppPhone(telefoneInicial || '')
    setTelefone(telFormatado)
    setFeedback(null)

    // Se temos template padrão ou lista de templates, inicializa
    const initialTplId = templatePadraoId || (templates.length > 0 ? templates[0].id : '')
    setTemplateAtivoId(initialTplId)

    if (templates.length > 0 && initialTplId) {
      const tpl = templates.find((t) => t.id === initialTplId)
      if (tpl) {
        setMensagem(interpolarVariaveis(tpl.conteudo, contextoVariaveis))
      } else {
        setMensagem(interpolarVariaveis(mensagemInicial || '', contextoVariaveis))
      }
    } else {
      setMensagem(interpolarVariaveis(mensagemInicial || '', contextoVariaveis))
    }
  }, [isOpen, telefoneInicial, mensagemInicial, templatePadraoId, templates, contextoVariaveis])

  const validacaoNumero = useMemo(() => {
    return validarNumeroWhatsApp(telefone)
  }, [telefone])

  const handleSelecionarTemplate = (templateId: string) => {
    setTemplateAtivoId(templateId)
    const tpl = templates.find((t) => t.id === templateId)
    if (tpl) {
      const novaMensagem = interpolarVariaveis(tpl.conteudo, contextoVariaveis)
      setMensagem(novaMensagem)
    }
  }

  const handleCopiarMensagem = async () => {
    try {
      await navigator.clipboard.writeText(mensagem)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const executarEnvio = async () => {
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
        texto: 'Por favor, digite ou revise a mensagem antes de enviar.',
      })
      return
    }

    setIsSending(true)
    setFeedback(null)

    if (sendTimeoutRef.current !== null) {
      clearTimeout(sendTimeoutRef.current)
      sendTimeoutRef.current = null
    }

    try {
      // Sincroniza telefone autoritativo se alterado pelo usuário
      if (onSincronizarTelefone && validacaoNumero.numeroFormatado) {
        try {
          await onSincronizarTelefone(validacaoNumero.numeroFormatado)
        } catch (errSync) {
          console.warn('Aviso ao sincronizar telefone WhatsApp autoritativo:', errSync)
        }
      }

      // Timeout de segurança de 45s (controlado, nunca trava a tela)
      const envioTimeoutPromise = new Promise<never>((_, reject) => {
        sendTimeoutRef.current = setTimeout(() => {
          reject(
            new Error(
              'Tempo limite de 45s excedido na comunicação com o Gateway de WhatsApp (Z-API). A mensagem pode estar sendo processada. Você pode tentar novamente ou verificar o histórico.',
            ),
          )
        }, 45000)
      })

      const envioPromise = onConfirmarEnvio({
        telefone: validacaoNumero.numeroFormatado || validacaoNumero.numeroLimpo,
        mensagem: mensagemLimpa,
      })

      const resultado = await Promise.race([envioPromise, envioTimeoutPromise])

      if (!isMountedRef.current) return

      if (resultado && typeof resultado === 'object') {
        if (resultado.ok && resultado.sent) {
          setFeedback({
            tipo: 'success',
            texto: `Mensagem enviada com sucesso para ${validacaoNumero.numeroFormatado} via WhatsApp!`,
          })
          setTimeout(() => {
            if (isMountedRef.current) {
              onClose()
            }
          }, 1200)
          return
        }

        if (resultado.sent === false) {
          setFeedback({
            tipo: 'warning',
            texto:
              resultado.message ||
              resultado.error ||
              'Disparo registrado, mas o gateway Z-API retornou falha ou não está conectado.',
          })
          return
        }
      }

      // Se não retornou objeto com detalhes mas resolveu sem erros:
      setFeedback({
        tipo: 'success',
        texto: `Mensagem processada para envio via WhatsApp para ${validacaoNumero.numeroFormatado}!`,
      })
      setTimeout(() => {
        if (isMountedRef.current) {
          onClose()
        }
      }, 1200)
    } catch (err: unknown) {
      console.error('Erro ao enviar mensagem via WhatsApp:', err)
      if (!isMountedRef.current) return

      const errStr = err instanceof Error ? err.message : String(err)
      const isTimeout =
        errStr.includes('Tempo limite de 45s excedido') ||
        errStr.includes('45s') ||
        errStr.toLowerCase().includes('timeout')

      if (isTimeout) {
        setFeedback({
          tipo: 'error',
          texto:
            'Tempo limite de 45s excedido na comunicação com o Gateway de WhatsApp (Z-API). A mensagem pode estar sendo processada pela Z-API. Você pode tentar novamente.',
        })
      } else {
        setFeedback({
          tipo: 'error',
          texto: `Falha no envio: ${errStr}`,
        })
      }
    } finally {
      if (sendTimeoutRef.current !== null) {
        clearTimeout(sendTimeoutRef.current)
        sendTimeoutRef.current = null
      }
      if (isMountedRef.current) {
        setIsSending(false)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executarEnvio()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  {titulo}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Z-API Integrada
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {subtitulo}
                {destinatarioNome && (
                  <span className="font-semibold text-gray-700 ml-1">
                    Destinatário: {destinatarioNome}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSending}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
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
              <div className="flex-1 leading-relaxed">
                <p>{feedback.texto}</p>
                {feedback.tipo === 'error' && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSending}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-200/80 hover:bg-rose-300/80 text-rose-950 transition-colors inline-flex items-center gap-1 shrink-0 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Tentar novamente</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modelos / Templates se houver mais de um */}
          {templates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Modelos de Mensagem (Templates)</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  Selecione para carregar o texto padrão
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map((tpl) => {
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
          )}

          {/* Destinatário */}
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
              {destinatarioNome
                ? `Número para envio a ${destinatarioNome}. O WhatsApp é o número autoritativo do CRM.`
                : 'O WhatsApp é o número autoritativo do cadastro no Delfos Solar.'}
            </p>
          </div>

          {/* Editor da Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mensagem a ser enviada</span>
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

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2.5">
            <span className="text-[11px] text-gray-500 hidden sm:inline">
              Envio via WhatsApp Z-API após confirmação
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSending || !validacaoNumero.valido || !mensagem.trim()}
                className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.02]"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enviando WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{confirmLabel}</span>
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

export const ModalConfirmarEnvioWhatsApp: React.FC<ModalConfirmarEnvioWhatsAppProps> = (props) => {
  if (!props.isOpen) return null
  return (
    <ErrorBoundary
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full text-center space-y-4">
            <h3 className="font-bold text-gray-900">Erro na conferência de WhatsApp</h3>
            <p className="text-xs text-gray-600">
              Ocorreu um problema ao carregar o modal de conferência.
            </p>
            <button
              onClick={props.onClose}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      }
    >
      <ModalConfirmarEnvioWhatsAppContent {...props} />
    </ErrorBoundary>
  )
}

export default ModalConfirmarEnvioWhatsApp
