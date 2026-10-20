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

const LazyBotaoBaixarRelatorioFicha = React.lazy(
  () => import('@/components/BotaoBaixarRelatorioOSPDF'),
)
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
  Trash2,
  Plus,
  Paperclip,
} from 'lucide-react'
import type { FotoMetadadoItem } from '@/types/crm'
const LazyModalEnviarRelatorioCliente = React.lazy(
  () => import('@/components/ModalEnviarRelatorioCliente'),
)
import { RelatorioOSConteudo } from '@/components/RelatorioOSConteudo'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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

import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { SistemaUsuario } from '@/types/crm'
import { BotaoEnviarOSWhatsApp } from '@/components/BotaoEnviarOSWhatsApp'
import { ModalConfirmarEnvioWhatsApp } from '@/components/ModalConfirmarEnvioWhatsApp'
import { useClientes } from '@/contexts/ClientesContext'
import { MessageSquare, RotateCcw, LogOut } from 'lucide-react'
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
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAdmin, isInstalador, userProfile, logout } = useAuth()
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
  // Ref para controlar a inicialização por OS e flag de interação do usuário para evitar
  // que re-renders ou callbacks (ex: onOSUpdated após salvar rascunho) revertam checks marcados localmente.
  const currentOsIdRef = useRef<string | undefined>(os?.id)
  const checklistInteractedRef = useRef<boolean>(false)
  const checklistRef = useRef<OSChecklistItem[]>([])

  // Estado e refs para o Salvamento Automático do Checklist
  // Status: 'idle' | 'saving' | 'saved' | 'error'
  const [checklistSaveStatus, setChecklistSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const checklistAutosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isChecklistAutosavingRef = useRef<boolean>(false)
  const lastSavedChecklistJsonRef = useRef<string>('')

  const [checklist, setChecklist] = useState<OSChecklistItem[]>(() => {
    const normalizado = normalizeChecklist(os?.checklist)
    const inicial =
      normalizado && normalizado.length > 0
        ? normalizado
        : getDefaultChecklist(os?.tipo_servico || 'Manutenção')
    checklistRef.current = inicial
    lastSavedChecklistJsonRef.current = JSON.stringify(inicial)
    return inicial
  })

  // Manter checklistRef sincronizado com o state
  useEffect(() => {
    checklistRef.current = checklist
  }, [checklist])

  // Sincronizar checklist quando a OS trocar de ID (navegação para outra OS)
  // ou na primeira carga se o usuário AINDA NÃO interagiu.
  useEffect(() => {
    if (currentOsIdRef.current !== os?.id) {
      // Mudou de OS: resetar flag e carregar dados da nova OS
      currentOsIdRef.current = os?.id
      checklistInteractedRef.current = false
      setChecklistSaveStatus('idle')
      if (checklistAutosaveTimerRef.current) {
        clearTimeout(checklistAutosaveTimerRef.current)
      }
      const normalizado = normalizeChecklist(os?.checklist)
      const novo =
        normalizado && normalizado.length > 0
          ? normalizado
          : getDefaultChecklist(os?.tipo_servico || 'Manutenção')
      checklistRef.current = novo
      lastSavedChecklistJsonRef.current = JSON.stringify(novo)
      setChecklist(novo)
      return
    }

    // Mesma OS: se o usuário já interagiu localmente ou está ocorrendo autosave, NUNCA sobrescrever com props
    if (checklistInteractedRef.current || isChecklistAutosavingRef.current) {
      return
    }

    const normalizado = normalizeChecklist(os?.checklist)
    if (normalizado && normalizado.length > 0) {
      checklistRef.current = normalizado
      lastSavedChecklistJsonRef.current = JSON.stringify(normalizado)
      setChecklist(normalizado)
    }
  }, [os?.id, os?.checklist])

  // 4. Fotos: fotos já salvas (nomes em PB) + novas fotos capturadas na sessão
  const normalizarFotosIniciais = (fotosRaw: unknown, fotoMedidorRaw?: unknown): string[] => {
    const list: string[] = []
    if (Array.isArray(fotosRaw)) {
      list.push(
        ...fotosRaw.filter((f): f is string => typeof f === 'string' && f.trim().length > 0),
      )
    } else if (typeof fotosRaw === 'string' && fotosRaw.trim().length > 0) {
      list.push(fotosRaw.trim())
    }
    // Suporte aditivo: incluir foto_medidor (campo único) se existir e ainda não estiver na lista
    if (typeof fotoMedidorRaw === 'string' && fotoMedidorRaw.trim().length > 0) {
      const medidorNome = fotoMedidorRaw.trim()
      if (!list.includes(medidorNome)) {
        list.push(medidorNome)
      }
    }
    return list
  }

  const [fotosSalvas, setFotosSalvas] = useState<string[]>(() =>
    normalizarFotosIniciais(os?.fotos, (os as any)?.foto_medidor),
  )
  const [novasFotos, setNovasFotos] = useState<
    { file: File; previewUrl: string; item_checklist_id?: string; item_checklist_texto?: string }[]
  >([])
  const [fotoParaRemover, setFotoParaRemover] = useState<string | null>(null)
  const [isRemovendoFotoSalva, setIsRemovendoFotoSalva] = useState(false)

  // Metadados das fotos salvas (vínculo com etapas do checklist)
  const [fotosMetadados, setFotosMetadados] = useState<FotoMetadadoItem[]>(() => {
    if (Array.isArray(os?.fotos_metadados)) return os.fotos_metadados
    if (typeof os?.fotos_metadados === 'string') {
      try {
        const parsed = JSON.parse(os.fotos_metadados)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  })

  // Sincronizar estado local de fotos salvas e metadados sempre que a OS recebida por props mudar
  useEffect(() => {
    setFotosSalvas(normalizarFotosIniciais(os?.fotos, (os as any)?.foto_medidor))
    if (Array.isArray(os?.fotos_metadados)) {
      setFotosMetadados(os.fotos_metadados)
    } else if (typeof os?.fotos_metadados === 'string') {
      try {
        const parsed = JSON.parse(os.fotos_metadados)
        if (Array.isArray(parsed)) setFotosMetadados(parsed)
      } catch {
        /* ignore */
      }
    }
  }, [os?.id, os?.fotos, (os as any)?.foto_medidor, os?.fotos_metadados])

  // Refs e estado para captura de fotos vinculadas a um item do checklist específico
  const checklistCameraInputRef = useRef<HTMLInputElement>(null)
  const checklistFileInputRef = useRef<HTMLInputElement>(null)
  const [activeChecklistItemId, setActiveChecklistItemId] = useState<string | null>(null)

  // 5. Detalhes da execução
  const [detalhesExecucao, setDetalhesExecucao] = useState<string>(os.detalhes_execucao || '')

  // 6. Pendências e Recomendações
  const [pendenciasRecomendacoes, setPendenciasRecomendacoes] = useState<string>(
    typeof os.pendencias_recomendacoes === 'string' ? os.pendencias_recomendacoes : '',
  )

  // Sincronizar pendências quando a OS for atualizada externamente
  useEffect(() => {
    if (typeof os.pendencias_recomendacoes === 'string') {
      setPendenciasRecomendacoes(os.pendencias_recomendacoes)
    }
  }, [os?.id, os?.pendencias_recomendacoes])

  // Confirmação de Finalização
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Limpeza de timers no unmount do componente
  useEffect(() => {
    return () => {
      if (checklistAutosaveTimerRef.current) {
        clearTimeout(checklistAutosaveTimerRef.current)
      }
    }
  }, [])

  // Confirmação de Exclusão da Atividade / OS (Apenas Admin)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [isExcluindoOS, setIsExcluindoOS] = useState(false)

  const handleConfirmarExclusaoOS = async () => {
    if (!os?.id) return
    setIsExcluindoOS(true)
    try {
      if (os.origem === 'atividades') {
        const { deleteAtividade } = await import('@/services/crmService')
        await deleteAtividade(os.id)
      } else {
        const { deleteOrdemServico } = await import('@/services/crmService')
        await deleteOrdemServico(os.id)
      }
      const safeId = typeof os.id === 'string' ? os.id.slice(0, 8) : ''
      toast({
        title: 'Registro Excluído',
        description: `OS/Atividade #${safeId} foi removida com sucesso.`,
      })
      setModalExcluirAberto(false)
      onBack()
    } catch (err) {
      console.error('Erro ao excluir OS na ficha:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o registro.',
      })
    } finally {
      setIsExcluindoOS(false)
    }
  }

  // Carrega lista de usinas do cliente para seleção/edição e validação de usina obrigatória
  useEffect(() => {
    let cancelado = false
    if (!os?.cliente_id) {
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
  }, [os?.cliente_id, selectedUsinaId])

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
    const usinaId = selectedUsinaId || os?.usina_id || (os?.expand?.usina_id as any)?.id

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
        } else if (os?.cliente_id) {
          // Fallback quando não há usina vinculada à OS: carrega sistema legado
          fetchSistemaByClienteId(os.cliente_id)
            .then((sist) => {
              if (!cancelado) setSistema(sist)
            })
            .catch((e) => console.error('Erro ao carregar sistema:', e))

          import('@/services/crmService').then(({ fetchInversoresByClienteId }) => {
            if (os?.cliente_id) {
              fetchInversoresByClienteId(os.cliente_id)
                .then((invs) => {
                  if (!cancelado) setInversoresLista(invs)
                })
                .catch((e) => console.warn('Erro ao carregar inversores da OS:', e))
            }
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
  }, [os?.usina_id, os?.expand?.usina_id, os?.cliente_id])

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
            tipo_custom_id: os?.tipo_custom_id,
            tipo: os?.tipo,
            tipo_servico: os?.tipo_servico,
            categoria: (os as any)?.categoria,
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
        // Guarda 0: Se o usuário já interagiu com o checklist nesta OS, NUNCA sobrescrever!
        if (checklistInteractedRef.current) {
          return
        }

        // Guarda 1: NUNCA redefinir o checklist se o checklist salvo já tem itens marcados como concluídos
        const checklistSalvo = os?.checklist ? normalizeChecklist(os.checklist) : []
        const temItemConcluido = checklistSalvo.some((it) => it.concluido)

        if (temItemConcluido) {
          setChecklist(checklistSalvo)
          return
        }

        // Guarda 2: Se a OS já tem checklist salvo (mesmo sem itens marcados), respeitar e não sobrescrever
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

        // (3) Fallback genérico SOMENTE se o estado checklist atual também estiver vazio
        setChecklist((current) => {
          if (Array.isArray(current) && current.length > 0) {
            return current
          }
          return getDefaultChecklist((os?.tipo_servico as any) || 'Manutenção')
        })
      })
      .catch((err) => console.warn('Erro ao buscar orientações do catálogo:', err))
      .finally(() => setLoadingCatalogo(false))
  }, [os?.cliente_id, os?.tipo_servico, os?.tipo, os?.tipo_custom_id, os?.origem, os?.checklist])

  // Reabrir Ordem de Serviço (apenas Admin)
  const handleReabrirOS = async () => {
    if (!isAdmin) return
    setIsReabrindo(true)
    try {
      // Preservar checklist gravado na coleção atividades / ordens_servico - nunca enviar vazio
      const checklistPreservado =
        checklist && checklist.length > 0
          ? checklist
          : os.checklist
            ? normalizeChecklist(os.checklist)
            : undefined

      const payloadReabertura: Partial<OrdemServico> = {
        status: 'pendente',
        concluida_em: null as unknown as string,
        origem: os.origem || undefined,
      }
      if (checklistPreservado && checklistPreservado.length > 0) {
        payloadReabertura.checklist = checklistPreservado
      }

      const updated = await updateOrdemServico(os.id, payloadReabertura)
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

  // Toggle de item do checklist com salvamento automático (autosave discreto)
  // Marcar/desmarcar persiste na hora (~600ms debounce), sem depender do botão "Salvar rascunho".
  const persistirChecklistAutosave = async (checklistParaSalvar: OSChecklistItem[]) => {
    if (!os?.id) return

    const checklistJson = JSON.stringify(checklistParaSalvar)
    if (checklistJson === lastSavedChecklistJsonRef.current) {
      return
    }

    isChecklistAutosavingRef.current = true
    setChecklistSaveStatus('saving')

    try {
      const colecao =
        os.collectionName ||
        (os.collectionId === 'atividades' || os.origem === 'atividades'
          ? 'atividades'
          : 'ordens_servico')

      await pb.collection(colecao).update(os.id, {
        checklist: checklistParaSalvar,
      })

      lastSavedChecklistJsonRef.current = checklistJson
      setChecklistSaveStatus('saved')

      // Discretamente informa o componente pai sem recarregar campos do zero
      const osAtualizada: OrdemServico = {
        ...os,
        checklist: checklistParaSalvar,
      }
      onOSUpdated(osAtualizada)

      // Retorna para 'idle' após 2.5s
      setTimeout(() => {
        setChecklistSaveStatus((atual) => (atual === 'saved' ? 'idle' : atual))
      }, 2500)
    } catch (err) {
      console.error('Erro no autosave do checklist:', err)
      setChecklistSaveStatus('error')
    } finally {
      isChecklistAutosavingRef.current = false
    }
  }

  const agendarAutosaveChecklist = (proximoChecklist: OSChecklistItem[]) => {
    if (checklistAutosaveTimerRef.current) {
      clearTimeout(checklistAutosaveTimerRef.current)
    }
    setChecklistSaveStatus('saving')
    checklistAutosaveTimerRef.current = setTimeout(() => {
      persistirChecklistAutosave(proximoChecklist)
    }, 600)
  }

  const handleToggleChecklist = (id: string) => {
    if (!podeEditarOS) return // leitura se concluída e não-admin
    checklistInteractedRef.current = true
    setChecklist((prev) => {
      const proximo = prev.map((item) =>
        item.id === id ? { ...item, concluido: !item.concluido } : item,
      )
      checklistRef.current = proximo
      // Dispara autosave imediato/debounced com proteção
      agendarAutosaveChecklist(proximo)
      return proximo
    })
  }

  // Upload imediato de foto(s) para o banco de dados (PocketBase / Skip Cloud)
  // Ao capturar/anexar (câmera ou galeria), a foto sobe direto vinculada à OS/etapa,
  // protegendo o instalador caso o app feche no meio do atendimento.
  const [isUploadingFoto, setIsUploadingFoto] = useState(false)
  const [uploadingEtapaId, setUploadingEtapaId] = useState<string | null>(null)

  const uploadFotosImediato = async (
    files: FileList | File[],
    vinculoEtapa?: { id: string; texto: string },
  ) => {
    if (!files || files.length === 0 || !os?.id) return

    const listaArquivos = Array.from(files)
    setIsUploadingFoto(true)
    if (vinculoEtapa?.id) {
      setUploadingEtapaId(vinculoEtapa.id)
    }

    try {
      const colecao =
        os.collectionName ||
        (os.collectionId === 'atividades' || os.origem === 'atividades'
          ? 'atividades'
          : 'ordens_servico')

      // Criar metadados preliminares para as novas fotos
      const novosItensMetadados: FotoMetadadoItem[] = listaArquivos.map((file, idx) => ({
        id: `meta-${Date.now()}-${idx}`,
        arquivo: file.name,
        item_checklist_id: vinculoEtapa?.id || undefined,
        item_checklist_texto: vinculoEtapa?.texto || undefined,
        data_hora: new Date().toISOString(),
      }))

      // Combinar com metadados atuais
      const metadadosAtualizados = [...fotosMetadados, ...novosItensMetadados]

      // FormData com upload real
      const formData = new FormData()
      formData.append('fotos_metadados', JSON.stringify(metadadosAtualizados))
      for (const file of listaArquivos) {
        formData.append('fotos', file)
      }

      const updatedRecord = await pb.collection(colecao).update<any>(os.id, formData)

      // Extrair lista final de fotos gravadas no banco
      const fotosDoBanco = normalizarFotosIniciais(updatedRecord.fotos, updatedRecord.foto_medidor)
      const fotosConsolidadas = Array.from(new Set([...fotosSalvas, ...fotosDoBanco]))

      // Associar nomes reais gerados pelo PocketBase aos metadados (se PB renomeou arquivos)
      let metadadosDoBanco: FotoMetadadoItem[] = []
      if (Array.isArray(updatedRecord.fotos_metadados)) {
        metadadosDoBanco = updatedRecord.fotos_metadados
      } else if (typeof updatedRecord.fotos_metadados === 'string') {
        try {
          metadadosDoBanco = JSON.parse(updatedRecord.fotos_metadados)
        } catch {
          metadadosDoBanco = metadadosAtualizados
        }
      } else {
        metadadosDoBanco = metadadosAtualizados
      }

      // Se o PocketBase gerou novos nomes em updatedRecord.fotos, sincronizar arquivo do último lote
      if (fotosDoBanco.length > 0 && metadadosDoBanco.length > 0) {
        // Garantir que os arquivos recém-adicionados recebam os nomes reais
        const novosNomes = fotosDoBanco.slice(-listaArquivos.length)
        if (novosNomes.length === listaArquivos.length) {
          metadadosDoBanco = metadadosDoBanco.map((m, idx) => {
            const startIdx = metadadosDoBanco.length - listaArquivos.length
            if (idx >= startIdx) {
              const fileIdx = idx - startIdx
              return { ...m, arquivo: novosNomes[fileIdx] || m.arquivo }
            }
            return m
          })
        }
      }

      setFotosSalvas(fotosConsolidadas)
      setFotosMetadados(metadadosDoBanco)

      const osAtualizada: OrdemServico = {
        ...os,
        fotos: fotosConsolidadas,
        fotos_metadados: metadadosDoBanco,
      }
      onOSUpdated(osAtualizada)

      toast({
        title: vinculoEtapa
          ? `${listaArquivos.length} foto(s) salva(s) na etapa! 📸`
          : `${listaArquivos.length} foto(s) enviada(s) e salva(s)! 📸`,
        description: vinculoEtapa
          ? `Foto já persistida com segurança em: "${vinculoEtapa.texto.slice(0, 35)}..."`
          : 'A foto foi salva com sucesso no banco de dados da OS.',
      })
    } catch (err: any) {
      console.error('Erro no upload imediato da foto:', err)
      toast({
        variant: 'destructive',
        title: 'Falha no upload da foto',
        description:
          err?.message ||
          'Não foi possível salvar a foto no banco de dados. Verifique a conexão e tente novamente.',
      })
    } finally {
      setIsUploadingFoto(false)
      setUploadingEtapaId(null)
    }
  }

  // Upload/Captura de fotos gerais (imediato)
  const handlePhotoCaptured = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const filesCopy = Array.from(files)
    e.target.value = ''
    await uploadFotosImediato(filesCopy)
  }

  // Upload/Captura de foto vinculada a uma etapa específica do checklist (imediato)
  const handleChecklistPhotoCaptured = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !activeChecklistItemId) return
    const filesCopy = Array.from(files)
    const itemAlvo = checklist.find((c) => c.id === activeChecklistItemId)
    const textoEtapa = itemAlvo?.item || 'Etapa do Checklist'
    const etapaId = activeChecklistItemId
    e.target.value = ''
    await uploadFotosImediato(filesCopy, { id: etapaId, texto: textoEtapa })
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

  // Aciona a câmera traseira vinculando diretamente ao item de checklist clicado
  const handleTirarFotoChecklistItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveChecklistItemId(itemId)
    setTimeout(() => {
      checklistCameraInputRef.current?.click()
    }, 10)
  }

  // Aciona o seletor de arquivos múltiplos vinculando diretamente ao item de checklist clicado
  const handleAnexarFotosChecklistItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveChecklistItemId(itemId)
    setTimeout(() => {
      checklistFileInputRef.current?.click()
    }, 10)
  }

  // Alteração de vínculo de etapa em foto já salva (persiste imediatamente no PocketBase)
  const handleVincularFotoSalva = async (fotoNome: string, novoItemChecklistId: string) => {
    const itemEncontrado = checklist.find((c) => c.id === novoItemChecklistId)
    const novoTexto = itemEncontrado?.item || ''

    let novosMetadados: FotoMetadadoItem[] = []
    setFotosMetadados((prev) => {
      const indexExistente = prev.findIndex((m) => m.arquivo === fotoNome || m.id === fotoNome)
      if (indexExistente >= 0) {
        const atualizado = [...prev]
        if (!novoItemChecklistId) {
          // Desvincular / sem vínculo
          atualizado[indexExistente] = {
            ...atualizado[indexExistente],
            item_checklist_id: undefined,
            item_checklist_texto: undefined,
          }
        } else {
          atualizado[indexExistente] = {
            ...atualizado[indexExistente],
            arquivo: fotoNome,
            item_checklist_id: novoItemChecklistId,
            item_checklist_texto: novoTexto,
          }
        }
        novosMetadados = atualizado
        return atualizado
      } else {
        // Criar novo metadado para a foto salva
        if (!novoItemChecklistId) {
          novosMetadados = prev
          return prev
        }
        novosMetadados = [
          ...prev,
          {
            id: fotoNome,
            arquivo: fotoNome,
            item_checklist_id: novoItemChecklistId,
            item_checklist_texto: novoTexto,
            data_hora: new Date().toISOString(),
          },
        ]
        return novosMetadados
      }
    })

    // Persiste alteração de vínculo direto no banco PocketBase
    if (os?.id) {
      try {
        const colecao =
          os.collectionName ||
          (os.collectionId === 'atividades' || os.origem === 'atividades'
            ? 'atividades'
            : 'ordens_servico')
        await pb.collection(colecao).update(os.id, {
          fotos_metadados: novosMetadados,
        })
        const osAtualizada: OrdemServico = {
          ...os,
          fotos_metadados: novosMetadados,
        }
        onOSUpdated(osAtualizada)
      } catch (err) {
        console.warn('Erro ao persistir novo vínculo de etapa da foto no banco:', err)
      }
    }

    toast({
      title: novoItemChecklistId ? 'Foto vinculada à etapa!' : 'Foto desvinculada (geral)',
      description: novoItemChecklistId
        ? `Etapa: "${(novoTexto || '').slice(0, 35)}..."`
        : 'A foto agora faz parte do acervo geral da OS.',
    })
  }

  // Alteração de vínculo de etapa em nova foto (em upload na sessão)
  const handleVincularNovaFoto = (fotoIndex: number, novoItemChecklistId: string) => {
    const itemEncontrado = checklist.find((c) => c.id === novoItemChecklistId)
    const novoTexto = itemEncontrado?.item || ''

    setNovasFotos((prev) =>
      prev.map((nf, idx) => {
        if (idx !== fotoIndex) return nf
        return {
          ...nf,
          item_checklist_id: novoItemChecklistId || undefined,
          item_checklist_texto: novoItemChecklistId ? novoTexto : undefined,
        }
      }),
    )

    toast({
      title: novoItemChecklistId ? 'Foto vinculada à etapa!' : 'Foto desvinculada (geral)',
      description: novoItemChecklistId
        ? `Etapa: "${(novoTexto || '').slice(0, 35)}..."`
        : 'A foto agora faz parte do acervo geral da OS.',
    })
  }

  /**
   * Helper que compila a lista consolidada de fotos_metadados para salvar rascunho ou finalizar OS.
   * Mescla os metadados existentes/editados das fotos salvas com os metadados das novas fotos em upload.
   */
  const compilarMetadadosFinais = (): FotoMetadadoItem[] => {
    const resultado: FotoMetadadoItem[] = [...fotosMetadados]

    // Para cada nova foto, adicionamos um item de metadado (mesmo se sem vínculo, ou com item_checklist_id)
    novasFotos.forEach((nf, idx) => {
      resultado.push({
        id: `upload-${Date.now()}-${idx}`,
        arquivo: nf.file.name,
        item_checklist_id: nf.item_checklist_id || undefined,
        item_checklist_texto: nf.item_checklist_texto || undefined,
        data_hora: new Date().toISOString(),
      })
    })

    return resultado
  }

  // Remoção de foto já salva e persistida no PocketBase (com confirmação)
  const handleConfirmarRemoverFotoSalva = async () => {
    if (!fotoParaRemover || !os?.id) return

    const nomeDoArquivo = fotoParaRemover
    setIsRemovendoFotoSalva(true)
    try {
      const colecao =
        os.collectionName ||
        (os.collectionId === 'atividades' || os.origem === 'atividades'
          ? 'atividades'
          : 'ordens_servico')

      const isFotoMedidor = (os as any)?.foto_medidor === nomeDoArquivo

      // Atualiza também os metadados removendo a foto excluída
      const novosMetadados = fotosMetadados.filter(
        (m) => m.arquivo !== nomeDoArquivo && m.id !== nomeDoArquivo,
      )

      if (isFotoMedidor) {
        await pb.collection(colecao).update(os.id, {
          foto_medidor: null,
          fotos_metadados: novosMetadados,
        })
      } else {
        await pb.collection(colecao).update(os.id, {
          'fotos-': [nomeDoArquivo],
          fotos_metadados: novosMetadados,
        })
      }

      const novasFotosSalvas = fotosSalvas.filter((f) => f !== nomeDoArquivo)
      setFotosSalvas(novasFotosSalvas)
      setFotosMetadados(novosMetadados)

      const osAtualizada: OrdemServico = {
        ...os,
        fotos: novasFotosSalvas,
        fotos_metadados: novosMetadados,
        ...(isFotoMedidor ? { foto_medidor: undefined } : {}),
      }

      onOSUpdated(osAtualizada)

      toast({
        title: 'Foto removida',
        description: 'A foto foi removida da ordem de serviço com sucesso.',
      })
      setFotoParaRemover(null)
    } catch (err: any) {
      console.error('Erro ao remover foto da ordem de serviço:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao remover foto',
        description:
          err?.message || 'Não foi possível remover a foto da ordem de serviço. Tente novamente.',
      })
    } finally {
      setIsRemovendoFotoSalva(false)
    }
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
      const blocosPayload = Array.isArray(os.blocos_relatorio) ? os.blocos_relatorio : undefined

      const metadadosConsolidados = compilarMetadadosFinais()
      const checklistAtual = checklistRef.current?.length > 0 ? checklistRef.current : checklist

      const payload: Partial<OrdemServico> = {
        instrucoes: instrucoesTexto,
        checklist: checklistAtual,
        detalhes_execucao: detalhesExecucao,
        usina_id: selectedUsinaId || undefined,
        ...(blocosPayload !== undefined ? { blocos_relatorio: blocosPayload } : {}),
        pendencias_recomendacoes: pendenciasRecomendacoes.trim(),
        fotos_metadados: metadadosConsolidados,
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
      const fotosDoRetorno = normalizarFotosIniciais(updated.fotos, (updated as any)?.foto_medidor)
      // Mesclar fotos salvas anteriores com as novas fotos retornadas pelo backend (garantindo unicidade)
      const fotosAtualizadas = Array.from(new Set([...fotosSalvas, ...fotosDoRetorno]))
      const metadadosSalvos = Array.isArray(updated.fotos_metadados)
        ? (updated.fotos_metadados as FotoMetadadoItem[])
        : metadadosConsolidados
      const updatedComFotos: OrdemServico = {
        ...updated,
        fotos: fotosAtualizadas.length > 0 ? fotosAtualizadas : fotosDoRetorno,
        fotos_metadados: metadadosSalvos,
      }
      setFotosSalvas(fotosAtualizadas.length > 0 ? fotosAtualizadas : fotosDoRetorno)
      setFotosMetadados(metadadosSalvos)
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
    const list = Array.isArray(equipamentosUsina)
      ? equipamentosUsina.filter((ue) => ue?.expand?.equipamento_id?.tipo === 'inversor')
      : []
    if (list.length > 0) {
      return list.map((ue) => {
        const eq = ue.expand?.equipamento_id
        const datasheetUrl =
          (eq?.datasheet_pdf ? pb.files.getURL(eq, eq.datasheet_pdf) : null) ||
          eq?.datasheet_url ||
          usinaVinculada?.datasheet_inversor_url ||
          null
        const dataloggerUrl =
          eq?.datalogger_url ||
          usinaVinculada?.monitoramento_datalogger_url ||
          cliente?.monitoramento_datalogger_url ||
          null

        const configMonitoramento = eq ? encontrarConfigMonitoramentoInversor(eq, eq?.marca) : null

        return {
          id: ue.id,
          marca: eq?.marca,
          modelo: eq?.modelo,
          potencia_w: eq?.potencia_w,
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
    const list = Array.isArray(equipamentosUsina)
      ? equipamentosUsina.filter((ue) => ue?.expand?.equipamento_id?.tipo === 'modulo_fv')
      : []
    if (list.length > 0) {
      return list.map((ue) => {
        const eq = ue.expand?.equipamento_id
        const datasheetUrl =
          (eq?.datasheet_pdf ? pb.files.getURL(eq, eq.datasheet_pdf) : null) ||
          eq?.datasheet_url ||
          usinaVinculada?.datasheet_modulo_url ||
          null

        return {
          id: ue.id,
          marca: eq?.marca,
          modelo: eq?.modelo,
          potencia_w: eq?.potencia_w,
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
      const checklistAtual = checklistRef.current?.length > 0 ? checklistRef.current : checklist

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
          checklist: checklistAtual,
          detalhes_execucao: detalhesExecucao,
          pendencias_recomendacoes: pendenciasRecomendacoes.trim(),
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

      const blocosFinalizacao = Array.isArray(os.blocos_relatorio) ? os.blocos_relatorio : undefined
      const metadadosConsolidados = compilarMetadadosFinais()

      const finalized = await finalizarOrdemServico(os.id, {
        checklist: checklistAtual,
        detalhes_execucao: detalhesExecucao,
        ...(blocosFinalizacao !== undefined ? { blocos_relatorio: blocosFinalizacao } : {}),
        pendencias_recomendacoes: pendenciasRecomendacoes.trim(),
        fotos_metadados: metadadosConsolidados,
        newPhotos: filesToUpload.length > 0 ? filesToUpload : undefined,
        relatorioPdfFile,
        cliente_id: os.cliente_id,
        tipo_servico: os.tipo_servico,
        tecnico_nome: os.atribuida_a,
        origem: os.origem,
      })

      const fotosDoRetorno = normalizarFotosIniciais(
        finalized.fotos,
        (finalized as any)?.foto_medidor,
      )
      const fotosAtualizadas = Array.from(new Set([...fotosSalvas, ...fotosDoRetorno]))
      const metadadosFinalizados = Array.isArray(finalized.fotos_metadados)
        ? (finalized.fotos_metadados as FotoMetadadoItem[])
        : metadadosConsolidados
      const finalizedComFotos: OrdemServico = {
        ...finalized,
        fotos: fotosAtualizadas.length > 0 ? fotosAtualizadas : fotosDoRetorno,
        fotos_metadados: metadadosFinalizados,
      }
      setFotosSalvas(fotosAtualizadas.length > 0 ? fotosAtualizadas : fotosDoRetorno)
      setFotosMetadados(metadadosFinalizados)
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
  const checklistRenderizado = Array.isArray(checklist) ? checklist : []
  const totalItens = checklistRenderizado.length
  const concluidosCount = checklistRenderizado.filter((c) => Boolean(c?.concluido)).length
  const progressoPct = totalItens > 0 ? Math.round((concluidosCount / totalItens) * 100) : 0
  const totalFotosContador =
    (Array.isArray(fotosSalvas) ? fotosSalvas.length : 0) +
    (Array.isArray(novasFotos) ? novasFotos.length : 0)

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-24">
      {/* Barra de Navegação Superior Sticky da Ficha (compacta, sem espaço extra) */}
      <div className="bg-white rounded-xl px-3 py-2 border border-gray-200 shadow-2xs flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            title="Voltar para Lista"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setModalExcluirAberto(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors shadow-2xs cursor-pointer"
              title="Excluir ordem de serviço / atividade"
              aria-label="Excluir ordem de serviço / atividade"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {os.status === 'concluida' && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-2 py-0.5 text-[11px]">
              <CheckCircle2 className="w-3 h-3 mr-1 text-[#16A34A]" />
              OS Concluída
            </Badge>
          )}

          {isInstalador && (
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors shadow-2xs"
              title="Sair do sistema"
              aria-label="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span>Sair</span>
            </button>
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
                          rotulo="Monitoramento"
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
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              3. Checklist de Execução
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {/* Indicador discreto de salvamento automático do checklist */}
            {checklistSaveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                <span>Salvando...</span>
              </span>
            )}
            {checklistSaveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full transition-opacity">
                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                <span>Salvo</span>
              </span>
            )}
            {checklistSaveStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-full">
                <span>Erro ao salvar</span>
              </span>
            )}
            <span className="text-xs font-bold text-gray-600">
              {concluidosCount} de {totalItens} concluídos ({progressoPct}%)
            </span>
          </div>
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

        {/* Inputs ocultos globais para acionamento via botões por etapa */}
        <input
          ref={checklistCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleChecklistPhotoCaptured}
        />
        <input
          ref={checklistFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleChecklistPhotoCaptured}
        />

        {/* Lista de Itens do Checklist com Botões Grandes para Toque Mobile e Ações de Foto por Etapa */}
        <div className="space-y-2.5">
          {checklistRenderizado.map((item, index) => {
            const isChecked = Boolean(item?.concluido)
            const itemId = item.id || `item-${index}`

            // Contagem de fotos vinculadas a este item específico do checklist
            const countSalvasEtapa = fotosMetadados.filter(
              (m) => m.item_checklist_id === item.id,
            ).length
            const countNovasEtapa = novasFotos.filter(
              (nf) => nf.item_checklist_id === item.id,
            ).length
            const totalFotosEtapa = countSalvasEtapa + countNovasEtapa

            return (
              <div
                key={itemId}
                onClick={() => {
                  if (podeEditarOS) handleToggleChecklist(item.id)
                }}
                className={`w-full text-left p-3 sm:p-3.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 select-none ${
                  !podeEditarOS ? 'cursor-default opacity-85' : 'cursor-pointer'
                } ${
                  isChecked
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold shadow-2xs'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                }`}
              >
                {/* Lado esquerdo: checkbox e texto da etapa */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                      isChecked
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-2xs'
                        : 'bg-white border-gray-300 text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div className="flex items-center gap-2 min-w-0 flex-wrap flex-1">
                    <span
                      className={`text-xs sm:text-sm ${isChecked ? 'line-through text-gray-600' : ''}`}
                    >
                      {item.item}
                    </span>
                    {/* Badge discreta de contagem de fotos vinculadas à etapa */}
                    {totalFotosEtapa > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0"
                        title={`${totalFotosEtapa} foto(s) vinculada(s) a esta etapa`}
                      >
                        <Camera className="w-3 h-3 text-emerald-700" />
                        <span>{totalFotosEtapa}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Lado direito: botões rápidos de foto da etapa (câmera + anexo) */}
                {podeEditarOS && (
                  <div
                    className="flex items-center gap-1 shrink-0 ml-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={isUploadingFoto}
                      onClick={(e) => handleTirarFotoChecklistItem(item.id, e)}
                      className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      title={`Tirar foto na hora para: "${item.item}"`}
                      aria-label="Tirar foto na hora com a câmera"
                    >
                      {isUploadingFoto && uploadingEtapaId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingFoto}
                      onClick={(e) => handleAnexarFotosChecklistItem(item.id, e)}
                      className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-700 text-slate-600 hover:text-white border border-slate-200 hover:border-slate-700 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      title={`Anexar fotos do dispositivo para: "${item.item}"`}
                      aria-label="Anexar fotos da galeria ou arquivos"
                    >
                      {isUploadingFoto && uploadingEtapaId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
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
          <span className="text-xs text-gray-500">{totalFotosContador} foto(s) anexada(s)</span>
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
              disabled={isUploadingFoto}
              onClick={() => cameraInputRef.current?.click()}
              className="h-10 px-3.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white font-semibold text-xs sm:text-sm shadow-2xs flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploadingFoto && !uploadingEtapaId ? (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 shrink-0" />
              )}
              <span>
                {isUploadingFoto && !uploadingEtapaId ? 'Salvando foto...' : 'Tirar foto (câmera)'}
              </span>
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
              disabled={isUploadingFoto}
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-3.5 rounded-xl border-gray-300 hover:border-emerald-600 hover:bg-emerald-50 text-gray-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploadingFoto && !uploadingEtapaId ? (
                <Loader2 className="w-4 h-4 text-emerald-700 shrink-0 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-emerald-700 shrink-0" />
              )}
              <span>Escolher da galeria</span>
            </Button>
          </div>
        )}

        {/* Grade de Fotos (Salvas + Novas) com Seletor de Vínculo a Etapa */}
        {fotosSalvas.length > 0 || novasFotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-2">
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

              // Metadado existente para esta foto salva
              const metadadoFoto = fotosMetadados.find(
                (m) => m.arquivo === fotoNome || m.id === fotoNome,
              )
              const etapaVinculadaId = metadadoFoto?.item_checklist_id || ''

              return (
                <div
                  key={`saved-${idx}`}
                  className="flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xs transition-shadow hover:shadow-sm"
                >
                  <div className="relative group aspect-square bg-gray-100 overflow-hidden">
                    <img
                      src={fileUrl}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay no hover com link para abrir foto e botão para remover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white text-xs font-bold underline pointer-events-auto px-2 py-1 bg-black/40 rounded-md hover:bg-black/60"
                      >
                        Ver foto
                      </a>
                    </div>

                    {/* Botão de lixeira (excluir foto salva) no canto superior direito com overlay no hover */}
                    {podeEditarOS && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFotoParaRemover(fotoNome)
                        }}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer z-10"
                        title="Remover foto da ordem de serviço"
                        aria-label="Remover foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <span className="absolute bottom-1.5 right-1.5 bg-black/65 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded pointer-events-none">
                      Salva
                    </span>

                    {/* Indicador visual se já tem etapa vinculada */}
                    {etapaVinculadaId && (
                      <span className="absolute top-1.5 left-1.5 bg-emerald-700/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs max-w-[80%] truncate">
                        {metadadoFoto?.item_checklist_texto || 'Vinculada'}
                      </span>
                    )}
                  </div>

                  {/* Seletor de vínculo a etapa do checklist */}
                  <div className="p-2 bg-slate-50 border-t border-gray-100 flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Vínculo à etapa:
                    </label>
                    <select
                      value={etapaVinculadaId}
                      onChange={(e) => handleVincularFotoSalva(fotoNome, e.target.value)}
                      disabled={!podeEditarOS}
                      className="w-full text-[11px] py-1 px-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 font-medium focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed truncate"
                      title="Vincular a etapa do checklist"
                    >
                      <option value="">Sem vínculo / foto geral</option>
                      {checklistRenderizado.map((chk, chkIdx) => (
                        <option key={chk.id || `chk-saved-${chkIdx}`} value={chk.id}>
                          {chkIdx + 1}. {chk.item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}

            {/* Novas Fotos da Sessão */}
            {novasFotos.map((nf, idx) => {
              const etapaNovaId = nf.item_checklist_id || ''

              return (
                <div
                  key={`new-${idx}`}
                  className="flex flex-col rounded-xl overflow-hidden border-2 border-emerald-500 bg-white shadow-2xs transition-shadow hover:shadow-sm"
                >
                  <div className="relative group aspect-square bg-gray-100 overflow-hidden">
                    <img
                      src={nf.previewUrl}
                      alt={`Nova foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoverNovaFoto(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors z-10 cursor-pointer"
                      title="Remover foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1.5 right-1.5 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Nova
                    </span>

                    {/* Indicador visual se já tem etapa vinculada */}
                    {etapaNovaId && (
                      <span className="absolute top-1.5 left-1.5 bg-emerald-700/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs max-w-[80%] truncate">
                        {nf.item_checklist_texto || 'Vinculada'}
                      </span>
                    )}
                  </div>

                  {/* Seletor de vínculo a etapa do checklist para novas fotos */}
                  <div className="p-2 bg-emerald-50/60 border-t border-emerald-100 flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                      Vínculo à etapa:
                    </label>
                    <select
                      value={etapaNovaId}
                      onChange={(e) => handleVincularNovaFoto(idx, e.target.value)}
                      disabled={!podeEditarOS}
                      className="w-full text-[11px] py-1 px-1.5 rounded-lg border border-emerald-200 bg-white text-gray-800 font-medium focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed truncate"
                      title="Vincular a etapa do checklist"
                    >
                      <option value="">Sem vínculo / foto geral</option>
                      {checklistRenderizado.map((chk, chkIdx) => (
                        <option key={chk.id || `chk-new-${chkIdx}`} value={chk.id}>
                          {chkIdx + 1}. {chk.item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
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

      {/* 6. PENDÊNCIAS E RECOMENDAÇÕES */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              6. Pendências e Recomendações
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Observações técnicas e pendências operacionais para o cliente no relatório final.
            </p>
          </div>
          <span className="text-[11px] text-gray-400">
            {pendenciasRecomendacoes.length} caracteres
          </span>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          Se preenchido, este texto livre substituirá a mensagem padrão de conformidade no relatório
          final entregue ao cliente.
        </p>
        <Textarea
          value={pendenciasRecomendacoes}
          onChange={(e) => setPendenciasRecomendacoes(e.target.value)}
          disabled={!podeEditarOS}
          placeholder="Ex: Identificado conector MC4 com leve oxidação no módulo 12; recomendamos substituição na próxima visita preventiva. Módulos limpos com sucesso, sem pendências operacionais imediatas."
          className="min-h-[100px] text-xs sm:text-sm bg-gray-50/70 border-gray-200 rounded-xl leading-relaxed p-3.5 focus:bg-white resize-y disabled:opacity-75 disabled:cursor-not-allowed"
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
                {/* Botão Oficial Baixar como PDF usando @react-pdf/renderer */}
                <React.Suspense fallback={null}>
                  <LazyBotaoBaixarRelatorioFicha
                    dados={{
                      os,
                      cliente,
                      sistema,
                    }}
                    className="rounded-full h-9 px-4 text-xs font-bold bg-[#C9A227] hover:bg-[#dbae26] text-[#0E2A47] border border-[#B38E1D] shadow-[0_4px_14px_rgba(201,162,39,0.35)] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                    rotulo="Baixar PDF"
                  />
                </React.Suspense>{' '}
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
                <div className="w-6 h-6 rounded-full bg-[#0E2A47] text-[#C9A227] font-black text-xs flex items-center justify-center">
                  D
                </div>
                <span className="text-sm font-bold text-slate-900">
                  Relatório de Atendimento e Condição do Sistema • OS #
                  {String(os?.id || '')
                    .slice(-6)
                    .toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 mr-6">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/relatorio-os-preview/' + os.id, '_blank')}
                  className="h-8 text-xs font-semibold text-[#0E2A47] border-[#DDE4EE] hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer rounded-lg"
                  title="Abrir também em nova guia"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova guia</span>
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-100">
              <RelatorioOSConteudo
                id={os.id}
                osProp={os}
                clienteProp={cliente}
                sistemaProp={sistema}
                showHeaderActions={true}
                requireAuth={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Envio Completo do Relatório ao Cliente (E-mail + WhatsApp) */}
      {modalEnviarRelatorioClienteAberto && (
        <React.Suspense fallback={null}>
          <LazyModalEnviarRelatorioCliente
            isOpen={modalEnviarRelatorioClienteAberto}
            onClose={() => setModalEnviarRelatorioClienteAberto(false)}
            os={os}
            cliente={cliente}
            sistema={sistema}
            onSuccess={() => {
              if (onOSUpdated) onOSUpdated(os)
            }}
          />
        </React.Suspense>
      )}

      {/* AlertDialog de Confirmação para Remover Foto Salva */}
      <AlertDialog
        open={Boolean(fotoParaRemover)}
        onOpenChange={(open) => {
          if (!open && !isRemovendoFotoSalva) {
            setFotoParaRemover(null)
          }
        }}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
              <span>Remover foto anexada</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-gray-600">
              Remover foto anexada? Esta ação não pode ser desfeita
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel
              disabled={isRemovendoFotoSalva}
              onClick={() => setFotoParaRemover(null)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmarRemoverFotoSalva()
              }}
              disabled={isRemovendoFotoSalva}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              {isRemovendoFotoSalva ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Removendo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Remover Foto</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de Confirmação para Excluir OS/Atividade (Apenas Admin) */}
      {isAdmin && (
        <AlertDialog
          open={modalExcluirAberto}
          onOpenChange={(open) => {
            if (!open && !isExcluindoOS) setModalExcluirAberto(false)
          }}
        >
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
                <span>Excluir Ordem de Serviço</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm text-gray-600">
                Deseja realmente excluir a{' '}
                <strong className="text-gray-900 font-semibold">
                  Ordem de Serviço #{typeof os?.id === 'string' ? os.id.slice(0, 8) : ''} —{' '}
                  {cliente?.nome || cliente?.razao_social || os?.endereco || 'Cliente Solar'}
                </strong>
                ? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-2">
              <AlertDialogCancel
                disabled={isExcluindoOS}
                onClick={() => setModalExcluirAberto(false)}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirmarExclusaoOS()
                }}
                disabled={isExcluindoOS}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold inline-flex items-center gap-2 cursor-pointer focus:ring-red-600"
              >
                {isExcluindoOS ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
