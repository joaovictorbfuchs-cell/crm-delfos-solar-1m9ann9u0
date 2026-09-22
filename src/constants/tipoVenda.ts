import type { LucideIcon } from 'lucide-react'
import { SunMedium, Wrench, BatteryCharging, Zap } from 'lucide-react'
import type { TipoVendaSelect } from '@/types/crm'

export const TIPOS_VENDA_OPTIONS: TipoVendaSelect[] = [
  'Energia Solar',
  'O&M (Operação e Manutenção)',
  'Baterias',
  'Carregadores Veículos Elétricos',
]

export interface TipoVendaConfig {
  label: TipoVendaSelect
  shortLabel: string
  descricao: string
  icon: LucideIcon
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
    icon: Zap, // Ícone de recarga veicular rápida
    badgeClass:
      'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    iconClass: 'text-slate-600 dark:text-slate-300',
    cardBorderClass: 'hover:border-slate-400 dark:hover:border-slate-500',
    cardAccentClass: 'bg-slate-500',
    dotClass: 'bg-slate-500',
    bgLightClass:
      'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
  },
}

/**
 * Normaliza qualquer variação de string cadastrada para uma das 4 opções estritas.
 * Se vazio ou não reconhecido, retorna 'Energia Solar' como padrão amigável.
 */
export function normalizarTipoVenda(valor?: string | null): TipoVendaSelect {
  if (!valor) return 'Energia Solar'
  const v = valor.trim().toLowerCase()

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
