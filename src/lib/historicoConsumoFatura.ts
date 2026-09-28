/**
 * Utilitários para normalização, ordenação cronológica e deduplicação
 * do histórico de consumo mensal de faturas de energia (RGE / CPFL).
 *
 * Garante que:
 * 1. Os rótulos de mês/ano sejam padronizados (ex: "SET/25", "MAR/26").
 * 2. Itens duplicados sejam mesclados ou mantidos de forma única.
 * 3. O histórico fique ordenado do mês mais antigo para o mais recente (ordem cronológica natural de leitura).
 * 4. Consumo (kWh) e dias de ciclo sejam números válidos e sanitizados.
 */

export interface HistoricoConsumoItemNormalizado {
  mes_ano: string
  consumo_kwh: number
  dias_ciclo: number
}

const MESES_MAP: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  feb: 2,
  mar: 3,
  marco: 3,
  março: 3,
  abr: 4,
  abril: 4,
  apr: 4,
  mai: 5,
  maio: 5,
  may: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  aug: 8,
  set: 9,
  setembro: 9,
  sep: 9,
  out: 10,
  outubro: 10,
  oct: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
  dec: 12,
}

const SIGLAS_MES: string[] = [
  '',
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
 * Converte qualquer representação de mês/ano (ex: "SET 26", "Set/2026", "09/2026", "2026-09", "SET/25")
 * em uma tupla determinística [anoCompleto, mesNumero (1-12)].
 * Se não for possível parsear, retorna null.
 */
export function extrairAnoMes(mesAnoRaw: unknown): { ano: number; mes: number } | null {
  if (!mesAnoRaw) return null
  const str = String(mesAnoRaw).trim().toLowerCase()
  if (!str) return null

  // Caso 1: Formato "YYYY-MM" ou "YYYY/MM"
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})$/)
  if (isoMatch) {
    const ano = parseInt(isoMatch[1], 10)
    const mes = parseInt(isoMatch[2], 10)
    if (mes >= 1 && mes <= 12) return { ano, mes }
  }

  // Caso 2: Formato "MM/YYYY" ou "MM/YY"
  const numMesMatch = str.match(/^(\d{1,2})[-/.](\d{2,4})$/)
  if (numMesMatch) {
    const mes = parseInt(numMesMatch[1], 10)
    let ano = parseInt(numMesMatch[2], 10)
    if (ano < 100) ano = 2000 + ano
    if (mes >= 1 && mes <= 12 && ano >= 1990 && ano <= 2100) {
      return { ano, mes }
    }
  }

  // Caso 3: Formatos textuais: "SET 26", "SET/26", "SET/2026", "SET-26", "SET26", "SET. 26"
  // Extrai todas as palavras alfabéticas e todos os números
  const normalizedStr = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()

  const partes = normalizedStr.split(/\s+/).filter(Boolean)
  let mesEncontrado = 0
  let anoEncontrado = 0

  for (const parte of partes) {
    if (/^\d{2,4}$/.test(parte)) {
      let numAno = parseInt(parte, 10)
      if (numAno < 100) {
        numAno = numAno > 50 ? 1900 + numAno : 2000 + numAno
      }
      anoEncontrado = numAno
    } else {
      const mesKey = parte.slice(0, 3)
      if (MESES_MAP[parte] || MESES_MAP[mesKey]) {
        mesEncontrado = MESES_MAP[parte] || MESES_MAP[mesKey]
      }
    }
  }

  // Tenta extração compacta tipo "SET26" ou "MAR2025"
  if (!mesEncontrado || !anoEncontrado) {
    const compactMatch = str.match(/^([a-z]{3,9})[-/.\s]?(\d{2,4})$/i)
    if (compactMatch) {
      const parteTxt = compactMatch[1].toLowerCase().slice(0, 3)
      if (MESES_MAP[parteTxt]) {
        mesEncontrado = MESES_MAP[parteTxt]
        let numAno = parseInt(compactMatch[2], 10)
        if (numAno < 100) {
          numAno = numAno > 50 ? 1900 + numAno : 2000 + numAno
        }
        anoEncontrado = numAno
      }
    }
  }

  if (mesEncontrado >= 1 && mesEncontrado <= 12 && anoEncontrado >= 1990 && anoEncontrado <= 2100) {
    return { ano: anoEncontrado, mes: mesEncontrado }
  }

  return null
}

/**
 * Formata um par { ano, mes } no padrão limpo "MMM/YY" (ex: "SET/26", "MAR/25")
 */
export function formatarRotuloMesAno(ano: number, mes: number): string {
  const sigla = SIGLAS_MES[mes] || 'MES'
  const ano2d = String(ano % 100).padStart(2, '0')
  return `${sigla}/${ano2d}`
}

/**
 * Normaliza um item do histórico:
 * - Valida e formata `mes_ano` (ex: "SET/26")
 * - Sanitiza `consumo_kwh` como número positivo arredondado (até 2 casas)
 * - Sanitiza `dias_ciclo` como número inteiro (padrão 30 se ausente ou inválido)
 */
export function normalizarItemHistorico(rawItem: {
  mes_ano?: unknown
  mes?: unknown
  consumo_kwh?: unknown
  dias_ciclo?: unknown
}): HistoricoConsumoItemNormalizado | null {
  if (!rawItem || typeof rawItem !== 'object') return null

  const mesAnoInput = rawItem.mes_ano || rawItem.mes || ''
  const parsed = extrairAnoMes(mesAnoInput)

  let mesAnoFormatado = ''
  if (parsed) {
    mesAnoFormatado = formatarRotuloMesAno(parsed.ano, parsed.mes)
  } else {
    // Se não puder parsear formalmente, limpa caracteres estranhos mantendo o texto original
    mesAnoFormatado = String(mesAnoInput).trim().toUpperCase()
  }

  if (!mesAnoFormatado) return null

  // Extração numérica robusta de consumo (suporta números com vírgula ou ponto)
  let kwh = 0
  if (typeof rawItem.consumo_kwh === 'number') {
    kwh = isNaN(rawItem.consumo_kwh) ? 0 : rawItem.consumo_kwh
  } else if (typeof rawItem.consumo_kwh === 'string') {
    const cleaned = rawItem.consumo_kwh.replace(/\s+/g, '').replace(',', '.')
    const parsedKwh = parseFloat(cleaned)
    kwh = isNaN(parsedKwh) ? 0 : parsedKwh
  }
  kwh = Math.max(0, Math.round(kwh * 100) / 100)

  // Extração de dias de ciclo (geralmente entre 20 e 40 dias; padrão 30)
  let dias = 30
  if (
    typeof rawItem.dias_ciclo === 'number' &&
    !isNaN(rawItem.dias_ciclo) &&
    rawItem.dias_ciclo > 0
  ) {
    dias = Math.round(rawItem.dias_ciclo)
  } else if (typeof rawItem.dias_ciclo === 'string') {
    const parsedDias = parseInt(rawItem.dias_ciclo.replace(/\D/g, ''), 10)
    if (!isNaN(parsedDias) && parsedDias > 0 && parsedDias <= 60) {
      dias = parsedDias
    }
  }

  return {
    mes_ano: mesAnoFormatado,
    consumo_kwh: kwh,
    dias_ciclo: dias,
  }
}

/**
 * Normaliza, deduplica e ordena uma lista de itens de histórico de fatura.
 *
 * ORDENAÇÃO:
 * - Do mais ANTIGO para o mais RECENTE (cronológica crescente).
 * - Exemplo: SET/25, OUT/25, NOV/25, ..., AGO/26, SET/26.
 *
 * DEDUPLICAÇÃO:
 * - Se houver itens com o mesmo mês/ano, mantém o que tem dados mais completos
 *   (ou maior consumo diferente de zero) para evitar duplicatas espúrias.
 */
export function normalizarEOordenarHistorico(
  lista:
    | Array<{ mes_ano?: unknown; mes?: unknown; consumo_kwh?: unknown; dias_ciclo?: unknown }>
    | null
    | undefined,
): HistoricoConsumoItemNormalizado[] {
  if (!Array.isArray(lista) || lista.length === 0) return []

  // Mapa com chave única (ano*100 + mes) ou mes_ano
  const mapa = new Map<
    string,
    {
      item: HistoricoConsumoItemNormalizado
      ordemChave: number
    }
  >()

  lista.forEach((raw, idx) => {
    const item = normalizarItemHistorico(raw)
    if (!item) return

    const parsed = extrairAnoMes(item.mes_ano)
    const chave = parsed ? `${parsed.ano}-${String(parsed.mes).padStart(2, '0')}` : item.mes_ano
    const ordemChave = parsed ? parsed.ano * 100 + parsed.mes : 999900 + idx

    const existente = mapa.get(chave)
    if (!existente) {
      mapa.set(chave, { item, ordemChave })
    } else {
      // Se já existe para este mês/ano, manter o item com consumo mais confiável (> 0)
      if (item.consumo_kwh > 0 && existente.item.consumo_kwh === 0) {
        mapa.set(chave, { item, ordemChave })
      } else if (
        item.consumo_kwh > 0 &&
        item.dias_ciclo !== 30 &&
        existente.item.dias_ciclo === 30
      ) {
        mapa.set(chave, { item, ordemChave })
      }
    }
  })

  // Converte em array e ordena do mais antigo para o mais recente
  const ordenados = Array.from(mapa.values())
    .sort((a, b) => a.ordemChave - b.ordemChave)
    .map((entry) => entry.item)

  return ordenados
}

/**
 * Calcula os agregados oficiais da fatura a partir do histórico normalizado:
 * - total anual
 * - quantidade de meses
 * - média mensal (soma ÷ qtdMeses real)
 * - média diária
 * - maior consumo
 * - menor consumo
 */
export function calcularMetricasHistorico(historico: HistoricoConsumoItemNormalizado[]) {
  if (!historico || historico.length === 0) {
    return {
      quantidade_meses_historico: 0,
      somatorio_consumo_anual_kwh: 0,
      media_mensal_consumo_kwh: 0,
      consumo_medio_diario_kwh: 0,
      maior_consumo_periodo: undefined,
      menor_consumo_periodo: undefined,
    }
  }

  let totalKwh = 0
  let totalDias = 0
  let maior = historico[0]
  let menor = historico[0]

  historico.forEach((item) => {
    totalKwh += item.consumo_kwh
    totalDias += item.dias_ciclo || 30

    if (item.consumo_kwh > maior.consumo_kwh) {
      maior = item
    }
    if (item.consumo_kwh < menor.consumo_kwh) {
      menor = item
    }
  })

  const qtd = historico.length
  const mediaMensal = Math.round((totalKwh / qtd) * 100) / 100
  const mediaDiaria =
    totalDias > 0
      ? Math.round((totalKwh / totalDias) * 100) / 100
      : Math.round((mediaMensal / 30) * 100) / 100

  return {
    quantidade_meses_historico: qtd,
    somatorio_consumo_anual_kwh: Math.round(totalKwh * 100) / 100,
    media_mensal_consumo_kwh: mediaMensal,
    consumo_medio_diario_kwh: mediaDiaria,
    maior_consumo_periodo: {
      mes_ano: maior.mes_ano,
      consumo_kwh: maior.consumo_kwh,
    },
    menor_consumo_periodo: {
      mes_ano: menor.mes_ano,
      consumo_kwh: menor.consumo_kwh,
    },
  }
}
