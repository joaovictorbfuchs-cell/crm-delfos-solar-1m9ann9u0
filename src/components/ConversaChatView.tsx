import React, { useState, useEffect, useRef, useMemo } from 'react'
import type { WhatsAppMensagemStatus } from '@/types/crm'
import {
  Send,
  User,
  Phone,
  Video,
  MoreVertical,
  CheckCircle,
  Clock,
  Sparkles,
  CheckCheck,
  Check,
  ArrowLeft,
  X,
  FileDown,
  Paperclip,
  Smile,
  ChevronRight,
  UserCheck,
  UserPlus,
  Building2,
  Calendar,
  AlertCircle,
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

// Configuração do ícone e tooltip de status no estilo WhatsApp Web:
// - lida: duplo check azul (#53bdeb) com tooltip "Lida"
// - enviada / entregue: duplo check cinza (#8696a0) com tooltip "Entregue" (padrão WhatsApp)
// - falha: check simples cinza (#8696a0) com tooltip discreto da falha (sem círculo vermelho)
// - agendada: relógio com tooltip "Agendada"
// - pendente/enviando: relógio com tooltip "Enviando"
export function getWhatsAppStatusIconConfig(
  status: WhatsAppMensagemStatus | string | undefined,
  logErro?: string | null,
): {
  iconType: 'double-check' | 'single-check' | 'clock'
  color: string
  tooltip: string
} {
  if (status === 'lida') {
    return {
      iconType: 'double-check',
      color: '#53bdeb',
      tooltip: 'Lida',
    }
  }
  if (status === 'entregue' || status === 'enviada') {
    return {
      iconType: 'double-check',
      color: '#8696a0',
      tooltip: 'Entregue',
    }
  }
  if (status === 'falha') {
    return {
      iconType: 'single-check',
      color: '#8696a0',
      tooltip: logErro ? `Falha no envio: ${logErro}` : 'Falha no envio',
    }
  }
  if (status === 'agendada') {
    return {
      iconType: 'clock',
      color: '#8696a0',
      tooltip: 'Agendada',
    }
  }
  return {
    iconType: 'clock',
    color: '#8696a0',
    tooltip: 'Enviando',
  }
}

// Lista de emojis populares para o mini-picker rápido
const EMOJIS_POPULARES = [
  '👍',
  '👋',
  '☀️',
  '⚡',
  '🤝',
  '😊',
  '✅',
  '📋',
  '📄',
  '💡',
  '💰',
  '📅',
  '📞',
  '🙏',
  '🚀',
  '⭐',
  '🙌',
  '💬',
  '🔧',
  '🏠',
  '📍',
  '🎉',
  '⏳',
  '🔍',
]

interface ConversaChatViewProps {
  conversa: WhatsAppConversa
  cliente?: Cliente | null
  onBack?: () => void
  onOpenVincularModal?: () => void
  onOpenCadastrarLeadModal?: () => void
  onOpenCadastrarOutroContatoModal?: () => void
}

export const ConversaChatView: React.FC<ConversaChatViewProps> = ({
  conversa,
  cliente,
  onBack,
  onOpenVincularModal,
  onOpenCadastrarLeadModal,
  onOpenCadastrarOutroContatoModal,
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false)
  const [callNotice, setCallNotice] = useState(false)

  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const optionsMenuRef = useRef<HTMLDivElement | null>(null)
  const emojiPickerRef = useRef<HTMLDivElement | null>(null)
  const templatesRef = useRef<HTMLDivElement | null>(null)

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false)
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (templatesRef.current && !templatesRef.current.contains(event.target as Node)) {
        setShowTemplatesDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mensagens filtradas desta conversa (ou número/cliente correspondente)
  // Ordenadas da mais nova para a mais antiga (mais novas no topo) conforme decisão de projeto
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
    setShowTemplatesDropdown(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Inserir emoji no campo
  const handleInsertEmoji = (emoji: string) => {
    setMensagemTexto((prev) => prev + emoji)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Ação: Assumir Atendimento
  const handleAssumir = async () => {
    setShowOptionsMenu(false)
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
    setShowOptionsMenu(false)
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
  const handleEnviar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
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
        setShowEmojiPicker(false)
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

  // Status visual / online do cabeçalho WhatsApp
  const contatoSubtitulo = useMemo(() => {
    if (conversa.status === 'em_atendimento') {
      return conversa.atendente ? `online • Atendente: ${conversa.atendente}` : 'online'
    }
    if (conversa.status === 'novo') {
      return 'online • Nova mensagem'
    }
    if (conversa.ultima_mensagem_em) {
      return `visto por último ${formatHorarioMensagem(conversa.ultima_mensagem_em)}`
    }
    return 'disponível no WhatsApp'
  }, [conversa])

  // Identificação do contato para o avatar
  const contatoIniciais = useMemo(() => {
    if (cliente?.nome) {
      const parts = cliente.nome.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return cliente.nome.substring(0, 2).toUpperCase()
    }
    return 'WA'
  }, [cliente])

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] rounded-2xl border border-gray-200 shadow-sm overflow-hidden select-none">
      {/* 1. CABEÇALHO DA CONVERSA (Estilo WhatsApp Web) */}
      <div className="h-16 px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200/80 flex items-center justify-between shrink-0 select-text">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden p-1.5 -ml-1 text-[#54656f] hover:text-[#111b21] hover:bg-black/5 rounded-full transition-colors"
              title="Voltar para lista"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Avatar com inicial / foto */}
          <div
            className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs cursor-pointer select-none"
            onClick={() => cliente && openFichaCliente(cliente.id, 'historico')}
            title={cliente ? `Abrir ficha de ${cliente.nome}` : undefined}
          >
            {contatoIniciais}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                className="text-sm font-semibold text-[#111b21] truncate cursor-pointer hover:underline"
                onClick={() => cliente && openFichaCliente(cliente.id, 'historico')}
                title={cliente?.nome || conversa.numero}
              >
                {cliente?.nome || formatWhatsAppPhone(conversa.numero)}
              </h2>
            </div>
            <p className="text-[12px] text-[#667781] truncate leading-tight">{contatoSubtitulo}</p>
          </div>
        </div>

        {/* Ícones do Cabeçalho: Ligação e Mais Opções */}
        <div className="flex items-center gap-1 shrink-0 text-[#54656f]">
          {/* Botão de Chamada de Vídeo (decorativo/informativo) */}
          <button
            type="button"
            onClick={() => {
              setCallNotice(true)
              setTimeout(() => setCallNotice(false), 3000)
            }}
            className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-black/5 rounded-full transition-colors"
            title="Chamada de vídeo (WhatsApp)"
          >
            <Video className="w-5 h-5" />
          </button>

          {/* Botão de Ligação por Voz (decorativo/informativo) */}
          <button
            type="button"
            onClick={() => {
              setCallNotice(true)
              setTimeout(() => setCallNotice(false), 3000)
            }}
            className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-black/5 rounded-full transition-colors"
            title="Chamada de voz (WhatsApp)"
          >
            <Phone className="w-4.5 h-4.5" />
          </button>

          <div className="h-5 w-px bg-gray-300 mx-1 hidden sm:block" />

          {/* Menu Mais Opções (ações da conversa e CRM) */}
          <div className="relative" ref={optionsMenuRef}>
            <button
              type="button"
              onClick={() => setShowOptionsMenu((prev) => !prev)}
              className={`p-2 rounded-full transition-colors ${
                showOptionsMenu
                  ? 'bg-black/10 text-[#111b21]'
                  : 'text-[#54656f] hover:text-[#111b21] hover:bg-black/5'
              }`}
              title="Mais opções da conversa"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown de opções */}
            {showOptionsMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 text-xs">
                {cliente ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false)
                      openFichaCliente(cliente.id, 'historico')
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-gray-100 flex items-center gap-2.5 text-gray-800 font-medium"
                  >
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Ver ficha completa do cliente</span>
                  </button>
                ) : (
                  !conversa.cliente_id && (
                    <>
                      {onOpenCadastrarLeadModal && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false)
                            onOpenCadastrarLeadModal()
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-amber-50 flex items-center gap-2.5 text-amber-800 font-medium"
                        >
                          <UserPlus className="w-4 h-4 text-amber-600" />
                          <span>Cadastrar como novo lead</span>
                        </button>
                      )}

                      {onOpenCadastrarOutroContatoModal && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false)
                            onOpenCadastrarOutroContatoModal()
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-center gap-2.5 text-blue-800 font-medium"
                        >
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span>Cadastrar como outro contato</span>
                        </button>
                      )}

                      {onOpenVincularModal && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false)
                            onOpenVincularModal()
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-gray-100 flex items-center gap-2.5 text-gray-800 font-medium"
                        >
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span>Vincular a cliente existente</span>
                        </button>
                      )}
                    </>
                  )
                )}

                {conversa.status === 'novo' && (
                  <button
                    type="button"
                    disabled={statusActionLoading}
                    onClick={handleAssumir}
                    className="w-full text-left px-3.5 py-2 hover:bg-gray-100 flex items-center gap-2.5 text-emerald-700 font-medium"
                  >
                    <Check className="w-4 h-4" />
                    <span>Assumir atendimento</span>
                  </button>
                )}

                {conversa.status !== 'resolvido' && (
                  <button
                    type="button"
                    disabled={statusActionLoading}
                    onClick={handleFinalizar}
                    className="w-full text-left px-3.5 py-2 hover:bg-gray-100 flex items-center gap-2.5 text-gray-700 font-medium"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Finalizar atendimento</span>
                  </button>
                )}

                <div className="my-1 border-t border-gray-100" />

                <button
                  type="button"
                  onClick={() => {
                    setShowOptionsMenu(false)
                    setShowTemplatesDropdown(true)
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-100 flex items-center gap-2.5 text-gray-700"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Templates de resposta rápida</span>
                </button>

                <div className="px-3.5 py-1.5 text-[11px] text-gray-400 border-t border-gray-100 mt-1">
                  Número: {formatWhatsAppPhone(conversa.numero)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notificação temporária de chamadas */}
      {callNotice && (
        <div className="bg-[#e7f8f5] border-b border-[#00a884]/20 px-4 py-2 text-xs text-[#00a884] flex items-center justify-between animate-in fade-in">
          <span>
            Chamadas de voz e vídeo são realizadas diretamente pelo aplicativo oficial WhatsApp no
            celular do atendente.
          </span>
          <button
            type="button"
            onClick={() => setCallNotice(false)}
            className="p-0.5 hover:opacity-75 text-[#00a884]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mini banner de cliente vinculado com atalho */}
      {cliente && (
        <div className="bg-[#f7f8fa] border-b border-gray-200/60 px-4 py-1.5 flex items-center justify-between text-[11px] text-[#667781] select-text">
          <div className="flex items-center gap-3 truncate">
            <span className="font-semibold text-gray-800">{cliente.nome}</span>
            {cliente.cidade && (
              <span className="truncate">
                • {cliente.cidade} - {cliente.estado || 'RS'}
              </span>
            )}
            {ultimoOrcamento && (
              <span className="text-emerald-700 font-medium hidden sm:inline">
                • Proposta: {formatCurrency(ultimoOrcamento.valor_investimento)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => openFichaCliente(cliente.id, 'historico')}
            className="text-[#00a884] hover:underline font-medium shrink-0 ml-2"
          >
            Ver Ficha
          </button>
        </div>
      )}

      {/* 2. ÁREA DE MENSAGENS (Fundo com textura WhatsApp Web) */}
      <div
        ref={chatScrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 select-text relative"
        style={{
          backgroundColor: '#efeae2',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='240' height='240' viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20h20v20H20zm40 60h15v15H60zm80-40h20v20h-20zm60 40h15v15h-15zM40 160h20v20H40zm80 20h15v15h-15zm60-20h20v20h-20zm-60-80h20v20h-20zM30 90a10 10 0 1 0 20 0 10 10 0 1 0-20 0zm140 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0zm-70 70a10 10 0 1 0 20 0 10 10 0 1 0-20 0z' fill='%23000000' fill-opacity='0.035' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      >
        {mensagensConversa.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
            <div className="w-12 h-12 rounded-2xl bg-white/80 border border-black/5 flex items-center justify-center text-[#00a884] mb-2 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#111b21]">
              Nenhuma mensagem registrada ainda nesta conversa.
            </p>
            <p className="text-xs text-[#667781] max-w-sm mt-1">
              Envie uma mensagem abaixo usando a integração com a Z-API ou aguarde o contato do
              cliente.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {mensagensConversa.map((msg, idx) => {
              const isRecebida = msg.direcao === 'recebida' || msg.tipo_disparo === 'webhook'
              const horaFormatada = formatHorarioMensagem(msg.enviado_em || msg.created)
              const dataHoraCompleta = formatDateTime(msg.enviado_em || msg.created)

              const conteudoMensagem = msg.conteudo_final || ''

              // Determinar se esta mensagem é a PRIMEIRA mensagem visível de um bloco de remetente (topo do bloco visual)
              // Como a lista tem mensagens mais novas no topo (idx 0 é a mais nova):
              // msg anterior na lista = idx - 1. Se idx === 0 ou o remetente de idx - 1 for diferente, esta é o topo de um bloco!
              const msgAcima = idx > 0 ? mensagensConversa[idx - 1] : null
              const isAcimaRecebida = msgAcima
                ? msgAcima.direcao === 'recebida' || msgAcima.tipo_disparo === 'webhook'
                : null
              const isPrimeiraDoBloco = idx === 0 || isAcimaRecebida !== isRecebida

              // Espaçamento entre mensagens:
              // Menor entre mensagens consecutivas do mesmo remetente (mt-1)
              // Maior ao trocar de remetente (mt-3)
              const margemTopo = idx === 0 ? 'mt-1' : isPrimeiraDoBloco ? 'mt-3' : 'mt-1'

              // Identificação do remetente (ex.: quando necessário ou atendente diferente)
              const nomeRemetente = isRecebida
                ? cliente?.nome || 'Cliente'
                : conversa.atendente || user?.name || 'Delfos Solar'

              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${isRecebida ? 'justify-start' : 'justify-end'} ${margemTopo}`}
                >
                  <div className="relative max-w-[92%] sm:max-w-[85%] min-w-0">
                    {/* Seta / Cauda do balão no estilo WhatsApp (apenas na primeira do bloco) */}
                    {isPrimeiraDoBloco &&
                      (isRecebida ? (
                        <svg
                          className="absolute -left-[8px] top-0 text-white fill-current pointer-events-none drop-shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]"
                          width="8"
                          height="13"
                          viewBox="0 0 8 13"
                        >
                          <path d="M1.533 3.568L8 12.001V0H0c.535 1.05 1.052 2.378 1.533 3.568z" />
                        </svg>
                      ) : (
                        <svg
                          className="absolute -right-[8px] top-0 text-[#d9fdd3] fill-current pointer-events-none drop-shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]"
                          width="8"
                          height="13"
                          viewBox="0 0 8 13"
                        >
                          <path d="M6.467 3.568L0 12.001V0h8c-.535 1.05-1.052 2.378-1.533 3.568z" />
                        </svg>
                      ))}

                    {/* Balão de Mensagem */}
                    <div
                      className={`px-3 py-1.5 text-xs relative rounded-lg min-w-0 max-h-[500px] overflow-y-auto scrollbar-thin shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                        isRecebida
                          ? `bg-white text-[#111b21] ${isPrimeiraDoBloco ? 'rounded-tl-none' : ''}`
                          : `bg-[#d9fdd3] text-[#111b21] ${isPrimeiraDoBloco ? 'rounded-tr-none' : ''}`
                      }`}
                      title={
                        msg.status === 'falha' && msg.log_erro
                          ? `Falha no envio: ${msg.log_erro}`
                          : dataHoraCompleta
                            ? `Data e hora: ${dataHoraCompleta}`
                            : undefined
                      }
                    >
                      {/* Identificação de remetente na primeira mensagem do bloco */}
                      {isPrimeiraDoBloco && (
                        <div
                          className={`font-semibold text-[11px] mb-0.5 select-none ${
                            isRecebida ? 'text-[#1fa855]' : 'text-[#027eb5]'
                          }`}
                        >
                          {nomeRemetente}
                        </div>
                      )}

                      {/* Tag de documento caso enviado via anexo */}
                      {msg.tipo_mensagem === 'documento' && (
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold mb-1 mr-2 ${
                            isRecebida
                              ? 'bg-[#f0f2f5] text-[#111b21]'
                              : 'bg-[#c3f2bc] text-[#111b21]'
                          }`}
                        >
                          <FileDown className="w-3.5 h-3.5 text-[#54656f] shrink-0" />
                          <span className="max-w-[180px] truncate">
                            {msg.nome_arquivo || 'Documento'}
                          </span>
                          {msg.documento_url && (
                            <a
                              href={msg.documento_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#027eb5] underline text-[10px] ml-0.5 shrink-0"
                              title="Abrir anexo"
                            >
                              Abrir
                            </a>
                          )}
                        </div>
                      )}

                      {/* Conteúdo da mensagem com quebra natural de linha e horário compacto ao final */}
                      <div className="text-xs leading-relaxed select-text">
                        <span className="text-[#111b21] whitespace-pre-wrap break-words">
                          {conteudoMensagem || (msg.tipo_mensagem === 'documento' ? '' : '—')}
                        </span>

                        {/* Horário + Ícones de Status WhatsApp inline ao final do texto (mesma linha) */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-sans pl-2 float-right align-bottom select-none translate-y-0.5 ml-1">
                          <span className="text-[#667781] text-[11px] whitespace-nowrap">
                            {horaFormatada}
                          </span>

                          {!isRecebida &&
                            (() => {
                              const statusConfig = getWhatsAppStatusIconConfig(
                                msg.status,
                                msg.log_erro,
                              )
                              return (
                                <span
                                  className="inline-flex items-center shrink-0 ml-0.5"
                                  title={statusConfig.tooltip}
                                >
                                  {statusConfig.iconType === 'double-check' ? (
                                    <CheckCheck
                                      className="w-3.5 h-3.5"
                                      style={{ color: statusConfig.color }}
                                    />
                                  ) : statusConfig.iconType === 'single-check' ? (
                                    <Check
                                      className="w-3.5 h-3.5"
                                      style={{ color: statusConfig.color }}
                                    />
                                  ) : (
                                    <Clock
                                      className="w-3 h-3"
                                      style={{ color: statusConfig.color }}
                                    />
                                  )}
                                </span>
                              )
                            })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Mini-picker simples de emojis comuns */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="bg-white border-t border-gray-200 p-2.5 shadow-md flex flex-wrap gap-1.5 max-h-36 overflow-y-auto"
        >
          {EMOJIS_POPULARES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleInsertEmoji(emoji)}
              className="w-8 h-8 rounded-lg hover:bg-[#f0f2f5] text-lg flex items-center justify-center transition-transform active:scale-90"
              title={`Inserir ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown de Templates Rápidos */}
      {showTemplatesDropdown && whatsAppTemplates.length > 0 && (
        <div
          ref={templatesRef}
          className="bg-white border-t border-gray-200 p-3 shadow-md space-y-2 max-h-48 overflow-y-auto"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1 text-emerald-700">
              <Sparkles className="w-3.5 h-3.5" />
              Templates de Resposta Rápida
            </span>
            <button
              type="button"
              onClick={() => setShowTemplatesDropdown(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {whatsAppTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleAplicarTemplate(tpl)}
                className="px-2.5 py-1.5 bg-[#f0f2f5] hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 hover:border-emerald-300 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
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

      {/* 3. BARRA DE DIGITAÇÃO FULL-WIDTH (Estilo WhatsApp Web) */}
      <form
        onSubmit={handleEnviar}
        className="w-full bg-[#f0f2f5] px-3 py-2 border-t border-gray-200/80 flex items-center gap-2 shrink-0 select-text"
      >
        {/* Ícone de Emoji à esquerda */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className={`p-2 rounded-full transition-colors ${
            showEmojiPicker
              ? 'bg-black/10 text-[#00a884]'
              : 'text-[#54656f] hover:text-[#111b21] hover:bg-black/5'
          }`}
          title="Inserir emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Ícone de Anexo à esquerda */}
        <button
          type="button"
          onClick={() => {
            // Se houver templates, dá atalho também
            setShowTemplatesDropdown((prev) => !prev)
          }}
          className={`p-2 rounded-full transition-colors ${
            showTemplatesDropdown
              ? 'bg-black/10 text-[#00a884]'
              : 'text-[#54656f] hover:text-[#111b21] hover:bg-black/5'
          }`}
          title="Anexar arquivo ou usar template rápido"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Campo de Texto centralizado */}
        <div className="flex-1 min-w-0 bg-white rounded-lg border border-transparent focus-within:border-transparent shadow-2xs px-3 py-2 flex items-center">
          <textarea
            ref={textareaRef}
            rows={1}
            value={mensagemTexto}
            onChange={(e) => setMensagemTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleEnviar()
              }
            }}
            placeholder="Mensagem"
            className="w-full bg-transparent text-sm text-[#111b21] placeholder-[#8696a0] resize-none outline-none max-h-24 leading-normal"
          />
        </div>

        {/* Botão de Enviar (Avião de Papel / lucide-send) à direita */}
        <button
          type="submit"
          disabled={!mensagemTexto.trim() || isSending}
          className="p-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 disabled:hover:bg-[#00a884] disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors shadow-2xs shrink-0"
          title="Enviar mensagem (Enter)"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  )
}
