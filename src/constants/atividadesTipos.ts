import type React from 'react'
import {
  PhoneCall,
  Users,
  Clock,
  Hammer,
  FileCheck,
  Droplets,
  Gauge,
  UserPlus,
  Wifi,
  ShieldCheck,
  BarChart3,
  RotateCcw,
  FileText,
  ArrowRightLeft,
  CalendarCheck,
  Wrench,
  UserCheck,
  Briefcase,
  FileSpreadsheet,
  Layers,
  Sparkles,
  MessageSquare,
  Zap,
  Settings,
  Cpu,
  Camera,
} from 'lucide-react'
import type { AtividadeTipo, AtividadeCategoriaId } from '@/types/crm'

export interface CategoriaAtividadeDef {
  id: AtividadeCategoriaId
  nome: string
  descricao: string
  corHex: string
  badgeClass: string
  icon: React.ComponentType<{ className?: string }>
}

export const CATEGORIAS_ATIVIDADES: CategoriaAtividadeDef[] = [
  {
    id: 'comercial',
    nome: 'Atividades Comerciais',
    descricao: 'Prospecção, reuniões, propostas e negociação de vendas',
    corHex: '#2563EB',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Briefcase,
  },
  {
    id: 'manutencao',
    nome: 'Atividades de Manutenção',
    descricao: 'Instalação, limpeza técnica, telemetria e garantia de campo',
    corHex: '#0284C7',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Wrench,
  },
  {
    id: 'administrativo_pos_venda',
    nome: 'Atividades Administrativas / RGE / Pós-Venda',
    descricao: 'Protocolos de concessionária, relatórios de geração e titularidade',
    corHex: '#059669',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: FileSpreadsheet,
  },
]

export interface TipoAtividadeDef {
  id: AtividadeTipo
  categoria: AtividadeCategoriaId
  tituloPadrao: string
  descricaoAjuda: string
  corHex: string
  badgeClass: string
  iconBg: string
  iconText: string
  borderClass: string
  icon: React.ComponentType<{ className?: string }>
  isPadrao?: boolean
  customRecordId?: string
  valor_base?: number
  valor_por_placa?: number
}

// 1. "Atividades Comerciais":
//    Entrar em contato, Reunião Presencial, Follow-up, Proposta, Solicitar indicação, Reativar Cliente.
// 2. "Atividades de Manutenção":
//    Instalação, Limpeza e Manutenção, Configuração Datalogger, Garantia de equipamento.
// 3. "Atividades Administrativas / RGE / Pós-Venda":
//    Auto Leitura - RGE, Relatório Solarview, Anexo G, Troca de Titularidade, Transferência de Créditos.

export const ATIVIDADES_PADRAO: TipoAtividadeDef[] = [
  // --- Categoria 1: Atividades Comerciais ---
  {
    id: 'contato_ligacao',
    categoria: 'comercial',
    tituloPadrao: 'Entrar em contato',
    descricaoAjuda: 'Chamada telefônica ou contato inicial com o cliente',
    corHex: '#2563EB',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
    iconText: 'text-blue-600',
    borderClass: 'border-blue-400',
    icon: PhoneCall,
    isPadrao: true,
  },
  {
    id: 'reuniao_presencial',
    categoria: 'comercial',
    tituloPadrao: 'Reunião Presencial',
    descricaoAjuda: 'Encontro presencial na sede da Delfos ou local do cliente',
    corHex: '#7C3AED',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
    iconText: 'text-purple-600',
    borderClass: 'border-purple-400',
    icon: Users,
    isPadrao: true,
  },
  {
    id: 'follow_up',
    categoria: 'comercial',
    tituloPadrao: 'Follow-up',
    descricaoAjuda: 'Acompanhamento do status da negociação ou proposta enviada',
    corHex: '#F59E0B',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
    iconText: 'text-amber-600',
    borderClass: 'border-amber-400',
    icon: Clock,
    isPadrao: true,
  },
  {
    id: 'proposta',
    categoria: 'comercial',
    tituloPadrao: 'Proposta',
    descricaoAjuda: 'Elaboração, envio ou revisão de proposta técnica-comercial',
    corHex: '#0D9488',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    iconBg: 'bg-teal-100 text-teal-800 border-teal-200',
    iconText: 'text-teal-600',
    borderClass: 'border-teal-400',
    icon: FileCheck,
    isPadrao: true,
  },
  {
    id: 'ligar_indicacao',
    categoria: 'comercial',
    tituloPadrao: 'Solicitar indicação',
    descricaoAjuda: 'Contato com cliente satisfeito solicitando recomendações',
    corHex: '#EA580C',
    badgeClass: 'bg-amber-50 text-orange-700 border-orange-200',
    iconBg: 'bg-orange-100 text-orange-700 border-orange-200',
    iconText: 'text-orange-600',
    borderClass: 'border-orange-400',
    icon: UserPlus,
    isPadrao: true,
  },
  {
    id: 'contato_reativacao',
    categoria: 'comercial',
    tituloPadrao: 'Reativar Cliente',
    descricaoAjuda: 'Retomada de leads antigos, renegociação de tarifas ou upgrades',
    corHex: '#475569',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    iconBg: 'bg-slate-100 text-slate-800 border-slate-300',
    iconText: 'text-slate-600',
    borderClass: 'border-slate-400',
    icon: RotateCcw,
    isPadrao: true,
  },
  {
    id: 'oferecer_limpeza_avulsa',
    categoria: 'comercial',
    tituloPadrao: 'Oferecer Limpeza Avulsa',
    descricaoAjuda:
      'Oferta comercial proativa de limpeza periódica de módulos fotovoltaicos via WhatsApp',
    corHex: '#16A34A',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-600',
    borderClass: 'border-emerald-400',
    icon: Sparkles,
    isPadrao: true,
    valor_base: 350.0,
  },
  {
    id: 'mensagem_enviada',
    categoria: 'comercial',
    tituloPadrao: 'Mensagem Enviada',
    descricaoAjuda:
      'Envio individual de mensagem de WhatsApp via Z-API registrado automaticamente no CRM',
    corHex: '#0284C7',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
    iconBg: 'bg-sky-100 text-sky-800 border-sky-200',
    iconText: 'text-sky-700',
    borderClass: 'border-sky-500',
    icon: MessageSquare,
    isPadrao: true,
  },

  // --- Categoria 2: Atividades de Manutenção ---
  {
    id: 'instalacao',
    categoria: 'manutencao',
    tituloPadrao: 'Instalação',
    descricaoAjuda: 'Início, acompanhamento ou vistoria de montagem do gerador fotovoltaico',
    corHex: '#16A34A',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-600',
    borderClass: 'border-emerald-400',
    icon: Hammer,
    isPadrao: true,
    valor_base: 350,
  },
  {
    id: 'limpeza',
    categoria: 'manutencao',
    tituloPadrao: 'Limpeza dos Módulos',
    descricaoAjuda: 'Lavagem técnica dos módulos solares fotovoltaicos',
    corHex: '#0284C7',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-800 border-sky-200',
    iconText: 'text-sky-600',
    borderClass: 'border-sky-400',
    icon: Droplets,
    isPadrao: true,
    valor_base: 250,
    valor_por_placa: 12.5,
  },
  {
    id: 'manutencao_preventiva',
    categoria: 'manutencao',
    tituloPadrao: 'Manutenção Preventiva',
    descricaoAjuda: 'Inspeção periódica, reaperto elétrico, termografia e checagem de fixadores',
    corHex: '#D97706',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-800 border-amber-200',
    iconText: 'text-amber-600',
    borderClass: 'border-amber-400',
    icon: Wrench,
    isPadrao: true,
    valor_base: 300,
  },
  {
    id: 'manutencao_corretiva',
    categoria: 'manutencao',
    tituloPadrao: 'Manutenção Corretiva',
    descricaoAjuda: 'Reparo emergencial, troca de componentes, conectores MC4 ou inversor em falha',
    corHex: '#DC2626',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    iconBg: 'bg-red-100 text-red-700 border-red-200',
    iconText: 'text-red-600',
    borderClass: 'border-red-400',
    icon: Wrench,
    isPadrao: true,
    valor_base: 350,
  },

  {
    id: 'configuracao_datalogger',
    categoria: 'manutencao',
    tituloPadrao: 'Configuração Datalogger',
    descricaoAjuda: 'Configuração de antena Wi-Fi, inversor e telemetria em nuvem',
    corHex: '#4F46E5',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    iconText: 'text-indigo-600',
    borderClass: 'border-indigo-400',
    icon: Wifi,
    isPadrao: true,
    valor_base: 180,
  },
  {
    id: 'garantia_equipamento',
    categoria: 'manutencao',
    tituloPadrao: 'Garantia de equipamento',
    descricaoAjuda: 'Acionamento de assistência técnica, RMA ou garantia de fábrica',
    corHex: '#DC2626',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    iconBg: 'bg-red-100 text-red-700 border-red-200',
    iconText: 'text-red-600',
    borderClass: 'border-red-400',
    icon: ShieldCheck,
    isPadrao: true,
    valor_base: 0,
  },

  // --- Categoria 3: Atividades Administrativas / RGE / Pós-Venda ---
  {
    id: 'analise_fatura',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Análise de Fatura',
    descricaoAjuda:
      'Auditoria completa de fatura de energia RGE com IA Gemini: tarifas, GD, saldo, impostos e relatório acionável',
    corHex: '#059669',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-700',
    borderClass: 'border-emerald-500',
    icon: Sparkles,
    isPadrao: true,
  },
  {
    id: 'auto_leitura_rge',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Auto Leitura - RGE',
    descricaoAjuda: 'Conferência de relógio bidirecional e créditos na concessionária',
    corHex: '#D97706',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    iconBg: 'bg-orange-100 text-orange-800 border-orange-200',
    iconText: 'text-orange-600',
    borderClass: 'border-orange-400',
    icon: Gauge,
    isPadrao: true,
  },
  {
    id: 'lembrete_auto_leitura',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Lembrete de Auto Leitura',
    descricaoAjuda: 'Lembrete programado 2 dias antes da data de auto leitura RGE',
    corHex: '#EA580C',
    badgeClass: 'bg-amber-50 text-orange-800 border-orange-200',
    iconBg: 'bg-orange-100 text-orange-800 border-orange-200',
    iconText: 'text-orange-600',
    borderClass: 'border-orange-400',
    icon: Clock,
    isPadrao: true,
  },
  {
    id: 'relatorio_solarview',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Relatório Solarview',
    descricaoAjuda: 'Extração e envio do balanço energético e economia mensal em PDF',
    corHex: '#059669',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-600',
    borderClass: 'border-emerald-400',
    icon: BarChart3,
    isPadrao: true,
  },
  {
    id: 'anexo_g',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Anexo G',
    descricaoAjuda: 'Formulário de solicitação de aumento de carga e pós-venda da concessionária',
    corHex: '#0284C7',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-800 border-sky-200',
    iconText: 'text-sky-600',
    borderClass: 'border-sky-400',
    icon: FileText,
    isPadrao: true,
  },
  {
    id: 'troca_titularidade',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Troca de Titularidade',
    descricaoAjuda: 'Formulário e termo de transferência de titularidade da unidade consumidora',
    corHex: '#0D9488',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    iconBg: 'bg-teal-100 text-teal-800 border-teal-200',
    iconText: 'text-teal-600',
    borderClass: 'border-teal-400',
    icon: UserCheck,
    isPadrao: true,
  },
  {
    id: 'transferencia_creditos',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Transferência de Créditos',
    descricaoAjuda: 'Rateio de créditos excedentes entre unidades consumidoras',
    corHex: '#10B981',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-600',
    borderClass: 'border-emerald-400',
    icon: ArrowRightLeft,
    isPadrao: true,
  },
  {
    id: 'gerar_procuracao',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Gerar Procuração O&M',
    descricaoAjuda:
      'Emissão e conferência da procuração particular para atos junto à concessionária',
    corHex: '#16A34A',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-600',
    borderClass: 'border-emerald-400',
    icon: FileText,
    isPadrao: true,
  },
  {
    id: 'gerar_contrato',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Gerar Contrato O&M',
    descricaoAjuda:
      'Emissão, conferência e assinatura do Contrato de Prestação de Serviços O&M com Anexos I e II',
    corHex: '#15803D',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-700',
    borderClass: 'border-emerald-500',
    icon: FileText,
    isPadrao: true,
  },
  {
    id: 'solicitar_contas_rge',
    categoria: 'administrativo_pos_venda',
    tituloPadrao: 'Email RGE',
    descricaoAjuda:
      'Envio oficial de solicitações, faturas, troca de titularidade e créditos à concessionária RGE',
    corHex: '#0284C7',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
    iconBg: 'bg-sky-100 text-sky-800 border-sky-200',
    iconText: 'text-sky-700',
    borderClass: 'border-sky-500',
    icon: FileText,
    isPadrao: true,
  },
]

// Mantemos o alias ATIVIDADES_12_TIPOS para garantir retrocompatibilidade com consumidores existentes
export const ATIVIDADES_12_TIPOS = ATIVIDADES_PADRAO

/** Normaliza string removendo acentos, pontuações, espaços excedentes e convertendo para lowercase */
export function normalizarNomeTipo(nome?: string): string {
  if (!nome || typeof nome !== 'string') return ''
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Deduplica uma lista mista de tipos de atividades (nativos + customizados).
 * Regra do CRM Delfos Solar: quando um tipo custom tiver nome normalizado igual a um nativo,
 * mostrar APENAS o custom (que carrega os valores, cor e checklist do usuário).
 * O nativo correspondente sai da lista.
 */
/** Mapeamento de aliases de nomes normalizados para tipos canônicos de manutenção */
export const ALIASES_TIPOS_CANONICOS: Record<string, string[]> = {
  limpeza: [
    'limpeza',
    'limpeza dos modulos',
    'limpeza de modulos',
    'limpeza e manutencao',
    'lavagem dos modulos',
    'lavagem de placas',
    'limpeza avulsa',
  ],
  manutencao_preventiva: ['manutencao preventiva', 'revisao preventiva', 'inspecao preventiva'],
  manutencao_corretiva: ['manutencao corretiva', 'reparo corretivo', 'correcao de falha'],
  instalacao: ['instalacao', 'montagem', 'visita tecnica'],
  configuracao_datalogger: ['configuracao datalogger', 'configuracao de datalogger', 'datalogger'],
  garantia_equipamento: [
    'garantia de equipamento',
    'garantia equipamento',
    'garantia rma',
    'garantia',
  ],
}

/**
 * Verifica se um nome customizado ou nativo corresponde ao mesmo tipo canônico
 */
export function correspondemAoMesmoTipo(nomeA?: string, nomeB?: string): boolean {
  const normA = normalizarNomeTipo(nomeA)
  const normB = normalizarNomeTipo(nomeB)
  if (!normA || !normB) return false
  if (normA === normB) return true

  for (const aliases of Object.values(ALIASES_TIPOS_CANONICOS)) {
    const matchA = aliases.some((al) => normA === al || normA.includes(al) || al.includes(normA))
    const matchB = aliases.some((al) => normB === al || normB.includes(al) || al.includes(normB))
    if (matchA && matchB) return true
  }
  return false
}

/**
 * Deduplica uma lista mista de tipos de atividades (nativos + customizados).
 * Regra do CRM Delfos Solar: quando um tipo custom tiver nome normalizado igual a um nativo
 * ou cobrir o alias canônico dele (ex: "Limpeza dos Módulos" ↔ "Limpeza e Manutenção" ↔ "Limpeza"),
 * mostrar APENAS o custom (que carrega os valores, cor e checklist do usuário).
 * O nativo correspondente sai da lista.
 */
export function deduplicarTiposAtividades(
  padroes: TipoAtividadeDef[],
  customs: TipoAtividadeDef[],
): TipoAtividadeDef[] {
  // Filtra nativos cujo nome coincida direta ou semanticamente com um custom
  const padroesFiltrados = padroes.filter((p) => {
    const normP = normalizarNomeTipo(p.tituloPadrao)
    const sobrescrito = customs.some((c) => {
      const normC = normalizarNomeTipo(c.tituloPadrao)
      if (!normC) return false
      if (normC === normP) return true
      if (p.categoria === c.categoria && correspondemAoMesmoTipo(p.tituloPadrao, c.tituloPadrao)) {
        return true
      }
      return false
    })
    return !sobrescrito
  })

  return [...customs, ...padroesFiltrados]
}

/**
 * Encontra o registro correspondente em tipos_atividades_custom para uma atividade ou OS,
 * respeitando estritamente a prioridade canônica:
 * 1. tipo_custom_id explícito
 * 2. tipo='custom' com match de nome normalizado
 * 3. tipo canônico (ex: 'limpeza', 'limpeza_manutencao', 'manutencao_preventiva', etc.)
 *    com match por alias ou nome normalizado do padrão
 * 4. tipo_servico com match por alias ou normalização
 */
export function encontrarMatchTipoCustom(
  params: {
    tipo_custom_id?: string | null
    tipo?: string | null
    tipo_servico?: string | null
    categoria?: string | null
  },
  tiposCustom: Array<{
    id: string
    nome: string
    categoria?: string
    checklist?: unknown
    orientacoes_tecnicas?: string
  }>,
): {
  id: string
  nome: string
  categoria?: string
  checklist?: unknown
  orientacoes_tecnicas?: string
} | null {
  if (!Array.isArray(tiposCustom) || tiposCustom.length === 0) return null

  const tipoCustomId = String(params.tipo_custom_id || '').trim()
  if (tipoCustomId) {
    const byId = tiposCustom.find((t) => t && t.id === tipoCustomId)
    if (byId) return byId
  }

  const tipoCanonico = String(params.tipo || '')
    .trim()
    .toLowerCase()
  const tipoServico = String(params.tipo_servico || '').trim()
  const nomeServicoNorm = normalizarNomeTipo(tipoServico)

  // Se o tipo for 'custom', buscar por nome normalizado
  if (tipoCanonico === 'custom' && nomeServicoNorm) {
    const byName = tiposCustom.find((t) => normalizarNomeTipo(t?.nome) === nomeServicoNorm)
    if (byName) return byName
  }

  // Se houver tipo canônico nativo (ex: limpeza, limpeza_manutencao, manutencao_preventiva)
  if (tipoCanonico) {
    const nativoMatch = ATIVIDADES_PADRAO.find(
      (p) => p.id === tipoCanonico || (tipoCanonico === 'limpeza_manutencao' && p.id === 'limpeza'),
    )
    const nomePadrao = nativoMatch?.tituloPadrao || ''

    // 1º: match exato de nome normalizado
    if (nomePadrao) {
      const normPadrao = normalizarNomeTipo(nomePadrao)
      const exato = tiposCustom.find((t) => normalizarNomeTipo(t?.nome) === normPadrao)
      if (exato) return exato
    }

    // 2º: match via aliases canônicos
    const matchAlias = tiposCustom.find((t) => {
      if (nomePadrao && correspondemAoMesmoTipo(t?.nome, nomePadrao)) return true
      if (tipoCanonico === 'limpeza' || tipoCanonico === 'limpeza_manutencao') {
        const norm = normalizarNomeTipo(t?.nome)
        return (
          norm.includes('limpeza') ||
          norm.includes('lavagem') ||
          norm === 'limpeza dos modulos' ||
          norm === 'limpeza e manutencao'
        )
      }
      return false
    })
    if (matchAlias) return matchAlias
  }

  // Fallback por tipo_servico normalizado ou alias
  if (nomeServicoNorm) {
    const byServicoNorm = tiposCustom.find((t) => normalizarNomeTipo(t?.nome) === nomeServicoNorm)
    if (byServicoNorm) return byServicoNorm

    const byServicoAlias = tiposCustom.find((t) => correspondemAoMesmoTipo(t?.nome, tipoServico))
    if (byServicoAlias) return byServicoAlias
  }

  return null
}

// Retorna tipos padrão agrupados por categoria com deduplicação (custom prevalece sobre nativo)
export function getTiposPorCategoria(
  categoriaId: AtividadeCategoriaId,
  tiposCustom: TipoAtividadeDef[] = [],
): TipoAtividadeDef[] {
  const padroes = ATIVIDADES_PADRAO.filter((t) => t.categoria === categoriaId)
  const custom = tiposCustom.filter((t) => t.categoria === categoriaId)
  return deduplicarTiposAtividades(padroes, custom)
}

// Mapeamento dinâmico de ícones por chave para tipos personalizados e editados
const ICON_LOOKUP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wrench,
  Settings,
  Hammer,
  Droplets,
  Zap,
  ShieldCheck,
  Wifi,
  Cpu,
  Camera,
  PhoneCall,
  Users,
  Clock,
  UserPlus,
  UserCheck,
  Gauge,
  BarChart3,
  FileText,
  ArrowRightLeft,
  RotateCcw,
  Briefcase,
  FileSpreadsheet,
  Layers,
  Sparkles,
  MessageSquare,
}

// Construtor auxiliar de TipoAtividadeDef para tipos personalizados ou sobrescritos
export function buildCustomTipoDef(record: {
  id: string
  nome: string
  categoria: AtividadeCategoriaId
  cor?: string
  icone?: string
  descricao?: string
  is_padrao?: boolean
  valor_base?: number
  valor_por_placa?: number
}): TipoAtividadeDef {
  const catDef = CATEGORIAS_ATIVIDADES.find((c) => c.id === record.categoria)
  const corHex = record.cor || catDef?.corHex || '#16A34A'
  const resolvedIcon = (record.icone && ICON_LOOKUP[record.icone]) || Sparkles

  return {
    id: `custom_${record.id}`,
    categoria: record.categoria,
    tituloPadrao: record.nome,
    descricaoAjuda: record.descricao || `Tipo personalizado em ${catDef?.nome || 'Atividades'}`,
    corHex,
    badgeClass: 'bg-gray-50 text-gray-800 border-gray-200',
    iconBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-700',
    borderClass: 'border-emerald-400',
    icon: resolvedIcon,
    isPadrao: Boolean(record.is_padrao),
    customRecordId: record.id,
    valor_base: typeof record.valor_base === 'number' ? record.valor_base : undefined,
    valor_por_placa:
      typeof record.valor_por_placa === 'number' ? record.valor_por_placa : undefined,
  }
}

// Mapeamento e fallback para tipos legados e dinâmicos
/**
 * Mensagem canônica exigida no CRM para atividades que demandam vinculação de usina.
 */
export const MSG_USINA_OBRIGATORIA =
  'A usina é obrigatória para atividades de manutenção e administrativas'

/**
 * Retorna true se a categoria informada corresponder a manutenção ou administrativa
 * (aceita os aliases 'manutencao', 'administrativo_pos_venda' e 'administrativa').
 */
export function isCategoriaManutencaoOuAdministrativa(
  categoria?: AtividadeCategoriaId | string | null,
): boolean {
  if (!categoria) return false
  const c = String(categoria).trim().toLowerCase()
  return (
    c === 'manutencao' ||
    c === 'manutenção' ||
    c === 'administrativo_pos_venda' ||
    c === 'administrativa' ||
    c === 'administrativas'
  )
}

export function getTipoAtividadeConfig(
  tipo: AtividadeTipo | string,
  tiposCustom: TipoAtividadeDef[] = [],
): TipoAtividadeDef {
  const allTipos = [...ATIVIDADES_PADRAO, ...tiposCustom]
  const found = allTipos.find(
    (t) => t.id === tipo || t.tituloPadrao.toLowerCase() === (tipo || '').toLowerCase(),
  )
  if (found) return found

  // Aliases e retrocompatibilidade com bancos legados
  switch (tipo) {
    case 'ligacao':
      return ATIVIDADES_PADRAO[0] // Entrar em contato
    case 'reuniao':
      return ATIVIDADES_PADRAO[1] // Reunião Presencial
    case 'limpeza_manutencao':
      // Blindagem para histórico antigo: mapeia para Limpeza dos Módulos
      return (
        ATIVIDADES_PADRAO.find((t) => t.id === 'limpeza') || {
          id: 'limpeza',
          categoria: 'manutencao',
          tituloPadrao: 'Limpeza dos Módulos',
          descricaoAjuda: 'Lavagem técnica dos painéis solares para ganho de geração',
          corHex: '#0284C7',
          badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
          iconBg: 'bg-sky-100 text-sky-800 border-sky-200',
          iconText: 'text-sky-600',
          borderClass: 'border-sky-400',
          icon: Droplets,
          isPadrao: true,
          valor_base: 250,
          valor_por_placa: 12.5,
        }
      )
    case 'anotacao':
      return {
        id: 'anotacao',
        categoria: 'administrativo_pos_venda',
        tituloPadrao: 'Anotação',
        descricaoAjuda: 'Nota interna sobre o cliente',
        corHex: '#F59E0B',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
        iconText: 'text-amber-600',
        borderClass: 'border-amber-400',
        icon: FileText,
        isPadrao: true,
      }
    case 'visita_tecnica':
      return {
        id: 'instalacao',
        categoria: 'manutencao',
        tituloPadrao: 'Visita Técnica',
        descricaoAjuda: 'Vistoria e atendimento técnico no local',
        corHex: '#16A34A',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        iconText: 'text-emerald-600',
        borderClass: 'border-emerald-400',
        icon: Hammer,
        isPadrao: true,
      }
    case 'mudanca_estagio':
      return {
        id: 'mudanca_estagio',
        categoria: 'comercial',
        tituloPadrao: 'Mudança de Estágio',
        descricaoAjuda: 'Avanço ou retorno no funil comercial',
        corHex: '#6366F1',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        iconText: 'text-indigo-600',
        borderClass: 'border-indigo-400',
        icon: ArrowRightLeft,
        isPadrao: true,
      }
    default:
      return {
        id: (tipo as AtividadeTipo) || 'contato_ligacao',
        categoria: 'comercial',
        tituloPadrao: tipo || 'Atividade',
        descricaoAjuda: 'Atividade agendada',
        corHex: '#16A34A',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        iconText: 'text-emerald-600',
        borderClass: 'border-emerald-400',
        icon: CalendarCheck,
        isPadrao: false,
      }
  }
}
