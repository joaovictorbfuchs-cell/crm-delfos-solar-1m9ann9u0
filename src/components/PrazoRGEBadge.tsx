import React from 'react'
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'

export interface PrazoStatusInfo {
  status: 'em_andamento' | 'prazo_proximo' | 'prazo_vencido' | 'sem_prazo'
  rotulo: string
  diasRestantes: number | null
  badgeClass: string
  dotClass: string
  borderClass: string
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Calcula o status visual de prazos:
 * - Em andamento (> 2 dias restantes): Amarelo
 * - Prazo próximo (<= 2 dias e >= 0 dias): Laranja
 * - Prazo vencido (< 0 dias): Vermelho
 */
export function calcularStatusPrazoRGE(prazoStr?: string | null): PrazoStatusInfo {
  if (!prazoStr) {
    return {
      status: 'sem_prazo',
      rotulo: 'Em andamento',
      diasRestantes: null,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      dotClass: 'bg-amber-500',
      borderClass: 'border-amber-300',
      icon: Clock,
    }
  }

  const dPrazo = new Date(prazoStr)
  if (isNaN(dPrazo.getTime())) {
    return {
      status: 'sem_prazo',
      rotulo: 'Em andamento',
      diasRestantes: null,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      dotClass: 'bg-amber-500',
      borderClass: 'border-amber-300',
      icon: Clock,
    }
  }

  const agora = new Date()
  const hojeInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()
  const prazoInicio = new Date(dPrazo.getFullYear(), dPrazo.getMonth(), dPrazo.getDate()).getTime()

  const diffMs = prazoInicio - hojeInicio
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias < 0) {
    const atraso = Math.abs(diffDias)
    return {
      status: 'prazo_vencido',
      rotulo: `Prazo vencido há ${atraso} dia${atraso > 1 ? 's' : ''}`,
      diasRestantes: diffDias,
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
      dotClass: 'bg-rose-500',
      borderClass: 'border-rose-400',
      icon: AlertCircle,
    }
  }

  if (diffDias <= 2) {
    const rotulo =
      diffDias === 0
        ? 'Prazo vence hoje'
        : diffDias === 1
          ? 'Vence amanhã (1 dia)'
          : 'Prazo próximo (2 dias)'
    return {
      status: 'prazo_proximo',
      rotulo,
      diasRestantes: diffDias,
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-300',
      dotClass: 'bg-orange-500',
      borderClass: 'border-orange-400',
      icon: AlertTriangle,
    }
  }

  return {
    status: 'em_andamento',
    rotulo: `Em andamento (${diffDias} dias)`,
    diasRestantes: diffDias,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500',
    borderClass: 'border-amber-300',
    icon: Clock,
  }
}

interface PrazoRGEBadgeProps {
  prazoStr?: string | null
  className?: string
  concluida?: boolean
}

export const PrazoRGEBadge: React.FC<PrazoRGEBadgeProps> = ({
  prazoStr,
  className = '',
  concluida = false,
}) => {
  if (concluida) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-300 ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Concluída</span>
      </span>
    )
  }

  const info = calcularStatusPrazoRGE(prazoStr)
  const IconComp = info.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${info.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.dotClass}`} />
      <IconComp className="w-3.5 h-3.5 shrink-0" />
      <span>{info.rotulo}</span>
    </span>
  )
}
