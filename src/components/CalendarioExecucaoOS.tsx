import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { OrdemServico, OSTipoServico, OSChecklistItem } from '@/types/crm'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarRange,
  CalendarDays,
  Clock,
  User,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDateTime } from '@/lib/formatters'
import { updateOrdemServico } from '@/services/crmService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import { somarMinutos, minutesToTimeString, timeStringToMinutes } from '@/lib/horarios'
import { useToast } from '@/hooks/use-toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface CalendarioExecucaoOSProps {
  ordens: OrdemServico[]
  onSelectOS: (os: OrdemServico) => void
  onOSUpdated?: (updatedOS: OrdemServico) => void
  isInstalador?: boolean
  instaladorNome?: string
  leftControlsSlot?: React.ReactNode
  rightActionsSlot?: React.ReactNode
  mostrarLinhaDiaTodo?: boolean
}

// Configurações de cores por tipo de serviço
// Requisito:
// - Limpeza: VERDE
// - Manutenção: AMARELO
// - Instalação: AZUL
// - Garantia: LARANJA
// - Configuração de datalogger: ROXO
export interface TipoServicoCorConfig {
  nome: string
  borderClass: string
  borderColor: string
  bgLightClass: string
  bgBadgeClass: string
  textClass: string
  hex: string
  pillBg: string
}

// Paleta de cores para tipos customizados atribuídas deterministicamente por hash
const PALETA_CUSTOM_HASH: TipoServicoCorConfig[] = [
  {
    nome: 'Customizado',
    borderClass: 'border-l-emerald-600',
    borderColor: '#059669',
    bgLightClass: 'bg-emerald-50/70 hover:bg-emerald-100/80',
    bgBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    textClass: 'text-emerald-800',
    hex: '#059669',
    pillBg: 'rgba(5, 150, 105, 0.14)',
  },
  {
    nome: 'Customizado',
    borderClass: 'border-l-indigo-500',
    borderColor: '#6366F1',
    bgLightClass: 'bg-indigo-50/70 hover:bg-indigo-100/80',
    bgBadgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    textClass: 'text-indigo-800',
    hex: '#6366F1',
    pillBg: 'rgba(99, 102, 241, 0.14)',
  },
  {
    nome: 'Customizado',
    borderClass: 'border-l-rose-500',
    borderColor: '#F43F5E',
    bgLightClass: 'bg-rose-50/70 hover:bg-rose-100/80',
    bgBadgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    textClass: 'text-rose-800',
    hex: '#F43F5E',
    pillBg: 'rgba(244, 63, 94, 0.14)',
  },
  {
    nome: 'Customizado',
    borderClass: 'border-l-teal-500',
    borderColor: '#14B8A6',
    bgLightClass: 'bg-teal-50/70 hover:bg-teal-100/80',
    bgBadgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
    textClass: 'text-teal-800',
    hex: '#14B8A6',
    pillBg: 'rgba(20, 184, 166, 0.14)',
  },
  {
    nome: 'Customizado',
    borderClass: 'border-l-violet-600',
    borderColor: '#7C3AED',
    bgLightClass: 'bg-violet-50/70 hover:bg-violet-100/80',
    bgBadgeClass: 'bg-violet-100 text-violet-800 border-violet-300',
    textClass: 'text-violet-800',
    hex: '#7C3AED',
    pillBg: 'rgba(124, 58, 237, 0.14)',
  },
  {
    nome: 'Customizado',
    borderClass: 'border-l-yellow-600',
    borderColor: '#CA8A04',
    bgLightClass: 'bg-yellow-50/70 hover:bg-yellow-100/80',
    bgBadgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    textClass: 'text-yellow-800',
    hex: '#CA8A04',
    pillBg: 'rgba(202, 138, 4, 0.14)',
  },
]

function getHashColorConfig(nome: string): TipoServicoCorConfig {
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = (hash << 5) - hash + nome.charCodeAt(i)
    hash |= 0
  }
  const idx = Math.abs(hash) % PALETA_CUSTOM_HASH.length
  const base = PALETA_CUSTOM_HASH[idx]
  return {
    ...base,
    nome,
  }
}

// Paleta completa de cores por tipo de atividade:
// Aditivo: preserva as chaves clássicas e adiciona diferenciação por tipo de manutenção
// - Manutenção Preventiva: ÂMBAR / AMARELO OURO (#F59E0B)
// - Manutenção Corretiva: VERMELHO / CARMIM (#E11D48 / #DC2626)
// - Visita Técnica: AZUL ROYAL (#2563EB)
// - Garantia de Equipamento: ROXO / VIOLETA (#9333EA)
// - Configuração de Datalogger: CIANO / AZUL CELESTE (#06B6D4)
// - Instalação: VERDE ESMERALDA (#10B981)
// - Limpeza: SKY / AZUL CLARO (#0284C7)
export const TIPO_SERVICO_CORES: Record<OSTipoServico | string, TipoServicoCorConfig> = {
  'Manutenção Preventiva': {
    nome: 'Manutenção Preventiva',
    borderClass: 'border-l-amber-500',
    borderColor: '#F59E0B',
    bgLightClass: 'bg-amber-50/70 hover:bg-amber-100/80',
    bgBadgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    textClass: 'text-amber-800',
    hex: '#F59E0B',
    pillBg: 'rgba(245, 158, 11, 0.14)',
  },
  'Manutenção Corretiva': {
    nome: 'Manutenção Corretiva',
    borderClass: 'border-l-rose-600',
    borderColor: '#E11D48',
    bgLightClass: 'bg-rose-50/70 hover:bg-rose-100/80',
    bgBadgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    textClass: 'text-rose-800',
    hex: '#E11D48',
    pillBg: 'rgba(225, 29, 72, 0.14)',
  },
  'Visita Técnica': {
    nome: 'Visita Técnica',
    borderClass: 'border-l-blue-600',
    borderColor: '#2563EB',
    bgLightClass: 'bg-blue-50/70 hover:bg-blue-100/80',
    bgBadgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    textClass: 'text-blue-800',
    hex: '#2563EB',
    pillBg: 'rgba(37, 99, 235, 0.14)',
  },
  'Garantia de Equipamento': {
    nome: 'Garantia de Equipamento',
    borderClass: 'border-l-purple-600',
    borderColor: '#9333EA',
    bgLightClass: 'bg-purple-50/70 hover:bg-purple-100/80',
    bgBadgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    textClass: 'text-purple-800',
    hex: '#9333EA',
    pillBg: 'rgba(147, 51, 234, 0.14)',
  },
  'Configuração Datalogger': {
    nome: 'Configuração Datalogger',
    borderClass: 'border-l-cyan-600',
    borderColor: '#06B6D4',
    bgLightClass: 'bg-cyan-50/70 hover:bg-cyan-100/80',
    bgBadgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    textClass: 'text-cyan-800',
    hex: '#06B6D4',
    pillBg: 'rgba(6, 182, 212, 0.14)',
  },
  'Configuração de Datalogger': {
    nome: 'Configuração Datalogger',
    borderClass: 'border-l-cyan-600',
    borderColor: '#06B6D4',
    bgLightClass: 'bg-cyan-50/70 hover:bg-cyan-100/80',
    bgBadgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    textClass: 'text-cyan-800',
    hex: '#06B6D4',
    pillBg: 'rgba(6, 182, 212, 0.14)',
  },
  Limpeza: {
    nome: 'Limpeza',
    borderClass: 'border-l-sky-500',
    borderColor: '#0284C7',
    bgLightClass: 'bg-sky-50/70 hover:bg-sky-100/80',
    bgBadgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    textClass: 'text-sky-800',
    hex: '#0284C7',
    pillBg: 'rgba(2, 132, 199, 0.14)',
  },
  'Limpeza e Manutenção': {
    nome: 'Limpeza dos Módulos',
    borderClass: 'border-l-sky-500',
    borderColor: '#0284C7',
    bgLightClass: 'bg-sky-50/70 hover:bg-sky-100/80',
    bgBadgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    textClass: 'text-sky-900',
    hex: '#0284C7',
    pillBg: 'rgba(2, 132, 199, 0.14)',
  },
  'Limpeza dos Módulos': {
    nome: 'Limpeza dos Módulos',
    borderClass: 'border-l-sky-500',
    borderColor: '#0284C7',
    bgLightClass: 'bg-sky-50/70 hover:bg-sky-100/80',
    bgBadgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    textClass: 'text-sky-800',
    hex: '#0284C7',
    pillBg: 'rgba(2, 132, 199, 0.14)',
  },
  limpeza: {
    nome: 'Limpeza dos Módulos',
    borderClass: 'border-l-sky-500',
    borderColor: '#0284C7',
    bgLightClass: 'bg-sky-50/70 hover:bg-sky-100/80',
    bgBadgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    textClass: 'text-sky-800',
    hex: '#0284C7',
    pillBg: 'rgba(2, 132, 199, 0.14)',
  },
  manutencao_preventiva: {
    nome: 'Manutenção Preventiva',
    borderClass: 'border-l-amber-500',
    borderColor: '#D97706',
    bgLightClass: 'bg-amber-50/70 hover:bg-amber-100/80',
    bgBadgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    textClass: 'text-amber-800',
    hex: '#D97706',
    pillBg: 'rgba(217, 119, 6, 0.14)',
  },
  manutencao_corretiva: {
    nome: 'Manutenção Corretiva',
    borderClass: 'border-l-red-600',
    borderColor: '#DC2626',
    bgLightClass: 'bg-red-50/70 hover:bg-red-100/80',
    bgBadgeClass: 'bg-red-100 text-red-800 border-red-300',
    textClass: 'text-red-800',
    hex: '#DC2626',
    pillBg: 'rgba(220, 38, 38, 0.14)',
  },
  limpeza_manutencao: {
    nome: 'Limpeza dos Módulos',
    borderClass: 'border-l-sky-500',
    borderColor: '#0284C7',
    bgLightClass: 'bg-sky-50/70 hover:bg-sky-100/80',
    bgBadgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    textClass: 'text-sky-900',
    hex: '#0284C7',
    pillBg: 'rgba(2, 132, 199, 0.14)',
  },
  Instalação: {
    nome: 'Instalação',
    borderClass: 'border-l-emerald-600',
    borderColor: '#10B981',
    bgLightClass: 'bg-emerald-50/70 hover:bg-emerald-100/80',
    bgBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    textClass: 'text-emerald-800',
    hex: '#10B981',
    pillBg: 'rgba(16, 185, 129, 0.14)',
  },
  Garantia: {
    nome: 'Garantia',
    borderClass: 'border-l-purple-600',
    borderColor: '#9333EA',
    bgLightClass: 'bg-purple-50/70 hover:bg-purple-100/80',
    bgBadgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    textClass: 'text-purple-800',
    hex: '#9333EA',
    pillBg: 'rgba(147, 51, 234, 0.14)',
  },
  Manutenção: {
    nome: 'Manutenção',
    borderClass: 'border-l-amber-500',
    borderColor: '#F59E0B',
    bgLightClass: 'bg-amber-50/70 hover:bg-amber-100/80',
    bgBadgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    textClass: 'text-amber-800',
    hex: '#F59E0B',
    pillBg: 'rgba(245, 158, 11, 0.14)',
  },
}

/**
 * Resolve a estilização visual (cor/badge/borda) para qualquer tipo de serviço ou título customizado.
 * Diferencia tipos específicos de manutenção (Preventiva = âmbar, Corretiva = vermelho/rosa,
 * Visita Técnica = azul, Garantia = roxo, Datalogger = ciano, e tipos customizados via hash).
 */
const FALLBACK_TIPO_CONFIG: TipoServicoCorConfig = {
  nome: 'Manutenção',
  borderClass: 'border-l-amber-500',
  borderColor: '#F59E0B',
  bgLightClass: 'bg-amber-50/70 hover:bg-amber-100/80',
  bgBadgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  textClass: 'text-amber-800',
  hex: '#F59E0B',
  pillBg: 'rgba(245, 158, 11, 0.14)',
}

/**
 * Resolve a estilização visual (cor/badge/borda) para qualquer tipo de serviço ou título customizado.
 * Diferencia tipos específicos de manutenção (Preventiva = âmbar, Corretiva = vermelho/rosa,
 * Visita Técnica = azul, Garantia = roxo, Datalogger = ciano, e tipos customizados via hash).
 * BLINDADO: sempre retorna um objeto válido com (hex, pillBg, borderColor, badgeBg, nome) — nunca undefined.
 */
export function getTipoServicoConfig(tipoNome?: unknown): TipoServicoCorConfig {
  const safeStr = String(tipoNome || '').trim()
  if (!safeStr) {
    return {
      ...(TIPO_SERVICO_CORES['Manutenção Preventiva'] || FALLBACK_TIPO_CONFIG),
    }
  }

  // Mapa exato por chave
  if (TIPO_SERVICO_CORES[safeStr]) {
    const matched = TIPO_SERVICO_CORES[safeStr]
    if (matched && matched.hex && matched.borderColor) {
      return matched
    }
  }

  // Tipos canônicos exatos (case-insensitive)
  const lower = safeStr.toLowerCase()
  if (
    lower === 'manutencao_corretiva' ||
    lower === 'manutenção corretiva' ||
    lower === 'manutencao corretiva'
  ) {
    return TIPO_SERVICO_CORES['Manutenção Corretiva'] || FALLBACK_TIPO_CONFIG
  }
  if (
    lower === 'manutencao_preventiva' ||
    lower === 'manutenção preventiva' ||
    lower === 'manutencao preventiva'
  ) {
    return TIPO_SERVICO_CORES['Manutenção Preventiva'] || FALLBACK_TIPO_CONFIG
  }
  if (
    lower === 'limpeza_manutencao' ||
    lower === 'limpeza e manutenção' ||
    lower === 'limpeza & manutenção'
  ) {
    return (
      TIPO_SERVICO_CORES['Limpeza e Manutenção'] ||
      TIPO_SERVICO_CORES['Limpeza dos Módulos'] ||
      TIPO_SERVICO_CORES['Limpeza'] ||
      FALLBACK_TIPO_CONFIG
    )
  }
  if (lower === 'limpeza' || lower === 'limpeza dos módulos' || lower === 'limpeza dos modulos') {
    return (
      TIPO_SERVICO_CORES['Limpeza dos Módulos'] ||
      TIPO_SERVICO_CORES['Limpeza'] ||
      FALLBACK_TIPO_CONFIG
    )
  }
  if (lower === 'instalacao' || lower === 'instalação') {
    return TIPO_SERVICO_CORES['Instalação'] || FALLBACK_TIPO_CONFIG
  }
  if (
    lower === 'garantia_equipamento' ||
    lower === 'garantia' ||
    lower === 'garantia de equipamento'
  ) {
    return (
      TIPO_SERVICO_CORES['Garantia de Equipamento'] ||
      TIPO_SERVICO_CORES['Garantia'] ||
      FALLBACK_TIPO_CONFIG
    )
  }
  if (
    lower === 'configuracao_datalogger' ||
    lower === 'configuração datalogger' ||
    lower === 'configuração de datalogger' ||
    lower === 'configuracao de datalogger'
  ) {
    return TIPO_SERVICO_CORES['Configuração Datalogger'] || FALLBACK_TIPO_CONFIG
  }
  if (lower === 'visita_tecnica' || lower === 'visita técnica') {
    return TIPO_SERVICO_CORES['Visita Técnica'] || FALLBACK_TIPO_CONFIG
  }

  // Tipos customizados de tipos_atividades_custom ou identificador não mapeado
  try {
    const hashConfig = getHashColorConfig(safeStr)
    if (hashConfig && hashConfig.hex && hashConfig.borderColor) {
      return hashConfig
    }
  } catch (_) {
    // fallback seguro abaixo
  }

  return {
    ...FALLBACK_TIPO_CONFIG,
    nome: safeStr || FALLBACK_TIPO_CONFIG.nome,
  }
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const DIAS_SEMANA_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Helper utilitário defensivo para conversão em string segura
export function safeStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  try {
    return String(val)
  } catch {
    return ''
  }
}

/**
 * Sanitiza um objeto OrdemServico garantindo que checklist seja array normalizado,
 * horario_inicio seja string segura, duracao_minutos seja número válido,
 * evitando que tipos divergentes quebrem re-renders de FichaExecucaoOS ou do próprio calendário.
 */
export function sanitizeOS(os: any): OrdemServico {
  if (!os || typeof os !== 'object') {
    return os as OrdemServico
  }

  const checklistNormalizada = normalizeChecklist(os.checklist)

  let horarioInicioStr = '08:00'
  if (os.horario_inicio !== undefined && os.horario_inicio !== null) {
    if (typeof os.horario_inicio === 'string' && os.horario_inicio.trim()) {
      horarioInicioStr = os.horario_inicio.trim()
    } else if (typeof os.horario_inicio === 'number' && !isNaN(os.horario_inicio)) {
      horarioInicioStr = `${String(Math.floor(os.horario_inicio)).padStart(2, '0')}:00`
    } else {
      try {
        const s = String(os.horario_inicio).trim()
        horarioInicioStr = s || '08:00'
      } catch {
        horarioInicioStr = '08:00'
      }
    }
  } else if (os.data_agendada) {
    if (os.data_agendada instanceof Date && !isNaN(os.data_agendada.getTime())) {
      const h = String(os.data_agendada.getHours()).padStart(2, '0')
      const m = String(os.data_agendada.getMinutes()).padStart(2, '0')
      horarioInicioStr = `${h}:${m}`
    } else {
      const s = String(os.data_agendada).trim()
      if (s.length >= 16) {
        horarioInicioStr = s.replace(' ', 'T').slice(11, 16)
      }
    }
  }

  let dataAgendadaStr = ''
  if (os.data_agendada !== undefined && os.data_agendada !== null) {
    if (os.data_agendada instanceof Date) {
      if (!isNaN(os.data_agendada.getTime())) {
        const y = os.data_agendada.getFullYear()
        const m = String(os.data_agendada.getMonth() + 1).padStart(2, '0')
        const d = String(os.data_agendada.getDate()).padStart(2, '0')
        const h = String(os.data_agendada.getHours()).padStart(2, '0')
        const min = String(os.data_agendada.getMinutes()).padStart(2, '0')
        dataAgendadaStr = `${y}-${m}-${d} ${h}:${min}:00`
      }
    } else {
      try {
        dataAgendadaStr = String(os.data_agendada)
      } catch {
        dataAgendadaStr = ''
      }
    }
  }

  let duracaoNum = 60
  if (os.duracao_minutos !== undefined && os.duracao_minutos !== null) {
    const parsed = Number(os.duracao_minutos)
    if (!isNaN(parsed) && parsed > 0) {
      duracaoNum = Math.round(parsed)
    }
  } else if (os.tempo_previsto_minutos !== undefined && os.tempo_previsto_minutos !== null) {
    const parsed = Number(os.tempo_previsto_minutos)
    if (!isNaN(parsed) && parsed > 0) {
      duracaoNum = Math.round(parsed)
    }
  }

  let horarioFimStr = ''
  if (os.horario_fim !== undefined && os.horario_fim !== null) {
    try {
      horarioFimStr = String(os.horario_fim).trim()
    } catch {
      horarioFimStr = ''
    }
  }
  if (!horarioFimStr && horarioInicioStr) {
    horarioFimStr = somarMinutos(horarioInicioStr, duracaoNum)
  }

  return {
    ...os,
    data_agendada: dataAgendadaStr,
    horario_inicio: horarioInicioStr,
    horario_fim: horarioFimStr,
    duracao_minutos: duracaoNum,
    tempo_previsto_minutos: duracaoNum,
    checklist: checklistNormalizada,
  }
}

// Normaliza checklist vindo de PocketBase (seja array, string JSON, objeto ou indefinido/nulo)
export function normalizeChecklist(raw: unknown): OSChecklistItem[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .filter((item) => item !== null && item !== undefined && typeof item === 'object')
      .map((item: any, idx: number) => ({
        id: safeStr(item.id) || `chk_${idx + 1}`,
        item: safeStr(item.item || item.texto || item.nome || `Item ${idx + 1}`),
        concluido: Boolean(item.concluido),
      }))
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item !== null && item !== undefined && typeof item === 'object')
          .map((item: any, idx: number) => ({
            id: safeStr(item.id) || `chk_${idx + 1}`,
            item: safeStr(item.item || item.texto || item.nome || `Item ${idx + 1}`),
            concluido: Boolean(item.concluido),
          }))
      }
    } catch (_) {
      return []
    }
  }
  return []
}

// Formata chave YYYY-MM-DD com tolerância total a parâmetros nulos ou inválidos
function getLocalDateKey(date?: unknown): string {
  try {
    if (!date) {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    }
    const d = date instanceof Date ? date : new Date(String(date))
    if (isNaN(d.getTime())) {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    }
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dia}`
  } catch (_) {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
}

// Extrai horário HH:mm da string de data UTC/ISO/Date com defesa rigorosa contra null/undefined/legado
export function extractHorario(dateString?: unknown): string {
  if (!dateString) return '--:--'
  try {
    if (dateString instanceof Date) {
      if (isNaN(dateString.getTime())) return '--:--'
      const hours = String(dateString.getHours()).padStart(2, '0')
      const minutes = String(dateString.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    }

    const str = safeStr(dateString).trim()
    if (!str) return '--:--'

    // Se vier direto como "HH:mm" ou "HH:mm:ss"
    if (/^\d{1,2}:\d{2}/.test(str)) {
      const match = str.match(/^(\d{1,2}):(\d{2})/)
      if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`
      }
    }

    // Se vier no formato "YYYY-MM-DD HH:mm..." com espaço ou T
    if (str.length >= 16) {
      const horaMin = str.slice(11, 16)
      if (/^\d{2}:\d{2}$/.test(horaMin)) {
        return horaMin
      }
    }

    const d = new Date(str)
    if (isNaN(d.getTime())) return '--:--'
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } catch (_) {
    return '--:--'
  }
}
export type CalendarioOSViewMode = 'mes' | 'semana' | 'dia'

// Grade horária: das 06:00 às 22:00 (16 horas = 17 marcas de horário)
const HORA_INICIAL = 6
const HORA_FINAL = 22
const TOTAL_HORAS = HORA_FINAL - HORA_INICIAL
const ALTURA_HORA_PX = 56 // 56px por hora para boa legibilidade
const DURACAO_PADRAO_MINUTOS = 60 // 1h padrão se não definido

// Helper para obter o domingo inicial de uma semana com tolerância
function getStartOfWeekDate(date?: unknown): Date {
  try {
    const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date()
    const day = d.getDay() // 0 = Domingo
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  } catch (_) {
    const now = new Date()
    now.setDate(now.getDate() - now.getDay())
    now.setHours(0, 0, 0, 0)
    return now
  }
}

// Extrai duração em minutos armazenada em duracao_minutos, tempo_previsto_minutos,
// ou calculada a partir de horario_inicio e horario_fim - tolerante a null/legado
function getDuracaoMinutosOS(os?: Partial<OrdemServico> | null): number {
  if (!os || typeof os !== 'object') return DURACAO_PADRAO_MINUTOS

  try {
    // 1. Derivado de horario_inicio e horario_fim quando presentes e válidos:
    if (os.horario_inicio && os.horario_fim) {
      const minInicio = timeStringToMinutes(safeStr(os.horario_inicio))
      const minFim = timeStringToMinutes(safeStr(os.horario_fim))
      if (minFim > minInicio) {
        const diff = minFim - minInicio
        if (diff >= 15 && diff <= 480) {
          return diff
        }
      }
    }

    // 2. Campo explícito duracao_minutos (prioritário para atividades de manutenção)
    const duracaoNum = Number(os.duracao_minutos)
    if (!isNaN(duracaoNum) && duracaoNum >= 15) {
      return Math.min(480, Math.round(duracaoNum))
    }

    // 3. Campo tempo_previsto_minutos (usado em OSs de campo)
    const tempoNum = Number(os.tempo_previsto_minutos)
    if (!isNaN(tempoNum) && tempoNum >= 15) {
      return Math.min(480, Math.round(tempoNum))
    }

    // 4. Metadados json em detalhes_execucao / instrucoes_seguranca
    const dados = (os.instrucoes_seguranca || os.detalhes_execucao) as any
    if (dados && typeof dados === 'object') {
      const d = Number(dados.duracao_minutos)
      if (!isNaN(d) && d >= 15 && d <= 480) return Math.round(d)
    }
  } catch {
    /* fallback */
  }
  return DURACAO_PADRAO_MINUTOS
}

function CalendarioExecucaoOSContent({
  ordens,
  onSelectOS: onSelectOSRaw,
  onOSUpdated,
  isInstalador,
  instaladorNome,
  leftControlsSlot,
  rightActionsSlot,
  mostrarLinhaDiaTodo = true,
}: CalendarioExecucaoOSProps) {
  const now = new Date()
  const { toast } = useToast()

  // Wrapper sanitizado de onSelectOS para garantir que o objeto passado à Ficha de Execução
  // não contenha tipos divergentes (data_agendada Date, horario_inicio numérico, checklist null)
  const onSelectOS = useCallback(
    (osItem: OrdemServico) => {
      const sanitized = sanitizeOS(osItem)
      onSelectOSRaw(sanitized)
    },
    [onSelectOSRaw],
  )
  const [viewMode, setViewMode] = useState<CalendarioOSViewMode>('semana')
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(() =>
    getLocalDateKey(new Date()),
  )

  // Toggles de exibição de Sábados e Domingos com persistência em localStorage
  const [showSabados, setShowSabados] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('delfos_cal_show_sabados')
      if (stored !== null) return stored === 'true'
    } catch {
      /* intentionally ignored */
    }
    return true
  })

  const [showDomingos, setShowDomingos] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('delfos_cal_show_domingos')
      if (stored !== null) return stored === 'true'
    } catch {
      /* intentionally ignored */
    }
    return true
  })

  const handleToggleSabados = useCallback((checked: boolean) => {
    setShowSabados(checked)
    try {
      localStorage.setItem('delfos_cal_show_sabados', String(checked))
    } catch {
      /* intentionally ignored */
    }
  }, [])

  const handleToggleDomingos = useCallback((checked: boolean) => {
    setShowDomingos(checked)
    try {
      localStorage.setItem('delfos_cal_show_domingos', String(checked))
    } catch {
      /* intentionally ignored */
    }
  }, [])

  // Overrides locais para drag & drop e resize imediatos
  const [overrides, setOverrides] = useState<
    Record<
      string,
      {
        data_agendada?: string
        duracao_minutos?: number
        horario_inicio?: string
        horario_fim?: string
      }
    >
  >({})

  // Estado de Drag & Drop
  const [draggingOSId, setDraggingOSId] = useState<string | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ dateKey: string; hora: number } | null>(null)

  // Estado de Resize (ajuste de duração na borda inferior)
  const [resizing, setResizing] = useState<{
    osId: string
    startY: number
    startDuracao: number
    currentDuracao: number
  } | null>(null)

  const timeGridRef = useRef<HTMLDivElement>(null)

  // Data base para visão Dia (se tiver selectedDayKey, converte; fallback para new Date() em qualquer falha de parse)
  const selectedDayDate = useMemo(() => {
    try {
      if (!selectedDayKey) return new Date()
      const str = String(selectedDayKey).trim()
      if (!str) return new Date()
      const parts = str.split('-').map(Number)
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2])
        if (d instanceof Date && !isNaN(d.getTime())) return d
      }
      const direct = new Date(str)
      if (direct instanceof Date && !isNaN(direct.getTime())) return direct
      return new Date()
    } catch {
      return new Date()
    }
  }, [selectedDayKey])

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Início da semana atual baseado na currentDate
  const startOfWeek = useMemo(() => getStartOfWeekDate(currentDate), [currentDate])

  // Navegação: anterior
  const handlePrev = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    } else if (viewMode === 'semana') {
      const prevWeek = new Date(startOfWeek)
      prevWeek.setDate(prevWeek.getDate() - 7)
      setCurrentDate(prevWeek)
      // Ajusta o dia selecionado se estiver fora da nova semana
      const newSelected = new Date(prevWeek)
      setSelectedDayKey(getLocalDateKey(newSelected))
    } else {
      // Visão dia: retrocede 1 dia
      const prevDay = new Date(selectedDayDate)
      prevDay.setDate(prevDay.getDate() - 1)
      setSelectedDayKey(getLocalDateKey(prevDay))
      setCurrentDate(prevDay)
    }
  }

  // Navegação: atual / hoje
  const handleCurrent = () => {
    const today = new Date()
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    setSelectedDayKey(getLocalDateKey(today))
  }

  // Navegação: próxima
  const handleNext = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    } else if (viewMode === 'semana') {
      const nextWeek = new Date(startOfWeek)
      nextWeek.setDate(nextWeek.getDate() + 7)
      setCurrentDate(nextWeek)
      const newSelected = new Date(nextWeek)
      setSelectedDayKey(getLocalDateKey(newSelected))
    } else {
      // Visão dia: avança 1 dia
      const nextDay = new Date(selectedDayDate)
      nextDay.setDate(nextDay.getDate() + 1)
      setSelectedDayKey(getLocalDateKey(nextDay))
      setCurrentDate(nextDay)
    }
  }

  // Mantém compatibilidade com handlers antigos
  const handlePrevMonth = handlePrev
  const handleCurrentMonth = handleCurrent
  const handleNextMonth = handleNext

  // Mesclar ordens com overrides locais de reagendamento/redimensionamento
  const ordensMescladas = useMemo(() => {
    return (ordens || []).map((os) => {
      if (!os) return os
      const ov = overrides[os.id]
      if (!ov) return os
      return {
        ...os,
        data_agendada: ov.data_agendada ?? os.data_agendada,
        duracao_minutos: ov.duracao_minutos ?? os.duracao_minutos,
        horario_inicio: ov.horario_inicio ?? os.horario_inicio,
        horario_fim: ov.horario_fim ?? os.horario_fim,
        tempo_previsto_minutos: ov.duracao_minutos ?? os.tempo_previsto_minutos,
      }
    })
  }, [ordens, overrides])

  // ==========================================================
  // DRAG & DROP: Reposicionar OS em outro horário / dia
  // ==========================================================
  const handleDragStart = (e: React.DragEvent, osId: string) => {
    e.dataTransfer.setData('text/plain', osId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingOSId(osId)
  }

  const handleDragEnd = () => {
    setDraggingOSId(null)
    setDragOverSlot(null)
  }

  const handleDragOverSlot = (e: React.DragEvent, dateKey: string, hora: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragOverSlot || dragOverSlot.dateKey !== dateKey || dragOverSlot.hora !== hora) {
      setDragOverSlot({ dateKey, hora })
    }
  }

  const handleDropOnSlot = async (
    e: React.DragEvent,
    targetDateKey: string,
    targetHora: number,
  ) => {
    e.preventDefault()
    const osId = e.dataTransfer.getData('text/plain') || draggingOSId
    setDraggingOSId(null)
    setDragOverSlot(null)
    if (!osId) return

    const os = ordensMescladas.find((o) => o?.id === osId)
    if (!os) return

    // Detecta se a posição do mouse dentro do slot indica primeira metade (0-29px) ou segunda metade (>=28px)
    const targetElement = e.currentTarget as HTMLElement
    const rect = targetElement.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const isSecondHalf = relativeY >= ALTURA_HORA_PX / 2

    // Snap de 30 em 30 minutos para atividades de manutenção (00 ou 30)
    let minutos = isSecondHalf ? 30 : 0

    // Se for OS real (não-atividade), preserva minutos originais arredondados para múltiplos de 5 caso não seja snap
    if (os.origem !== 'atividades') {
      if (os.data_agendada && os.data_agendada.length >= 16) {
        const rawMin = parseInt(os.data_agendada.slice(14, 16), 10) || 0
        minutos = Math.min(55, Math.max(0, Math.round(rawMin / 5) * 5))
      }
    }

    const safeTargetDateKey =
      typeof targetDateKey === 'string' && targetDateKey.trim()
        ? targetDateKey.trim()
        : getLocalDateKey(new Date())

    const horaFormatada = String(targetHora).padStart(2, '0')
    const minutoFormatado = String(minutos).padStart(2, '0')
    const horarioInicioStr = `${horaFormatada}:${minutoFormatado}`
    // Padrão PocketBase (YYYY-MM-DD HH:mm:00)
    const novaDataIso = `${safeTargetDateKey} ${horaFormatada}:${minutoFormatado}:00`

    // Duração atual da atividade (mantida durante o drag)
    const duracaoAtual = getDuracaoMinutosOS(os)
    const horarioFimStr = somarMinutos(horarioInicioStr, duracaoAtual)

    // Tipo canônico estritamente preservado para evitar "pisca-tipo"
    const tipoServicoCanonico = os.tipo_servico || 'Manutenção'
    const checklistCanonico = normalizeChecklist(os.checklist)

    // Atualização otimista preservando tipo_servico e checklist
    setOverrides((prev) => ({
      ...prev,
      [osId]: {
        ...prev[osId],
        data_agendada: novaDataIso,
        horario_inicio: horarioInicioStr,
        horario_fim: horarioFimStr,
        duracao_minutos: duracaoAtual,
      },
    }))

    try {
      const payload: Partial<OrdemServico> = {
        data_agendada: novaDataIso,
        horario_inicio: horarioInicioStr,
        horario_fim: horarioFimStr,
        duracao_minutos: duracaoAtual,
        tempo_previsto_minutos: duracaoAtual,
        tipo_servico: tipoServicoCanonico,
        checklist: checklistCanonico,
      }
      if (os.origem === 'atividades') {
        payload.origem = 'atividades'
      }

      const updated = await updateOrdemServico(osId, payload)
      // Sanitiza resposta do update antes de setar estado / passar para callback
      const sanitizedUpdated = sanitizeOS(updated)

      const dataFormatada =
        typeof safeTargetDateKey === 'string' && safeTargetDateKey.includes('-')
          ? safeTargetDateKey.split('-').reverse().join('/')
          : safeTargetDateKey || ''
      toast({
        title: 'Horário reagendado com sucesso! 📅',
        description: `Agendado para ${dataFormatada} às ${horaFormatada}:${minutoFormatado}h (${duracaoAtual}min).`,
      })
      if (onOSUpdated) {
        onOSUpdated(sanitizedUpdated)
      }
    } catch (err) {
      console.error('Erro ao reagendar ordem de serviço:', err)
      // Reverte override
      setOverrides((prev) => {
        const copy = { ...prev }
        delete copy[osId]
        return copy
      })

      if (isAuthSessionError(err)) {
        toast({
          variant: 'destructive',
          title: 'Sessão expirada',
          description: 'Faça login novamente para reagendar a ordem de serviço.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao reagendar',
          description: 'Não foi possível salvar o novo horário no banco de dados.',
        })
      }
    }
  }

  // ==========================================================
  // RESIZE: Ajustar duração puxando a borda inferior (snap 30min)
  // Suporta MouseEvent e PointerEvent, touch em dispositivos móveis
  // e captura de ponteiro para não perder o arraste rápido.
  // ==========================================================
  const resizingRef = useRef<{
    osId: string
    startY: number
    startDuracao: number
    currentDuracao: number
  } | null>(null)

  const handleResizeStart = (e: React.MouseEvent | React.PointerEvent, os: OrdemServico) => {
    e.stopPropagation()
    if (typeof (e as any).preventDefault === 'function') {
      e.preventDefault()
    }

    // Se o elemento suportar pointer capture, captura para rastreamento confiável
    try {
      const target = e.currentTarget as HTMLElement
      if ('setPointerCapture' in target && 'pointerId' in e) {
        target.setPointerCapture((e as React.PointerEvent).pointerId)
      }
    } catch {
      /* ignore fallback */
    }

    const duracaoAtual = getDuracaoMinutosOS(os)
    const initial = {
      osId: os.id,
      startY: e.clientY,
      startDuracao: duracaoAtual,
      currentDuracao: duracaoAtual,
    }
    resizingRef.current = initial
    setResizing(initial)
  }

  useEffect(() => {
    if (!resizing) return

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      const current = resizingRef.current || resizing
      if (!current) return

      const deltaY = e.clientY - current.startY
      // Cada ALTURA_HORA_PX equivale a 60 minutos
      const deltaMinutos = (deltaY / ALTURA_HORA_PX) * 60
      const novaDuracaoCalculada = current.startDuracao + deltaMinutos

      // Snap de 30 em 30 minutos (mínimo 30min, máximo 480min)
      const duracaoBlocos30 = Math.round(novaDuracaoCalculada / 30) * 30
      const duracaoFinal = Math.min(480, Math.max(30, duracaoBlocos30))

      resizingRef.current = {
        ...current,
        currentDuracao: duracaoFinal,
      }
      setResizing({
        ...current,
        currentDuracao: duracaoFinal,
      })

      // Atualiza visualmente em tempo real
      setOverrides((prev) => ({
        ...prev,
        [current.osId]: {
          ...prev[current.osId],
          duracao_minutos: duracaoFinal,
        },
      }))
    }

    const handlePointerUp = async (e?: MouseEvent | PointerEvent) => {
      const current = resizingRef.current || resizing
      resizingRef.current = null
      setResizing(null)
      if (!current) return

      const targetOSId = current.osId
      const duracaoFinal = current.currentDuracao

      const os = ordensMescladas.find((o) => o?.id === targetOSId)
      if (!os) return

      // Recalcula horário de início e fim da atividade com base na data_agendada e na nova duração com fallback seguro
      let horarioInicioAtual = '08:00'
      if (os.horario_inicio && typeof os.horario_inicio === 'string') {
        const clean = os.horario_inicio.trim()
        if (/^\d{1,2}:\d{2}/.test(clean)) {
          horarioInicioAtual = clean.slice(0, 5)
        }
      } else if (
        os.data_agendada &&
        typeof os.data_agendada === 'string' &&
        os.data_agendada.length >= 16
      ) {
        const candidate = os.data_agendada.replace(' ', 'T').slice(11, 16)
        if (/^\d{2}:\d{2}$/.test(candidate)) {
          horarioInicioAtual = candidate
        }
      }
      const duracaoSegura =
        !isNaN(duracaoFinal) && isFinite(duracaoFinal) && duracaoFinal > 0
          ? duracaoFinal
          : DURACAO_PADRAO_MINUTOS
      const novoHorarioFim = somarMinutos(horarioInicioAtual, duracaoSegura)

      try {
        const tipoServicoCanonico = os.tipo_servico || 'Manutenção'
        const checklistCanonico = normalizeChecklist(os.checklist)

        const payload: Partial<OrdemServico> = {
          tempo_previsto_minutos: duracaoFinal,
          duracao_minutos: duracaoFinal,
          horario_inicio: horarioInicioAtual,
          horario_fim: novoHorarioFim,
          tipo_servico: tipoServicoCanonico,
          checklist: checklistCanonico,
        }
        if (os.origem === 'atividades') {
          payload.origem = 'atividades'
        }

        const updated = await updateOrdemServico(targetOSId, payload)
        // Sanitiza resposta do update antes de propagar
        const sanitizedUpdated = sanitizeOS(updated)

        toast({
          title: 'Duração atualizada! ⏱️',
          description: `Tempo previsto ajustado para ${duracaoFinal} minutos (término às ${novoHorarioFim}).`,
        })

        if (onOSUpdated) {
          onOSUpdated(sanitizedUpdated)
        }
      } catch (err) {
        console.error('Erro ao salvar duração da ordem de serviço:', err)
        if (isAuthSessionError(err)) {
          toast({
            variant: 'destructive',
            title: 'Sessão expirada',
            description: 'Faça login novamente para alterar a duração.',
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro ao salvar duração',
            description: 'Não foi possível salvar o ajuste de tempo.',
          })
        }
      }
    }

    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [resizing, ordensMescladas, toast, onOSUpdated])

  // Separar ordens de serviço do dia em "Dia todo" vs "Com horário (06:00 - 22:00)"
  const separarOrdensDoDia = useCallback((ordensDoDia: OrdemServico[]) => {
    const diaInteiro: OrdemServico[] = []
    const comHorario: Array<{
      os: OrdemServico
      hora: number
      minuto: number
      top: number
      height: number
      duracaoMinutos: number
    }> = []

    for (const os of ordensDoDia || []) {
      if (!os || typeof os !== 'object') continue

      try {
        let hora = NaN
        let minuto = 0

        // Se tiver horario_inicio explícito ("08:00" ou "08:00:00" ou numérico)
        if (os.horario_inicio !== undefined && os.horario_inicio !== null) {
          const strInicio = safeStr(os.horario_inicio).trim()
          if (strInicio) {
            const parts = strInicio.split(':')
            if (parts.length >= 2) {
              const h = Number(parts[0])
              const m = Number(parts[1])
              if (!isNaN(h) && isFinite(h) && !isNaN(m) && isFinite(m)) {
                hora = Math.floor(h)
                minuto = Math.floor(m)
              }
            } else if (/^\d+$/.test(strInicio)) {
              const h = Number(strInicio)
              if (!isNaN(h) && isFinite(h) && h >= 0 && h <= 23) {
                hora = Math.floor(h)
                minuto = 0
              }
            }
          }
        }

        // Fallback para data_agendada
        if (isNaN(hora)) {
          const rawData = (os as any).data_agendada
          if (rawData && typeof rawData === 'object' && rawData instanceof Date) {
            if (!isNaN(rawData.getTime())) {
              hora = rawData.getHours()
              minuto = rawData.getMinutes()
            }
          } else {
            const dataStr = safeStr(rawData).trim()
            if (!dataStr || dataStr.length < 13) {
              diaInteiro.push(os)
              continue
            }

            try {
              const horaPart = dataStr.slice(11, 13)
              const hNum = Number(horaPart)
              if (!isNaN(hNum) && isFinite(hNum)) {
                hora = Math.floor(hNum)
                if (dataStr.length >= 16) {
                  const mNum = Number(dataStr.slice(14, 16))
                  minuto = !isNaN(mNum) && isFinite(mNum) ? Math.floor(mNum) : 0
                }
              }
            } catch {
              hora = NaN
            }

            if (isNaN(hora)) {
              const d = new Date(dataStr)
              if (!isNaN(d.getTime())) {
                hora = d.getHours()
                minuto = d.getMinutes()
              }
            }
          }
        }

        // Sanitização de hora e minuto
        if (isNaN(hora) || !isFinite(hora) || isNaN(minuto) || !isFinite(minuto)) {
          diaInteiro.push(os)
          continue
        }

        // Se estiver fora do intervalo 06:00 - 22:00, aloca em dia inteiro
        if (hora < HORA_INICIAL || hora >= HORA_FINAL) {
          diaInteiro.push(os)
          continue
        }

        const rawDuracao = Number(getDuracaoMinutosOS(os))
        const duracaoMinutos =
          !isNaN(rawDuracao) && isFinite(rawDuracao) && rawDuracao > 0
            ? rawDuracao
            : DURACAO_PADRAO_MINUTOS

        const safeMinuto = Math.min(59, Math.max(0, minuto))
        const rawTop = (hora - HORA_INICIAL) * ALTURA_HORA_PX + (safeMinuto / 60) * ALTURA_HORA_PX
        const top = !isNaN(rawTop) && isFinite(rawTop) ? Math.max(0, Math.round(rawTop)) : 0

        const rawHeight = (duracaoMinutos / 60) * ALTURA_HORA_PX - 2
        const height =
          !isNaN(rawHeight) && isFinite(rawHeight) ? Math.max(28, Math.round(rawHeight)) : 28

        comHorario.push({
          os,
          hora,
          minuto: safeMinuto,
          top,
          height,
          duracaoMinutos,
        })
      } catch (err) {
        console.warn('Erro ao processar horário da OS no calendário:', err)
        diaInteiro.push(os)
      }
    }

    comHorario.sort((a, b) => {
      const topA = Number(a?.top)
      const topB = Number(b?.top)
      const safeA = !isNaN(topA) && isFinite(topA) ? topA : 0
      const safeB = !isNaN(topB) && isFinite(topB) ? topB : 0
      return safeA - safeB
    })

    return { diaInteiro, comHorario }
  }, [])

  // Agrupar ordens por chave de data (YYYY-MM-DD)
  // Somente ordens/atividades com data_agendada explícita e válida devem ser exibidas no calendário.
  // Registros sem data ou malformados não devem quebrar o grid nem cair em chaves corrompidas.
  const ordensPorDia = useMemo(() => {
    const map = new Map<string, OrdemServico[]>()
    for (const os of ordensMescladas || []) {
      if (!os) continue
      try {
        const dataStr = safeStr(os.data_agendada).trim()
        if (!dataStr) continue
        const d = new Date(dataStr)
        const timeVal = d.getTime()
        if (isNaN(timeVal) || !isFinite(timeVal)) continue
        const key = getLocalDateKey(d)
        if (!key || key.includes('NaN') || !/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key)!.push(os)
      } catch (_) {
        // Ignora datas inválidas
      }
    }
    // Ordenar as OS de cada dia por horário com defesa robusta a NaN/Infinity
    for (const [, list] of map.entries()) {
      list.sort((a, b) => {
        try {
          const strA = safeStr(a?.data_agendada).trim()
          const strB = safeStr(b?.data_agendada).trim()
          const dateA = strA ? new Date(strA) : null
          const dateB = strB ? new Date(strB) : null
          const timeA =
            dateA && !isNaN(dateA.getTime()) && isFinite(dateA.getTime()) ? dateA.getTime() : 0
          const timeB =
            dateB && !isNaN(dateB.getTime()) && isFinite(dateB.getTime()) ? dateB.getTime() : 0
          return timeA - timeB
        } catch (_) {
          return 0
        }
      })
    }
    return map
  }, [ordensMescladas]) // Matriz de dias para o calendário (7 colunas, domingo a sábado)
  const todayKey = getLocalDateKey(new Date())

  // Dias da semana corrente para visão semanal (todos os 7 dias base)
  const weekDays = useMemo(() => {
    const days: {
      date: Date
      dayNumber: number
      diaSemanaCurto: string
      diaSemanaCompleto: string
      isCurrentMonth: boolean
      isToday: boolean
      dateKey: string
    }[] = []

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      const dateKey = getLocalDateKey(d)
      days.push({
        date: d,
        dayNumber: d.getDate(),
        diaSemanaCurto: DIAS_SEMANA_NOMES[i] || '',
        diaSemanaCompleto:
          [
            'Domingo',
            'Segunda-feira',
            'Terça-feira',
            'Quarta-feira',
            'Quinta-feira',
            'Sexta-feira',
            'Sábado',
          ][i] || '',
        isCurrentMonth: d.getMonth() === currentMonth,
        isToday: dateKey === todayKey,
        dateKey,
      })
    }
    return days
  }, [startOfWeek, currentMonth, todayKey])

  // Colunas de dias visíveis na semana conforme toggles de Sábado e Domingo
  const weekDaysVisiveis = useMemo(() => {
    return (weekDays || []).filter((dia) => {
      if (!dia || !dia.date) return false
      try {
        const dayOfWeek =
          dia.date instanceof Date && !isNaN(dia.date.getTime()) ? dia.date.getDay() : 0
        if (dayOfWeek === 6 && !showSabados) return false
        if (dayOfWeek === 0 && !showDomingos) return false
        return true
      } catch (_) {
        return true
      }
    })
  }, [weekDays, showSabados, showDomingos])

  // Contagem de OS no período exibido (mês / semana / dia)
  const totalNoPeriodoExibido = useMemo(() => {
    if (viewMode === 'mes') {
      let count = 0
      const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
      for (const [key, list] of ordensPorDia.entries()) {
        if (key.startsWith(prefix)) {
          count += list.length
        }
      }
      return count
    } else if (viewMode === 'semana') {
      let count = 0
      const targetDays = weekDaysVisiveis.length > 0 ? weekDaysVisiveis : weekDays
      for (const d of targetDays) {
        count += (ordensPorDia.get(d.dateKey) || []).length
      }
      return count
    } else {
      // Visão Dia
      if (!selectedDayKey) return 0
      return (ordensPorDia.get(selectedDayKey) || []).length
    }
  }, [
    viewMode,
    currentYear,
    currentMonth,
    ordensPorDia,
    weekDays,
    weekDaysVisiveis,
    selectedDayKey,
  ])

  // Rótulo textual do período para o header (blindado com validação de instanceof Date e getTime() em first/last)
  const headerPeriodoTexto = useMemo(() => {
    if (viewMode === 'mes') {
      return `${MESES[currentMonth] || ''} ${currentYear}`
    } else if (viewMode === 'semana') {
      const targetDays = weekDaysVisiveis.length > 0 ? weekDaysVisiveis : weekDays
      if (!targetDays || targetDays.length === 0) return 'Período'
      const first = targetDays[0]?.date
      const last = targetDays[targetDays.length - 1]?.date
      const isFirstValid = first instanceof Date && !isNaN(first.getTime())
      const isLastValid = last instanceof Date && !isNaN(last.getTime())

      if (!isFirstValid && !isLastValid) {
        return `${MESES[currentMonth] || ''} ${currentYear}`
      }
      if (isFirstValid && !isLastValid) {
        return `${first.getDate()} de ${MESES[first.getMonth()] || ''} de ${first.getFullYear()}`
      }
      if (!isFirstValid && isLastValid) {
        return `${last.getDate()} de ${MESES[last.getMonth()] || ''} de ${last.getFullYear()}`
      }

      // Ambos válidos
      try {
        if (first.getMonth() === last.getMonth()) {
          return `${first.getDate()}–${last.getDate()} de ${MESES[first.getMonth()] || ''} de ${first.getFullYear()}`
        }
        if (first.getFullYear() === last.getFullYear()) {
          return `${first.getDate()} de ${MESES[first.getMonth()] || ''} – ${last.getDate()} de ${MESES[last.getMonth()] || ''} de ${first.getFullYear()}`
        }
        return `${first.getDate()}/${first.getMonth() + 1}/${first.getFullYear()} – ${last.getDate()}/${last.getMonth() + 1}/${last.getFullYear()}`
      } catch (_) {
        return `${MESES[currentMonth] || ''} ${currentYear}`
      }
    } else {
      // Visão Dia
      try {
        const d =
          selectedDayDate instanceof Date && !isNaN(selectedDayDate.getTime())
            ? selectedDayDate
            : new Date()
        const dia = d.getDate()
        const mes = MESES[d.getMonth()] || ''
        const ano = d.getFullYear()
        return `${dia} de ${mes} de ${ano}`
      } catch (_) {
        return 'Hoje'
      }
    }
  }, [viewMode, currentMonth, currentYear, weekDays, weekDaysVisiveis, selectedDayDate])

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() // 0 = Domingo
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()

    const days: {
      date: Date
      dayNumber: number
      isCurrentMonth: boolean
      isToday: boolean
      dateKey: string
    }[] = []

    // Preenchimento dos dias do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i)
      const dateKey = getLocalDateKey(d)
      days.push({
        date: d,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        dateKey,
      })
    }

    // Dias do mês atual
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const d = new Date(currentYear, currentMonth, day)
      const dateKey = getLocalDateKey(d)
      days.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        dateKey,
      })
    }

    // Preenchimento até completar semanas inteiras (múltiplo de 7)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(currentYear, currentMonth + 1, i)
        const dateKey = getLocalDateKey(d)
        days.push({
          date: d,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: dateKey === todayKey,
          dateKey,
        })
      }
    }

    return days
  }, [currentYear, currentMonth, todayKey])

  // OS do dia selecionado (para detalhamento em gaveta/lista abaixo em mobile)
  const ordensDiaSelecionado = useMemo(() => {
    if (!selectedDayKey) return []
    return ordensPorDia.get(selectedDayKey) || []
  }, [selectedDayKey, ordensPorDia])

  const diaSelecionadoFormatado = useMemo(() => {
    if (!selectedDayKey) return ''
    const str = safeStr(selectedDayKey).trim()
    const parts = str.split('-')
    if (parts.length !== 3) return str
    const dia = parseInt(parts[2], 10)
    const mes = parseInt(parts[1], 10) - 1
    const ano = parseInt(parts[0], 10)
    if (isNaN(ano) || isNaN(mes) || isNaN(dia) || mes < 0 || mes > 11) {
      return str
    }
    return `${dia} de ${MESES[mes] || ''} de ${ano}`
  }, [selectedDayKey])

  return (
    <div className="space-y-2 w-full">
      {/* Cabeçalho Compacto e Consolidado em Linha Única:
          Esquerda: Abas de navegação (Pendentes, Calendário, Concluídas, Relatório)
          Centro: Controles de período (Navegação < Hoje > + Rótulo + Seletor Mês/Semana/Dia)
          Direita: Ações Primárias (Nova Atividade, Filtros) */}
      <div className="bg-white rounded-xl px-2.5 py-1.5 border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        {/* Bloco Esquerda: Abas de navegação injetadas ou título padrão se standalone */}
        <div className="flex items-center gap-2 shrink-0">
          {leftControlsSlot ? (
            leftControlsSlot
          ) : (
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-gray-900">Calendário de Atividades</span>
            </div>
          )}
        </div>

        {/* Bloco Central: Período, Navegação e Modo de Visualização */}
        <div className="items-center gap-2 flex-wrap justify-center flex-1 min-w-[280px] pl-[0px] flex">
          {/* Navegação entre períodos: < Hoje > */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrev}
              className="h-7 w-7 p-0 rounded-md border-gray-200 hover:bg-gray-50 text-gray-700 shrink-0 pl-[0px]"
              title={
                viewMode === 'mes'
                  ? 'Mês anterior'
                  : viewMode === 'semana'
                    ? 'Semana anterior'
                    : 'Dia anterior'
              }
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCurrent}
              className="h-7 px-2 rounded-md border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs shrink-0"
              title="Ir para o período atual"
            >
              Hoje
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="h-7 w-7 p-0 rounded-md border-gray-200 hover:bg-gray-50 text-gray-700 shrink-0"
              title={
                viewMode === 'mes'
                  ? 'Próximo mês'
                  : viewMode === 'semana'
                    ? 'Próxima semana'
                    : 'Próximo dia'
              }
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Toggles de Sábados e Domingos (no mobile ficam aqui, ao lado dos botões < Hoje > com apenas S e D) */}
          <div className="flex sm:hidden items-center gap-1.5 text-xs font-medium text-gray-700 select-none pl-0.5">
            <label
              className="flex items-center gap-1 cursor-pointer hover:text-gray-900 px-1 py-0.5 rounded bg-gray-50 border border-gray-200/80"
              title="Exibir Sábados na semana"
            >
              <Checkbox
                checked={showSabados}
                onCheckedChange={(checked) => handleToggleSabados(Boolean(checked))}
                className="h-3.5 w-3.5 border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <span className="text-[11px] font-bold text-gray-800">S</span>
            </label>
            <label
              className="flex items-center gap-1 cursor-pointer hover:text-gray-900 px-1 py-0.5 rounded bg-gray-50 border border-gray-200/80"
              title="Exibir Domingos na semana"
            >
              <Checkbox
                checked={showDomingos}
                onCheckedChange={(checked) => handleToggleDomingos(Boolean(checked))}
                className="h-3.5 w-3.5 border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <span className="text-[11px] font-bold text-gray-800">D</span>
            </label>
          </div>

          {/* Rótulo do Período + Badge Compacta de Contagem (Apenas Desktop: hidden sm:flex) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <span className="text-xs sm:text-sm font-bold text-gray-900 tracking-tight whitespace-nowrap">
              {headerPeriodoTexto}
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap"
              title={`${totalNoPeriodoExibido} ordem(ns) de serviço agendada(s) no período`}
            >
              {totalNoPeriodoExibido} OS
            </span>
          </div>

          {/* Seletor de Modo: Mês | Semana | Dia (Apenas Desktop: hidden sm:inline-flex; mobile fixa padrão Semana) */}
          <div className="hidden sm:inline-flex items-center p-0.5 bg-gray-100/90 rounded-md border border-gray-200 shadow-2xs text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('mes')}
              className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                viewMode === 'mes'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setViewMode('semana')}
              className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                viewMode === 'semana'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('dia')
                if (!selectedDayKey) {
                  setSelectedDayKey(getLocalDateKey(new Date()))
                }
              }}
              className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                viewMode === 'dia'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dia
            </button>
          </div>

          {/* Toggles de Sábados e Domingos (Desktop: hidden sm:flex com texto completo "Sábados" / "Domingos") */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-700 select-none pl-1">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900">
              <Checkbox
                checked={showSabados}
                onCheckedChange={(checked) => handleToggleSabados(Boolean(checked))}
                className="h-3.5 w-3.5 border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap">
                Sábados
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900">
              <Checkbox
                checked={showDomingos}
                onCheckedChange={(checked) => handleToggleDomingos(Boolean(checked))}
                className="h-3.5 w-3.5 border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap">
                Domingos
              </span>
            </label>
          </div>
        </div>

        {/* Bloco Direita: Ações Primárias opcionais */}
        {rightActionsSlot ? (
          <div className="flex items-center gap-1.5 shrink-0 justify-end">{rightActionsSlot}</div>
        ) : null}
      </div>

      {/* ========================================================== */}
      {/* VISÃO 1: MÊS (Grade com 7 colunas, domingo a sábado)        */}
      {/* ========================================================== */}
      {viewMode === 'mes' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            {/* Cabeçalho dos Dias da Semana */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80 text-center text-xs font-bold text-gray-600">
              {DIAS_SEMANA_NOMES.map((nome, index) => (
                <div
                  key={nome}
                  className={`py-2.5 sm:py-3 uppercase tracking-wider text-[11px] sm:text-xs ${
                    index === 0 || index === 6 ? 'text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {nome}
                </div>
              ))}
            </div>

            {/* Grade de Dias */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-200/70 border-b border-gray-200/70">
              {calendarDays.map((cell) => {
                const dayOrdens = ordensPorDia.get(cell.dateKey) || []
                const hasOrdens = dayOrdens.length > 0
                const isSelected = selectedDayKey === cell.dateKey

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => setSelectedDayKey(cell.dateKey)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedDayKey(cell.dateKey)
                      }
                    }}
                    className={`min-h-[105px] sm:min-h-[135px] md:min-h-[150px] p-1.5 sm:p-2 flex flex-col justify-between transition-all cursor-pointer relative ${
                      !cell.isCurrentMonth
                        ? 'bg-gray-50/50 opacity-45'
                        : cell.isToday
                          ? 'bg-emerald-50/30 ring-2 ring-emerald-500/40 ring-inset'
                          : isSelected
                            ? 'bg-emerald-50/20 ring-1 ring-emerald-400 ring-inset'
                            : 'bg-white hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Número do Dia + Indicador de Hoje / Badge Contagem */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`inline-flex items-center justify-center text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-transform ${
                          cell.isToday
                            ? 'bg-[#166534] text-white shadow-2xs font-extrabold'
                            : isSelected
                              ? 'bg-emerald-100 text-emerald-900 font-bold'
                              : cell.isCurrentMonth
                                ? 'text-gray-800'
                                : 'text-gray-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {cell.isToday && (
                        <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Hoje
                        </span>
                      )}

                      {hasOrdens && (
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            cell.isToday
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                          title={`${dayOrdens.length} ordem(ns) neste dia`}
                        >
                          {dayOrdens.length}
                        </span>
                      )}
                    </div>

                    {/* Cards compactos com as OSs do Dia */}
                    <div className="flex-1 space-y-1 sm:space-y-1.5 overflow-hidden">
                      {dayOrdens.slice(0, 3).map((os) => {
                        if (!os || typeof os !== 'object') return null
                        const tipoServico = safeStr(os.tipo_servico) || 'Manutenção'
                        const tipoConfig = getTipoServicoConfig(tipoServico)
                        const horario = extractHorario(os.data_agendada)
                        const clienteNome =
                          os.expand?.cliente_id?.nome ||
                          os.expand?.cliente_id?.razao_social ||
                          'Cliente Solar'

                        return (
                          <div
                            key={safeStr(os.id)}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectOS(os)
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation()
                                onSelectOS(os)
                              }
                            }}
                            style={{
                              borderLeftWidth: '3.5px',
                              borderLeftColor: tipoConfig.borderColor,
                              backgroundColor: tipoConfig.pillBg,
                            }}
                            className="p-1 sm:p-1.5 rounded-md border border-gray-200/70 text-left transition-all hover:scale-[1.02] hover:shadow-xs group cursor-pointer"
                            title={`${horario} • ${clienteNome} (${tipoServico}) - Clique para abrir a ficha de execução`}
                          >
                            {/* Horário + Tipo (com cor) */}
                            <div className="flex items-center justify-between gap-1 leading-none mb-0.5">
                              <span className="text-[10px] sm:text-[11px] font-bold text-gray-900 flex items-center gap-0.5 shrink-0">
                                <Clock className="w-2.5 h-2.5 text-gray-500" />
                                {horario}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span
                                  className="text-[9px] font-extrabold uppercase truncate tracking-wider"
                                  style={{ color: tipoConfig.hex }}
                                >
                                  {tipoServico}
                                </span>
                              </div>
                            </div>

                            {/* Nome do Cliente */}
                            <div className="text-[10px] sm:text-xs font-semibold text-gray-900 truncate group-hover:text-emerald-800 transition-colors">
                              {clienteNome}
                            </div>
                          </div>
                        )
                      })}

                      {/* Mais OSs no dia */}
                      {dayOrdens.length > 3 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDayKey(cell.dateKey)
                          }}
                          className="w-full text-center text-[10px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline bg-emerald-50/50 py-0.5 rounded"
                        >
                          +{dayOrdens.length - 3} mais...
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Estado Vazio se o mês não tiver nenhuma OS */}
          {totalNoPeriodoExibido === 0 && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-200">
                <CalendarIcon className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">
                Nenhuma ordem de serviço agendada para este período.
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mb-4">
                Utilize os botões de navegação acima para consultar outros meses ou volte ao mês
                atual.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCurrent}
                className="h-8 px-3 rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
              >
                Ir para a Semana Atual
              </Button>{' '}
            </div>
          )}
        </>
      )}

      {/* ========================================================== */}
      {/* VISÃO 2: SEMANA (Grade Horária Google Calendar 06:00 - 22:00) */}
      {/* ========================================================== */}
      {viewMode === 'semana' && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden select-none flex flex-col">
          {/* Seção "Dia Todo / Sem Horário Definido" no topo (renderizada quando mostrarLinhaDiaTodo é true) */}
          {mostrarLinhaDiaTodo && (
            <div className="border-b border-gray-200 bg-gray-50/70 p-2 sm:p-2.5 overflow-x-auto touch-pan-x">
              <div className="flex items-start gap-2">
                <div className="w-14 sm:w-16 shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider pt-1.5 text-right pr-2 sticky left-0 z-20 bg-gray-50/90">
                  Dia todo
                </div>
                <div
                  className="flex-1 grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${weekDaysVisiveis.length || 1}, minmax(120px, 1fr))`,
                    minWidth: `${(weekDaysVisiveis.length || 1) * 120}px`,
                  }}
                >
                  {weekDaysVisiveis.map((dia) => {
                    const dayOrdens = ordensPorDia.get(dia.dateKey) || []
                    const { diaInteiro } = separarOrdensDoDia(dayOrdens)

                    return (
                      <div
                        key={`all-day-${dia.dateKey}`}
                        onDragOver={(e) => handleDragOverSlot(e, dia.dateKey, HORA_INICIAL)}
                        onDrop={(e) => handleDropOnSlot(e, dia.dateKey, HORA_INICIAL)}
                        className={`min-h-[32px] p-1 rounded-lg border border-dashed transition-colors flex flex-col gap-1 ${
                          dragOverSlot?.dateKey === dia.dateKey
                            ? 'border-emerald-500 bg-emerald-50/60'
                            : dia.isToday
                              ? 'border-emerald-200 bg-emerald-50/20'
                              : 'border-gray-200 bg-white/70'
                        }`}
                      >
                        {diaInteiro.length === 0 ? (
                          <span className="text-[10px] text-gray-300 text-center py-1 block">
                            -
                          </span>
                        ) : (
                          diaInteiro.map((os) => {
                            const tipoServico = os.tipo_servico || 'Manutenção'
                            const tipoConfig = getTipoServicoConfig(tipoServico)
                            const clienteNome =
                              os.expand?.cliente_id?.nome ||
                              os.expand?.cliente_id?.razao_social ||
                              'Cliente Solar'

                            if (!os || typeof os !== 'object') return null
                            return (
                              <div
                                key={`allday-${safeStr(os.id)}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, safeStr(os.id))}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectOS(os)
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border bg-white shadow-2xs hover:border-gray-400 cursor-pointer transition-all hover:shadow-xs flex items-center justify-between gap-1"
                                style={{
                                  borderLeftWidth: '3px',
                                  borderLeftColor: tipoConfig.hex,
                                }}
                                title={`${clienteNome} (${tipoServico}) - Clique para ver ficha / arraste para grade`}
                              >
                                <div className="flex items-center gap-1 truncate">
                                  <span className="truncate">{clienteNome}</span>
                                </div>
                                <span className="text-[9px] text-gray-400 shrink-0">Dia todo</span>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Contêiner com scroll bidirecional suave no mobile (touch-pan-x touch-pan-y, max-h-[640px]) */}
          <div
            ref={timeGridRef}
            className="overflow-auto max-h-[640px] bg-white relative touch-pan-x touch-pan-y"
          >
            {/* Cabeçalho das Colunas de Dias da Semana (sticky top-0 z-20 com sombra suave) */}
            <div className="flex border-b border-gray-200 bg-[#FAFBFB] sticky top-0 z-20 shadow-2xs">
              {/* Célula de canto (GMT-3): sticky left-0 top-0 z-30 bg-[#FAFBFB] */}
              <div className="w-14 sm:w-16 shrink-0 border-r border-gray-200 p-2 text-[10px] font-bold text-gray-400 text-right uppercase tracking-wider sticky left-0 top-0 z-30 bg-[#FAFBFB] shadow-xs">
                GMT-3
              </div>

              {/* Colunas dos dias visíveis */}
              <div
                className="flex-1 grid divide-x divide-gray-200"
                style={{
                  gridTemplateColumns: `repeat(${weekDaysVisiveis.length || 1}, minmax(120px, 1fr))`,
                  minWidth: `${(weekDaysVisiveis.length || 1) * 120}px`,
                }}
              >
                {weekDaysVisiveis.map((dia) => (
                  <div
                    key={`header-${dia.dateKey}`}
                    onClick={() => setSelectedDayKey(dia.dateKey)}
                    className={`p-2 sm:p-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                      dia.isToday
                        ? 'bg-emerald-50/80 text-emerald-950 font-bold'
                        : selectedDayKey === dia.dateKey
                          ? 'bg-gray-100/70 text-gray-900 font-bold'
                          : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-xs uppercase font-extrabold tracking-wider ${
                          dia.isToday ? 'text-emerald-700' : 'text-gray-500'
                        }`}
                      >
                        {dia.diaSemanaCurto}
                      </span>
                      <span
                        className={`text-sm sm:text-base font-extrabold ${
                          dia.isToday
                            ? 'w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center -ml-0.5'
                            : 'text-gray-900'
                        }`}
                      >
                        {dia.dayNumber}
                      </span>
                    </div>

                    <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                      {dia.date instanceof Date && !isNaN(dia.date.getTime())
                        ? (MESES[dia.date.getMonth()] || '').slice(0, 3)
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Linhas da Grade Horária (06:00 às 22:00) */}
            <div className="flex divide-x divide-gray-200 relative">
              {/* Régua de Horas (lado esquerdo): sticky left-0 z-20 bg-[#FAFBFB] border-r border-gray-200 sombra leve */}
              <div className="w-14 sm:w-16 shrink-0 bg-[#FAFBFB] select-none sticky left-0 z-20 border-r border-gray-200 shadow-xs">
                {Array.from({ length: TOTAL_HORAS }, (_, idx) => {
                  const hora = HORA_INICIAL + idx
                  return (
                    <div
                      key={`time-label-${hora}`}
                      className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 pr-2 text-right relative"
                      style={{ height: `${ALTURA_HORA_PX}px` }}
                    >
                      <span className="-top-2.5 relative block">
                        {String(hora).padStart(2, '0')}:00
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Colunas de cada dia na grade horária (com gridTemplateColumns dinâmico) */}
              <div
                className="flex-1 grid divide-x divide-gray-200 relative"
                style={{
                  gridTemplateColumns: `repeat(${weekDaysVisiveis.length || 1}, minmax(120px, 1fr))`,
                  minWidth: `${(weekDaysVisiveis.length || 1) * 120}px`,
                }}
              >
                {weekDaysVisiveis.map((dia) => {
                  const dayOrdens = ordensPorDia.get(dia.dateKey) || []
                  const { comHorario } = separarOrdensDoDia(dayOrdens)

                  return (
                    <div
                      key={`col-${dia.dateKey}`}
                      className={`relative ${dia.isToday ? 'bg-emerald-50/10' : 'bg-white'}`}
                      style={{ height: `${TOTAL_HORAS * ALTURA_HORA_PX}px` }}
                    >
                      {/* Linhas de grade horária (slots receptores de Drop) */}
                      {Array.from({ length: TOTAL_HORAS }, (_, idx) => {
                        const hora = HORA_INICIAL + idx
                        const isHovered =
                          dragOverSlot?.dateKey === dia.dateKey && dragOverSlot?.hora === hora

                        return (
                          <div
                            key={`slot-${dia.dateKey}-${hora}`}
                            onDragOver={(e) => handleDragOverSlot(e, dia.dateKey, hora)}
                            onDrop={(e) => handleDropOnSlot(e, dia.dateKey, hora)}
                            onClick={() => setSelectedDayKey(dia.dateKey)}
                            className={`border-b border-gray-100 transition-colors cursor-pointer group/slot relative ${
                              isHovered
                                ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-400/40'
                                : 'hover:bg-gray-50/80'
                            }`}
                            style={{ height: `${ALTURA_HORA_PX}px` }}
                            title={`Arraste uma OS até as ${hora}:00h ou clique para selecionar o dia`}
                          >
                            {/* Linha pontilhada de meia hora para visualização precisa */}
                            <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-gray-100/80 pointer-events-none" />
                          </div>
                        )
                      })}

                      {/* Cards de OS Posicionados na Grade */}
                      {comHorario.map((item) => {
                        if (!item || !item.os || typeof item.os !== 'object') return null
                        const rawOs = item.os
                        const os = {
                          ...rawOs,
                          checklist: normalizeChecklist(rawOs.checklist),
                        }
                        const osId = safeStr(os.id) || `os_pos_${item.hora}_${item.minuto}`
                        const tipoServico = safeStr(os.tipo_servico) || 'Manutenção'
                        const tipoConfig = getTipoServicoConfig(tipoServico)
                        const isConcluida = os.status === 'concluida'
                        const isDragging = draggingOSId === osId
                        const isBeingResized = resizing?.osId === osId
                        const horaInicioStr =
                          (os.horario_inicio && /^\d{1,2}:\d{2}/.test(safeStr(os.horario_inicio))
                            ? safeStr(os.horario_inicio).slice(0, 5)
                            : '') || extractHorario(os.data_agendada)

                        // Calcula hora de término prevista com validação matemática segura contra NaN/Infinity
                        const numHora = Number(item.hora)
                        const safeHora =
                          !isNaN(numHora) && isFinite(numHora) ? numHora : HORA_INICIAL
                        const numMinuto = Number(item.minuto)
                        const safeMinuto = !isNaN(numMinuto) && isFinite(numMinuto) ? numMinuto : 0
                        const minutosInicio = safeHora * 60 + safeMinuto

                        const numDuracaoItem = Number(item.duracaoMinutos)
                        const safeDuracaoItem =
                          !isNaN(numDuracaoItem) && isFinite(numDuracaoItem) && numDuracaoItem > 0
                            ? numDuracaoItem
                            : DURACAO_PADRAO_MINUTOS

                        const rawMinutosFim = minutosInicio + safeDuracaoItem
                        const minutosFim =
                          !isNaN(rawMinutosFim) && isFinite(rawMinutosFim)
                            ? Math.min(24 * 60 - 1, Math.max(0, rawMinutosFim))
                            : minutosInicio + DURACAO_PADRAO_MINUTOS

                        const horaFimCalc = Math.floor(minutosFim / 60)
                        const minutoFimCalc = Math.floor(minutosFim % 60)
                        const safeHoraFimValida =
                          !isNaN(horaFimCalc) && isFinite(horaFimCalc)
                            ? Math.min(23, Math.max(0, horaFimCalc))
                            : 22
                        const safeMinutoFimValido =
                          !isNaN(minutoFimCalc) && isFinite(minutoFimCalc)
                            ? Math.min(59, Math.max(0, minutoFimCalc))
                            : 0
                        const horaFimCalculada = `${String(safeHoraFimValida).padStart(2, '0')}:${String(safeMinutoFimValido).padStart(2, '0')}`

                        const horaFimStr =
                          (os.horario_fim &&
                          /^\d{1,2}:\d{2}/.test(safeStr(os.horario_fim)) &&
                          !isBeingResized
                            ? safeStr(os.horario_fim).slice(0, 5)
                            : '') || horaFimCalculada

                        const rawDuracaoEfetiva =
                          isBeingResized && resizing ? resizing.currentDuracao : item.duracaoMinutos
                        const numDuracaoEfetiva = Number(rawDuracaoEfetiva)
                        const duracaoEfetiva =
                          !isNaN(numDuracaoEfetiva) &&
                          isFinite(numDuracaoEfetiva) &&
                          numDuracaoEfetiva > 0
                            ? numDuracaoEfetiva
                            : DURACAO_PADRAO_MINUTOS
                        const rawHeightCalc = (duracaoEfetiva / 60) * ALTURA_HORA_PX - 2
                        const cardHeight =
                          !isNaN(rawHeightCalc) && isFinite(rawHeightCalc)
                            ? Math.max(28, Math.round(rawHeightCalc))
                            : 28

                        const rawCardTop = Number(item.top)
                        const cardTop =
                          !isNaN(rawCardTop) && isFinite(rawCardTop)
                            ? Math.max(0, Math.round(rawCardTop))
                            : 0

                        const clienteNome =
                          os.expand?.cliente_id?.nome ||
                          os.expand?.cliente_id?.razao_social ||
                          'Cliente Solar'

                        return (
                          <div
                            key={`card-${os.id}`}
                            draggable={!isBeingResized}
                            onDragStart={(e) => handleDragStart(e, os.id)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectOS(os)
                            }}
                            className={`absolute left-1 right-1 rounded-xl p-1.5 pb-2 border shadow-2xs transition-all flex flex-col justify-between overflow-hidden cursor-pointer group ${
                              isDragging ? 'opacity-40 scale-95 ring-2 ring-emerald-500' : ''
                            } ${
                              isConcluida
                                ? 'bg-gray-50 text-gray-500 border-gray-300 opacity-80'
                                : 'bg-white hover:border-gray-400 hover:shadow-md'
                            }`}
                            style={{
                              top: `${cardTop}px`,
                              height: `${cardHeight}px`,
                              borderLeftWidth: '4px',
                              borderLeftColor: isConcluida ? '#9CA3AF' : tipoConfig.hex,
                              backgroundColor: isConcluida ? '#F9FAFB' : tipoConfig.pillBg,
                              zIndex: isDragging || isBeingResized ? 30 : 10,
                            }}
                            title={`${clienteNome} (${tipoServico}) • ${horaInicioStr} - ${horaFimStr}\nClique para abrir ficha de execução\nArraste para mover horário/dia\nPuxe a borda inferior para ajustar duração`}
                          >
                            {/* Conteúdo do Card */}
                            <div className="min-w-0 flex-1 overflow-hidden pb-1">
                              {/* Topo: Horário + Tipo */}
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-[10px] font-bold text-gray-700 font-mono flex items-center gap-0.5 shrink-0">
                                  <Clock className="w-2.5 h-2.5 text-gray-400" />
                                  {horaInicioStr} - {horaFimStr}
                                </span>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span
                                    className="text-[8px] font-extrabold uppercase tracking-wider truncate"
                                    style={{ color: tipoConfig.hex }}
                                  >
                                    {tipoServico}
                                  </span>
                                </div>
                              </div>

                              {/* Nome do Cliente */}
                              <div
                                className={`text-[11px] font-bold leading-tight truncate ${
                                  isConcluida
                                    ? 'text-gray-400 line-through'
                                    : 'text-gray-900 group-hover:text-emerald-800'
                                }`}
                              >
                                {clienteNome}
                              </div>

                              {/* Responsável / Duração (se couber na altura) */}
                              {cardHeight >= 48 && (
                                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5 truncate gap-1">
                                  <span className="truncate flex items-center gap-0.5">
                                    <User className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                                    <span className="truncate">
                                      {os.atribuida_a || 'Não atribuído'}
                                    </span>
                                  </span>
                                  <span className="text-[9px] text-gray-400 shrink-0">
                                    {item.duracaoMinutos}m
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Alça inferior de redimensionamento (bem fininha, padrão para cards de 1h, 30min e longos) */}
                            <div
                              data-testid={`resize-handle-${os.id}`}
                              onMouseDown={(e) => {
                                e.stopPropagation()
                                handleResizeStart(e, os)
                              }}
                              onPointerDown={(e) => {
                                e.stopPropagation()
                                handleResizeStart(e, os)
                              }}
                              onClick={(e) => {
                                // Evita que o clique na alça abra a ficha de execução da OS
                                e.stopPropagation()
                              }}
                              style={{ touchAction: 'none', userSelect: 'none' }}
                              className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize flex items-center justify-center bg-transparent hover:bg-emerald-400/30 active:bg-emerald-500/40 transition-colors select-none z-30"
                              title="Puxe a borda inferior para aumentar ou reduzir o tempo previsto (blocos de 30 min)"
                            >
                              <div className="w-12 h-[2.5px] rounded-full bg-gray-400/90 group-hover:bg-emerald-600 group-hover:h-[3px] transition-all pointer-events-none shadow-2xs" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Dicas e Instruções Google Calendar */}
          <div className="px-2.5 py-1.5 border-t border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[11px] text-gray-500">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1"
                title="Arraste uma OS até o horário ou clique para selecionar o dia"
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Arraste uma OS até o horário ou clique para selecionar o dia</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-gray-400">
                • Puxe a borda para ajustar duração • Clique para abrir ficha
              </span>
            </div>

            <div className="text-[10px] font-semibold text-emerald-800 shrink-0">06:00 – 22:00</div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VISÃO 3: DIA (Painel único do dia selecionado)             */}
      {/* ========================================================== */}
      {viewMode === 'dia' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 inline-flex shadow-2xs">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Visão Diária • Agendamentos
                </span>
                <h4 className="text-base sm:text-lg font-bold text-gray-900">
                  {diaSelecionadoFormatado}
                </h4>
              </div>
            </div>

            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              {ordensDiaSelecionado.length}{' '}
              {ordensDiaSelecionado.length === 1 ? 'OS agendada' : 'OSs agendadas'}
            </span>
          </div>

          {ordensDiaSelecionado.length === 0 ? (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1 border border-emerald-200">
                <CalendarIcon className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-gray-900">
                Nenhuma ordem de serviço agendada para este período.
              </h4>
              <p className="text-xs text-gray-500 max-w-sm">
                Nenhuma OS encontrada para {diaSelecionadoFormatado}. Navegue pelos botões "Dia
                anterior" e "Próximo dia" ou retorne para "Hoje".
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCurrent}
                className="h-8 px-3 rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
              >
                Ir para o Mês Atual
              </Button>{' '}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ordensDiaSelecionado.map((os) => {
                if (!os || typeof os !== 'object') return null
                const tipoServico = safeStr(os.tipo_servico) || 'Manutenção'
                const tipoConfig = getTipoServicoConfig(tipoServico)
                const horario = extractHorario(os.data_agendada)
                const clienteNome =
                  os.expand?.cliente_id?.nome ||
                  os.expand?.cliente_id?.razao_social ||
                  'Cliente Solar'
                const listChecklist = normalizeChecklist(os.checklist)
                const checklistTotal = listChecklist.length
                const checklistFeitos = listChecklist.filter((c) => c?.concluido).length

                return (
                  <div
                    key={safeStr(os.id)}
                    onClick={() => onSelectOS(os)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectOS(os)
                      }
                    }}
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: tipoConfig.borderColor,
                    }}
                    className="p-3.5 sm:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between"
                  >
                    <div>
                      {/* Topo do card do dia */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                            style={{
                              borderColor: `${tipoConfig.borderColor}50`,
                              backgroundColor: tipoConfig.pillBg,
                              color: tipoConfig.hex,
                            }}
                          >
                            {tipoServico}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {horario}
                        </span>
                      </div>

                      {/* Nome do Cliente */}
                      <h5
                        title={clienteNome}
                        className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-1"
                      >
                        {clienteNome}
                      </h5>

                      {/* Endereço */}
                      <div
                        title={os.endereco || 'Endereço não informado'}
                        className="flex items-start gap-1.5 text-xs text-gray-600 mb-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed break-words">
                          {os.endereco || 'Endereço não informado'}
                        </span>
                      </div>

                      {/* Responsável */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                          Instalador:{' '}
                          <strong className="text-gray-700">
                            {os.atribuida_a || 'Não atribuído'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Rodapé com botão Direto para a Ficha de Execução */}
                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs mt-1">
                      <span className="text-[11px] text-gray-500 font-medium">
                        {checklistTotal > 0
                          ? `Checklist: ${checklistFeitos}/${checklistTotal}`
                          : os.status === 'concluida'
                            ? 'Concluída'
                            : 'Pendente'}
                      </span>

                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                        <span>Abrir Ficha de Execução</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Painel de Detalhes do Dia Selecionado (exibido na visão Mês e Semana quando um dia está selecionado) */}
      {viewMode !== 'dia' && selectedDayKey && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 inline-flex">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Ordens de Serviço do Dia
                </span>
                <h4 className="text-sm sm:text-base font-bold text-gray-900">
                  {diaSelecionadoFormatado}
                </h4>
              </div>
            </div>

            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {ordensDiaSelecionado.length}{' '}
              {ordensDiaSelecionado.length === 1 ? 'OS agendada' : 'OSs agendadas'}
            </span>
          </div>

          {ordensDiaSelecionado.length === 0 ? (
            <div className="py-6 text-center text-gray-400 space-y-1">
              <Clock className="w-6 h-6 text-gray-300 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-600">
                Nenhuma ordem de serviço agendada para este dia.
              </p>
              <p className="text-[11px] text-gray-400">
                Selecione outro dia no calendário acima para conferir os agendamentos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ordensDiaSelecionado.map((os) => {
                if (!os || typeof os !== 'object') return null
                const tipoServico = safeStr(os.tipo_servico) || 'Manutenção'
                const tipoConfig = getTipoServicoConfig(tipoServico)
                const horario = extractHorario(os.data_agendada)
                const clienteNome =
                  os.expand?.cliente_id?.nome ||
                  os.expand?.cliente_id?.razao_social ||
                  'Cliente Solar'
                const listChecklist = normalizeChecklist(os.checklist)
                const checklistTotal = listChecklist.length
                const checklistFeitos = listChecklist.filter((c) => c?.concluido).length

                return (
                  <div
                    key={safeStr(os.id)}
                    onClick={() => onSelectOS(os)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectOS(os)
                      }
                    }}
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: tipoConfig.borderColor,
                    }}
                    className="p-3 sm:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between"
                  >
                    <div>
                      {/* Topo do card do dia */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                            style={{
                              borderColor: `${tipoConfig.borderColor}50`,
                              backgroundColor: tipoConfig.pillBg,
                              color: tipoConfig.hex,
                            }}
                          >
                            {tipoServico}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {horario}
                        </span>
                      </div>

                      {/* Nome do Cliente */}
                      <h5
                        title={clienteNome}
                        className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-1"
                      >
                        {clienteNome}
                      </h5>

                      {/* Endereço */}
                      <div
                        title={os.endereco || 'Endereço não informado'}
                        className="flex items-start gap-1.5 text-xs text-gray-600 mb-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed break-words">
                          {os.endereco || 'Endereço não informado'}
                        </span>
                      </div>

                      {/* Responsável */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                          Instalador:{' '}
                          <strong className="text-gray-700">
                            {os.atribuida_a || 'Não atribuído'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Rodapé com botão Direto para a Ficha de Execução */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs mt-1">
                      <span className="text-[11px] text-gray-500 font-medium">
                        {checklistTotal > 0
                          ? `Checklist: ${checklistFeitos}/${checklistTotal}`
                          : os.status === 'concluida'
                            ? 'Concluída'
                            : 'Pendente'}
                      </span>

                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                        <span>Abrir Ficha de Execução</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function CalendarioExecucaoOS(props: CalendarioExecucaoOSProps) {
  return (
    <ErrorBoundary
      errorMessage="Não foi possível carregar o calendário de ordens de serviço."
      compact
    >
      <CalendarioExecucaoOSContent {...props} />
    </ErrorBoundary>
  )
}

export default CalendarioExecucaoOS
