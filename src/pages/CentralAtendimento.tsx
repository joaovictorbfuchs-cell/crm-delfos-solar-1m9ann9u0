import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  MessageSquare,
  Users,
  CheckCircle2,
  Search,
  UserPlus,
  RefreshCw,
  Phone,
  Settings,
  Bell,
  BellOff,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { ModalVincularCliente } from '@/components/ModalVincularCliente'
import { ModalGerenciarWhatsAppTemplates } from '@/components/ModalGerenciarWhatsAppTemplates'
import { ModalCadastrarLeadWhatsApp } from '@/components/ModalCadastrarLeadWhatsApp'
import { ModalCadastrarOutroContatoWhatsApp } from '@/components/ModalCadastrarOutroContatoWhatsApp'
import { ConversaChatView } from '@/components/ConversaChatView'
import { useToast } from '@/hooks/use-toast'
import type { WhatsAppConversa, OutroContatoTipo, ProdutoTipo } from '@/types/crm'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, UserCheck, Building2 } from 'lucide-react'
import { formatWhatsAppPhone } from '@/lib/formatters'
import {
  playWhatsAppNotificationSound,
  isDesktopNotificationSupported,
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  showWhatsAppDesktopNotification,
} from '@/lib/whatsappAudioNotification'

export const CentralAtendimento: React.FC = () => {
  const {
    whatsAppConversas,
    whatsAppMensagens,
    clientes,
    refreshConversas,
    vincularConversa,
    cadastrarLeadDeConversa,
    cadastrarOutroContatoDeConversa,
  } = useClientes()

  const { user } = useAuth()
  const { toast } = useToast()

  // Polling automático a cada 15 segundos conforme solicitado
  useEffect(() => {
    const interval = setInterval(() => {
      refreshConversas().catch((err) =>
        console.warn('Falha no polling da central de atendimento:', err),
      )
    }, 15000)
    return () => clearInterval(interval)
  }, [refreshConversas])

  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null)
  const [conversaParaVincular, setConversaParaVincular] = useState<WhatsAppConversa | null>(null)
  const [conversaParaNovoLead, setConversaParaNovoLead] = useState<WhatsAppConversa | null>(null)
  const [conversaParaOutroContato, setConversaParaOutroContato] = useState<WhatsAppConversa | null>(
    null,
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [modalTemplatesOpen, setModalTemplatesOpen] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState<'novos' | 'atendimento' | 'resolvidos'>(
    'novos',
  )

  // Preferência de notificações sonoras e desktop persistida em localStorage
  const [notificacoesAtivas, setNotificacoesAtivas] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('delfos_whatsapp_notificacoes')
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  // Salvar no localStorage quando o toggle mudar
  const handleToggleNotificacoes = async () => {
    const novoValor = !notificacoesAtivas
    setNotificacoesAtivas(novoValor)
    try {
      localStorage.setItem('delfos_whatsapp_notificacoes', String(novoValor))
    } catch {
      /* intentionally ignored */
    }

    // Ao ativar, se suporte a desktop notification existir e permissão estiver em default, pedir permissão
    if (novoValor && isDesktopNotificationSupported()) {
      const perm = getDesktopNotificationPermission()
      if (perm === 'default') {
        await requestDesktopNotificationPermission()
      }
    }
  }

  // Rastreamento de mensagens já notificadas para não repetir nem disparar na carga inicial
  const notifiedIdsRef = useRef<Set<string>>(new Set())
  const isInitialLoadRef = useRef(true)

  // Monitorar chegada de novas mensagens recebidas de clientes para emitir som e notificação desktop
  useEffect(() => {
    // Se for a primeira carga da página, popular a lista de conhecidos sem disparar alertas
    if (isInitialLoadRef.current) {
      if (whatsAppMensagens.length > 0 || whatsAppConversas.length > 0) {
        whatsAppMensagens.forEach((m) => {
          notifiedIdsRef.current.add(m.id)
          if (m.id_externo_gateway) notifiedIdsRef.current.add(m.id_externo_gateway)
        })
        isInitialLoadRef.current = false
      }
      return
    }

    if (!notificacoesAtivas) return

    // Encontrar mensagens recebidas de clientes que ainda não foram notificadas
    const novasRecebidas = whatsAppMensagens.filter((m) => {
      // Notificar apenas mensagens recebidas (vindas do cliente), nunca enviadas pelo próprio atendente
      if (m.direcao !== 'recebida') return false
      if (notifiedIdsRef.current.has(m.id)) return false
      if (m.id_externo_gateway && notifiedIdsRef.current.has(m.id_externo_gateway)) return false
      return true
    })

    if (novasRecebidas.length > 0) {
      // Disparar o som via Web Audio API (apenas uma vez para o lote)
      playWhatsAppNotificationSound()

      // Disparar notificação desktop para as novas mensagens recebidas
      novasRecebidas.forEach((msg) => {
        notifiedIdsRef.current.add(msg.id)
        if (msg.id_externo_gateway) notifiedIdsRef.current.add(msg.id_externo_gateway)

        // Obter identificação do cliente ou telefone
        let nomeOuTelefone = formatWhatsAppPhone(msg.telefone_destino)
        if (msg.cliente_id) {
          const cli = clientes.find((c) => c.id === msg.cliente_id)
          if (cli?.nome) nomeOuTelefone = cli.nome
        } else if (msg.conversa_id) {
          const conv = whatsAppConversas.find((c) => c.id === msg.conversa_id)
          if (conv?.cliente_id) {
            const cli = clientes.find((c) => c.id === conv.cliente_id)
            if (cli?.nome) nomeOuTelefone = cli.nome
          }
        }

        const preview = msg.conteudo_final || 'Nova mensagem de WhatsApp'

        showWhatsAppDesktopNotification({
          title: 'Nova mensagem de WhatsApp',
          clientNameOrPhone: nomeOuTelefone,
          messagePreview: preview,
          onClick: () => {
            if (msg.conversa_id) {
              setSelectedConversaId(msg.conversa_id)
            }
          },
        })
      })
    }
  }, [whatsAppMensagens, whatsAppConversas, clientes, notificacoesAtivas])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshConversas()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Mapa de clientes para lookup rápido por ID
  const clientesMap = useMemo(() => {
    const map = new Map<string, (typeof clientes)[0]>()
    clientes.forEach((c) => map.set(c.id, c))
    return map
  }, [clientes])

  // Separar conversas nas 3 colunas especificadas
  // 1. Fila de Novos: status === 'novo' (mensagens recebidas ainda não vinculadas a cliente ou pendentes de atendimento)
  // 2. Em Atendimento: status === 'em_atendimento' || status === 'aguardando_cliente'
  // 3. Resolvidos: status === 'resolvido' (finalizadas nas últimas 24 horas, ou resolvidas recentemente)
  const conversasClassificadas = useMemo(() => {
    const rawTerm = searchTerm.trim().toLowerCase()
    const digitsTerm = rawTerm.replace(/\D/g, '')

    const filterFn = (conv: WhatsAppConversa) => {
      if (!rawTerm) return true
      const cli = conv.cliente_id ? clientesMap.get(conv.cliente_id) : null

      // Busca por telefone (suporta com/sem DDI 55, formatado com máscara e somente dígitos)
      const rawNumero = conv.numero || ''
      const numDigits = rawNumero.replace(/\D/g, '')
      const numWithout55 =
        numDigits.startsWith('55') && (numDigits.length === 12 || numDigits.length === 13)
          ? numDigits.slice(2)
          : numDigits
      const formattedNumero = formatWhatsAppPhone(rawNumero).toLowerCase()

      let matchNumero = false
      if (digitsTerm) {
        matchNumero =
          numDigits.includes(digitsTerm) ||
          numWithout55.includes(digitsTerm) ||
          (digitsTerm.startsWith('55') && numDigits.includes(digitsTerm.slice(2)))
      }
      if (!matchNumero) {
        matchNumero = formattedNumero.includes(rawTerm) || rawNumero.toLowerCase().includes(rawTerm)
      }

      // Busca por nome do cliente ou razão social
      const matchNome = Boolean(
        (cli?.nome && cli.nome.toLowerCase().includes(rawTerm)) ||
        (cli?.razao_social && cli.razao_social.toLowerCase().includes(rawTerm)) ||
        (cli?.nome_fantasia && cli.nome_fantasia.toLowerCase().includes(rawTerm)) ||
        (cli?.contato && cli.contato.toLowerCase().includes(rawTerm)),
      )

      // Se o cliente tem telefone cadastrado no perfil, verificar também
      let matchTelefoneCliente = false
      if (cli?.telefone || cli?.whatsapp) {
        const cliTelDigits = (cli.telefone || '').replace(/\D/g, '')
        const cliWhatsDigits = (cli.whatsapp || '').replace(/\D/g, '')
        if (digitsTerm) {
          matchTelefoneCliente =
            cliTelDigits.includes(digitsTerm) || cliWhatsDigits.includes(digitsTerm)
        }
        if (!matchTelefoneCliente) {
          matchTelefoneCliente =
            (cli.telefone || '').toLowerCase().includes(rawTerm) ||
            (cli.whatsapp || '').toLowerCase().includes(rawTerm)
        }
      }

      // Busca por preview da última mensagem
      const matchPreview = Boolean(
        conv.ultima_mensagem_preview &&
        conv.ultima_mensagem_preview.toLowerCase().includes(rawTerm),
      )

      // Busca por nome do atendente
      const matchAtendente = Boolean(
        conv.atendente && conv.atendente.toLowerCase().includes(rawTerm),
      )

      return matchNumero || matchNome || matchTelefoneCliente || matchPreview || matchAtendente
    }

    const agora = Date.now()
    const limite24h = agora - 24 * 60 * 60 * 1000

    const novos = whatsAppConversas
      .filter((c) => c.status === 'novo' && filterFn(c))
      .sort(
        (a, b) =>
          new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime(),
      )

    const emAtendimento = whatsAppConversas
      .filter(
        (c) => (c.status === 'em_atendimento' || c.status === 'aguardando_cliente') && filterFn(c),
      )
      .sort(
        (a, b) =>
          new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime(),
      )

    const resolvidos = whatsAppConversas
      .filter((c) => {
        if (c.status !== 'resolvido') return false
        if (!filterFn(c)) return false
        if (c.resolvida_em) {
          return new Date(c.resolvida_em).getTime() >= limite24h
        }
        return new Date(c.updated || c.created).getTime() >= limite24h
      })
      .sort(
        (a, b) =>
          new Date(b.resolvida_em || b.updated).getTime() -
          new Date(a.resolvida_em || a.updated).getTime(),
      )

    return { novos, emAtendimento, resolvidos }
  }, [whatsAppConversas, searchTerm, clientesMap])

  // Conversa ativa selecionada
  const selectedConversa = useMemo(() => {
    if (!selectedConversaId) return null
    return whatsAppConversas.find((c) => c.id === selectedConversaId) || null
  }, [whatsAppConversas, selectedConversaId])

  const selectedCliente = useMemo(() => {
    if (!selectedConversa?.cliente_id) return null
    return clientesMap.get(selectedConversa.cliente_id) || null
  }, [selectedConversa, clientesMap])

  // Tempo relativo desde a última resposta
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Recente'
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'Agora mesmo'
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`
    if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`
    return `${Math.floor(diff / 86400)} d atrás`
  }

  // Vincular ação
  const handleVincularCliente = async (clienteId: string) => {
    if (!conversaParaVincular) return
    try {
      const atendenteNome = user?.name || user?.email || 'João Silva'
      await vincularConversa(conversaParaVincular.id, clienteId, atendenteNome)
      setSelectedConversaId(conversaParaVincular.id)
      setConversaParaVincular(null)
      toast({
        title: 'Conversa vinculada com sucesso',
        description: 'A conversa foi associada ao cliente e movida para "Em Atendimento".',
      })
    } catch (err: unknown) {
      console.error('Erro ao vincular conversa:', err)
      toast({
        title: 'Erro ao vincular conversa',
        description: err instanceof Error ? err.message : 'Não foi possível vincular a conversa.',
        variant: 'destructive',
      })
    }
  }

  // Cadastrar Novo Lead a partir de conversa da fila de novos
  const handleCadastrarNovoLead = async (data: {
    nome: string
    telefone: string
    email?: string
    cpf?: string
    endereco?: string
    produto: ProdutoTipo
    origem_lead: import('@/types/crm').OrigemLeadTipo
  }) => {
    if (!conversaParaNovoLead) return
    try {
      const atendenteNome = user?.name || user?.email || 'João Silva'
      const res = await cadastrarLeadDeConversa(
        conversaParaNovoLead.id,
        data,
        atendenteNome,
        user?.id,
      )
      setSelectedConversaId(res.conversa.id)
      setConversaParaNovoLead(null)
      toast({
        title: 'Lead cadastrado com sucesso!',
        description: `${data.nome} foi cadastrado como cliente e o atendimento foi iniciado.`,
      })
    } catch (err: unknown) {
      console.error('Erro ao cadastrar lead a partir do WhatsApp:', err)
      toast({
        title: 'Erro ao cadastrar lead',
        description: err instanceof Error ? err.message : 'Falha ao cadastrar o novo lead.',
        variant: 'destructive',
      })
      throw err
    }
  }

  // Cadastrar Outro Contato a partir de conversa da fila de novos
  const handleCadastrarOutroContato = async (data: {
    nome: string
    telefone: string
    tipo_contato: OutroContatoTipo
    observacao?: string
  }) => {
    if (!conversaParaOutroContato) return
    try {
      await cadastrarOutroContatoDeConversa(conversaParaOutroContato.id, data)
      if (selectedConversaId === conversaParaOutroContato.id) {
        setSelectedConversaId(null)
      }
      setConversaParaOutroContato(null)
      toast({
        title: 'Contato registrado com sucesso',
        description: `Contato "${data.nome}" (${data.tipo_contato}) salvo. A conversa foi removida da Fila de Novos.`,
      })
    } catch (err: unknown) {
      console.error('Erro ao cadastrar outro contato:', err)
      toast({
        title: 'Erro ao cadastrar contato',
        description: err instanceof Error ? err.message : 'Falha ao salvar contato.',
        variant: 'destructive',
      })
      throw err
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de Ferramentas Compacta */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white px-3.5 py-2.5 rounded-xl border border-gray-200 shadow-2xs">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[200px] max-w-xs sm:w-56">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por telefone, cliente ou mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 focus:bg-white border border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
          />
        </div>

        {/* Ações da Barra de Ferramentas */}
        <div className="flex items-center gap-2">
          {/* Toggle de Notificações Sonoras e Desktop */}
          <button
            type="button"
            onClick={handleToggleNotificacoes}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs ${
              notificacoesAtivas
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-200'
            }`}
            title={
              notificacoesAtivas
                ? 'Notificações sonoras e desktop ativadas (Clique para desativar)'
                : 'Notificações desativadas (Clique para ativar alertas de novas mensagens)'
            }
            aria-label={
              notificacoesAtivas
                ? 'Desativar notificações de novas mensagens'
                : 'Ativar notificações de novas mensagens'
            }
          >
            {notificacoesAtivas ? (
              <>
                <Bell className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Notificações</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-gray-400" />
                <span className="hidden sm:inline">Silenciado</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors shadow-2xs"
            title="Atualizar lista de conversas agora"
            aria-label="Atualizar lista de conversas"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}
            />
          </button>

          {/* Botão de Templates & Configurações de WhatsApp */}
          <button
            type="button"
            onClick={() => setModalTemplatesOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-all shadow-2xs"
            title="Gerenciar templates e credenciais de integração"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Templates & Gateway</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Navegação por 3 colunas e Área de Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* Coluna de Atendimentos / Listas */}
        <div
          className={`${selectedConversa ? 'hidden lg:block lg:col-span-5 xl:col-span-4' : 'col-span-12 lg:col-span-5 xl:col-span-4'} flex flex-col space-y-4`}
        >
          {/* Tabs Mobile */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl lg:hidden">
            <button
              type="button"
              onClick={() => setActiveMobileTab('novos')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeMobileTab === 'novos'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-600'
              }`}
            >
              Fila de Novos ({conversasClassificadas.novos.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab('atendimento')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeMobileTab === 'atendimento'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-600'
              }`}
            >
              Em Atendimento ({conversasClassificadas.emAtendimento.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab('resolvidos')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeMobileTab === 'resolvidos'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-600'
              }`}
            >
              Resolvidos ({conversasClassificadas.resolvidos.length})
            </button>
          </div>

          {/* Desktop: Visualizador em Abas / 3 Grupos de Conversas */}
          <div className="space-y-4">
            {/* 1. FILA DE NOVOS */}
            <div className={`space-y-2.5 ${activeMobileTab !== 'novos' ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Fila de Novos
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                    {conversasClassificadas.novos.length}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Aguardando vinculação/atendimento</span>
              </div>

              {conversasClassificadas.novos.length === 0 ? (
                <div className="p-4 bg-white rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                  Nenhuma mensagem nova pendente na fila.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {conversasClassificadas.novos.map((conv) => {
                    const isSelected = selectedConversaId === conv.id
                    const cli = conv.cliente_id ? clientesMap.get(conv.cliente_id) : null

                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversaId(conv.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                            : 'bg-white hover:bg-gray-50 border-gray-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-gray-900 truncate">
                                {cli ? cli.nome : formatWhatsAppPhone(conv.numero)}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                {formatWhatsAppPhone(conv.numero)}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-gray-400">
                              {formatTimeAgo(conv.ultima_mensagem_em || conv.updated)}
                            </span>
                          </div>
                        </div>

                        {/* Preview da Mensagem */}
                        <p className="mt-2 text-xs text-gray-600 line-clamp-2 leading-relaxed bg-gray-50 p-2 rounded-xl border border-gray-100 italic">
                          "{conv.ultima_mensagem_preview || 'Nova mensagem recebida'}"
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                            Número Não Vinculado
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Menu de 3 pontos no card da Fila de Novos */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                                  title="Opções do contato"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 text-xs">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedConversaId(conv.id)
                                    setConversaParaNovoLead(conv)
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-amber-800 font-medium hover:bg-amber-50"
                                >
                                  <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Cadastrar como novo lead</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedConversaId(conv.id)
                                    setConversaParaOutroContato(conv)
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-blue-800 font-medium hover:bg-blue-50"
                                >
                                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Cadastrar como outro contato</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setConversaParaVincular(conv)
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-gray-700 hover:bg-gray-100"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Vincular a cliente existente</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setConversaParaVincular(conv)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors shadow-2xs"
                              title="Vincular a cliente existente"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Vincular</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. EM ATENDIMENTO */}
            <div
              className={`space-y-2.5 ${activeMobileTab !== 'atendimento' ? 'hidden lg:block' : ''}`}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Em Atendimento
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    {conversasClassificadas.emAtendimento.length}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Conversas ativas</span>
              </div>

              {conversasClassificadas.emAtendimento.length === 0 ? (
                <div className="p-4 bg-white rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                  Nenhum atendimento em andamento no momento.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {conversasClassificadas.emAtendimento.map((conv) => {
                    const isSelected = selectedConversaId === conv.id
                    const cli = conv.cliente_id ? clientesMap.get(conv.cliente_id) : null
                    const hasNovaMensagem = Boolean(
                      conv.reaberta_em || (conv.nao_lidas && conv.nao_lidas > 0),
                    )

                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversaId(conv.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white hover:bg-gray-50 border-gray-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                              {cli?.nome ? (
                                cli.nome.substring(0, 2).toUpperCase()
                              ) : (
                                <Users className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-gray-900 truncate flex items-center gap-1.5">
                                <span>{cli?.nome || formatWhatsAppPhone(conv.numero)}</span>
                                {hasNovaMensagem && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-600 text-white">
                                    Nova mensagem
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {conv.atendente ? `Atendendo: ${conv.atendente}` : 'Sem atendente'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-gray-400">
                              {formatTimeAgo(conv.ultima_mensagem_em || conv.updated)}
                            </span>
                          </div>
                        </div>

                        {/* Preview */}
                        <p className="mt-2 text-xs text-gray-600 line-clamp-2 leading-relaxed bg-gray-50 p-2 rounded-xl border border-gray-100">
                          {conv.ultima_mensagem_preview || 'Atendimento em andamento'}
                        </p>

                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                          <span className="font-mono text-[10px] text-emerald-800">
                            {formatWhatsAppPhone(conv.numero)}
                          </span>

                          <span className="capitalize text-[10px] font-semibold text-emerald-700">
                            {conv.status === 'aguardando_cliente'
                              ? 'Aguardando cliente'
                              : 'Em atendimento'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 3. RESOLVIDOS (ÚLTIMAS 24H) */}
            <div
              className={`space-y-2.5 ${activeMobileTab !== 'resolvidos' ? 'hidden lg:block' : ''}`}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Resolvidos (24h)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                    {conversasClassificadas.resolvidos.length}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Finalizadas recentemente</span>
              </div>

              {conversasClassificadas.resolvidos.length === 0 ? (
                <div className="p-4 bg-white rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                  Nenhuma conversa finalizada nas últimas 24 horas.
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {conversasClassificadas.resolvidos.map((conv) => {
                    const isSelected = selectedConversaId === conv.id
                    const cli = conv.cliente_id ? clientesMap.get(conv.cliente_id) : null

                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversaId(conv.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer opacity-85 hover:opacity-100 ${
                          isSelected
                            ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-400/20 shadow-xs'
                            : 'bg-white hover:bg-gray-50 border-gray-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-gray-900 truncate">
                              {cli?.nome || formatWhatsAppPhone(conv.numero)}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              {formatWhatsAppPhone(conv.numero)}
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Resolvido
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs text-gray-500 line-clamp-1 italic">
                          "{conv.ultima_mensagem_preview || 'Atendimento concluído'}"
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Principal: Tela de Chat da Conversa */}
        <div
          className={`${!selectedConversa ? 'hidden lg:flex lg:col-span-7 xl:col-span-8' : 'col-span-12 lg:col-span-7 xl:col-span-8'} flex-col h-[700px]`}
        >
          {selectedConversa ? (
            <ConversaChatView
              conversa={selectedConversa}
              cliente={selectedCliente}
              onBack={() => setSelectedConversaId(null)}
              onOpenVincularModal={() => setConversaParaVincular(selectedConversa)}
              onOpenCadastrarLeadModal={() => setConversaParaNovoLead(selectedConversa)}
              onOpenCadastrarOutroContatoModal={() => setConversaParaOutroContato(selectedConversa)}
            />
          ) : (
            <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-100">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Selecione uma conversa ao lado</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1 leading-relaxed">
                Clique em qualquer atendimento na Fila de Novos, Em Atendimento ou Resolvidos para
                ver o histórico completo, responder via Z-API e aplicar templates rápidos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Vincular Cliente a Conversa Desconhecida */}
      <ModalVincularCliente
        isOpen={Boolean(conversaParaVincular)}
        onClose={() => setConversaParaVincular(null)}
        conversa={conversaParaVincular}
        clientes={clientes}
        onVincular={handleVincularCliente}
      />

      {/* Modal para Cadastrar como Novo Lead a partir do WhatsApp */}
      {conversaParaNovoLead && (
        <ModalCadastrarLeadWhatsApp
          open={Boolean(conversaParaNovoLead)}
          onOpenChange={(open) => !open && setConversaParaNovoLead(null)}
          conversaNumero={conversaParaNovoLead.numero}
          conversaNome={conversaParaNovoLead.numero}
          onSubmit={handleCadastrarNovoLead}
        />
      )}

      {/* Modal para Cadastrar como Outro Contato a partir do WhatsApp */}
      {conversaParaOutroContato && (
        <ModalCadastrarOutroContatoWhatsApp
          open={Boolean(conversaParaOutroContato)}
          onOpenChange={(open) => !open && setConversaParaOutroContato(null)}
          conversaNumero={conversaParaOutroContato.numero}
          conversaNome={conversaParaOutroContato.numero}
          onSubmit={handleCadastrarOutroContato}
        />
      )}

      {/* Modal Global de Templates e Gateway WhatsApp */}
      <ModalGerenciarWhatsAppTemplates
        isOpen={modalTemplatesOpen}
        onClose={() => setModalTemplatesOpen(false)}
      />
    </div>
  )
}
