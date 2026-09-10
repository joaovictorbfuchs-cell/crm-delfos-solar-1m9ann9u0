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
} from 'lucide-react'
import type { AtividadeTipo } from '@/types/crm'

export interface TipoAtividadeDef {
  id: AtividadeTipo
  tituloPadrao: string
  descricaoAjuda: string
  corHex: string
  badgeClass: string
  iconBg: string
  iconText: string
  borderClass: string
  icon: React.ComponentType<{ className?: string }>
}

export const ATIVIDADES_12_TIPOS: TipoAtividadeDef[] = [
  {
    id: 'contato_ligacao',
    tituloPadrao: 'Entrar em contato',
    descricaoAjuda: 'Chamada telefônica ou contato inicial com o cliente',
    corHex: '#2563EB', // Blue
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
    iconText: 'text-blue-600',
    borderClass: 'border-blue-400',
    icon: PhoneCall,
  },
  {
    id: 'reuniao_presencial',
    tituloPadrao: 'Reunião Presencial',
    descricaoAjuda: 'Encontro presencial na sede da Delfos ou local do cliente',
    corHex: '#7C3AED', // Purple
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
    iconText: 'text-purple-600',
    borderClass: 'border-purple-400',
    icon: Users,
  },
  {
    id: 'follow_up',
    tituloPadrao: 'Follow-up',
    descricaoAjuda: 'Acompanhamento do status da negociação ou proposta enviada',
    corHex: '#F59E0B', // Amber
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
    iconText: 'text-amber-600',
    borderClass: 'border-amber-400',
    icon: Clock,
  },
  {
    id: 'instalacao',
    tituloPadrao: 'Instalação',
    descricaoAjuda: 'Início, acompanhamento ou vistoria de montagem do gerador fotovoltaico',
    corHex: '#16A34A', // Green solar
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-600',
    borderClass: 'border-emerald-400',
    icon: Hammer,
  },
  {
    id: 'proposta',
    tituloPadrao: 'Proposta',
    descricaoAjuda: 'Elaboração, envio ou revisão de proposta técnica-comercial',
    corHex: '#0D9488', // Teal
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    iconBg: 'bg-teal-100 text-teal-800 border-teal-200',
    iconText: 'text-teal-600',
    borderClass: 'border-teal-400',
    icon: FileCheck,
  },
  {
    id: 'limpeza_manutencao',
    tituloPadrao: 'Limpeza e Manutenção',
    descricaoAjuda: 'Lavagem das placas solares, reaperto elétrico ou preventiva',
    corHex: '#0284C7', // Sky
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-800 border-sky-200',
    iconText: 'text-sky-600',
    borderClass: 'border-sky-400',
    icon: Droplets,
  },
  {
    id: 'auto_leitura_rge',
    tituloPadrao: 'Auto Leitura - RGE',
    descricaoAjuda: 'Conferência de relógio bidirecional e créditos na concessionária',
    corHex: '#D97706', // Warm amber / orange
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    iconBg: 'bg-orange-100 text-orange-800 border-orange-200',
    iconText: 'text-orange-600',
    borderClass: 'border-orange-400',
    icon: Gauge,
  },
  {
    id: 'ligar_indicacao',
    tituloPadrao: 'Solicitar indicação',
    descricaoAjuda: 'Contato com cliente satisfeito solicitando recomendações',
    corHex: '#EA580C', // Orange Red
    badgeClass: 'bg-amber-50 text-orange-700 border-orange-200',
    iconBg: 'bg-orange-100 text-orange-700 border-orange-200',
    iconText: 'text-orange-600',
    borderClass: 'border-orange-400',
    icon: UserPlus,
  },
  {
    id: 'configuracao_datalogger',
    tituloPadrao: 'Configuração Datalogger',
    descricaoAjuda: 'Configuração de antena Wi-Fi, inversor e telemetria em nuvem',
    corHex: '#4F46E5', // Indigo
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    iconText: 'text-indigo-600',
    borderClass: 'border-indigo-400',
    icon: Wifi,
  },
  {
    id: 'garantia_equipamento',
    tituloPadrao: 'Garantia de equipamento',
    descricaoAjuda: 'Acionamento de assistência técnica, RMA ou garantia de fábrica',
    corHex: '#DC2626', // Red
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    iconBg: 'bg-red-100 text-red-700 border-red-200',
    iconText: 'text-red-600',
    borderClass: 'border-red-400',
    icon: ShieldCheck,
  },
  {
    id: 'relatorio_solarview',
    tituloPadrao: 'Relatório Solarview',
    descricaoAjuda: 'Extração e envio do balanço energético e economia mensal em PDF',
    corHex: '#059669', // Emerald
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconText: 'text-emerald-600',
    borderClass: 'border-emerald-400',
    icon: BarChart3,
  },
  {
    id: 'contato_reativacao',
    tituloPadrao: 'Reativar Cliente',
    descricaoAjuda: 'Retomada de leads antigos, renegociação de tarifas ou upgrades',
    corHex: '#475569', // Slate
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    iconBg: 'bg-slate-100 text-slate-800 border-slate-300',
    iconText: 'text-slate-600',
    borderClass: 'border-slate-400',
    icon: RotateCcw,
  },
]

// Mapeamento e fallback para tipos legados
export function getTipoAtividadeConfig(tipo: AtividadeTipo | string): TipoAtividadeDef {
  const found = ATIVIDADES_12_TIPOS.find((t) => t.id === tipo)
  if (found) return found

  // Aliases e retrocompatibilidade
  switch (tipo) {
    case 'ligacao':
      return ATIVIDADES_12_TIPOS[0] // Entrar em contato
    case 'reuniao':
      return ATIVIDADES_12_TIPOS[1] // Reunião Presencial
    case 'proposta':
      return ATIVIDADES_12_TIPOS[4] // Proposta
    case 'visita_tecnica':
      return ATIVIDADES_12_TIPOS[3] // Instalação / técnica
    case 'anotacao':
      return {
        id: 'anotacao',
        tituloPadrao: 'Anotação',
        descricaoAjuda: 'Nota interna sobre o cliente',
        corHex: '#F59E0B',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
        iconText: 'text-amber-600',
        borderClass: 'border-amber-400',
        icon: FileText,
      }
    case 'mudanca_estagio':
      return {
        id: 'mudanca_estagio',
        tituloPadrao: 'Mudança de Estágio',
        descricaoAjuda: 'Avanço ou retorno no funil comercial',
        corHex: '#6366F1',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        iconText: 'text-indigo-600',
        borderClass: 'border-indigo-400',
        icon: ArrowRightLeft,
      }
    default:
      return {
        id: (tipo as AtividadeTipo) || 'contato_ligacao',
        tituloPadrao: tipo || 'Atividade',
        descricaoAjuda: 'Atividade agendada',
        corHex: '#16A34A',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        iconText: 'text-emerald-600',
        borderClass: 'border-emerald-400',
        icon: CalendarCheck,
      }
  }
}
