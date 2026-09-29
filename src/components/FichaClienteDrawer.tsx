import React, { useState, useMemo, useRef } from 'react'
import {
  X,
  MapPin,
  Phone,
  Home,
  FileText,
  Calendar,
  Zap,
  Layers,
  Clock,
  Wrench,
  Droplets,
  Settings,
  Mail,
  User,
  Building,
  Hash,
  Compass,
  Activity,
  Gauge,
  Sun,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CalendarCheck2,
  Sparkles,
  FolderKanban,
  HardHat,
  UserCheck,
  Plus,
  MessageSquare,
  Copy,
  XCircle,
  RotateCcw,
  Briefcase,
  ArrowLeft,
  Share2,
  Pencil,
  MoreVertical,
} from 'lucide-react'
import { WhatsAppIcon } from './WhatsAppIcon'
import { cleanPhoneDigits } from '@/lib/formatters'
import {
  resolverNumeroDestinoClienteSync,
  type OrigemNumeroDestino,
} from '@/lib/resolverNumeroDestinoCliente'
import { useClientes } from '@/contexts/ClientesContext'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getTelhadoLabel,
  formatWhatsAppPhone,
} from '@/lib/formatters'
import { StatusBadge, ProductBadge } from './StatusBadge'
import { OrigemClienteBadge } from './OrigemClienteBadge'
import { InlineEditField } from './InlineEditField'
import { AtividadeItem } from './AtividadeItem'
import { QuickAddAtividade } from './QuickAddAtividade'
import { LinhaDoTempoUnificada } from './LinhaDoTempoUnificada'
import { ModalDetalhesTimeline } from './ModalDetalhesTimeline'
import type { TimelineUnifiedItem } from '@/types/timelineUnified'
import { FichaClienteOM } from './FichaClienteOM'
import { FichaClienteWhatsApp } from './FichaClienteWhatsApp'
import { ModalGerenciarWhatsAppTemplates } from './ModalGerenciarWhatsAppTemplates'
import { ModalNovaPropostaOM } from './ModalNovaPropostaOM'
import { ModalOrcamentoSolar } from './ModalOrcamentoSolar'
import { DrawerAtividadesManutencaoCliente } from './DrawerAtividadesManutencaoCliente'
import { ModalEnviarDocumentoWhatsApp } from './ModalEnviarDocumentoWhatsApp'
import { ImportarDadosDocumento } from './ImportarDadosDocumento'
import { ModalConfirmarDocumentoProjeto } from './ModalConfirmarDocumentoProjeto'
import { ModalTransferenciaCreditos } from './ModalTransferenciaCreditos'
import { ModalOferecerLimpezaAvulsa } from './ModalOferecerLimpezaAvulsa'
import { ModalGerenciarAtividades } from './ModalGerenciarAtividades'
import { ModalGerarProcuracaoOM } from './ModalGerarProcuracaoOM'
import { ModalSolicitarContasRGE } from './ModalSolicitarContasRGE'
import { ModalCriarAnaliseFatura } from './ModalCriarAnaliseFatura'
import { ModalGerarContratoOM } from './ModalGerarContratoOM'
import { ModalNovaAtividade } from './ModalNovaAtividade'
import { ModalSolicitacaoInformacoes } from './ModalSolicitacaoInformacoes'
import { ModalMarcarPerdido } from './ModalMarcarPerdido'
import { ModalNovaOportunidade } from './ModalNovaOportunidade'
import { X as IconX } from 'lucide-react'
import { SecaoMonitoramentoInversor } from './SecaoMonitoramentoInversor'
import { SecaoAcessoSolarview } from './SecaoAcessoSolarview'
import { DatasheetBadge } from './DatasheetBadge'
import { SecaoUsinasCliente } from './SecaoUsinasCliente'
import { SecaoContatosAdicionais } from './SecaoContatosAdicionais'
import { AbaAtivosUsina } from './AbaAtivosUsina'
import { CardNegociosCliente } from './CardNegociosCliente'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchUsinasByClienteId,
  createUsina,
  updateUsina,
  deleteUsina,
} from '@/services/crmService'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { UsinaCliente } from '@/types/crm'
import { toast } from 'sonner'
import type {
  TipoDocumentoProjeto,
  DadosDocumentoProjetoInput,
} from '@/lib/documentosProjetosSolarGenerator'
import type { OrcamentoSolar } from '@/types/crm'
import {
  ShieldCheck,
  FileCheck,
  ExternalLink,
  Download,
  UploadCloud,
  Send,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Trash2,
} from 'lucide-react'
import { formatarCNPJ } from '@/lib/orcamentoParser'
import { formatarCPF } from '@/lib/cpfValidator'
import {
  abrirPropostaEmNovaAba,
  baixarPropostaHTML,
  calcularPropostaOM,
} from '@/lib/propostaOMGenerator'
import {
  normalizarEOordenarHistorico,
  calcularMetricasHistorico,
} from '@/lib/historicoConsumoFatura'
import type { PropostaOM } from '@/types/crm'
import type {
  Cliente,
  Sistema,
  ClienteStatus,
  ProdutoTipo,
  TelhadoTipo,
  TipoAtendimento,
  NumeroFases,
  Atividade,
  AtividadeTipo,
  ProjetoEtapa,
} from '@/types/crm'

const PRODUTOS: ProdutoTipo[] = [
  'Energia Solar',
  'Plano de O&M',
  'Sistemas Híbridos',
  'Carregadores veiculares',
  'Manutenção avulsa',
]

const ETAPAS_STATUS: { value: ClienteStatus; label: string }[] = [
  { value: 'Novo Lead', label: '1 - Novo Lead' },
  { value: 'Levantamento', label: '2 - Levantamento' },
  { value: 'Orçamento', label: '3 - Orçamento' },
  { value: 'Negociação', label: '4 - Negociação' },
  { value: 'Fechado', label: '5 - Fechado' },
  { value: 'Contato Futuro', label: '6 - Contato Futuro' },
  { value: 'Perdido', label: 'Perdido (Sai do funil)' },
]

const TELHADOS: { value: TelhadoTipo; label: string }[] = [
  { value: 'ceramico', label: 'Cerâmico' },
  { value: 'metalico', label: 'Metálico' },
  { value: 'laje', label: 'Laje' },
  { value: 'fibrocimento', label: 'Fibrocimento' },
]

const ATENDIMENTOS: { value: TipoAtendimento; label: string }[] = [
  { value: 'aéreo', label: 'Aéreo' },
  { value: 'subterrâneo', label: 'Subterrâneo' },
]

const FASES: { value: NumeroFases; label: string }[] = [
  { value: 'monofásico', label: 'Monofásico' },
  { value: 'bifásico', label: 'Bifásico' },
  { value: 'trifásico', label: 'Trifásico' },
]

export const FichaClienteDrawer: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const {
    selectedCliente,
    selectedClienteId,
    selectedSistema,
    selectedClienteProjeto,
    activeClientTab,
    setActiveClientTab,
    closeFichaCliente,
    manutencoes,
    atividades,
    profissionais,
    contatosAdicionais,
    projetoEventos,
    updateCliente,
    updateClienteStatus,
    updateSistema,
    addAtividade,
    updateAtividadeStatus,
    removeAtividade,
    addProjeto,
    updateProjetoEtapa,
    assignProjetoProfissional,
    propostasOM,
    updatePropostaOM,
    orcamentosSolar,
    updateOrcamentoSolar,
    updateAtividade,
    whatsAppMensagens,
    documentosCliente,
    addOrUpdateDocumentoCliente,
    updateDocumentoClienteStatus,
    contratosOM,
    renovarContratoOM,
    marcarComoPerdido,
    reabrirOportunidade,
    usuarios,
    removeCliente,
  } = useClientes()

  // Modal e estado para Excluir Cliente
  const [modalExcluirClienteOpen, setModalExcluirClienteOpen] = useState(false)
  const [isDeletingCliente, setIsDeletingCliente] = useState(false)

  // Modais de Ganho / Perdido / Nova Oportunidade (Reabertura)
  const [modalPerdidoOpen, setModalPerdidoOpen] = useState(false)
  const [modalNovaOportunidadeOpen, setModalNovaOportunidadeOpen] = useState(false)

  // Estado e carregamento de usinas do cliente selecionado
  const [usinasDoCliente, setUsinasDoCliente] = useState<UsinaCliente[]>([])
  const recarregarUsinas = React.useCallback(async () => {
    if (!selectedCliente?.id) {
      setUsinasDoCliente([])
      return
    }
    try {
      const lista = await fetchUsinasByClienteId(selectedCliente.id)
      setUsinasDoCliente(lista)
    } catch (err) {
      console.warn('Erro ao carregar usinas do cliente:', err)
      setUsinasDoCliente([])
    }
  }, [selectedCliente?.id])

  React.useEffect(() => {
    recarregarUsinas()
  }, [recarregarUsinas])

  // Estado para Modal de Detalhes / Edição Inline da Linha do Tempo Unificada
  const [timelineItemDetalhes, setTimelineItemDetalhes] = useState<TimelineUnifiedItem | null>(null)

  // Drawer / Modal de Atividades de Manutenção do Cliente
  const [drawerAtividadesManutencaoOpen, setDrawerAtividadesManutencaoOpen] = useState(false)
  // Modal Registrar Atividade dentro da ficha do cliente
  const [modalNovaAtividadeFichaOpen, setModalNovaAtividadeFichaOpen] = useState(false)
  const [modalNovaAtividadeTipoFicha, setModalNovaAtividadeTipoFicha] =
    useState<AtividadeTipo | null>(null)

  // Modal de Proposta O&M
  const [isModalPropostaOpen, setIsModalPropostaOpen] = useState(false)
  const [propostaVisualizar, setPropostaVisualizar] = useState<PropostaOM | null>(null)
  const [isModalOrcamentoSolarOpen, setIsModalOrcamentoSolarOpen] = useState(false)
  const [orcamentoSolarVisualizar, setOrcamentoSolarVisualizar] = useState<OrcamentoSolar | null>(
    null,
  )
  const [modalWhatsAppTemplatesOpen, setModalWhatsAppTemplatesOpen] = useState(false)

  // Modal para envio de Documento (Orçamento Solar / Proposta O&M) por WhatsApp
  const [modalEnviarDocWhatsAppOpen, setModalEnviarDocWhatsAppOpen] = useState(false)
  const [docParaEnviarWhatsApp, setDocParaEnviarWhatsApp] = useState<{
    tipo: 'orcamento_solar' | 'proposta_om'
    referenciaId?: string
    dadosSolar?: any
    dadosOM?: any
  } | null>(null)

  // Modal de Solicitação de Informações do Cliente (Checklist e Mensagem)
  const [modalSolicitacaoInfoOpen, setModalSolicitacaoInfoOpen] = useState(false)

  // Modais de Documentos de Projetos / Pós-Venda e Transferência de Créditos
  const [modalDocProjetoOpen, setModalDocProjetoOpen] = useState(false)
  const [modalDocProjetoTipo, setModalDocProjetoTipo] = useState<TipoDocumentoProjeto>('procuracao')
  const [modalDocProjetoDados, setModalDocProjetoDados] = useState<
    Partial<DadosDocumentoProjetoInput>
  >({})
  const [modalTransferenciaCreditosOpen, setModalTransferenciaCreditosOpen] = useState(false)
  const [modalOferecerLimpezaOpen, setModalOferecerLimpezaOpen] = useState(false)
  const [modalGerenciarAtividadesOpen, setModalGerenciarAtividadesOpen] = useState(false)
  const [modalProcuracaoOMOpen, setModalProcuracaoOMOpen] = useState(false)
  const [modalContratoOMOpen, setModalContratoOMOpen] = useState(false)
  const [modalSolicitarContasRGEOpen, setModalSolicitarContasRGEOpen] = useState(false)
  const [modalAnaliseFaturaOpen, setModalAnaliseFaturaOpen] = useState(false)
  const [contratoOMDetalhesDados, setContratoOMDetalhesDados] = useState<any>(null)
  const [modoVisualizacaoContratoDireta, setModoVisualizacaoContratoDireta] = useState(false)

  // Seção expansível de detalhes cadastrais/técnicos dentro do painel esquerdo
  const [detalhesOpen, setDetalhesOpen] = useState(false)
  // Seção de Importar dados por documento
  const [importDocOpen, setImportDocOpen] = useState(false)
  const [isCreatingProjeto, setIsCreatingProjeto] = useState(false)

  // Consulta de CNPJ na Ficha do Cliente
  const [isCnpjBuscandoReceita, setIsCnpjBuscandoReceita] = useState(false)
  const [conflitosCnpjCliente, setConflitosCnpjCliente] = useState<
    {
      campo: string
      label: string
      valorAtual: string
      valorReceita: string
    }[]
  >([])
  const [pendenteDadosReceitaCliente, setPendenteDadosReceitaCliente] = useState<any | null>(null)

  // Ref para o container com scroll da coluna esquerda
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Ref para a seção de detalhes cadastrais e técnicos
  const detalhesSectionRef = useRef<HTMLDivElement>(null)

  // Ação para rolar até a seção de Negócios Vinculados
  const handleRolarParaNegocios = () => {
    setActiveClientTab('historico')

    const scrollParaSecao = (tentativa = 0) => {
      const container = scrollContainerRef.current
      const el =
        document.getElementById('secao-negocios-cliente') ||
        detalhesSectionRef.current ||
        document.getElementById('secao-detalhes-cadastrais-tecnicos')

      if (el && container) {
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const relativeTop = elRect.top - containerRect.top + container.scrollTop

        container.scrollTo({
          top: Math.max(0, relativeTop - 12),
          behavior: 'smooth',
        })
      } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (tentativa < 10) {
        requestAnimationFrame(() => scrollParaSecao(tentativa + 1))
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollParaSecao()
      })
    })
  }

  // Ação robusta para alternar/abrir a seção e rolar suavemente até ela
  const handleToggleDetalhes = () => {
    if (activeClientTab === 'historico' && detalhesOpen) {
      // Já está aberta e visível na aba histórico: recolhe
      setDetalhesOpen(false)
      return
    }

    // Se estiver em outra aba ou fechada: garante aba histórico e abre detalhes
    setActiveClientTab('historico')
    setDetalhesOpen(true)

    const scrollParaSecao = (tentativa = 0) => {
      const container = scrollContainerRef.current
      const el =
        detalhesSectionRef.current || document.getElementById('secao-detalhes-cadastrais-tecnicos')

      if (el && container) {
        // Calcula a posição do elemento relativa ao container com scroll
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const relativeTop = elRect.top - containerRect.top + container.scrollTop

        container.scrollTo({
          top: Math.max(0, relativeTop - 12),
          behavior: 'smooth',
        })
      } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (tentativa < 10) {
        // Se ainda não montou no DOM (troca de aba/estado React), tenta novamente com rAF
        requestAnimationFrame(() => scrollParaSecao(tentativa + 1))
      }
    }

    // Inicia após a renderização do React
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollParaSecao()
      })
    })
  }

  // Memoized: Todos os registros do cliente em UMA linha do tempo única cronológica (mais recente -> mais antigo)
  // Integrando anotações, atividades normais e propostas O&M da collection propostas_om
  const timelineAtividades = useMemo(() => {
    if (!selectedCliente) return []

    // Atividades normais
    const atvs = atividades.filter((a) => a.cliente_id === selectedCliente.id)

    // Converter propostas O&M em itens da timeline unificada
    const propsOMAsAtividades = (propostasOM || [])
      .filter((p) => p.cliente_id === selectedCliente.id)
      .map((p) => {
        const dataProp = p.data_proposta || p.created
        const valorMensalExibido = p.valor_mensal_plano
          ? formatCurrency(p.valor_mensal_plano)
          : p.valor_ativo_protegido
            ? `${formatCurrency(p.valor_ativo_protegido)}/mês (ativo)`
            : ''

        const planoTexto = p.plano_recomendado || (p.potencia_kwp ? `${p.potencia_kwp} kWp` : 'O&M')
        const descricaoTexto = [
          `Plano oferecido: ${planoTexto}`,
          valorMensalExibido ? `Valor: ${valorMensalExibido}` : '',
          p.potencia_kwp ? `Potência: ${p.potencia_kwp} kWp` : '',
        ]
          .filter(Boolean)
          .join(' • ')

        return {
          id: `prop-om-${p.id}`,
          cliente_id: selectedCliente.id,
          tipo: 'proposta' as const,
          titulo: `Proposta O&M Emitida: Plano ${planoTexto}`,
          descricao: descricaoTexto,
          data: dataProp,
          status: 'concluida' as const,
          created: p.created,
          updated: p.updated || p.created,
          responsavel_nome: p.autor || 'Equipe O&M Delfos',
          _propostaOM: p,
        } as Atividade & { _propostaOM?: PropostaOM }
      })

    return [...atvs, ...propsOMAsAtividades].sort((a, b) => {
      const timeA = new Date(a.data || a.created).getTime()
      const timeB = new Date(b.data || b.created).getTime()
      return timeB - timeA
    })
  }, [atividades, propostasOM, selectedCliente])

  // WhatsApp autoritativo para o drawer via utilitário central de resolução
  const contatosDoCliDrawer = useMemo(() => {
    if (!selectedCliente?.id || !Array.isArray(contatosAdicionais)) return []
    return contatosAdicionais.filter((ca) => ca.cliente_id === selectedCliente.id)
  }, [selectedCliente?.id, contatosAdicionais])

  const resolucaoDestinoDrawer = useMemo(() => {
    if (!selectedCliente)
      return {
        numero: '',
        numeroLimpo: '',
        origem: 'nenhum' as OrigemNumeroDestino,
        contatoAdicionalNome: undefined,
      }
    return resolverNumeroDestinoClienteSync(selectedCliente, contatosDoCliDrawer)
  }, [selectedCliente, contatosDoCliDrawer])

  // Próxima atividade agendada: atividade pendente com data futura mais próxima (ou a pendente mais próxima de agora)
  const proximaAtividade = useMemo<Atividade | null>(() => {
    if (!selectedCliente) return null
    const pendentes = atividades.filter(
      (a) =>
        a.cliente_id === selectedCliente.id &&
        a.status === 'pendente' &&
        a.tipo !== 'mudanca_estagio',
    )
    if (pendentes.length === 0) return null

    const now = Date.now()
    // Prioriza atividades futuras ordenadas pela data mais próxima; se não houver futuras, pega a pendente mais recente
    const futuras = pendentes
      .filter((a) => new Date(a.data || a.created).getTime() >= now - 60 * 60 * 1000)
      .sort(
        (a, b) => new Date(a.data || a.created).getTime() - new Date(b.data || b.created).getTime(),
      )

    if (futuras.length > 0) return futuras[0]

    // Se só tem pendentes atrasadas, pega a mais recente entre elas
    return pendentes.sort(
      (a, b) => new Date(b.data || b.created).getTime() - new Date(a.data || a.created).getTime(),
    )[0]
  }, [atividades, selectedCliente])

  // Manutenções do cliente
  const clientManutencoes = useMemo(() => {
    if (!selectedCliente) return []
    return manutencoes
      .filter((m) => m.cliente_id === selectedCliente.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [manutencoes, selectedCliente])

  // Eventos de projeto do cliente
  const clientProjetoEventos = useMemo(() => {
    if (!selectedClienteProjeto) return []
    return projetoEventos
      .filter((ev) => ev.projeto_id === selectedClienteProjeto.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [projetoEventos, selectedClienteProjeto])

  // Orçamentos Solares do cliente (ordenados cronologicamente / por número de revisão)
  const clientOrcamentosSolar = useMemo(() => {
    if (!selectedCliente) return []
    return orcamentosSolar
      .filter((o) => o.cliente_id === selectedCliente.id)
      .sort(
        (a, b) =>
          (b.numero_revisao || 1) - (a.numero_revisao || 1) ||
          new Date(b.data_orcamento || b.created).getTime() -
            new Date(a.data_orcamento || a.created).getTime(),
      )
  }, [orcamentosSolar, selectedCliente])

  // Propostas O&M do cliente
  const clientPropostasOM = useMemo(() => {
    if (!selectedCliente) return []
    return propostasOM
      .filter((p) => p.cliente_id === selectedCliente.id)
      .sort(
        (a, b) =>
          new Date(b.data_proposta || b.created).getTime() -
          new Date(a.data_proposta || a.created).getTime(),
      )
  }, [propostasOM, selectedCliente])

  // Proposta O&M aprovada / fechada do cliente selecionado
  const propostaOMAprovada = useMemo<PropostaOM | null>(() => {
    return (
      clientPropostasOM.find((p) => {
        const s = (p.status || '').toLowerCase().trim()
        return s === 'aprovado' || s === 'aprovada' || s === 'fechado' || s === 'fechada'
      }) || null
    )
  }, [clientPropostasOM])

  // Handler para acionar o fluxo Gerar Procuração O&M
  const handleDispararGerarProcuracao = () => {
    setModalProcuracaoOMOpen(true)
  }

  // Handler para acionar o fluxo Gerar Contrato O&M
  const handleDispararGerarContrato = () => {
    setModalContratoOMOpen(true)
  }

  // Handler para Exclusão Permanente do Cliente
  const handleConfirmExcluirCliente = async () => {
    if (!selectedCliente) return
    const nomeCliente = selectedCliente.nome
    setIsDeletingCliente(true)
    try {
      await removeCliente(selectedCliente.id)
      toast.success(`Cliente "${nomeCliente}" excluído permanentemente com sucesso.`)
      setModalExcluirClienteOpen(false)
    } catch (err) {
      console.error('Erro ao excluir cliente:', err)
      toast.error('Erro ao excluir cliente. Tente novamente.')
    } finally {
      setIsDeletingCliente(false)
    }
  }

  // Documentos cadastrados/enviados do cliente selecionado
  const clientDocumentos = useMemo(() => {
    if (!selectedCliente) return []
    return documentosCliente.filter((d) => d.cliente_id === selectedCliente.id)
  }, [documentosCliente, selectedCliente])

  // Helpers para obter status de assinatura por tipo
  const getDocumentoCliente = (tipo: import('@/types/crm').DocumentoClienteTipo) => {
    return clientDocumentos.find((d) => d.tipo === tipo) || null
  }

  // Alternar ou marcar status assinado / aguardando assinatura
  const handleAlternarStatusDocumento = async (
    e: React.MouseEvent,
    tipo: import('@/types/crm').DocumentoClienteTipo,
  ) => {
    e.stopPropagation()
    if (!selectedCliente) return
    const docExistente = getDocumentoCliente(tipo)
    const agoraIso = new Date().toISOString()
    const docNomeCurto =
      tipo === 'procuracao'
        ? 'Procuração'
        : tipo === 'contrato'
          ? 'Contrato'
          : tipo === 'anexo_e'
            ? 'Anexo E'
            : tipo === 'anexo_f'
              ? 'Anexo F'
              : tipo === 'anexo_g'
                ? 'Anexo G'
                : 'Documento'

    if (!docExistente) {
      // Se ainda não existia registro, cria como assinado diretamente
      await addOrUpdateDocumentoCliente({
        cliente_id: selectedCliente.id,
        tipo,
        status_assinatura: 'assinado',
        data_envio: agoraIso,
        data_assinatura: agoraIso,
        autor: 'Usuário CRM Delfos',
        observacoes: `${docNomeCurto} marcado manualmente como assinado pelo operador.`,
      })

      // Linha do Tempo Unificada
      await addAtividade({
        cliente_id: selectedCliente.id,
        tipo: 'outro' as AtividadeTipo,
        titulo: `Documento Assinado: ${docNomeCurto}`,
        descricao: `${docNomeCurto} de microgeração solar foi conferido e marcado como assinado com sucesso.`,
        data: agoraIso,
        status: 'concluida',
        autor: 'CRM Delfos Solar',
      })
      return
    }

    if (docExistente.status_assinatura === 'assinado') {
      // Reabrir / Voltar para aguardando assinatura
      await updateDocumentoClienteStatus(docExistente.id, 'aguardando_assinatura')
    } else {
      // Marcar como assinado
      await updateDocumentoClienteStatus(docExistente.id, 'assinado', agoraIso)

      // Registrar na Linha do Tempo Unificada
      await addAtividade({
        cliente_id: selectedCliente.id,
        tipo: 'outro' as AtividadeTipo,
        titulo: `Documento Assinado: ${docNomeCurto}`,
        descricao: `${docNomeCurto} de microgeração solar foi recebido e marcado como assinado.`,
        data: agoraIso,
        status: 'concluida',
        autor: 'CRM Delfos Solar',
      })
    }
  }

  // Callback chamado quando um documento é enviado via WhatsApp ou confirmado
  const handleDocumentoEnviadoWhatsApp = async ({
    tipo,
    telefone,
    mensagem,
  }: {
    tipo: import('@/types/crm').DocumentoClienteTipo
    telefone: string
    mensagem: string
  }) => {
    if (!selectedCliente) return
    const agoraIso = new Date().toISOString()
    const docNomeCurto =
      tipo === 'procuracao'
        ? 'Procuração'
        : tipo === 'contrato'
          ? 'Contrato'
          : tipo === 'anexo_e'
            ? 'Anexo E'
            : tipo === 'anexo_f'
              ? 'Anexo F'
              : tipo === 'anexo_g'
                ? 'Anexo G'
                : tipo === 'troca_titularidade'
                  ? 'Troca de Titularidade'
                  : 'Documento'

    // 1. Persiste o status como aguardando_assinatura (ou mantém assinado se já estava)
    const docAtual = getDocumentoCliente(tipo)
    const novoStatus: import('@/types/crm').DocumentoClienteStatusAssinatura =
      docAtual?.status_assinatura === 'assinado' ? 'assinado' : 'aguardando_assinatura'

    await addOrUpdateDocumentoCliente({
      cliente_id: selectedCliente.id,
      tipo,
      status_assinatura: novoStatus,
      data_envio: agoraIso,
      data_assinatura: novoStatus === 'assinado' ? docAtual?.data_assinatura : undefined,
      canal_envio: 'whatsapp',
      telefone_envio: telefone,
      autor: 'CRM Delfos Solar',
      observacoes: `Enviado via WhatsApp para ${telefone}. Mensagem: "${mensagem.slice(0, 100)}..."`,
    })

    // 2. Registra na Linha do Tempo Unificada
    await addAtividade({
      cliente_id: selectedCliente.id,
      tipo: 'whatsapp' as AtividadeTipo,
      titulo: `Envio de ${docNomeCurto} pelo WhatsApp`,
      descricao: `Documento "${docNomeCurto}" enviado para ${telefone}. Status atual: ${
        novoStatus === 'assinado' ? 'Assinado' : 'Aguardando Assinatura'
      }.`,
      data: agoraIso,
      status: 'concluida',
      autor: 'CRM Delfos Solar',
    })
  }

  // Proposta solar aprovada mais recente (status 'Aprovada' ou 'aprovada' ou 'Aprovado')
  const propostaAprovada = useMemo<OrcamentoSolar | null>(() => {
    if (!selectedCliente) return null
    return (
      clientOrcamentosSolar.find(
        (o) =>
          o.status?.toLowerCase() === 'aprovado' ||
          o.status?.toLowerCase() === 'aprovada' ||
          o.status_revisao?.toLowerCase() === 'aprovada' ||
          o.status_revisao?.toLowerCase() === 'aprovado',
      ) || null
    )
  }, [clientOrcamentosSolar, selectedCliente])

  // Abrir Modal de Confirmação de Documento pré-preenchido
  const handleAbrirDocumentoProjeto = (
    tipo: TipoDocumentoProjeto,
    proposta?: OrcamentoSolar | null,
  ) => {
    if (!selectedCliente) return
    const p = proposta || propostaAprovada

    const marcaModeloInversorEfetiva =
      p?.marca_inversor ||
      (selectedSistema?.fabricante_inversores && selectedSistema?.modelo_inversores
        ? `${selectedSistema.fabricante_inversores} ${selectedSistema.modelo_inversores}`.trim()
        : selectedSistema?.fabricante_inversores ||
          selectedSistema?.modelo_inversores ||
          (selectedCliente.inversor_marca && selectedCliente.inversor_modelo
            ? `${selectedCliente.inversor_marca} ${selectedCliente.inversor_modelo}`.trim()
            : selectedCliente.inversor_marca ||
              selectedCliente.inversor_modelo ||
              'Growatt MAC 25KTL3-XL'))

    const potenciaProjetoEfetiva =
      p?.potencia_kwp ||
      selectedClienteProjeto?.potencia_kwp ||
      selectedSistema?.potencia_total_kwp ||
      selectedCliente.potencia_kwp ||
      28.5

    const potenciaInversorKwEfetiva =
      selectedSistema?.potencia_pico_inversores_kwp ||
      (potenciaProjetoEfetiva ? Math.round(potenciaProjetoEfetiva * 0.9) : undefined) ||
      selectedSistema?.potencia_total_kwp ||
      selectedCliente.potencia_kwp ||
      25.0

    const modulosQtdEfetiva =
      p?.numero_placas ||
      selectedSistema?.quantidade_modulos ||
      selectedSistema?.quantidade_placas ||
      selectedCliente.placas_qtd ||
      (potenciaProjetoEfetiva > 0 ? Math.round((potenciaProjetoEfetiva * 1000) / 570) : 50)

    const dadosIniciais: Partial<DadosDocumentoProjetoInput> = {
      tipo,
      clienteNome: selectedCliente.nome || '',
      clienteCpfCnpj: selectedCliente.cpf || selectedCliente.cnpj || '',
      clienteEndereco: [selectedCliente.endereco, selectedCliente.numero, selectedCliente.bairro]
        .filter(Boolean)
        .join(', '),
      clienteTelefone: selectedCliente.telefone || selectedCliente.whatsapp || '',
      clienteEmail: selectedCliente.email || '',
      titularNome: selectedCliente.titular_nome || selectedCliente.nome || '',
      titularCpf: selectedCliente.titular_cpf || selectedCliente.cpf || selectedCliente.cnpj || '',
      titularTelefone:
        selectedCliente.titular_telefone ||
        selectedCliente.telefone ||
        selectedCliente.whatsapp ||
        '',
      titularEmail: selectedCliente.titular_email || selectedCliente.email || '',
      numeroUC:
        selectedSistema?.numero_uc ||
        selectedCliente.uc ||
        selectedCliente.numero_uc ||
        '4091823719',
      concessionaria:
        selectedCliente.concessionaria ||
        selectedSistema?.concessionaria ||
        'RGE (Rio Grande Energia)',
      potenciaKwp: potenciaProjetoEfetiva,
      quantidadeModulos: modulosQtdEfetiva,
      marcaModeloModulos:
        p?.marca_painel ||
        selectedSistema?.fabricante_modulos ||
        selectedSistema?.modelo_modulos ||
        selectedSistema?.marca_placas ||
        selectedCliente.placas_marca ||
        'Canadian Solar 570W TOPCon',
      marcaModeloInversor: marcaModeloInversorEfetiva,
      potenciaInversorKw: potenciaInversorKwEfetiva,
      valorTotal: p?.valor_investimento || selectedCliente.valor_estimado || 78500,
      condicoesPagamento: 'Entrada de 30% + Saldo financiado ou na homologação',
      cidade: selectedClienteProjeto?.cidade || selectedCliente.cidade || 'Erechim / RS',
    }

    setModalDocProjetoTipo(tipo)
    setModalDocProjetoDados(dadosIniciais)
    setModalDocProjetoOpen(true)
  }

  if (!selectedClienteId || !selectedCliente) {
    return null
  }

  const handleCreateProjeto = async () => {
    if (!selectedCliente) return
    setIsCreatingProjeto(true)
    try {
      await addProjeto({
        cliente_id: selectedCliente.id,
        etapa: 'Levantamento de Informações',
        potencia_kwp: selectedSistema?.potencia_total_kwp ?? selectedCliente.potencia_kwp ?? 0,
        cidade: selectedCliente.cidade || '',
      })
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
      alert('Falha ao criar projeto para o cliente.')
    } finally {
      setIsCreatingProjeto(false)
    }
  }

  const handleUpdateClienteField = async (field: keyof Cliente, value: unknown) => {
    const patch: Partial<Cliente> = { [field]: value } as Partial<Cliente>
    if (field === 'whatsapp') {
      const waVal = String(value || '').trim()
      // Regra permanente do CRM Delfos Solar:
      // WhatsApp é o número autoritativo do cliente — quando divergir, o telefone é igualado ao WhatsApp.
      if (waVal) {
        patch.telefone = waVal
      }
    } else if (field === 'telefone') {
      const telVal = String(value || '').trim()
      // Regra permanente do CRM Delfos Solar:
      // Telefone copia para WhatsApp APENAS se o WhatsApp estiver vazio.
      const waAtual = (selectedCliente.whatsapp || '').trim()
      if (!waAtual && telVal) {
        patch.whatsapp = telVal
      }
    }
    await updateCliente(selectedCliente.id, patch)
  }

  const handleUpdateSistemaField = async (field: keyof Sistema, value: unknown) => {
    await updateSistema(selectedCliente.id, { [field]: value } as Partial<Sistema>)
    if (field === 'potencia_total_kwp') {
      await updateCliente(selectedCliente.id, { potencia_kwp: Number(value) || 0 })
    } else if (field === 'numero_uc') {
      await updateCliente(selectedCliente.id, { uc: String(value || '') })
    } else if (field === 'data_instalacao') {
      await updateCliente(selectedCliente.id, { data_instalacao: String(value || '') })
    } else if (field === 'tipo_telhado') {
      await updateCliente(selectedCliente.id, { telhado_tipo: value as TelhadoTipo })
    }
    await recarregarUsinas()
  }

  const getServiceIcon = (tipo: string) => {
    switch (tipo) {
      case 'Limpeza':
      case 'Limpeza e Lavagem de Placas':
        return <Droplets className="w-4 h-4 text-blue-500" />
      case 'Revisão Elétrica':
      case 'Revisão Elétrica e Reaperto':
      case 'Verificação Elétrica':
        return <Zap className="w-4 h-4 text-amber-500" />
      case 'Troca de Inversor':
      case 'Manutenção Corretiva / Inversor':
      case 'Manutenção Corretiva de Inversor':
        return <Settings className="w-4 h-4 text-purple-500" />
      default:
        return <Wrench className="w-4 h-4 text-gray-500" />
    }
  }

  const potenciaExibida = selectedSistema?.potencia_total_kwp ?? selectedCliente.potencia_kwp ?? 0
  const geracaoExibida =
    selectedSistema?.geracao_media_mensal_kwh ??
    (potenciaExibida > 0 ? Math.round(potenciaExibida * 125) : 0)
  const dataInstalacaoExibida =
    selectedSistema?.data_instalacao || selectedCliente.data_instalacao || ''
  const ucExibida = selectedSistema?.numero_uc || selectedCliente.uc || ''
  const telhadoExibido = selectedSistema?.tipo_telhado || selectedCliente.telhado_tipo || 'ceramico'
  const concessionariaExibida =
    selectedCliente.concessionaria || selectedSistema?.concessionaria || ''
  const classeConsumoExibida =
    selectedCliente.classe_consumo || selectedSistema?.classe_consumo || ''
  const tarifaExibida = selectedCliente.tarifa ?? selectedSistema?.tarifa ?? 0

  const cleanWaDrawer = cleanPhoneDigits(
    resolucaoDestinoDrawer.numero || selectedCliente.whatsapp || selectedCliente.telefone || '',
  )
  const waDigitsDrawer =
    cleanWaDrawer.length >= 10 && !cleanWaDrawer.startsWith('55')
      ? `55${cleanWaDrawer}`
      : cleanWaDrawer
  const rawTelDrawer = cleanPhoneDigits(selectedCliente.telefone || '')

  // Funil comercial padrão ordenado para a barra de progresso mobile
  const FUNIL_PROGRESS_STAGES: ClienteStatus[] = [
    'Novo Lead',
    'Levantamento',
    'Orçamento',
    'Negociação',
    'Fechado',
  ]
  const currentStageIndex = FUNIL_PROGRESS_STAGES.indexOf(selectedCliente.status as ClienteStatus)
  const stageProgressPct =
    selectedCliente.status === 'Perdido'
      ? 100
      : currentStageIndex >= 0
        ? Math.round(((currentStageIndex + 1) / FUNIL_PROGRESS_STAGES.length) * 100)
        : 20

  const handleShareCliente = async () => {
    const shareText = `Cliente: ${selectedCliente.nome}\nStatus: ${selectedCliente.status}\nValor: ${formatCurrency(selectedCliente.valor_estimado || 0)}\nWhatsApp: ${selectedCliente.whatsapp || selectedCliente.telefone || 'N/A'}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: selectedCliente.nome,
          text: shareText,
          url: window.location.href,
        })
      } catch (err) {
        // Usuário cancelou ou navegador não completou o share
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText)
      toast.success('Dados do negócio copiados para a área de transferência!')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={closeFichaCliente}
        aria-hidden="true"
      />

      {/* Drawer panel: ocupa quase toda a largura da tela no desktop (~calc(100vw - 68px)), deixando a sidebar visível; tela cheia no mobile */}
      <div className="relative z-50 w-full lg:w-[calc(100vw-68px)] max-w-full bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* ============================================================== */}
        {/* HEADER MOBILE (apenas md:hidden) — Minimalista estilo Pipedrive  */}
        {/* ============================================================== */}
        <div className="md:hidden border-b border-gray-200 bg-white sticky top-0 z-20">
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            {/* Esquerda: Botão Voltar */}
            <button
              type="button"
              onClick={closeFichaCliente}
              className="p-1.5 -ml-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 font-medium text-xs"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
              <span>Voltar</span>
            </button>

            {/* Direita: Compartilhar, Editar e Menu ⋮ de Opções */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleShareCliente}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="Compartilhar negócio"
                aria-label="Compartilhar negócio"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleDetalhes}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="Editar detalhes do cliente"
                aria-label="Editar detalhes"
              >
                <Pencil className="w-4 h-4" />
              </button>

              {/* Menu ⋮ de Opções com ações secundárias que saíram do topo */}
              <div
                className="flex items-center"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                      title="Mais opções"
                      aria-label="Mais opções do negócio"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-xs">
                    {/* Opção Orçamento Solar */}
                    <DropdownMenuItem
                      onClick={() => {
                        setOrcamentoSolarVisualizar(null)
                        setIsModalOrcamentoSolarOpen(true)
                      }}
                      className="cursor-pointer gap-2 text-slate-700 text-xs"
                    >
                      <Sun className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Gerar Orçamento Solar</span>
                    </DropdownMenuItem>

                    {/* Opção Importar Documento */}
                    <DropdownMenuItem
                      onClick={() => setImportDocOpen(true)}
                      className="cursor-pointer gap-2 text-slate-700 text-xs"
                    >
                      <UploadCloud className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Importar por Documento</span>
                    </DropdownMenuItem>

                    {/* Opção Atividades de Manutenção */}
                    <DropdownMenuItem
                      onClick={() => setDrawerAtividadesManutencaoOpen(true)}
                      className="cursor-pointer gap-2 text-slate-700 text-xs"
                    >
                      <Wrench className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Atividades Manutenção</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Marcar como Perdido / Reabrir Oportunidade */}
                    {[
                      'Novo Lead',
                      'Levantamento',
                      'Orçamento',
                      'Negociação',
                      'Contato Futuro',
                    ].includes(selectedCliente.status) &&
                    !selectedCliente.transferido_pos_vendas &&
                    !selectedCliente.status_pos_vendas ? (
                      <DropdownMenuItem
                        onClick={() => setModalPerdidoOpen(true)}
                        className="cursor-pointer gap-2 text-rose-700 focus:text-rose-800 focus:bg-rose-50 font-medium"
                      >
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Marcar como Perdido</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => setModalNovaOportunidadeOpen(true)}
                        className="cursor-pointer gap-2 text-amber-700 focus:text-amber-800 focus:bg-amber-50 font-medium"
                      >
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Nova Oportunidade</span>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => setModalExcluirClienteOpen(true)}
                      className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Excluir cliente</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Destaque no topo mobile: Nome do negócio e Valor */}
          <div className="px-4 pb-3">
            <h1
              className="text-lg font-bold text-gray-900 tracking-tight truncate leading-tight"
              title={selectedCliente.nome}
            >
              {selectedCliente.nome}
            </h1>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-[#1a3a5c]">
                {formatCurrency(selectedCliente.valor_estimado || 0)}
              </span>
              <span className="text-xs font-semibold text-slate-500 truncate">
                • {selectedCliente.status}
              </span>
            </div>

            {/* Barra de progresso visual mostrando a etapa atual do funil */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Etapa: {selectedCliente.status}</span>
                <span>{stageProgressPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    selectedCliente.status === 'Perdido'
                      ? 'bg-rose-500'
                      : selectedCliente.status === 'Fechado'
                        ? 'bg-emerald-600'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${stageProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Header desktop: dados essenciais e ações (inalterado no desktop: hidden md:flex) */}
        <div className="hidden md:flex p-4 border-b border-gray-100 items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0 pr-2">
            <InlineEditField
              value={selectedCliente.nome}
              displayValue={
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">
                  {selectedCliente.nome}
                </h2>
              }
              type="text"
              placeholder="Nome do cliente"
              onSave={async (val) => {
                const str = String(val).trim()
                if (!str) throw new Error('O nome não pode ficar vazio')
                await handleUpdateClienteField('nome', str)
              }}
            />
            <InlineEditField
              value={selectedCliente.status}
              displayValue={<StatusBadge status={selectedCliente.status} />}
              type="select"
              options={ETAPAS_STATUS.map((e) => ({ value: e.value, label: e.label }))}
              onSave={async (val) => {
                const novoStatus = val as ClienteStatus
                if (novoStatus === selectedCliente.status) return
                if (novoStatus === 'Perdido') {
                  const confirmou = window.confirm(
                    `Deseja marcar "${selectedCliente.nome}" como Perdido?\n\nO cliente sairá do funil de vendas comercial e ficará registrado como Perdido apenas na gestão de clientes.`,
                  )
                  if (!confirmou) {
                    return
                  }
                }
                await updateClienteStatus(selectedCliente.id, novoStatus)
              }}
            />
            {selectedCliente.status === 'Perdido' && (
              <>
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  Fora do funil
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const confirmou = window.confirm(
                      `Deseja reativar o cliente "${selectedCliente.nome}" e devolvê-lo ao funil de vendas?`,
                    )
                    if (!confirmou) return

                    // Descobrir estágio anterior a partir do histórico de atividades
                    const statusValidos: ClienteStatus[] = [
                      'Novo Lead',
                      'Levantamento',
                      'Orçamento',
                      'Negociação',
                      'Fechado',
                      'Contato Futuro',
                    ]
                    let estagioDestino: ClienteStatus = 'Novo Lead'

                    // Procura a última atividade de mudança de estágio para Perdido
                    const atvsCliente = atividades
                      .filter((a) => a.cliente_id === selectedCliente.id)
                      .sort(
                        (a, b) =>
                          new Date(b.data || b.created).getTime() -
                          new Date(a.data || a.created).getTime(),
                      )

                    for (const atv of atvsCliente) {
                      const titulo = atv.titulo || ''
                      // Formato: "Mudança de estágio: {anterior} → Perdido"
                      const match = titulo.match(
                        /Mudança de estágio:\s*([^\s→]+(?:\s+[^\s→]+)*)\s*→\s*Perdido/i,
                      )
                      if (match && match[1]) {
                        const anteriorCandidato = match[1].trim() as ClienteStatus
                        if (
                          statusValidos.includes(anteriorCandidato) &&
                          anteriorCandidato !== 'Perdido'
                        ) {
                          estagioDestino = anteriorCandidato
                          break
                        }
                      }
                    }

                    await updateClienteStatus(selectedCliente.id, estagioDestino)
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-all hover:scale-[1.02]"
                  title="Reativar cliente e devolver ao funil de vendas"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reativar cliente</span>
                </button>
              </>
            )}
            <OrigemClienteBadge cliente={selectedCliente} showSublabel />
            <InlineEditField
              value={selectedCliente.tipo_venda || selectedCliente.produto || 'Energia Solar'}
              displayValue={
                <span className="font-semibold text-xs px-2 py-0.5 rounded-full border bg-slate-100 text-slate-800 border-slate-300">
                  {selectedCliente.tipo_venda || selectedCliente.produto || 'Energia Solar'}
                </span>
              }
              type="select"
              options={[
                { value: 'Energia Solar', label: 'Energia Solar' },
                { value: 'O&M (Operação e Manutenção)', label: 'O&M (Operação e Manutenção)' },
                { value: 'Baterias', label: 'Baterias' },
                {
                  value: 'Carregadores Veículos Elétricos',
                  label: 'Carregadores Veículos Elétricos',
                },
              ]}
              onSave={async (val) => {
                await handleUpdateClienteField('tipo_venda', val as string)
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Botões de Decisão Comercial (desktop) */}
            {['Novo Lead', 'Levantamento', 'Orçamento', 'Negociação', 'Contato Futuro'].includes(
              selectedCliente.status,
            ) &&
            !selectedCliente.transferido_pos_vendas &&
            !selectedCliente.status_pos_vendas ? (
              <button
                type="button"
                onClick={() => setModalPerdidoOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02] active:scale-95"
                title="Marcar oportunidade como Perdido (registrar motivo)"
              >
                <IconX className="w-3.5 h-3.5 shrink-0 text-rose-700" />
                <span>Marcar como Perdido</span>
              </button>
            ) : (
              (selectedCliente.transferido_pos_vendas ||
                Boolean(selectedCliente.status_pos_vendas) ||
                selectedCliente.status === 'Fechado' ||
                contratosOM.some(
                  (c) => c.cliente_id === selectedCliente.id && c.status === 'Ativo',
                )) && (
                <button
                  type="button"
                  onClick={() => setModalNovaOportunidadeOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02] active:scale-95 ring-1 ring-amber-500/50"
                  title="Reabrir cliente no Funil de Vendas com uma Nova Oportunidade Comercial"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                  <span>Nova Oportunidade</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => setImportDocOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02] ${
                importDocOpen
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
              }`}
              title="Importar dados automaticamente por documento (Conta de Luz, CNH, RG, Planilha)"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Importar por Documento</span>
              <span className="sm:hidden">Importar Doc</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOrcamentoSolarVisualizar(null)
                setIsModalOrcamentoSolarOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02]"
              title="Gerar Orçamento Técnico de Energia Solar Fotovoltaica"
            >
              <Sun className="w-4 h-4" />
              <span className="hidden sm:inline">Gerar Orçamento Solar</span>
              <span className="sm:hidden">Orçamento</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerAtividadesManutencaoOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02]"
              title="Visualizar e gerenciar atividades de manutenção, serviços e designar equipes"
            >
              <Wrench className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Atividades de Manutenção</span>
              <span className="sm:hidden">Atividades Manutenção</span>
            </button>

            <button
              onClick={closeFichaCliente}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              title="Fechar ficha"
              aria-label="Fechar ficha do cliente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Layout Pipedrive em 2 Colunas:
            - Desktop: Flex horizontal (painel principal à esquerda 65-70%, resumo fixo à direita 30-35%)
            - Mobile: Flex vertical com scroll suave e livre de travamentos
        */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row bg-[#F8FAF9]/70 overscroll-contain">
          {/* ================================================================ */}
          {/* COLUNA ESQUERDA: PAINEL PRINCIPAL — ABA ÚNICA "HISTÓRICO"        */}
          {/* No mobile: se detalhesOpen estiver ativo, oculta para focar      */}
          {/* ================================================================ */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto flex-col min-w-0 border-b md:border-b-0 md:border-r border-gray-200/80 bg-white ${
              detalhesOpen ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header com Abas (Mobile e Desktop) */}
            {/* 1. ABAS MOBILE (md:hidden) — scroll horizontal suave para todas as abas */}
            <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-3 pt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setActiveClientTab('historico')
                  setDetalhesOpen(false)
                }}
                className={`shrink-0 py-2 px-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                  activeClientTab === 'historico'
                    ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Atividades</span>
                {timelineAtividades.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                    {timelineAtividades.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveClientTab('cadastro')
                  setDetalhesOpen(false)
                }}
                className={`shrink-0 py-2 px-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                  activeClientTab === 'cadastro'
                    ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cadastro</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveClientTab('usinas')
                  setDetalhesOpen(false)
                }}
                className={`shrink-0 py-2 px-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                  activeClientTab === 'usinas'
                    ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Usinas</span>
                {usinasDoCliente.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                    {usinasDoCliente.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveClientTab('projeto')
                  setDetalhesOpen(false)
                }}
                className={`shrink-0 py-2 px-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                  activeClientTab === 'projeto'
                    ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5 text-emerald-600" />
                <span>Projeto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveClientTab('om')
                  setDetalhesOpen(false)
                }}
                className={`shrink-0 py-2 px-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                  activeClientTab === 'om'
                    ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>O&M</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveClientTab('whatsapp')
                  setDetalhesOpen(false)
                }}
                className={`shrink-0 py-2 px-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                  activeClientTab === 'whatsapp'
                    ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* 2. ABAS DESKTOP (hidden md:flex) */}
            <div className="hidden md:flex sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-3 items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveClientTab('historico')}
                  className={`px-3.5 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-1.5 transition-colors ${
                    activeClientTab === 'historico'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Clock className="w-4 h-4 text-[#16A34A]" />
                  <span>Atividades</span>
                  {timelineAtividades.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {timelineAtividades.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientTab('cadastro')}
                  className={`px-3.5 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-1.5 transition-colors ${
                    activeClientTab === 'cadastro'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Cadastro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientTab('usinas')}
                  className={`px-3.5 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-1.5 transition-colors ${
                    activeClientTab === 'usinas'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Usinas</span>
                  {usinasDoCliente.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                      {usinasDoCliente.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientTab('projeto')}
                  className={`px-3.5 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-1.5 transition-colors ${
                    activeClientTab === 'projeto'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <FolderKanban className="w-4 h-4 text-emerald-600" />
                  <span>Projeto</span>
                  {selectedClienteProjeto && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {selectedClienteProjeto.etapa}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientTab('om')}
                  className={`px-3.5 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-1.5 transition-colors ${
                    activeClientTab === 'om'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>O&M (Manutenção)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientTab('whatsapp')}
                  className={`px-3.5 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-1.5 transition-colors ${
                    activeClientTab === 'whatsapp'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp</span>
                  {selectedCliente && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {whatsAppMensagens.filter((m) => m.cliente_id === selectedCliente.id).length}
                    </span>
                  )}
                </button>
              </div>

              {/* Botão de atalho para Cadastro rápido */}
              <button
                type="button"
                onClick={() => setActiveClientTab('cadastro')}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all flex items-center gap-1.5 shrink-0"
              >
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ver Cadastro Completo</span>
              </button>
            </div>

            {/* Conteúdo do Painel Principal */}
            <div className="p-4 space-y-4 flex-1">
              {/* ======================================================== */}
              {/* SEÇÃO IMPORTAR DADOS POR DOCUMENTO (IA NATIVA SKIP CLOUD) */}
              {/* ======================================================== */}
              {importDocOpen && (
                <ImportarDadosDocumento
                  cliente={selectedCliente}
                  sistema={selectedSistema}
                  onClose={() => setImportDocOpen(false)}
                  onApplyImport={async ({
                    clienteUpdates,
                    sistemaUpdates,
                    fileName,
                    resumoCampos,
                  }) => {
                    // 1. Atualizar cliente
                    if (Object.keys(clienteUpdates).length > 0) {
                      await updateCliente(selectedCliente.id, clienteUpdates)
                    }

                    // 2. Atualizar sistema / usina
                    if (Object.keys(sistemaUpdates).length > 0) {
                      await updateSistema(selectedCliente.id, sistemaUpdates)
                      await recarregarUsinas()
                    }

                    // 3. Registrar evento na timeline / histórico do cliente
                    const detalhesTexto =
                      resumoCampos.length > 0
                        ? `Campos atualizados:\n• ${resumoCampos.slice(0, 10).join('\n• ')}${
                            resumoCampos.length > 10
                              ? `\n...e mais ${resumoCampos.length - 10} campos.`
                              : ''
                          }`
                        : 'Dados extraídos e atualizados com sucesso.'

                    await addAtividade({
                      cliente_id: selectedCliente.id,
                      tipo: 'anotacao',
                      titulo: `Dados importados de documento: ${fileName}`,
                      descricao: detalhesTexto,
                      data: new Date().toISOString(),
                      status: 'concluida',
                      responsavel_nome: 'IA Extrator Delfos',
                    })
                  }}
                />
              )}

              {/* ======================================================== */}
              {/* ABA O&M: Plano, Serviços Avulsos e Anomalias             */}
              {/* ======================================================== */}
              {activeClientTab === 'om' && (
                <div className="space-y-4">
                  <FichaClienteOM
                    clienteId={selectedCliente.id}
                    onNavigateToTab={(tab) => setActiveClientTab(tab)}
                  />
                </div>
              )}

              {/* ======================================================== */}
              {/* ABA WHATSAPP: Mensagens, Envio Manual, Templates, Fila   */}
              {/* ======================================================== */}
              {activeClientTab === 'whatsapp' && (
                <FichaClienteWhatsApp
                  cliente={selectedCliente}
                  onOpenTemplatesModal={() => setModalWhatsAppTemplatesOpen(true)}
                />
              )}

              {/* ======================================================== */}
              {/* ABA PROJETO: Funil Operacional, Responsável e Histórico  */}
              {/* ======================================================== */}
              {activeClientTab === 'projeto' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {!selectedClienteProjeto ? (
                    <div className="p-8 text-center bg-gray-50/70 rounded-2xl border-2 border-dashed border-gray-200 space-y-3">
                      <FolderKanban className="w-10 h-10 text-emerald-600 mx-auto opacity-70" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">
                          Nenhum projeto operacional cadastrado
                        </h4>
                        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                          Este cliente ainda não está no funil de engenharia e execução solar.
                          Inicie o projeto na etapa de Levantamento de Informações.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateProjeto}
                        disabled={isCreatingProjeto}
                        className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          {isCreatingProjeto ? 'Criando Projeto...' : 'Criar Projeto Solar'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Card de Status do Projeto */}
                      <div className="p-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-100">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                              <FolderKanban className="w-5 h-5 text-emerald-700" />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                                Projeto em Execução
                              </div>
                              <h3 className="text-base font-bold text-gray-900">
                                {selectedCliente.nome}
                              </h3>
                            </div>
                          </div>

                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Etapa: {selectedClienteProjeto.etapa}
                          </span>
                        </div>

                        {/* Grade com Seletor de Etapa e Profissional */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Seletor de Etapa */}
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                              Mudar Etapa do Projeto:
                            </label>
                            <select
                              value={selectedClienteProjeto.etapa}
                              onChange={async (e) => {
                                const nextEtapa = e.target.value as ProjetoEtapa
                                await updateProjetoEtapa(selectedClienteProjeto.id, nextEtapa)
                              }}
                              className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                            >
                              {[
                                'Levantamento de Informações',
                                'Elaboração de Projeto',
                                'Pedido de Compra',
                                'Aguardando Material',
                                'Instalação',
                                'Concluído',
                              ].map((et) => (
                                <option key={et} value={et}>
                                  {et}
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] text-gray-400">
                              Atualiza o kanban de projetos e registra a mudança com data.
                            </p>
                          </div>

                          {/* Seletor de Profissional Responsável */}
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                                <HardHat className="w-3.5 h-3.5 text-emerald-600" />
                                Profissional Responsável:
                              </label>
                              {['Instalação', 'Manutenção', 'Limpeza'].some((s) =>
                                selectedClienteProjeto.etapa.includes(s),
                              ) && (
                                <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.2 rounded">
                                  Obrigatório / Serviço
                                </span>
                              )}
                            </div>

                            <select
                              value={selectedClienteProjeto.profissional_id || ''}
                              onChange={async (e) => {
                                const profId = e.target.value
                                const prof = profissionais.find((p) => p.id === profId)
                                await assignProjetoProfissional(
                                  selectedClienteProjeto.id,
                                  prof ? prof.id : null,
                                  prof ? prof.nome : null,
                                )
                              }}
                              className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                            >
                              <option value="">Nenhum profissional selecionado</option>
                              {profissionais.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nome} ({p.especialidade})
                                </option>
                              ))}
                            </select>

                            <div className="text-[11px] text-gray-600 pt-0.5 flex items-center justify-between">
                              {selectedClienteProjeto.profissional_nome ? (
                                <span className="font-semibold text-emerald-800 flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  {selectedClienteProjeto.profissional_nome}
                                </span>
                              ) : (
                                <span className="text-amber-700 italic">
                                  Nenhum profissional atribuído no momento
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dados rápidos do projeto */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                          <div className="p-2 bg-white rounded-lg border border-gray-200">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                              Potência
                            </span>
                            <span className="font-bold text-emerald-700">
                              {selectedClienteProjeto.potencia_kwp || potenciaExibida} kWp
                            </span>
                          </div>

                          <div className="p-2 bg-white rounded-lg border border-gray-200">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                              Cidade / Região
                            </span>
                            <span className="font-semibold text-gray-800 truncate block">
                              {selectedClienteProjeto.cidade || selectedCliente.cidade || 'N/A'}
                            </span>
                          </div>

                          <div className="p-2 bg-white rounded-lg border border-gray-200 col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                              Início do Projeto
                            </span>
                            <span className="font-semibold text-gray-800">
                              {formatDate(selectedClienteProjeto.created)}
                            </span>
                          </div>
                        </div>

                        {selectedClienteProjeto.observacoes && (
                          <div className="p-2.5 bg-gray-50/70 rounded-lg border border-gray-200 text-xs text-gray-600">
                            <strong className="text-gray-700 block mb-0.5 text-[11px]">
                              Observações:
                            </strong>
                            <p className="italic">"{selectedClienteProjeto.observacoes}"</p>
                          </div>
                        )}
                      </div>

                      {/* Documentos do Projeto Fotovoltaico */}
                      {(() => {
                        // Se houver proposta aprovada usa ela, caso contrário usa dados do projeto/cliente/sistema
                        const docPotencia =
                          propostaAprovada?.potencia_kwp ||
                          selectedClienteProjeto?.potencia_kwp ||
                          potenciaExibida ||
                          selectedCliente.potencia_kwp ||
                          0
                        const docValor =
                          propostaAprovada?.valor_investimento ||
                          selectedCliente.valor_estimado ||
                          0

                        return (
                          <div className="p-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 shadow-xs space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-100">
                              <div className="flex items-center gap-2">
                                <FileCheck className="w-4 h-4 text-emerald-700" />
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                                    <span>Documentação Técnica & Contratual do Projeto</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 normal-case">
                                      {propostaAprovada
                                        ? 'Proposta Solar Aprovada'
                                        : selectedClienteProjeto?.etapa || 'Projeto em Andamento'}
                                    </span>
                                  </h4>
                                  <p className="text-[11px] text-gray-600">
                                    Gere os documentos oficiais revisando os dados da proposta ou do
                                    projeto e do titular antes do download.
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                                {docPotencia > 0 ? `${docPotencia} kWp` : 'Potência a definir'}{' '}
                                {docValor > 0 ? `• ${formatCurrency(docValor)}` : ''}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 pt-1">
                              {/* Card 0: Solicitação de Informações (Checklist de documentos faltantes e gerador de mensagem) */}
                              {(() => {
                                const pendentesCount = Array.isArray(
                                  selectedCliente.pendencias_informacoes,
                                )
                                  ? selectedCliente.pendencias_informacoes.length
                                  : 0

                                return (
                                  <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-emerald-200/90 shadow-2xs transition-all hover:border-emerald-400 group">
                                    <div
                                      onClick={() => setModalSolicitacaoInfoOpen(true)}
                                      className="cursor-pointer space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                          <ClipboardList className="w-4 h-4" />
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          Checklist
                                        </span>
                                      </div>
                                      <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 block">
                                        Solicitação de Informações
                                      </span>
                                      <span className="text-[11px] text-gray-500 block leading-tight">
                                        Documentos para projeto e contrato
                                      </span>
                                    </div>

                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                                      {pendentesCount > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                          <Clock className="w-3 h-3 text-amber-700" />
                                          <span>{pendentesCount} pendente(s)</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Em dia</span>
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => setModalSolicitacaoInfoOpen(true)}
                                        className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 underline transition-colors"
                                        title="Abrir checklist de documentos faltantes"
                                      >
                                        Gerar texto
                                      </button>
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* Card 1: Procuração (aciona o mesmo fluxo/modal de Procuração do O&M / Projetos) */}
                              {(() => {
                                const doc = getDocumentoCliente('procuracao')
                                const isAssinado = doc?.status_assinatura === 'assinado'
                                const isAguardando =
                                  doc?.status_assinatura === 'aguardando_assinatura'

                                return (
                                  <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-emerald-200/90 shadow-2xs transition-all hover:border-emerald-400 group">
                                    <div
                                      onClick={() =>
                                        handleAbrirDocumentoProjeto('procuracao', propostaAprovada)
                                      }
                                      className="cursor-pointer space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                          <FileText className="w-4 h-4" />
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          PDF / Whats
                                        </span>
                                      </div>
                                      <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 block">
                                        Elaborar Procuração
                                      </span>
                                      <span className="text-[11px] text-gray-500 block leading-tight">
                                        Concessionária e homologação
                                      </span>
                                    </div>

                                    {/* Badge de Status de Assinatura + Ação manual de marcar como assinado */}
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                                      {isAssinado ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Assinado</span>
                                        </span>
                                      ) : isAguardando ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                          <Clock className="w-3 h-3 text-amber-700" />
                                          <span>Aguardando Assinatura</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">
                                          Não emitido
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) =>
                                          handleAlternarStatusDocumento(e, 'procuracao')
                                        }
                                        className={`text-[10px] font-semibold underline transition-colors ${
                                          isAssinado
                                            ? 'text-slate-500 hover:text-amber-700'
                                            : 'text-emerald-700 hover:text-emerald-900'
                                        }`}
                                        title={
                                          isAssinado
                                            ? 'Reabrir / Desmarcar como assinado'
                                            : 'Marcar documento como assinado pelo cliente'
                                        }
                                      >
                                        {isAssinado ? 'Reabrir' : 'Marcar assinado'}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* Card 2: Contrato */}
                              {(() => {
                                const doc = getDocumentoCliente('contrato')
                                const isAssinado = doc?.status_assinatura === 'assinado'
                                const isAguardando =
                                  doc?.status_assinatura === 'aguardando_assinatura'

                                return (
                                  <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-emerald-200/90 shadow-2xs transition-all hover:border-emerald-400 group">
                                    <div
                                      onClick={() =>
                                        handleAbrirDocumentoProjeto('contrato', propostaAprovada)
                                      }
                                      className="cursor-pointer space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                          <ShieldCheck className="w-4 h-4" />
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          PDF / Whats
                                        </span>
                                      </div>
                                      <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 block">
                                        Elaborar Contrato
                                      </span>
                                      <span className="text-[11px] text-gray-500 block leading-tight">
                                        Fornecimento e instalação Delfos
                                      </span>
                                    </div>

                                    {/* Badge de Status de Assinatura + Ação manual */}
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                                      {isAssinado ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Assinado</span>
                                        </span>
                                      ) : isAguardando ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                          <Clock className="w-3 h-3 text-amber-700" />
                                          <span>Aguardando Assinatura</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">
                                          Não emitido
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) =>
                                          handleAlternarStatusDocumento(e, 'contrato')
                                        }
                                        className={`text-[10px] font-semibold underline transition-colors ${
                                          isAssinado
                                            ? 'text-slate-500 hover:text-amber-700'
                                            : 'text-emerald-700 hover:text-emerald-900'
                                        }`}
                                        title={
                                          isAssinado
                                            ? 'Reabrir / Desmarcar como assinado'
                                            : 'Marcar documento como assinado pelo cliente'
                                        }
                                      >
                                        {isAssinado ? 'Reabrir' : 'Marcar assinado'}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* Card 3: Anexo E */}
                              {(() => {
                                const doc = getDocumentoCliente('anexo_e')
                                const isAssinado = doc?.status_assinatura === 'assinado'
                                const isAguardando =
                                  doc?.status_assinatura === 'aguardando_assinatura'

                                return (
                                  <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-emerald-200/90 shadow-2xs transition-all hover:border-emerald-400 group">
                                    <div
                                      onClick={() =>
                                        handleAbrirDocumentoProjeto('anexo_e', propostaAprovada)
                                      }
                                      className="cursor-pointer space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                          <FileCheck className="w-4 h-4" />
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          PDF / Whats
                                        </span>
                                      </div>
                                      <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 block">
                                        Elaborar Anexo E
                                      </span>
                                      <span className="text-[11px] text-gray-500 block leading-tight">
                                        Formulário de Acesso Micro/Mini
                                      </span>
                                    </div>

                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                                      {isAssinado ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Assinado</span>
                                        </span>
                                      ) : isAguardando ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                          <Clock className="w-3 h-3 text-amber-700" />
                                          <span>Aguardando Assinatura</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">
                                          Não emitido
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => handleAlternarStatusDocumento(e, 'anexo_e')}
                                        className={`text-[10px] font-semibold underline transition-colors ${
                                          isAssinado
                                            ? 'text-slate-500 hover:text-amber-700'
                                            : 'text-emerald-700 hover:text-emerald-900'
                                        }`}
                                        title={
                                          isAssinado
                                            ? 'Reabrir / Desmarcar como assinado'
                                            : 'Marcar documento como assinado pelo cliente'
                                        }
                                      >
                                        {isAssinado ? 'Reabrir' : 'Marcar assinado'}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* Card 4: Anexo F */}
                              {(() => {
                                const doc = getDocumentoCliente('anexo_f')
                                const isAssinado = doc?.status_assinatura === 'assinado'
                                const isAguardando =
                                  doc?.status_assinatura === 'aguardando_assinatura'

                                return (
                                  <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-emerald-200/90 shadow-2xs transition-all hover:border-emerald-400 group">
                                    <div
                                      onClick={() =>
                                        handleAbrirDocumentoProjeto('anexo_f', propostaAprovada)
                                      }
                                      className="cursor-pointer space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                          <FileText className="w-4 h-4" />
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          PDF / Whats
                                        </span>
                                      </div>
                                      <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 block">
                                        Elaborar Anexo F
                                      </span>
                                      <span className="text-[11px] text-gray-500 block leading-tight">
                                        Memorial descritivo da usina
                                      </span>
                                    </div>

                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                                      {isAssinado ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Assinado</span>
                                        </span>
                                      ) : isAguardando ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                          <Clock className="w-3 h-3 text-amber-700" />
                                          <span>Aguardando Assinatura</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">
                                          Não emitido
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => handleAlternarStatusDocumento(e, 'anexo_f')}
                                        className={`text-[10px] font-semibold underline transition-colors ${
                                          isAssinado
                                            ? 'text-slate-500 hover:text-amber-700'
                                            : 'text-emerald-700 hover:text-emerald-900'
                                        }`}
                                        title={
                                          isAssinado
                                            ? 'Reabrir / Desmarcar como assinado'
                                            : 'Marcar documento como assinado pelo cliente'
                                        }
                                      >
                                        {isAssinado ? 'Reabrir' : 'Marcar assinado'}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* Card 5: Anexo G */}
                              {(() => {
                                const doc = getDocumentoCliente('anexo_g')
                                const isAssinado = doc?.status_assinatura === 'assinado'
                                const isAguardando =
                                  doc?.status_assinatura === 'aguardando_assinatura'

                                return (
                                  <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-emerald-200/90 shadow-2xs transition-all hover:border-emerald-400 group">
                                    <div
                                      onClick={() =>
                                        handleAbrirDocumentoProjeto('anexo_g', propostaAprovada)
                                      }
                                      className="cursor-pointer space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                          <FileCheck className="w-4 h-4" />
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          PDF / Whats
                                        </span>
                                      </div>
                                      <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 block">
                                        Elaborar Anexo G
                                      </span>
                                      <span className="text-[11px] text-gray-500 block leading-tight">
                                        Rateio e compensação (SCEE)
                                      </span>
                                    </div>

                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                                      {isAssinado ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Assinado</span>
                                        </span>
                                      ) : isAguardando ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                          <Clock className="w-3 h-3 text-amber-700" />
                                          <span>Aguardando Assinatura</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">
                                          Não emitido
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => handleAlternarStatusDocumento(e, 'anexo_g')}
                                        className={`text-[10px] font-semibold underline transition-colors ${
                                          isAssinado
                                            ? 'text-slate-500 hover:text-amber-700'
                                            : 'text-emerald-700 hover:text-emerald-900'
                                        }`}
                                        title={
                                          isAssinado
                                            ? 'Reabrir / Desmarcar como assinado'
                                            : 'Marcar documento como assinado pelo cliente'
                                        }
                                      >
                                        {isAssinado ? 'Reabrir' : 'Marcar assinado'}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Histórico de Mudanças de Etapa com Datas */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wider">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            <span>Histórico de Mudanças de Etapa</span>
                            <span className="text-[11px] font-normal text-gray-400">
                              ({clientProjetoEventos.length} registros)
                            </span>
                          </div>
                        </div>

                        {clientProjetoEventos.length === 0 ? (
                          <div className="text-center py-8 text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            Nenhuma mudança de etapa registrada até o momento.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {clientProjetoEventos.map((ev) => (
                              <div
                                key={ev.id}
                                className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-emerald-300 transition-colors space-y-1.5"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                                    <span className="text-gray-500">
                                      {ev.etapa_anterior ? `${ev.etapa_anterior} → ` : ''}
                                    </span>
                                    <span className="text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                                      {ev.etapa_nova}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span>{formatDateTime(ev.data || ev.created)}</span>
                                  </div>
                                </div>

                                {ev.profissional_nome && (
                                  <div className="text-xs text-gray-700 flex items-center gap-1.5 pt-0.5">
                                    <HardHat className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>
                                      Profissional responsável:{' '}
                                      <strong className="text-gray-900 font-semibold">
                                        {ev.profissional_nome}
                                      </strong>
                                    </span>
                                  </div>
                                )}

                                {ev.descricao && (
                                  <p className="text-xs text-gray-600 italic bg-gray-50/70 p-2 rounded-lg border border-gray-100">
                                    "{ev.descricao}"
                                  </p>
                                )}

                                {ev.autor && (
                                  <div className="text-[10px] text-gray-400 text-right">
                                    Registrado por: {ev.autor}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

              {/* ======================================================== */}
              {/* ABA HISTÓRICO: Linha do tempo, anotações e atividades     */}
              {/* ======================================================== */}
              {activeClientTab === 'historico' && (
                <>
                  {/* Card de Negócios Vinculados */}
                  {selectedCliente && (
                    <div className="mb-4">
                      <CardNegociosCliente
                        clienteId={selectedCliente.id}
                        clienteNome={selectedCliente.nome}
                        clienteTelefone={selectedCliente.telefone}
                        clienteDocumento={selectedCliente.cpf_cnpj}
                        clienteEndereco={selectedCliente.endereco}
                        clienteCidade={selectedCliente.cidade}
                        clienteUf={selectedCliente.uf}
                        clienteBairro={selectedCliente.bairro}
                        clienteCep={selectedCliente.cep}
                      />
                    </div>
                  )}

                  {/* Linha do Tempo Unificada do Cliente */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <LinhaDoTempoUnificada
                      clienteId={selectedCliente.id}
                      clienteNome={selectedCliente.nome}
                      clienteTelefone={selectedCliente.telefone}
                      clienteEmail={selectedCliente.email}
                      clienteOrigem={selectedCliente.origem}
                      atividades={timelineAtividades}
                      mensagensWhatsApp={whatsAppMensagens.filter((m) => m.cliente_id === selectedCliente.id)}
                      onNovaAtividadeClick={() => {
                        setIsAtividadeModalOpen(true)
                      }}
                      onNovaMensagemWhatsAppClick={() => {
                        setActiveClientTab('whatsapp')
                      }}
                      onAtividadeUpdated={() => {
                        carregarTimelineAtividades(selectedCliente.id)
                      }}
                    />
                  </div>
                </>
              )}

              {/* ======================================================== */}
              {/* ABA CADASTRO: Identificação PF/PJ + Contatos Adicionais   */}
              {/* ======================================================== */}
              {activeClientTab === 'cadastro' && (
                <div className="space-y-4">                  <div
                    ref={detalhesSectionRef}
                    className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/70 space-y-4 animate-in fade-in duration-200"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/50">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                          Identificação & Contatos do Cliente
                        </h4>
                      </div>
                      <span className="text-[11px] text-gray-500">
                        Edição inline: clique no lápis para alterar
                      </span>
                    </div>
                      {/* Destaque Inicial: Geração Média Mensal */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium text-emerald-100">
                          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold">
                            <Sun className="w-4 h-4 text-amber-300 animate-pulse" />
                            Geração Média Mensal (kWh)
                          </span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs">
                            Estimativa Solar
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 pt-1">
                          <InlineEditField
                            value={selectedSistema?.geracao_media_mensal_kwh ?? geracaoExibida}
                            displayValue={
                              <span className="text-2xl font-black tracking-tight text-white">
                                {(
                                  selectedSistema?.geracao_media_mensal_kwh ?? geracaoExibida
                                ).toLocaleString('pt-BR')}
                              </span>
                            }
                            type="number"
                            unit="kWh/mês"
                            step="1"
                            min={0}
                            className="text-white"
                            inputClassName="text-gray-900"
                            onSave={async (val) =>
                              handleUpdateSistemaField('geracao_media_mensal_kwh', Number(val))
                            }
                          />
                          <span className="text-sm font-semibold text-emerald-100">kWh / mês</span>
                        </div>
                        <p className="text-[11px] text-emerald-100/90 pt-0.5">
                          Baseado na irradiação da região e potência instalada ({potenciaExibida}{' '}
                          kWp).
                        </p>
                      </div>

                      {/* Dados Cadastrais */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            Identificação da Pessoa / Empresa
                          </h4>
                          <span className="text-[10px] uppercase font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            PF / PJ
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Nome completo:</span>
                            <InlineEditField
                              value={selectedCliente.nome}
                              displayValue={
                                <span className="font-semibold text-gray-800">
                                  {selectedCliente.nome}
                                </span>
                              }
                              type="text"
                              placeholder="Nome do cliente"
                              onSave={async (val) => handleUpdateClienteField('nome', String(val))}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Nome fantasia:</span>
                            <InlineEditField
                              value={selectedCliente.nome_fantasia}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.nome_fantasia || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="Nome comercial ou fazenda"
                              onSave={async (val) =>
                                handleUpdateClienteField('nome_fantasia', String(val))
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Razão social:</span>
                            <InlineEditField
                              value={selectedCliente.razao_social}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.razao_social || 'Não informada'}
                                </span>
                              }
                              type="text"
                              placeholder="Razão social completa"
                              onSave={async (val) =>
                                handleUpdateClienteField('razao_social', String(val))
                              }
                            />
                          </div>

                          {/* Banner de conflito se a consulta via Ficha encontrar divergências */}
                          {conflitosCnpjCliente.length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900 my-2">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="font-bold">
                                  A Receita Federal retornou dados diferentes dos atuais (
                                  {conflitosCnpjCliente.length} campos):
                                </span>
                              </div>
                              <div className="bg-white/80 rounded-lg p-2 border border-amber-200 divide-y divide-amber-100 max-h-36 overflow-y-auto">
                                {conflitosCnpjCliente.map((c) => (
                                  <div
                                    key={c.campo}
                                    className="py-1 text-[11px] grid grid-cols-1 sm:grid-cols-3 gap-1"
                                  >
                                    <span className="font-semibold text-gray-700">{c.label}:</span>
                                    <span className="text-gray-500 line-through truncate">
                                      Atual: {c.valorAtual || '(vazio)'}
                                    </span>
                                    <span className="text-emerald-800 font-medium truncate sm:text-right">
                                      Receita: {c.valorReceita}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConflitosCnpjCliente([])
                                    setPendenteDadosReceitaCliente(null)
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold text-[11px]"
                                >
                                  Manter meus dados
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (pendenteDadosReceitaCliente) {
                                      const d = pendenteDadosReceitaCliente
                                      const payload: any = {}
                                      if (d.razao_social) payload.razao_social = d.razao_social
                                      if (d.nome_fantasia) payload.nome_fantasia = d.nome_fantasia
                                      if (d.logradouro) payload.endereco = d.logradouro
                                      if (d.numero) payload.numero = d.numero
                                      if (d.complemento) payload.complemento = d.complemento
                                      if (d.bairro) payload.bairro = d.bairro
                                      if (d.municipio) payload.cidade = d.municipio
                                      if (d.uf) payload.estado = d.uf
                                      if (d.cep) payload.cep = d.cep
                                      if (d.telefone) payload.telefone = d.telefone
                                      if (d.email) payload.email = d.email
                                      if (d.situacao_cadastral)
                                        payload.situacao_cadastral = d.situacao_cadastral
                                      if (d.cnae_principal)
                                        payload.cnae_principal = d.cnae_principal
                                      if (d.data_abertura)
                                        payload.data_nascimento_fundacao = d.data_abertura
                                      await updateCliente(selectedCliente.id, payload)
                                      setConflitosCnpjCliente([])
                                      setPendenteDadosReceitaCliente(null)
                                      alert(
                                        'Dados atualizados com sucesso a partir da Receita Federal!',
                                      )
                                    }
                                  }}
                                  className="px-3 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg font-bold text-[11px] shadow-xs"
                                >
                                  Usar dados da Receita
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">CNPJ:</span>
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <InlineEditField
                                  value={selectedCliente.cnpj}
                                  displayValue={
                                    <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                      {selectedCliente.cnpj || 'Não inf.'}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="00.000.000/0000-00"
                                  onSave={async (val) => {
                                    const rawVal = String(val)
                                    const digits = rawVal.replace(/\D/g, '')
                                    const formatted = formatarCNPJ(rawVal)
                                    await handleUpdateClienteField('cnpj', formatted)

                                    if (digits.length === 14) {
                                      setIsCnpjBuscandoReceita(true)
                                      try {
                                        const { consultarCNPJReceita } =
                                          await import('@/services/cnpjLookupService')
                                        const res = await consultarCNPJReceita(digits)
                                        if (res.success && res.data) {
                                          const d = res.data
                                          const conflitos: any[] = []
                                          if (
                                            selectedCliente.razao_social &&
                                            selectedCliente.razao_social.trim().toLowerCase() !==
                                              d.razao_social.toLowerCase()
                                          ) {
                                            conflitos.push({
                                              campo: 'razao_social',
                                              label: 'Razão Social',
                                              valorAtual: selectedCliente.razao_social,
                                              valorReceita: d.razao_social,
                                            })
                                          }
                                          if (
                                            selectedCliente.endereco &&
                                            selectedCliente.endereco.trim().toLowerCase() !==
                                              d.logradouro.toLowerCase()
                                          ) {
                                            conflitos.push({
                                              campo: 'endereco',
                                              label: 'Logradouro',
                                              valorAtual: selectedCliente.endereco,
                                              valorReceita: d.logradouro,
                                            })
                                          }
                                          if (
                                            selectedCliente.cidade &&
                                            selectedCliente.cidade.trim().toLowerCase() !==
                                              d.municipio.toLowerCase()
                                          ) {
                                            conflitos.push({
                                              campo: 'cidade',
                                              label: 'Cidade',
                                              valorAtual: selectedCliente.cidade,
                                              valorReceita: d.municipio,
                                            })
                                          }
                                          if (conflitos.length > 0) {
                                            setConflitosCnpjCliente(conflitos)
                                            setPendenteDadosReceitaCliente(d)
                                          } else {
                                            const payload: any = {}
                                            if (!selectedCliente.razao_social && d.razao_social)
                                              payload.razao_social = d.razao_social
                                            if (!selectedCliente.nome_fantasia && d.nome_fantasia)
                                              payload.nome_fantasia = d.nome_fantasia
                                            if (!selectedCliente.endereco && d.logradouro)
                                              payload.endereco = d.logradouro
                                            if (!selectedCliente.numero && d.numero)
                                              payload.numero = d.numero
                                            if (!selectedCliente.complemento && d.complemento)
                                              payload.complemento = d.complemento
                                            if (!selectedCliente.bairro && d.bairro)
                                              payload.bairro = d.bairro
                                            if (!selectedCliente.cidade && d.municipio)
                                              payload.cidade = d.municipio
                                            if (!selectedCliente.estado && d.uf)
                                              payload.estado = d.uf
                                            if (!selectedCliente.cep && d.cep) payload.cep = d.cep
                                            if (!selectedCliente.telefone && d.telefone)
                                              payload.telefone = d.telefone
                                            if (!selectedCliente.email && d.email)
                                              payload.email = d.email
                                            if (d.situacao_cadastral)
                                              payload.situacao_cadastral = d.situacao_cadastral
                                            if (d.cnae_principal)
                                              payload.cnae_principal = d.cnae_principal
                                            if (
                                              !selectedCliente.data_nascimento_fundacao &&
                                              d.data_abertura
                                            )
                                              payload.data_nascimento_fundacao = d.data_abertura
                                            await updateCliente(selectedCliente.id, payload)
                                          }
                                        }
                                      } catch (e) {
                                        console.error('Erro na busca CNPJ:', e)
                                      } finally {
                                        setIsCnpjBuscandoReceita(false)
                                      }
                                    }
                                  }}
                                />
                                {isCnpjBuscandoReceita && (
                                  <span title="Buscando na Receita Federal...">
                                    <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-12 shrink-0">CPF:</span>
                              <InlineEditField
                                value={selectedCliente.cpf}
                                displayValue={
                                  <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                    {selectedCliente.cpf || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="000.000.000-00"
                                onSave={async (val) => handleUpdateClienteField('cpf', String(val))}
                              />
                            </div>
                          </div>

                          {/* Situação Cadastral e CNAE */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Situação:</span>
                              <InlineEditField
                                value={selectedCliente.situacao_cadastral}
                                displayValue={
                                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200">
                                    {selectedCliente.situacao_cadastral || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="Ex: ATIVA"
                                onSave={async (val) =>
                                  handleUpdateClienteField('situacao_cadastral', String(val))
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-12 shrink-0">CNAE:</span>
                              <InlineEditField
                                value={selectedCliente.cnae_principal}
                                displayValue={
                                  <span
                                    className="text-gray-800 text-[11px] truncate block max-w-[180px]"
                                    title={selectedCliente.cnae_principal}
                                  >
                                    {selectedCliente.cnae_principal || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="CNAE Principal"
                                onSave={async (val) =>
                                  handleUpdateClienteField('cnae_principal', String(val))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Inscr. Est.:</span>
                              <InlineEditField
                                value={selectedCliente.inscricao_estadual}
                                displayValue={
                                  <span className="text-gray-800">
                                    {selectedCliente.inscricao_estadual || 'Não informada'}
                                  </span>
                                }
                                type="text"
                                placeholder="039/0129482 ou Isento"
                                onSave={async (val) =>
                                  handleUpdateClienteField('inscricao_estadual', String(val))
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-12 shrink-0">RG:</span>
                              <InlineEditField
                                value={selectedCliente.rg}
                                displayValue={
                                  <span className="text-gray-800">
                                    {selectedCliente.rg || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="RG"
                                onSave={async (val) => handleUpdateClienteField('rg', String(val))}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Nasc./Fund.:</span>
                            <InlineEditField
                              value={selectedCliente.data_nascimento_fundacao}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.data_nascimento_fundacao
                                    ? formatDate(selectedCliente.data_nascimento_fundacao)
                                    : 'Não informada'}
                                </span>
                              }
                              type="date"
                              placeholder="DD/MM/AAAA"
                              onSave={async (val) =>
                                handleUpdateClienteField('data_nascimento_fundacao', String(val))
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Contato resp.:</span>
                            <InlineEditField
                              value={selectedCliente.contato}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.contato || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="Nome do responsável ou sócio"
                              onSave={async (val) =>
                                handleUpdateClienteField('contato', String(val))
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Email:</span>
                            <InlineEditField
                              value={selectedCliente.email}
                              displayValue={
                                <span className="text-emerald-700 font-medium">
                                  {selectedCliente.email || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="email@exemplo.com.br"
                              onSave={async (val) => handleUpdateClienteField('email', String(val))}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Telefone:</span>
                            <InlineEditField
                              value={selectedCliente.telefone}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.telefone || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="(00) 00000-0000"
                              onSave={async (val) =>
                                handleUpdateClienteField(
                                  'telefone',
                                  formatWhatsAppPhone(String(val)),
                                )
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2 bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-900 font-semibold w-24 shrink-0">
                              WhatsApp:
                            </span>
                            <InlineEditField
                              value={selectedCliente.whatsapp || selectedCliente.telefone || ''}
                              displayValue={
                                <span className="font-bold text-emerald-700">
                                  {selectedCliente.whatsapp ||
                                    selectedCliente.telefone ||
                                    'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="(00) 00000-0000"
                              onSave={async (val) =>
                                handleUpdateClienteField(
                                  'whatsapp',
                                  formatWhatsAppPhone(String(val)),
                                )
                              }
                            />
                          </div>

                          {/* Endereço detalhado */}
                          <div className="pt-2 border-t border-gray-100 space-y-2">
                            <div className="flex items-center gap-2">
                              <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-24 shrink-0">Logradouro:</span>
                              <InlineEditField
                                value={selectedCliente.endereco}
                                displayValue={
                                  <span className="font-medium text-gray-800">
                                    {selectedCliente.endereco || 'Não informado'}
                                  </span>
                                }
                                type="text"
                                placeholder="Rua, Av..."
                                className="flex-1"
                                onSave={async (val) =>
                                  handleUpdateClienteField('endereco', String(val))
                                }
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0 pl-5">Número:</span>
                                <InlineEditField
                                  value={selectedCliente.numero}
                                  displayValue={
                                    <span className="text-gray-800">
                                      {selectedCliente.numero || 'S/N'}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="Nº"
                                  onSave={async (val) =>
                                    handleUpdateClienteField('numero', String(val))
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0">Bairro:</span>
                                <InlineEditField
                                  value={selectedCliente.bairro}
                                  displayValue={
                                    <span className="text-gray-800">
                                      {selectedCliente.bairro || 'Não inf.'}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="Bairro"
                                  onSave={async (val) =>
                                    handleUpdateClienteField('bairro', String(val))
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0 pl-5">CEP:</span>
                                <InlineEditField
                                  value={selectedCliente.cep}
                                  displayValue={
                                    <span className="font-mono text-gray-800 text-[11px]">
                                      {selectedCliente.cep || '00000-000'}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="00000-000"
                                  onSave={async (val) =>
                                    handleUpdateClienteField('cep', String(val))
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0">Estado:</span>
                                <InlineEditField
                                  value={
                                    selectedCliente.estado ||
                                    (selectedCliente.cidade?.includes('/SC') ? 'SC' : 'RS')
                                  }
                                  displayValue={
                                    <span className="font-bold text-gray-800 uppercase">
                                      {selectedCliente.estado ||
                                        (selectedCliente.cidade?.includes('/SC') ? 'SC' : 'RS')}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="RS / SC"
                                  onSave={async (val) =>
                                    handleUpdateClienteField('estado', String(val))
                                  }
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24 shrink-0 pl-5">Complemento:</span>
                              <InlineEditField
                                value={selectedCliente.complemento}
                                displayValue={
                                  <span className="text-gray-700 italic">
                                    {selectedCliente.complemento || 'Nenhum'}
                                  </span>
                                }
                                type="text"
                                placeholder="Sala, bloco..."
                                className="flex-1"
                                onSave={async (val) =>
                                  handleUpdateClienteField('complemento', String(val))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Seção Contatos Adicionais (Contato Principal + Contatos Adicionais) */}
                      <SecaoContatosAdicionais cliente={selectedCliente} />

                      {/* Localização da Instalação */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-2.5">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          Localização da Instalação
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24 shrink-0">Cidade / UF:</span>
                            <InlineEditField
                              value={selectedCliente.cidade}
                              displayValue={
                                <span className="font-semibold text-gray-800">
                                  {selectedCliente.cidade || 'Não informada'}
                                </span>
                              }
                              type="text"
                              placeholder="Cidade/UF"
                              onSave={async (val) =>
                                handleUpdateClienteField('cidade', String(val))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Latitude:</span>
                              <InlineEditField
                                value={selectedSistema?.latitude ?? 0}
                                displayValue={
                                  <span className="font-mono text-gray-800 text-[11px]">
                                    {selectedSistema?.latitude
                                      ? `${selectedSistema.latitude}°`
                                      : 'Não inf.'}
                                  </span>
                                }
                                type="number"
                                step="0.0001"
                                unit="°"
                                placeholder="-27.6341"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('latitude', Number(val))
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Longitude:</span>
                              <InlineEditField
                                value={selectedSistema?.longitude ?? 0}
                                displayValue={
                                  <span className="font-mono text-gray-800 text-[11px]">
                                    {selectedSistema?.longitude
                                      ? `${selectedSistema.longitude}°`
                                      : 'Não inf.'}
                                  </span>
                                }
                                type="number"
                                step="0.0001"
                                unit="°"
                                placeholder="-52.2739"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('longitude', Number(val))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SEÇÃO: Titular / Responsável pela Unidade Consumidora */}
                      <div className="bg-white rounded-xl p-4 border border-emerald-200/90 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                Titular / Responsável pela Unidade Consumidora
                              </h4>
                              <p className="text-[10px] text-gray-500">
                                Utilizado na elaboração de Procuração, Contratos e Anexos da
                                Concessionária.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              const updates: Partial<Cliente> = {
                                titular_nome: selectedCliente.nome || '',
                                titular_cpf: selectedCliente.cpf || selectedCliente.cnpj || '',
                                titular_telefone:
                                  selectedCliente.telefone || selectedCliente.whatsapp || '',
                                titular_email: selectedCliente.email || '',
                              }
                              await updateCliente(selectedCliente.id, updates)
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs"
                            title="Copiar nome, CPF, telefone e email do cadastro principal do cliente para os dados do titular"
                          >
                            <Copy className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Usar dados do cliente</span>
                          </button>
                        </div>

                        <div className="space-y-2 text-xs">
                          {/* Nome Completo do Titular */}
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Nome completo:</span>
                            <InlineEditField
                              value={selectedCliente.titular_nome || ''}
                              displayValue={
                                <span className="font-semibold text-gray-800">
                                  {selectedCliente.titular_nome || (
                                    <span className="text-gray-400 italic">Não informado</span>
                                  )}
                                </span>
                              }
                              type="text"
                              placeholder="Nome completo do titular na fatura de energia"
                              onSave={async (val) =>
                                handleUpdateClienteField('titular_nome', String(val).trim())
                              }
                            />
                          </div>

                          {/* CPF do Titular com máscara */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-24 shrink-0">CPF:</span>
                              <InlineEditField
                                value={selectedCliente.titular_cpf || ''}
                                displayValue={
                                  <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                    {selectedCliente.titular_cpf
                                      ? formatarCPF(selectedCliente.titular_cpf)
                                      : '000.000.000-00'}
                                  </span>
                                }
                                type="text"
                                placeholder="000.000.000-00"
                                onSave={async (val) => {
                                  const raw = String(val)
                                  const formatted = formatarCPF(raw)
                                  await handleUpdateClienteField('titular_cpf', formatted)
                                }}
                              />
                            </div>

                            {/* Telefone do Titular com máscara */}
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Telefone:</span>
                              <InlineEditField
                                value={selectedCliente.titular_telefone || ''}
                                displayValue={
                                  <span className="font-medium text-gray-800">
                                    {selectedCliente.titular_telefone || 'Não informado'}
                                  </span>
                                }
                                type="text"
                                placeholder="(00) 00000-0000"
                                onSave={async (val) =>
                                  handleUpdateClienteField(
                                    'titular_telefone',
                                    formatWhatsAppPhone(String(val)),
                                  )
                                }
                              />
                            </div>
                          </div>

                          {/* Email do Titular */}
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Email:</span>
                            <InlineEditField
                              value={selectedCliente.titular_email || ''}
                              displayValue={
                                <span className="text-emerald-700 font-medium">
                                  {selectedCliente.titular_email || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="email@exemplo.com.br"
                              onSave={async (val) =>
                                handleUpdateClienteField('titular_email', String(val).trim())
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Concessionária de Energia */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-2.5">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-600" />
                          Concessionária de Energia
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24 shrink-0">Nº da UC:</span>
                            <InlineEditField
                              value={ucExibida}
                              displayValue={
                                <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-xs">
                                  {ucExibida || 'Não informada'}
                                </span>
                              }
                              type="text"
                              placeholder="Ex: 3012847561"
                              onSave={async (val) =>
                                handleUpdateSistemaField('numero_uc', String(val))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24 shrink-0">Concessionária:</span>
                              <InlineEditField
                                value={concessionariaExibida}
                                displayValue={
                                  <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {concessionariaExibida || 'Não informada'}
                                  </span>
                                }
                                type="text"
                                placeholder="RGE, CPFL, Celesc..."
                                onSave={async (val) => {
                                  await handleUpdateClienteField('concessionaria', String(val))
                                  await handleUpdateSistemaField('concessionaria', String(val))
                                }}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Classe:</span>
                              <InlineEditField
                                value={classeConsumoExibida}
                                displayValue={
                                  <span className="font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {classeConsumoExibida || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="Residencial, Comercial..."
                                onSave={async (val) => {
                                  await handleUpdateClienteField('classe_consumo', String(val))
                                  await handleUpdateSistemaField('classe_consumo', String(val))
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24 shrink-0 font-medium">
                                Consumo médio:
                              </span>
                              <InlineEditField
                                value={
                                  selectedCliente.consumo_medio ??
                                  selectedCliente.consumo_kwh_mes ??
                                  0
                                }
                                displayValue={
                                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                                    {(selectedCliente.consumo_medio ??
                                    selectedCliente.consumo_kwh_mes)
                                      ? `${selectedCliente.consumo_medio ?? selectedCliente.consumo_kwh_mes} kWh/mês`
                                      : 'Não informado'}
                                  </span>
                                }
                                type="number"
                                unit="kWh/mês"
                                placeholder="Ex: 650"
                                onSave={async (val) => {
                                  const num = Number(val) || 0
                                  await handleUpdateClienteField('consumo_medio', num)
                                  await handleUpdateClienteField('consumo_kwh_mes', num)
                                }}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Tarifa:</span>
                              <InlineEditField
                                value={tarifaExibida}
                                displayValue={
                                  <span
                                    className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200"
                                    title={`R$ ${tarifaExibida}`}
                                  >
                                    {tarifaExibida > 0
                                      ? `R$ ${Number(tarifaExibida).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                      : 'Não inf.'}
                                  </span>
                                }
                                type="number"
                                step="0.0001"
                                placeholder="0.9500"
                                onSave={async (val) => {
                                  const num = Number(val) || 0
                                  await handleUpdateClienteField('tarifa', num)
                                  await handleUpdateSistemaField('tarifa', num)
                                }}
                              />
                            </div>
                          </div>

                          {/* Campos específicos da Fatura RGE / Gemini */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24 shrink-0">Grupo/Subgrupo:</span>
                              <InlineEditField
                                value={selectedCliente.grupo_subgrupo || ''}
                                displayValue={
                                  <span className="font-medium text-gray-800 text-xs">
                                    {selectedCliente.grupo_subgrupo || 'Não informado'}
                                  </span>
                                }
                                type="text"
                                placeholder="Ex: Convencional B3..."
                                onSave={async (val) =>
                                  handleUpdateClienteField('grupo_subgrupo', String(val))
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Tensão Nom.:</span>
                              <InlineEditField
                                value={selectedCliente.tensao_nominal || ''}
                                displayValue={
                                  <span className="font-medium text-gray-800 text-xs">
                                    {selectedCliente.tensao_nominal || 'Não informada'}
                                  </span>
                                }
                                type="text"
                                placeholder="Ex: 220V, 380V..."
                                onSave={async (val) =>
                                  handleUpdateClienteField('tensao_nominal', String(val))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24 shrink-0">Consumo Anual:</span>
                              <InlineEditField
                                value={selectedCliente.consumo_anual_kwh || 0}
                                displayValue={
                                  <span className="font-bold text-gray-800 text-xs">
                                    {selectedCliente.consumo_anual_kwh
                                      ? `${selectedCliente.consumo_anual_kwh} kWh/ano`
                                      : 'Não informado'}
                                  </span>
                                }
                                type="number"
                                unit="kWh"
                                placeholder="Ex: 7200"
                                onSave={async (val) =>
                                  handleUpdateClienteField('consumo_anual_kwh', Number(val) || 0)
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Média/Dia:</span>
                              <InlineEditField
                                value={selectedCliente.consumo_medio_diario_kwh || 0}
                                displayValue={
                                  <span className="font-bold text-gray-800 text-xs">
                                    {selectedCliente.consumo_medio_diario_kwh
                                      ? `${selectedCliente.consumo_medio_diario_kwh} kWh/dia`
                                      : 'Não inf.'}
                                  </span>
                                }
                                type="number"
                                unit="kWh"
                                placeholder="Ex: 24"
                                onSave={async (val) =>
                                  handleUpdateClienteField(
                                    'consumo_medio_diario_kwh',
                                    Number(val) || 0,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24 shrink-0">Padrão entrada:</span>
                            <InlineEditField
                              value={selectedSistema?.padrao_entrada ?? 'RIC BT Categoria A2'}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedSistema?.padrao_entrada || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="Ex: RIC BT Categoria A2"
                              onSave={async (val) =>
                                handleUpdateSistemaField('padrao_entrada', String(val))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Atendimento:</span>
                              <InlineEditField
                                value={selectedSistema?.tipo_atendimento || 'aéreo'}
                                displayValue={
                                  <span className="capitalize font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {selectedSistema?.tipo_atendimento || 'aéreo'}
                                  </span>
                                }
                                type="select"
                                options={ATENDIMENTOS}
                                onSave={async (val) =>
                                  handleUpdateSistemaField(
                                    'tipo_atendimento',
                                    val as TipoAtendimento,
                                  )
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-32 shrink-0">
                                Tipo de Fornecimento:
                              </span>
                              <InlineEditField
                                value={
                                  selectedCliente.tipo_fornecimento ||
                                  selectedSistema?.numero_fases ||
                                  'trifásico'
                                }
                                displayValue={
                                  <span className="capitalize font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {selectedCliente.tipo_fornecimento ||
                                      selectedSistema?.numero_fases ||
                                      'trifásico'}
                                  </span>
                                }
                                type="select"
                                options={FASES}
                                onSave={async (val) => {
                                  await handleUpdateSistemaField('numero_fases', val as NumeroFases)
                                  await handleUpdateClienteField('tipo_fornecimento', String(val))
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Seção cabos:</span>
                              <InlineEditField
                                value={selectedSistema?.secao_cabos || '16 mm²'}
                                displayValue={
                                  <span className="font-medium text-gray-800">
                                    {selectedSistema?.secao_cabos || 'Não informada'}
                                  </span>
                                }
                                type="text"
                                unit="mm²"
                                placeholder="Ex: 16 mm²"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('secao_cabos', String(val))
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Gauge className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Disjuntor:</span>
                              <InlineEditField
                                value={selectedSistema?.amperagem_disjuntor || '40 A'}
                                displayValue={
                                  <span className="font-semibold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {selectedSistema?.amperagem_disjuntor || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                unit="A"
                                placeholder="Ex: 40 A"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('amperagem_disjuntor', String(val))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Instalação Elétrica e Telhado */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-2.5">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-emerald-600" />
                          Instalação Elétrica e Telhado
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="p-2.5 bg-gray-50/70 rounded-lg border border-gray-200">
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                              <Calendar className="w-3 h-3" />
                              Data Instalação
                            </div>
                            <InlineEditField
                              value={dataInstalacaoExibida}
                              displayValue={
                                <span className="font-bold text-gray-800">
                                  {dataInstalacaoExibida
                                    ? formatDate(dataInstalacaoExibida)
                                    : 'Não definida'}
                                </span>
                              }
                              type="date"
                              placeholder="DD/MM/AAAA"
                              onSave={async (val) =>
                                handleUpdateSistemaField('data_instalacao', String(val))
                              }
                            />
                          </div>

                          <div className="p-2.5 bg-gray-50/70 rounded-lg border border-gray-200">
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                              <Zap className="w-3 h-3 text-emerald-600" />
                              Potência Total
                            </div>
                            <InlineEditField
                              value={potenciaExibida}
                              displayValue={
                                <span className="font-black text-emerald-700 text-sm">
                                  {potenciaExibida} kWp
                                </span>
                              }
                              type="number"
                              step="0.1"
                              min={0}
                              unit="kWp"
                              placeholder="0"
                              onSave={async (val) =>
                                handleUpdateSistemaField('potencia_total_kwp', Number(val))
                              }
                            />
                          </div>

                          <div className="p-2.5 bg-gray-50/70 rounded-lg border border-gray-200">
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                              <Home className="w-3 h-3" />
                              Tipo Telhado
                            </div>
                            <InlineEditField
                              value={telhadoExibido}
                              displayValue={
                                <span className="font-semibold text-gray-800 text-xs">
                                  {getTelhadoLabel(telhadoExibido)}
                                </span>
                              }
                              type="select"
                              options={TELHADOS}
                              onSave={async (val) =>
                                handleUpdateSistemaField('tipo_telhado', val as TelhadoTipo)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Equipamentos Fotovoltaicos */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-3">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          Equipamentos Fotovoltaicos
                        </div>

                        {/* Módulos */}
                        <div className="p-3 bg-gray-50/50 rounded-lg border border-gray-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-gray-200/70 pb-1.5">
                            <span className="font-bold text-gray-800 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-blue-600" />
                              Módulos Fotovoltaicos
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 uppercase font-semibold">
                                Qtd:
                              </span>
                              <InlineEditField
                                value={
                                  selectedSistema?.quantidade_modulos ??
                                  selectedSistema?.quantidade_placas ??
                                  selectedCliente.placas_qtd ??
                                  0
                                }
                                displayValue={
                                  <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-200">
                                    {selectedSistema?.quantidade_modulos ??
                                      selectedSistema?.quantidade_placas ??
                                      selectedCliente.placas_qtd ??
                                      0}{' '}
                                    un
                                  </span>
                                }
                                type="number"
                                step="1"
                                min={0}
                                unit="un"
                                placeholder="0"
                                onSave={async (val) => {
                                  const num = Number(val)
                                  await handleUpdateSistemaField('quantidade_modulos', num)
                                  await handleUpdateSistemaField('quantidade_placas', num)
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 shrink-0">Fabricante:</span>
                              <InlineEditField
                                value={
                                  selectedSistema?.fabricante_modulos ||
                                  selectedSistema?.marca_placas ||
                                  selectedCliente.placas_marca ||
                                  'Canadian Solar'
                                }
                                displayValue={
                                  <span className="font-medium text-gray-800">
                                    {selectedSistema?.fabricante_modulos ||
                                      selectedSistema?.marca_placas ||
                                      selectedCliente.placas_marca ||
                                      'Não informado'}
                                  </span>
                                }
                                type="text"
                                placeholder="Canadian Solar, Trina Solar"
                                onSave={async (val) => {
                                  const s = String(val)
                                  await handleUpdateSistemaField('fabricante_modulos', s)
                                  await handleUpdateSistemaField('marca_placas', s)
                                }}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 shrink-0">Pot. Pico:</span>
                              <InlineEditField
                                value={
                                  selectedSistema?.potencia_pico_modulos_kwp ?? potenciaExibida
                                }
                                displayValue={
                                  <span className="font-semibold text-emerald-800">
                                    {selectedSistema?.potencia_pico_modulos_kwp ?? potenciaExibida}{' '}
                                    kWp
                                  </span>
                                }
                                type="number"
                                step="0.01"
                                min={0}
                                unit="kWp"
                                placeholder="0"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('potencia_pico_modulos_kwp', Number(val))
                                }
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 flex-wrap">
                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                              <span className="text-gray-500 w-16 shrink-0">Modelo:</span>
                              <InlineEditField
                                value={
                                  selectedSistema?.modelo_modulos || 'CS3W-455MS MONOCRISTAL 455Wp'
                                }
                                displayValue={
                                  <span className="font-mono text-gray-800 text-[11px] bg-white px-2 py-0.5 rounded border border-gray-200">
                                    {selectedSistema?.modelo_modulos ||
                                      'CS3W-455MS MONOCRISTAL 455Wp'}
                                  </span>
                                }
                                type="text"
                                placeholder="Modelo do módulo"
                                className="flex-1"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('modelo_modulos', String(val))
                                }
                              />
                            </div>
                            <DatasheetBadge
                              marca={
                                selectedSistema?.fabricante_modulos ||
                                selectedSistema?.marca_placas ||
                                selectedCliente.placas_marca ||
                                ''
                              }
                              modelo={selectedSistema?.modelo_modulos || ''}
                              tipo="modulo_fv"
                              mostrarLinkBusca={true}
                            />
                          </div>
                        </div>

                        {/* Monitoramento do Inversor (App, Login, Senha, Link Datalogger, Marca, Modelo, Potência & Padrões por Marca) */}
                        <SecaoMonitoramentoInversor
                          cliente={selectedCliente}
                          sistema={selectedSistema}
                          onUpdateClienteField={handleUpdateClienteField}
                          onUpdateSistemaField={handleUpdateSistemaField}
                        />

                        {/* Acesso ao Aplicativo Solarview (Login, Senha, Links iOS/Android & Envio WhatsApp) */}
                        <SecaoAcessoSolarview
                          cliente={selectedCliente}
                          sistema={selectedSistema}
                          onUpdateClienteField={handleUpdateClienteField}
                          onUpdateSistemaField={handleUpdateSistemaField}
                        />
                      </div>

                      {/* Histórico de Origem do Cliente & Dados da Importação */}
                      <div className="bg-white rounded-xl p-4 border border-blue-200/80 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                              Origem e Histórico de Importação
                            </h4>
                          </div>
                          <OrigemClienteBadge cliente={selectedCliente} showSublabel />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 space-y-0.5">
                            <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                              Canal / Origem Cadastrada
                            </div>
                            <div className="font-semibold text-gray-800">
                              {selectedCliente.origem_lead ||
                                selectedCliente.como_conheceu ||
                                'Não especificado'}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 space-y-0.5">
                            <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                              Como Conheceu / Integração
                            </div>
                            <div className="font-semibold text-gray-800">
                              {selectedCliente.como_conheceu ||
                                (selectedCliente.dados_importados as any)?.origem_integracao ||
                                'Cadastro no CRM'}
                            </div>
                          </div>
                        </div>

                        {selectedCliente.dados_importados &&
                          typeof selectedCliente.dados_importados === 'object' &&
                          Object.keys(selectedCliente.dados_importados).length > 0 && (
                            <div className="pt-2 border-t border-blue-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-blue-900 uppercase">
                                  Campos Preservados da Planilha / CRM
                                </span>
                                <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {Object.keys(selectedCliente.dados_importados).length} campo(s)
                                </span>
                              </div>

                              <p className="text-[11px] text-gray-500">
                                Campos e colunas que vieram da planilha e foram preservados
                                integralmente neste cliente:
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {Object.entries(selectedCliente.dados_importados).map(
                                  ([chave, valor]) => (
                                    <div
                                      key={chave}
                                      className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-200 space-y-1"
                                    >
                                      <div
                                        className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate"
                                        title={chave}
                                      >
                                        {chave}
                                      </div>
                                      <div className="font-semibold text-gray-800 break-words text-xs">
                                        {valor !== null && valor !== undefined && valor !== '' ? (
                                          String(valor)
                                        ) : (
                                          <span className="text-gray-400 italic">Vazio</span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Histórico de Consumo da Fatura RGE (Gemini) */}
                      {Array.isArray(selectedCliente.historico_consumo_fatura) &&
                        selectedCliente.historico_consumo_fatura.length > 0 &&
                        (() => {
                          const historicoExibicao = normalizarEOordenarHistorico(
                            selectedCliente.historico_consumo_fatura,
                          )
                          const metricas = calcularMetricasHistorico(historicoExibicao)
                          const totalAnualExibicao =
                            selectedCliente.consumo_anual_kwh ||
                            metricas.somatorio_consumo_anual_kwh
                          const mediaDiariaExibicao =
                            selectedCliente.consumo_medio_diario_kwh ||
                            metricas.consumo_medio_diario_kwh

                          return (
                            <div className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-xs space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="text-[11px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1.5">
                                  <Activity className="w-4 h-4 text-amber-600" />
                                  <span>
                                    Histórico de Faturas RGE ({historicoExibicao.length} meses)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                  {totalAnualExibicao ? (
                                    <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                      Total: {totalAnualExibicao} kWh/ano
                                    </span>
                                  ) : null}
                                  {mediaDiariaExibicao ? (
                                    <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                      Diário: {mediaDiariaExibicao} kWh/dia
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-12 gap-1.5 text-center pt-1">
                                {historicoExibicao.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="p-1.5 bg-amber-50/50 rounded-lg border border-amber-200/70 flex flex-col justify-center"
                                  >
                                    <span className="text-[10px] font-semibold text-gray-500">
                                      {item.mes_ano}
                                    </span>
                                    <span className="text-xs font-bold text-gray-900">
                                      {item.consumo_kwh}
                                    </span>
                                    <span className="text-[9px] text-gray-400">
                                      {item.dias_ciclo || 30} dias
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                      {/* Usinas Fotovoltaicas do Cliente integradas na Ficha Cadastral */}
                      <SecaoUsinasCliente
                        clienteId={selectedCliente.id}
                        clienteNome={selectedCliente.nome}
                        clienteDocumento={selectedCliente.cpf || selectedCliente.cnpj || ''}
                        cliente={selectedCliente}
                        isAdmin={isAdmin}
                        usinas={usinasDoCliente}
                        contratos={contratosOM.filter((c) => c.cliente_id === selectedCliente.id)}
                        onCreateUsina={async (data) => {
                          await createUsina(data)
                          await recarregarUsinas()
                        }}
                        onUpdateUsina={async (usinaId, data) => {
                          await updateUsina(usinaId, data)
                          await recarregarUsinas()
                        }}
                        onDeleteUsina={async (usinaId) => {
                          await deleteUsina(usinaId)
                          await recarregarUsinas()
                        }}
                        onVincularContrato={async (usinaId, contratoId) => {
                          await updateUsina(usinaId, { contrato_id: contratoId })
                          await recarregarUsinas()
                          toast.success('Contrato O&M vinculado com sucesso!')
                        }}
                        onAbrirModalNovoContrato={(usina) => {
                          setContratoOMDetalhesDados({
                            nomeRazaoSocial:
                              selectedCliente.razao_social ||
                              selectedCliente.nome ||
                              selectedCliente.titular_nome ||
                              '',
                            cpfCnpj:
                              selectedCliente.cnpj ||
                              selectedCliente.cpf ||
                              selectedCliente.titular_cpf ||
                              '',
                            enderecoInstalacao: usina.endereco || selectedCliente.endereco || '',
                            municipio: selectedCliente.cidade || 'Erechim/RS',
                            telefone:
                              selectedCliente.telefone ||
                              selectedCliente.whatsapp ||
                              selectedCliente.titular_telefone ||
                              '',
                            email: selectedCliente.email || selectedCliente.titular_email || '',
                            numeroModulos: usina.qtd_modulos || selectedCliente.placas_qtd || '0',
                            marcaInversores:
                              usina.inversores_info ||
                              selectedCliente.inversor_marca ||
                              selectedCliente.inversor_modelo ||
                              'Growatt',
                            localInstalacao: usina.tipo_estrutura === 'solo' ? 'Solo' : 'Telhado',
                            enderecoInstalacaoDiferente:
                              usina.endereco || selectedCliente.usina_endereco || '',
                          })
                          setModoVisualizacaoContratoDireta(false)
                          setModalContratoOMOpen(true)
                        }}
                        onRenovarContrato={async (_usina, contrato) => {
                          try {
                            await renovarContratoOM(contrato.id, 12)
                            await recarregarUsinas()
                            toast.success(
                              `Contrato ${contrato.numero_contrato || `#${contrato.id.slice(0, 6)}`} renovado por +12 meses com sucesso!`,
                            )
                          } catch (err) {
                            console.error('Erro ao renovar contrato O&M:', err)
                            toast.error('Erro ao renovar contrato O&M. Tente novamente.')
                          }
                        }}
                        onVerDetalhesContrato={(contrato, usina) => {
                          const docContrato = documentosCliente.find(
                            (d) => d.cliente_id === selectedCliente.id && d.tipo === 'contrato',
                          )
                          const dadosBase = (docContrato?.dados_documento as any) || {}
                          setContratoOMDetalhesDados({
                            ...dadosBase,
                            nomeRazaoSocial:
                              dadosBase.nomeRazaoSocial ||
                              selectedCliente.razao_social ||
                              selectedCliente.nome ||
                              selectedCliente.titular_nome ||
                              '',
                            cpfCnpj:
                              dadosBase.cpfCnpj ||
                              selectedCliente.cnpj ||
                              selectedCliente.cpf ||
                              selectedCliente.titular_cpf ||
                              '',
                            enderecoInstalacao:
                              usina?.endereco ||
                              dadosBase.enderecoInstalacao ||
                              selectedCliente.endereco ||
                              '',
                            municipio:
                              dadosBase.municipio || selectedCliente.cidade || 'Erechim/RS',
                            telefone:
                              dadosBase.telefone ||
                              selectedCliente.telefone ||
                              selectedCliente.whatsapp ||
                              '',
                            email: dadosBase.email || selectedCliente.email || '',
                            numeroModulos:
                              usina?.qtd_modulos ||
                              dadosBase.numeroModulos ||
                              selectedCliente.placas_qtd ||
                              '0',
                            marcaInversores:
                              usina?.inversores_info ||
                              dadosBase.marcaInversores ||
                              selectedCliente.inversor_marca ||
                              '',
                            localInstalacao:
                              usina?.tipo_estrutura === 'solo'
                                ? 'Solo'
                                : dadosBase.localInstalacao || 'Telhado',
                            planoSelecionado:
                              contrato.plano || dadosBase.planoSelecionado || 'Essencial',
                            valorMensal: contrato.valor_mensal || dadosBase.valorMensal || 190,
                            valorTotal: contrato.valor_anual || dadosBase.valorTotal || 2280,
                          })
                          setModoVisualizacaoContratoDireta(true)
                          setModalContratoOMOpen(true)
                        }}
                      />

                      {/* Histórico de Manutenções na seção de Detalhes */}
                      {clientManutencoes.length > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                            Histórico de Ordens de Manutenção ({clientManutencoes.length})
                          </h4>
                          <div className="space-y-2.5">
                            {clientManutencoes.map((m) => (
                              <div
                                key={m.id}
                                className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    {getServiceIcon(m.tipo)}
                                    <span className="font-semibold text-gray-900">{m.tipo}</span>
                                  </div>
                                  <StatusBadge status={m.status} />
                                </div>
                                <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                  <span>{formatDate(m.data)}</span>
                                  {m.tecnico && <span>• Técnico: {m.tecnico}</span>}
                                </div>
                                {m.descricao && <p className="text-gray-600">{m.descricao}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                  )}
                  {/* ======================================================== */}
                  {/* TOPO DA ABA HISTÓRICO: ÁREA RÁPIDA DE NOVA ENTRADA       */}
                  {/* Alterna Anotação vs Agendar Atividade (Seleção 2 etapas) */}
                  {/* ======================================================== */}
                  <QuickAddAtividade
                    clienteId={selectedCliente.id}
                    usinas={usinasDoCliente}
                    onOpenGerenciar={() => setModalGerenciarAtividadesOpen(true)}
                    onOpenModalCompleto={(tipo) => {
                      setModalNovaAtividadeTipoFicha(tipo || null)
                      setModalNovaAtividadeFichaOpen(true)
                    }}
                    onSelectTipoEspecial={async (tipoId) => {
                      if (tipoId === 'auto_leitura_rge') {
                        setModalNovaAtividadeTipoFicha('auto_leitura_rge')
                        setModalNovaAtividadeFichaOpen(true)
                      } else if (tipoId === 'anexo_g') {
                        handleAbrirDocumentoProjeto('anexo_g', propostaAprovada)
                      } else if (tipoId === 'troca_titularidade') {
                        handleAbrirDocumentoProjeto('troca_titularidade', propostaAprovada)
                      } else if (tipoId === 'transferencia_creditos') {
                        setModalTransferenciaCreditosOpen(true)
                      } else if (tipoId === 'gerar_procuracao') {
                        handleDispararGerarProcuracao()
                      } else if (tipoId === 'gerar_contrato') {
                        handleDispararGerarContrato()
                      } else if (tipoId === 'oferecer_limpeza_avulsa') {
                        setModalOferecerLimpezaOpen(true)
                      } else if (tipoId === 'analise_fatura') {
                        setModalAnaliseFaturaOpen(true)
                      } else if (tipoId === 'solicitar_contas_rge') {
                        setModalSolicitarContasRGEOpen(true)
                      }
                    }}
                  />

                  {/* ======================================================== */}
                  {/* NEGÓCIOS VINCULADOS AO CLIENTE (SEMPRE VISÍVEL)          */}
                  {/* ======================================================== */}
                  <div id="secao-negocios-cliente">
                    <CardNegociosCliente
                      clienteId={selectedCliente.id}
                      clienteNome={selectedCliente.nome}
                    />
                  </div>

                  {/* ======================================================== */}
                  {/* LINHA DO TEMPO CRONOLÓGICA UNIFICADA                      */}
                  {/* Propostas solares com revisões, O&M, atividades,         */}
                  {/* anotações e outras ações com filtros e modal de detalhes */}
                  {/* ======================================================== */}
                  <LinhaDoTempoUnificada
                    cliente={selectedCliente}
                    atividades={atividades}
                    onNovaAtividadeClick={() => {
                      setModalNovaAtividadeTipoFicha(null)
                      setModalNovaAtividadeFichaOpen(true)
                    }}
                    orcamentosSolar={orcamentosSolar}
                    propostasOM={propostasOM}
                    onItemClick={(item) => {
                      setTimelineItemDetalhes(item)
                    }}
                    onToggleAtividadeStatus={async (id, current) => {
                      const next = current === 'concluida' ? 'pendente' : 'concluida'
                      await updateAtividadeStatus(id, next as any)
                    }}
                    onNovoOrcamentoSolarClick={() => {
                      setOrcamentoSolarVisualizar(null)
                      setIsModalOrcamentoSolarOpen(true)
                    }}
                    onNovaPropostaOMClick={() => {
                      setPropostaVisualizar(null)
                      setIsModalPropostaOpen(true)
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* COLUNA DIREITA: PAINEL FIXO DE RESUMO (PIPEDRIVE SIDEBAR)        */}
          {/* Nome, telefone, cidade, potência, valor, estágio e próxima ativ. */}
          {/* No mobile: visível quando a aba "Detalhes" estiver ativa         */}
          {/* No desktop: sempre visível ao lado direito da tela               */}
          {/* ================================================================ */}
          <div
            className={`w-full md:w-[320px] lg:w-[360px] shrink-0 bg-[#F8FAF9] p-4 sm:p-5 space-y-4 overflow-y-auto border-t md:border-t-0 ${
              detalhesOpen ? 'block' : 'hidden md:block'
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Resumo do Cliente
              </span>
            </div>

            {/* SEÇÃO MOTIVO DA PERDA (Exibida quando status for Perdido) */}
            {selectedCliente.status === 'Perdido' && (
              <div className="bg-rose-50/90 rounded-xl p-3.5 border border-rose-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    Motivo da perda
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200/80 text-rose-900 uppercase">
                    Perdido
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-950">
                    <span className="capitalize">
                      {selectedCliente.motivo_perda === 'preco'
                        ? 'Preço (achou caro / fora do orçamento)'
                        : selectedCliente.motivo_perda === 'concorrente'
                          ? 'Concorrente (fechou com outra empresa)'
                          : selectedCliente.motivo_perda === 'desistiu'
                            ? 'Desistiu (não vai realizar o projeto)'
                            : selectedCliente.motivo_perda === 'outro'
                              ? 'Outro motivo'
                              : selectedCliente.motivo_perda || 'Não especificado'}
                    </span>
                  </div>

                  {(selectedCliente.updated || selectedCliente.created) && (
                    <div className="text-[11px] text-rose-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-rose-500 shrink-0" />
                      <span>
                        Registrado em{' '}
                        {formatDateTime(selectedCliente.updated || selectedCliente.created)}
                      </span>
                    </div>
                  )}

                  {selectedCliente.observacoes && (
                    <p className="text-[11px] text-rose-800 italic bg-white/70 p-2 rounded border border-rose-100 mt-1 leading-snug">
                      "{selectedCliente.observacoes}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Card 1: Próxima Atividade Agendada (NOVO REQUISITO) */}
            <div className="bg-white rounded-xl p-3.5 border border-emerald-200/80 shadow-xs space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                  <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                  Próxima Atividade Agendada
                </span>
                {proximaAtividade && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                    Pendente
                  </span>
                )}
              </div>

              {proximaAtividade ? (
                <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-1.5 text-xs">
                  <div className="font-bold text-gray-900 leading-tight flex items-center justify-between gap-2">
                    <span>{proximaAtividade.titulo || 'Atividade Agendada'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                    <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{formatDateTime(proximaAtividade.data || proximaAtividade.created)}</span>
                  </div>
                  {proximaAtividade.responsavel_nome && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-600">
                      <User className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">Resp: {proximaAtividade.responsavel_nome}</span>
                    </div>
                  )}
                  {proximaAtividade.descricao && (
                    <p className="text-[11px] text-gray-600 italic line-clamp-2 pt-0.5">
                      "{proximaAtividade.descricao}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-3 px-2.5 text-center bg-gray-50/70 rounded-lg border border-dashed border-gray-200 space-y-1">
                  <Calendar className="w-5 h-5 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-600">Nenhuma atividade pendente</p>
                  <p className="text-[11px] text-gray-400">
                    Agende uma ligação, visita ou follow-up na área rápida à esquerda.
                  </p>
                </div>
              )}
            </div>

            {/* Negócios do Cliente (Card Resumo Lateral Clicável) */}
            <div className="bg-white rounded-xl p-3.5 border border-amber-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#0F2038] tracking-wider flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-[#E0A838]" />
                  Negócios & Oportunidades
                </span>
                <button
                  type="button"
                  onClick={handleRolarParaNegocios}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline"
                >
                  Ver todos
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Gerencie as oportunidades e vendas vinculadas a este cliente na seção "Negócios
                Vinculados".
              </p>
            </div>

            {/* Card 4: Potência do Sistema */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <span>Potência do Sistema</span>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <InlineEditField
                value={potenciaExibida}
                displayValue={
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-emerald-700">{potenciaExibida}</span>
                    <span className="text-xs font-bold text-gray-500">kWp</span>
                  </div>
                }
                type="number"
                step="0.1"
                min={0}
                unit="kWp"
                placeholder="0"
                onSave={async (val) => handleUpdateSistemaField('potencia_total_kwp', Number(val))}
              />
              {geracaoExibida > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1">
                  <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{geracaoExibida.toLocaleString('pt-BR')} kWh/mês estimado</span>
                </div>
              )}
            </div>

            {/* Card 5: Contato Rápido & Cidade */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-2.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block border-b border-gray-100 pb-1.5">
                Contato & Cidade
              </span>

              {/* Nome */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-gray-400">Nome:</span>
                <div className="font-semibold text-gray-800 truncate">{selectedCliente.nome}</div>
              </div>

              {/* Telefone */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-gray-400">Telefone:</span>
                <InlineEditField
                  value={selectedCliente.telefone}
                  displayValue={
                    <div className="flex items-center gap-1 font-medium text-gray-800">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{selectedCliente.telefone || 'Não informado'}</span>
                    </div>
                  }
                  type="text"
                  placeholder="(00) 00000-0000"
                  onSave={async (val) =>
                    handleUpdateClienteField('telefone', formatWhatsAppPhone(String(val)))
                  }
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-0.5 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900">WhatsApp Oficial:</span>
                  <button
                    type="button"
                    onClick={() => setActiveClientTab('whatsapp')}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline"
                  >
                    Abrir conversa
                  </button>
                </div>
                <InlineEditField
                  value={selectedCliente.whatsapp || selectedCliente.telefone || ''}
                  displayValue={
                    <div className="flex items-center gap-1 font-bold text-emerald-800">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {selectedCliente.whatsapp || selectedCliente.telefone || 'Definir WhatsApp'}
                      </span>
                    </div>
                  }
                  type="text"
                  placeholder="(00) 00000-0000"
                  onSave={async (val) =>
                    handleUpdateClienteField('whatsapp', formatWhatsAppPhone(String(val)))
                  }
                />
              </div>

              {/* Contatos Adicionais (Resumo no painel lateral) */}
              <div className="pt-2 border-t border-gray-100">
                <SecaoContatosAdicionais cliente={selectedCliente} />
              </div>

              {/* Cidade */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-gray-400">Cidade:</span>
                <InlineEditField
                  value={selectedCliente.cidade}
                  displayValue={
                    <div className="flex items-center gap-1 font-medium text-gray-800">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{selectedCliente.cidade || 'Não informada'}</span>
                    </div>
                  }
                  type="text"
                  placeholder="Cidade/UF"
                  onSave={async (val) => handleUpdateClienteField('cidade', String(val))}
                />
              </div>

              {/* Email */}
              {selectedCliente.email && (
                <div className="space-y-0.5 pt-1 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400">Email:</span>
                  <div className="flex items-center gap-1 text-emerald-700 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{selectedCliente.email}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 6: Dica Pipedrive */}
            <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Histórico Pipedrive
              </div>
              <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                Todas as anotações, ligações, reuniões e mudanças de estágio estão unificadas em
                ordem cronológica na timeline à esquerda.
              </p>
            </div>

            {/* Zona de Perigo / Excluir Cliente (Discreto para evitar cliques acidentais) */}
            <div className="pt-2 border-t border-gray-200/70">
              <button
                type="button"
                onClick={() => setModalExcluirClienteOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-transparent hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
                title="Excluir cliente e dados vinculados definitivamente"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Excluir cliente</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BOTTOM BAR FLUTUANTE MOBILE (MD:HIDDEN) — AÇÕES RÁPIDAS        */}
        {/* Adicionar (+), Telefonar, WhatsApp, Email                     */}
        {/* ============================================================== */}
        <div className="md:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          {/* 1. Botão Adicionar Atividade (+) */}
          <button
            type="button"
            onClick={() => {
              setModalNovaAtividadeTipoFicha(null)
              setModalNovaAtividadeFichaOpen(true)
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            title="Adicionar nova atividade / anotação"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Atividade</span>
          </button>

          {/* 2. Botão Telefonar */}
          {rawTelDrawer ? (
            <a
              href={`tel:${rawTelDrawer}`}
              className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 transition-transform shadow-2xs"
              title={`Ligar para ${selectedCliente.nome} (${selectedCliente.telefone})`}
              aria-label="Ligar para o cliente"
            >
              <Phone className="w-4 h-4" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-10 h-10 rounded-xl bg-slate-100 text-slate-300 flex items-center justify-center shrink-0 cursor-not-allowed"
              title="Telefone não informado"
              aria-label="Telefone não informado"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          {/* 3. Botão WhatsApp Autorizado */}
          {waDigitsDrawer ? (
            <a
              href={`https://wa.me/${waDigitsDrawer}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white flex items-center justify-center shrink-0 transition-transform shadow-2xs relative"
              title={
                resolucaoDestinoDrawer.origem === 'contato_adicional_whatsapp'
                  ? `Conversar no WhatsApp via contato adicional: ${resolucaoDestinoDrawer.contatoAdicionalNome || 'Contato'}`
                  : `Conversar com ${selectedCliente.nome} no WhatsApp`
              }
              aria-label="Conversar no WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setActiveClientTab('whatsapp')}
              className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0"
              title="Abrir aba do WhatsApp"
              aria-label="WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4 opacity-50" />
            </button>
          )}

          {/* 4. Botão Email */}
          {selectedCliente.email ? (
            <a
              href={`mailto:${selectedCliente.email}`}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 transition-transform shadow-2xs"
              title={`Enviar e-mail para ${selectedCliente.email}`}
              aria-label="Enviar e-mail"
            >
              <Mail className="w-4 h-4" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-10 h-10 rounded-xl bg-slate-100 text-slate-300 flex items-center justify-center shrink-0 cursor-not-allowed"
              title="Email não informado"
              aria-label="Email não informado"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Drawer / Modal Atividades de Manutenção do Cliente */}
      {selectedCliente && (
        <DrawerAtividadesManutencaoCliente
          open={drawerAtividadesManutencaoOpen}
          onOpenChange={setDrawerAtividadesManutencaoOpen}
          cliente={selectedCliente}
        />
      )}

      {/* Modal Nova Proposta O&M */}
      <ModalNovaPropostaOM
        isOpen={isModalPropostaOpen}
        onClose={() => {
          setIsModalPropostaOpen(false)
          setPropostaVisualizar(null)
        }}
        initialClienteId={selectedCliente?.id}
        initialProposta={propostaVisualizar}
      />

      {/* Modal Novo / Editar Orçamento Solar */}
      <ModalOrcamentoSolar
        isOpen={isModalOrcamentoSolarOpen}
        onClose={() => {
          setIsModalOrcamentoSolarOpen(false)
          setOrcamentoSolarVisualizar(null)
        }}
        initialClienteId={selectedCliente?.id}
        initialOrcamento={orcamentoSolarVisualizar}
      />

      {/* Modal Registrar Atividade disparado a partir da Ficha do Cliente */}
      <ModalNovaAtividade
        isOpen={modalNovaAtividadeFichaOpen}
        onClose={() => {
          setModalNovaAtividadeFichaOpen(false)
          setModalNovaAtividadeTipoFicha(null)
        }}
        initialTipo={modalNovaAtividadeTipoFicha}
        initialClienteId={selectedCliente?.id}
        usinas={usinasDoCliente}
      />

      {/* Modal Detalhes e Edição Inline da Linha do Tempo Unificada */}
      {selectedCliente && (
        <ModalDetalhesTimeline
          open={Boolean(timelineItemDetalhes)}
          onClose={() => setTimelineItemDetalhes(null)}
          item={timelineItemDetalhes}
          cliente={selectedCliente}
          onUpdateAtividade={async (id, data) => updateAtividade(id, data)}
          onUpdateOrcamentoSolar={async (id, data) => updateOrcamentoSolar(id, data)}
          onUpdatePropostaOM={async (id, data) => updatePropostaOM(id, data)}
          onAlterarNovaRevisaoSolar={(o) => {
            setTimelineItemDetalhes(null)
            setOrcamentoSolarVisualizar(o)
            setIsModalOrcamentoSolarOpen(true)
          }}
          onAlterarRegenerarOM={(p) => {
            setTimelineItemDetalhes(null)
            setPropostaVisualizar(p)
            setIsModalPropostaOpen(true)
          }}
        />
      )}

      {/* Modal Gerenciar Templates & Configuração do Gateway WhatsApp */}
      <ModalGerenciarWhatsAppTemplates
        isOpen={modalWhatsAppTemplatesOpen}
        onClose={() => setModalWhatsAppTemplatesOpen(false)}
      />

      {/* Modal Enviar Orçamento Solar ou Proposta O&M por WhatsApp */}
      {selectedCliente && docParaEnviarWhatsApp && (
        <ModalEnviarDocumentoWhatsApp
          isOpen={modalEnviarDocWhatsAppOpen}
          onClose={() => {
            setModalEnviarDocWhatsAppOpen(false)
            setDocParaEnviarWhatsApp(null)
          }}
          cliente={selectedCliente}
          tipo={docParaEnviarWhatsApp.tipo}
          referenciaId={docParaEnviarWhatsApp.referenciaId}
          dadosSolar={docParaEnviarWhatsApp.dadosSolar}
          dadosOM={docParaEnviarWhatsApp.dadosOM}
        />
      )}

      {/* Modal Confirmar Documento do Projeto Solar (Procuração, Contrato, Anexo E, Anexo F, Anexo G, Troca Titularidade) */}
      <ModalConfirmarDocumentoProjeto
        open={modalDocProjetoOpen}
        onOpenChange={setModalDocProjetoOpen}
        tipo={modalDocProjetoTipo}
        dadosIniciais={modalDocProjetoDados}
        clienteId={selectedCliente?.id}
        onConfirmado={async (dados) => {
          // Registra ou atualiza status inicial do documento
          if (selectedCliente) {
            const agoraIso = new Date().toISOString()
            const docExistente = getDocumentoCliente(dados.tipo)
            if (!docExistente) {
              await addOrUpdateDocumentoCliente({
                cliente_id: selectedCliente.id,
                tipo: dados.tipo,
                status_assinatura: 'aguardando_assinatura',
                data_envio: agoraIso,
                autor: 'CRM Delfos Solar',
              })
            }

            // Registra atividade correspondente na Linha do Tempo se for anexo_g ou troca_titularidade
            if (dados.tipo === 'anexo_g') {
              await addAtividade({
                cliente_id: selectedCliente.id,
                tipo: 'anexo_g' as AtividadeTipo,
                titulo: 'Anexo G — Rateio / Compensação',
                descricao: `Formulário do Anexo G (SCEE) elaborado para a UC ${dados.numeroUC || selectedCliente.numero_uc || 'N/I'}${dados.ucDestino ? ` com destino à UC ${dados.ucDestino}` : ''}${dados.percentualRateio ? ` (${dados.percentualRateio})` : ''}.`,
                data: agoraIso,
                status: 'concluida',
                autor: 'Pós-Venda Delfos',
              })
            } else if (dados.tipo === 'troca_titularidade') {
              await addAtividade({
                cliente_id: selectedCliente.id,
                tipo: 'troca_titularidade' as AtividadeTipo,
                titulo: 'Troca de Titularidade Solicitada',
                descricao: `Termo de Troca de Titularidade formulado para a UC ${dados.numeroUC || selectedCliente.numero_uc || 'N/I'}${dados.novoTitularNome ? ` em nome de ${dados.novoTitularNome}` : ''}.`,
                data: agoraIso,
                status: 'concluida',
                autor: 'Pós-Venda Delfos',
              })
            }
          }
        }}
        onDocumentoEnviadoWhatsApp={handleDocumentoEnviadoWhatsApp}
      />

      {/* Modal Transferência de Créditos Solares */}
      {selectedCliente && (
        <ModalTransferenciaCreditos
          open={modalTransferenciaCreditosOpen}
          onOpenChange={setModalTransferenciaCreditosOpen}
          clienteOrigem={selectedCliente}
        />
      )}

      {/* Modal Oferecer Limpeza Avulsa via WhatsApp (Modo Individual Estrito na Ficha do Cliente) */}
      {selectedCliente && (
        <ModalOferecerLimpezaAvulsa
          open={modalOferecerLimpezaOpen}
          onOpenChange={setModalOferecerLimpezaOpen}
          initialClienteId={selectedCliente.id}
          usinasContexto={usinasDoCliente}
          modoIndividual={true}
          clienteContexto={selectedCliente}
          sistemaContexto={selectedSistema}
        />
      )}

      {/* Modal Gerenciar Tipos de Atividades (Padrão e Personalizadas) */}
      <ModalGerenciarAtividades
        open={modalGerenciarAtividadesOpen}
        onOpenChange={setModalGerenciarAtividadesOpen}
      />

      {/* Modal Dedicado de Análise de Fatura RGE com Gemini */}
      {selectedCliente && (
        <ModalCriarAnaliseFatura
          isOpen={modalAnaliseFaturaOpen}
          onClose={() => setModalAnaliseFaturaOpen(false)}
          initialClienteId={selectedCliente.id}
          onAnaliseConcluida={() => setModalAnaliseFaturaOpen(false)}
        />
      )}

      {/* Modal Solicitar Contas RGE com envio por e-mail e anexos */}
      {selectedCliente && (
        <ModalSolicitarContasRGE
          open={modalSolicitarContasRGEOpen}
          onOpenChange={setModalSolicitarContasRGEOpen}
          clienteIdInicial={selectedCliente.id}
          usinas={usinasDoCliente}
          onSuccess={() => {
            setModalSolicitarContasRGEOpen(false)
          }}
        />
      )}

      {/* Modal Gerar Procuração O&M a partir da Linha do Tempo / Histórico */}
      {selectedCliente && (
        <ModalGerarProcuracaoOM
          open={modalProcuracaoOMOpen}
          onOpenChange={setModalProcuracaoOMOpen}
          cliente={selectedCliente}
          propostaOM={propostaOMAprovada}
          onDocumentoGerado={async (dados) => {
            try {
              // 1. Salva na coleção documentos_cliente com os dados completos do documento em JSON
              await addOrUpdateDocumentoCliente({
                cliente_id: selectedCliente.id,
                tipo: 'procuracao',
                status_assinatura: 'aguardando_assinatura',
                data_envio: new Date().toISOString(),
                telefone_envio:
                  dados.telefone || selectedCliente.telefone || selectedCliente.whatsapp,
                canal_envio: 'sistema',
                autor: 'CRM Delfos Solar',
                observacoes: `Procuração Particular O&M emitida para ${dados.nome} (CPF ${dados.cpf}).`,
                dados_documento: dados as any,
              })
            } catch (err) {
              console.error('Erro ao salvar documento procuracao:', err)
            }

            try {
              // 2. Registra na timeline / atividades
              await addAtividade({
                cliente_id: selectedCliente.id,
                tipo: 'gerar_procuracao',
                titulo: 'Procuração Particular O&M Gerada',
                descricao: `Procuração gerada para ${dados.nome} (CPF ${dados.cpf}) para atos junto à concessionária de energia.`,
                data: new Date().toISOString(),
                status: 'concluida',
                autor: 'CRM Delfos Solar',
              })
            } catch {
              /* intentionally ignored */
            }
          }}
        />
      )}

      {/* Modal Solicitação de Informações do Cliente (Checklist e Mensagem) */}
      {selectedCliente && (
        <ModalSolicitacaoInformacoes
          open={modalSolicitacaoInfoOpen}
          onOpenChange={setModalSolicitacaoInfoOpen}
          cliente={selectedCliente}
          onSalvarPendencias={async (novasPendencias) => {
            try {
              await updateCliente(selectedCliente.id, {
                pendencias_informacoes: novasPendencias,
              })
            } catch (err) {
              console.error('Erro ao salvar pendências de informações do cliente:', err)
            }
          }}
        />
      )}

      {/* Modal Marcar Perdido */}
      {selectedCliente && (
        <ModalMarcarPerdido
          cliente={selectedCliente}
          open={modalPerdidoOpen}
          onOpenChange={setModalPerdidoOpen}
          onConfirm={async (motivo, observacao) => {
            const nomeCli = selectedCliente.nome
            try {
              await marcarComoPerdido(selectedCliente.id, motivo, observacao)
              const rotulos: Record<string, string> = {
                preco: 'Preço',
                concorrente: 'Concorrente',
                desistiu: 'Desistiu',
                nao_respondeu: 'Não respondeu',
                outro: 'Outro',
              }
              toast.success(
                `Negócio marcado como Perdido para "${nomeCli}". Motivo: ${
                  rotulos[motivo] || motivo
                }.`,
              )
              setModalPerdidoOpen(false)
            } catch (err) {
              console.error('Erro ao marcar perdido:', err)
              toast.error('Erro ao registrar cliente como perdido. Tente novamente.')
              throw err
            }
          }}
        />
      )}

      {/* Modal Nova Oportunidade (Reabertura Comercial de Cliente Fechado) */}
      {selectedCliente && (
        <ModalNovaOportunidade
          cliente={selectedCliente}
          open={modalNovaOportunidadeOpen}
          onOpenChange={setModalNovaOportunidadeOpen}
          usuarios={usuarios}
          onConfirm={async (dadosReabertura) => {
            const nomeCli = selectedCliente.nome
            try {
              await reabrirOportunidade(selectedCliente.id, dadosReabertura)
              toast.success(
                `Oportunidade reaberta com sucesso! Cliente "${nomeCli}" retornado ao funil na etapa "${dadosReabertura.etapa_destino || 'Novo Lead'}" com badge "Cliente Ativo".`,
              )
              setModalNovaOportunidadeOpen(false)
            } catch (err) {
              console.error('Erro ao reabrir oportunidade:', err)
              toast.error('Erro ao reabrir oportunidade comercial. Tente novamente.')
              throw err
            }
          }}
        />
      )}

      {/* Modal Confirmação de Exclusão Permanente de Cliente */}
      {selectedCliente && (
        <AlertDialog
          open={modalExcluirClienteOpen}
          onOpenChange={(open) => {
            if (!isDeletingCliente) setModalExcluirClienteOpen(open)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Confirmar Exclusão do Cliente
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente o cliente{' '}
                <strong className="text-gray-900 font-semibold">{selectedCliente.nome}</strong>?
                <br />
                <br />
                Esta ação é{' '}
                <span className="text-rose-600 font-bold">definitiva e irreversível</span>. Todos os
                dados vinculados a este cliente (atividades, propostas, orçamentos, contratos,
                manutenções, projetos e histórico) serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingCliente}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeletingCliente}
                onClick={async (e) => {
                  e.preventDefault()
                  await handleConfirmExcluirCliente()
                }}
                className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold"
              >
                {isDeletingCliente ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Excluindo cliente...
                  </>
                ) : (
                  'Sim, Excluir Cliente'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Modal Gerar Contrato O&M a partir da Linha do Tempo / Histórico */}
      {selectedCliente && (
        <ModalGerarContratoOM
          open={modalContratoOMOpen}
          onOpenChange={(open) => {
            setModalContratoOMOpen(open)
            if (!open) {
              setContratoOMDetalhesDados(null)
              setModoVisualizacaoContratoDireta(false)
            }
          }}
          cliente={selectedCliente}
          propostaOM={propostaOMAprovada}
          initialDados={contratoOMDetalhesDados}
          modoVisualizacaoDireta={modoVisualizacaoContratoDireta}
          onDocumentoGerado={async (dados) => {
            try {
              // 1. Salva na coleção documentos_cliente com os dados completos do documento em JSON
              await addOrUpdateDocumentoCliente({
                cliente_id: selectedCliente.id,
                tipo: 'contrato',
                status_assinatura: 'aguardando_assinatura',
                data_envio: new Date().toISOString(),
                telefone_envio:
                  dados.telefone || selectedCliente.telefone || selectedCliente.whatsapp,
                canal_envio: 'sistema',
                autor: 'CRM Delfos Solar',
                observacoes: `Contrato de Prestação de Serviços O&M (Plano ${dados.planoSelecionado}) emitido para ${dados.nomeRazaoSocial} (${dados.cpfCnpj}). Valor: ${formatCurrency(dados.valorMensal)}/mês.`,
                dados_documento: dados as any,
              })
            } catch (err) {
              console.error('Erro ao salvar documento contrato:', err)
            }

            try {
              // 2. Registra na timeline / atividades
              await addAtividade({
                cliente_id: selectedCliente.id,
                tipo: 'gerar_contrato',
                titulo: 'Contrato de Prestação de Serviços O&M Gerado',
                descricao: `Contrato O&M gerado no Plano ${dados.planoSelecionado} (${formatCurrency(dados.valorMensal)}/mês - total ${formatCurrency(dados.valorTotal)}) para ${dados.nomeRazaoSocial}.`,
                data: new Date().toISOString(),
                status: 'concluida',
                autor: 'CRM Delfos Solar',
              })
            } catch {
              /* intentionally ignored */
            }
          }}
        />
      )}
    </div>
  )
}
