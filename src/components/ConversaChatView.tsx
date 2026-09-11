import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Send,
  User,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  Sparkles,
  CheckCheck,
  Check,
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  X,
  FileDown,
  Paperclip,
} from 'lucide-react'
import type { WhatsAppConversa, WhatsAppMensagem, Cliente, WhatsAppTemplate } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime, formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'

// Formata data e horário para exibição compacta na mesma linha:
// "14:32" se hoje, ou "11/09 14:32" se em data anterior
function formatHorarioMensagem(dateString?: string | null): string {
  if (!dateString) return ''
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return ''
    const now = new Date()
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()

    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const horaFormatada = `${hours}:${minutes}`

    if (isToday) {
      return horaFormatada
    }
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${day}/${month} ${horaFormatada}`
  } catch {
    return ''
  }
}

interface ConversaChatViewProps {
  conversa: WhatsAppConversa
  cliente?: Cliente | null
  onBack?: () => void
  onOpenVincularModal?: () => void
}

export const ConversaChatView: React.FC<ConversaChatViewProps> = ({
  conversa,
  cliente,
  onBack,
  onOpenVincularModal,
}) => {
  const {
    whatsAppTemplates,
    whatsAppMensagens,
    sendWhatsAppMessage,
    assumirAtendimento,
    finalizarAtendimento,
    orcamentosSolar,
    openFichaCliente,
  } = useClientes()

  const { user } = useAuth()
  const [mensagemTexto, setMensagemTexto] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [statusActionLoading, setStatusActionLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(
    null,
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Mensagens filtradas desta conversa (ou número/cliente correspondente)
  // Ordenadas da mais nova para a mais antiga (mais novas no topo)
  const mensagensConversa = useMemo(() => {
    return whatsAppMensagens
      .filter((m) => {
        if (m.conversa_id && m.conversa_id === conversa.id) return true
        if (cliente && m.cliente_id === cliente.id) return true
        if (m.telefone_destino && conversa.numero) {
          const mTel = m.telefone_destino.replace(/\D/g, '')
          const cTel = conversa.numero.replace(/\D/g, '')
          return (
            mTel === cTel ||
            (mTel.length >= 8 && cTel.endsWith(mTel.slice(-8))) ||
            (cTel.length >= 8 && mTel.endsWith(cTel.slice(-8)))
          )
        }
        return false
      })
      .sort((a, b) => {
        const timeA = new Date(a.enviado_em || a.created).getTime()
        const timeB = new Date(b.enviado_em || b.created).getTime()
        return timeB - timeA // Mais novas primeiro (topo)
      })
  }, [whatsAppMensagens, conversa.id, conversa.numero, cliente])

  // Ao trocar de conversa ou receber/enviar nova mensagem, garantir visualização no topo
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = 0
    }
  }, [conversa.id, mensagensConversa.length])

  // Obter último orçamento do cliente para preencher variáveis de template
  const ultimoOrcamento = useMemo(() => {
    if (!cliente) return null
    const list = orcamentosSolar.filter((o) => o.cliente_id === cliente.id)
    return list.length > 0 ? list[0] : null
  }, [orcamentosSolar, cliente])

  // Aplicar template com substituição das variáveis do cliente
  const handleAplicarTemplate = (tpl: WhatsAppTemplate) => {
    let texto = tpl.conteudo
    const nomeCliente = cliente?.nome || 'Cliente'
    texto = texto.replace(/\{\{nome_cliente\}\}/g, nomeCliente)

    const valorNum = ultimoOrcamento?.valor_investimento || cliente?.valor_estimado || 0
    const valorStr = valorNum > 0 ? formatCurrency(valorNum) : 'sob consulta'
    texto = texto.replace(/\{\{valor_proposta\}\}/g, valorStr)

    const enderecoFormatado =
      [cliente?.endereco, cliente?.numero, cliente?.cidade].filter(Boolean).join(', ') ||
      cliente?.cidade ||
      'endereço cadastrado'
    texto = texto.replace(/\{\{endereco\}\}/g, enderecoFormatado)

    const dataAtual = new Date().toLocaleDateString('pt-BR')
    texto = texto.replace(/\{\{data\}\}/g, dataAtual)

    setMensagemTexto(texto)
    setSelectedTemplateId(tpl.id)
  }

  // Ação: Assumir Atendimento
  const handleAssumir = async () => {
    setStatusActionLoading(true)
    try {
      const atendenteNome = user?.name || user?.email || 'Atendente'
      await assumirAtendimento(conversa.id, atendenteNome, user?.id)
    } catch (err) {
      console.error('Erro ao assumir atendimento:', err)
    } finally {
      setStatusActionLoading(false)
    }
  }

  // Ação: Finalizar Atendimento
  const handleFinalizar = async () => {
    if (
      !window.confirm(
        'Deseja realmente finalizar este atendimento? A conversa será movida para Resolvidos.',
      )
    ) {
      return
    }
    setStatusActionLoading(true)
    try {
      await finalizarAtendimento(conversa.id)
    } catch (err) {
      console.error('Erro ao finalizar atendimento:', err)
    } finally {
      setStatusActionLoading(false)
    }
  }

  // Enviar Mensagem Manual
  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const msg = mensagemTexto.trim()
    if (!msg || isSending) return

    setIsSending(true)
    setFeedback(null)

    try {
      const res = await sendWhatsAppMessage({
        cliente_id: cliente?.id || undefined,
        conversa_id: conversa.id,
        telefone_destino: conversa.numero,
        conteudo_final: msg,
        template_id: selectedTemplateId || undefined,
        tipo_disparo: 'manual',
      })

      if (res.ok) {
        setMensagemTexto('')
        setSelectedTemplateId('')
      } else {
        setFeedback({
          tipo: 'error',
          texto: res.message || 'Erro ao enviar mensagem pelo WhatsApp',
        })
      }
    } catch (err: unknown) {
      console.error('Erro ao enviar mensagem:', err)
      setFeedback({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Falha no envio da mensagem',
      })
    } finally {
      setIsSending(false)
    }
  }

  // Render da badge de status da conversa
  const renderStatusBadge = () => {
    switch (conversa.status) {
      case 'novo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Fila de Novos
          </span>
        )
      case 'em_atendimento':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Em Atendimento {conversa.reaberta_em ? '(Nova Mensagem)' : ''}
          </span>
        )
      case 'aguardando_cliente':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" />
            Aguardando Cliente
          </span>
        )
      case 'resolvido':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <CheckCircle className="w-3 h-3 text-gray-500" />
            Resolvido
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Top Header: Informações do Cliente e Ações da Conversa */}
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                title="Voltar para lista"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
              {cliente?.nome ? (
                cliente.nome.substring(0, 2).toUpperCase()
              ) : (
                <Phone className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gray-900 truncate">
                  {cliente?.nome || `Número Não Vinculado: ${formatWhatsAppPhone(conversa.numero)}`}
                </h2>
                {renderStatusBadge()}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1 font-mono font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {formatWhatsAppPhone(conversa.numero)}
                </span>

                {conversa.atendente && (
                  <span className="flex items-center gap-1 text-gray-600">
                    <User className="w-3 h-3 text-gray-400" />
                    Atendente: <strong>{conversa.atendente}</strong>
                  </span>
                )}

                {cliente?.usina_endereco && (
                  <span className="flex items-center gap-1 text-gray-600 truncate max-w-xs">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    Usina: {cliente.usina_endereco}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação no Topo */}
          <div className="flex items-center gap-2 shrink-0">
            {!cliente && onOpenVincularModal && (
              <button
                type="button"
                onClick={onOpenVincularModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>Vincular a Cliente</span>
              </button>
            )}

            {cliente && (
              <button
                type="button"
                onClick={() => openFichaCliente(cliente.id, 'historico')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors"
                title="Abrir ficha completa do cliente"
              >
                <span>Ficha do Cliente</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}

            {conversa.status === 'novo' && (
              <button
                type="button"
                disabled={statusActionLoading}
                onClick={handleAssumir}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Assumir Atendimento</span>
              </button>
            )}

            {conversa.status !== 'resolvido' && (
              <button
                type="button"
                disabled={statusActionLoading}
                onClick={handleFinalizar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Finalizar</span>
              </button>
            )}
          </div>
        </div>

        {/* Mini barra de contexto do Cliente (quando vinculado) */}
        {cliente && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600 bg-gray-50/70 p-2.5 rounded-xl">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">
                Status CRM
              </span>
              <span className="font-semibold text-gray-800 capitalize">
                {cliente.status || 'Lead'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">
                Local / Cidade
              </span>
              <span className="font-semibold text-gray-800 truncate block">
                {cliente.cidade ? `${cliente.cidade} - ${cliente.estado || 'RS'}` : 'Não informado'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">
                Proposta Solar
              </span>
              <span className="font-semibold text-gray-800 truncate block">
                {ultimoOrcamento
                  ? `${formatCurrency(ultimoOrcamento.valor_investimento)} (${ultimoOrcamento.potencia_pico_kwp || 0} kWp)`
                  : 'Sem orçamento'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">
                Próximo Passo
              </span>
              <span className="font-semibold text-emerald-800 truncate block">
                {cliente.proximo_passo || 'Acompanhar negociação'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Histórico de Mensagens (Chat Scrollable) */}
      <div
        ref={chatScrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 bg-slate-50/60"
      >
        {mensagensConversa.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 mb-2 shadow-2xs">
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-gray-600">
              Nenhuma mensagem registrada ainda nesta conversa.
            </p>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              Envie uma mensagem abaixo usando a integração com a Z-API ou aguarde o contato do
              cliente.
            </p>
          </div>
        ) : (
          mensagensConversa.map((msg) => {
            const isRecebida = msg.direcao === 'recebida' || msg.tipo_disparo === 'webhook'
            const horaFormatada = formatHorarioMensagem(msg.enviado_em || msg.created)
            const dataHoraCompleta = formatDateTime(msg.enviado_em || msg.created)

            // Texto em uma única linha (sem quebra de linha interna)
            const textoUmaLinha = (msg.conteudo_final || '').replace(/\r?\n+/g, ' ').trim()

            return (
              <div
                key={msg.id}
                className={`flex w-full ${isRecebida ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-xl px-3 py-2 shadow-2xs text-xs relative group flex items-center gap-2.5 min-w-0 ${
                    isRecebida
                      ? 'bg-white text-gray-900 border border-gray-200 rounded-tl-xs'
                      : 'bg-emerald-600 text-white rounded-tr-xs'
                  }`}
                  title={dataHoraCompleta ? `Data e hora: ${dataHoraCompleta}` : undefined}
                >
                  {/* Tag / Ação de documento em linha única caso enviado via anexo */}
                  {msg.tipo_mensagem === 'documento' && (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0 ${
                        isRecebida ? 'bg-gray-100 text-gray-800' : 'bg-emerald-700 text-white'
                      }`}
                    >
                      <FileDown className="w-3.5 h-3.5 shrink-0" />
                      <span className="max-w-[140px] truncate">
                        {msg.nome_arquivo || 'Documento'}
                      </span>
                      {msg.documento_url && (
                        <a
                          href={msg.documento_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-[10px] ml-0.5 shrink-0"
                          title="Abrir anexo"
                        >
                          Abrir
                        </a>
                      )}
                    </div>
                  )}

                  {/* Texto principal em linha única com scroll horizontal sem quebra */}
                  <div
                    tabIndex={0}
                    className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin text-xs leading-normal select-text focus:outline-hidden py-0.5"
                    title={msg.conteudo_final || ''}
                  >
                    <span>{textoUmaLinha || (msg.tipo_mensagem === 'documento' ? '' : '—')}</span>
                  </div>

                  {/* Registro de horário + status na mesma linha */}
                  <div
                    className={`shrink-0 flex items-center gap-1.5 text-[11px] font-mono font-medium pl-1.5 border-l ${
                      isRecebida
                        ? 'text-gray-500 border-gray-200'
                        : 'text-emerald-100 border-emerald-500/50'
                    }`}
                  >
                    <span className="whitespace-nowrap">{horaFormatada}</span>
                    {!isRecebida && (
                      <span
                        className="inline-flex items-center shrink-0"
                        title={
                          msg.status === 'entregue'
                            ? 'Entregue'
                            : msg.status === 'enviada'
                              ? 'Enviada'
                              : msg.status === 'falha'
                                ? 'Falha no envio'
                                : 'Pendente / Enviando'
                        }
                      >
                        {msg.status === 'entregue' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                        ) : msg.status === 'enviada' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-200" />
                        ) : msg.status === 'falha' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-emerald-200" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Barra de Templates Rápidos */}
      {whatsAppTemplates.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Templates rápidos:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {whatsAppTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleAplicarTemplate(tpl)}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 hover:border-emerald-300 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shadow-2xs shrink-0"
              >
                {tpl.titulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-t ${
            feedback.tipo === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.texto}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-0.5 hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Caixa de Digitação e Envio */}
      <form onSubmit={handleEnviar} className="p-3 sm:p-4 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <textarea
              rows={2}
              value={mensagemTexto}
              onChange={(e) => setMensagemTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEnviar(e)
                }
              }}
              placeholder={`Responder para ${cliente?.nome || formatWhatsAppPhone(conversa.numero)}... (Enter envia, Shift+Enter pula linha)`}
              className="w-full bg-transparent px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!mensagemTexto.trim() || isSending}
            className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0"
            title="Enviar mensagem pelo WhatsApp via Z-API"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Enviar</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
