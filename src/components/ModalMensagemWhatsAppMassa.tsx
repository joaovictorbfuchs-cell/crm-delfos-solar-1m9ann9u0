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
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { toast } from 'sonner'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'
import { validarNumeroWhatsApp } from '@/lib/propostaWhatsAppService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import { SessaoExpiradaAlert } from '@/components/SessaoExpiradaAlert'
import { fetchWhatsAppTemplates } from '@/services/crmService'
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

  // Estado da mensagem
  const [templateTexto, setTemplateTexto] = useState(mensagemPadrao || MENSAGEM_INICIAL_DEFAULT)

  // Filtros de seleção
  const [segmentoAtivo, setSegmentoAtivo] = useState<SegmentoFiltro>(segmentoInicial)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [clienteFocadoId, setClienteFocadoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [limiteExibicao, setLimiteExibicao] = useState(50)

  // Edição rápida de telefone
  const [editandoTelefoneId, setEditandoTelefoneId] = useState<string | null>(null)
  const [telefoneEmEdicao, setTelefoneEmEdicao] = useState('')

  // Progresso do envio em lote
  const [isEnviando, setIsEnviando] = useState(false)
  const [progressoEnvio, setProgressoEnvio] = useState<{
    total: number
    atual: number
    sucessos: string[]
    erros: Array<{ clienteNome: string; erro: string }>
    avisosDemo?: string[]
  } | null>(null)

  const [authErrorCapturado, setAuthErrorCapturado] = useState(false)

  // Carrega templates do backend ao abrir o modal
  useEffect(() => {
    if (!open) return
    let cancelado = false

    const carregarTemplates = async () => {
      try {
        const registros = await fetchWhatsAppTemplates()
        if (cancelado) return

        if (Array.isArray(registros) && registros.length > 0) {
          // Filtra ou ordena templates para destacar Lembrete de manutenção, Oferta especial, Fatura em atraso
          const mapeados = registros.map((r: WhatsAppTemplate) => ({
            id: r.id,
            titulo: r.titulo,
            conteudo: r.conteudo,
          }))

          // Garante que os modelos solicitados apareçam se não existirem
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
      } catch (err) {
        console.warn('Usando templates fallback de mensagem em massa:', err)
        setTemplates(TEMPLATES_PADRAO_FALLBACK)
      }
    }

    carregarTemplates()
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
      // tipo_venda Baterias OU tipo_negocio baterias OU tipo_sistema Híbrido/baterias OU produto bateria/sistemas híbridos
      const isBateria =
        tipoVenda.includes('bateria') ||
        tipoNegocio.includes('bateria') ||
        produto.includes('bateria') ||
        tipoSistema.includes('híbrido') ||
        tipoSistema.includes('hibrido') ||
        tipoNegocio.includes('sistemas híbridos')

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
          ? contatosAdicionais.filter((c) => c.cliente_id === cli.id)
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
          ? contatosAdicionais.filter((c) => c.cliente_id === cli.id)
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

  // Filtragem por Segmento e por Busca
  const itensFiltrados = useMemo(() => {
    let resultado = itensProcessados

    // 1. Filtro por segmento
    if (segmentoAtivo !== 'todos') {
      resultado = resultado.filter((item) => item.segmentos.includes(segmentoAtivo))
    }

    // 2. Filtro por busca de texto
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
  }, [itensProcessados, segmentoAtivo, busca])

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

    setTemplateTexto(mensagemPadrao || MENSAGEM_INICIAL_DEFAULT)
    setSegmentoAtivo(segmentoInicial)
    setAuthErrorCapturado(false)
    setProgressoEnvio(null)
    setBusca('')
    setLimiteExibicao(50)

    // Se veio destinatáriosIniciais, seleciona todos eles por padrão
    if (destinatariosIniciais && destinatariosIniciais.length > 0) {
      const ids = destinatariosIniciais
        .map((d) => d.cliente?.id)
        .filter((id): id is string => Boolean(id))
      const uniqueIds = Array.from(new Set(ids))
      setSelectedIds(uniqueIds)
      setClienteFocadoId(uniqueIds[0] || null)
    } else {
      // Base geral: calcula os itens para o segmento inicial
      let itensIniciais = itensProcessados
      if (segmentoInicial !== 'todos') {
        itensIniciais = itensIniciais.filter((i) => i.segmentos.includes(segmentoInicial))
      }
      const selecionaveis = itensIniciais.filter((c) => c.temWhatsAppValido)
      const idsIniciais = selecionaveis.slice(0, 5).map((c) => c.cliente.id)
      setSelectedIds(idsIniciais)
      setClienteFocadoId(idsIniciais[0] || itensIniciais[0]?.cliente.id || null)
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

  // Mensagem resolvida em tempo real para a prévia do primeiro cliente selecionado
  const mensagemPreviaResolvida = useMemo(() => {
    if (!itemFocado) return templateTexto
    return resolverPlaceholdersMensagemMassa({
      template: templateTexto,
      cliente: itemFocado.cliente,
      usina: itemFocado.usina,
      valor: itemFocado.valorItem,
      cidadeManual: itemFocado.cidade,
    })
  }, [templateTexto, itemFocado])

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
    if (selectedIds.length === 0) {
      toast.error('Selecione ao menos um cliente para enviar.')
      return
    }

    const selecionados = itensProcessados.filter((c) => selectedIds.includes(c.cliente.id))
    const semWhatsApp = selecionados.filter((c) => !c.temWhatsAppValido)

    if (semWhatsApp.length > 0 && semWhatsApp.length === selecionados.length) {
      toast.error('Nenhum cliente selecionado possui número de destino válido.', {
        description:
          'Cadastre WhatsApp, contato adicional ou telefone dos clientes antes de enviar.',
      })
      return
    }

    setIsEnviando(true)
    let totalPuladosSemNumero = 0
    const estadoEnvio = {
      total: selecionados.length,
      atual: 0,
      sucessos: [] as string[],
      erros: [] as Array<{ clienteNome: string; erro: string }>,
      avisosDemo: [] as string[],
      puladosSemNumero: 0,
    }
    setProgressoEnvio({ ...estadoEnvio })

    for (let i = 0; i < selecionados.length; i++) {
      const item = selecionados[i]
      estadoEnvio.atual = i + 1
      setProgressoEnvio({ ...estadoEnvio })

      // REGRA: Exemplos fictícios de demonstração NUNCA disparam para cliente real
      if (item.isExemploDemo || item.cliente.id.startsWith('demo_')) {
        estadoEnvio.avisosDemo.push(item.cliente.nome)
        // Simula o delay visual da demonstração sem efetuar chamada externa
        await new Promise((resolve) => setTimeout(resolve, 400))
        estadoEnvio.sucessos.push(`${item.cliente.nome} (Demonstração)`)
        setProgressoEnvio({ ...estadoEnvio })
        continue
      }

      // Clientes sem nenhum número cadastrado são pulados
      if (!item.temWhatsAppValido || !item.numeroLimpo) {
        totalPuladosSemNumero++
        estadoEnvio.puladosSemNumero = totalPuladosSemNumero
        estadoEnvio.erros.push({
          clienteNome: item.cliente.nome,
          erro: 'Envio não realizado: o cliente não possui WhatsApp, contato adicional ou telefone cadastrado.',
        })
        setProgressoEnvio({ ...estadoEnvio })
        continue
      }

      const mensagemBase = resolverPlaceholdersMensagemMassa({
        template: templateTexto,
        cliente: item.cliente,
        usina: item.usina,
        valor: item.valorItem,
        cidadeManual: item.cidade,
      })
      const mensagemFinal = aplicarPrefixoMensagemManual(mensagemBase)

      try {
        // Disparo via gateway Z-API Z-API
        await sendWhatsAppMessage({
          cliente_id: item.cliente.id,
          telefone_destino: item.numeroLimpo,
          conteudo_final: mensagemFinal,
          tipo_disparo: 'massa',
        })

        // Registra atividade autoritativa do tipo 'mensagem_enviada' no CRM
        const agora = new Date().toISOString()
        await addAtividade({
          cliente_id: item.cliente.id,
          tipo: 'mensagem_enviada',
          titulo: 'Mensagem via WhatsApp (Disparo em Massa)',
          descricao: `Mensagem enviada via WhatsApp para ${item.cliente.nome}:\n\n"${mensagemFinal}"`,
          data: agora,
          status: 'concluida',
          autor: 'CRM Delfos Solar',
        })

        estadoEnvio.sucessos.push(item.cliente.nome)
        setProgressoEnvio({ ...estadoEnvio })
      } catch (err: unknown) {
        console.error(`Erro ao enviar mensagem para ${item.cliente.nome}:`, err)
        if (isAuthSessionError(err)) {
          setAuthErrorCapturado(true)
          estadoEnvio.erros.push({
            clienteNome: item.cliente.nome,
            erro: 'Sessão expirada. Faça login novamente.',
          })
          setProgressoEnvio({ ...estadoEnvio })
          break
        }

        const msgErro =
          err instanceof Error
            ? err.message
            : 'Falha na comunicação com o gateway de WhatsApp (Z-API).'
        estadoEnvio.erros.push({
          clienteNome: item.cliente.nome,
          erro: msgErro,
        })
        setProgressoEnvio({ ...estadoEnvio })
      }
    }

    setIsEnviando(false)

    if (estadoEnvio.sucessos.length > 0) {
      const avisoPulados =
        totalPuladosSemNumero > 0
          ? ` (${totalPuladosSemNumero} ${
              totalPuladosSemNumero === 1
                ? 'cliente sem número cadastrado não recebeu o envio'
                : 'clientes sem número cadastrado não receberam o envio'
            })`
          : ''
      toast.success(
        `${estadoEnvio.sucessos.length} mensagem(ns) enviada(s) com sucesso!${avisoPulados}`,
        {
          description:
            'Atividade "mensagem_enviada" registrada no histórico de cada cliente e vinculada à conversa.',
        },
      )
      if (onSuccess) onSuccess()
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
      <DialogContent className="max-w-5xl max-h-[94vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl">
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

        {/* Barra de Progresso e Resumo de Envio */}
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
                    ? `Enviando ${progressoEnvio.atual} de ${progressoEnvio.total}...`
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

        {/* Corpo do Modal em 2 Colunas */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ======================================================== */}
          {/* COLUNA ESQUERDA (lg:col-span-6): DESTINATÁRIOS & SEGMENTO */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col space-y-3">
            {/* Filtros por Segmento de Clientes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>Filtrar por Segmento</span>
                </Label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-[#0284C7] hover:underline"
                >
                  {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>

              {/* Pílulas de segmentos */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'clientes_om', label: 'Clientes O&M' },
                  { id: 'clientes_solar', label: 'Clientes Solar' },
                  { id: 'clientes_bateria', label: 'Clientes Bateria' },
                  { id: 'pos_vendas', label: 'Pós-Venda' },
                ].map((seg) => {
                  const isAtivo = segmentoAtivo === seg.id
                  const count = countSegmento(seg.id as SegmentoFiltro)
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => handleMudarSegmento(seg.id as SegmentoFiltro)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isAtivo
                          ? 'bg-[#0284C7] text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{seg.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isAtivo ? 'bg-white/20 text-white' : 'bg-white text-gray-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Campo de Busca por Cliente */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar cliente por nome, cidade ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 text-xs sm:text-sm bg-white"
              />
            </div>

            {/* Resumo de Seleção */}
            <div className="flex items-center justify-between text-xs text-gray-600 px-1">
              <span>
                <strong className="text-gray-900">{selectedIds.length}</strong> de{' '}
                {itensFiltrados.length} destinatários selecionados
              </span>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-gray-400 hover:text-gray-700 underline text-[11px]"
                >
                  Limpar seleção
                </button>
              )}
            </div>

            {/* Lista com Rolagem e Seleção com Checkbox Múltiplo */}
            <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[360px] overflow-y-auto divide-y divide-gray-100 shadow-2xs">
              {itensFiltrados.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700">Nenhum cliente neste filtro</p>
                  <p>Tente selecionar outro segmento ou limpar a busca.</p>
                </div>
              ) : (
                <>
                  {itensFiltrados.slice(0, limiteExibicao).map((item) => {
                    const isChecked = selectedIds.includes(item.cliente.id)
                    const isFocado = itemFocado?.cliente.id === item.cliente.id
                    const isEditandoTel = editandoTelefoneId === item.cliente.id

                    return (
                      <div
                        key={item.cliente.id}
                        onClick={() => setClienteFocadoId(item.cliente.id)}
                        className={`p-3 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                          isFocado
                            ? 'bg-sky-50/70 border-l-4 border-l-[#0284C7]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="flex items-start gap-2.5 flex-1 min-w-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleCliente(item.cliente.id)
                            }}
                          >
                            <button
                              type="button"
                              className="mt-0.5 text-gray-400 hover:text-[#0284C7] transition-colors shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-[#0284C7]" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                                  {item.cliente.nome}
                                </span>
                                {item.cidade && (
                                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                    {item.cidade}
                                  </span>
                                )}
                                {item.isExemploDemo && (
                                  <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
                                    Exemplo (Demo)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                  {item.potenciaTexto}
                                </span>
                                {item.valorItem && item.valorItem > 0 ? (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                                      <DollarSign className="w-3 h-3" />
                                      {formatCurrency(item.valorItem)}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Linha do Telefone / WhatsApp */}
                        <div
                          className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100/80 gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEditandoTel ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <Input
                                value={telefoneEmEdicao}
                                onChange={(e) =>
                                  setTelefoneEmEdicao(formatWhatsAppPhone(e.target.value))
                                }
                                placeholder="(00) 00000-0000"
                                className="h-7 text-xs bg-white flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                type="button"
                                onClick={() => handleSalvarTelefoneInline(item.cliente)}
                                className="h-7 px-2 text-xs bg-[#0284C7] hover:bg-[#0369a1] text-white"
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                type="button"
                                onClick={() => {
                                  setEditandoTelefoneId(null)
                                  setTelefoneEmEdicao('')
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-[#0284C7]" />
                                  {item.temWhatsAppValido ? (
                                    <span className="font-medium text-gray-800">
                                      {item.telefoneAutoritativo}
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-rose-600 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Sem número cadastrado
                                    </span>
                                  )}
                                </div>
                                {item.origemNumero === 'contato_adicional_whatsapp' && (
                                  <span className="text-[10px] text-blue-700 font-medium">
                                    Contato adicional: {item.contatoAdicionalNome || 'Contato'}{' '}
                                    (utilizado como alternativa)
                                  </span>
                                )}
                                {item.origemNumero === 'cliente_telefone' && (
                                  <span className="text-[10px] text-amber-700 font-medium">
                                    Telefone fixo/comercial (sem WhatsApp próprio)
                                  </span>
                                )}
                              </div>
                              {!item.isExemploDemo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditandoTelefoneId(item.cliente.id)
                                    setTelefoneEmEdicao(item.telefoneAutoritativo)
                                  }}
                                  className="text-[10px] text-[#0284C7] hover:underline font-semibold inline-flex items-center gap-1"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                  <span>
                                    {item.temWhatsAppValido ? 'Alterar' : 'Informar WhatsApp'}
                                  </span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {itensFiltrados.length > limiteExibicao && (
                    <div className="p-2.5 bg-slate-50 text-center border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setLimiteExibicao((prev) => prev + 50)}
                        className="text-xs font-semibold text-[#0284C7] hover:underline py-1 px-3 rounded-lg hover:bg-sky-50 transition-colors"
                      >
                        Carregar mais 50 (mostrando {limiteExibicao} de {itensFiltrados.length})
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="text-[11px] text-gray-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
              <span>
                O envio utiliza o número autoritativo do WhatsApp do cliente via Z-API, sem abrir
                WhatsApp Web. Cada disparo registra uma atividade <strong>mensagem_enviada</strong>{' '}
                no histórico do CRM.
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUNA DIREITA (lg:col-span-6): MODELOS & PRÉ-VISUALIZAÇÃO */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col space-y-3">
            {/* Dropdown com Modelos Pré-Cadastrados */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>Modelos de Mensagem</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setTemplateTexto(mensagemPadrao || MENSAGEM_INICIAL_DEFAULT)}
                  className="text-[11px] text-gray-500 hover:text-[#0284C7] underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar padrão</span>
                </button>
              </div>

              <select
                value={templateSelecionadoId}
                onChange={(e) => handleSelecionarTemplate(e.target.value)}
                className="w-full text-xs font-medium py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              >
                <option value="">Selecione um modelo pré-cadastrado...</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.titulo}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo de Texto Editável */}
            <div className="space-y-1.5 flex-1 flex flex-col">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Texto da Mensagem (com Tags Dinâmicas)
              </Label>
              <Textarea
                ref={textareaRef}
                rows={5}
                value={templateTexto}
                onChange={(e) => setTemplateTexto(e.target.value)}
                className="text-xs font-mono bg-white resize-none p-2.5 leading-relaxed"
                placeholder="Digite a mensagem com os placeholders [nome do cliente], [cidade], [potência], [valor]..."
              />

              {/* Inserção das Tags Dinâmicas com Um Clique */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-gray-700 block">
                  Inserir tag com um clique:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PLACEHOLDERS_ENVIO_MASSA.map((p) => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => handleInsertPlaceholder(p.tag)}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-mono font-medium transition-colors shadow-2xs"
                      title={p.descricao}
                    >
                      <span>{p.tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PREVIEW da Mensagem Resolvida para o Primeiro Cliente Selecionado */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>
                    Prévia:{' '}
                    <strong className="text-sky-900">
                      {itemFocado ? itemFocado.cliente.nome : 'Nenhum cliente selecionado'}
                    </strong>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(mensagemPreviaResolvida)
                    toast.success('Mensagem copiada para a área de transferência')
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 font-semibold"
                  title="Copiar texto da prévia"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </button>
              </div>

              {/* Balão WhatsApp Prévia */}
              <div className="bg-[#DCF8C6]/85 text-gray-900 text-xs p-3 rounded-xl rounded-tr-none shadow-xs border border-emerald-200/60 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto font-sans">
                {mensagemPreviaResolvida}
              </div>

              {/* Dados Resolvidos na Prévia */}
              {itemFocado && (
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <span className="text-gray-400 block">Destinatário</span>
                    <span className="font-bold text-gray-800 truncate block">
                      {extrairPrimeiroNomeCliente(itemFocado.cliente)}
                    </span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <span className="text-gray-400 block">Cidade</span>
                    <span className="font-bold text-gray-800 truncate block">
                      {itemFocado.cidade}
                    </span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <span className="text-gray-400 block">Potência</span>
                    <span className="font-bold text-sky-800">{itemFocado.potenciaTexto}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-3.5 sm:p-5 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-600 text-center sm:text-left">
            <span className="font-bold text-gray-900">
              {selectedIds.length === 1
                ? '1 cliente selecionado'
                : `${selectedIds.length} clientes selecionados`}
            </span>
            <span className="hidden sm:inline">
              {' '}
              • Disparo sequencial via Z-API com registro de atividade no CRM
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isEnviando}
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={isEnviando || selectedIds.length === 0}
              onClick={handleConfirmarEnvio}
              className="bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-sm flex items-center gap-2 px-4"
            >
              {isEnviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Enviando {progressoEnvio?.atual || 0} de{' '}
                    {progressoEnvio?.total || selectedIds.length}...
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ModalMensagemWhatsAppMassa
