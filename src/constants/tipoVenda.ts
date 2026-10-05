import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { SunMedium, Wrench, BatteryCharging, CarFront, Zap, DollarSign } from 'lucide-react'
import type { TipoVendaSelect } from '@/types/crm'

export const TIPOS_VENDA_OPTIONS: TipoVendaSelect[] = [
  'Energia Solar',
  'O&M (Operação e Manutenção)',
  'Baterias',
  'Carregadores Veículos Elétricos',
  'Créditos de energia',
]

/**
 * Ícone composto Raio (Zap, text-amber-500) sobreposto com Cifrão (DollarSign, text-emerald-600)
 * para representar a atividade 'Créditos de energia' solicitada pelo usuário.
 */
export const CreditosEnergiaIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => {
  return React.createElement(
    'span',
    {
      className: `relative inline-flex items-center justify-center shrink-0 ${className}`,
      'aria-label': 'Créditos de energia',
    },
    React.createElement(Zap, { className: 'w-full h-full text-amber-500 shrink-0' }),
    React.createElement(DollarSign, {
      className:
        'w-[68%] h-[68%] text-emerald-600 font-black absolute -bottom-0.5 -right-0.5 drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)] shrink-0',
    }),
  )
}

export interface TipoVendaConfig {
  label: TipoVendaSelect
  shortLabel: string
  descricao: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  // Cores Tailwind
  badgeClass: string
  iconClass: string
  cardBorderClass: string
  cardAccentClass: string
  dotClass: string
  bgLightClass: string
}

export const TIPOS_VENDA_CONFIG: Record<TipoVendaSelect, TipoVendaConfig> = {
  'Energia Solar': {
    label: 'Energia Solar',
    shortLabel: 'Solar',
    descricao: 'Sistemas fotovoltaicos on-grid, off-grid e híbridos',
    icon: SunMedium, // Ícone de raio solar / sol
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    cardBorderClass: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    cardAccentClass: 'bg-emerald-500',
    dotClass: 'bg-emerald-500',
    bgLightClass:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  'O&M (Operação e Manutenção)': {
    label: 'O&M (Operação e Manutenção)',
    shortLabel: 'O&M',
    descricao: 'Contratos e serviços de operação, manutenção e limpeza',
    icon: Wrench, // Ícone de ferramenta
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    iconClass: 'text-blue-600 dark:text-blue-400',
    cardBorderClass: 'hover:border-blue-400 dark:hover:border-blue-600',
    cardAccentClass: 'bg-blue-500',
    dotClass: 'bg-blue-500',
    bgLightClass: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300',
  },
  Baterias: {
    label: 'Baterias',
    shortLabel: 'Baterias',
    descricao: 'Armazenamento de energia, sistemas de backup e no-breaks solares',
    icon: BatteryCharging, // Ícone de bateria
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    iconClass: 'text-amber-600 dark:text-amber-400',
    cardBorderClass: 'hover:border-amber-400 dark:hover:border-amber-600',
    cardAccentClass: 'bg-amber-500',
    dotClass: 'bg-amber-500',
    bgLightClass:
      'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300',
  },
  'Carregadores Veículos Elétricos': {
    label: 'Carregadores Veículos Elétricos',
    shortLabel: 'Carregadores VE',
    descricao: 'Wallbox e estações de recarga para carros elétricos',
    icon: CarFront, // Ícone de recarga veicular / carro elétrico
    badgeClass:
      'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    iconClass: 'text-slate-600 dark:text-slate-300',
    cardBorderClass: 'hover:border-slate-400 dark:hover:border-slate-500',
    cardAccentClass: 'bg-slate-500',
    dotClass: 'bg-slate-500',
    bgLightClass:
      'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
  },
  'Créditos de energia': {
    label: 'Créditos de energia',
    shortLabel: 'Créditos',
    descricao: 'Gestão, venda e compensação de créditos de energia',
    icon: CreditosEnergiaIcon,
    badgeClass:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    cardBorderClass: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    cardAccentClass: 'bg-emerald-600',
    dotClass: 'bg-emerald-600',
    bgLightClass:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
}

/**
 * Normaliza qualquer variação de string cadastrada para uma das opções estritas.
 * Se vazio ou não reconhecido, retorna 'Energia Solar' como padrão amigável.
 */
export function normalizarTipoVenda(valor?: string | null): TipoVendaSelect {
  if (!valor) return 'Energia Solar'
  const v = valor.trim().toLowerCase()

  if (
    v.includes('crédito') ||
    v.includes('credito') ||
    v.includes('compensacao') ||
    v.includes('compensação')
  ) {
    return 'Créditos de energia'
  }

  if (
    v.includes('o&m') ||
    v.includes('manuten') ||
    v.includes('operacao') ||
    v.includes('operação')
  ) {
    return 'O&M (Operação e Manutenção)'
  }
  if (v.includes('bateria') || v.includes('armazenamento')) {
    return 'Baterias'
  }
  if (
    v.includes('veículo') ||
    v.includes('veiculo') ||
    v.includes('carregador') ||
    v.includes('wallbox') ||
    v.includes('eletrico') ||
    v.includes('elétrico') ||
    v.includes('ev')
  ) {
    return 'Carregadores Veículos Elétricos'
  }

  return 'Energia Solar'
}

/**
 * Retorna a configuração visual completa para exibição no card do funil
 */
export function getTipoVendaConfig(valor?: string | null): TipoVendaConfig {
  const tipo = normalizarTipoVenda(valor)
  return TIPOS_VENDA_CONFIG[tipo]
}

export interface TipoVendaBadgeInfo {
  hasTipo: boolean
  label: string
  shortLabel: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  badgeClass: string
  iconClass: string
}

/**
 * Retorna as informações visuais para a etiqueta do card.
 * Se o cliente não tiver tipo_venda preenchido ou for vazio, retorna hasTipo: false
 * e a etiqueta neutra discreta "Sem tipo".
 */
export function getTipoVendaBadgeInfo(valor?: string | null): TipoVendaBadgeInfo {
  if (!valor || !valor.trim()) {
    return {
      hasTipo: false,
      label: 'Sem tipo definido',
      shortLabel: 'Sem tipo',
      icon: SunMedium,
      badgeClass:
        'bg-slate-50 text-slate-500 border-slate-200/80 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700',
      iconClass: 'text-slate-400 dark:text-slate-500',
    }
  }

  const config = getTipoVendaConfig(valor)
  return {
    hasTipo: true,
    label: config.label,
    shortLabel: config.shortLabel,
    icon: config.icon,
    badgeClass: config.badgeClass,
    iconClass: config.iconClass,
  }
}
