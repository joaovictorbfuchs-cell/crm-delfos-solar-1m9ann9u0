// Utilitários de formatação e cálculos para Faturas RGE / Concessionária

export function formatarTempoRelativo(isoOuData?: string | Date | null): string {
  if (!isoOuData) return 'Há pouco'
  try {
    const d = typeof isoOuData === 'string' ? new Date(isoOuData) : isoOuData
    if (isNaN(d.getTime())) return 'Há pouco'

    const agora = Date.now()
    const diffMs = Math.max(0, agora - d.getTime())
    const diffMin = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)
    const diffMeses = Math.floor(diffDias / 30)

    if (diffMin < 60) {
      if (diffMin <= 1) return 'Há 1 minuto'
      return `Há ${diffMin} minutos`
    }
    if (diffHoras < 24) {
      if (diffHoras === 1) return 'Há 1 hora'
      return `Há ${diffHoras} horas`
    }
    if (diffDias < 30) {
      if (diffDias === 1) return 'Há 1 dia'
      return `Há ${diffDias} dias`
    }
    if (diffMeses <= 1) return 'Há 1 mês'
    return `Há ${diffMeses} meses`
  } catch {
    return 'Há pouco'
  }
}

const MESES_ABREV = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
]

/**
 * Formata competência para padrão NOV/2026
 * Aceita "2026-11", "11/2026", "2026/11", "NOV/2026", "2026-11-01" etc.
 */
export function formatarCompetenciaRge(comp?: string | null): string {
  if (!comp) return '-'
  const limpo = comp.trim().toUpperCase()

  // Se já estiver no formato MES/ANO (ex. NOV/2026)
  if (/^[A-Z]{3}\/\d{4}$/.test(limpo)) {
    return limpo
  }

  // Se for YYYY-MM ou YYYY-MM-DD
  const mIso = limpo.match(/^(\d{4})[-/](\d{1,2})/)
  if (mIso) {
    const ano = mIso[1]
    const mesIndex = parseInt(mIso[2], 10) - 1
    if (mesIndex >= 0 && mesIndex < 12) {
      return `${MESES_ABREV[mesIndex]}/${ano}`
    }
  }

  // Se for MM/YYYY
  const mMmYyyy = limpo.match(/^(\d{1,2})[-/](\d{4})$/)
  if (mMmYyyy) {
    const mesIndex = parseInt(mMmYyyy[1], 10) - 1
    const ano = mMmYyyy[2]
    if (mesIndex >= 0 && mesIndex < 12) {
      return `${MESES_ABREV[mesIndex]}/${ano}`
    }
  }

  return limpo
}
