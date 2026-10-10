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
import type { UsinaEquipamentoAtivo, ConfiguracaoMonitoramento } from '@/types/equipamentos'
import {
  fetchConfiguracoesMonitoramento,
  sugerirConfiguracaoPorMarca,
} from '@/services/configuracoesMonitoramentoService'
import { MonitoramentoConfigBadge } from '@/components/MonitoramentoConfigBadge'
import { SecaoDocumentosUsina } from '@/components/SecaoDocumentosUsina'
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
  Save,
  Loader2,
  Send,
} from 'lucide-react'
import { ModalEnviarRelatorioCliente } from '@/components/ModalEnviarRelatorioCliente'
import { RelatorioOSConteudo } from '@/components/RelatorioOSConteudo'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/formatters'
import { updateAtividade } from '@/services/crmService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import {
  somarMinutos,
  calcularDiferencaMinutos,
  formatarDuracao as formatarDuracaoOriginal,
  HORAS_24,
  MINUTOS_PASSO_5,
  DURACOES_PREVISTAS_SUGESTOES,
} from '@/lib/horarios'

/**
 * Utilitário seguro para horario: aceita qualquer tipo (número, objeto, nulo)
 * e devolve sempre uma string não vazia garantida no formato "HH:mm".
 */
export function safeHorarioStr(val: unknown, fallback = '08:00'): string {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed.length > 0 ? trimmed : fallback
  }
  if (typeof val === 'number' && !isNaN(val)) {
    const h = Math.floor(val)
    return `${String(h).padStart(2, '0')}:00`
  }
  try {
    const str = String(val).trim()
    return str.length > 0 ? str : fallback
  } catch {
    return fallback
  }
}

/**
 * Wrapper de formatação de duração com validação numérica explícita.
 */
export function formatarDuracao(duracaoMinutos?: unknown): string {
  const num = Number(duracaoMinutos)
  if (duracaoMinutos === null || duracaoMinutos === undefined || isNaN(num) || num <= 0) {
    return '0min'
  }
  return formatarDuracaoOriginal(num)
}
import {
  isCategoriaManutencaoOuAdministrativa,
  MSG_USINA_OBRIGATORIA,
  getTipoAtividadeConfig,
  ATIVIDADES_PADRAO,
  encontrarMatchTipoCustom,
} from '@/constants/atividadesTipos'
import { normalizeChecklist } from '@/components/CalendarioExecucaoOS'
import { fetchUsinasByClienteId } from '@/services/crmService'
import { Sun } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import type { SistemaUsuario } from '@/types/crm'
import { BotaoEnviarOSWhatsApp } from '@/components/BotaoEnviarOSWhatsApp'
import { ModalConfirmarEnvioWhatsApp } from '@/components/ModalConfirmarEnvioWhatsApp'
import { useClientes } from '@/contexts/ClientesContext'
import { MessageSquare, RotateCcw } from 'lucide-react'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatUtcToSaoPauloInput } from '@/lib/datetimeSaoPaulo'

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
  const [modalEnviarRelatorioClienteAberto, setModalEnviarRelatorioClienteAberto] = useState(false)
  const [modalVisualizarRelatorioAberto, setModalVisualizarRelatorioAberto] = useState(false)
  const [isReabrindo, setIsReabrindo] = useState(false)

  // Estado para admin reatribuir instalador direto na ficha
  const [responsavelId, setResponsavelId] = useState<string>(os.responsavel_usuario_id || '')

  // Se o item tem origem em 'atividades', estado dedicado para data/horário e responsável da atividade
  const isOrigemAtividades = os.origem === 'atividades'
  const isAutoLeituraOS =
    os?.tipo_servico === 'auto_leitura_rge' ||
    os?.tipo_servico === 'Auto Leitura – RGE' ||
    os?.tipo_servico === 'Auto Leitura - RGE' ||
    (os as any)?.tipo === 'auto_leitura_rge'
  const [atividadeDataHora, setAtividadeDataHora] = useState<string>(() => {
    const raw: any = os?.data_agendada
    if (!raw) return ''
    const spIso = formatUtcToSaoPauloInput(raw)
    if (spIso) return spIso
    const rawStr = String(raw).trim()
    if (rawStr.length >= 16) {
      return rawStr.replace(' ', 'T').slice(0, 16)
    }
    return rawStr
  })

  // Campos de início, fim e duração prevista para edição rápida de manutenção
  const [horarioInicio, setHorarioInicio] = useState<string>(() => {
    if (os?.horario_inicio) return safeHorarioStr(os.horario_inicio, '08:00')
    const raw: any = os?.data_agendada
    if (raw) {
      const spIso = formatUtcToSaoPauloInput(raw)
      if (spIso && spIso.length >= 16) {
        return spIso.slice(11, 16)
      }
      if (raw instanceof Date && !isNaN(raw.getTime())) {
        const h = String(raw.getHours()).padStart(2, '0')
        const min = String(raw.getMinutes()).padStart(2, '0')
        return `${h}:${min}`
      }
      const rawStr = String(raw).trim()
      if (rawStr.length >= 16) {
        return rawStr.replace(' ', 'T').slice(11, 16)
      }
    }
    return '08:00'
  })
  const [duracaoMinutos, setDuracaoMinutos] = useState<number>(() => {
    const raw: any = os?.duracao_minutos
    if (raw === null || raw === undefined || raw === '') return 60
    const num = Number(raw)
    if (!isNaN(num) && isFinite(num) && num > 0) {
      return Math.round(num)
    }
    return 60
  })
  const [horarioFim, setHorarioFim] = useState<string>(() => {
    if (os?.horario_fim) return safeHorarioStr(os.horario_fim, '09:00')
    let ini = '08:00'
    if (os?.horario_inicio) {
      ini = safeHorarioStr(os.horario_inicio, '08:00')
    } else if (os?.data_agendada) {
      const spIso = formatUtcToSaoPauloInput(os.data_agendada)
      if (spIso && spIso.length >= 16) {
        ini = spIso.slice(11, 16)
      } else {
        const rawData: any = os.data_agendada
        if (rawData instanceof Date && !isNaN(rawData.getTime())) {
          const h = String(rawData.getHours()).padStart(2, '0')
          const min = String(rawData.getMinutes()).padStart(2, '0')
          ini = `${h}:${min}`
        } else {
          const rawStr = String(rawData).trim()
          if (rawStr.length >= 16) {
            ini = rawStr.replace(' ', 'T').slice(11, 16)
          }
        }
      }
    }
    const rawDur: any = os?.duracao_minutos
    const numDur = rawDur !== null && rawDur !== undefined && rawDur !== '' ? Number(rawDur) : NaN
    const dur = !isNaN(numDur) && isFinite(numDur) && numDur > 0 ? Math.round(numDur) : 60
    return somarMinutos(ini, dur)
  })

  const [atividadeResponsavelId, setAtividadeResponsavelId] = useState<string>(
    os?.responsavel_usuario_id || '',
  )
  const [isSalvandoAtividade, setIsSalvandoAtividade] = useState(false)

  const cliente: Cliente | undefined = os?.expand?.cliente_id
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>(
    os.usina_id || (os.expand?.usina_id as any)?.id || '',
  )
  const [usinasDoCliente, setUsinasDoCliente] = useState<UsinaCliente[]>([])
  const [usinaVinculada, setUsinaVinculada] = useState<UsinaCliente | null>(() => {
    return (os.expand?.usina_id as UsinaCliente) || null
  })
  const [equipamentosUsina, setEquipamentosUsina] = useState<UsinaEquipamentoAtivo[]>([])
  const [carregandoUsina, setCarregandoUsina] = useState<boolean>(false)
  const [configuracoesMonitoramento, setConfiguracoesMonitoramento] = useState<
    ConfiguracaoMonitoramento[]
  >([])

  const [sistema, setSistema] = useState<Sistema | null>(null)
  const [inversoresLista, setInversoresLista] = useState<import('@/types/crm').ClienteInversor[]>(
    [],
  )

  // Procedimentos de trabalho padrão vindos do Catálogo de Atividades
  const [orientacoesCatalogo, setOrientacoesCatalogo] = useState<string>('')
  const [loadingCatalogo, setLoadingCatalogo] = useState<boolean>(false)

  // 2. Instruções / Procedimentos da OS
  const [instrucoesTexto, setInstrucoesTexto] = useState<string>(() => {
    if (os?.instrucoes && os.instrucoes.trim().length > 0) {
      return os.instrucoes
    }
    const matchingTemplate = (templates || []).find((t) => t?.tipo_servico === os?.tipo_servico)
    return matchingTemplate?.instrucoes || ''
  })

  // Status de execução em andamento (local ou salvo)
  const [osEmAndamento, setOsEmAndamento] = useState<boolean>(() => {
    const checklistFeitos = (os?.checklist ?? []).some((c) => Boolean(c?.concluido))
    return Boolean(
      checklistFeitos ||
      (os?.detalhes_execucao && os.detalhes_execucao.includes('[INÍCIO DO ATENDIMENTO]')),
    )
  })

  // 3. Checklist
  const [checklist, setChecklist] = useState<OSChecklistItem[]>(() => {
    const normalizado = normalizeChecklist(os?.checklist)
    if (normalizado && normalizado.length > 0) {
      return normalizado
    }
    return getDefaultChecklist(os?.tipo_servico || 'Manutenção')
  })

  // 4. Fotos: fotos já salvas (nomes em PB) + novas fotos capturadas na sessão
  const normalizarFotosIniciais = (fotosRaw: unknown): string[] => {
    if (Array.isArray(fotosRaw)) {
      return fotosRaw.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
    }
    if (typeof fotosRaw === 'string' && fotosRaw.trim().length > 0) {
      return [fotosRaw.trim()]
    }
    return []
  }

  const [fotosSalvas, setFotosSalvas] = useState<string[]>(() => normalizarFotosIniciais(os?.fotos))
  const [novasFotos, setNovasFotos] = useState<{ file: File; previewUrl: string }[]>([])

  // Sincronizar estado local de fotos salvas sempre que a OS recebida por props mudar (ou novo id)
  useEffect(() => {
    setFotosSalvas(normalizarFotosIniciais(os?.fotos))
  }, [os?.id, os?.fotos])

  // 5. Detalhes da execução
  const [detalhesExecucao, setDetalhesExecucao] = useState<string>(os.detalhes_execucao || '')

  // Confirmação de Finalização
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carrega lista de usinas do cliente para seleção/edição e validação de usina obrigatória
  useEffect(() => {
    let cancelado = false
    if (!os.cliente_id) {
      setUsinasDoCliente([])
      return
    }
    fetchUsinasByClienteId(os.cliente_id)
      .then((lista) => {
        if (!cancelado) {
          setUsinasDoCliente(lista || [])
          if (!selectedUsinaId && lista && lista.length === 1) {
            setSelectedUsinaId(lista[0].id)
          }
        }
      })
      .catch((err) => console.warn('Erro ao carregar usinas do cliente na Ficha de OS:', err))
    return () => {
      cancelado = true
    }
  }, [os.cliente_id, selectedUsinaId])

  // Determina se este item é manutenção ou administrativo exigindo usina obrigatória
  const isManutencaoOuAdmin = React.useMemo(() => {
    // 1. Pela categoria direta se existir
    const cat = (os as any)?.categoria || (os as any)?.categoria_id
    if (isCategoriaManutencaoOuAdministrativa(cat)) return true

    // 2. Se a origem for 'atividades', analisa pelo tipo_servico / tipo
    const tipoIdent = (os as any)?.tipo || os?.tipo_servico || ''
    const conf = getTipoAtividadeConfig(tipoIdent)
    if (isCategoriaManutencaoOuAdministrativa(conf?.categoria)) return true

    // 3. Checagem por tipo_servico nominal de OS comum
    const ts = (os?.tipo_servico || '').toLowerCase()
    if (
      ts.includes('manuten') ||
      ts.includes('limpeza') ||
      ts.includes('preventiva') ||
      ts.includes('corretiva') ||
      ts.includes('garantia') ||
      ts.includes('instala') ||
      ts.includes('datalogger') ||
      ts.includes('administrativ')
    ) {
      return true
    }

    return false
  }, [os])

  // Carrega dados da usina vinculada, equipamentos e catálogo de configurações de monitoramento
  useEffect(() => {
    let cancelado = false
    const usinaId = selectedUsinaId || os.usina_id || (os.expand?.usina_id as any)?.id

    async function carregarDadosUsinaOuCliente() {
      setCarregandoUsina(true)
      try {
        // Busca configurações de monitoramento em paralelo
        fetchConfiguracoesMonitoramento()
          .then((configs) => {
            if (!cancelado) setConfiguracoesMonitoramento(configs || [])
          })
          .catch((e) => console.warn('Erro ao carregar configurações de monitoramento:', e))

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

  // Procedimentos e checklist do catálogo de atividades
  useEffect(() => {
    // Buscar procedimentos técnicos padrão e checklist customizado no Catálogo de Atividades (tipos_atividades_custom)
    setLoadingCatalogo(true)
    import('@/services/crmService')
      .then(({ fetchTiposAtividadesCustom }) => fetchTiposAtividadesCustom())
      .then((tipos) => {
        const tiposList = Array.isArray(tipos) ? tipos : []

        // Resolução de match usando o helper canônico unificado
        const match = encontrarMatchTipoCustom(
          {
            tipo_custom_id: os.tipo_custom_id,
            tipo: os.tipo,
            tipo_servico: os.tipo_servico,
            categoria: (os as any).categoria,
          },
          tiposList,
        )

        if (match?.orientacoes_tecnicas) {
          setOrientacoesCatalogo(match.orientacoes_tecnicas)
          // Se as instruções da OS estiverem vazias, preenche com as orientações do catálogo
          setInstrucoesTexto((prev) =>
            prev && prev.trim() ? prev : match.orientacoes_tecnicas || '',
          )
        }

        // Resolução estrita do checklist:
        // (1) Se a OS já tem checklist salvo e preenchido, respeitar
        const checklistSalvo = os.checklist ? normalizeChecklist(os.checklist) : []
        if (checklistSalvo.length > 0) {
          setChecklist(checklistSalvo)
          return
        }

        // (2) Extrair checklist JSON do registro custom correspondente
        const checklistDoMatch = normalizeChecklist(match?.checklist)
        if (checklistDoMatch.length > 0) {
          setChecklist(checklistDoMatch)
          return
        }

        // (3) Fallback genérico SOMENTE se nada casar
        setChecklist(getDefaultChecklist((os.tipo_servico as any) || 'Manutenção'))
      })
      .catch((err) => console.warn('Erro ao buscar orientações do catálogo:', err))
      .finally(() => setLoadingCatalogo(false))
  }, [os.cliente_id, os.tipo_servico, os.tipo, os.tipo_custom_id, os.origem, os.checklist])

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
        description: `OS #${(os?.id || '').slice(-6).toUpperCase()} retornou ao status Pendente.`,
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

  // Navegação no Google Maps e Waze com suporte a coordenadas GPS da Usina / Cliente
  const SEDE_DELFOS = 'Rua Espírito Santo, 275, Erechim - RS, CEP 99709296'

  const enderecoCompleto = [
    os.endereco || usinaVinculada?.endereco || cliente?.usina_endereco || cliente?.endereco,
    usinaVinculada?.cidade || cliente?.cidade,
  ]
    .filter(Boolean)
    .join(' - ')

  // Coordenadas GPS prioritárias: usina vinculada -> cliente
  const latCoord =
    usinaVinculada?.latitude !== undefined &&
    usinaVinculada?.latitude !== null &&
    !isNaN(Number(usinaVinculada.latitude)) &&
    Number(usinaVinculada.latitude) !== 0
      ? Number(usinaVinculada.latitude)
      : cliente?.latitude !== undefined &&
          cliente?.latitude !== null &&
          !isNaN(Number(cliente.latitude)) &&
          Number(cliente.latitude) !== 0
        ? Number(cliente.latitude)
        : null

  const lngCoord =
    usinaVinculada?.longitude !== undefined &&
    usinaVinculada?.longitude !== null &&
    !isNaN(Number(usinaVinculada.longitude)) &&
    Number(usinaVinculada.longitude) !== 0
      ? Number(usinaVinculada.longitude)
      : cliente?.longitude !== undefined &&
          cliente?.longitude !== null &&
          !isNaN(Number(cliente.longitude)) &&
          Number(cliente.longitude) !== 0
        ? Number(cliente.longitude)
        : null

  const temCoordenadasGps = latCoord !== null && lngCoord !== null

  const handleTraçarRotaGPSUsina = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (temCoordenadasGps) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(SEDE_DELFOS)}&destination=${latCoord},${lngCoord}`
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    if (enderecoCompleto) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(SEDE_DELFOS)}&destination=${encodeURIComponent(enderecoCompleto)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    toast({
      variant: 'destructive',
      title: 'Destino não disponível',
      description: 'Esta OS não possui coordenadas GPS nem endereço cadastrado para traçar rota.',
    })
  }

  const handleAbrirGoogleMaps = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (temCoordenadasGps) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${latCoord},${lngCoord}`,
        '_blank',
        'noopener,noreferrer',
      )
      return
    }
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
        description: `OS #${(os?.id || '').slice(-6).toUpperCase()} marcada como em andamento às ${horaInicio}.`,
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
    if (isManutencaoOuAdmin && !selectedUsinaId?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Usina obrigatória',
        description: MSG_USINA_OBRIGATORIA,
      })
      return
    }

    setIsSavingDraft(true)
    try {
      const filesToUpload = novasFotos.map((nf) => nf.file)
      const targetInstalador = instaladores.find((i) => i.id === responsavelId)
      const payload: Partial<OrdemServico> = {
        instrucoes: instrucoesTexto,
        checklist,
        detalhes_execucao: detalhesExecucao,
        usina_id: selectedUsinaId || undefined,
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
      const fotosDoRetorno = normalizarFotosIniciais(updated.fotos)
      // Mesclar fotos salvas anteriores com as novas fotos retornadas pelo backend (garantindo unicidade)
      const fotosAtualizadas = Array.from(new Set([...fotosSalvas, ...fotosDoRetorno]))
      const updatedComFotos: OrdemServico = {
        ...updated,
        fotos: fotosAtualizadas.length > 0 ? fotosAtualizadas : fotosDoRetorno,
      }
      setFotosSalvas(updatedComFotos.fotos || [])
      setNovasFotos([])
      onOSUpdated(updatedComFotos)
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

  /**
   * Helper para resolver a configuração de monitoramento associada a um inversor.
   * Procura via expand.configuracao_monitoramento_id, ID direto ou correspondência inteligente por marca.
   */
  const encontrarConfigMonitoramentoInversor = (
    eq?: import('@/types/equipamentos').Equipamento | null,
    marcaFallback?: string,
  ): ConfiguracaoMonitoramento | null => {
    if (eq?.expand?.configuracao_monitoramento_id) {
      return eq.expand.configuracao_monitoramento_id
    }
    if (eq?.configuracao_monitoramento_id) {
      const encontradaPorId = configuracoesMonitoramento.find(
        (c) => c.id === eq.configuracao_monitoramento_id,
      )
      if (encontradaPorId) return encontradaPorId
    }
    const marcaAlvo = (eq?.marca || marcaFallback || '').trim()
    if (!marcaAlvo) return null
    return sugerirConfiguracaoPorMarca(marcaAlvo, configuracoesMonitoramento)
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

        const configMonitoramento = encontrarConfigMonitoramentoInversor(eq, eq.marca)

        return {
          id: ue.id,
          marca: eq.marca,
          modelo: eq.modelo,
          potencia_w: eq.potencia_w,
          quantidade: ue.quantidade || 1,
          numero_serie: ue.numero_serie,
          datasheetUrl,
          dataloggerUrl,
          configMonitoramento,
        }
      })
    }

    // Se não há usina_equipamentos, olha campos da usina vinculada
    if (usinaVinculada?.fabricante_inversores || usinaVinculada?.modelo_inversores) {
      const dataloggerUrl =
        usinaVinculada.monitoramento_datalogger_url || cliente?.monitoramento_datalogger_url || null
      const marca = usinaVinculada.fabricante_inversores || ''
      const configMonitoramento = encontrarConfigMonitoramentoInversor(null, marca)
      return [
        {
          id: 'usina-inv-1',
          marca,
          modelo: usinaVinculada.modelo_inversores || '',
          potencia_w: usinaVinculada.potencia_pico_inversores_kwp
            ? usinaVinculada.potencia_pico_inversores_kwp * 1000
            : undefined,
          quantidade: 1,
          numero_serie: undefined,
          datasheetUrl: usinaVinculada.datasheet_inversor_url || null,
          dataloggerUrl,
          configMonitoramento,
        },
      ]
    }

    // Fallback legado do cliente
    if (inversoresLista.length > 0) {
      return inversoresLista.map((i, idx) => {
        const marca = i.marca_inversor || ''
        const configMonitoramento = encontrarConfigMonitoramentoInversor(null, marca)
        return {
          id: `legacy-${idx}`,
          marca,
          modelo: i.modelo_inversor || '',
          potencia_w: undefined,
          quantidade: 1,
          numero_serie: undefined,
          datasheetUrl: null,
          dataloggerUrl: cliente?.monitoramento_datalogger_url || null,
          configMonitoramento,
        }
      })
    }

    if (cliente?.inversor_marca || cliente?.inversor_modelo) {
      const marca = cliente.inversor_marca || ''
      const configMonitoramento = encontrarConfigMonitoramentoInversor(null, marca)
      return [
        {
          id: 'cli-inv-1',
          marca,
          modelo: cliente.inversor_modelo || '',
          potencia_w: undefined,
          quantidade: 1,
          numero_serie: undefined,
          datasheetUrl: null,
          dataloggerUrl: cliente?.monitoramento_datalogger_url || null,
          configMonitoramento,
        },
      ]
    }

    return []
  }, [equipamentosUsina, usinaVinculada, cliente, inversoresLista, configuracoesMonitoramento])

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

  // Lógica bidirecional de Horário Início, Fim e Duração na edição rápida de manutenção
  const handleHorarioInicioChange = (novoInicio: string) => {
    setHorarioInicio(novoInicio)
    const base = atividadeDataHora || os?.data_agendada || ''
    const dataBase =
      base && base.length >= 10
        ? base.slice(0, 10).replace(' ', 'T')
        : new Date().toISOString().slice(0, 10)
    setAtividadeDataHora(`${dataBase}T${novoInicio}`)
    const duracaoAtual = duracaoMinutos > 0 ? duracaoMinutos : 60
    const novoFim = somarMinutos(novoInicio, duracaoAtual)
    setHorarioFim(novoFim)
  }

  const handleHorarioFimChange = (novoFim: string) => {
    setHorarioFim(novoFim)
    const novaDuracao = calcularDiferencaMinutos(horarioInicio, novoFim)
    setDuracaoMinutos(novaDuracao)
  }

  const handleDuracaoChange = (novaDuracao: number) => {
    const duracaoSegura = isNaN(novaDuracao) || novaDuracao < 0 ? 0 : novaDuracao
    setDuracaoMinutos(duracaoSegura)
    const novoFim = somarMinutos(horarioInicio, duracaoSegura)
    setHorarioFim(novoFim)
  }

  // Salvar alterações de horário e responsável diretamente pela tela da atividade
  const handleSalvarAlteracoesAtividade = async () => {
    if (!isOrigemAtividades) return

    if (isManutencaoOuAdmin && !selectedUsinaId?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Usina obrigatória',
        description: MSG_USINA_OBRIGATORIA,
      })
      return
    }

    setIsSalvandoAtividade(true)
    try {
      const respObj = instaladores.find((i) => i.id === atividadeResponsavelId)
      const dataFormatada = atividadeDataHora
        ? atividadeDataHora.replace('T', ' ') + (atividadeDataHora.length === 16 ? ':00' : '')
        : os.data_agendada

      const payload: Record<string, any> = {
        data: dataFormatada,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        duracao_minutos: duracaoMinutos,
        usina_id: selectedUsinaId || null,
        responsavel_id: atividadeResponsavelId || null,
        responsavel_nome: respObj?.name || '',
      }

      const atualizado = await updateAtividade(os.id, payload)

      const duracaoFinal =
        typeof atualizado.duracao_minutos === 'number' && atualizado.duracao_minutos > 0
          ? atualizado.duracao_minutos
          : duracaoMinutos

      const osAtualizada: OrdemServico = {
        ...os,
        data_agendada: atualizado.data || dataFormatada,
        horario_inicio: atualizado.horario_inicio || horarioInicio,
        horario_fim: atualizado.horario_fim || horarioFim,
        duracao_minutos: duracaoFinal,
        tempo_previsto_minutos: duracaoFinal,
        responsavel_usuario_id: atualizado.responsavel_id || atividadeResponsavelId || undefined,
        atribuida_a: atualizado.responsavel_nome || respObj?.name || os.atribuida_a,
      }

      onOSUpdated(osAtualizada)
      toast({
        title: 'Atividade atualizada com sucesso',
        description: 'Horário e responsável foram salvos com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao salvar alterações da atividade de manutenção:', err)
      if (isAuthSessionError(err)) {
        toast({
          variant: 'destructive',
          title: 'Sessão expirada',
          description: 'Sua sessão expirou. Faça login novamente.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar atividade',
          description: 'Não foi possível salvar as alterações da atividade.',
        })
      }
    } finally {
      setIsSalvandoAtividade(false)
    }
  }

  // Finalizar OS com geração automática de Relatório em PDF
  const handleFinalizarOS = async () => {
    if (isManutencaoOuAdmin && !selectedUsinaId?.trim()) {
      setShowConfirmModal(false)
      toast({
        variant: 'destructive',
        title: 'Usina obrigatória',
        description: MSG_USINA_OBRIGATORIA,
      })
      return
    }

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
        origem: os.origem,
      })

      const fotosDoRetorno = normalizarFotosIniciais(finalized.fotos)
      const fotosAtualizadas = Array.from(new Set([...fotosSalvas, ...fotosDoRetorno]))
      const finalizedComFotos: OrdemServico = {
        ...finalized,
        fotos: fotosAtualizadas.length > 0 ? fotosAtualizadas : fotosDoRetorno,
      }
      setFotosSalvas(finalizedComFotos.fotos || [])
      setNovasFotos([])

      setShowConfirmModal(false)
      toast({
        title: 'OS Finalizada com Sucesso! 🎉',
        description: relatorioPdfFile
          ? 'Ordem concluída e Relatório em PDF gerado automaticamente para o Administrador.'
          : 'Ordem de serviço marcada como concluída e registrada no histórico.',
      })
      onOSFinalizada(finalizedComFotos)
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

  // Indicador de progresso do checklist defensivo contra ErrorBoundary
  const safeChecklist = os?.checklist ?? checklist ?? []
  const totalItens = (checklist ?? []).length
  const concluidosCount = (checklist ?? []).filter((c) => Boolean(c?.concluido)).length
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
              <CheckCircle2 className="w-3 h-3 mr-1 text-[#16A34A]" />
              OS Concluída
            </Badge>
          )}
        </div>
      </div>

      {/* Cabeçalho da OS no padrão do sistema: fundo cinza escuro/navy Delfos (#0F2038 / slate-900) com detalhes em verde solar (#16A34A) e branco */}
      <TooltipProvider delayDuration={150}>
        <div className="bg-[#0F2038] text-white rounded-xl p-3.5 sm:p-4 shadow-sm relative overflow-hidden border border-slate-700/80">
          <div className="relative z-10 flex flex-col gap-2">
            {/* Linha 1: Tag OS + Data Agendada */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4ade80] bg-white/10 px-2 py-0.5 rounded">
                OS #{(os?.id || '').slice(-6).toUpperCase()} • {os?.tipo_servico || 'Serviço'}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-slate-200 bg-black/30 px-2 py-0.5 rounded">
                <Clock className="w-3 h-3 text-[#4ade80]" />
                <span>
                  Agendada: <strong>{formatDateTime(os?.data_agendada)}</strong>
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
                  <div className="inline-flex items-center gap-1.5 text-xs text-slate-200 bg-white/10 px-2 py-0.5 rounded-md">
                    <Phone className="w-3 h-3 text-[#4ade80] shrink-0" />
                    <span className="font-medium">{telefoneAutoritativoCliente}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setModalWhatsAppClienteAberto(true)}
                          className="w-5 h-5 rounded-sm bg-[#16A34A] hover:bg-[#15803D] text-white flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Conversar no WhatsApp"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Conversar com o cliente no WhatsApp
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>

              {/* Select compacto do Responsável com ícone de enviar OS por WhatsApp ao lado */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isAdmin ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-200 bg-white/10 px-2 py-1 rounded-lg">
                    <User className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                    <span className="font-medium text-[11px] text-slate-300 shrink-0 hidden sm:inline">
                      Resp:
                    </span>
                    <select
                      value={responsavelId}
                      onChange={(e) => setResponsavelId(e.target.value)}
                      disabled={!podeEditarOS}
                      className="bg-slate-900/90 border border-slate-600 text-white text-[11px] rounded px-1.5 py-0.5 max-w-[150px] sm:max-w-[180px] focus:outline-hidden focus:border-[#16A34A] disabled:opacity-60"
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
                      className="h-6 w-6 p-0 rounded-sm bg-[#16A34A] hover:bg-[#15803D] text-white border-0"
                    />
                  </div>
                ) : (
                  os.atribuida_a && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-200 bg-white/10 px-2 py-0.5 rounded">
                      <User className="w-3 h-3 text-[#4ade80]" />
                      <span>{os.atribuida_a}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Linha 3: Endereço compactado com ícones de Maps e Waze */}
            <div className="flex items-center justify-between gap-2 text-xs text-slate-200 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
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

              {(enderecoCompleto || temCoordenadasGps) && (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* Botão Principal: Traçar Rota (GPS Usina) no padrão verde solar primário do sistema */}
                  <button
                    type="button"
                    onClick={handleTraçarRotaGPSUsina}
                    className="h-6 px-2.5 inline-flex items-center gap-1 rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white text-[10px] font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                    title={
                      temCoordenadasGps
                        ? `Traçar Rota via GPS (${latCoord}, ${lngCoord}) a partir da sede Delfos Solar`
                        : 'Traçar Rota via endereço textual a partir da sede Delfos Solar'
                    }
                  >
                    <Navigation className="w-3 h-3 text-white" />
                    <span>Traçar Rota (GPS Usina)</span>
                  </button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleAbrirGoogleMaps}
                        className="h-6 px-1.5 inline-flex items-center gap-1 rounded bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                        aria-label="Abrir no Google Maps"
                      >
                        <MapPin className="w-3 h-3 text-[#4ade80]" />
                        <span>Maps</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {temCoordenadasGps
                        ? `Abrir coordenadas da usina (${latCoord}, ${lngCoord}) no Google Maps`
                        : 'Abrir endereço no Google Maps'}
                    </TooltipContent>
                  </Tooltip>

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
                </div>
              )}
            </div>

            {/* Linha 4: Dados técnicos comprimidos da usina (Inversor + Links Datasheet/Datalogger + Módulos) */}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs space-y-1.5">
              {/* Inversores */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-[#4ade80] tracking-wider">
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
                          <span className="text-[10px] text-[#4ade80] bg-white/10 px-1 rounded">
                            SN: {inv.numero_serie}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400 text-[11px]">
                      {carregandoUsina ? 'Carregando...' : 'Nenhum inversor vinculado'}
                    </span>
                  )}
                </div>

                {/* Links clicáveis de Datasheet do Inversor e Configuração do Datalogger / Monitoramento */}
                <div className="flex items-center gap-2 flex-wrap pl-0 sm:pl-1">
                  {inversoresUsina.map((inv, idx) => (
                    <div key={`links-${inv.id || idx}`} className="contents">
                      {inv.datasheetUrl && (
                        <a
                          href={inv.datasheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4ade80] hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded border border-[#16A34A]/40 transition-colors shadow-2xs"
                          title="Ver Datasheet do Inversor (PDF)"
                        >
                          <FileCode2 className="w-3 h-3 text-[#4ade80]" />
                          <span>Datasheet Inversor</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      )}

                      {/* Configuração de Monitoramento do Datalogger vinculada ao inversor (PDF / Link / Ambos) */}
                      {inv.configMonitoramento ? (
                        <MonitoramentoConfigBadge
                          configuracao={inv.configMonitoramento}
                          rotulo="Config. de Monitoramento"
                          mostrarTipo
                        />
                      ) : inv.dataloggerUrl ? (
                        <a
                          href={inv.dataloggerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-200 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded border border-amber-400/40 transition-colors shadow-2xs"
                          title="Abrir página/tutorial de Configuração do Datalogger"
                        >
                          <Wifi className="w-3 h-3 text-amber-300" />
                          <span>Configurar Datalogger</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      ) : null}
                    </div>
                  ))}

                  {/* Caso o link ou configuração de datalogger venha da usina/cliente mas nenhum inversor tenha o item específico */}
                  {!inversoresUsina.some((i) => i.configMonitoramento || i.dataloggerUrl) &&
                    (usinaVinculada?.monitoramento_datalogger_url ||
                      cliente?.monitoramento_datalogger_url) && (
                      <a
                        href={
                          usinaVinculada?.monitoramento_datalogger_url ||
                          cliente?.monitoramento_datalogger_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-200 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded border border-amber-400/40 transition-colors shadow-2xs"
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
              <div className="flex items-center gap-1.5 flex-wrap border-t border-slate-700/80 pt-1">
                <span className="text-[10px] uppercase font-bold text-[#4ade80] tracking-wider">
                  Módulos:
                </span>
                {modulosUsina.length > 0 ? (
                  modulosUsina.map((mod, idx) => (
                    <div key={mod.id || idx} className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-white text-xs">
                        {mod.quantidade ? `${mod.quantidade}x ` : ''}
                        {[mod.marca, mod.modelo].filter(Boolean).join(' ') ||
                          'Módulos Fotovoltaicos'}
                        {mod.potencia_w ? ` (${mod.potencia_w}W)` : ''}
                      </span>
                      {mod.datasheetUrl && (
                        <a
                          href={mod.datasheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-[#4ade80] hover:text-white underline decoration-[#16A34A] underline-offset-2 transition-colors ml-1"
                          title="Ver Datasheet do Módulo (PDF)"
                        >
                          <FileCode2 className="w-3 h-3 text-[#4ade80]" />
                          <span>Datasheet Módulo</span>
                          <ExternalLink className="w-2 h-2 opacity-70" />
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-[11px]">
                    {carregandoUsina ? 'Carregando...' : 'Nenhum módulo vinculado'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* PAINEL DE ALTERAÇÃO DIRETA DE HORÁRIO E RESPONSÁVEL (QUANDO ORIGEM É ATIVIDADES DE MANUTENÇÃO) - Oculto para instalador */}
      {isOrigemAtividades && !isInstalador && (
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                Horário, Duração e Responsável da Atividade de Manutenção
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300/80">
              Edição Rápida de Campo
            </span>
          </div>

          {/* Seletor de Usina na Edição da Atividade */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-[#E0A838]" />
                <span>Usina Vinculada:</span>
                {isManutencaoOuAdmin ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-normal">(opcional)</span>
                )}
              </label>
              {isManutencaoOuAdmin && (
                <span className="text-[10px] text-emerald-900 font-medium">
                  Obrigatória para manutenção
                </span>
              )}
            </div>

            <select
              value={selectedUsinaId}
              onChange={(e) => setSelectedUsinaId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
            >
              <option value="">
                {isManutencaoOuAdmin
                  ? '-- Selecione a Usina (obrigatória) --'
                  : '-- Nenhuma usina vinculada --'}
              </option>
              {usinasDoCliente.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} {u.potencia_kwp ? `(${u.potencia_kwp} kWp)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Data Agendada */}
            {!isAutoLeituraOS && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Data Agendada:</span>
                </label>
                <input
                  type="date"
                  value={(() => {
                    const base = atividadeDataHora || os?.data_agendada || ''
                    return base && base.length >= 10 ? base.slice(0, 10) : ''
                  })()}
                  onChange={(e) => {
                    const novaData = e.target.value
                    const horaAtual = horarioInicio || '08:00'
                    if (novaData) {
                      setAtividadeDataHora(`${novaData}T${horaAtual}`)
                    }
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                />
              </div>
            )}

            {/* Campo de Responsável */}
            <div className={`space-y-1.5 ${isAutoLeituraOS ? 'sm:col-span-2' : ''}`}>
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Responsável da Atividade:</span>
              </label>
              <select
                value={atividadeResponsavelId}
                onChange={(e) => {
                  setAtividadeResponsavelId(e.target.value)
                  setResponsavelId(e.target.value)
                }}
                className="w-full text-xs px-3 py-2 rounded-xl border border-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
              >
                <option value="">-- Não atribuído --</option>
                {instaladores.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} {inst.email ? `(${inst.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid com Horário de Início, Horário de Fim e Duração Prevista (Editáveis com passos de 5 em 5) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-200/60 text-xs">
            {/* Horário de Início */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                <span>Horário de Início</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1">
                <select
                  value={safeHorarioStr(horarioInicio, '08:00').split(':')[0] || '08'}
                  onChange={(e) => {
                    const h = e.target.value.padStart(2, '0')
                    const m = safeHorarioStr(horarioInicio, '08:00').split(':')[1] || '00'
                    handleHorarioInicioChange(`${h}:${m}`)
                  }}
                  className="w-full text-xs px-1.5 py-2 rounded-xl border border-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-mono font-medium"
                >
                  {HORAS_24.map((h) => (
                    <option key={`ficha-ini-h-${h}`} value={h}>
                      {h}h
                    </option>
                  ))}
                </select>
                <select
                  value={(() => {
                    const mRaw =
                      parseInt(safeHorarioStr(horarioInicio, '08:00').split(':')[1] || '0', 10) || 0
                    const mRound = Math.round(mRaw / 5) * 5
                    const mBound = mRound >= 60 ? 55 : mRound
                    return String(mBound).padStart(2, '0')
                  })()}
                  onChange={(e) => {
                    const h = safeHorarioStr(horarioInicio, '08:00').split(':')[0] || '08'
                    const m = e.target.value
                    handleHorarioInicioChange(`${h}:${m}`)
                  }}
                  className="w-full text-xs px-1.5 py-2 rounded-xl border border-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-mono font-medium"
                >
                  {MINUTOS_PASSO_5.map((m) => (
                    <option key={`ficha-ini-m-${m}`} value={m}>
                      {m}m
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Horário de Fim */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                <span>Horário de Fim</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1">
                <select
                  value={safeHorarioStr(horarioFim, '09:00').split(':')[0] || '09'}
                  onChange={(e) => {
                    const h = e.target.value.padStart(2, '0')
                    const m = safeHorarioStr(horarioFim, '09:00').split(':')[1] || '00'
                    handleHorarioFimChange(`${h}:${m}`)
                  }}
                  className="w-full text-xs px-1.5 py-2 rounded-xl border border-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-mono font-medium"
                >
                  {HORAS_24.map((h) => (
                    <option key={`ficha-fim-h-${h}`} value={h}>
                      {h}h
                    </option>
                  ))}
                </select>
                <select
                  value={(() => {
                    const mRaw =
                      parseInt(safeHorarioStr(horarioFim, '09:00').split(':')[1] || '0', 10) || 0
                    const mRound = Math.round(mRaw / 5) * 5
                    const mBound = mRound >= 60 ? 55 : mRound
                    return String(mBound).padStart(2, '0')
                  })()}
                  onChange={(e) => {
                    const h = safeHorarioStr(horarioFim, '09:00').split(':')[0] || '09'
                    const m = e.target.value
                    handleHorarioFimChange(`${h}:${m}`)
                  }}
                  className="w-full text-xs px-1.5 py-2 rounded-xl border border-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-mono font-medium"
                >
                  {MINUTOS_PASSO_5.map((m) => (
                    <option key={`ficha-fim-m-${m}`} value={m}>
                      {m}m
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duração Prevista (Editável) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-emerald-950">Duração Prevista</label>
                <span className="text-[10px] font-extrabold text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                  {formatarDuracao(duracaoMinutos)}
                </span>
              </div>
              <select
                value={duracaoMinutos}
                onChange={(e) => handleDuracaoChange(parseInt(e.target.value, 10))}
                className="w-full text-xs px-2 py-2 rounded-xl border border-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
              >
                {DURACOES_PREVISTAS_SUGESTOES.map((d) => (
                  <option key={`ficha-dur-${d.minutos}`} value={d.minutos}>
                    {d.label}
                  </option>
                ))}
                {!DURACOES_PREVISTAS_SUGESTOES.some((d) => d.minutos === duracaoMinutos) && (
                  <option value={duracaoMinutos}>
                    {formatarDuracao(duracaoMinutos)} (personalizado)
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <p className="text-[11px] text-emerald-900/80">
              Previsão padrão: 1 hora. Alterar o fim recalcula a duração, e alterar a duração
              recalcula o fim.
            </p>
            <button
              type="button"
              onClick={handleSalvarAlteracoesAtividade}
              disabled={isSalvandoAtividade}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer ml-auto"
            >
              {isSalvandoAtividade ? (
                <div className="contents" key="salvando">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </div>
              ) : (
                <div className="contents" key="salvar">
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENTOS DA USINA (Consulta em Campo: Laudos, Projetos, Medições, Comprovantes e Fotos) */}
      {(os.usina_id || usinaVinculada?.id) && (
        <SecaoDocumentosUsina
          usinaId={os.usina_id || usinaVinculada?.id || ''}
          usinaNome={usinaVinculada?.nome || cliente?.nome || 'Usina'}
          readOnly={true}
        />
      )}

      {/* 2. PROCEDIMENTOS DE TRABALHO PADRÃO & INSTRUÇÕES (Vindos do Catálogo de Atividades) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#16A34A]" />
            2. Procedimentos de Trabalho Padrão & Orientações Técnicas
          </h3>
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
            {os.tipo_servico}
          </span>
        </div>

        {orientacoesCatalogo && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
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
              // Garante que o objeto passado para pb.files.getURL contenha collectionId ou collectionName resolvido
              const recordRef = {
                ...os,
                collectionId:
                  os.collectionId || (os.origem === 'atividades' ? 'atividades' : 'ordens_servico'),
                collectionName:
                  os.collectionName ||
                  (os.origem === 'atividades' ? 'atividades' : 'ordens_servico'),
              }
              const fileUrl = pb.files.getURL(recordRef, fotoNome)
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
            <div className="contents" key="os-nao-concluida">
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
            </div>
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
                {/* Botão de Envio de Relatório ao Cliente */}
                <Button
                  type="button"
                  onClick={() => setModalEnviarRelatorioClienteAberto(true)}
                  className="rounded-xl h-9 px-3 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs inline-flex items-center gap-1.5 shrink-0"
                  title="Enviar relatório técnico de execução por e-mail e WhatsApp ao cliente"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar relatório ao cliente</span>
                </Button>

                {/* Botão de Visualização Web do Relatório da OS */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalVisualizarRelatorioAberto(true)}
                  className="rounded-xl h-9 px-3 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 bg-white inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="Visualizar relatório técnico completo diretamente na tela"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Visualizar relatório (web)</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Apenas Admin pode reabrir a OS concluída ou salvar alterações */}
                {isAdmin && (
                  <div className="contents" key="admin-acoes-os">
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
                  </div>
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
        subtitulo={`Comunicação referente à OS #${(os?.id || '').slice(-6).toUpperCase()} (${os?.tipo_servico || 'Serviço'}).`}
        destinatarioNome={cliente?.nome || cliente?.razao_social || 'Cliente Solar'}
        telefoneInicial={telefoneAutoritativoCliente}
        mensagemInicial={mensagemInicialCliente}
        telefoneReadOnly={!isAdmin}
        onConfirmarEnvio={handleConfirmarEnvioWhatsAppCliente}
        confirmLabel="Enviar WhatsApp ao Cliente"
      />

      {/* Modal Amplo de Visualização Web do Relatório Técnico na Própria Tela */}
      {modalVisualizarRelatorioAberto && (
        <Dialog
          open={modalVisualizarRelatorioAberto}
          onOpenChange={(open) => setModalVisualizarRelatorioAberto(open)}
        >
          <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] h-[92vh] p-0 overflow-hidden flex flex-col rounded-2xl border border-slate-200 shadow-2xl bg-slate-100">
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-900">
                  Relatório Técnico de Execução • OS #
                  {String(os?.id || '')
                    .slice(-6)
                    .toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 mr-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/relatorio-os-preview/' + os.id, '_blank')}
                  className="h-8 text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                  title="Abrir também em nova guia"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova guia</span>
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-100">
              <RelatorioOSConteudo id={os.id} showHeaderActions={true} requireAuth={false} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Envio Completo do Relatório ao Cliente (E-mail + WhatsApp) */}
      {modalEnviarRelatorioClienteAberto && (
        <ModalEnviarRelatorioCliente
          isOpen={modalEnviarRelatorioClienteAberto}
          onClose={() => setModalEnviarRelatorioClienteAberto(false)}
          os={os}
          cliente={cliente}
          sistema={sistema}
          onSuccess={() => {
            if (onOSUpdated) onOSUpdated(os)
          }}
        />
      )}

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

export default FichaExecucaoOS
