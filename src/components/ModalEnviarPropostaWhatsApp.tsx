import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  Send,
  FileCheck,
  FileText,
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
  RotateCcw,
  Paperclip,
  Upload,
  Trash2,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { aplicarPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
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
import {
  resolverNumeroDestinoCliente,
  MENSAGEM_ALERTA_SEM_NUMERO,
} from '@/lib/resolverNumeroDestinoCliente'

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
  const {
    sendWhatsAppDocument,
    sendWhatsAppMessage,
    updateCliente,
    whatsAppConfig,
    whatsAppTemplates,
  } = useClientes()

  // Guard para impedir setState após desmontagem do componente
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Timeout handle ativo de envio e fechamento
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAllTimers = () => {
    if (sendTimeoutRef.current !== null) {
      clearTimeout(sendTimeoutRef.current)
      sendTimeoutRef.current = null
    }
    if (successCloseTimeoutRef.current !== null) {
      clearTimeout(successCloseTimeoutRef.current)
      successCloseTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [])

  const handleSafeClose = () => {
    clearAllTimers()
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

  // O WhatsApp é o número autoritativo do cliente neste CRM (regra do projeto)
  const numeroInicial = cliente?.whatsapp || cliente?.telefone || ''

  const [origemDestino, setOrigemDestino] = useState<
    | 'contato_adicional_principal'
    | 'cliente_whatsapp'
    | 'contato_adicional_whatsapp'
    | 'cliente_telefone'
    | 'nenhum'
  >('cliente_whatsapp')
  const [contatoAdicionalNome, setContatoAdicionalNome] = useState<string | undefined>()

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

  // Suporte a anexo do computador (PDF gerado do computador pelo usuário)
  const [anexoManual, setAnexoManual] = useState<{
    file: File
    nome: string
    base64: string
    tamanhoBytes: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [feedback, setFeedback] = useState<{
    tipo: 'success' | 'warning' | 'error'
    texto: string
  } | null>(null)

  const executarEnvio = async () => {
    if (!validacaoNumero.valido) {
      setFeedback({
        tipo: 'error',
        texto:
          origemDestino === 'nenhum'
            ? MENSAGEM_ALERTA_SEM_NUMERO
            : validacaoNumero.mensagemErro ||
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
    setFeedback(null)

    // Limpa timeout anterior caso ainda exista
    if (sendTimeoutRef.current !== null) {
      clearTimeout(sendTimeoutRef.current)
      sendTimeoutRef.current = null
    }

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

      // Timeout de segurança de 45 segundos para a chamada de envio via rede/Z-API
      const envioTimeoutPromise = new Promise<never>((_, reject) => {
        sendTimeoutRef.current = setTimeout(() => {
          reject(
            new Error(
              'Tempo limite de 45s excedido na comunicação com o Gateway de WhatsApp (Z-API). Verifique o histórico de mensagens.',
            ),
          )
        }, 45000)
      })

      // 2. Enviar com PDF oficial anexo via Z-API ou texto puro
      if (incluirPdf) {
        // Prioridade para o anexo manual enviado do computador se houver, ou o PDF gerado em segundo plano
        const base64Final = anexoManual?.base64 || base64Doc
        const nomeFinal = anexoManual?.nome || nomeArquivo || 'Proposta-Solar-Delfos.pdf'

        if (!base64Final) {
          if (isMountedRef.current) {
            setFeedback({
              tipo: 'error',
              texto:
                'Nenhum PDF disponível para anexo. Anexe a proposta gerada em PDF do seu computador ou desmarque "Anexar PDF" para enviar somente o texto.',
            })
            setIsSending(false)
          }
          return
        }

        const legendaComPrefixo = aplicarPrefixoMensagemManual(mensagemLimpa)
        const envioPromise = sendWhatsAppDocument({
          cliente_id: clienteId,
          telefone_destino: validacaoNumero.numeroLimpo,
          tipo: 'orcamento_solar',
          referencia_id: orcamento.id,
          legenda: legendaComPrefixo,
          nome_arquivo: nomeFinal,
          base64: base64Final,
        })

        resultado = await Promise.race([envioPromise, envioTimeoutPromise])
      } else {
        // Envio somente de texto
        const conteudoComPrefixo = aplicarPrefixoMensagemManual(mensagemLimpa)
        const envioPromise = sendWhatsAppMessage({
          cliente_id: clienteId,
          telefone_destino: validacaoNumero.numeroLimpo,
          conteudo_final: conteudoComPrefixo,
          tipo_disparo: 'manual',
          referencia_id: orcamento.id,
        })

        resultado = await Promise.race([envioPromise, envioTimeoutPromise])
      }

      if (!isMountedRef.current) return

      if (resultado.sent) {
        setFeedback({
          tipo: 'success',
          texto: `Proposta enviada com sucesso para ${validacaoNumero.numeroFormatado} via WhatsApp!`,
        })
        if (onSuccess) onSuccess()
        if (successCloseTimeoutRef.current !== null) {
          clearTimeout(successCloseTimeoutRef.current)
        }
        successCloseTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            handleSafeClose()
          }
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
            'Tempo limite de 45s excedido na comunicação com o Gateway de WhatsApp (Z-API). A mensagem pode estar sendo processada pela Z-API. Você pode verificar o histórico ou tentar novamente.',
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

    let cancelResolucao = false
    async function inicializarNumero() {
      const res = await resolverNumeroDestinoCliente(cliente)
      if (cancelResolucao || !isMountedRef.current) return
      setOrigemDestino(res.origem)
      setContatoAdicionalNome(res.contatoAdicionalNome)
      if (res.numeroFormatado) {
        setTelefone(res.numeroFormatado)
      } else {
        const fallback = cliente?.whatsapp || cliente?.telefone || ''
        setTelefone(formatWhatsAppPhone(fallback))
      }
      if (res.origem === 'nenhum') {
        setFeedback({
          tipo: 'warning',
          texto: MENSAGEM_ALERTA_SEM_NUMERO,
        })
      }
    }
    inicializarNumero()

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

    // Gerar PDF em segundo plano com timeout de segurança
    let isCancelled = false
    let pdfTimeoutHandle: ReturnType<typeof setTimeout> | null = null
    setIsGeneratingPdf(true)

    async function prepararPdf() {
      try {
        const inputPdf = construirPropostaSolarPDFInput(orcamento, cliente)
        // Timeout de segurança no nível do modal (35s)
        const timeoutPromise = new Promise<{
          base64: string
          fallbackText: string
          fileName: string
        }>((_, reject) => {
          pdfTimeoutHandle = setTimeout(
            () =>
              reject(
                new Error(
                  'Tempo limite de 35s excedido na geração do PDF. O documento pode ser enviado em modo texto ou tente novamente.',
                ),
              ),
            35000,
          )
        })

        const res = await Promise.race([gerarBase64OrcamentoSolar(inputPdf), timeoutPromise])

        if (!isCancelled && isMountedRef.current) {
          setBase64Doc(res.base64 || '')
          setTextoFallback(res.fallbackText)
          if (!res.base64) {
            setFeedback({
              tipo: 'warning',
              texto:
                'Não foi possível gerar o PDF oficial completo. Você pode desmarcar "Anexar PDF" para enviar somente a mensagem de texto ou tentar novamente.',
            })
          }
        }
      } catch (err: unknown) {
        console.error('Erro ao preparar PDF solar para WhatsApp:', err)
        const msg = err instanceof Error ? err.message : String(err)
        if (!isCancelled && isMountedRef.current) {
          setBase64Doc('')
          setFeedback({
            tipo: 'error',
            texto: `Falha na preparação do PDF oficial: ${msg}`,
          })
        }
      } finally {
        if (pdfTimeoutHandle !== null) {
          clearTimeout(pdfTimeoutHandle)
          pdfTimeoutHandle = null
        }
        if (!isCancelled && isMountedRef.current) {
          setIsGeneratingPdf(false)
        }
      }
    }

    prepararPdf()

    return () => {
      isCancelled = true
      if (pdfTimeoutHandle !== null) {
        clearTimeout(pdfTimeoutHandle)
        pdfTimeoutHandle = null
      }
    }
  }, [isOpen, orcamento, cliente, contexto])

  // Lista unificada de templates: templates do sistema (whatsapp_templates) + templates de proposta locais
  const listaTemplates = useMemo(() => {
    // Procura templates com categoria ou tag relacionada a proposta/solar nos templates do sistema
    const sistemaPropostaTpls = (whatsAppTemplates || [])
      .filter(
        (t) =>
          t.ativo !== false &&
          (t.categoria === 'proposta' ||
            t.categoria === 'comercial' ||
            t.nome?.toLowerCase().includes('proposta') ||
            t.id?.includes('proposta')),
      )
      .map((t) => ({
        id: `sys_${t.id}`,
        titulo: t.nome,
        descricao: t.descricao || 'Modelo cadastrado no CRM',
        conteudo: t.conteudo,
      }))

    // Combina: se houver templates do sistema, junta com os locais evitando duplicar id
    const combinados = [...TEMPLATES_PROPOSTA_WHATSAPP]
    for (const sysTpl of sistemaPropostaTpls) {
      if (!combinados.some((c) => c.id === sysTpl.id)) {
        combinados.push(sysTpl)
      }
    }
    return combinados
  }, [whatsAppTemplates])

  // Seleção de um novo template
  const handleSelecionarTemplate = (templateId: string) => {
    setTemplateAtivoId(templateId)
    const tpl = listaTemplates.find((t) => t.id === templateId)
    if (tpl) {
      const novaMensagem = aplicarPlaceholdersProposta(tpl.conteudo, contexto)
      setMensagem(novaMensagem)
    }
  }

  // Manipulador para anexar proposta do computador (PDF gerado)
  const handleArquivoSelecionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setFeedback({
        tipo: 'warning',
        texto: 'Por favor, selecione um arquivo em formato PDF (.pdf).',
      })
      return
    }

    // Limite de 16MB
    if (file.size > 16 * 1024 * 1024) {
      setFeedback({
        tipo: 'error',
        texto: 'O arquivo selecionado excede o limite de 16MB suportado pelo WhatsApp.',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (!dataUrl) return
      // Converte data:application/pdf;base64,.... para apenas base64 puro se necessário
      const base64Limpo = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl

      setAnexoManual({
        file,
        nome: file.name,
        base64: base64Limpo,
        tamanhoBytes: file.size,
      })
      // Ativa inclusão do PDF
      setIncluirPdf(true)
      setNomeArquivo(file.name)
      setFeedback({
        tipo: 'success',
        texto: `Proposta "${file.name}" anexada com sucesso do seu computador!`,
      })
    }
    reader.onerror = () => {
      setFeedback({
        tipo: 'error',
        texto: 'Não foi possível ler o arquivo PDF selecionado.',
      })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoverAnexoManual = () => {
    setAnexoManual(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // Restaura o nome de arquivo padrão se o PDF gerado estiver disponível
    const safeNome = (cliente?.nome || 'Cliente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
    const revNum = orcamento.numero_revisao || 1
    setNomeArquivo(`Proposta-Solar-Delfos-${safeNome}-Rev${revNum}.pdf`)
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

    await executarEnvio()
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSafeClose()
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden max-h-[92vh]"
      >
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
            type="button"
            onClick={handleSafeClose}
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
              <div className="flex-1 leading-relaxed">
                <p>{feedback.texto}</p>
                {feedback.tipo === 'error' && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSending || isGeneratingPdf}
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
              {listaTemplates.map((tpl) => {
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

            {origemDestino === 'contato_adicional_whatsapp' && (
              <div className="mt-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 flex items-center gap-1.5 font-medium">
                <span className="font-bold">Contato adicional:</span>
                <span>{contatoAdicionalNome || 'Contato com WhatsApp'}</span>
                <span className="text-blue-600">(utilizado como alternativa)</span>
              </div>
            )}
            {origemDestino === 'cliente_telefone' && (
              <div className="mt-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-1.5">
                <span>Usando telefone do cliente (sem WhatsApp cadastrado).</span>
              </div>
            )}
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

          {/* Anexo da Proposta em PDF */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Anexo da Proposta em PDF
                </span>
              </div>
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={incluirPdf}
                  onChange={(e) => setIncluirPdf(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Enviar com arquivo anexo</span>
              </label>
            </div>

            {/* Input oculto para anexar do computador */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleArquivoSelecionado}
            />

            {anexoManual ? (
              // Exibe arquivo anexado manualmente pelo usuário do computador
              <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                    <FileCheck className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                      <span className="truncate">{anexoManual.nome}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        Do computador
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {(anexoManual.tamanhoBytes / 1024).toFixed(0)} KB • Pronto para envio
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoverAnexoManual}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remover anexo do computador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              // Exibe PDF gerado ou opção para anexar do computador
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">
                      {nomeArquivo || 'Proposta-Solar-Delfos.pdf'}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      {base64Doc ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          PDF Oficial gerado automaticamente
                        </span>
                      ) : isGeneratingPdf ? (
                        <span className="text-gray-500 inline-flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Gerando PDF oficial...
                        </span>
                      ) : (
                        <span className="text-amber-600">PDF pendente de anexo</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Anexar PDF do computador</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Aviso se PDF falhar e não houver anexo */}
          {!anexoManual && !base64Doc && !isGeneratingPdf && incluirPdf && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Nenhum PDF gerado automaticamente. Clique em &quot;Anexar PDF do computador&quot;
                para enviar a proposta que você acabou de gerar ou desmarque o envio de anexo.
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
                onClick={handleSafeClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  isSending ||
                  (isGeneratingPdf && !anexoManual) ||
                  !validacaoNumero.valido ||
                  (incluirPdf && !anexoManual && !base64Doc)
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
