/**
 * Demonstrativo do Ciclo — cálculos centralizados (fonte única).
 * Regras da última orientação (v0.0.1698):
 * - Fio B SEMPRE visível: usa item fio_b da fatura se existir; senão linha sintética
 *   a partir do bloco calculado dados.fio_b (origem 'fatura' | 'estimativa').
 * - isItemAtipica: apenas juros/multa/atualização monetária são atípicos;
 *   ip/cip/iluminação são padrão comum (NÃO atípicos).
 * - Tributos do rodapé = soma de icms/pis/cofins dos itens exibidos (fonte única);
 *   imposto de item de crédito (valor negativo) conta como 0.
 * - Total faturado = soma das parcelas positivas exibidas; abatimentos em verde;
 *   Total a pagar = total faturado − abatimentos; divergência > R$ 0,50 vs.
 *   total_a_pagar_rs da fatura mostra nota discreta.
 */
import { num } from './safeGuards'

export interface ItemFaturado {
  item?: string
  quantidade_kwh?: number | string | null
  tarifa_base?: number | string | null
  tarifa_com_impostos?: number | string | null
  valor_total_rs?: number | string | null
  icms?: { base_calculo?: unknown; aliquota?: unknown; valor?: unknown }
  pis?: { base_calculo?: unknown; valor?: unknown }
  cofins?: { base_calculo?: unknown; valor?: unknown }
  fio_b?: boolean
}

export interface FioBData {
  kwh_compensados?: number | string | null
  tarifa_fio_b_ano?: number | string | null
  percentual_transicao_14300?: number | string | null
  fio_b_rs?: number | string | null
  origem?: 'fatura' | 'estimativa' | string | null
}

export interface DemonstrativoItem {
  nome: string
  kwh: number | null
  tarifa: number | null
  valor: number
  icms: number
  pis: number
  cofins: number
  atipico: boolean
  fio_b: boolean
  origem_fio_b?: 'fatura' | 'estimativa'
}

export interface DemonstrativoResultado {
  itens: DemonstrativoItem[]
  fio_b_linha: DemonstrativoItem | null
  total_faturado: number
  abatimentos: number
  total_a_pagar_calculado: number
  total_a_pagar_fatura: number
  divergencia: number
  divergencia_rs: number
  tributos_icms: number
  tributos_pis: number
  tributos_cofins: number
  tributos_total: number
}

/** Palavras-chave de parcelas atípicas: juros, multa, atualização monetária. */
const ATIPICAS = [
  /juros/i,
  /multa/i,
  /atualiza(ç|c)(ã|a)o monet/i,
  /morat/i,
  /negativa(ç|c)(ã|a)o/i,
]

/** Palavras-chave de itens comuns que NÃO são atípicos (falso-positivos corrigidos). */
const COMUNS = [
  /ip[- ]?cip/i,
  /custeio/i,
  /ilumina(ç|c)(ã|a)o/i,
  /públic[ao]/i,
  /public[ao]/i,
  /contribui(ç|c)(ã|a)o/i,
  /cofins/i,
  /pis\b/i,
  /icms/i,
  /bandeira/i,
  /compensa/i,
  /cr(é|e)dito/i,
  /injet/i,
  /consumo/i,
  /uso do sistema/i,
  /tusd/i,
  /te\b/i,
  /energia/i,
  /fio\s*b/i,
  /disponibilidade/i,
  /saldo/i,
  /ajuste/i,
  /cde/i,
  /proinf/i,
]

/**
 * Classifica um item como atípico. Regra da última orientação:
 * só juros/multa/atualização monetária (e similares de mora) são atípicos.
 * IP/CIP/iluminação são padrão comum. O fallback final NÃO marca atípico.
 */
export function isItemAtipica(item: ItemFaturado | string): boolean {
  const nome = typeof item === 'string' ? item : String(item?.item || '')
  if (!nome.trim()) return false
  if (ATIPICAS.some((re) => re.test(nome))) {
    // IP/CIP/iluminação nunca são atípicos, mesmo se o nome contiver outra palavra
    if (COMUNS.some((re) => re.test(nome))) return false
    return true
  }
  return false
}

/** Detecta se o item é de Fio B / Uso do Sistema sobre energia compensada. */
export function isItemFioB(item: ItemFaturado): boolean {
  if (item?.fio_b === true) return true
  return /fio\s*b/i.test(String(item?.item || ''))
}

/** Imposto do item: crédito (valor negativo) conta como 0 no somatório. */
function impostoDoItem(item: ItemFaturado, campo: 'icms' | 'pis' | 'cofins'): number {
  const valorRaw = item?.[campo]?.valor
  if (valorRaw === undefined || valorRaw === null || valorRaw === '') return 0
  const valor = num(valorRaw)
  if (valor <= 0) return 0
  const totalItem = num(item?.valor_total_rs)
  if (totalItem < 0) return 0 // item de crédito: imposto = 0 no somatório
  return valor
}

/** Norma do nome do item para deduplicação Fio B (item da fatura vs linha sintética). */
const normaFioB = (nome: string) => nome.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Constrói as linhas do Demonstrativo do Ciclo com TODAS as regras:
 * Fio B sempre visível, totais e tributos reconciliados.
 */
export function construirDemonstrativo(
  itensFaturados: unknown,
  dadosCompletos: Record<string, any> | null | undefined,
): DemonstrativoResultado {
  const itensArr: ItemFaturado[] = Array.isArray(itensFaturados)
    ? (itensFaturados as ItemFaturado[])
    : []
  const fioBCalc = (dadosCompletos?.fio_b ||
    dadosCompletos?.indicadores?.fio_b ||
    null) as FioBData | null

  const itens: DemonstrativoItem[] = []
  let temItemFioB = false
  const nomesFioBFatura: string[] = []

  for (const raw of itensArr) {
    if (!raw || typeof raw !== 'object') continue
    const nome = String(raw.item || '').trim()
    if (!nome) continue
    const valor = num(raw.valor_total_rs)
    const fioBItem = isItemFioB(raw)
    if (fioBItem) {
      temItemFioB = true
      nomesFioBFatura.push(normaFioB(nome))
    }
    itens.push({
      nome,
      kwh: raw.quantidade_kwh != null && raw.quantidade_kwh !== '' ? num(raw.quantidade_kwh) : null,
      tarifa:
        raw.tarifa_com_impostos != null && raw.tarifa_com_impostos !== ''
          ? num(raw.tarifa_com_impostos)
          : raw.tarifa_base != null && raw.tarifa_base !== ''
            ? num(raw.tarifa_base)
            : null,
      valor,
      icms: impostoDoItem(raw, 'icms'),
      pis: impostoDoItem(raw, 'pis'),
      cofins: impostoDoItem(raw, 'cofins'),
      atipico: isItemAtipica(raw),
      fio_b: fioBItem,
      origem_fio_b: fioBItem ? 'fatura' : undefined,
    })
  }

  // --- Fio B SEMPRE visível ---
  let fioBLinha: DemonstrativoItem | null = null
  if (fioBCalc && typeof fioBCalc === 'object') {
    const fioBValorCalc = num(fioBCalc.fio_b_rs)
    if (temItemFioB) {
      // Já veio item fio_b na fatura: NÃO criar linha duplicada.
      // Mas garantimos que o valor impresso esteja na linha do item da fatura.
      if (fioBValorCalc > 0) {
        const alvo = itens.find((it) => it.fio_b)
        if (alvo && alvo.valor === 0) alvo.valor = fioBValorCalc
      }
    } else if (fioBValorCalc > 0 || num(fioBCalc.kwh_compensados) > 0) {
      // Linha sintética a partir do bloco calculado
      fioBLinha = {
        nome: 'Fio B — Uso do Sistema de Distribuição (energia compensada)',
        kwh: num(fioBCalc.kwh_compensados),
        tarifa:
          fioBCalc.tarifa_fio_b_ano != null && fioBCalc.tarifa_fio_b_ano !== ''
            ? num(fioBCalc.tarifa_fio_b_ano)
            : null,
        valor: fioBValorCalc,
        icms: 0,
        pis: 0,
        cofins: 0,
        atipico: false,
        fio_b: true,
        origem_fio_b:
          fioBCalc.origem === 'fatura'
            ? 'fatura'
            : fioBCalc.origem === 'estimativa'
              ? 'estimativa'
              : 'estimativa',
      }
      itens.push(fioBLinha)
    }
  }

  // --- Totais reconciliados (fonte única: itens exibidos) ---
  const totalFaturado = itens.filter((it) => it.valor > 0).reduce((acc, it) => acc + it.valor, 0)
  const abatimentos = itens
    .filter((it) => it.valor < 0)
    .reduce((acc, it) => acc + Math.abs(it.valor), 0)
  const totalAPagarCalculado = Math.round((totalFaturado - abatimentos) * 100) / 100

  const totalAPagarFatura = num(dadosCompletos?.totais?.total_a_pagar_rs)
  const divergencia = Math.round((totalAPagarCalculado - totalAPagarFatura) * 100) / 100
  const divergenciaRs = Math.abs(divergencia) > 0.5 ? divergencia : 0

  // --- Tributos do rodapé = soma dos itens exibidos (fonte única) ---
  const tributosIcms = itens.reduce((acc, it) => acc + it.icms, 0)
  const tributosPis = itens.reduce((acc, it) => acc + it.pis, 0)
  const tributosCofins = itens.reduce((acc, it) => acc + it.cofins, 0)

  return {
    itens,
    fio_b_linha: fioBLinha,
    total_faturado: Math.round(totalFaturado * 100) / 100,
    abatimentos: Math.round(abatimentos * 100) / 100,
    total_a_pagar_calculado: totalAPagarCalculado,
    total_a_pagar_fatura: totalAPagarFatura,
    divergencia: totalAPagarFatura > 0 ? divergenciaRs : 0,
    divergencia_rs: totalAPagarFatura > 0 ? Math.abs(divergenciaRs) : 0,
    tributos_icms: Math.round(tributosIcms * 100) / 100,
    tributos_pis: Math.round(tributosPis * 100) / 100,
    tributos_cofins: Math.round(tributosCofins * 100) / 100,
    tributos_total: Math.round((tributosIcms + tributosPis + tributosCofins) * 100) / 100,
  }
}
