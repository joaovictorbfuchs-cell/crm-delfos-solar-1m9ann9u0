import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  MessageSquare,
  Search,
  CheckSquare,
  Square,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Edit2,
  Info,
  DollarSign,
  Zap,
  Building2,
  Copy,
  Sparkles,
  Filter,
  FileText,
  RotateCcw,
  Check,
  Calendar,
  Clock,
  Bookmark,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  AssistenteProgresso,
  type EtapaAssistente,
  Etapa1Destinatarios,
  Etapa2Mensagem,
  Etapa3MomentoFollowUp,
  Etapa4RevisaoEnvio,
} from './disparo-massa'
import { parseSaoPauloToUtcIso, formatUtcToSaoPauloInput } from '@/lib/datetimeSaoPaulo'
import { useClientes } from '@/contexts/ClientesContext'
import { toast } from 'sonner'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'
import { validarNumeroWhatsApp } from '@/lib/propostaWhatsAppService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import { SessaoExpiradaAlert } from '@/components/SessaoExpiradaAlert'
import { fetchWhatsAppTemplates } from '@/services/crmService'
import {
  fetchListasEnvio,
  createListaEnvio,
  deleteListaEnvio,
  renameListaEnvio,
  updateListaEnvio,
  type ListaEnvioRegistro,
  type FiltrosExtrasListaEnvio,
} from '@/services/listasEnvioService'
import { ModalDisparoFiltroPopover } from '@/components/ModalDisparoFiltroPopover'
import { registroPassaFiltro } from '@/lib/filtrosEngine'
import type { FiltroSalvoRecord } from '@/types/filtros'
import { ChevronDown, Star, Layers } from 'lucide-react'
import {
  getPadroesTextosReenvio,
  salvarPadroesTextosReenvio,
  createDisparoMassa,
  updateDisparoMassa,
  type DestinatarioLoteMassa,
} from '@/services/disparosMassaService'
import {
  fetchFluxosFollowUp,
  fetchFluxoPadrao,
  type FluxoFollowUp,
} from '@/services/fluxosFollowUpService'
import {
  PLACEHOLDERS_ENVIO_MASSA,
  resolverPlaceholdersMensagemMassa,
  extrairPotenciaClienteTexto,
  extrairCidadeCliente,
  extrairPrimeiroNomeCliente,
} from '@/lib/placeholdersMensagemMassa'
import { aplicarPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
import {
  resolverNumeroDestinoClienteSync,
  type OrigemNumeroDestino,
} from '@/lib/resolverNumeroDestinoCliente'
import type { Cliente, UsinaCliente, Sistema, WhatsAppTemplate } from '@/types/crm'

export type SegmentoFiltro =
  | 'todos'
  | 'clientes_om'
  | 'clientes_solar'
  | 'clientes_bateria'
  | 'pos_vendas'

export interface DestinatarioMensagemMassa {
  cliente: Cliente
  usina?: UsinaCliente | Sistema
  valor?: number
  potenciaManual?: number | string
  cidadeManual?: string
  origemItem?: string
}

export interface ModalMensagemWhatsAppMassaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Destinatários pré-selecionados vindos de qualquer lista (clientes, atividades, manutenções, O&M).
   * Se omitido ou vazio, o modal carregará a base de clientes do contexto.
   */
  destinatariosIniciais?: DestinatarioMensagemMassa[]
  /**
   * Segmento inicial padrão a ser filtrado (ex: 'clientes_om')
   */
  segmentoInicial?: SegmentoFiltro
  /**
   * Texto inicial padrão do template da mensagem
   */
  mensagemPadrao?: string
  /**
   * Título descritivo do modal
   */
  titulo?: string
  /**
   * Subtítulo / descrição contextual
   */
  descricao?: string
  /**
   * Callback disparado após sucesso dos disparos
   */
  onSuccess?: () => void
}

interface ItemClienteMassa {
  cliente: Cliente
  usina?: UsinaCliente | Sistema
  potenciaTexto: string
  cidade: string
  telefoneAutoritativo: string
  origemNumero?: OrigemNumeroDestino
  contatoAdicionalNome?: string
  temWhatsAppValido: boolean
  numeroLimpo: string
  valorItem?: number
  origemItem?: string
  isExemploDemo?: boolean
  segmentos: SegmentoFiltro[]
}

const MENSAGEM_INICIAL_DEFAULT =
  'Olá, [nome do cliente]! Tudo bem? Aqui é da equipe Delfos Solar. Passando para lembrar sobre a importância da manutenção preventiva e limpeza periódica dos módulos da sua usina de [potência] em [cidade]. Como podemos ajudar você hoje?'

// Modelos fixos de contingência caso a conexão com a coleção whatsapp_templates falhe
const TEMPLATES_PADRAO_FALLBACK: Array<{ id: string; titulo: string; conteudo: string }> = [
  {
    id: 'tpl_lembrete_manutencao',
    titulo: 'Lembrete de manutenção',
    conteudo:
      'Olá, [nome do cliente]! Tudo bem? Aqui é da equipe Delfos Solar. Passando para lembrar sobre a importância da manutenção preventiva e limpeza periódica dos módulos da sua usina em [cidade]. Com módulos limpos, sua geração solar de [potência] se mantém no rendimento máximo. Gostaria de agendar uma revisão?',
  },
  {
    id: 'tpl_oferta_especial',
    titulo: 'Oferta especial',
    conteudo:
      'Olá, [nome do cliente]! Temos uma condição especial exclusiva este mês na Delfos Solar para ampliação do seu sistema solar, inclusão de baterias ou plano de monitoramento em [cidade]. Gostaria de receber uma simulação personalizada sem compromisso?',
  },
  {
    id: 'tpl_fatura_em_atraso',
    titulo: 'Fatura em atraso',
    conteudo:
      'Olá, [nome do cliente]! Constatamos uma pendência financeira referente à sua fatura de serviços da Delfos Solar em [cidade], com vencimento recente. Para que possamos regularizar e emitir a 2ª via sem encargos, por favor responda a esta mensagem para enviarmos a fatura atualizada.',
  },
]

// Dados de exemplo fictícios para demonstração visual (sem número real, NUNCA disparam de verdade)
const EXEMPLOS_DEMO: ItemClienteMassa[] = [
  {
    cliente: {
      id: 'demo_cliente_1',
      nome: 'Exemplo: Cooperativa Agropecuária Aurora',
      cidade: 'Erechim',
      estado: 'RS',
      whatsapp: '(54) 99888-0001',
      telefone: '(54) 99888-0001',
      potencia_kwp: 75.5,
      tipo_cliente: 'comercial',
      tipo_negocio: 'O&M (Operação e Manutenção)',
      tipo_venda: 'O&M (Operação e Manutenção)',
      created: '2026-01-01',
      updated: '2026-01-01',
    } as unknown as Cliente,
    potenciaTexto: '75,5 kWp',
    cidade: 'Erechim',
    telefoneAutoritativo: '(54) 99888-0001 (Demonstração)',
    temWhatsAppValido: true,
    numeroLimpo: '5554998880001',
    valorItem: 1850,
    origemItem: 'Exemplo O&M',
    isExemploDemo: true,
    segmentos: ['clientes_om', 'clientes_solar'],
  },
  {
    cliente: {
      id: 'demo_cliente_2',
      nome: 'Exemplo: Vinícola & Pousada Serra Gaúcha',
      cidade: 'Bento Gonçalves',
      estado: 'RS',
      whatsapp: '(54) 99888-0002',
      telefone: '(54) 99888-0002',
      potencia_kwp: 28.0,
      tipo_cliente: 'comercial',
      tipo_negocio: 'Baterias',
      tipo_venda: 'Baterias',
      created: '2026-01-01',
      updated: '2026-01-01',
    } as unknown as Cliente,
    potenciaTexto: '28 kWp',
    cidade: 'Bento Gonçalves',
    telefoneAutoritativo: '(54) 99888-0002 (Demonstração)',
    temWhatsAppValido: true,
    numeroLimpo: '5554998880002',
    valorItem: 12400,
    origemItem: 'Exemplo Bateria',
    isExemploDemo: true,
    segmentos: ['clientes_bateria', 'clientes_solar', 'pos_vendas'],
  },
]

export const ModalMensagemWhatsAppMassa: React.FC<ModalMensagemWhatsAppMassaProps> = ({
  open,
  onOpenChange,
  destinatariosIniciais,
  segmentoInicial = 'todos',
  mensagemPadrao,
  titulo = 'Disparar Mensagens em Massa via WhatsApp',
  descricao = 'Dispare mensagens personalizadas individuais para cada cliente selecionado via Z-API.',
  onSuccess,
}) => {
  const {
    clientes,
    contatosAdicionais,
    sistemas,
    contratosOM,
    sendWhatsAppMessage,
    addAtividade,
    updateCliente,
    whatsAppConfig,
    isSessionExpired,
  } = useClientes()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Templates carregados da coleção whatsapp_templates
  const [templates, setTemplates] =
    useState<Array<{ id: string; titulo: string; conteudo: string }>>(TEMPLATES_PADRAO_FALLBACK)
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState<string>('')

  // Assistente de 4 Etapas: 1 (Destinatários), 2 (Mensagem), 3 (Momento e Régua), 4 (Revisão e Envio)
  const [etapaAtual, setEtapaAtual] = useState<EtapaAssistente>(1)

  // Estado da mensagem
  const [templateTexto, setTemplateTexto] = useState(mensagemPadrao || MENSAGEM_INICIAL_DEFAULT)

  // Filtros de seleção
  const [segmentoAtivo, setSegmentoAtivo] = useState<SegmentoFiltro>(segmentoInicial)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [clienteFocadoId, setClienteFocadoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [limiteExibicao, setLimiteExibicao] = useState(50)

  // Filtros extras combináveis
  const [filtroWhatsApp, setFiltroWhatsApp] = useState<'todos' | 'com_whatsapp' | 'sem_whatsapp'>(
    'todos',
  )
  const [filtroCidade, setFiltroCidade] = useState<string>('')
  const [filtroConcessionaria, setFiltroConcessionaria] = useState<string>('')
  const [filtroTipoCliente, setFiltroTipoCliente] = useState<string>('')
  const [filtroStatus, setFiltroStatus] = useState<string>('')

  // Filtro Salvo de Clientes (Etapa 4 - Pipedrive filtrosEngine)
  const [filtroSalvoAtivo, setFiltroSalvoAtivo] = useState<FiltroSalvoRecord | null>(null)

  // Listas Salvas (listas_envio)
  const [listasSalvas, setListasSalvas] = useState<ListaEnvioRegistro[]>([])
  const [listaSelecionadaId, setListaSelecionadaId] = useState<string>('')
  const [isLoadingListas, setIsLoadingListas] = useState(false)
  const [modalSalvarListaOpen, setModalSalvarListaOpen] = useState(false)
  const [nomeNovaLista, setNomeNovaLista] = useState('')
  const [isSalvandoLista, setIsSalvandoLista] = useState(false)
  const [listaParaExcluir, setListaParaExcluir] = useState<ListaEnvioRegistro | null>(null)
  const [isExcluindoLista, setIsExcluindoLista] = useState(false)

  // Edição rápida de telefone
  const [editandoTelefoneId, setEditandoTelefoneId] = useState<string | null>(null)
  const [telefoneEmEdicao, setTelefoneEmEdicao] = useState('')

  // Opção de envio: 'agora' ou 'agendar'
  const [tipoEnvio, setTipoEnvio] = useState<'agora' | 'agendar'>('agora')
  const [dataHoraAgendada, setDataHoraAgendada] = useState<string>('')
  const [intervaloSegundos, setIntervaloSegundos] = useState<number>(60)

  // Fluxos de follow-up dinâmicos (substitui e migra os reenvios fixos +3d/+90d)
  const [fluxosDisponiveis, setFluxosDisponiveis] = useState<FluxoFollowUp[]>([])
  const [fluxoSelecionadoId, setFluxoSelecionadoId] = useState<string>('')
  const [reenvioAtivo, setReenvioAtivo] = useState<boolean>(true)
  const [textoReenvio1, setTextoReenvio1] = useState<string>('')
  const [textoReenvio2, setTextoReenvio2] = useState<string>('')

  // Progresso do envio em lote
  const [isEnviando, setIsEnviando] = useState(false)
  const [progressoEnvio, setProgressoEnvio] = useState<{
    total: number
    atual: number
    sucessos: string[]
    erros: Array<{ clienteNome: string; erro: string }>
    avisosDemo?: string[]
    isAgendamento?: boolean
  } | null>(null)

  const [authErrorCapturado, setAuthErrorCapturado] = useState(false)

  // Carrega templates, listas salvas e filtros salvos do backend ao abrir o modal
  useEffect(() => {
    if (!open) return
    let cancelado = false

    const carregarTemplatesEListas = async () => {
      try {
        const [registrosTemplates, registrosListas, fluxosCadastrados] = await Promise.all([
          fetchWhatsAppTemplates().catch(() => []),
          fetchListasEnvio().catch(() => []),
          fetchFluxosFollowUp(true).catch(() => []),
        ])

        if (cancelado) return

        if (Array.isArray(registrosTemplates) && registrosTemplates.length > 0) {
          const mapeados = registrosTemplates.map((r: WhatsAppTemplate) => ({
            id: r.id,
            titulo: r.titulo,
            conteudo: r.conteudo,
          }))

          const combinados = [...mapeados]
          TEMPLATES_PADRAO_FALLBACK.forEach((fb) => {
            const jaExiste = combinados.some(
              (c) => c.titulo.toLowerCase().trim() === fb.titulo.toLowerCase().trim(),
            )
            if (!jaExiste) {
              combinados.push(fb)
            }
          })

          setTemplates(combinados)
        } else {
          setTemplates(TEMPLATES_PADRAO_FALLBACK)
        }

        if (Array.isArray(registrosListas)) {
          setListasSalvas(registrosListas)
        }

        if (Array.isArray(fluxosCadastrados) && fluxosCadastrados.length > 0) {
          setFluxosDisponiveis(fluxosCadastrados)
          const padrao = fluxosCadastrados.find((f) => f.is_padrao) || fluxosCadastrados[0]
          if (padrao && !fluxoSelecionadoId) {
            setFluxoSelecionadoId(padrao.id)
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar templates, listas ou filtros:', err)
        setTemplates(TEMPLATES_PADRAO_FALLBACK)
      }
    }

    carregarTemplatesEListas()
    return () => {
      cancelado = true
    }
  }, [open])

  // Helper para classificar segmentos de um cliente
  const classificarSegmentosCliente = useMemo(() => {
    // Set de clientes com contrato O&M ativo/cadastrado
    const clientesOMSet = new Set<string>()
    if (Array.isArray(contratosOM)) {
      contratosOM.forEach((c) => {
        if (c?.cliente_id) clientesOMSet.add(c.cliente_id)
      })
    }

    return (cli: Cliente): SegmentoFiltro[] => {
      const segs: SegmentoFiltro[] = []
      const tipoVenda = (cli.tipo_venda || '').toLowerCase()
      const tipoNegocio = (cli.tipo_negocio || '').toLowerCase()
      const produto = (cli.produto || '').toLowerCase()
      const tipoSistema = (cli.tipo_sistema || '').toLowerCase()
      const statusPos = (cli.status_pos_vendas || '').toLowerCase()
      const areaDestino = (cli.area_destino || '').toLowerCase()

      // 1. Clientes O&M:
      // Contrato O&M na base OU campo contratou_om marcado OU tipo/produto explicitamente O&M OU área destino om
      const isOM =
        clientesOMSet.has(cli.id) ||
        Boolean(cli.contratou_om) ||
        tipoVenda.includes('o&m') ||
        tipoVenda.includes('manuten') ||
        tipoNegocio.includes('o&m') ||
        tipoNegocio.includes('manuten') ||
        produto.includes('o&m') ||
        areaDestino === 'om'

      if (isOM) {
        segs.push('clientes_om')
      }

      // 2. Clientes Bateria:
      // Conta APENAS clientes com bateria explícita (tipo_venda 'Baterias' OU tipo_negocio de bateria/baterias OU produto bateria)
      // Heurística de tipo_sistema 'Híbrido' = bateria REMOVIDA explicitamente a pedido do usuário
      const isBateria =
        tipoVenda === 'baterias' ||
        tipoVenda.includes('bateria') ||
        tipoNegocio === 'bateria' ||
        tipoNegocio === 'baterias' ||
        tipoNegocio.includes('bateria') ||
        produto === 'bateria' ||
        produto.includes('bateria')

      if (isBateria) {
        segs.push('clientes_bateria')
      }

      // 3. Pós-Venda:
      // Critério coerente com o módulo ClientesPosVendasView:
      // transferido_pos_vendas=true OU status Fechado/Concluído OU com data_instalacao cadastrada OU status_pos_vendas ativo/preenchido OU área de destino pós-venda
      const isPosVenda =
        Boolean(cli.transferido_pos_vendas) ||
        (cli.status as string) === 'Fechado' ||
        (cli.status as string) === 'Concluído' ||
        Boolean(cli.data_instalacao) ||
        Boolean(statusPos) ||
        areaDestino === 'pos_vendas' ||
        cli.origem_pos_vendas === 'funil_comercial' ||
        cli.origem_pos_vendas === 'pos_vendas_seed'

      if (isPosVenda) {
        segs.push('pos_vendas')
      }

      // 4. Clientes Solar:
      // Representa usinas e soluções solares fotovoltaicas.
      // Se não é exclusivamente de outro segmento específico (ex: apenas O&M sem usina),
      // ou possui potência / tipo_venda solar / produto solar / usina instalada
      const isExplicitamenteOutro =
        (isOM || isBateria) &&
        !tipoVenda.includes('solar') &&
        !tipoNegocio.includes('solar') &&
        !produto.includes('solar') &&
        !(cli.potencia_kwp && cli.potencia_kwp > 0) &&
        !cli.data_instalacao

      if (!isExplicitamenteOutro) {
        segs.push('clientes_solar')
      }

      // Fallback de garantia: se não caiu em nenhum segmento, inclui em clientes_solar
      if (segs.length === 0) {
        segs.push('clientes_solar')
      }

      return segs
    }
  }, [contratosOM])

  // Mapeia lista de itens a serem exibidos no modal
  const itensProcessados = useMemo<ItemClienteMassa[]>(() => {
    let listaBase: ItemClienteMassa[] = []

    // Se destinatários explícitos foram informados:
    if (destinatariosIniciais && destinatariosIniciais.length > 0) {
      const map = new Map<string, DestinatarioMensagemMassa>()
      destinatariosIniciais.forEach((dest) => {
        if (dest?.cliente?.id && !map.has(dest.cliente.id)) {
          map.set(dest.cliente.id, dest)
        }
      })

      listaBase = Array.from(map.values()).map((dest) => {
        const cli = dest.cliente
        const usinaVinculada = dest.usina || sistemas.find((s) => s.cliente_id === cli.id)
        const potenciaTexto = dest.potenciaManual
          ? typeof dest.potenciaManual === 'number'
            ? `${dest.potenciaManual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`
            : String(dest.potenciaManual)
          : extrairPotenciaClienteTexto(cli, usinaVinculada)
        const cidade = dest.cidadeManual || extrairCidadeCliente(cli, usinaVinculada)
        const caDoCli = Array.isArray(contatosAdicionais)
          ? contatosAdicionais.filter(
              (c) => c.cliente === cli.id || (c as any).cliente_id === cli.id,
            )
          : []
        const resolucao = resolverNumeroDestinoClienteSync(cli, caDoCli)
        const telAutoritativo =
          resolucao.numeroFormatado || resolucao.numero || cli.whatsapp || cli.telefone || ''
        const validacao = validarNumeroWhatsApp(resolucao.numero || telAutoritativo)

        return {
          cliente: cli,
          usina: usinaVinculada,
          potenciaTexto,
          cidade,
          telefoneAutoritativo: telAutoritativo,
          origemNumero: resolucao.origem,
          contatoAdicionalNome: resolucao.contatoAdicionalNome,
          temWhatsAppValido: validacao.valido && resolucao.origem !== 'nenhum',
          numeroLimpo: validacao.numeroLimpo || resolucao.numeroLimpo || '',
          valorItem: dest.valor,
          origemItem: dest.origemItem,
          segmentos: classificarSegmentosCliente(cli),
        }
      })
    } else {
      // Se nenhum destinatário explícito foi passado, monta da base geral de clientes
      listaBase = clientes.map((cli) => {
        const usinaVinculada = sistemas.find((s) => s.cliente_id === cli.id)
        const potenciaTexto = extrairPotenciaClienteTexto(cli, usinaVinculada)
        const cidade = extrairCidadeCliente(cli, usinaVinculada)
        const caDoCli = Array.isArray(contatosAdicionais)
          ? contatosAdicionais.filter(
              (c) => c.cliente === cli.id || (c as any).cliente_id === cli.id,
            )
          : []
        const resolucao = resolverNumeroDestinoClienteSync(cli, caDoCli)
        const telAutoritativo =
          resolucao.numeroFormatado || resolucao.numero || cli.whatsapp || cli.telefone || ''
        const validacao = validarNumeroWhatsApp(resolucao.numero || telAutoritativo)

        return {
          cliente: cli,
          usina: usinaVinculada,
          potenciaTexto,
          cidade,
          telefoneAutoritativo: telAutoritativo,
          origemNumero: resolucao.origem,
          contatoAdicionalNome: resolucao.contatoAdicionalNome,
          temWhatsAppValido: validacao.valido && resolucao.origem !== 'nenhum',
          numeroLimpo: validacao.numeroLimpo || resolucao.numeroLimpo || '',
          valorItem: cli.valor_final || cli.valor_estimado || 0,
          segmentos: classificarSegmentosCliente(cli),
        }
      })
    }

    // Se a base de clientes do CRM for pequena ou vazia, inclui exemplos de demonstração marcados (nunca disparam real)
    if (listaBase.length <= 3 && (!destinatariosIniciais || destinatariosIniciais.length === 0)) {
      return [...listaBase, ...EXEMPLOS_DEMO]
    }

    return listaBase
  }, [destinatariosIniciais, clientes, contatosAdicionais, sistemas, classificarSegmentosCliente])

  // Listas de valores distintos existentes na base real para os dropdowns de filtros extras
  const opcoesFiltrosExtras = useMemo(() => {
    const cidadesSet = new Set<string>()
    const concessionariasSet = new Set<string>()
    const tiposClienteSet = new Set<string>()
    const statusSet = new Set<string>()

    itensProcessados.forEach((item) => {
      const cli = item.cliente
      if (item.cidade && item.cidade.trim()) {
        cidadesSet.add(item.cidade.trim())
      } else if (cli.cidade && cli.cidade.trim()) {
        cidadesSet.add(cli.cidade.trim())
      }

      if (cli.concessionaria && cli.concessionaria.trim()) {
        concessionariasSet.add(cli.concessionaria.trim())
      }

      if (cli.tipo_cliente && String(cli.tipo_cliente).trim()) {
        tiposClienteSet.add(String(cli.tipo_cliente).trim())
      }

      if (cli.status && String(cli.status).trim()) {
        statusSet.add(String(cli.status).trim())
      }
    })

    return {
      cidades: Array.from(cidadesSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      concessionarias: Array.from(concessionariasSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      tiposCliente: Array.from(tiposClienteSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      statusList: Array.from(statusSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    }
  }, [itensProcessados])

  // Filtragem por Filtro Salvo de Clientes (filtrosEngine como base), Segmento, Filtros Extras Combináveis e Busca
  const itensFiltrados = useMemo(() => {
    let resultado = itensProcessados

    // 1. Filtro Salvo de Clientes (se ativo, roda o motor filtrosEngine sobre a base de clientes)
    if (filtroSalvoAtivo) {
      const estrutura = filtroSalvoAtivo.condicoes
      resultado = resultado.filter((item) => {
        // Objeto de registro normalizado para o filtrosEngine
        const registroParaFiltro = {
          ...item.cliente,
          // Compatibilidade extra com campos exibidos e derivados
          cidade: item.cidade || item.cliente.cidade || '',
          whatsapp: item.cliente.whatsapp || item.telefoneAutoritativo || '',
          telefone: item.cliente.telefone || item.telefoneAutoritativo || '',
          potencia_kwp: item.cliente.potencia_kwp || (item.usina as any)?.potencia_kwp,
        }
        return registroPassaFiltro(registroParaFiltro, estrutura, 'clientes')
      })
    }

    // 2. Filtro base por segmento
    if (segmentoAtivo !== 'todos') {
      resultado = resultado.filter((item) => item.segmentos.includes(segmentoAtivo))
    }

    // 3. Filtro extra WhatsApp: todos | com_whatsapp | sem_whatsapp
    if (filtroWhatsApp === 'com_whatsapp') {
      resultado = resultado.filter((item) => item.temWhatsAppValido)
    } else if (filtroWhatsApp === 'sem_whatsapp') {
      resultado = resultado.filter((item) => !item.temWhatsAppValido)
    }

    // 4. Filtro extra Cidade
    if (filtroCidade) {
      resultado = resultado.filter((item) => {
        const c1 = (item.cidade || '').toLowerCase()
        const c2 = (item.cliente.cidade || '').toLowerCase()
        const alvo = filtroCidade.toLowerCase()
        return c1 === alvo || c2 === alvo
      })
    }

    // 5. Filtro extra Concessionária
    if (filtroConcessionaria) {
      resultado = resultado.filter((item) => {
        const conc = (item.cliente.concessionaria || '').toLowerCase()
        return conc === filtroConcessionaria.toLowerCase()
      })
    }

    // 6. Filtro extra Tipo de Cliente
    if (filtroTipoCliente) {
      resultado = resultado.filter((item) => {
        const tc = String(item.cliente.tipo_cliente || '').toLowerCase()
        return tc === filtroTipoCliente.toLowerCase()
      })
    }

    // 7. Filtro extra Status
    if (filtroStatus) {
      resultado = resultado.filter((item) => {
        const st = String(item.cliente.status || '').toLowerCase()
        return st === filtroStatus.toLowerCase()
      })
    }

    // 8. Filtro por busca de texto
    const termo = busca.trim().toLowerCase()
    if (termo) {
      resultado = resultado.filter((item) => {
        const matchNome = item.cliente.nome?.toLowerCase().includes(termo)
        const matchCidade = item.cidade?.toLowerCase().includes(termo)
        const matchTel = item.telefoneAutoritativo?.includes(termo)
        return matchNome || matchCidade || matchTel
      })
    }

    return resultado
  }, [
    itensProcessados,
    filtroSalvoAtivo,
    segmentoAtivo,
    filtroWhatsApp,
    filtroCidade,
    filtroConcessionaria,
    filtroTipoCliente,
    filtroStatus,
    busca,
  ])

  // Contagem de filtros extras ativos
  const totalFiltrosExtrasAtivos = useMemo(() => {
    let count = 0
    if (filtroSalvoAtivo) count++
    if (filtroWhatsApp !== 'todos') count++
    if (filtroCidade) count++
    if (filtroConcessionaria) count++
    if (filtroTipoCliente) count++
    if (filtroStatus) count++
    return count
  }, [
    filtroSalvoAtivo,
    filtroWhatsApp,
    filtroCidade,
    filtroConcessionaria,
    filtroTipoCliente,
    filtroStatus,
  ])

  // Contagem exclusiva dos clientes que atendem ao Filtro Salvo selecionado (antes de filtros extras e seleção)
  const contagemApenasFiltroSalvo = useMemo(() => {
    if (!filtroSalvoAtivo) return null
    const estrutura = filtroSalvoAtivo.condicoes
    return itensProcessados.filter((item) => {
      const registro = {
        ...item.cliente,
        cidade: item.cidade || item.cliente.cidade || '',
        whatsapp: item.cliente.whatsapp || item.telefoneAutoritativo || '',
        telefone: item.cliente.telefone || item.telefoneAutoritativo || '',
        potencia_kwp: item.cliente.potencia_kwp || (item.usina as any)?.potencia_kwp,
      }
      return registroPassaFiltro(registro, estrutura, 'clientes')
    }).length
  }, [filtroSalvoAtivo, itensProcessados])

  // Limpar todos os filtros (segmento volta para 'todos' e extras são resetados)
  const handleLimparTodosFiltros = () => {
    setSegmentoAtivo('todos')
    setFiltroWhatsApp('todos')
    setFiltroCidade('')
    setFiltroConcessionaria('')
    setFiltroTipoCliente('')
    setFiltroStatus('')
    setBusca('')
    setFiltroSalvoAtivo(null)
    setListaSelecionadaId('')
    setLimiteExibicao(50)
  }

  // Limpar apenas o filtro salvo ativo
  const handleLimparFiltroSalvo = () => {
    setFiltroSalvoAtivo(null)
  }

  // Limpar apenas os filtros extras
  const handleLimparFiltrosExtras = () => {
    setFiltroWhatsApp('todos')
    setFiltroCidade('')
    setFiltroConcessionaria('')
    setFiltroTipoCliente('')
    setFiltroStatus('')
    setListaSelecionadaId('')
  }

  // Inicialização ao abrir o modal (executa apenas na transição de open false -> true)
  useEffect(() => {
    if (!open) {
      setProgressoEnvio(null)
      setIsEnviando(false)
      setAuthErrorCapturado(false)
      setEditandoTelefoneId(null)
      setBusca('')
      return
    }

    setEtapaAtual(1)
    setTemplateTexto(mensagemPadrao || MENSAGEM_INICIAL_DEFAULT)
    setSegmentoAtivo(segmentoInicial)
    setFiltroSalvoAtivo(null)
    setAuthErrorCapturado(false)
    setTipoEnvio('agora')
    setIntervaloSegundos(60)

    // Carrega padrões configurados de reenvio
    const padroes = getPadroesTextosReenvio()
    setTextoReenvio1(padroes.texto1)
    setTextoReenvio2(padroes.texto2)
    setReenvioAtivo(true)

    // Data/hora sugerida para agendamento: daqui a 10 minutos no fuso de SP
    const dezMinFuturo = new Date(Date.now() + 10 * 60 * 1000)
    setDataHoraAgendada(formatUtcToSaoPauloInput(dezMinFuturo.toISOString()))

    setProgressoEnvio(null)
    setBusca('')
    setLimiteExibicao(50)

    // Se veio destinatáriosIniciais, seleciona todos eles por padrão (caso intencional preservado)
    if (destinatariosIniciais && destinatariosIniciais.length > 0) {
      const ids = destinatariosIniciais
        .map((d) => d.cliente?.id)
        .filter((id): id is string => Boolean(id))
      const uniqueIds = Array.from(new Set(ids))
      setSelectedIds(uniqueIds)
      setClienteFocadoId(uniqueIds[0] || null)
    } else {
      // Pedido do usuário: como padrão quando abre esta tela, nenhum cliente deve vir marcado.
      // A seleção só acontece por filtro aplicado, "Selecionar todos" ou marcação manual.
      setSelectedIds([])
      // Foca no primeiro cliente da base apenas para renderizar a prévia da mensagem
      let itensIniciais = itensProcessados
      if (segmentoInicial !== 'todos') {
        itensIniciais = itensIniciais.filter((i) => i.segmentos.includes(segmentoInicial))
      }
      setClienteFocadoId(itensIniciais[0]?.cliente.id || itensProcessados[0]?.cliente.id || null)
    }
  }, [open, destinatariosIniciais, segmentoInicial, mensagemPadrao, itensProcessados])

  // Troca de modelo de mensagem pré-cadastrado via dropdown
  const handleSelecionarTemplate = (templateId: string) => {
    setTemplateSelecionadoId(templateId)
    const achado = templates.find((t) => t.id === templateId)
    if (achado && achado.conteudo) {
      setTemplateTexto(achado.conteudo)
      toast.info(`Modelo "${achado.titulo}" aplicado`, {
        description: 'Você pode editar o texto livremente antes de enviar.',
      })
    }
  }

  // Cliente focado na prévia (sempre o primeiro selecionado ou o clicado)
  const itemFocado = useMemo(() => {
    if (clienteFocadoId) {
      const achado = itensProcessados.find((c) => c.cliente.id === clienteFocadoId)
      if (achado) return achado
    }
    const primeiroSelecionadoId = selectedIds[0]
    if (primeiroSelecionadoId) {
      const achado = itensProcessados.find((c) => c.cliente.id === primeiroSelecionadoId)
      if (achado) return achado
    }
    return itensFiltrados[0] || itensProcessados[0] || null
  }, [clienteFocadoId, selectedIds, itensFiltrados, itensProcessados])

  // Fluxo ativo na régua de follow-up e detecção de etapa 1 imediata
  const fluxoSelecionadoObj = useMemo(() => {
    if (!reenvioAtivo || !fluxoSelecionadoId) return null
    return fluxosDisponiveis.find((f) => f.id === fluxoSelecionadoId) || null
  }, [reenvioAtivo, fluxoSelecionadoId, fluxosDisponiveis])

  const etapaImediataFluxo = useMemo(() => {
    if (!fluxoSelecionadoObj || !fluxoSelecionadoObj.etapas) return null
    const etapasAtivas = fluxoSelecionadoObj.etapas
      .filter((e) => e.ativa)
      .sort((a, b) => a.ordem - b.ordem)
    if (etapasAtivas.length === 0) return null
    const primeira = etapasAtivas[0]
    // Etapa 1 imediata: dias_apos === 0 (ou ordem 1 com dias_apos <= 0) e com mensagem preenchida
    if (Number(primeira.dias_apos) === 0 && (primeira.mensagem || '').trim()) {
      return primeira
    }
    return null
  }, [fluxoSelecionadoObj])

  // Indica se a mensagem 1 será herdada da etapa imediata do fluxo porque o campo de texto está vazio
  const textoVeraDoFluxo = useMemo(() => {
    return !templateTexto.trim() && Boolean(etapaImediataFluxo)
  }, [templateTexto, etapaImediataFluxo])

  // Mensagem base efetiva (texto do campo ou etapa imediata do fluxo se vazio)
  const templateEfetivo = useMemo(() => {
    if (templateTexto.trim()) return templateTexto
    if (etapaImediataFluxo?.mensagem) return etapaImediataFluxo.mensagem
    return templateTexto
  }, [templateTexto, etapaImediataFluxo])

  // Mensagem resolvida em tempo real para a prévia do primeiro cliente selecionado
  const mensagemPreviaResolvida = useMemo(() => {
    if (!itemFocado) return templateEfetivo
    return resolverPlaceholdersMensagemMassa({
      template: templateEfetivo,
      cliente: itemFocado.cliente,
      usina: itemFocado.usina,
      valor: itemFocado.valorItem,
      cidadeManual: itemFocado.cidade,
      contatoNome: itemFocado.contatoAdicionalNome,
    })
  }, [templateEfetivo, itemFocado])

  // Inserir tag de placeholder no cursor da textarea
  const handleInsertPlaceholder = (tag: string) => {
    const el = textareaRef.current
    if (!el) {
      setTemplateTexto((prev) => `${prev} ${tag}`)
      return
    }
    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const text = templateTexto
    const newText = text.substring(0, start) + tag + text.substring(end)
    setTemplateTexto(newText)
    setTimeout(() => {
      el.focus()
      const newPos = start + tag.length
      el.setSelectionRange(newPos, newPos)
    }, 0)
  }

  // Handlers de seleção
  const handleToggleCliente = (clienteId: string) => {
    setSelectedIds((prev) => {
      const existe = prev.includes(clienteId)
      const novos = existe ? prev.filter((id) => id !== clienteId) : [...prev, clienteId]
      if (!existe) setClienteFocadoId(clienteId)
      return novos
    })
  }

  const handleSelectAll = () => {
    // Seleciona ou desmarca exatamente os clientes correspondentes ao filtro ativo
    const idsFiltrados = itensFiltrados.map((c) => c.cliente.id)
    const todosFiltradosEstaoSelecionados =
      idsFiltrados.length > 0 && idsFiltrados.every((id) => selectedIds.includes(id))

    if (todosFiltradosEstaoSelecionados) {
      setSelectedIds((prev) => prev.filter((id) => !idsFiltrados.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...idsFiltrados])))
    }
  }

  const handleMudarSegmento = (novoSegmento: SegmentoFiltro) => {
    setSegmentoAtivo(novoSegmento)
    setLimiteExibicao(50)
    // Se o usuário mudou manualmente a pílula de segmento, desmarca lista salva ativa para não gerar confusão
    setListaSelecionadaId('')
  }

  // Ações de Listas Salvas
  const handleSelecionarListaSalva = (listaId: string) => {
    setListaSelecionadaId(listaId)
    if (!listaId) {
      return
    }

    const lista = listasSalvas.find((l) => l.id === listaId)
    if (!lista) return

    // Se a lista possui um fluxo configurado, seleciona-o automaticamente
    if (lista.fluxo_id) {
      setFluxoSelecionadoId(lista.fluxo_id)
    }

    // 1. Extrai filtros salvos e verifica se é lista com clientes_ids explícitos (seleção manual)
    const fx: FiltrosExtrasListaEnvio & { segmento?: string; clientes_ids?: string[] } =
      (lista.filtros as any) || {}
    const clientesIdsSalvos = Array.isArray(fx.clientes_ids) ? fx.clientes_ids : null

    const segSalvo = ((lista.segmento || fx.segmento) as SegmentoFiltro) || 'todos'
    setSegmentoAtivo(segSalvo)

    // 2. Aplica os filtros extras salvos (suporta formatos legados e novos)
    const wppVal = fx.whatsapp || 'todos'
    const cidVal = fx.cidade || ''
    const concVal = fx.concessionaria || ''
    const tipoVal = fx.tipo_cliente || ''
    const stVal = fx.status || ''

    setFiltroWhatsApp(wppVal)
    setFiltroCidade(cidVal)
    setFiltroConcessionaria(concVal)
    setFiltroTipoCliente(tipoVal)
    setFiltroStatus(stVal)
    setLimiteExibicao(50)

    // Se havia algum filtro salvo ativo, limpa ao selecionar uma lista_envio para evitar conflito
    setFiltroSalvoAtivo(null)

    // 3. Aplica seleção:
    // CASO A: Lista salva com seleção manual de clientes (clientes_ids explícitos)
    // Aplica EXATAMENTE os clientes que foram marcados no momento do salvamento
    if (clientesIdsSalvos && clientesIdsSalvos.length > 0) {
      // Filtra apenas os IDs que existem na base de itens processados atual (tolerante a remoções)
      const idsValidos = clientesIdsSalvos.filter((id) =>
        itensProcessados.some((i) => i.cliente.id === id),
      )

      setSelectedIds(idsValidos)
      if (idsValidos.length > 0) {
        setClienteFocadoId(idsValidos[0])
      }

      toast.success(`Lista salva "${lista.nome}" aplicada`, {
        description: `${idsValidos.length} cliente(s) selecionado(s) exatamente conforme salvos.`,
      })
      return
    }

    // CASO B: Lista salva por filtro dinâmico (legada ou salva com base no filtro inteiro)
    let filtrados = itensProcessados
    if (segSalvo !== 'todos') {
      filtrados = filtrados.filter((i) => i.segmentos.includes(segSalvo))
    }
    if (wppVal === 'com_whatsapp') {
      filtrados = filtrados.filter((i) => i.temWhatsAppValido)
    } else if (wppVal === 'sem_whatsapp') {
      filtrados = filtrados.filter((i) => !i.temWhatsAppValido)
    }
    if (cidVal) {
      filtrados = filtrados.filter((i) => {
        const c1 = (i.cidade || '').toLowerCase()
        const c2 = (i.cliente.cidade || '').toLowerCase()
        return c1 === cidVal.toLowerCase() || c2 === cidVal.toLowerCase()
      })
    }
    if (concVal) {
      filtrados = filtrados.filter(
        (i) => (i.cliente.concessionaria || '').toLowerCase() === concVal.toLowerCase(),
      )
    }
    if (tipoVal) {
      filtrados = filtrados.filter(
        (i) => String(i.cliente.tipo_cliente || '').toLowerCase() === tipoVal.toLowerCase(),
      )
    }
    if (stVal) {
      filtrados = filtrados.filter(
        (i) => String(i.cliente.status || '').toLowerCase() === stVal.toLowerCase(),
      )
    }

    const idsSelecionados = filtrados.map((i) => i.cliente.id)
    setSelectedIds(idsSelecionados)
    if (idsSelecionados.length > 0) {
      setClienteFocadoId(idsSelecionados[0])
    }

    toast.success(`Lista salva "${lista.nome}" aplicada`, {
      description: `${idsSelecionados.length} cliente(s) selecionado(s) automaticamente via filtros.`,
    })
  }

  const handleAbrirModalSalvarLista = () => {
    // Se o usuário selecionou clientes manualmente via checkbox, sugere nome focado na seleção
    if (selectedIds.length > 0 && selectedIds.length !== itensFiltrados.length) {
      setNomeNovaLista(`Lista Personalizada (${selectedIds.length} clientes selecionados)`)
      setModalSalvarListaOpen(true)
      return
    }

    // Caso contrário, sugere nome padrão baseado no segmento e filtros ativos
    const labelSeg =
      segmentoAtivo === 'clientes_om'
        ? 'Clientes O&M'
        : segmentoAtivo === 'clientes_solar'
          ? 'Clientes Solar'
          : segmentoAtivo === 'clientes_bateria'
            ? 'Clientes Bateria'
            : segmentoAtivo === 'pos_vendas'
              ? 'Pós-Venda'
              : 'Todos os clientes'

    const detalhes = [
      filtroWhatsApp === 'com_whatsapp'
        ? 'Com WhatsApp'
        : filtroWhatsApp === 'sem_whatsapp'
          ? 'Sem WhatsApp'
          : null,
      filtroCidade ? filtroCidade : null,
      filtroConcessionaria ? filtroConcessionaria : null,
      filtroTipoCliente ? filtroTipoCliente : null,
      filtroStatus ? filtroStatus : null,
    ].filter(Boolean)

    const suposto = detalhes.length > 0 ? `${labelSeg} (${detalhes.join(', ')})` : labelSeg
    setNomeNovaLista(suposto)
    setModalSalvarListaOpen(true)
  }

  const handleConfirmarSalvarLista = async () => {
    if (!nomeNovaLista.trim()) {
      toast.error('Informe um nome para a lista salva')
      return
    }

    setIsSalvandoLista(true)
    try {
      // Detecta se a origem do salvamento é uma seleção manual explícita por checkboxes
      // Se houver clientes marcados manualmente (inclusive se for subconjunto ou todos selecionados conscientemente)
      const temSelecaoManual = selectedIds.length > 0
      const idsGravados = temSelecaoManual ? Array.from(new Set(selectedIds)) : undefined

      const filtrosParaGravar: FiltrosExtrasListaEnvio = {
        whatsapp: filtroWhatsApp,
        cidade: filtroCidade || undefined,
        concessionaria: filtroConcessionaria || undefined,
        tipo_cliente: filtroTipoCliente || undefined,
        status: filtroStatus || undefined,
        tipo_selecao: temSelecaoManual ? 'manual' : 'filtro',
        clientes_ids: idsGravados,
        total_clientes_selecionados: idsGravados?.length || 0,
      }

      const nova = await createListaEnvio({
        nome: nomeNovaLista.trim(),
        segmento: segmentoAtivo,
        fluxo_id: fluxoSelecionadoId || undefined,
        clientes_ids: idsGravados,
        filtros: {
          ...filtrosParaGravar,
          segmento: segmentoAtivo,
        } as any,
      })

      setListasSalvas((prev) => [nova, ...prev])
      setListaSelecionadaId(nova.id)
      setModalSalvarListaOpen(false)
      setNomeNovaLista('')

      const msgSucesso = temSelecaoManual
        ? `Lista "${nova.nome}" salva com ${idsGravados?.length} cliente(s) selecionado(s)!`
        : `Lista "${nova.nome}" salva com sucesso!`
      const descSucesso = temSelecaoManual
        ? 'Os clientes marcados individualmente foram gravados com exatidão.'
        : 'Critérios gravados: segmento e filtros combináveis ativos.'

      toast.success(msgSucesso, { description: descSucesso })
    } catch (err) {
      console.error('Erro ao salvar lista de envio:', err)
      toast.error('Erro ao salvar lista de envio')
    } finally {
      setIsSalvandoLista(false)
    }
  }

  const handleConfirmarExcluirLista = async () => {
    if (!listaParaExcluir) return
    setIsExcluindoLista(true)
    try {
      await deleteListaEnvio(listaParaExcluir.id)
      setListasSalvas((prev) => prev.filter((l) => l.id !== listaParaExcluir.id))
      if (listaSelecionadaId === listaParaExcluir.id) {
        setListaSelecionadaId('')
      }
      toast.success(`Lista "${listaParaExcluir.nome}" excluída com sucesso`)
      setListaParaExcluir(null)
    } catch (err) {
      console.error('Erro ao excluir lista:', err)
      toast.error('Erro ao excluir lista de envio')
    } finally {
      setIsExcluindoLista(false)
    }
  }

  // Renomear lista salva existente
  const handleRenomearLista = async (lista: ListaEnvioRegistro, novoNome: string) => {
    try {
      const atualizada = await renameListaEnvio(lista.id, novoNome)
      setListasSalvas((prev) =>
        prev.map((l) => (l.id === lista.id ? { ...l, nome: atualizada.nome } : l)),
      )
      toast.success(`Lista renomeada para "${atualizada.nome}"`)
    } catch (err) {
      console.error('Erro ao renomear lista de envio:', err)
      toast.error('Erro ao renomear lista de envio')
      throw err
    }
  }

  // Atualizar filtros da lista salva com a configuração atualmente ativa no modal
  const handleEditarFiltrosLista = async (lista: ListaEnvioRegistro) => {
    try {
      const temSelecaoManual = selectedIds.length > 0
      const idsGravados = temSelecaoManual ? Array.from(new Set(selectedIds)) : undefined

      const filtrosAtualizados: FiltrosExtrasListaEnvio = {
        whatsapp: filtroWhatsApp,
        cidade: filtroCidade || undefined,
        concessionaria: filtroConcessionaria || undefined,
        tipo_cliente: filtroTipoCliente || undefined,
        status: filtroStatus || undefined,
        tipo_selecao: temSelecaoManual ? 'manual' : 'filtro',
        clientes_ids: idsGravados,
        total_clientes_selecionados: idsGravados?.length || 0,
      }

      const atualizada = await updateListaEnvio(lista.id, {
        segmento: segmentoAtivo,
        fluxo_id: fluxoSelecionadoId || undefined,
        clientes_ids: idsGravados,
        filtros: {
          ...filtrosAtualizados,
          segmento: segmentoAtivo,
        } as any,
      })

      setListasSalvas((prev) => prev.map((l) => (l.id === lista.id ? atualizada : l)))
      toast.success(`Filtros da lista "${lista.nome}" atualizados com sucesso!`)
    } catch (err) {
      console.error('Erro ao atualizar filtros da lista:', err)
      toast.error('Erro ao atualizar filtros da lista salva')
      throw err
    }
  }

  // Salvar número do WhatsApp editado inline
  const handleSalvarTelefoneInline = async (cliente: Cliente) => {
    const val = validarNumeroWhatsApp(telefoneEmEdicao)
    if (!val.valido) {
      toast.error('Número de WhatsApp inválido', {
        description: 'Informe DDD + número (ex: 54 99999-9999).',
      })
      return
    }

    try {
      await updateCliente(cliente.id, {
        whatsapp: val.numeroFormatado,
        telefone: val.numeroFormatado,
      })
      toast.success('WhatsApp atualizado', {
        description: `Número gravado para ${cliente.nome}.`,
      })
      setEditandoTelefoneId(null)
      setTelefoneEmEdicao('')
    } catch (err) {
      console.error('Erro ao atualizar telefone:', err)
      toast.error('Erro ao salvar telefone')
    }
  }

  // Disparo individual em massa sequencial via Z-API
  const handleConfirmarEnvio = async () => {
    try {
      if (selectedIds.length === 0) {
        toast.error('Selecione ao menos um cliente para enviar.')
        return
      }

      // Validação do texto:
      // Se o campo estiver vazio e NÃO houver fluxo com etapa 1 imediata ativa, exige o texto.
      // Se houver etapa 1 imediata no fluxo selecionado, o campo vazio é permitido.
      const temTextoNoCampo = Boolean(templateTexto.trim())
      const temEtapaImediataNoFluxo = Boolean(etapaImediataFluxo?.mensagem?.trim())

      if (!temTextoNoCampo && !temEtapaImediataNoFluxo) {
        toast.error('Informe o texto da mensagem.', {
          description:
            'Digite o texto da mensagem ou ative uma régua de follow-up com etapa 1 imediata.',
        })
        return
      }

      // Texto canônico a ser enviado como mensagem 1 (do campo se preenchido, ou da etapa 1 imediata)
      const textoMensagem1Base = temTextoNoCampo ? templateTexto : etapaImediataFluxo!.mensagem

      const selecionados = itensProcessados.filter(
        (c) => c && c.cliente && selectedIds.includes(c.cliente.id),
      )
      const semWhatsApp = selecionados.filter((c) => !c.temWhatsAppValido)

      if (semWhatsApp.length > 0 && semWhatsApp.length === selecionados.length) {
        toast.error('Nenhum cliente selecionado possui número de destino válido.', {
          description:
            'Cadastre WhatsApp, contato adicional ou telefone dos clientes antes de enviar.',
        })
        return
      }

      // Se for agendamento, valida a data/hora
      let dataAgendamentoUtcIso: string | null = null
      let dataAgendamentoBaseMs = Date.now()

      if (tipoEnvio === 'agendar') {
        if (!dataHoraAgendada) {
          toast.error('Informe a data e horário para agendamento.', {
            description: 'Selecione a data/hora desejada para o envio.',
          })
          return
        }

        dataAgendamentoUtcIso = parseSaoPauloToUtcIso(dataHoraAgendada)
        if (!dataAgendamentoUtcIso) {
          toast.error('Data e hora inválidas', {
            description: 'Verifique a data/hora selecionada para o agendamento.',
          })
          return
        }

        dataAgendamentoBaseMs = new Date(dataAgendamentoUtcIso).getTime()
        if (dataAgendamentoBaseMs < Date.now() - 60 * 1000) {
          toast.error('A data/hora de agendamento deve ser futura.', {
            description: 'Escolha um horário à frente do horário atual de Brasília.',
          })
          return
        }
      }

      setIsEnviando(true)
      let totalPuladosSemNumero = 0
      const intervalMs = Math.max(intervaloSegundos || 60, 5) * 1000
      const isAgendamento = tipoEnvio === 'agendar'
      const agoraIso = new Date().toISOString()

      // Monta os destinatários iniciais do lote ANTES do loop de envio
      // Cada destinatário é pré-cadastrado com status inicial 'pendente' (ou 'sem_whatsapp' se não tiver número)
      const destinatariosLote: DestinatarioLoteMassa[] = selecionados.map((item) => {
        const nomeCliente = item?.cliente?.nome || 'Cliente sem nome'
        const idCliente = item?.cliente?.id || ''
        const temNumero = Boolean(item?.temWhatsAppValido && item?.numeroLimpo)

        let fluxoAplicadoId = reenvioAtivo ? fluxoSelecionadoId || undefined : undefined
        let origemAplicada: 'por_disparo' | 'automatica_por_estagio' = 'por_disparo'
        let estagioGatilhoAplicado: string | undefined = undefined

        const estagioCliente = (item?.cliente?.status || '').trim().toLowerCase()
        if (estagioCliente && fluxosDisponiveis && fluxosDisponiveis.length > 0) {
          for (const fl of fluxosDisponiveis) {
            if (!fl.ativo || !fl.regras_entrada || fl.regras_entrada.length === 0) continue
            const regraCasou = fl.regras_entrada.some((r) => {
              if (!r.ativo) return false
              const rEst = r.estagio_funil.trim().toLowerCase()
              return rEst === estagioCliente
            })
            if (regraCasou) {
              fluxoAplicadoId = fl.id
              origemAplicada = 'automatica_por_estagio'
              estagioGatilhoAplicado = item.cliente.status
              break
            }
          }
        }

        const nomeFluxoAplicado = fluxoAplicadoId
          ? fluxosDisponiveis.find((f) => f.id === fluxoAplicadoId)?.nome || 'Fluxo Follow-up'
          : undefined

        return {
          cliente_id: idCliente,
          nome: nomeCliente,
          telefone: item?.numeroLimpo || '',
          status: temNumero ? 'pendente' : 'sem_whatsapp',
          data_envio_inicial: agoraIso,
          fluxo_atual_id: fluxoAplicadoId,
          origem_entrada: origemAplicada,
          estagio_origem: estagioGatilhoAplicado,
          trilha: fluxoAplicadoId
            ? [
                {
                  fluxo_id: fluxoAplicadoId,
                  fluxo_nome: nomeFluxoAplicado,
                  origem_entrada: origemAplicada,
                  estagio_gatilho: estagioGatilhoAplicado,
                  motivo:
                    origemAplicada === 'automatica_por_estagio'
                      ? `Entrou automaticamente — estágio "${estagioGatilhoAplicado}" → Fluxo "${nomeFluxoAplicado}"`
                      : `Incluído no disparo em lote → Fluxo "${nomeFluxoAplicado}"`,
                  data: agoraIso,
                },
              ]
            : undefined,
        }
      })

      // REQUISITO (1): Gravar o registro do lote ANTES do loop de envio,
      // para que o lote apareça no menu "Disparos em Massa" imediatamente,
      // mesmo que o envio ainda esteja em andamento ou seja interrompido.
      // REQUISITO (2): Se a gravação falhar, exibir erro claro na tela em vez de engolir.
      let loteCriadoId: string | null = null
      const loteTitulo = `Lote WhatsApp ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

      try {
        const novoLote = await createDisparoMassa({
          titulo: loteTitulo,
          segmento: segmentoAtivo,
          filtros: {
            segmento: segmentoAtivo,
            filtroWhatsApp,
            filtroCidade,
            filtroConcessionaria,
            filtroTipoCliente,
            filtroStatus,
            busca,
            listaSalvaId: listaSelecionadaId || undefined,
          },
          total_destinatarios: selecionados.length,
          intervalo_segundos: intervaloSegundos,
          data_disparo: isAgendamento && dataAgendamentoUtcIso ? dataAgendamentoUtcIso : agoraIso,
          mensagem_original: textoMensagem1Base,
          reenvio_ativo: Boolean(reenvioAtivo),
          texto_reenvio_1: reenvioAtivo ? textoReenvio1 : '',
          texto_reenvio_2: reenvioAtivo ? textoReenvio2 : '',
          fluxo_id: reenvioAtivo ? fluxoSelecionadoId || undefined : undefined,
          destinatarios: destinatariosLote,
        })
        loteCriadoId = novoLote.id
      } catch (errLote: unknown) {
        console.error('Erro crítico ao criar registro do lote em disparos_massa:', errLote)
        setIsEnviando(false)
        const detalhe =
          errLote instanceof Error
            ? errLote.message
            : 'Falha de comunicação ou validação com o banco de dados.'
        toast.error('Falha ao registrar o lote de disparo', {
          description: `Não foi possível criar o lote em "Disparos em Massa": ${detalhe}. O envio não foi iniciado para evitar perda do histórico.`,
        })
        return
      }

      const estadoEnvio = {
        total: selecionados.length,
        atual: 0,
        sucessos: [] as string[],
        erros: [] as Array<{ clienteNome: string; erro: string }>,
        avisosDemo: [] as string[],
        puladosSemNumero: 0,
        isAgendamento,
      }
      setProgressoEnvio({ ...estadoEnvio })

      // Contador de mensagens válidas agendadas para calcular o escalonamento do agendado_para
      let mensagensAgendadasCount = 0

      for (let i = 0; i < selecionados.length; i++) {
        const item = selecionados[i]
        if (!item || !item.cliente) {
          continue
        }

        const nomeCliente = item.cliente.nome || 'Cliente sem nome'
        const idCliente = item.cliente.id || ''

        estadoEnvio.atual = i + 1
        setProgressoEnvio({ ...estadoEnvio })

        // REGRA: Exemplos fictícios de demonstração NUNCA disparam para cliente real
        if (item.isExemploDemo || idCliente.startsWith('demo_')) {
          estadoEnvio.avisosDemo.push(nomeCliente)
          // Simula o delay visual da demonstração sem efetuar chamada externa
          await new Promise((resolve) => setTimeout(resolve, 300))
          estadoEnvio.sucessos.push(`${nomeCliente} (Demonstração)`)
          setProgressoEnvio({ ...estadoEnvio })
          continue
        }

        // Clientes sem nenhum número cadastrado são pulados
        if (!item.temWhatsAppValido || !item.numeroLimpo) {
          totalPuladosSemNumero++
          estadoEnvio.puladosSemNumero = totalPuladosSemNumero
          estadoEnvio.erros.push({
            clienteNome: nomeCliente,
            erro: isAgendamento
              ? 'Agendamento não realizado: o cliente não possui WhatsApp, contato adicional ou telefone cadastrado.'
              : 'Envio não realizado: o cliente não possui WhatsApp, contato adicional ou telefone cadastrado.',
          })
          if (destinatariosLote[i]) {
            destinatariosLote[i].status = 'sem_whatsapp'
            destinatariosLote[i].motivo_saida = 'Sem número de WhatsApp cadastrado'
          }
          setProgressoEnvio({ ...estadoEnvio })
          continue
        }

        let mensagemFinal = ''
        try {
          const mensagemBase = resolverPlaceholdersMensagemMassa({
            template: textoMensagem1Base,
            cliente: item.cliente,
            usina: item.usina,
            valor: item.valorItem,
            cidadeManual: item.cidade,
            contatoNome: item.contatoAdicionalNome,
          })
          mensagemFinal = aplicarPrefixoMensagemManual(mensagemBase)
        } catch (errPlaceholder) {
          console.warn('Erro ao resolver placeholders de mensagem:', errPlaceholder)
          mensagemFinal = aplicarPrefixoMensagemManual(textoMensagem1Base)
        }

        try {
          if (isAgendamento) {
            // Calcula data/hora específica para cada mensagem com base no intervalo configurado
            const agendadoParaClienteMs =
              dataAgendamentoBaseMs + mensagensAgendadasCount * intervalMs
            const agendadoParaClienteIso = new Date(agendadoParaClienteMs).toISOString()
            mensagensAgendadasCount++

            // Grava a mensagem na coleção 'whatsapp_mensagens' com status "agendada"
            // O whatsapp_worker do PocketBase cron processará automaticamente no horário
            const sendRes = await sendWhatsAppMessage({
              cliente_id: idCliente,
              telefone_destino: item.numeroLimpo,
              conteudo_final: mensagemFinal,
              tipo_disparo: 'massa',
              agendado_para: agendadoParaClienteIso,
            })

            if (sendRes && sendRes.ok === false) {
              throw new Error(sendRes.message || 'Falha ao agendar mensagem de WhatsApp')
            }

            // Registra atividade na timeline do cliente
            const agora = new Date().toISOString()
            try {
              await addAtividade({
                cliente_id: idCliente,
                tipo: 'mensagem_enviada',
                titulo: 'WhatsApp Agendado (Disparo em Massa)',
                descricao: `Mensagem em massa agendada para envio em ${new Date(agendadoParaClienteMs).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (intervalo: ${intervaloSegundos}s):\n\n"${mensagemFinal}"`,
                data: agora,
                status: 'pendente',
                autor: 'CRM Delfos Solar',
              })
            } catch (errAtv) {
              console.warn('Erro ao registrar atividade de agendamento no CRM:', errAtv)
            }
          } else {
            // Disparo Imediato via gateway Z-API
            const sendRes = await sendWhatsAppMessage({
              cliente_id: idCliente,
              telefone_destino: item.numeroLimpo,
              conteudo_final: mensagemFinal,
              tipo_disparo: 'massa',
            })

            if (sendRes && sendRes.ok === false) {
              throw new Error(sendRes.message || 'Falha no gateway ao enviar WhatsApp')
            }

            // Registra atividade autoritativa do tipo 'mensagem_enviada' no CRM
            const agora = new Date().toISOString()
            try {
              await addAtividade({
                cliente_id: idCliente,
                tipo: 'mensagem_enviada',
                titulo: 'Mensagem via WhatsApp (Disparo em Massa)',
                descricao: `Mensagem enviada via WhatsApp para ${nomeCliente}:\n\n"${mensagemFinal}"`,
                data: agora,
                status: 'concluida',
                autor: 'CRM Delfos Solar',
              })
            } catch (errAtv) {
              console.warn('Erro ao registrar atividade no CRM:', errAtv)
            }

            // SEGUNDO PONTO: Espaçamento de ~60 segundos entre mensagens sucessivas no envio imediato
            // Se houver mais destinatários seguintes no loop, aguarda o intervalo configurado
            if (i < selecionados.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, intervalMs))
            }
          }

          estadoEnvio.sucessos.push(nomeCliente)
          const agoraEnvioIso = new Date().toISOString()
          if (destinatariosLote[i]) {
            destinatariosLote[i].data_envio_inicial = agoraEnvioIso
            destinatariosLote[i].status = 'pendente'
          }
          setProgressoEnvio({ ...estadoEnvio })
        } catch (err: unknown) {
          console.error(`Erro ao processar mensagem para ${nomeCliente}:`, err)
          if (isAuthSessionError(err)) {
            setAuthErrorCapturado(true)
            estadoEnvio.erros.push({
              clienteNome: nomeCliente,
              erro: 'Sessão expirada. Faça login novamente.',
            })
            if (destinatariosLote[i]) {
              destinatariosLote[i].status = 'finalizado'
              destinatariosLote[i].motivo_saida = 'Sessão expirada durante o envio'
            }
            setProgressoEnvio({ ...estadoEnvio })
            break
          }

          const msgErro =
            err instanceof Error
              ? err.message
              : isAgendamento
                ? 'Falha ao agendar mensagem no banco de dados.'
                : 'Falha na comunicação com o gateway de WhatsApp (Z-API).'
          estadoEnvio.erros.push({
            clienteNome: nomeCliente,
            erro: msgErro,
          })
          if (destinatariosLote[i]) {
            destinatariosLote[i].status = 'finalizado'
            destinatariosLote[i].motivo_saida = msgErro
          }
          setProgressoEnvio({ ...estadoEnvio })
        }
      }

      // Ao final do envio, atualiza o lote criado com os dados finais dos destinatários e estatísticas recalculadas
      if (loteCriadoId) {
        try {
          const agoraFimIso = new Date().toISOString()
          const totalDests = destinatariosLote.length
          const pendentesCount = destinatariosLote.filter(
            (d) =>
              d.status === 'pendente' ||
              d.status === 'reenvio_1_agendado' ||
              d.status === 'reenvio_2_agendado',
          ).length
          const respondidosCount = destinatariosLote.filter((d) => d.status === 'respondido').length
          const atendidosCount = destinatariosLote.filter((d) => d.status === 'atendido').length
          const bloqueadosCount = destinatariosLote.filter(
            (d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp',
          ).length
          const finalizadosCount = destinatariosLote.filter(
            (d) =>
              d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe',
          ).length

          await updateDisparoMassa(loteCriadoId, {
            destinatarios: destinatariosLote,
            estatisticas: {
              total: totalDests,
              pendentes: pendentesCount,
              respondidos: respondidosCount,
              atendidos: atendidosCount,
              bloqueados: bloqueadosCount,
              finalizados: finalizadosCount,
              reenvios_1_enviados: 0,
              reenvios_2_enviados: 0,
              ultima_verificacao: agoraFimIso,
            },
          })
        } catch (errAtualizarLote) {
          console.warn('Aviso: erro ao atualizar estatísticas finais do lote:', errAtualizarLote)
        }
      }

      setIsEnviando(false)

      if (estadoEnvio.sucessos.length > 0) {
        const avisoPulados =
          totalPuladosSemNumero > 0
            ? ` (${totalPuladosSemNumero} ${
                totalPuladosSemNumero === 1
                  ? 'cliente sem número cadastrado não foi incluído'
                  : 'clientes sem número cadastrado não foram incluídos'
              })`
            : ''

        if (isAgendamento) {
          toast.success(
            `${estadoEnvio.sucessos.length} mensagem(ns) agendada(s) com sucesso!${avisoPulados}`,
            {
              description: `Mensagens salvas como "agendada" com agendado_para escalonado a cada ${intervaloSegundos}s para processamento automático pelo worker.`,
            },
          )
        } else {
          toast.success(
            `${estadoEnvio.sucessos.length} mensagem(ns) enviada(s) com sucesso!${avisoPulados}`,
            {
              description:
                'Atividade "mensagem_enviada" registrada no histórico de cada cliente e vinculada à conversa.',
            },
          )
        }
        if (onSuccess) {
          try {
            onSuccess()
          } catch (errCb) {
            console.warn('Erro ao executar callback onSuccess:', errCb)
          }
        }
      }

      if (totalPuladosSemNumero > 0 && estadoEnvio.sucessos.length === 0) {
        toast.warning(
          `${totalPuladosSemNumero} ${
            totalPuladosSemNumero === 1
              ? 'cliente sem número cadastrado não recebeu o envio'
              : 'clientes sem número cadastrado não receberam o envio'
          }.`,
        )
      }

      if (estadoEnvio.erros.length > 0 && estadoEnvio.erros.length > totalPuladosSemNumero) {
        toast.error(
          `Falha no envio para ${estadoEnvio.erros.length - totalPuladosSemNumero} cliente(s)`,
          {
            description: 'Verifique as falhas parciais detalhadas na barra de envio.',
          },
        )
      }
    } catch (erroGeral: unknown) {
      console.error('Exceção capturada em handleConfirmarEnvio:', erroGeral)
      setIsEnviando(false)
      const msg =
        erroGeral instanceof Error
          ? erroGeral.message
          : 'Ocorreu um erro inesperado ao processar o envio.'
      toast.error('Erro no processamento do disparo', {
        description: msg,
      })
    }
  }

  const isAllSelected =
    itensFiltrados.length > 0 &&
    itensFiltrados.every((item) => selectedIds.includes(item.cliente.id))

  const countSegmento = (seg: SegmentoFiltro) => {
    if (seg === 'todos') return itensProcessados.length
    return itensProcessados.filter((i) => i.segmentos.includes(seg)).length
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen max-w-none sm:max-w-none md:max-w-none lg:max-w-none h-screen max-h-none rounded-none sm:rounded-none flex flex-col p-0 overflow-hidden border-0 shadow-2xl bg-white">
        {/* Header Visual */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-gradient-to-r from-sky-50 via-white to-blue-50/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#0284C7] text-white shadow-xs">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                  <span>{titulo}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                    Disparo Individual Z-API
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  {descricao}
                </DialogDescription>
              </div>
            </div>

            {whatsAppConfig && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    whatsAppConfig.configured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>Z-API {whatsAppConfig.configured ? 'Ativa' : 'Pendente'}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Alerta de Sessão Expirada */}
        {(isSessionExpired || authErrorCapturado) && (
          <div className="p-4 border-b bg-amber-50">
            <SessaoExpiradaAlert />
          </div>
        )}

        {/* Barra de Progresso e Resumo de Envio / Agendamento */}
        {progressoEnvio && (
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-800">
              <span className="flex items-center gap-2">
                {isEnviando ? (
                  <Loader2 className="w-4 h-4 text-[#0284C7] animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                <span>
                  {isEnviando
                    ? progressoEnvio.isAgendamento
                      ? `Agendando ${progressoEnvio.atual} de ${progressoEnvio.total}...`
                      : `Enviando ${progressoEnvio.atual} de ${progressoEnvio.total}...`
                    : progressoEnvio.isAgendamento
                      ? `${progressoEnvio.sucessos.length} mensagens agendadas na fila`
                      : `${progressoEnvio.sucessos.length} mensagens enviadas com sucesso`}
                </span>
              </span>
              <span className="text-gray-500 font-mono">
                {progressoEnvio.atual} / {progressoEnvio.total}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#0284C7] h-2 transition-all duration-300"
                style={{
                  width: `${(progressoEnvio.atual / Math.max(progressoEnvio.total, 1)) * 100}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-600 flex-wrap gap-2">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" />
                Sucesso: {progressoEnvio.sucessos.length}
              </span>
              {progressoEnvio.erros.length > 0 && (
                <span className="text-rose-700 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Falhas: {progressoEnvio.erros.length}
                </span>
              )}
            </div>

            {/* Lista expansível de falhas parciais */}
            {progressoEnvio.erros.length > 0 && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg max-h-24 overflow-y-auto text-[11px] space-y-1 text-rose-800">
                <p className="font-bold">Detalhes das falhas parciais:</p>
                {progressoEnvio.erros.map((falha, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{falha.clienteNome}:</span>
                    <span className="text-rose-600 truncate">{falha.erro}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assistente de 4 Etapas: Indicador de Progresso no Topo */}
        <AssistenteProgresso
          etapaAtual={etapaAtual}
          onSelecionarEtapa={(etapa) => setEtapaAtual(etapa)}
          totalSelecionados={selectedIds.length}
        />

        {/* Corpo do Assistente: renderiza cada uma das 4 telas de forma dedicada */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5">
          {etapaAtual === 1 && (
            <Etapa1Destinatarios
              itensFiltrados={itensFiltrados}
              selectedIds={selectedIds}
              onToggleCliente={handleToggleCliente}
              onSelectAll={handleSelectAll}
              isAllSelected={isAllSelected}
              onLimparSelecao={() => setSelectedIds([])}
              busca={busca}
              onMudarBusca={setBusca}
              limiteExibicao={limiteExibicao}
              onCarregarMais={() => setLimiteExibicao((prev) => prev + 50)}
              segmentoAtivo={segmentoAtivo}
              onMudarSegmento={handleMudarSegmento}
              filtroWhatsApp={filtroWhatsApp}
              onMudarWhatsApp={(val) => {
                setFiltroWhatsApp(val)
                setListaSelecionadaId('')
              }}
              filtroCidade={filtroCidade}
              onMudarCidade={(val) => {
                setFiltroCidade(val)
                setListaSelecionadaId('')
              }}
              filtroConcessionaria={filtroConcessionaria}
              onMudarConcessionaria={(val) => {
                setFiltroConcessionaria(val)
                setListaSelecionadaId('')
              }}
              filtroTipoCliente={filtroTipoCliente}
              onMudarTipoCliente={(val) => {
                setFiltroTipoCliente(val)
                setListaSelecionadaId('')
              }}
              filtroStatus={filtroStatus}
              onMudarStatus={(val) => {
                setFiltroStatus(val)
                setListaSelecionadaId('')
              }}
              opcoesFiltrosExtras={opcoesFiltrosExtras}
              countSegmento={countSegmento}
              onLimparFiltros={handleLimparTodosFiltros}
              listasSalvas={listasSalvas}
              listaSelecionadaId={listaSelecionadaId}
              onSelecionarLista={handleSelecionarListaSalva}
              onSalvarSelecaoComoNovaLista={handleAbrirModalSalvarLista}
              onRenomearLista={handleRenomearLista}
              onEditarFiltrosLista={handleEditarFiltrosLista}
              onExcluirLista={(lista) => setListaParaExcluir(lista)}
              editandoTelefoneId={editandoTelefoneId}
              telefoneEmEdicao={telefoneEmEdicao}
              onIniciarEdicaoTelefone={(id, tel) => {
                setEditandoTelefoneId(id)
                setTelefoneEmEdicao(tel)
              }}
              onCancelarEdicaoTelefone={() => {
                setEditandoTelefoneId(null)
                setTelefoneEmEdicao('')
              }}
              onSalvarTelefoneInline={handleSalvarTelefoneInline}
              onMudarTelefoneEmEdicao={setTelefoneEmEdicao}
              clienteFocadoId={clienteFocadoId}
              onFocarCliente={(id) => setClienteFocadoId(id)}
            />
          )}

          {etapaAtual === 2 && (
            <Etapa2Mensagem
              templates={templates}
              templateSelecionadoId={templateSelecionadoId}
              onSelecionarTemplate={handleSelecionarTemplate}
              templateTexto={templateTexto}
              onMudarTemplateTexto={setTemplateTexto}
              onRestaurarPadrao={() => setTemplateTexto(mensagemPadrao || MENSAGEM_INICIAL_DEFAULT)}
              textoVeraDoFluxo={textoVeraDoFluxo}
              etapaImediataFluxo={etapaImediataFluxo}
              fluxoSelecionadoObj={fluxoSelecionadoObj}
              mensagemPreviaResolvida={mensagemPreviaResolvida}
              itemFocado={itemFocado}
              destinatariosParaPrevia={
                selectedIds.length > 0
                  ? itensProcessados.filter((i) => selectedIds.includes(i.cliente.id))
                  : itensFiltrados
              }
              onSelecionarClienteFocado={(id) => setClienteFocadoId(id)}
            />
          )}

          {etapaAtual === 3 && (
            <Etapa3MomentoFollowUp
              tipoEnvio={tipoEnvio}
              onMudarTipoEnvio={setTipoEnvio}
              dataHoraAgendada={dataHoraAgendada}
              onMudarDataHoraAgendada={setDataHoraAgendada}
              intervaloSegundos={intervaloSegundos}
              onMudarIntervaloSegundos={setIntervaloSegundos}
              reenvioAtivo={reenvioAtivo}
              onMudarReenvioAtivo={setReenvioAtivo}
              fluxosDisponiveis={fluxosDisponiveis}
              fluxoSelecionadoId={fluxoSelecionadoId}
              onMudarFluxoSelecionadoId={setFluxoSelecionadoId}
              textoVeraDoFluxo={textoVeraDoFluxo}
              etapaImediataFluxo={etapaImediataFluxo}
              fluxoSelecionadoObj={fluxoSelecionadoObj}
              textoReenvio1={textoReenvio1}
              onMudarTextoReenvio1={setTextoReenvio1}
              textoReenvio2={textoReenvio2}
              onMudarTextoReenvio2={setTextoReenvio2}
            />
          )}

          {etapaAtual === 4 && (
            <Etapa4RevisaoEnvio
              destinatariosSelecionados={itensProcessados.filter((i) =>
                selectedIds.includes(i.cliente.id),
              )}
              templateTextoEfetivo={templateEfetivo}
              templateTitulo={templates.find((t) => t.id === templateSelecionadoId)?.titulo}
              tipoEnvio={tipoEnvio}
              dataHoraAgendada={dataHoraAgendada}
              intervaloSegundos={intervaloSegundos}
              reenvioAtivo={reenvioAtivo}
              fluxoSelecionadoObj={fluxoSelecionadoObj}
              isEnviando={isEnviando}
              onConfirmarEnvio={handleConfirmarEnvio}
              onVoltarParaEtapa={(et) => setEtapaAtual(et)}
            />
          )}
        </div>

        {/* Rodapé de Ações do Assistente com Navegação entre Etapas */}
        <div className="p-3.5 sm:p-5 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-600 text-center sm:text-left flex items-center gap-2">
            <span className="font-bold text-gray-900">
              {selectedIds.length === 1
                ? '1 cliente selecionado'
                : `${selectedIds.length} clientes selecionados`}
            </span>
            <span className="hidden sm:inline">• Etapa {etapaAtual} de 4</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isEnviando}
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>

            {/* Botão Voltar Etapa (visível a partir da etapa 2) */}
            {etapaAtual > 1 && (
              <Button
                type="button"
                variant="outline"
                disabled={isEnviando}
                onClick={() => setEtapaAtual((prev) => Math.max(1, prev - 1) as EtapaAssistente)}
                className="text-xs flex items-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </Button>
            )}

            {/* Botão Avançar Etapa (etapas 1, 2 e 3) */}
            {etapaAtual < 4 && (
              <Button
                type="button"
                onClick={() => {
                  if (etapaAtual === 1 && selectedIds.length === 0) {
                    toast.warning('Selecione pelo menos um cliente para avançar')
                    return
                  }
                  setEtapaAtual((prev) => Math.min(4, prev + 1) as EtapaAssistente)
                }}
                className="text-white text-xs font-bold bg-[#0284C7] hover:bg-[#0369a1] shadow-xs flex items-center gap-1.5 px-4"
              >
                <span>Avançar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Botão Final de Disparo na Etapa 4 (ou direto se na etapa 4) */}
            {etapaAtual === 4 && (
              <Button
                type="button"
                disabled={isEnviando || selectedIds.length === 0}
                onClick={handleConfirmarEnvio}
                className={`text-white text-xs font-bold shadow-sm flex items-center gap-2 px-4 ${
                  tipoEnvio === 'agendar'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#0284C7] hover:bg-[#0369a1]'
                }`}
              >
                {isEnviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {tipoEnvio === 'agendar' ? 'Agendando' : 'Enviando'}{' '}
                      {progressoEnvio?.atual || 0} de {progressoEnvio?.total || selectedIds.length}
                      ...
                    </span>
                  </>
                ) : tipoEnvio === 'agendar' ? (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>
                      {selectedIds.length <= 1
                        ? 'Agendar Envio'
                        : `Agendar para ${selectedIds.length} Clientes`}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {selectedIds.length <= 1
                        ? 'Enviar Mensagem'
                        : `Enviar para ${selectedIds.length} Clientes`}
                    </span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Modal Pequeno / Dialog: Salvar Seleção Atual como Lista Salva */}
        <Dialog open={modalSalvarListaOpen} onOpenChange={setModalSalvarListaOpen}>
          <DialogContent className="max-w-md p-5 sm:rounded-xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#0284C7]" />
                <span>Salvar Seleção Atual</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Grava o segmento ativo e os filtros extras combinados como uma lista salva no CRM.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label htmlFor="nome-lista-input" className="text-xs font-semibold text-gray-700">
                  Nome da Lista:
                </Label>
                <Input
                  id="nome-lista-input"
                  value={nomeNovaLista}
                  onChange={(e) => setNomeNovaLista(e.target.value)}
                  placeholder="Ex: Clientes O&M - Passo Fundo (Com WhatsApp)"
                  className="text-xs bg-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleConfirmarSalvarLista()
                    }
                  }}
                />
              </div>

              {/* Seletor do Fluxo para a Lista Salva */}
              <div className="space-y-1">
                <Label htmlFor="fluxo-lista-input" className="text-xs font-semibold text-gray-700">
                  Fluxo de Follow-up Vinculado à Lista:
                </Label>
                <select
                  id="fluxo-lista-input"
                  value={fluxoSelecionadoId}
                  onChange={(e) => setFluxoSelecionadoId(e.target.value)}
                  className="w-full h-8 text-xs font-medium px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                >
                  <option value="">Nenhum (usar padrão Delfos)</option>
                  {fluxosDisponiveis.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} {f.is_padrao ? '(Padrão Delfos)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resumo do que será gravado */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-gray-600 space-y-1">
                <p className="font-semibold text-gray-800">Critérios capturados:</p>
                {selectedIds.length > 0 ? (
                  <div className="p-2 rounded bg-sky-50 border border-sky-200 text-sky-950 font-medium space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-sky-900">
                      <CheckSquare className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span>Seleção manual de clientes:</span>
                    </div>
                    <p className="text-xs text-sky-800">
                      <strong>{selectedIds.length} cliente(s)</strong> marcados por checkbox serão
                      gravados nesta lista. Ao reabrir, apenas estes clientes serão selecionados.
                    </p>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-950 font-medium space-y-0.5">
                    <p className="text-xs text-amber-800">
                      Nenhum checkbox marcado individualmente: a lista gravará os filtros dinâmicos
                      ativos abaixo.
                    </p>
                  </div>
                )}

                <ul className="list-disc list-inside space-y-0.5 text-gray-700 pt-1">
                  <li>
                    Segmento:{' '}
                    <strong className="text-sky-900">
                      {segmentoAtivo === 'todos'
                        ? 'Todos'
                        : segmentoAtivo === 'clientes_om'
                          ? 'Clientes O&M'
                          : segmentoAtivo === 'clientes_solar'
                            ? 'Clientes Solar'
                            : segmentoAtivo === 'clientes_bateria'
                              ? 'Clientes Bateria'
                              : 'Pós-Venda'}
                    </strong>
                  </li>
                  {fluxoSelecionadoId && (
                    <li>
                      Fluxo:{' '}
                      <strong className="text-emerald-700">
                        {fluxosDisponiveis.find((f) => f.id === fluxoSelecionadoId)?.nome ||
                          'Padrão'}
                      </strong>
                    </li>
                  )}
                  {filtroWhatsApp !== 'todos' && (
                    <li>
                      WhatsApp:{' '}
                      <strong>
                        {filtroWhatsApp === 'com_whatsapp'
                          ? 'Só com WhatsApp'
                          : 'Sem WhatsApp cadastrado'}
                      </strong>
                    </li>
                  )}
                  {filtroCidade && (
                    <li>
                      Cidade: <strong>{filtroCidade}</strong>
                    </li>
                  )}
                  {filtroConcessionaria && (
                    <li>
                      Concessionária: <strong>{filtroConcessionaria}</strong>
                    </li>
                  )}
                  {filtroTipoCliente && (
                    <li>
                      Tipo: <strong>{filtroTipoCliente}</strong>
                    </li>
                  )}
                  {filtroStatus && (
                    <li>
                      Status: <strong>{filtroStatus}</strong>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalSalvarListaOpen(false)}
                disabled={isSalvandoLista}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarSalvarLista}
                disabled={isSalvandoLista || !nomeNovaLista.trim()}
                className="bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-bold"
              >
                {isSalvandoLista ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Lista</span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Exclusão de Lista Salva */}
        <Dialog
          open={Boolean(listaParaExcluir)}
          onOpenChange={(open) => !open && setListaParaExcluir(null)}
        >
          <DialogContent className="max-w-sm p-5 sm:rounded-xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Excluir Lista Salva</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600">
                Tem certeza que deseja excluir a lista salva{' '}
                <strong className="text-gray-900">"{listaParaExcluir?.nome}"</strong>?
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setListaParaExcluir(null)}
                disabled={isExcluindoLista}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarExcluirLista}
                disabled={isExcluindoLista}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {isExcluindoLista ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Excluir</span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

export default ModalMensagemWhatsAppMassa
