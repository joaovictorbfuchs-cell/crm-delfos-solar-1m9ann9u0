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
  Database,
  X,
  FileSpreadsheet,
  DownloadCloud,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { ModalVincularCliente } from '@/components/ModalVincularCliente'
import { ModalGerenciarWhatsAppTemplates } from '@/components/ModalGerenciarWhatsAppTemplates'
import { ModalCadastrarLeadWhatsApp } from '@/components/ModalCadastrarLeadWhatsApp'
import { ModalCadastrarOutroContatoWhatsApp } from '@/components/ModalCadastrarOutroContatoWhatsApp'
import { ConversaChatView } from '@/components/ConversaChatView'
import { useToast } from '@/hooks/use-toast'
import type {
  WhatsAppConversa,
  OutroContatoTipo,
  ProdutoTipo,
  Cliente,
  ContatoAdicional,
  OutroContato,
} from '@/types/crm'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { MoreVertical, UserCheck, Building2, Ban } from 'lucide-react'
import { formatWhatsAppPhone, cleanPhoneDigits } from '@/lib/formatters'
import { fetchOutrosContatos, createWhatsAppConversa } from '@/services/crmService'
import { fetchContatosUnicos } from '@/services/contatosService'
import {
  casarRemetenteComContatos,
  normalizarNumeroWhatsApp,
  compararTelefonesFlexivel,
} from '@/lib/reconhecimentoRemetenteWhatsApp'
import {
  resolverNumeroDestinoCliente,
  MENSAGEM_ALERTA_SEM_NUMERO,
} from '@/lib/resolverNumeroDestinoCliente'
import {
  playWhatsAppNotificationSound,
  isDesktopNotificationSupported,
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  showWhatsAppDesktopNotification,
} from '@/lib/whatsappAudioNotification'
import { exportarPlanilhaCentralAtendimento } from '@/lib/exportCentralAtendimentoXlsx'

export const CentralAtendimento: React.FC = () => {
  const navigate = useNavigate()
  const {
    whatsAppConversas,
    whatsAppMensagens,
    clientes,
    contatosAdicionais,
    refreshConversas,
    vincularConversa,
    cadastrarLeadDeConversa,
    cadastrarOutroContatoDeConversa,
    isNumeroBloqueado,
    refreshWhatsAppBloqueados,
    bloquearContato,
  } = useClientes()

  const { user } = useAuth()
  const { toast } = useToast()

  // Contatos bloqueados: garantir lista sincronizada ao montar a tela para o filtro de conversas
  useEffect(() => {
    refreshWhatsAppBloqueados().catch((err) =>
      console.warn('Falha ao carregar contatos bloqueados na Central:', err),
    )
  }, [refreshWhatsAppBloqueados])

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
  const [conversaParaBloquear, setConversaParaBloquear] = useState<WhatsAppConversa | null>(null)
  const [motivoBloqueio, setMotivoBloqueio] = useState('')
  const [isBloqueando, setIsBloqueando] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [modalTemplatesOpen, setModalTemplatesOpen] = useState(false)
  const [isStartingConversa, setIsStartingConversa] = useState(false)
  const [isExportingPlanilha, setIsExportingPlanilha] = useState(false)
  const [outrosContatosLista, setOutrosContatosLista] = useState<OutroContato[]>([])
  const [contatosUnicosLista, setContatosUnicosLista] = useState<
    import('@/types/crm').ContatoUnico[]
  >([])
  const [activeMobileTab, setActiveMobileTab] = useState<'novos' | 'atendimento' | 'resolvidos'>(
    'novos',
  )

  // Carregar outros_contatos e contatos da coleção unificada uma vez ao montar a tela para busca rápida
  useEffect(() => {
    let mounted = true
    Promise.allSettled([fetchOutrosContatos(), fetchContatosUnicos()])
      .then(([outrosRes, unicosRes]) => {
        if (!mounted) return
        if (outrosRes.status === 'fulfilled' && Array.isArray(outrosRes.value)) {
          setOutrosContatosLista(outrosRes.value)
        } else {
          setOutrosContatosLista([])
        }
        if (unicosRes.status === 'fulfilled' && Array.isArray(unicosRes.value)) {
          setContatosUnicosLista(unicosRes.value)
        } else {
          setContatosUnicosLista([])
        }
      })
      .catch((err) => {
        console.warn('Não foi possível pré-carregar contatos para busca:', err)
        if (mounted) {
          setOutrosContatosLista([])
          setContatosUnicosLista([])
        }
      })
    return () => {
      mounted = false
    }
  }, [])

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

  // Exportar planilha Excel (.xlsx) da Central de Atendimento
  const handleExportarPlanilha = async () => {
    setIsExportingPlanilha(true)
    try {
      const resultado = exportarPlanilhaCentralAtendimento({
        clientes: Array.isArray(clientes) ? clientes : [],
        contatosAdicionais: Array.isArray(contatosAdicionais) ? contatosAdicionais : [],
        outrosContatos: Array.isArray(outrosContatosLista) ? outrosContatosLista : [],
        conversasWhatsApp: Array.isArray(whatsAppConversas) ? whatsAppConversas : [],
      })

      toast({
        title: 'Planilha exportada com sucesso!',
        description: `${resultado.totalExportados} contatos na Base Completa. Abas: Repetidos (${resultado.totalRepetidos}), Erros (${resultado.totalErrosDigitacao}), Testes (${resultado.totalDadosTeste}), Sem fone (${resultado.totalSemTelefone}).`,
      })
    } catch (err: unknown) {
      console.error('Erro ao exportar planilha da Central de Atendimento:', err)
      toast({
        title: 'Erro ao exportar planilha',
        description:
          err instanceof Error
            ? err.message
            : 'Não foi possível gerar o arquivo Excel da Central de Atendimento.',
        variant: 'destructive',
      })
    } finally {
      setIsExportingPlanilha(false)
    }
  }

  // Normalizador de texto para busca insensível a acentuação e caracteres especiais
  const normalizeSearchText = (str?: string | null): string => {
    if (!str) return ''
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  // Mapa de clientes para lookup rápido por ID
  const clientesMap = useMemo(() => {
    const map = new Map<string, (typeof clientes)[0]>()
    if (!Array.isArray(clientes)) return map
    clientes.forEach((c) => {
      if (c && c.id) map.set(c.id, c)
    })
    return map
  }, [clientes])

  // Separar conversas nas 3 colunas especificadas
  // 1. Fila de Novos: status === 'novo' (mensagens recebidas ainda não vinculadas a cliente ou pendentes de atendimento)
  // 2. Em Atendimento: status === 'em_atendimento' || status === 'aguardando_cliente'
  // 3. Resolvidos: status === 'resolvido' (finalizadas nas últimas 24 horas, ou resolvidas recentemente)
  const conversasClassificadas = useMemo(() => {
    const rawTerm = searchTerm.trim()
    const normalizedTerm = normalizeSearchText(rawTerm)
    const digitsTerm = rawTerm.replace(/\D/g, '')

    const safeConversas = Array.isArray(whatsAppConversas) ? whatsAppConversas : []
    const safeClientes = Array.isArray(clientes) ? clientes : []
    const safeContatosAdic = Array.isArray(contatosAdicionais) ? contatosAdicionais : []

    // Conversas de contatos bloqueados NÃO aparecem em nenhuma lista da Central:
    // são ocultadas por número (E.164, mesmo critério do isNumeroBloqueado) até serem desbloqueadas.
    const conversasVisiveis = safeConversas.filter(
      (c) => c && !(c.numero && isNumeroBloqueado(c.numero)),
    )

    // Mapear conversas que possuem mensagens no histórico correspondentes ao termo buscado
    const conversasComMensagemMatch = new Set<string>()
    if (normalizedTerm && Array.isArray(whatsAppMensagens)) {
      whatsAppMensagens.forEach((msg) => {
        if (!msg || !msg.conversa_id) return
        const textoNorm = normalizeSearchText(msg.texto)
        if (textoNorm && textoNorm.includes(normalizedTerm)) {
          conversasComMensagemMatch.add(msg.conversa_id)
        }
      })
    }

    const filterFn = (conv: WhatsAppConversa) => {
      if (!normalizedTerm) return true
      const cli = conv.cliente_id ? clientesMap.get(conv.cliente_id) : null

      // Busca por telefone (suporta com/sem DDI 55, formatado com máscara e somente dígitos)
      const rawNumero = conv.numero || ''
      const numDigits = rawNumero.replace(/\D/g, '')
      const numWithout55 =
        numDigits.startsWith('55') && (numDigits.length === 12 || numDigits.length === 13)
          ? numDigits.slice(2)
          : numDigits
      const formattedNumero = normalizeSearchText(formatWhatsAppPhone(rawNumero))

      let matchNumero = false
      if (digitsTerm) {
        matchNumero =
          numDigits.includes(digitsTerm) ||
          numWithout55.includes(digitsTerm) ||
          (digitsTerm.startsWith('55') && numDigits.includes(digitsTerm.slice(2))) ||
          compararTelefonesFlexivel(rawNumero, digitsTerm) !== 'nenhum'
      }
      if (!matchNumero) {
        matchNumero =
          formattedNumero.includes(normalizedTerm) ||
          normalizeSearchText(rawNumero).includes(normalizedTerm)
      }

      // Busca por nome do cliente, razão social, nome fantasia ou contato (com e sem acento)
      const cliNomeNorm = normalizeSearchText(cli?.nome)
      const cliRazaoNorm = normalizeSearchText(cli?.razao_social)
      const cliFantasiaNorm = normalizeSearchText(cli?.nome_fantasia)
      const cliContatoNorm = normalizeSearchText(cli?.contato)

      const matchNome = Boolean(
        cliNomeNorm.includes(normalizedTerm) ||
        cliRazaoNorm.includes(normalizedTerm) ||
        cliFantasiaNorm.includes(normalizedTerm) ||
        cliContatoNorm.includes(normalizedTerm),
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
            normalizeSearchText(cli.telefone).includes(normalizedTerm) ||
            normalizeSearchText(cli.whatsapp).includes(normalizedTerm)
        }
      }

      // Busca por preview da última mensagem
      const matchPreview = Boolean(
        conv.ultima_mensagem_preview &&
        normalizeSearchText(conv.ultima_mensagem_preview).includes(normalizedTerm),
      )

      // Busca por histórico de mensagens da conversa (ponto 4)
      const matchHistoricoMensagem = conversasComMensagemMatch.has(conv.id)

      // Busca por nome do atendente
      const matchAtendente = Boolean(
        conv.atendente && normalizeSearchText(conv.atendente).includes(normalizedTerm),
      )

      return (
        matchNumero ||
        matchNome ||
        matchTelefoneCliente ||
        matchPreview ||
        matchHistoricoMensagem ||
        matchAtendente
      )
    }

    const agora = Date.now()
    const limite24h = agora - 24 * 60 * 60 * 1000

    const safeTime = (dateStr?: string) => {
      if (!dateStr) return 0
      const t = new Date(dateStr).getTime()
      return isNaN(t) ? 0 : t
    }

    const novos = conversasVisiveis
      .filter((c) => c && c.status === 'novo' && filterFn(c))
      .sort((a, b) => safeTime(b.updated || b.created) - safeTime(a.updated || a.created))

    const emAtendimento = conversasVisiveis
      .filter(
        (c) =>
          c && (c.status === 'em_atendimento' || c.status === 'aguardando_cliente') && filterFn(c),
      )
      .sort((a, b) => safeTime(b.updated || b.created) - safeTime(a.updated || a.created))

    const resolvidos = conversasVisiveis
      .filter((c) => {
        if (!c || c.status !== 'resolvido') return false
        if (!filterFn(c)) return false
        // Se há termo de busca ativo e a conversa corresponde ao termo, NÃO excluir mesmo que resolvida há mais de 24h
        if (normalizedTerm) return true
        const t = c.resolvida_em ? safeTime(c.resolvida_em) : safeTime(c.updated || c.created)
        return t >= limite24h
      })
      .sort((a, b) => safeTime(b.resolvida_em || b.updated) - safeTime(a.resolvida_em || a.updated))

    return { novos, emAtendimento, resolvidos }
  }, [whatsAppConversas, whatsAppMensagens, searchTerm, clientesMap, isNumeroBloqueado])

  // Conversa ativa selecionada
  // Se a conversa selecionada pertencer a um contato bloqueado, ela deixa de ser exibida no painel do chat
  // (o bloqueio esconde a conversa por completo; ao desbloquear, ela volta a aparecer normalmente).
  const selectedConversa = useMemo(() => {
    if (!selectedConversaId) return null
    const conv = whatsAppConversas.find((c) => c.id === selectedConversaId) || null
    if (conv && conv.numero && isNumeroBloqueado(conv.numero)) return null
    return conv
  }, [whatsAppConversas, selectedConversaId, isNumeroBloqueado])

  // Fechar/limpar automaticamente a conversa aberta quando ela for bloqueada
  useEffect(() => {
    if (selectedConversaId && !selectedConversa) {
      setSelectedConversaId(null)
    }
  }, [selectedConversa, selectedConversaId])

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

  // Bloquear contato direto do card da Fila de Novos (menu de três pontinhos)
  const handleBloquearDoCard = async () => {
    if (!conversaParaBloquear) return
    setIsBloqueando(true)
    try {
      await bloquearContato({
        numero: conversaParaBloquear.numero,
        motivo: motivoBloqueio.trim() || undefined,
      })
      // Refetch defensivo das bloqueadas para que a lista da Central atualize na hora
      // (mesmo que o estado global já tenha sido atualizado por bloquearContato)
      await refreshWhatsAppBloqueados()
      toast({
        title: 'Contato bloqueado',
        description: `O número ${formatWhatsAppPhone(conversaParaBloquear.numero)} foi bloqueado. A conversa saiu da lista de atendimento e novas mensagens serão ignoradas.`,
      })
    } catch (err: unknown) {
      console.error('Erro ao bloquear contato a partir do card:', err)
      toast({
        title: 'Erro ao bloquear contato',
        description: err instanceof Error ? err.message : 'Não foi possível bloquear o contato.',
        variant: 'destructive',
      })
    } finally {
      setConversaParaBloquear(null)
      setMotivoBloqueio('')
      setIsBloqueando(false)
    }
  }

  // Vincular ação
  const handleVincularCliente = async (clienteId: string, nomeContatoAdicional?: string) => {
    if (!conversaParaVincular) return
    try {
      const atendenteNome = user?.name || user?.email || 'João Silva'
      await vincularConversa(
        conversaParaVincular.id,
        clienteId,
        atendenteNome,
        nomeContatoAdicional,
      )
      setSelectedConversaId(conversaParaVincular.id)
      setConversaParaVincular(null)
      toast({
        title: 'Conversa vinculada com sucesso',
        description: nomeContatoAdicional
          ? `A conversa foi associada ao cliente com o contato adicional "${nomeContatoAdicional}".`
          : 'A conversa foi associada ao cliente e movida para "Em Atendimento".',
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

  // Mapa de conversas existentes por telefone e por clienteId (qualquer status, inclusive ativas)
  // Permite verificar se o cliente/contato encontrado já tem conversa aberta e qual é
  const conversasPorTelefoneOuCliente = useMemo(() => {
    const porTelefone = new Map<string, WhatsAppConversa>()
    const porCliente = new Map<string, WhatsAppConversa>()

    if (!Array.isArray(whatsAppConversas)) {
      return { porTelefone, porCliente }
    }

    whatsAppConversas.forEach((conv) => {
      if (!conv) return
      if (conv.cliente_id && !porCliente.has(conv.cliente_id)) {
        porCliente.set(conv.cliente_id, conv)
      }
      const digits = cleanPhoneDigits(conv.numero || '')
      if (digits) {
        if (!porTelefone.has(digits)) porTelefone.set(digits, conv)
        const sem55 =
          digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
            ? digits.slice(2)
            : digits
        if (!porTelefone.has(sem55)) porTelefone.set(sem55, conv)
        const com55 = digits.startsWith('55') ? digits : `55${digits}`
        if (!porTelefone.has(com55)) porTelefone.set(com55, conv)
      }
    })

    return { porTelefone, porCliente }
  }, [whatsAppConversas])
  // (Contatos bloqueados NÃO são excluídos aqui: o mapa conversasPorTelefoneOuCliente é usado
  // apenas pela busca de clientes no banco — a conversa continua existindo no banco, apenas oculta.)

  // Helper para localizar conversa existente para um determinado telefone ou clienteId
  const findConversaExistente = (
    clienteId?: string,
    telefone?: string,
  ): WhatsAppConversa | null => {
    if (clienteId && conversasPorTelefoneOuCliente.porCliente.has(clienteId)) {
      return conversasPorTelefoneOuCliente.porCliente.get(clienteId) || null
    }
    if (telefone) {
      const clean = cleanPhoneDigits(telefone)
      if (clean && conversasPorTelefoneOuCliente.porTelefone.has(clean)) {
        return conversasPorTelefoneOuCliente.porTelefone.get(clean) || null
      }
    }
    return null
  }

  // Tipo unificado para itens de clientes/contatos encontrados no banco
  interface BancoClienteResultado {
    id: string
    origem: 'cliente' | 'contato_adicional' | 'outro_contato' | 'contato_unico'
    nome: string
    telefone: string
    whatsapp: string
    cidade?: string
    clienteId?: string // Se for contato adicional, contato único ou cliente direto
    documento?: string
    tipoBadge: string
    subtitulo?: string
    conversaExistenteId?: string
    temConversaAtiva?: boolean
  }

  // Busca no banco de clientes, contatos adicionais, outros contatos e contatos da coleção unificada
  const clientesBancoFiltrados = useMemo(() => {
    const rawTerm = searchTerm.trim()
    if (!rawTerm || rawTerm.length < 2) return []

    const normalizedTerm = normalizeSearchText(rawTerm)
    const digitsTerm = cleanPhoneDigits(rawTerm)
    const digitsTermSem55 =
      digitsTerm.startsWith('55') && (digitsTerm.length === 12 || digitsTerm.length === 13)
        ? digitsTerm.slice(2)
        : digitsTerm

    const matchesQuery = (texto?: string, fone?: string, whats?: string) => {
      // Comparação por texto / nome insensível a acentuação
      if (texto && normalizeSearchText(texto).includes(normalizedTerm)) return true

      // Comparação por telefone / WhatsApp
      const foneDigits = fone ? cleanPhoneDigits(fone) : ''
      const whatsDigits = whats ? cleanPhoneDigits(whats) : ''

      if (digitsTerm) {
        if (foneDigits.includes(digitsTerm) || foneDigits.includes(digitsTermSem55)) return true
        if (whatsDigits.includes(digitsTerm) || whatsDigits.includes(digitsTermSem55)) return true
        if (
          digitsTermSem55 &&
          (foneDigits.endsWith(digitsTermSem55) || whatsDigits.endsWith(digitsTermSem55))
        )
          return true
      }

      if (fone && normalizeSearchText(fone).includes(normalizedTerm)) return true
      if (whats && normalizeSearchText(whats).includes(normalizedTerm)) return true

      return false
    }

    const jaInseridosChaves = new Set<string>()
    const resultados: BancoClienteResultado[] = []

    const safeClientes = Array.isArray(clientes) ? clientes : []
    const safeContatosAdicionais = Array.isArray(contatosAdicionais) ? contatosAdicionais : []
    const safeOutrosContatos = Array.isArray(outrosContatosLista) ? outrosContatosLista : []
    const safeContatosUnicos = Array.isArray(contatosUnicosLista) ? contatosUnicosLista : []

    // 1. Tabela clientes (NÃO bloqueia mais clientes com conversa ativa — exibe com opção de abrir conversa existente)
    safeClientes.forEach((cli) => {
      if (!cli) return

      const match =
        matchesQuery(cli.nome, cli.telefone, cli.whatsapp) ||
        matchesQuery(cli.razao_social, cli.telefone, cli.whatsapp) ||
        matchesQuery(cli.nome_fantasia, cli.telefone, cli.whatsapp) ||
        matchesQuery(cli.cidade) ||
        matchesQuery(cli.documento || cli.cpf || cli.cnpj)

      if (match) {
        const chave = `cli_${cli.id}`
        if (!jaInseridosChaves.has(chave)) {
          jaInseridosChaves.add(chave)
          const convExistente = findConversaExistente(cli.id, cli.whatsapp || cli.telefone)
          resultados.push({
            id: cli.id,
            origem: 'cliente',
            nome: cli.nome || cli.razao_social || 'Cliente sem nome',
            telefone: cli.telefone || '',
            whatsapp: cli.whatsapp || cli.telefone || '',
            cidade: cli.cidade || (cli.estado ? `${cli.estado}` : undefined),
            clienteId: cli.id,
            documento: cli.documento || cli.cpf || cli.cnpj,
            tipoBadge: cli.tipo === 'pj' ? 'Empresa / PJ' : 'Cliente Cadastrado',
            subtitulo: cli.email || cli.tipo_cliente || undefined,
            conversaExistenteId: convExistente?.id,
            temConversaAtiva: Boolean(convExistente && convExistente.status !== 'resolvido'),
          })
        }
      }
    })

    // 2. Tabela contatos_adicionais (suporta contato.cliente || contato.cliente_id e exibe conversa existente quando houver)
    safeContatosAdicionais.forEach((contato) => {
      if (!contato) return
      const fone = contato.telefone || (contato as any).whatsapp || ''

      const clientePaiId = (contato as any).cliente || (contato as any).cliente_id || undefined
      const cliPai = clientePaiId ? clientesMap.get(clientePaiId) : undefined
      const match =
        matchesQuery(contato.nome, contato.telefone, (contato as any).whatsapp) ||
        matchesQuery(contato.cargo) ||
        matchesQuery(contato.papel) ||
        (cliPai && matchesQuery(cliPai.nome))

      if (match) {
        const chave = `contato_adic_${contato.id}`
        if (!jaInseridosChaves.has(chave)) {
          jaInseridosChaves.add(chave)
          const convExistente = findConversaExistente(clientePaiId, fone)
          resultados.push({
            id: contato.id,
            origem: 'contato_adicional',
            nome: contato.nome || 'Contato Adicional',
            telefone: contato.telefone || '',
            whatsapp: (contato as any).whatsapp || contato.telefone || '',
            cidade: cliPai?.cidade,
            clienteId: clientePaiId,
            tipoBadge: `Contato Adicional${cliPai ? ` (${cliPai.nome})` : ''}`,
            subtitulo: contato.cargo || (cliPai ? `Cliente: ${cliPai.nome}` : undefined),
            conversaExistenteId: convExistente?.id,
            temConversaAtiva: Boolean(convExistente && convExistente.status !== 'resolvido'),
          })
        }
      }
    })

    // 3. Coleção unificada contatos (incluída na busca com cliente pai vinculado quando houver)
    safeContatosUnicos.forEach((cu) => {
      if (!cu) return
      const fone = cu.whatsapp || cu.telefone || ''

      // Primeiro cliente vinculado na relação N:N, se houver
      const clientePaiId =
        Array.isArray(cu.clientes_vinculados) && cu.clientes_vinculados.length > 0
          ? cu.clientes_vinculados[0]
          : undefined
      const cliPai = clientePaiId ? clientesMap.get(clientePaiId) : undefined

      const match =
        matchesQuery(cu.nome, cu.telefone, cu.whatsapp) ||
        matchesQuery(cu.cargo) ||
        matchesQuery(cu.papel) ||
        matchesQuery(cu.observacoes) ||
        (cliPai && matchesQuery(cliPai.nome))

      if (match) {
        const chave = `contato_unico_${cu.id}`
        if (!jaInseridosChaves.has(chave)) {
          jaInseridosChaves.add(chave)
          const convExistente = findConversaExistente(clientePaiId, fone)
          resultados.push({
            id: cu.id,
            origem: 'contato_unico',
            nome: cu.nome || 'Contato',
            telefone: cu.telefone || '',
            whatsapp: cu.whatsapp || cu.telefone || '',
            cidade: cliPai?.cidade,
            clienteId: clientePaiId,
            tipoBadge: cu.papel
              ? `Contato (${cu.papel})${cliPai ? ` • ${cliPai.nome}` : ''}`
              : `Contato${cliPai ? ` • ${cliPai.nome}` : ''}`,
            subtitulo:
              cu.cargo || cu.observacoes || (cliPai ? `Cliente: ${cliPai.nome}` : undefined),
            conversaExistenteId: convExistente?.id,
            temConversaAtiva: Boolean(convExistente && convExistente.status !== 'resolvido'),
          })
        }
      }
    })

    // 4. Tabela outros_contatos
    safeOutrosContatos.forEach((outro) => {
      if (!outro) return

      const match =
        matchesQuery(outro.nome, outro.telefone) ||
        matchesQuery(outro.tipo_contato) ||
        matchesQuery(outro.observacao)

      if (match) {
        const chave = `outro_${outro.id}`
        if (!jaInseridosChaves.has(chave)) {
          jaInseridosChaves.add(chave)
          const convExistente = findConversaExistente(undefined, outro.telefone)
          resultados.push({
            id: outro.id,
            origem: 'outro_contato',
            nome: outro.nome || 'Outro Contato',
            telefone: outro.telefone || '',
            whatsapp: outro.telefone || '',
            tipoBadge: outro.tipo_contato
              ? `Outro Contato (${outro.tipo_contato})`
              : 'Outro Contato',
            subtitulo: outro.observacao || outro.tipo_contato,
            conversaExistenteId: convExistente?.id,
            temConversaAtiva: Boolean(convExistente && convExistente.status !== 'resolvido'),
          })
        }
      }
    })

    return resultados
  }, [
    searchTerm,
    clientes,
    contatosAdicionais,
    outrosContatosLista,
    contatosUnicosLista,
    clientesMap,
    conversasPorTelefoneOuCliente,
  ])

  // Iniciar nova conversa ou abrir conversa existente com cliente do banco
  const handleSelecionarClienteBanco = async (item: BancoClienteResultado) => {
    // Se o item já tem ID de conversa existente detectado, abrir imediatamente
    if (item.conversaExistenteId) {
      setSelectedConversaId(item.conversaExistenteId)
      setSearchTerm('')
      toast({
        title: 'Conversa aberta',
        description: `Exibindo chat com ${item.nome}.`,
      })
      return
    }

    let cleanNum = ''

    // Se a origem for cliente principal, aplicar a cascata central (WhatsApp -> Contato Adicional -> Telefone)
    if (item.origem === 'cliente' && item.clienteId) {
      const cliCompleto =
        clientesMap.get(item.clienteId) ||
        ({
          id: item.clienteId,
          nome: item.nome,
          whatsapp: item.whatsapp,
          telefone: item.telefone,
        } as Cliente)
      const contatosDoCli = contatosAdicionais.filter(
        (ca) => ((ca as any).cliente || ca.cliente_id) === item.clienteId,
      )
      const resolucao = await resolverNumeroDestinoCliente(cliCompleto, {
        contatosAdicionais: contatosDoCli,
      })

      if (!resolucao.numero) {
        toast({
          title: 'Envio não realizado',
          description: MENSAGEM_ALERTA_SEM_NUMERO,
          variant: 'destructive',
        })
        return
      }

      cleanNum = cleanPhoneDigits(resolucao.numero)
      if (resolucao.origem === 'contato_adicional_whatsapp') {
        toast({
          title: 'Usando contato adicional',
          description: `Contato adicional: ${resolucao.contatoAdicionalNome || 'Contato'} (utilizado como alternativa)`,
        })
      }
    } else {
      // Contato adicional, contato único ou outro contato selecionado diretamente
      const rawNumber = item.whatsapp || item.telefone
      cleanNum = cleanPhoneDigits(rawNumber)
      if (!cleanNum || cleanNum.length < 10) {
        toast({
          title: 'Telefone não disponível',
          description:
            'Este cadastro não possui número de WhatsApp ou telefone válido para iniciar conversa.',
          variant: 'destructive',
        })
        return
      }
    }

    // Normalizar para formato E.164 (com DDI 55 se 10 ou 11 dígitos brasileiros)
    const numeroFinal =
      cleanNum.length === 10 || cleanNum.length === 11 ? `55${cleanNum}` : cleanNum

    // 1. Verificar se por ventura já existe conversa com esse número (ou número sem DDI 55, ou tolerância ao 9º dígito)
    const conversaExistente = whatsAppConversas.find((conv) => {
      if (item.clienteId && conv.cliente_id === item.clienteId) return true
      const cNum = cleanPhoneDigits(conv.numero || '')
      if (cNum === numeroFinal || cNum === cleanNum) return true
      if (numeroFinal.startsWith('55') && cNum === numeroFinal.slice(2)) return true
      if (cNum.startsWith('55') && cNum.slice(2) === numeroFinal) return true
      if (compararTelefonesFlexivel(conv.numero, numeroFinal) !== 'nenhum') return true
      return false
    })

    if (conversaExistente) {
      // Se a conversa já existe mas não estava vinculada ao cliente, vincular
      if (item.clienteId && !conversaExistente.cliente_id) {
        try {
          const atendenteNome = user?.name || user?.email || 'João Silva'
          await vincularConversa(conversaExistente.id, item.clienteId, atendenteNome)
        } catch (vincErr) {
          console.warn('Erro ao auto-vincular conversa existente:', vincErr)
        }
      }
      setSelectedConversaId(conversaExistente.id)
      setSearchTerm('')
      toast({
        title: 'Conversa já existente aberta',
        description: `Abrindo histórico de WhatsApp com ${item.nome}.`,
      })
      return
    }

    // 2. Se não existe conversa, criar no banco via crmService.createWhatsAppConversa()
    setIsStartingConversa(true)
    try {
      const atendenteNome = user?.name || user?.email || 'João Silva'
      const novaConversa = await createWhatsAppConversa({
        numero: numeroFinal,
        cliente_id: item.clienteId || undefined,
        status: 'em_atendimento',
        atendente: atendenteNome,
        ultima_mensagem_preview: 'Conversa iniciada via Central de Atendimento',
        ultima_mensagem_em: new Date().toISOString(),
      })

      // Atualizar lista em memória e selecionar a nova conversa
      await refreshConversas()
      setSelectedConversaId(novaConversa.id)
      setSearchTerm('')

      toast({
        title: 'Nova conversa criada!',
        description: `Conversa com ${item.nome} (${formatWhatsAppPhone(numeroFinal)}) pronta para envio.`,
      })
    } catch (err: unknown) {
      console.error('Erro ao iniciar conversa de WhatsApp:', err)
      toast({
        title: 'Erro ao iniciar conversa',
        description: err instanceof Error ? err.message : 'Não foi possível criar a conversa.',
        variant: 'destructive',
      })
    } finally {
      setIsStartingConversa(false)
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
    tipo_cliente?: import('@/types/crm').ClienteTipo
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
        description:
          err instanceof Error
            ? err.message
            : 'Não foi possível salvar o cadastro. Verifique os campos e tente novamente.',
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
    <div className="space-y-4 flex flex-col h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-7.5rem)] max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(100dvh-6.5rem)] lg:max-h-[calc(100dvh-7.5rem)]">
      {/* Barra de Ações Superior - Minimalista: Busca com autocomplete e ações funcionais */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-200/80 shadow-2xs">
        {/* Campo de Busca com Dropdown de Resultados da Base de Clientes */}
        <div className="relative flex-1 min-w-[220px] max-w-sm sm:w-80">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por telefone, cliente ou mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-7 py-2 text-xs bg-gray-50/80 focus:bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
          />
          {searchTerm.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dropdown de Clientes Encontrados no Banco (sem conversa no WhatsApp) */}
          {searchTerm.trim().length >= 2 && (
            <div className="absolute left-0 top-full mt-1.5 w-full sm:w-[380px] max-h-[380px] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl z-50 animate-in fade-in-50 zoom-in-95 duration-100 p-1.5 space-y-1">
              <div className="px-2 py-1.5 flex items-center justify-between border-b border-gray-100 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Clientes no Banco ({clientesBancoFiltrados.length})</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {clientesBancoFiltrados.length > 0
                    ? 'Clique para abrir ou iniciar'
                    : 'Sem outros clientes no banco'}
                </span>
              </div>

              {clientesBancoFiltrados.length === 0 ? (
                <div className="py-4 px-3 text-center text-xs text-gray-400">
                  Nenhum cliente adicional encontrado no banco para "{searchTerm.trim()}".
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  {clientesBancoFiltrados.map((item) => {
                    const numeroEfetivo = item.whatsapp || item.telefone || ''
                    const numeroFormatado = formatWhatsAppPhone(numeroEfetivo)

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isStartingConversa}
                        onClick={() => handleSelecionarClienteBanco(item)}
                        className="w-full text-left p-2.5 rounded-lg border border-transparent hover:border-emerald-200 hover:bg-emerald-50/70 transition-all group flex flex-col gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-950 break-words leading-snug">
                                {item.nome}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                {item.tipoBadge}
                              </span>
                              {item.temConversaAtiva && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Conversa Ativa
                                </span>
                              )}
                            </div>
                            {item.subtitulo && (
                              <p className="text-[10px] text-gray-500 break-words leading-tight mt-0.5">
                                {item.subtitulo}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-gray-600 border-t border-gray-100/70 mt-0.5">
                          <div className="flex items-center gap-3 min-w-0">
                            {numeroFormatado ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 font-medium">
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                {numeroFormatado}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">
                                Sem telefone cadastrado
                              </span>
                            )}
                          </div>

                          {item.conversaExistenteId ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 group-hover:text-blue-800 shrink-0 ml-auto bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              <MessageSquare className="w-3 h-3 text-blue-600" />
                              Abrir Conversa Existente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 group-hover:text-emerald-800 shrink-0 ml-auto">
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              Iniciar Chat
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ações da Barra de Ferramentas alinhadas à direita */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {/* Toggle de Notificações Sonoras e Desktop */}
          <button
            type="button"
            onClick={handleToggleNotificacoes}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
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

          {/* Botão Recarregar Conversas */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/80 rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Atualizar lista de conversas agora"
            aria-label="Atualizar lista de conversas"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-emerald-600'}`}
            />
            <span className="hidden md:inline">
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </span>
          </button>

          {/* Botão de Exportação de Planilha Excel (.xlsx) */}
          <button
            type="button"
            onClick={handleExportarPlanilha}
            disabled={isExportingPlanilha}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.98] text-xs font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
            title="Exportar planilha completa (.xlsx) com abas de Base Completa, Repetidos, Erros de digitação, Testes e Sem telefone"
            aria-label="Exportar planilha da Central de Atendimento"
          >
            {isExportingPlanilha ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isExportingPlanilha ? 'Exportando...' : 'Exportar Planilha'}
            </span>
            <span className="sm:hidden">{isExportingPlanilha ? '...' : 'Planilha'}</span>
          </button>

          {/* Botão de Visão Consolidada de Contatos */}
          <button
            type="button"
            onClick={() => navigate('/contatos')}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 active:scale-[0.98] text-xs font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer"
            title="Abrir a visão consolidada de todos os contatos (principais e adicionais) por cliente"
          >
            <Users className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
            <span>Visão de Contatos</span>
          </button>

          {/* Botão de Templates & Configurações de WhatsApp no padrão verde Delfos */}
          <button
            type="button"
            onClick={() => setModalTemplatesOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all shrink-0 cursor-pointer"
            title="Gerenciar templates e credenciais de integração"
          >
            <Settings className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Templates & Gateway</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Navegação por 3 colunas e Área de Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Coluna de Atendimentos / Listas */}
        <div
          className={`${selectedConversa ? 'hidden lg:flex lg:col-span-5 xl:col-span-4' : 'col-span-12 lg:col-span-5 xl:col-span-4 flex'} flex-col min-h-0 h-full space-y-3 overflow-hidden`}
        >
          {/* Tabs Mobile */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl lg:hidden shrink-0">
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

          {/* Desktop & Mobile: Listas de Conversas com scroll independente */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
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
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
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
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {conv.foto_perfil ? (
                                <img
                                  src={conv.foto_perfil}
                                  alt={cli ? cli.nome : conv.numero}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <Phone className="w-4 h-4" />
                              )}
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

                        {/* Ambiguidade / Sugestão de Contatos Compatíveis (9º dígito / Adicionais) */}
                        {(() => {
                          const resMatch = casarRemetenteComContatos(
                            conv.numero,
                            clientes as any,
                            contatosAdicionais as any,
                          )
                          if (resMatch.candidatosCompativeis.length === 0) return null
                          const isMultiplos = resMatch.candidatosCompativeis.length > 1
                          return (
                            <div className="mt-2 p-2 bg-amber-50/90 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>
                                  {isMultiplos
                                    ? `${resMatch.candidatosCompativeis.length} contatos compatíveis encontrados:`
                                    : 'Contato compatível identificado:'}
                                </span>
                              </div>
                              <div className="text-[10px] text-amber-800 leading-tight">
                                {resMatch.candidatosCompativeis.slice(0, 2).map((cand, idx) => (
                                  <div key={idx} className="truncate">
                                    • <strong className="text-gray-900">{cand.clienteNome}</strong>
                                    {cand.tipoMatch === 'tolerante_nono_digito' && (
                                      <span className="ml-1 text-[9px] text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                        (9º dígito)
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {resMatch.candidatosCompativeis.length > 2 && (
                                  <div className="text-[9px] text-amber-700 italic">
                                    + {resMatch.candidatosCompativeis.length - 2} outro(s)
                                    contato(s)
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })()}

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
                                  <span>Cadastrar como contato</span>
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

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setConversaParaBloquear(conv)
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-rose-700 font-medium hover:bg-rose-50"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Bloquear contato</span>
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
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {conv.foto_perfil ? (
                                <img
                                  src={conv.foto_perfil}
                                  alt={cli?.nome || conv.numero}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : cli?.nome ? (
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
          className={`${!selectedConversa ? 'hidden lg:flex lg:col-span-7 xl:col-span-8' : 'col-span-12 lg:col-span-7 xl:col-span-8 flex'} flex-col min-h-0 h-full overflow-hidden`}
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

      {/* Modal para Vincular Cliente a Conversa Desconhecida com Reconhecimento Flexível */}
      <ModalVincularCliente
        isOpen={Boolean(conversaParaVincular)}
        onClose={() => setConversaParaVincular(null)}
        conversa={conversaParaVincular}
        clientes={clientes}
        contatosAdicionais={contatosAdicionais}
        onVincular={handleVincularCliente}
        onCadastrarLead={(conv) => {
          setSelectedConversaId(conv.id)
          setConversaParaNovoLead(conv)
        }}
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

      {/* Dialog de Confirmação de Bloqueio a partir do card da Fila de Novos */}
      <Dialog
        open={Boolean(conversaParaBloquear)}
        onOpenChange={(open) => {
          if (!open) {
            setConversaParaBloquear(null)
            setMotivoBloqueio('')
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquear Contato WhatsApp?</DialogTitle>
            <DialogDescription>
              Ao bloquear, a conversa sai imediatamente da lista da Central de Atendimento, novas
              mensagens deste número serão ignoradas pelo webhook e o envio ficará desabilitado. A
              conversa continua registrada no banco e volta a aparecer se o contato for
              desbloqueado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-gray-600">
              Número:{' '}
              <span className="font-mono font-semibold text-gray-900">
                {conversaParaBloquear ? formatWhatsAppPhone(conversaParaBloquear.numero) : ''}
              </span>
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-gray-700"
                htmlFor="motivo-bloqueio-central"
              >
                Motivo do bloqueio (opcional)
              </label>
              <Textarea
                id="motivo-bloqueio-central"
                value={motivoBloqueio}
                onChange={(e) => setMotivoBloqueio(e.target.value)}
                placeholder="Ex.: spam, propaganda, número inválido..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isBloqueando}
              onClick={() => {
                setConversaParaBloquear(null)
                setMotivoBloqueio('')
              }}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isBloqueando} onClick={handleBloquearDoCard}>
              {isBloqueando ? 'Bloqueando...' : 'Bloquear contato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
