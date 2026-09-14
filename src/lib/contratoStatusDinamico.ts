import { ContratoOM } from '@/types/crm'

export type ContratoStatusDinamico = 'Ativo' | 'Próximo do vencimento' | 'Encerrado'

export interface ContratoStatusCalculado {
  status: ContratoStatusDinamico
  diasRestantes: number | null
  badgeColorClass: string
  badgeLabel: string
}

/**
 * Calcula o status dinâmico de um contrato O&M:
 * - "Encerrado": se status é Encerrado/Cancelado ou status_encerramento é 'encerrado'
 *   ou motivo_encerramento está preenchido ou data_encerramento está preenchida;
 *   ou se a data de vencimento já expirou (diasRestantes < 0) e não foi renovado.
 * - "Próximo do vencimento": se a data de término/vencimento está em até 60 dias (0 <= dias <= 60).
 * - "Ativo": caso contrário (mais de 60 dias restantes ou sem data que indique vencimento).
 *
 * Badges:
 * - Ativo: verde (bg-emerald-100 text-emerald-800 border-emerald-200)
 * - Próximo do vencimento: âmbar (bg-amber-100 text-amber-800 border-amber-200)
 * - Encerrado: cinza (bg-gray-100 text-gray-700 border-gray-300)
 */
export function calcularStatusDinamicoContrato(
  contrato?: Partial<ContratoOM> | null,
  referenceDate: Date = new Date(),
): ContratoStatusCalculado {
  if (!contrato) {
    return {
      status: 'Encerrado',
      diasRestantes: null,
      badgeColorClass: 'bg-gray-100 text-gray-700 border-gray-300',
      badgeLabel: 'Sem contrato',
    }
  }

  // Verificar se está formalmente encerrado/cancelado
  const statusRaw = String(contrato.status || '').trim()
  const statusEncerramento = String(contrato.status_encerramento || '')
    .trim()
    .toLowerCase()
  const hasMotivoEncerramento = Boolean(contrato.motivo_encerramento)
  const hasDataEncerramento = Boolean(contrato.data_encerramento)

  const isExplicitamenteEncerrado =
    statusRaw === 'Encerrado' ||
    statusRaw === 'Cancelado' ||
    statusEncerramento === 'encerrado' ||
    hasMotivoEncerramento ||
    hasDataEncerramento

  if (isExplicitamenteEncerrado) {
    return {
      status: 'Encerrado',
      diasRestantes: null,
      badgeColorClass: 'bg-gray-100 text-gray-700 border-gray-300',
      badgeLabel: 'Encerrado',
    }
  }

  // Cálculo de dias até a data de término (data_vencimento)
  const dataTermino = contrato.data_vencimento
  if (!dataTermino) {
    return {
      status: 'Ativo',
      diasRestantes: null,
      badgeColorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeLabel: 'Ativo',
    }
  }

  const terminoTimestamp = new Date(dataTermino).getTime()
  if (isNaN(terminoTimestamp)) {
    return {
      status: 'Ativo',
      diasRestantes: null,
      badgeColorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeLabel: 'Ativo',
    }
  }

  const diffMs = terminoTimestamp - referenceDate.getTime()
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  // Se já venceu no passado e não foi renovado
  if (diasRestantes < 0 || statusRaw === 'Vencido') {
    return {
      status: 'Encerrado',
      diasRestantes,
      badgeColorClass: 'bg-gray-100 text-gray-700 border-gray-300',
      badgeLabel: 'Encerrado',
    }
  }

  // Se faltam 60 dias ou menos
  if (diasRestantes <= 60) {
    return {
      status: 'Próximo do vencimento',
      diasRestantes,
      badgeColorClass: 'bg-amber-100 text-amber-800 border-amber-200',
      badgeLabel: 'Próximo do vencimento',
    }
  }

  return {
    status: 'Ativo',
    diasRestantes,
    badgeColorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeLabel: 'Ativo',
  }
}
