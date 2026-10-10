import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CATEGORIAS_ATIVIDADES,
  ATIVIDADES_PADRAO,
  normalizarNomeTipo,
  correspondemAoMesmoTipo,
  type TipoAtividadeDef,
} from '@/constants/atividadesTipos'
import { toast } from 'sonner'
import { useClientes } from '@/contexts/ClientesContext'
import type {
  AtividadeCategoriaId,
  CatalogoTipoExecucao,
  TipoAtividadeChecklistItem,
  TipoAtividadeCustomItem,
} from '@/types/crm'
import {
  Loader2,
  CheckCircle2,
  Users,
  Building2,
  DollarSign,
  Calendar,
  Upload,
  FileCheck,
  X,
  Palette,
  PhoneCall,
  Clock,
  Hammer,
  Droplets,
  Gauge,
  UserPlus,
  Wifi,
  ShieldCheck,
  BarChart3,
  RotateCcw,
  FileText,
  ArrowRightLeft,
  Wrench,
  UserCheck,
  Sparkles,
  Zap,
  Settings,
  Cpu,
  Camera,
  Layers,
  Briefcase,
  FileSpreadsheet,
  CheckSquare,
  Plus,
  Trash2,
  ExternalLink,
  Link2,
} from 'lucide-react'

// Ícones disponíveis para seleção no tipo de atividade
export const ICONES_DISPONIVEIS: Array<{
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: 'Wrench', label: 'Chave', icon: Wrench },
  { id: 'Settings', label: 'Engrenagem', icon: Settings },
  { id: 'Hammer', label: 'Martelo', icon: Hammer },
  { id: 'Droplets', label: 'Limpeza / Água', icon: Droplets },
  { id: 'Zap', label: 'Eletricidade', icon: Zap },
  { id: 'ShieldCheck', label: 'Escudo / Garantia', icon: ShieldCheck },
  { id: 'Wifi', label: 'Datalogger / Wi-Fi', icon: Wifi },
  { id: 'Cpu', label: 'Inversor / Placa', icon: Cpu },
  { id: 'Camera', label: 'Drone / Imagem', icon: Camera },
  { id: 'PhoneCall', label: 'Telefone', icon: PhoneCall },
  { id: 'Users', label: 'Equipe / Reunião', icon: Users },
  { id: 'Clock', label: 'Relógio / Follow-up', icon: Clock },
  { id: 'UserPlus', label: 'Novo Contato / Indicação', icon: UserPlus },
  { id: 'UserCheck', label: 'Titularidade / Usuário', icon: UserCheck },
  { id: 'Gauge', label: 'Medidor / Leitura', icon: Gauge },
  { id: 'BarChart3', label: 'Gráfico / Solarview', icon: BarChart3 },
  { id: 'FileText', label: 'Documento / Anexo', icon: FileText },
  { id: 'ArrowRightLeft', label: 'Transferência', icon: ArrowRightLeft },
  { id: 'RotateCcw', label: 'Reativação', icon: RotateCcw },
  { id: 'Briefcase', label: 'Comercial', icon: Briefcase },
  { id: 'FileSpreadsheet', label: 'Planilha / RGE', icon: FileSpreadsheet },
  { id: 'Layers', label: 'Camadas', icon: Layers },
  { id: 'Sparkles', label: 'Especial / Personalizado', icon: Sparkles },
]

export const CORES_PALETA = [
  { hex: '#16A34A', nome: 'Verde Esmeralda' },
  { hex: '#059669', nome: 'Verde Escuro' },
  { hex: '#15803D', nome: 'Verde Floresta' },
  { hex: '#0284C7', nome: 'Azul Céu' },
  { hex: '#2563EB', nome: 'Azul Delfos' },
  { hex: '#4F46E5', nome: 'Índigo' },
  { hex: '#7C3AED', nome: 'Roxo' },
  { hex: '#8B5CF6', nome: 'Violeta' },
  { hex: '#D97706', nome: 'Âmbar / Laranja' },
  { hex: '#EA580C', nome: 'Laranja Vivo' },
  { hex: '#DC2626', nome: 'Vermelho' },
  { hex: '#475569', nome: 'Cinza Ardósia' },
]

/**
 * Retorna os itens de checklist padrão de referência para uma atividade padrão do sistema
 * caso ela ainda não tenha sido customizada ou salva no banco com checklist próprio.
 */
export function obterChecklistPadraoPorAtividade(
  titulo?: string,
  id?: string,
): TipoAtividadeChecklistItem[] {
  const t = (titulo || '').toLowerCase()
  const i = (id || '').toLowerCase()

  // 1. Limpeza e Manutenção (lavagem de placas solares)
  // Atenção: nunca usar termos genéricos como "placas" ou "manutenção" sozinhos aqui,
  // pois atinge atividades como "manutenção corretiva", "vistoria pós granizo", etc.
  if (
    t.includes('limpeza') ||
    t.includes('lavagem') ||
    i.includes('limpeza') ||
    i.includes('lavagem')
  ) {
    return [
      {
        id: 'chk_limp_1',
        texto: 'Chegou no local da usina e realizou análise de segurança',
        concluido: false,
      },
      {
        id: 'chk_limp_2',
        texto: 'Verificou estado físico das placas, trincas e grau de sujidade',
        concluido: false,
      },
      {
        id: 'chk_limp_3',
        texto: 'Limpou módulos com água desmineralizada e escova macia anti-risco',
        concluido: false,
      },
      {
        id: 'chk_limp_4',
        texto: 'Verificou integridade dos conectores MC4 e fixadores da estrutura',
        concluido: false,
      },
      {
        id: 'chk_limp_5',
        texto: 'Verificou status e conexões do inversor/stringbox',
        concluido: false,
      },
      {
        id: 'chk_limp_6',
        texto: 'Testou geração instantânea e sincronismo com a rede',
        concluido: false,
      },
    ]
  }

  // 2. Instalação
  if (t.includes('instalação') || t.includes('instalacao') || i.includes('instalacao')) {
    return [
      {
        id: 'chk_inst_1',
        texto: 'Conferiu lista de materiais, equipamentos e projeto executivo',
        concluido: false,
      },
      {
        id: 'chk_inst_2',
        texto: 'Fixou suportes e perfis na estrutura do telhado com vedação adequada',
        concluido: false,
      },
      {
        id: 'chk_inst_3',
        texto: 'Instalou módulos com alinhamento e torque correto',
        concluido: false,
      },
      {
        id: 'chk_inst_4',
        texto: 'Conectou inversor, stringbox, proteções CC/CA e aterramento',
        concluido: false,
      },
      {
        id: 'chk_inst_5',
        texto: 'Testou parâmetros elétricos (Voc, Isc), comissionamento e funcionamento',
        concluido: false,
      },
    ]
  }

  // 3. Manutenção Preventiva / Revisão
  if (t.includes('preventiva') || t.includes('revisão') || t.includes('revisao')) {
    return [
      {
        id: 'chk_prev_1',
        texto: 'Inspeção visual geral da usina, telhado e cabeamento solar',
        concluido: false,
      },
      {
        id: 'chk_prev_2',
        texto: 'Inspeção termográfica em módulos, conexões e quadros elétricos',
        concluido: false,
      },
      {
        id: 'chk_prev_3',
        texto: 'Reaperto de bornes e parafusos com chave dinamométrica / torquímetro',
        concluido: false,
      },
      {
        id: 'chk_prev_4',
        texto: 'Limpeza de filtros e dissipadores do inversor',
        concluido: false,
      },
      {
        id: 'chk_prev_5',
        texto: 'Medição de resistência de isolamento e continuidade do aterramento',
        concluido: false,
      },
    ]
  }

  // 4. Manutenção Corretiva
  if (t.includes('corretiva')) {
    return [
      {
        id: 'chk_corr_1',
        texto: 'Desligar lados CC e CA e aguardar descarga capacitiva de segurança',
        concluido: false,
      },
      {
        id: 'chk_corr_2',
        texto: 'Aferir ausência de tensão com multímetro categoria CAT III/IV',
        concluido: false,
      },
      {
        id: 'chk_corr_3',
        texto: 'Diagnosticar falha e registrar códigos de erro/alarmes do equipamento',
        concluido: false,
      },
      {
        id: 'chk_corr_4',
        texto: 'Realizar substituição ou reparo dos componentes avariados',
        concluido: false,
      },
      {
        id: 'chk_corr_5',
        texto: 'Religar sistema e validar retorno pleno da operação',
        concluido: false,
      },
    ]
  }

  // 5. Configuração Datalogger
  if (t.includes('datalogger') || i.includes('datalogger')) {
    return [
      {
        id: 'chk_data_1',
        texto: 'Conectou datalogger na porta de comunicação do inversor',
        concluido: false,
      },
      {
        id: 'chk_data_2',
        texto: 'Acessou rede local do datalogger via celular / app de setup',
        concluido: false,
      },
      {
        id: 'chk_data_3',
        texto: 'Configurou credenciais da rede Wi-Fi 2.4GHz do cliente',
        concluido: false,
      },
      {
        id: 'chk_data_4',
        texto: 'Registrou planta e serial no portal de monitoramento',
        concluido: false,
      },
      {
        id: 'chk_data_5',
        texto: 'Validou fluxo de dados e geração visível no app',
        concluido: false,
      },
    ]
  }

  // 6. Garantia de Equipamento
  if (t.includes('garantia') || i.includes('garantia')) {
    return [
      {
        id: 'chk_gar_1',
        texto: 'Fotografou plaqueta do equipamento e número de série (SN)',
        concluido: false,
      },
      {
        id: 'chk_gar_2',
        texto: 'Registrou códigos de falhas e alarmes ativos no display/app',
        concluido: false,
      },
      {
        id: 'chk_gar_3',
        texto: 'Aferiu tensão Voc e corrente Isc de entrada CC',
        concluido: false,
      },
      {
        id: 'chk_gar_4',
        texto: 'Aferiu tensão e frequência de saída CA da rede',
        concluido: false,
      },
      {
        id: 'chk_gar_5',
        texto: 'Preencheu laudo técnico fotográfico para abertura de RMA',
        concluido: false,
      },
    ]
  }

  // 7. Auto Leitura RGE
  if (t.includes('auto leitura') || t.includes('leitura') || i.includes('leitura')) {
    return [
      {
        id: 'chk_leit_1',
        texto: 'Conferir código do medidor bidirecional da distribuidora',
        concluido: false,
      },
      {
        id: 'chk_leit_2',
        texto: 'Registrar leitura de consumo ativo (código 03)',
        concluido: false,
      },
      {
        id: 'chk_leit_3',
        texto: 'Registrar leitura de energia injetada excedente (código 103)',
        concluido: false,
      },
      {
        id: 'chk_leit_4',
        texto: 'Fotografar display do medidor com data e hora nítidas',
        concluido: false,
      },
    ]
  }

  return []
}

export interface AtividadeParaEdicao {
  // Se for um item de tipos_atividades_custom existente
  customItem?: TipoAtividadeCustomItem
  // Se for uma atividade padrão de ATIVIDADES_PADRAO
  padraoDef?: TipoAtividadeDef
}

interface ModalEditarTipoAtividadeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  atividadeParaEditar?: TipoAtividadeCustomItem | null
  padraoParaEditar?: TipoAtividadeDef | null
  tipoItem?: TipoAtividadeCustomItem | TipoAtividadeDef | null
  onSuccess?: () => void
}

export const ModalEditarTipoAtividade: React.FC<ModalEditarTipoAtividadeProps> = ({
  open,
  onOpenChange,
  atividadeParaEditar: atividadeParaEditarProp,
  padraoParaEditar: padraoParaEditarProp,
  tipoItem,
  onSuccess,
}) => {
  const {
    updateTipoAtividadeCustom,
    addTipoAtividadeCustom,
    refreshTiposAtividadesCustom,
    tiposAtividadesCustom,
  } = useClientes()

  // Unifica suporte a tipoItem ou atividadeParaEditar/padraoParaEditar
  let atividadeParaEditar =
    atividadeParaEditarProp ||
    (tipoItem && 'id' in tipoItem && !('tituloPadrao' in tipoItem)
      ? (tipoItem as TipoAtividadeCustomItem)
      : null)
  const padraoParaEditar =
    padraoParaEditarProp ||
    (tipoItem && 'tituloPadrao' in tipoItem ? (tipoItem as TipoAtividadeDef) : null)

  // Se recebemos padraoParaEditar sem atividadeParaEditar, tentamos localizar registro existente em tiposAtividadesCustom
  if (!atividadeParaEditar && padraoParaEditar && tiposAtividadesCustom) {
    const nomePadraoNorm = normalizarNomeTipo(padraoParaEditar.tituloPadrao)
    const match = tiposAtividadesCustom.find((t) => {
      if (t.categoria !== padraoParaEditar.categoria) return false
      const nomeCustomNorm = normalizarNomeTipo(t.nome)
      if (nomeCustomNorm === nomePadraoNorm) return true
      if (correspondemAoMesmoTipo(t.nome, padraoParaEditar.tituloPadrao)) {
        return true
      }
      return false
    })
    if (match) {
      atividadeParaEditar = match
    }
  }

  // Prevenir que um registro customizado herdasse checklist de limpeza indevidamente
  // se o customItem não tiver nada a ver com limpeza

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState<AtividadeCategoriaId>('comercial')
  const [cor, setCor] = useState('#16A34A')
  const [icone, setIcone] = useState('Wrench')
  const [descricao, setDescricao] = useState('')
  const [valorBase, setValorBase] = useState('')
  const [valorPorPlaca, setValorPorPlaca] = useState('')
  const [frequenciaMeses, setFrequenciaMeses] = useState('0')
  const [tipoExecucao, setTipoExecucao] = useState<CatalogoTipoExecucao>('equipe_interna')
  const [orientacoesTecnicas, setOrientacoesTecnicas] = useState('')
  const [linksUteis, setLinksUteis] = useState('')
  // Checklist dinâmico
  const [checklistItems, setChecklistItems] = useState<TipoAtividadeChecklistItem[]>([])
  const [novoItemChecklist, setNovoItemChecklist] = useState('')
  // Links úteis dinâmicos
  const [listaLinksUteis, setListaLinksUteis] = useState<
    Array<{ id: string; titulo: string; url: string }>
  >([])
  const [novoLinkTitulo, setNovoLinkTitulo] = useState('')
  const [novoLinkUrl, setNovoLinkUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [ativo, setAtivo] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPadraoOriginal = Boolean(padraoParaEditar) || Boolean(atividadeParaEditar?.is_padrao)

  // Ao abrir o modal, preencher os campos com os valores atuais da atividade
  useEffect(() => {
    if (!open) return

    setFormError(null)
    setFormSuccess(false)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (atividadeParaEditar) {
      setNome(atividadeParaEditar.nome || '')
      setCategoria(atividadeParaEditar.categoria || 'comercial')
      setCor(atividadeParaEditar.cor || '#16A34A')
      setIcone(atividadeParaEditar.icone || 'Wrench')
      setDescricao(atividadeParaEditar.descricao || '')
      setValorBase(
        atividadeParaEditar.valor_base !== undefined && atividadeParaEditar.valor_base !== null
          ? String(atividadeParaEditar.valor_base)
          : '',
      )
      setValorPorPlaca(
        atividadeParaEditar.valor_por_placa !== undefined &&
          atividadeParaEditar.valor_por_placa !== null
          ? String(atividadeParaEditar.valor_por_placa)
          : '',
      )
      setFrequenciaMeses(
        atividadeParaEditar.frequencia_meses !== undefined &&
          atividadeParaEditar.frequencia_meses !== null
          ? String(atividadeParaEditar.frequencia_meses)
          : '0',
      )
      setTipoExecucao(atividadeParaEditar.tipo_execucao || 'equipe_interna')
      setOrientacoesTecnicas(atividadeParaEditar.orientacoes_tecnicas || '')
      setLinksUteis(atividadeParaEditar.links_uteis || '')
      setSelectedFileName(atividadeParaEditar.documento_modelo || '')
      setAtivo(atividadeParaEditar.ativo !== false)

      // Carregar checklist existente ou fallback para padrão de referência se for atividade padrão
      if (
        Array.isArray(atividadeParaEditar.checklist) &&
        atividadeParaEditar.checklist.length > 0
      ) {
        setChecklistItems(
          atividadeParaEditar.checklist.map((c, i) => ({
            id: c.id || `chk_${Date.now()}_${i}`,
            texto: (c as any).texto || (c as any).item || '',
            concluido: Boolean(c.concluido),
          })),
        )
      } else {
        // Se não houver checklist salvo no banco (array vazio ou null/undefined):
        // Só carrega o checklist padrão de referência se a atividade for explicitamente padrão (is_padrao)
        // E NÃO for uma atividade personalizada (atividades personalizadas cadastradas pelo usuário, mesmo contendo palavras-chave,
        // NÃO devem herdar checklist de outra atividade a menos que o usuário cadastre).
        // Além disso, se o usuário já limpou o checklist da atividade e ela salvou [] explicitamente no banco, respeitar vazio se não for padrão do sistema.
        const ehPadrao =
          atividadeParaEditar.is_padrao === true ||
          Boolean(padraoParaEditar) ||
          ATIVIDADES_PADRAO.some(
            (ap) =>
              ap.tituloPadrao.trim().toLowerCase() ===
                (atividadeParaEditar?.nome || '').trim().toLowerCase() ||
              (ap.categoria === (atividadeParaEditar?.categoria || padraoParaEditar?.categoria) &&
                ((atividadeParaEditar?.nome || '').toLowerCase().includes('limpeza') ||
                  (atividadeParaEditar?.nome || '').toLowerCase().includes('lavagem')) &&
                (ap.tituloPadrao.toLowerCase().includes('limpeza') ||
                  ap.tituloPadrao.toLowerCase().includes('lavagem'))),
          )

        if (ehPadrao) {
          const checksPadrao = obterChecklistPadraoPorAtividade(
            atividadeParaEditar.nome || padraoParaEditar?.tituloPadrao || '',
            atividadeParaEditar.id || padraoParaEditar?.id || '',
          )
          setChecklistItems(checksPadrao)
        } else {
          setChecklistItems([])
        }
      }
      setNovoItemChecklist('')

      // Carregar links úteis existentes
      if (atividadeParaEditar.links_uteis) {
        const linhas = atividadeParaEditar.links_uteis
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        const parseados: Array<{ id: string; titulo: string; url: string }> = []
        linhas.forEach((linha, i) => {
          if (linha.includes(' - http')) {
            const [t, ...resto] = linha.split(' - ')
            parseados.push({
              id: `link_${Date.now()}_${i}`,
              titulo: t.trim(),
              url: resto.join(' - ').trim(),
            })
          } else if (linha.startsWith('http://') || linha.startsWith('https://')) {
            parseados.push({
              id: `link_${Date.now()}_${i}`,
              titulo: `Link ${i + 1}`,
              url: linha,
            })
          } else {
            parseados.push({
              id: `link_${Date.now()}_${i}`,
              titulo: linha,
              url: '',
            })
          }
        })
        setListaLinksUteis(parseados)
      } else {
        setListaLinksUteis([])
      }
      setNovoLinkTitulo('')
      setNovoLinkUrl('')
    } else if (padraoParaEditar) {
      setNome(padraoParaEditar.tituloPadrao || '')
      setCategoria(padraoParaEditar.categoria || 'comercial')
      setCor(padraoParaEditar.corHex || '#16A34A')
      // Mapear o ícone pelo nome ou fallback
      const foundIcon = ICONES_DISPONIVEIS.find((i) => i.icon === padraoParaEditar.icon)
      setIcone(foundIcon ? foundIcon.id : 'Wrench')
      setDescricao(padraoParaEditar.descricaoAjuda || '')
      setValorBase(
        padraoParaEditar.valor_base !== undefined && padraoParaEditar.valor_base !== null
          ? String(padraoParaEditar.valor_base)
          : '',
      )
      setValorPorPlaca(
        padraoParaEditar.valor_por_placa !== undefined && padraoParaEditar.valor_por_placa !== null
          ? String(padraoParaEditar.valor_por_placa)
          : '',
      )
      setFrequenciaMeses('0')
      setTipoExecucao('equipe_interna')
      setOrientacoesTecnicas('')
      setLinksUteis('')

      // Carregar checklist padrão se a atividade padrão tiver um checklist padrão de referência
      const checksPadrao = obterChecklistPadraoPorAtividade(
        padraoParaEditar.tituloPadrao,
        padraoParaEditar.id,
      )
      setChecklistItems(checksPadrao)
      setNovoItemChecklist('')
      setListaLinksUteis([])
      setNovoLinkTitulo('')
      setNovoLinkUrl('')
      setSelectedFileName('')
      setAtivo(true)
    } else {
      // Modo criação / fallback
      setNome('')
      setCategoria('comercial')
      setCor('#16A34A')
      setIcone('Wrench')
      setDescricao('')
      setValorBase('')
      setValorPorPlaca('')
      setFrequenciaMeses('0')
      setTipoExecucao('equipe_interna')
      setOrientacoesTecnicas('')
      setLinksUteis('')
      setChecklistItems([])
      setNovoItemChecklist('')
      setListaLinksUteis([])
      setNovoLinkTitulo('')
      setNovoLinkUrl('')
      setSelectedFileName('')
      setAtivo(true)
    }
  }, [open, atividadeParaEditar, padraoParaEditar, tiposAtividadesCustom])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome.trim()) {
      setFormError('Por favor, informe o nome do tipo de atividade.')
      return
    }

    const numValor = valorBase.trim() ? parseFloat(valorBase.replace(',', '.')) : 0
    if (isNaN(numValor) || numValor < 0) {
      setFormError('Informe um valor base de referência válido (R$).')
      return
    }

    const numValorPlaca = valorPorPlaca.trim() ? parseFloat(valorPorPlaca.replace(',', '.')) : 0
    if (isNaN(numValorPlaca) || numValorPlaca < 0) {
      setFormError('Informe um valor por placa válido (R$) ou deixe em branco.')
      return
    }

    const numFreq = frequenciaMeses.trim() ? parseInt(frequenciaMeses, 10) : 0
    if (isNaN(numFreq) || numFreq < 0) {
      setFormError('Informe uma frequência válida em meses (ou 0 para sob demanda).')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      // Consolidar links_uteis: se houver itens na listaLinksUteis, formatar
      let linksConsolidados = linksUteis.trim()
      if (listaLinksUteis.length > 0) {
        linksConsolidados = listaLinksUteis
          .map((l) => (l.url ? `${l.titulo} - ${l.url}` : l.titulo))
          .join('\n')
      }

      const payload: any = {
        nome: nome.trim(),
        categoria,
        cor,
        icone,
        descricao: descricao.trim() || undefined,
        valor_base: numValor,
        valor_por_placa: numValorPlaca > 0 ? numValorPlaca : 0,
        frequencia_meses: numFreq,
        tipo_execucao: tipoExecucao,
        orientacoes_tecnicas: orientacoesTecnicas.trim() || undefined,
        links_uteis: linksConsolidados || undefined,
        checklist: checklistItems,
        ativo,
      }

      if (selectedFile) {
        payload.documento_modelo = selectedFile
      }

      // Localizar se já existe registro em tipos_atividades_custom para reaproveitar (evitando duplicatas POST)
      const nomeNormalizado = normalizarNomeTipo(nome)
      const idParaEditar =
        atividadeParaEditar?.id ||
        (tiposAtividadesCustom || []).find((t) => {
          const tNorm = normalizarNomeTipo(t.nome)
          if (tNorm === nomeNormalizado) return true
          if (
            correspondemAoMesmoTipo(t.nome, nome) ||
            (padraoParaEditar && correspondemAoMesmoTipo(t.nome, padraoParaEditar.tituloPadrao))
          ) {
            return true
          }
          if (
            padraoParaEditar &&
            t.categoria === categoria &&
            normalizarNomeTipo(padraoParaEditar.tituloPadrao) === tNorm
          ) {
            return true
          }
          return false
        })?.id

      if (idParaEditar) {
        // Registro já existente em tipos_atividades_custom -> PATCH (updateTipoAtividadeCustom)
        await updateTipoAtividadeCustom(idParaEditar, payload)
      } else {
        // Só cria quando não houver nenhum registro correspondente no banco
        await addTipoAtividadeCustom({
          ...payload,
          is_padrao: isPadraoOriginal,
        })
      }

      await refreshTiposAtividadesCustom()
      setFormSuccess(true)
      toast.success('Tipo de atividade atualizado')

      if (onSuccess) {
        onSuccess()
      }

      setTimeout(() => {
        setFormSuccess(false)
        onOpenChange(false)
      }, 700)
    } catch (err: unknown) {
      console.error('Erro ao salvar tipo de atividade:', err)
      const errorMsg =
        err instanceof Error ? err.message : 'Falha ao salvar as alterações do tipo de atividade.'
      setFormError(errorMsg)
      toast.error('Erro ao atualizar tipo de atividade', {
        description: errorMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const tituloModal =
    atividadeParaEditar || padraoParaEditar ? 'Editar Tipo de Atividade' : 'Novo Tipo de Atividade'

  const SelectedIconComponent = ICONES_DISPONIVEIS.find((i) => i.id === icone)?.icon || Wrench

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-slate-50 via-white to-amber-50/40">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl border shadow-xs"
              style={{
                backgroundColor: `${cor}15`,
                color: cor,
                borderColor: `${cor}40`,
              }}
            >
              <SelectedIconComponent className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">{tituloModal}</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                {isPadraoOriginal
                  ? 'Personalize o nome, categoria, orientações e parâmetros operacionais desta atividade padrão do sistema.'
                  : 'Configure nome, categoria, orientações técnicas e parâmetros do catálogo.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Nome da Atividade */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-nome" className="text-xs font-semibold text-gray-700">
              Nome da Atividade *
            </Label>
            <Input
              id="edit-nome"
              placeholder="Ex: Auditoria de Fatura, Vistoria Técnica In Loco..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="text-xs sm:text-sm bg-white font-medium"
              required
            />
          </div>

          {/* Categoria e Tipo de Execução */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-categoria" className="text-xs font-semibold text-gray-700">
                Categoria *
              </Label>
              <select
                id="edit-categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as AtividadeCategoriaId)}
                className="w-full text-xs sm:text-sm h-9 rounded-md border border-input bg-white px-3 py-1 text-gray-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              >
                {CATEGORIAS_ATIVIDADES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Tipo de Execução</Label>
              <select
                value={tipoExecucao}
                onChange={(e) => setTipoExecucao(e.target.value as CatalogoTipoExecucao)}
                className="w-full text-xs sm:text-sm h-9 rounded-md border border-input bg-white px-3 py-1 text-gray-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              >
                <option value="equipe_interna">Equipe Interna (Delfos)</option>
                <option value="fornecedor_externo">Fornecedor Externo / Terceiro</option>
              </select>
            </div>
          </div>

          {/* Ícone e Cor */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            {/* Escolha do Ícone */}
            <div className="sm:col-span-7 space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <span style={{ color: cor }}>
                  <SelectedIconComponent className="w-3.5 h-3.5" />
                </span>
                Ícone Lucide
              </Label>
              <div className="grid grid-cols-8 sm:grid-cols-7 gap-1 max-h-28 overflow-y-auto p-1 bg-white rounded-lg border border-gray-200">
                {ICONES_DISPONIVEIS.map((item) => {
                  const Icon = item.icon
                  const isSelected = icone === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcone(item.id)}
                      title={item.label}
                      className={`p-1.5 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600'
                          : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Escolha da Cor */}
            <div className="sm:col-span-5 space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                Cor de Identificação
              </Label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-white rounded-lg border border-gray-200">
                {CORES_PALETA.map((c) => {
                  const isSelected = cor.toLowerCase() === c.hex.toLowerCase()
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setCor(c.hex)}
                      title={c.nome}
                      className={`h-6 rounded-md transition-all flex items-center justify-center ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-gray-900 scale-105'
                          : 'hover:scale-95'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Valor Base, Valor por Placa e Frequência Recomendada */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-valor"
                className="text-xs font-semibold text-gray-700 flex items-center gap-1"
              >
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                Valor Base Sugerido (R$)
              </Label>
              <Input
                id="edit-valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 250,00"
                value={valorBase}
                onChange={(e) => setValorBase(e.target.value)}
                className="text-xs sm:text-sm bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-valor-placa"
                className="text-xs font-semibold text-gray-700 flex items-center gap-1"
              >
                <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                Valor por Placa (R$)
              </Label>
              <Input
                id="edit-valor-placa"
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional (Ex: 12,50)"
                value={valorPorPlaca}
                onChange={(e) => setValorPorPlaca(e.target.value)}
                className="text-xs sm:text-sm bg-white"
              />
              <p className="text-[10px] text-gray-400">Para serviços cobrados por módulo</p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-freq"
                className="text-xs font-semibold text-gray-700 flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Frequência (meses)
              </Label>
              <Input
                id="edit-freq"
                type="number"
                min="0"
                placeholder="0 = sob demanda"
                value={frequenciaMeses}
                onChange={(e) => setFrequenciaMeses(e.target.value)}
                className="text-xs sm:text-sm bg-white"
              />
            </div>
          </div>

          {/* Descrição / Instrução Breve */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc" className="text-xs font-semibold text-gray-700">
              Descrição / Instrução Breve
            </Label>
            <Input
              id="edit-desc"
              placeholder="Resumo exibido na lista e nos cards do CRM..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs sm:text-sm bg-white"
            />
          </div>

          {/* Orientações Técnicas */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-orientacoes" className="text-xs font-semibold text-gray-700">
              Orientações Técnicas de Execução
            </Label>
            <Textarea
              id="edit-orientacoes"
              rows={3}
              placeholder="Procedimentos técnicos, EPIs obrigatórios, cuidados com choque térmico, conferência de torques..."
              value={orientacoesTecnicas}
              onChange={(e) => setOrientacoesTecnicas(e.target.value)}
              className="text-xs bg-white resize-none"
            />
          </div>

          {/* Checklist Dinâmico de Padrão */}
          <div className="space-y-2 p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-amber-600" />
                <span>Checklist do Padrão ({checklistItems.length} itens)</span>
              </Label>
              <span className="text-[10px] text-amber-700 font-medium">
                Itens para conferência pela equipe técnica
              </span>
            </div>

            {/* Input para adicionar novo item ao checklist */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ex: Verificar aperto de conectores MC4..."
                value={novoItemChecklist}
                onChange={(e) => setNovoItemChecklist(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (novoItemChecklist.trim()) {
                      setChecklistItems((prev) => [
                        ...prev,
                        {
                          id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                          texto: novoItemChecklist.trim(),
                          concluido: false,
                        },
                      ])
                      setNovoItemChecklist('')
                    }
                  }
                }}
                className="text-xs bg-white"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (novoItemChecklist.trim()) {
                    setChecklistItems((prev) => [
                      ...prev,
                      {
                        id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        texto: novoItemChecklist.trim(),
                        concluido: false,
                      },
                    ])
                    setNovoItemChecklist('')
                  }
                }}
                disabled={!novoItemChecklist.trim()}
                className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Lista de itens do checklist */}
            {checklistItems.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {checklistItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-amber-200/80 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <Input
                        value={item.texto}
                        onChange={(e) => {
                          const novoTexto = e.target.value
                          setChecklistItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, texto: novoTexto } : it)),
                          )
                        }}
                        className="h-7 text-xs bg-transparent border-transparent hover:border-input focus:border-input focus:bg-white transition-colors text-gray-800 font-medium px-1.5"
                        placeholder="Descrição do check..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setChecklistItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors shrink-0 cursor-pointer"
                      title="Remover item do checklist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-amber-800/70 italic">
                Nenhum item adicionado ao checklist ainda. Digite acima e clique em Adicionar ou
                pressione Enter.
              </p>
            )}
          </div>

          {/* Links Úteis Dinâmicos */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-emerald-600" />
                <span>Links Úteis ({listaLinksUteis.length})</span>
              </Label>
              <span className="text-[10px] text-gray-500 font-medium">
                Normas, manuais e portais de suporte
              </span>
            </div>

            {/* Inclusão de novo link */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <Input
                  placeholder="Título (Ex: Manual Técnico)"
                  value={novoLinkTitulo}
                  onChange={(e) => setNovoLinkTitulo(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>
              <div className="sm:col-span-5">
                <Input
                  placeholder="URL (https://...)"
                  value={novoLinkUrl}
                  onChange={(e) => setNovoLinkUrl(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (novoLinkTitulo.trim() || novoLinkUrl.trim()) {
                      setListaLinksUteis((prev) => [
                        ...prev,
                        {
                          id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                          titulo: novoLinkTitulo.trim() || novoLinkUrl.trim(),
                          url: novoLinkUrl.trim(),
                        },
                      ])
                      setNovoLinkTitulo('')
                      setNovoLinkUrl('')
                    }
                  }}
                  disabled={!novoLinkTitulo.trim() && !novoLinkUrl.trim()}
                  className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Incluir
                </Button>
              </div>
            </div>

            {/* Lista de links cadastrados */}
            {listaLinksUteis.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {listaLinksUteis.map((lk, idx) => (
                  <div
                    key={lk.id || idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-gray-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-gray-800 truncate">{lk.titulo}</span>
                      {lk.url && (
                        <a
                          href={lk.url.startsWith('http') ? lk.url : `https://${lk.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-600 hover:underline flex items-center gap-0.5 truncate"
                        >
                          <span className="truncate max-w-[200px]">{lk.url}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setListaLinksUteis((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors shrink-0"
                      title="Remover link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documento Modelo (Anexo) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              Documento Modelo (Checklist, Manual ou Termo em PDF/Doc)
            </Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    if (f.size > 10 * 1024 * 1024) {
                      setFormError('Arquivo excede o limite de 10MB.')
                      return
                    }
                    setSelectedFile(f)
                    setSelectedFileName(f.name)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 text-xs bg-white"
              >
                <Upload className="w-3.5 h-3.5" />
                {selectedFileName ? 'Substituir arquivo' : 'Selecionar arquivo...'}
              </Button>

              {selectedFileName && (
                <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[220px]">{selectedFileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      setSelectedFileName('')
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Remover anexo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ativo no Sistema */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-ativo-check"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
            />
            <label
              htmlFor="edit-ativo-check"
              className="text-xs font-semibold text-gray-700 cursor-pointer"
            >
              Atividade ativa no sistema (disponível para novas ofertas e agendamentos)
            </label>
          </div>

          {formError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Atividade atualizada com sucesso!</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-gray-50 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !nome.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 h-9 px-5 shadow-xs"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando alterações...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Salvar Alterações
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
