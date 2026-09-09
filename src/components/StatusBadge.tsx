import React from 'react'
import {
  UserPlus,
  Search,
  FileText,
  Handshake,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from 'lucide-react'

import type { ProdutoTipo } from '@/types/crm'

export interface FunilEtapaConfig {
  label: string
  shortLabel: string
  icon: LucideIcon
  iconColorClass: string
  badgeClass: string
}

export const FUNIL_ETAPAS_CONFIG: Record<string, FunilEtapaConfig> = {
  'Novo Lead': {
    label: '1 - Novo Lead',
    shortLabel: 'Novo Lead',
    icon: UserPlus,
    iconColorClass: 'text-slate-500',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  Levantamento: {
    label: '2 - Levantamento',
    shortLabel: 'Levantamento',
    icon: Search,
    iconColorClass: 'text-sky-500',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  Orçamento: {
    label: '3 - Orçamento',
    shortLabel: 'Orçamento',
    icon: FileText,
    iconColorClass: 'text-indigo-500',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  Negociação: {
    label: '4 - Negociação',
    shortLabel: 'Negociação',
    icon: Handshake,
    iconColorClass: 'text-amber-500',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
  },
  Fechado: {
    label: '5 - Fechado',
    shortLabel: 'Fechado',
    icon: CheckCircle2,
    iconColorClass: 'text-[#16A34A]',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  'Contato Futuro': {
    label: '6 - Contato Futuro',
    shortLabel: 'Contato Futuro',
    icon: Clock,
    iconColorClass: 'text-gray-400',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
  },
}

export interface ProductBadgeProps {
  produto?: ProdutoTipo | string
  className?: string
  size?: 'sm' | 'md'
}

export const ProductBadge: React.FC<ProductBadgeProps> = ({
  produto = 'Energia Solar',
  className = '',
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  switch (produto) {
    case 'Energia Solar':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
          Energia Solar
        </span>
      )
    case 'Manutenção avulsa':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 shrink-0" />
          Manutenção avulsa
        </span>
      )
    case 'Plano de O&M':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-blue-50 text-blue-800 border border-blue-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 shrink-0" />
          Plano de O&M
        </span>
      )
    case 'Sistemas Híbridos':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-purple-50 text-purple-800 border border-purple-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5 shrink-0" />
          Sistemas Híbridos
        </span>
      )
    case 'Carregadores veiculares':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-1.5 shrink-0" />
          Carregadores veiculares
        </span>
      )
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-gray-50 text-gray-700 border border-gray-200 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5 shrink-0" />
          {produto || 'Energia Solar'}
        </span>
      )
  }
}

export interface StatusBadgeProps {
  status: string
  className?: string
  showIcon?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  // Se for uma das 6 etapas do funil comercial
  const funilConfig = FUNIL_ETAPAS_CONFIG[status]
  if (funilConfig) {
    const Icon = funilConfig.icon
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${funilConfig.badgeClass} ${className}`}
      >
        {showIcon && <Icon className={`w-3.5 h-3.5 shrink-0 ${funilConfig.iconColorClass}`} />}
        <span>{funilConfig.shortLabel}</span>
      </span>
    )
  }

  // Status de Manutenção e legados
  switch (status) {
    case 'Agendado':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 ${className}`}
        >
          Agendado
        </span>
      )
    case 'Em andamento':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
        >
          Em andamento
        </span>
      )
    case 'Concluído':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#16A34A]" />}
          <span>Concluído</span>
        </span>
      )
    // Compatibilidade com valores legados
    case 'Lead':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 ${className}`}
        >
          {showIcon && <UserPlus className="w-3.5 h-3.5 shrink-0 text-slate-500" />}
          <span>Lead</span>
        </span>
      )
    case 'Orçamento Enviado':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 ${className}`}
        >
          {showIcon && <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-500" />}
          <span>Orçamento Enviado</span>
        </span>
      )
    case 'Proposta':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-200 ${className}`}
        >
          {showIcon && <FileText className="w-3.5 h-3.5 shrink-0 text-teal-600" />}
          <span>Proposta</span>
        </span>
      )
    case 'Perdido':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 ${className}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
          <span>Perdido</span>
        </span>
      )
    default:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}
        >
          {status}
        </span>
      )
  }
}
