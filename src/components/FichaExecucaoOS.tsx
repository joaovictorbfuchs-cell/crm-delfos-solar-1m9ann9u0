import React, { useState, useEffect, useRef } from 'react'
import {
  OrdemServico,
  OSTemplate,
  OSChecklistItem,
  Cliente,
  Sistema,
  OSTipoServico,
  UsinaCliente,
} from '@/types/crm'
import {
  fetchSistemaByClienteId,
  fetchUsinaById,
  finalizarOrdemServico,
  updateOrdemServico,
} from '@/services/crmService'
import { fetchEquipamentosByUsinaId } from '@/services/usinaEquipamentosService'
import type { UsinaEquipamentoAtivo } from '@/types/equipamentos'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  CheckSquare,
  Square,
  AlertTriangle,
  FileText,
  Upload,
  User,
  Image as ImageIcon,
  Check,
  ShieldCheck,
  X,
  ExternalLink,
  FileCode2,
  Wifi,
  Navigation,
} from 'lucide-react'
import { formatDateTime } from '@/lib/formatters'

import { useAuth } from '@/contexts/AuthContext'
import type { SistemaUsuario } from '@/types/crm'
import { BotaoEnviarOSWhatsApp } from '@/components/BotaoEnviarOSWhatsApp'
import { ModalConfirmarEnvioWhatsApp } from '@/components/ModalConfirmarEnvioWhatsApp'
import { useClientes } from '@/contexts/ClientesContext'
import { MessageSquare, RotateCcw } from 'lucide-react'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface FichaExecucaoOSProps {
  os: OrdemServico
  templates?: OSTemplate[]
  instaladores?: SistemaUsuario[]
  onBack: () => void
  onOSUpdated: (updatedOS: OrdemServico) => void
  onOSFinalizada: (finalizedOS: OrdemServico) => void
}

// Checklist padrão por tipo de serviço solar caso a OS não tenha checklist registrado
export function getDefaultChecklist(tipo: OSTipoServico): OSChecklistItem[] {
  switch (tipo) {
    case 'Limpeza':
      return [
        { id: '1', item: 'Chegou no local da usina', concluido: false },
        { id: '2', item: 'Verificou estado físico das placas e sujidade', concluido: false },
        {
          id: '3',
          item: 'Limpou módulos com água desmineralizada e escova macia',
          concluido: false,
        },
        { id: '4', item: 'Verificou status e conexões do inversor', concluido: false },
        { id: '5', item: 'Testou geração e sincronismo com a rede', concluido: false },
      ]
    case 'Instalação':
      return [
        { id: '1', item: 'Conferiu lista de materiais e projeto', concluido: false },
        { id: '2', item: 'Fixou suportes e perfis na estrutura do telhado', concluido: false },
        { id: '3', item: 'Instalou módulos com alinhamento e torque correto', concluido: false },
        { id: '4', item: 'Conectou inversor, stringbox e condutores CC/CA', concluido: false },
        { id: '5', item: 'Testou parâmetros elétricos e funcionamento da usina', concluido: false },
      ]
    case 'Manutenção':
      return [
        { id: '1', item: 'Inspeção visual geral da usina e cabeamento', concluido: false },
        {
          id: '2',
          item: 'Termografia em módulos, caixas e barramentos elétricos',
          concluido: false,
        },
        { id: '3', item: 'Reaperto de bornes e parafusos com torquímetro', concluido: false },
        { id: '4', item: 'Limpeza de filtros e dissipadores do inversor', concluido: false },
        { id: '5', item: 'Medição de isolamento e teste de geração instantânea', concluido: false },
      ]
    case 'Garantia':
      return [
        {
          id: '1',
          item: 'Fotografou plaqueta do equipamento e número de série (SN)',
          concluido: false,
        },
        { id: '2', item: 'Registrou códigos de falhas e alarmes ativos', concluido: false },
        { id: '3', item: 'Aferiu tensão Voc e corrente Isc de entrada CC', concluido: false },
        {
          id: '4',
          item: 'Aferiu tensão e frequência de saída CA da concessionária',
          concluido: false,
        },
        {
          id: '5',
          item: 'Preencheu laudo técnico fotográfico para acionamento de garantia',
          concluido: false,
        },
      ]
    case 'Configuração de Datalogger':
      return [
        {
          id: '1',
          item: 'Conectou datalogger na porta de comunicação do inversor',
          concluido: false,
        },
        { id: '2', item: 'Acessou rede local do datalogger via celular', concluido: false },
        {
          id: '3',
          item: 'Configurou credenciais da rede Wi-Fi 2.4GHz do cliente',
          concluido: false,
        },
        {
          id: '4',
          item: 'Registrou planta no portal de monitoramento da Delfos',
          concluido: false,
        },
        {
          id: '5',
          item: 'Validou fluxo de dados e visualização no app do cliente',
          concluido: false,
        },
      ]
    default:
      return [
        { id: '1', item: 'Chegou no local e realizou análise preliminar', concluido: false },
        { id: '2', item: 'Executou os procedimentos técnicos', concluido: false },
        { id: '3', item: 'Testou funcionamento do sistema solar', concluido: false },
      ]
  }
}

export const FichaExecucaoOS: React.FC<FichaExecucaoOSProps> = ({
  os,
  templates,
  instaladores = [],
  onBack,
  onOSUpdated,
  onOSFinalizada,
}) => {
  const { toast } = useToast()
  const { isAdmin, isInstalador, userProfile } = useAuth()
  const { sendWhatsAppMessage } = useClientes()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Regra de permissão de edição pós-conclusão
  const podeEditarOS = isAdmin || os.status !== 'concluida'

  // Modal WhatsApp direto com o cliente da OS
  const [modalWhatsAppClienteAberto, setModalWhatsAppClienteAberto] = useState(false)
  const [isReabrindo, setIsReabrindo] = useState(false)

  // Estado para admin reatribuir instalador direto na ficha
  const [responsavelId, setResponsavelId] = useState<string>(os.responsavel_usuario_id || '')

  const cliente: Cliente | undefined = os.expand?.cliente_id
  const [usinaVinculada, setUsinaVinculada] = useState<UsinaCliente | null>(() => {
    return (os.expand?.usina_id as UsinaCliente) || null
  })
  const [equipamentosUsina, setEquipamentosUsina] = useState<UsinaEquipamentoAtivo[]>([])
  const [carregandoUsina, setCarregandoUsina] = useState<boolean>(false)

  const [sistema, setSistema] = useState<Sistema | null>(null)
  const [inversoresLista, setInversoresLista] = useState<import('@/types/crm').ClienteInversor[]>(
    [],
  )

  // Procedimentos de trabalho padrão vindos do Catálogo de Atividades
  const [orientacoesCatalogo, setOrientacoesCatalogo] = useState<string>('')
  const [loadingCatalogo, setLoadingCatalogo] = useState<boolean>(false)

  // 2. Instruções / Procedimentos da OS
  const [instrucoesTexto, setInstrucoesTexto] = useState<string>(() => {
    if (os.instrucoes && os.instrucoes.trim().length > 0) {
      return os.instrucoes
    }
    const matchingTemplate = (templates || []).find((t) => t?.tipo_servico === os.tipo_servico)
    return matchingTemplate?.instrucoes || ''
  })

  // Status de execução em andamento (local ou salvo)
  const [osEmAndamento, setOsEmAndamento] = useState<boolean>(() => {
    const checklistFeitos = (os.checklist || []).some((c) => c.concluido)
    return Boolean(
      checklistFeitos ||
      (os.detalhes_execucao && os.detalhes_execucao.includes('[INÍCIO DO ATENDIMENTO]')),
    )
  })

  // 3. Checklist
  const [checklist, setChecklist] = useState<OSChecklistItem[]>(() => {
    if (os.checklist && os.checklist.length > 0) {
      return os.checklist
    }
    return getDefaultChecklist(os.tipo_servico)
  })

  // 4. Fotos: fotos já salvas (nomes em PB) + novas fotos capturadas na sessão
  const [fotosSalvas, setFotosSalvas] = useState<string[]>(os.fotos || [])
  const [novasFotos, setNovasFotos] = useState<{ file: File; previewUrl: string }[]>([])

  // 5. Detalhes da execução
  const [detalhesExecucao, setDetalhesExecucao] = useState<string>(os.detalhes_execucao || '')

  // Confirmação de Finalização
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carrega dados da usina vinculada e equipamentos (com fallback para dados legados do cliente)
  useEffect(() => {
    let cancelado = false
    const usinaId = os.usina_id || (os.expand?.usina_id as any)?.id

    async function carregarDadosUsinaOuCliente() {
      setCarregandoUsina(true)
      try {
        if (usinaId) {
          // Busca a usina completa
          const usina = await fetchUsinaById(usinaId)
          if (!cancelado && usina) {
            setUsinaVinculada(usina)
          }

          // Busca equipamentos em usina_equipamentos
          const eqs = await fetchEquipamentosByUsinaId(usinaId)
          if (!cancelado) {
            setEquipamentosUsina(eqs || [])
          }
        } else if (os.cliente_id) {
          // Fallback quando não há usina vinculada à OS: carrega sistema legado
          fetchSistemaByClienteId(os.cliente_id)
            .then((sist) => {
              if (!cancelado) setSistema(sist)
            })
            .catch((e) => console.error('Erro ao carregar sistema:', e))

          import('@/services/crmService').then(({ fetchInversoresByClienteId }) => {
            fetchInversoresByClienteId(os.cliente_id)
              .then((invs) => {
                if (!cancelado) setInversoresLista(invs)
              })
              .catch((e) => console.warn('Erro ao carregar inversores da OS:', e))
          })
        }
      } catch (err) {
        console.warn('Erro ao carregar dados da usina na Ficha de OS:', err)
      } finally {
        if (!cancelado) setCarregandoUsina(false)
      }
    }

    carregarDadosUsinaOuCliente()

    return () => {
      cancelado = true
    }
  }, [os.usina_id, os.expand?.usina_id, os.cliente_id])

  // Procedimentos do catálogo de atividades
  useEffect(() => {
    // Buscar procedimentos técnicos padrão no Catálogo de Atividades (tipos_atividades_custom)
    setLoadingCatalogo(true)
    import('@/services/crmService')
      .then(({ fetchTiposAtividadesCustom }) => fetchTiposAtividadesCustom())
      .then((tipos) => {
        const tipoNome = (os.tipo_servico || '').toLowerCase()
        const match = (tipos || []).find((t) => {
          const n = (t.nome || '').toLowerCase()
          return (
            n.includes(tipoNome) ||
            tipoNome.includes(n) ||
            (tipoNome === 'limpeza' && n.includes('lavagem')) ||
            (tipoNome === 'manutenção' && (n.includes('manutenção') || n.includes('revisão'))) ||
            (tipoNome === 'configuração de datalogger' &&
              (n.includes('datalogger') || n.includes('configuração')))
          )
        })
        if (match?.orientacoes_tecnicas) {
          setOrientacoesCatalogo(match.orientacoes_tecnicas)
          // Se as instruções da OS estiverem vazias, preenche com as orientações do catálogo
          setInstrucoesTexto((prev) =>
            prev && prev.trim() ? prev : match.orientacoes_tecnicas || '',
          )
        }
      })
      .catch((err) => console.warn('Erro ao buscar orientações do catálogo:', err))
      .finally(() => setLoadingCatalogo(false))
  }, [os.cliente_id, os.tipo_servico])

  // Reabrir Ordem de Serviço (apenas Admin)
  const handleReabrirOS = async () => {
    if (!isAdmin) return
    setIsReabrindo(true)
    try {
      const updated = await updateOrdemServico(os.id, {
        status: 'pendente',
        concluida_em: null as unknown as string,
      })
      onOSUpdated(updated)
      toast({
        title: 'Ordem de Serviço Reaberta! 🔄',
        description: `OS #${os.id.slice(-6).toUpperCase()} retornou ao status Pendente.`,
      })
    } catch (err) {
      console.error('Erro ao reabrir OS:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao reabrir OS',
        description: 'Não foi possível reabrir a ordem de serviço.',
      })
    } finally {
      setIsReabrindo(false)
    }
  }

  // Envio de WhatsApp para o cliente da OS
  const nomeInstalador = userProfile?.name || os.atribuida_a || 'Instalador'
  const telefoneAutoritativoCliente = cliente?.whatsapp || cliente?.telefone || ''
  const mensagemInicialCliente = `Olá, aqui é ${nomeInstalador} da Delfos Solar. Estou entrando em contato referente à sua Ordem de Serviço (${os.tipo_servico}).`

  const handleConfirmarEnvioWhatsAppCliente = async ({
    telefone,
    mensagem,
  }: {
    telefone: string
    mensagem: string
  }) => {
    try {
      const res = await sendWhatsAppMessage({
        cliente_id: cliente?.id || os.cliente_id,
        telefone_destino: telefone,
        conteudo_final: mensagem,
        tipo_disparo: 'manual',
        referencia_id: os.id,
      })
      if (res && res.sent === false) {
        return {
          ok: false,
          sent: false,
          message: res.message || 'Falha no envio Z-API',
        }
      }
      return {
        ok: true,
        sent: true,
        message: 'Mensagem enviada com sucesso ao cliente!',
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        sent: false,
        error: msg,
      }
    }
  }

  // Navegação no Google Maps e Waze
  const enderecoCompleto = [os.endereco || cliente?.endereco, cliente?.cidade]
    .filter(Boolean)
    .join(' - ')

  const handleAbrirGoogleMaps = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!enderecoCompleto) return
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const handleAbrirWaze = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!enderecoCompleto) return
    const query = encodeURIComponent(enderecoCompleto)
    const fallbackUrl = `https://waze.com/ul?q=${query}&navigate=yes`

    // Tenta abrir o app nativo no celular via waze://; se o navegador bloquear ou não tiver o app, abre o link web
    const win = window.open(`waze://?q=${query}&navigate=yes`, '_blank', 'noopener,noreferrer')
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // Iniciar Atendimento da OS
  const [isIniciando, setIsIniciando] = useState(false)
  const handleIniciarAtendimento = async () => {
    setIsIniciando(true)
    try {
      const horaInicio = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const carimbo = `[INÍCIO DO ATENDIMENTO: ${new Date().toLocaleDateString('pt-BR')} às ${horaInicio}]\n`
      const novosDetalhes = detalhesExecucao
        ? `${carimbo}${detalhesExecucao}`
        : `${carimbo}Atendimento iniciado em campo pelo prestador.`

      // Marca o primeiro item do checklist (ex: "Chegou no local da usina")
      const updatedChecklist = checklist.map((item, idx) =>
        idx === 0 ? { ...item, concluido: true } : item,
      )

      const updated = await updateOrdemServico(os.id, {
        detalhes_execucao: novosDetalhes,
        checklist: updatedChecklist,
      })

      setDetalhesExecucao(novosDetalhes)
      setChecklist(updatedChecklist)
      setOsEmAndamento(true)
      onOSUpdated(updated)
      toast({
        title: 'Atendimento Iniciado! ⏱️',
        description: `OS #${os.id.slice(-6).toUpperCase()} marcada como em andamento às ${horaInicio}.`,
      })
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar atendimento',
        description: 'Tente novamente.',
      })
    } finally {
      setIsIniciando(false)
    }
  }

  // Toggle de item do checklist
  const handleToggleChecklist = (id: string) => {
    if (!podeEditarOS) return // leitura se concluída e não-admin
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, concluido: !item.concluido } : item)),
    )
  }

  // Upload/Captura de fotos
  const handlePhotoCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const added: { file: File; previewUrl: string }[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const previewUrl = URL.createObjectURL(file)
      added.push({ file, previewUrl })
    }

    setNovasFotos((prev) => [...prev, ...added])
    toast({
      title: `${added.length} foto(s) capturada(s)!`,
      description: 'As fotos serão anexadas à Ordem de Serviço.',
    })
    // limpa o input para permitir capturar a mesma foto de novo se quiser
    e.target.value = ''
  }

  const handleRemoverNovaFoto = (index: number) => {
    setNovasFotos((prev) => {
      const target = prev[index]
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  // Salvar rascunho / alterações intermediárias
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const handleSalvarRascunho = async () => {
    setIsSavingDraft(true)
    try {
      const filesToUpload = novasFotos.map((nf) => nf.file)
      const targetInstalador = instaladores.find((i) => i.id === responsavelId)
      const payload: Partial<OrdemServico> = {
        instrucoes: instrucoesTexto,
        checklist,
        detalhes_execucao: detalhesExecucao,
      }
      if (isAdmin && responsavelId !== os.responsavel_usuario_id) {
        payload.responsavel_usuario_id = responsavelId
        payload.atribuida_a = targetInstalador ? targetInstalador.name : ''
      }

      const updated = await updateOrdemServico(
        os.id,
        payload,
        filesToUpload.length > 0 ? filesToUpload : undefined,
      )
      setFotosSalvas(updated.fotos || [])
      setNovasFotos([])
      onOSUpdated(updated)
      toast({
        title: 'Progresso salvo!',
        description: 'Os dados da OS foram atualizados com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao salvar rascunho:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as alterações da OS.',
      })
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Resolução de inversores e módulos para exibição compacta no cabeçalho verde
  // Prioridade: usina_equipamentos da usina vinculada; fallback: campos diretos da usina ou cliente
  const inversoresUsina = React.useMemo(() => {
    const list = equipamentosUsina.filter((ue) => ue.expand?.equipamento_id?.tipo === 'inversor')
    if (list.length > 0) {
      return list.map((ue) => {
        const eq = ue.expand!.equipamento_id!
        const datasheetUrl =
          (eq.datasheet_pdf ? pb.files.getURL(eq, eq.datasheet_pdf) : null) ||
          eq.datasheet_url ||
          usinaVinculada?.datasheet_inversor_url ||
          null
        const dataloggerUrl =
          eq.datalogger_url ||
          usinaVinculada?.monitoramento_datalogger_url ||
          cliente?.monitoramento_datalogger_url ||
          null

        return {
          id: ue.id,
          marca: eq.marca,
          modelo: eq.modelo,
          potencia_w: eq.potencia_w,
          quantidade: ue.quantidade || 1,
          numero_serie: ue.numero_serie,
          datasheetUrl,
          dataloggerUrl,
        }
      })
    }

    // Se não há usina_equipamentos, olha campos da usina vinculada
    if (usinaVinculada?.fabricante_inversores || usinaVinculada?.modelo_inversores) {
      const dataloggerUrl =
        usinaVinculada.monitoramento_datalogger_url || cliente?.monitoramento_datalogger_url || null
      return [
        {
          id: 'usina-inv-1',
          marca: usinaVinculada.fabricante_inversores || '',
          modelo: usinaVinculada.modelo_inversores || '',
          potencia_w: usinaVinculada.potencia_pico_inversores_kwp
            ? usinaVinculada.potencia_pico_inversores_kwp * 1000
            : undefined,
          quantidade: 1,
          numero_serie: undefined,
          datasheetUrl: usinaVinculada.datasheet_inversor_url || null,
          dataloggerUrl,
        },
      ]
    }

    // Fallback legado do cliente
    if (inversoresLista.length > 0) {
      return inversoresLista.map((i, idx) => ({
        id: `legacy-${idx}`,
        marca: i.marca_inversor || '',
        modelo: i.modelo_inversor || '',
        potencia_w: undefined,
        quantidade: 1,
        numero_serie: undefined,
        datasheetUrl: null,
        dataloggerUrl: cliente?.monitoramento_datalogger_url || null,
      }))
    }

    if (cliente?.inversor_marca || cliente?.inversor_modelo) {
      return [
        {
          id: 'cli-inv-1',
          marca: cliente.inversor_marca || '',
          modelo: cliente.inversor_modelo || '',
          potencia_w: undefined,
          quantidade: 1,
          numero_serie: undefined,
          datasheetUrl: null,
          dataloggerUrl: cliente?.monitoramento_datalogger_url || null,
        },
      ]
    }

    return []
  }, [equipamentosUsina, usinaVinculada, cliente, inversoresLista])

  const modulosUsina = React.useMemo(() => {
    const list = equipamentosUsina.filter((ue) => ue.expand?.equipamento_id?.tipo === 'modulo_fv')
    if (list.length > 0) {
      return list.map((ue) => {
        const eq = ue.expand!.equipamento_id!
        const datasheetUrl =
          (eq.datasheet_pdf ? pb.files.getURL(eq, eq.datasheet_pdf) : null) ||
          eq.datasheet_url ||
          usinaVinculada?.datasheet_modulo_url ||
          null

        return {
          id: ue.id,
          marca: eq.marca,
          modelo: eq.modelo,
          potencia_w: eq.potencia_w,
          quantidade: ue.quantidade || 0,
          datasheetUrl,
        }
      })
    }

    if (
      usinaVinculada?.fabricante_modulos ||
      usinaVinculada?.modelo_modulos ||
      usinaVinculada?.quantidade_placas ||
      usinaVinculada?.qtd_modulos
    ) {
      return [
        {
          id: 'usina-mod-1',
          marca: usinaVinculada.fabricante_modulos || usinaVinculada.marca_placas || '',
          modelo: usinaVinculada.modelo_modulos || '',
          potencia_w: undefined,
          quantidade: usinaVinculada.quantidade_placas || usinaVinculada.qtd_modulos || 0,
          datasheetUrl: usinaVinculada.datasheet_modulo_url || null,
        },
      ]
    }

    if (cliente?.placas_marca || cliente?.placas_qtd) {
      return [
        {
          id: 'cli-mod-1',
          marca: cliente.placas_marca || '',
          modelo: '',
          potencia_w: undefined,
          quantidade: cliente.placas_qtd || 0,
          datasheetUrl: null,
        },
      ]
    }

    return []
  }, [equipamentosUsina, usinaVinculada, cliente])

  // Finalizar OS com geração automática de Relatório em PDF
  const handleFinalizarOS = async () => {
    setIsSubmitting(true)
    try {
      const filesToUpload = novasFotos.map((nf) => nf.file)

      // Geração automática do PDF do relatório (não bloqueante caso ocorra falha na renderização)
      let relatorioPdfFile: File | undefined = undefined
      try {
        const { gerarPdfRelatorioOS } = await import('@/lib/relatorioOSPdf')
        const inversoresStr =
          inversoresUsina.length > 0
            ? inversoresUsina
                .map((i) => `${i.marca || ''} ${i.modelo || ''}`.trim())
                .filter(Boolean)
                .join(', ')
            : inversoresLista.length > 0
              ? inversoresLista
                  .map((i) => `${i.marca_inversor || ''} ${i.modelo_inversor || ''}`.trim())
                  .filter(Boolean)
                  .join(', ')
              : undefined

        const osAtualizadaParaPdf: OrdemServico = {
          ...os,
          checklist,
          detalhes_execucao: detalhesExecucao,
          concluida_em: new Date().toISOString(),
          status: 'concluida',
        }

        const pdfResult = await gerarPdfRelatorioOS(osAtualizadaParaPdf, {
          cliente,
          sistema,
          newPhotos: filesToUpload,
          inversoresInfo: inversoresStr,
        })
        if (pdfResult?.file) {
          relatorioPdfFile = pdfResult.file
        }
      } catch (pdfErr) {
        console.warn(
          'Geração do PDF automático falhou, concluindo OS sem anexo do relatório:',
          pdfErr,
        )
      }

      const finalized = await finalizarOrdemServico(os.id, {
        checklist,
        detalhes_execucao: detalhesExecucao,
        newPhotos: filesToUpload.length > 0 ? filesToUpload : undefined,
        relatorioPdfFile,
        cliente_id: os.cliente_id,
        tipo_servico: os.tipo_servico,
        tecnico_nome: os.atribuida_a,
      })

      setShowConfirmModal(false)
      toast({
        title: 'OS Finalizada com Sucesso! 🎉',
        description: relatorioPdfFile
          ? 'Ordem concluída e Relatório em PDF gerado automaticamente para o Administrador.'
          : 'Ordem de serviço marcada como concluída e registrada no histórico.',
      })
      onOSFinalizada(finalized)
    } catch (err) {
      console.error('Erro ao finalizar OS:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao finalizar OS',
        description: 'Ocorreu um erro ao concluir a OS. Tente novamente.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Indicador de progresso do checklist
  const totalItens = checklist.length
  const concluidosCount = checklist.filter((c) => c.concluido).length
  const progressoPct = totalItens > 0 ? Math.round((concluidosCount / totalItens) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-24">
      {/* Barra de Navegação Superior Sticky da Ficha (compacta, sem espaço extra) */}
      <div className="bg-white rounded-xl px-3 py-2 border border-gray-200 shadow-2xs flex items-center justify-between sticky top-0 z-20">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Voltar para Lista"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-2">
          {os.status === 'concluida' && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-2 py-0.5 text-[11px]">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
              OS Concluída
            </Badge>
          )}
        </div>
      </div>

      {/* Cabeçalho Verde da OS (comprimido em poucas linhas) */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 text-white rounded-xl p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-2">
          {/* Linha 1: Tag OS + Data Agendada */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-white/10 px-2 py-0.5 rounded">
              OS #{os.id.slice(-6).toUpperCase()} • {os.tipo_servico}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-100 bg-black/20 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>
                Agendada: <strong>{formatDateTime(os.data_agendada)}</strong>
              </span>
            </div>
          </div>

          {/* Linha 2: Nome do cliente + Telefone em linha única + Botão Whats só de ícone */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                {cliente?.nome || cliente?.razao_social || 'Cliente Solar'}
              </h2>

              {telefoneAutoritativoCliente && (
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-100 bg-white/10 px-2 py-0.5 rounded-md">
                  <Phone className="w-3 h-3 text-emerald-300 shrink-0" />
                  <span className="font-medium">{telefoneAutoritativoCliente}</span>
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setModalWhatsAppClienteAberto(true)}
                          className="w-5 h-5 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Conversar no WhatsApp"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Conversar com o cliente no WhatsApp
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>

            {/* Select compacto do Responsável com ícone de enviar OS por WhatsApp ao lado */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isAdmin ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-200 bg-white/10 px-2 py-1 rounded-lg">
                  <User className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="font-medium text-[11px] text-emerald-100 shrink-0 hidden sm:inline">
                    Resp:
                  </span>
                  <select
                    value={responsavelId}
                    onChange={(e) => setResponsavelId(e.target.value)}
                    disabled={!podeEditarOS}
                    className="bg-emerald-950/90 border border-emerald-600 text-white text-[11px] rounded px-1.5 py-0.5 max-w-[150px] sm:max-w-[180px] focus:outline-hidden disabled:opacity-60"
                  >
                    <option value="">-- Não atribuído --</option>
                    {instaladores.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>

                  <BotaoEnviarOSWhatsApp
                    osId={os.id}
                    responsavelNome={
                      instaladores.find((i) => i.id === responsavelId)?.name ||
                      os.atribuida_a ||
                      os.expand?.responsavel_usuario_id?.name
                    }
                    responsavelTelefone={
                      instaladores.find((i) => i.id === responsavelId)?.phone ||
                      os.expand?.responsavel_usuario_id?.phone
                    }
                    responsavelId={responsavelId || os.responsavel_usuario_id}
                    size="icon"
                    variant="ghost"
                    showLabel={false}
                    className="h-6 w-6 p-0 rounded-sm bg-emerald-600/80 hover:bg-emerald-500 text-white border-0"
                  />
                </div>
              ) : (
                os.atribuida_a && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-200 bg-white/10 px-2 py-0.5 rounded">
                    <User className="w-3 h-3 text-emerald-300" />
                    <span>{os.atribuida_a}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Linha 3: Endereço compactado com ícones de Maps e Waze */}
          <div className="flex items-center justify-between gap-2 text-xs text-emerald-100 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span
                className="truncate text-[11px]"
                title={enderecoCompleto || 'Endereço não informado'}
              >
                {os.endereco ||
                  usinaVinculada?.endereco ||
                  cliente?.endereco ||
                  'Endereço não informado'}
                {cliente?.cidade ? ` - ${cliente.cidade}` : ''}
              </span>
            </div>

            {enderecoCompleto && (
              <div className="flex items-center gap-1 shrink-0">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleAbrirGoogleMaps}
                        className="h-6 px-1.5 inline-flex items-center gap-1 rounded bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                        aria-label="Abrir no Google Maps"
                      >
                        <MapPin className="w-3 h-3 text-emerald-300" />
                        <span>Maps</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Abrir endereço no Google Maps
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleAbrirWaze}
                        className="h-6 px-1.5 inline-flex items-center gap-1 rounded bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                        aria-label="Abrir no Waze"
                      >
                        <Navigation className="w-3 h-3 text-sky-300" />
                        <span>Waze</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Abrir rota no Waze
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {/* Linha 4: Dados técnicos comprimidos da usina (Inversor + Links Datasheet/Datalogger + Módulos) */}
          <div className="bg-emerald-950/70 border border-emerald-700/60 rounded-lg p-2 text-xs space-y-1.5">
            {/* Inversores */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                  Inversor:
                </span>
                {inversoresUsina.length > 0 ? (
                  inversoresUsina.map((inv, idx) => (
                    <div key={inv.id || idx} className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-white text-xs">
                        {inv.quantidade > 1 ? `${inv.quantidade}x ` : ''}
                        {[inv.marca, inv.modelo].filter(Boolean).join(' ') || 'Inversor Solar'}
                        {inv.potencia_w ? ` (${(inv.potencia_w / 1000).toFixed(1)} kW)` : ''}
                      </span>
                      {inv.numero_serie && (
                        <span className="text-[10px] text-emerald-300 bg-white/10 px-1 rounded">
                          SN: {inv.numero_serie}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-emerald-200/80 text-[11px]">
                    {carregandoUsina ? 'Carregando...' : 'Nenhum inversor vinculado'}
                  </span>
                )}
              </div>

              {/* Links clicáveis de Datasheet do Inversor e Configuração do Datalogger */}
              <div className="flex items-center gap-2 flex-wrap pl-0 sm:pl-1">
                {inversoresUsina.map((inv, idx) => (
                  <React.Fragment key={`links-${inv.id || idx}`}>
                    {inv.datasheetUrl && (
                      <a
                        href={inv.datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-200 hover:text-white underline decoration-emerald-400 underline-offset-2 hover:decoration-white transition-colors"
                        title="Ver Datasheet do Inversor (PDF)"
                      >
                        <FileCode2 className="w-3 h-3 text-emerald-300" />
                        <span>Datasheet Inversor</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    )}
                    {inv.dataloggerUrl && (
                      <a
                        href={inv.dataloggerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-amber-200 hover:text-white underline decoration-amber-400 underline-offset-2 hover:decoration-white transition-colors"
                        title="Abrir página/tutorial de Configuração do Datalogger"
                      >
                        <Wifi className="w-3 h-3 text-amber-300" />
                        <span>Configurar Datalogger</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    )}
                  </React.Fragment>
                ))}

                {/* Caso o link de datalogger venha da usina/cliente mas nenhum inversor tenha o link específico */}
                {!inversoresUsina.some((i) => i.dataloggerUrl) &&
                  (usinaVinculada?.monitoramento_datalogger_url ||
                    cliente?.monitoramento_datalogger_url) && (
                    <a
                      href={
                        usinaVinculada?.monitoramento_datalogger_url ||
                        cliente?.monitoramento_datalogger_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-200 hover:text-white underline decoration-amber-400 underline-offset-2 hover:decoration-white transition-colors"
                      title="Abrir link de configuração do datalogger"
                    >
                      <Wifi className="w-3 h-3 text-amber-300" />
                      <span>Configurar Datalogger</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  )}
              </div>
            </div>

            {/* Módulos */}
            <div className="flex items-center gap-1.5 flex-wrap border-t border-emerald-800/60 pt-1">
              <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                Módulos:
              </span>
              {modulosUsina.length > 0 ? (
                modulosUsina.map((mod, idx) => (
                  <div key={mod.id || idx} className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-white text-xs">
                      {mod.quantidade ? `${mod.quantidade}x ` : ''}
                      {[mod.marca, mod.modelo].filter(Boolean).join(' ') || 'Módulos Fotovoltaicos'}
                      {mod.potencia_w ? ` (${mod.potencia_w}W)` : ''}
                    </span>
                    {mod.datasheetUrl && (
                      <a
                        href={mod.datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-200 hover:text-white underline decoration-emerald-400 underline-offset-2 transition-colors ml-1"
                        title="Ver Datasheet do Módulo (PDF)"
                      >
                        <FileCode2 className="w-3 h-3 text-emerald-300" />
                        <span>Datasheet Módulo</span>
                        <ExternalLink className="w-2 h-2 opacity-70" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <span className="text-emerald-200/80 text-[11px]">
                  {carregandoUsina ? 'Carregando...' : 'Nenhum módulo vinculado'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROCEDIMENTOS DE TRABALHO PADRÃO & INSTRUÇÕES (Vindos do Catálogo de Atividades) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            2. Procedimentos de Trabalho Padrão & Orientações Técnicas
          </h3>
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
            {os.tipo_servico}
          </span>
        </div>

        {orientacoesCatalogo && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Procedimento Padrão Cadastrado no Catálogo:</span>
            </div>
            <p className="text-xs text-emerald-950 whitespace-pre-line leading-relaxed font-sans">
              {orientacoesCatalogo}
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500 leading-relaxed">
          Instruções específicas para esta ordem de serviço. O prestador pode consultar ou
          complementar abaixo:
        </p>

        <Textarea
          value={instrucoesTexto}
          onChange={(e) => setInstrucoesTexto(e.target.value)}
          disabled={!podeEditarOS}
          placeholder="Procedimentos e orientações técnicas do serviço..."
          className="min-h-[130px] text-xs sm:text-sm bg-gray-50/70 border-gray-200 rounded-xl leading-relaxed p-3.5 focus:bg-white resize-y font-mono disabled:opacity-75 disabled:cursor-not-allowed"
        />
      </div>

      {/* 3. CHECKLIST DE EXECUÇÃO */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              3. Checklist de Execução
            </h3>
          </div>
          <span className="text-xs font-bold text-gray-600">
            {concluidosCount} de {totalItens} concluídos ({progressoPct}%)
          </span>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progressoPct === 100 ? 'bg-emerald-600' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressoPct}%` }}
          />
        </div>

        {/* Lista de Itens do Checklist com Botões Grandes para Toque Mobile */}
        <div className="space-y-2">
          {checklist.map((item, index) => {
            const isChecked = item.concluido
            return (
              <button
                key={item.id || index}
                type="button"
                onClick={() => handleToggleChecklist(item.id)}
                disabled={!podeEditarOS}
                className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center gap-3.5 select-none ${
                  !podeEditarOS ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                } ${
                  isChecked
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold shadow-2xs'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    isChecked
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-2xs'
                      : 'bg-white border-gray-300 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <span
                  className={`text-xs sm:text-sm flex-1 ${isChecked ? 'line-through text-gray-600' : ''}`}
                >
                  {item.item}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. FOTOS DO SERVIÇO COM BOTÕES GRANDES PARA CÂMERA */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              4. Fotos do Serviço em Campo
            </h3>
          </div>
          <span className="text-xs text-gray-500">
            {fotosSalvas.length + novasFotos.length} foto(s) anexada(s)
          </span>
        </div>

        {/* Botões de Ação para Fotos */}
        {podeEditarOS && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Input nativo com capture="environment" para abrir câmera traseira no smartphone */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handlePhotoCaptured}
            />

            <Button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="h-10 px-3.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white font-semibold text-xs sm:text-sm shadow-2xs flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Tirar foto (câmera)</span>
            </Button>

            {/* Input alternativo para seleção de fotos da galeria */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoCaptured}
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-3.5 rounded-xl border-gray-300 hover:border-emerald-600 hover:bg-emerald-50 text-gray-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <Upload className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Escolher da galeria</span>
            </Button>
          </div>
        )}

        {/* Grade de Fotos (Salvas + Novas) */}
        {fotosSalvas.length > 0 || novasFotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {/* Fotos já persistidas no PocketBase */}
            {fotosSalvas.map((fotoNome, idx) => {
              const fileUrl = pb.files.getURL(os, fotoNome)
              return (
                <div
                  key={`saved-${idx}`}
                  className="relative group rounded-xl overflow-hidden aspect-square border border-gray-200 bg-gray-100 shadow-2xs"
                >
                  <img
                    src={fileUrl}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                  >
                    Ver foto
                  </a>
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    Salva
                  </span>
                </div>
              )
            })}

            {/* Novas Fotos da Sessão */}
            {novasFotos.map((nf, idx) => (
              <div
                key={`new-${idx}`}
                className="relative group rounded-xl overflow-hidden aspect-square border-2 border-emerald-500 bg-gray-100 shadow-2xs"
              >
                <img
                  src={nf.previewUrl}
                  alt={`Nova foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoverNovaFoto(idx)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors"
                  title="Remover foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Nova
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center p-4">
            <ImageIcon className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-gray-600">
              Nenhuma foto anexada ainda
            </p>
            <p className="text-[11px] text-gray-400 max-w-xs mt-0.5">
              Utilize o botão acima para tirar fotos das placas, inversores, conexões e instalações.
            </p>
          </div>
        )}
      </div>

      {/* 5. DETALHES DA EXECUÇÃO */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            5. Detalhes da Execução & Observações Técnicas
          </h3>
          <span className="text-[11px] text-gray-400">{detalhesExecucao.length} caracteres</span>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Descreva o que foi realizado em campo, problemas ou anomalias encontradas, medições
          elétricas, peças trocadas ou recomendações para o cliente:
        </p>

        <Textarea
          value={detalhesExecucao}
          onChange={(e) => setDetalhesExecucao(e.target.value)}
          disabled={!podeEditarOS}
          placeholder="Ex: Realizada lavagem de 30 placas com água deionizada. Medições de Voc em 385V string 1 e 390V string 2. Inversor operando com geração nominal de 11.8 kW. Nenhum hotspot detectado na termografia..."
          className="min-h-[130px] text-xs sm:text-sm bg-gray-50/70 border-gray-200 rounded-xl leading-relaxed p-3.5 focus:bg-white resize-y disabled:opacity-75 disabled:cursor-not-allowed"
        />
      </div>

      {/* Banner de Aviso de Somente Leitura pós-conclusão para Não-Admin */}
      {os.status === 'concluida' && !isAdmin && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-slate-900 block">
              Ordem de Serviço Concluída (Modo Leitura)
            </span>
            <span>
              Esta OS foi finalizada e os campos foram bloqueados para edição. Apenas
              administradores podem reabri-la.
            </span>
          </div>
        </div>
      )}

      {/* 6. BOTÃO DE AÇÃO: FINALIZAR OS, SALVAR RASCUNHO OU REABRIR */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {os.status !== 'concluida' ? (
            <>
              {!osEmAndamento ? (
                <Button
                  type="button"
                  onClick={handleIniciarAtendimento}
                  disabled={isIniciando || isSubmitting}
                  className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 transition-transform active:scale-[0.98]"
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>{isIniciando ? 'Iniciando...' : 'Iniciar atendimento'}</span>
                </Button>
              ) : (
                <div className="inline-flex items-center gap-1.5 h-10 sm:h-11 px-2.5 sm:px-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 shrink-0">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Em Andamento</span>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleSalvarRascunho}
                disabled={isSavingDraft || isSubmitting}
                className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl border-gray-300 font-semibold text-xs sm:text-sm shrink"
              >
                {isSavingDraft ? 'Salvando...' : 'Salvar'}
              </Button>

              <Button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSubmitting || isSavingDraft}
                className="flex-1 h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white font-semibold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 sm:gap-2 transition-transform active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>Concluir OS</span>
              </Button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-xs sm:text-sm font-bold text-emerald-800 flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  OS finalizada em{' '}
                  {os.concluida_em ? formatDateTime(os.concluida_em) : 'data anterior'}.
                </span>
                {os.relatorio_pdf && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] shrink-0">
                    PDF Gerado
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Apenas Admin pode reabrir a OS concluída ou salvar alterações */}
                {isAdmin && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSalvarRascunho}
                      disabled={isSavingDraft}
                      className="rounded-xl h-10 px-3 text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                    >
                      {isSavingDraft ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleReabrirOS}
                      disabled={isReabrindo}
                      className="rounded-xl h-10 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isReabrindo ? 'Reabrindo...' : 'Reabrir Ordem de Serviço'}</span>
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="rounded-xl h-10 px-4 text-xs font-semibold"
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Envio Direto via WhatsApp para o Cliente da OS */}
      <ModalConfirmarEnvioWhatsApp
        isOpen={modalWhatsAppClienteAberto}
        onClose={() => setModalWhatsAppClienteAberto(false)}
        titulo="Enviar mensagem WhatsApp ao Cliente"
        subtitulo={`Comunicação referente à OS #${os.id.slice(-6).toUpperCase()} (${os.tipo_servico}).`}
        destinatarioNome={cliente?.nome || cliente?.razao_social || 'Cliente Solar'}
        telefoneInicial={telefoneAutoritativoCliente}
        mensagemInicial={mensagemInicialCliente}
        telefoneReadOnly={!isAdmin}
        onConfirmarEnvio={handleConfirmarEnvioWhatsAppCliente}
        confirmLabel="Enviar WhatsApp ao Cliente"
      />

      {/* Modal de Confirmação de Finalização */}
      {showConfirmModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setShowConfirmModal(false)
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-200 space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Confirmar Finalização da OS?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ao finalizar, a ordem sairá da lista de pendências e será arquivada como concluída,
                gerando um registro automático na Linha do Tempo do cliente.
              </p>
            </div>

            {/* Alerta se o checklist não estiver 100% */}
            {progressoPct < 100 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Atenção: Apenas{' '}
                  <strong>
                    {concluidosCount} de {totalItens}
                  </strong>{' '}
                  itens do checklist foram marcados como concluídos.
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-xl text-xs sm:text-sm font-semibold"
              >
                Revisar OS
              </Button>
              <Button
                type="button"
                onClick={handleFinalizarOS}
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white font-black text-xs sm:text-sm shadow-sm"
              >
                {isSubmitting ? 'Finalizando...' : 'Sim, Finalizar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
