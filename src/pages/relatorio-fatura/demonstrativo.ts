/**
 * Demonstrativo do Ciclo — cálculos centralizados (fonte única).
 * Regras v0.0.1701:
 * - FONTE DA VERDADE = totais impressos da fatura (totais.total_a_pagar_rs):
 *   o headline "Total a pagar" é o valor IMPRESSO, não a soma recalculada das
 *   linhas. A soma das linhas é apenas detalhe — se diferir > R$ 0,50 do
 *   impresso, o impresso segue em destaque e a UI mostra a nota discreta
 *   "Detalhe das parcelas difere em R$ X".
 * - Fio B SEM dupla contagem: linha sintética com origem='estimativa' é exibida
 *   (badge "Estimativa (já incluso no total da fatura)") mas NÃO entra na soma
 *   dos totais; item Fio B impresso na fatura (origem='fatura') soma normal.
 * - isItemAtipica: apenas juros/multa/atualização monetária são atípicos;
 *   ip/cip/iluminação são padrão comum (NÃO atípicos).
 * - Tributos do rodapé = soma de icms/pis/cofins dos itens exibidos;
 *   imposto de item de crédito (valor negativo) conta como 0.
 */
import { num } from './safeGuards'

/** Resultado vazio e seguro do Demonstrativo (fatura sem itens extraídos etc.). */
const DEMO_VAZIO: DemonstrativoResultado = {
  itens: [],
  fio_b_linha: null,
  total_faturado: 0,
  abatimentos: 0,
  total_a_pagar_calculado: 0,
  total_a_pagar_fatura: 0,
  total_a_pagar_exibido: 0,
  divergencia: 0,
  divergencia_rs: 0,
  tributos_icms: 0,
  tributos_pis: 0,
  tributos_cofins: 0,
  tributos_total: 0,
}

/**
 * Guarda de formato do retorno: garante que TODOS os campos existam em QUALQUER
 * ramo de execução — o relatório público NÃO pode cair em ErrorBoundary por um
 * retorno incompleto (ex.: demo.itens undefined quebra o .map da UI).
 */
function garantirResultado(
  r: Partial<DemonstrativoResultado> | null | undefined,
): DemonstrativoResultado {
  const base = r && typeof r === 'object' ? r : {}
  return {
    ...DEMO_VAZIO,
    ...base,
    itens: Array.isArray(base.itens) ? base.itens : [],
    fio_b_linha: base.fio_b_linha && typeof base.fio_b_linha === 'object' ? base.fio_b_linha : null,
    total_faturado: num(base.total_faturado),
    abatimentos: num(base.abatimentos),
    total_a_pagar_calculado: num(base.total_a_pagar_calculado),
    total_a_pagar_fatura: num(base.total_a_pagar_fatura),
    total_a_pagar_exibido: num(base.total_a_pagar_exibido),
    divergencia: num(base.divergencia),
    divergencia_rs: num(base.divergencia_rs),
    tributos_icms: num(base.tributos_icms),
    tributos_pis: num(base.tributos_pis),
    tributos_cofins: num(base.tributos_cofins),
    tributos_total: num(base.tributos_total),
  }
}

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
  /** Estimativa já inclusa no total impresso — NÃO somar aos totais recalculados. */
  estimativa_ja_inclusa?: boolean
}

export interface DemonstrativoResultado {
  itens: DemonstrativoItem[]
  fio_b_linha: DemonstrativoItem | null
  total_faturado: number
  abatimentos: number
  total_a_pagar_calculado: number
  total_a_pagar_fatura: number
  /** Headline: valor impresso da fatura; fallback = soma recalculada. */
  total_a_pagar_exibido: number
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
 * Classifica um item como atípico: só juros/multa/atualização monetária (e
 * similares de mora) são atípicos. IP/CIP/iluminação são padrão comum.
 * O fallback final NÃO marca atípico.
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
 * Fio B sempre visível (estimativa fora dos totais), total impresso em destaque.
 */
export function construirDemonstrativo(
  itensFaturados: unknown,
  dadosCompletos: Record<string, any> | null | undefined,
): DemonstrativoResultado {
  // Blindagem: qualquer exceção aqui NÃO pode derrubar o relatório público em
  // ErrorBoundary — retorno vazio garantido (itens: [] etc.).
  try {
    return construirDemonstrativoInterno(itensFaturados, dadosCompletos)
  } catch (err) {
    console.warn(
      '[RelatorioFatura] construirDemonstrativo falhou — usando demonstrativo vazio:',
      err,
    )
    return garantirResultado(null)
  }
}

function construirDemonstrativoInterno(
  itensFaturados: unknown,
  dadosCompletos: Record<string, any> | null | undefined,
): DemonstrativoResultado {
  if (!dadosCompletos || typeof dadosCompletos !== 'object') {
    return garantirResultado(null)
  }
  const itensArr: ItemFaturado[] = Array.isArray(itensFaturados)
    ? (itensFaturados as ItemFaturado[])
    : []
  const fioBCalc = (dadosCompletos?.fio_b ||
    dadosCompletos?.indicadores?.fio_b ||
    null) as FioBData | null

  const itens: DemonstrativoItem[] = []
  let temItemFioB = false

  for (const raw of itensArr) {
    if (!raw || typeof raw !== 'object') continue
    const nome = String(raw.item || '').trim()
    if (!nome) continue
    const valor = num(raw.valor_total_rs)
    const fioBItem = isItemFioB(raw)
    if (fioBItem) temItemFioB = true
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
      estimativa_ja_inclusa: false,
    })
  }

  // --- Fio B SEMPRE visível, SEM dupla contagem ---
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
      // Linha sintética a partir do bloco calculado.
      // origem='estimativa': o total impresso da fatura JÁ inclui esse custo
      // (componente Fio B da TUSD conforme Lei 14.300) — a linha é exibida
      // apenas como detalhe e NÃO é somada aos totais recalculados.
      const origem = fioBCalc.origem === 'fatura' ? 'fatura' : ('estimativa' as const)
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
        origem_fio_b: origem,
        estimativa_ja_inclusa: origem === 'estimativa',
      }
      itens.push(fioBLinha)
    }
  }

  // --- Totais: itens que entram na soma (estimativa Fio B fica de fora) ---
  const itensSomaveis = itens.filter((it) => !it.estimativa_ja_inclusa)
  const totalFaturado = itensSomaveis
    .filter((it) => it.valor > 0)
    .reduce((acc, it) => acc + it.valor, 0)
  const abatimentos = itensSomaveis
    .filter((it) => it.valor < 0)
    .reduce((acc, it) => acc + Math.abs(it.valor), 0)
  const totalAPagarCalculado = Math.round((totalFaturado - abatimentos) * 100) / 100

  const totalAPagarFatura = num(dadosCompletos?.totais?.total_a_pagar_rs)
  const divergencia = Math.round((totalAPagarCalculado - totalAPagarFatura) * 100) / 100
  const divergenciaRs = Math.abs(divergencia) > 0.5 ? divergencia : 0

  // Headline = valor impresso da fatura (fonte da verdade); fallback = soma.
  const totalAPagarExibido = totalAPagarFatura > 0 ? totalAPagarFatura : totalAPagarCalculado

  // --- Tributos do rodapé = soma dos itens exibidos (fonte única) ---
  const tributosIcms = itens.reduce((acc, it) => acc + (num(it.icms) || 0), 0)
  const tributosPis = itens.reduce((acc, it) => acc + (num(it.pis) || 0), 0)
  const tributosCofins = itens.reduce((acc, it) => acc + (num(it.cofins) || 0), 0)

  // Retorno SEMPRE completo via guard — nenhum ramo devolve objeto parcial.
  return garantirResultado({
    itens,
    fio_b_linha: fioBLinha,
    total_faturado: Math.round(totalFaturado * 100) / 100,
    abatimentos: Math.round(abatimentos * 100) / 100,
    total_a_pagar_calculado: totalAPagarCalculado,
    total_a_pagar_fatura: totalAPagarFatura,
    total_a_pagar_exibido: Math.round(totalAPagarExibido * 100) / 100,
    divergencia: totalAPagarFatura > 0 ? divergenciaRs : 0,
    divergencia_rs: totalAPagarFatura > 0 ? Math.abs(divergenciaRs) : 0,
    tributos_icms: Math.round(tributosIcms * 100) / 100,
    tributos_pis: Math.round(tributosPis * 100) / 100,
    tributos_cofins: Math.round(tributosCofins * 100) / 100,
    tributos_total: Math.round((tributosIcms + tributosPis + tributosCofins) * 100) / 100,
  })
}

/**
 * Economia do Ciclo determinística (sem dupla contagem):
 * consumo medido × tarifa cheia efetiva − total a pagar impresso da fatura.
 * A tarifa cheia já contém a parcela Fio B/TUSD e o total a pagar já desconta
 * os créditos de energia compensada — não há dupla contagem. Só usa o valor
 * da IA quando o cálculo determinístico não é possível.
 */
export function calcularEconomiaCiclo(dados: Record<string, any> | null | undefined): number {
  const consumo = num(dados?.medicao_e_creditos?.energia_ativa_consumida?.consumo_mes_kwh)
  const tarifaCheia = num(dados?.indicadores?.tarifa_cheia_efetiva_rs_kwh)
  const totalPagar = num(dados?.totais?.total_a_pagar_rs)
  if (consumo > 0 && tarifaCheia > 0 && totalPagar > 0) {
    const calc = Math.round((consumo * tarifaCheia - totalPagar) * 100) / 100
    if (calc > 0) return calc
  }
  return num(dados?.indicadores?.economia_estimada_mes_rs)
}
