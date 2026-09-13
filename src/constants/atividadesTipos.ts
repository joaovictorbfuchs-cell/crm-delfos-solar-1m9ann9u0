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
  },
  {
    id: 'limpeza_manutencao',
    categoria: 'manutencao',
    tituloPadrao: 'Limpeza e Manutenção',
    descricaoAjuda: 'Lavagem das placas solares, reaperto elétrico ou preventiva',
    corHex: '#0284C7',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-800 border-sky-200',
    iconText: 'text-sky-600',
    borderClass: 'border-sky-400',
    icon: Droplets,
    isPadrao: true,
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
  },

  // --- Categoria 3: Atividades Administrativas / RGE / Pós-Venda ---
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
]

// Mantemos o alias ATIVIDADES_12_TIPOS para garantir retrocompatibilidade com consumidores existentes
export const ATIVIDADES_12_TIPOS = ATIVIDADES_PADRAO

// Retorna tipos padrão agrupados por categoria
export function getTiposPorCategoria(
  categoriaId: AtividadeCategoriaId,
  tiposCustom: TipoAtividadeDef[] = [],
): TipoAtividadeDef[] {
  const padroes = ATIVIDADES_PADRAO.filter((t) => t.categoria === categoriaId)
  const custom = tiposCustom.filter((t) => t.categoria === categoriaId)
  return [...padroes, ...custom]
}

// Construtor auxiliar de TipoAtividadeDef para tipos personalizados criados em tempo de execução
export function buildCustomTipoDef(record: {
  id: string
  nome: string
  categoria: AtividadeCategoriaId
  cor?: string
  descricao?: string
}): TipoAtividadeDef {
  const catDef = CATEGORIAS_ATIVIDADES.find((c) => c.id === record.categoria)
  const corHex = record.cor || catDef?.corHex || '#16A34A'

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
    icon: Sparkles,
    isPadrao: false,
    customRecordId: record.id,
  }
}

// Mapeamento e fallback para tipos legados e dinâmicos
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
