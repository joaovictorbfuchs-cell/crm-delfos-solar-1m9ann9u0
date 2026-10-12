/**
 * Fonte única da verdade para Planos O&M (Operação e Manutenção) da Delfos Solar.
 * Centraliza nomes, bullets canônicos e a lógica de cálculo dinâmico a partir
 * das variáveis da proposta (deslocamento/distância, R$/km, nº de módulos, geração mensal e tarifa).
 */

export type PlanoOMChave = 'Essencial' | 'Inspeção' | 'Completo'

export interface PlanoOMDefinicao {
  chave: PlanoOMChave
  nome: string
  valorBaseMensal: number
  visitasAnuais: number
  limpezasAnuais: number
  inspecoesAnuais: number
  recomendadoDelfos?: boolean
  badgeRecomendado?: string
  bullets: string[]
}

/**
 * Definições canônicas dos 3 Planos O&M:
 * - Essencial: monitoramento comercial, relatórios, suporte
 * - Inspeção (antigo Prevenção): inclui 1 vistoria/inspeção preventiva anual + 1 limpeza anual
 * - Completo: inclui 2 limpezas ao ano + verificação semestral + Suporte técnico limitado VIP
 */
export const PLANOS_OM_CATALOGO: Record<PlanoOMChave, PlanoOMDefinicao> = {
  Essencial: {
    chave: 'Essencial',
    nome: 'Plano Essencial',
    valorBaseMensal: 49.9,
    visitasAnuais: 0,
    limpezasAnuais: 0,
    inspecoesAnuais: 0,
    bullets: ['Monitoramento comercial', 'Relatório mensal analítico', 'Suporte técnico e RGE'],
  },
  Inspeção: {
    chave: 'Inspeção',
    nome: 'Plano Inspeção',
    valorBaseMensal: 74.9,
    visitasAnuais: 1,
    limpezasAnuais: 1,
    inspecoesAnuais: 1,
    bullets: [
      'Tudo do plano Essencial',
      '1x Inspeção preventiva anual',
      '1x Limpeza de placas anual',
      'Reaperto geral de conexões',
    ],
  },
  Completo: {
    chave: 'Completo',
    nome: 'Plano Completo',
    valorBaseMensal: 99.9,
    visitasAnuais: 2,
    limpezasAnuais: 2,
    inspecoesAnuais: 2,
    recomendadoDelfos: true,
    badgeRecomendado: 'RECOMENDADO DELFOS',
    bullets: [
      'Tudo do plano Inspeção',
      '2x Limpezas de placas ao ano',
      'Verificação semestral de anomalias',
      'Suporte técnico limitado VIP',
    ],
  },
}

/**
 * Aliases e compatibilidade reversa com o nome legado 'Prevenção'.
 */
export function normalizarNomePlanoOM(nome?: string | null): PlanoOMChave {
  if (!nome) return 'Essencial'
  const lower = nome.trim().toLowerCase()
  if (lower.includes('prev')) return 'Inspeção'
  if (lower.includes('insp')) return 'Inspeção'
  if (lower.includes('comp')) return 'Completo'
  return 'Essencial'
}

export const PISO_BASE_OM = 49.9
export const VALOR_PADRAO_POR_PLACA = 9.0
export const VALOR_FIXO_PLACAS_ATE_34 = 350.0

export interface ParametrosCalculoPlanoOM {
  distanciaKm?: number
  valorKm?: number
  numeroModulos?: number
  geracaoMensalKwh?: number
  valorKwh?: number
  valorPorPlaca?: number
  /** Valores manuais negociados para sobrepor o cálculo padrão da fórmula */
  valoresNegociados?: Partial<Record<PlanoOMChave, number | null>>
}

export interface DetalheCalculoBaseOM {
  baseBruta: number
  baseComPiso: number
  pisoAplicado: boolean
  custoAjustePlacas: number
  custoDeslocamento: number
  parcelaVisita: number
  valorPorPlacaEfetivo: number
}

export interface ValoresCalculadosPlanoOM {
  chave: PlanoOMChave
  nome: string
  mensal: number
  anual: number
  /** Valor calculado estritamente pela fórmula, antes de eventual ajuste negociado */
  mensalCalculadoFormula: number
  anualCalculadoFormula: number
  /** Se o valor exibido/salvo foi editado manualmente para negociação */
  isNegociado?: boolean
  custoDeslocamento: number
  custoAjustePlacas: number
  baseMensal: number
  bullets: string[]
  recomendadoDelfos?: boolean
}

/**
 * Calcula a Base comum aos 3 planos O&M:
 * Base = (Geração média mensal em kWh × valor do kWh) ÷ 60
 * O ÷ 60 representa meio dia de geração mensal.
 * Piso: se Base < R$ 49,90 → Base = R$ 49,90. O piso vale nos 3 planos (aplicado sobre a Base).
 */
export function calcularBasePlanoOM(
  geracaoMensalKwh?: number,
  valorKwh?: number,
): { baseBruta: number; baseComPiso: number; pisoAplicado: boolean } {
  const geracao = Math.max(0, Number(geracaoMensalKwh) || 0)
  const tarifa = Math.max(0, Number(valorKwh) || 0)
  const baseBruta = (geracao * tarifa) / 60
  const baseComPiso = Math.max(PISO_BASE_OM, baseBruta)
  return {
    baseBruta: Math.round(baseBruta * 100) / 100,
    baseComPiso: Math.round(baseComPiso * 100) / 100,
    pisoAplicado: baseBruta < PISO_BASE_OM,
  }
}

/**
 * Calcula o custo de deslocamento:
 * Deslocamento = Distância × 2 × valor do R$/km (ida e volta).
 */
export function calcularDeslocamentoOM(distanciaKm?: number, valorKm?: number): number {
  const dist = Math.max(0, Number(distanciaKm) || 0)
  const vKm = Math.max(0, Number(valorKm) || 0)
  const total = dist * 2 * vKm
  return Math.round(total * 100) / 100
}

/**
 * Calcula o ajuste de placas:
 * Se nº de placas < 35 → R$ 350 fixos.
 * Se nº de placas ≥ 35 → R$ 9 por placa (ou valor customizado informado pelo usuário).
 */
export function calcularAjustePlacasOM(
  numeroModulos?: number,
  valorPorPlaca?: number,
): { custo: number; valorPorPlacaEfetivo: number; regra: '<35' | '>=35' } {
  const qtd = Math.max(0, Number(numeroModulos) || 0)
  const valorUnitario =
    valorPorPlaca !== undefined && valorPorPlaca !== null && !isNaN(Number(valorPorPlaca))
      ? Math.max(0, Number(valorPorPlaca))
      : VALOR_PADRAO_POR_PLACA

  if (qtd < 35) {
    return {
      custo: VALOR_FIXO_PLACAS_ATE_34,
      valorPorPlacaEfetivo: valorUnitario,
      regra: '<35',
    }
  }

  const custo = qtd * valorUnitario
  return {
    custo: Math.round(custo * 100) / 100,
    valorPorPlacaEfetivo: valorUnitario,
    regra: '>=35',
  }
}

/**
 * Calcula os detalhes intermediários das fórmulas O&M:
 * 1. Base (comum aos 3 planos) = (Geração média mensal em kWh × valor do kWh) ÷ 60
 * 2. Piso: se Base < R$ 49,90 → Base = R$ 49,90
 * 3. Deslocamento = Distância × 2 × valor do R$/km (ida e volta)
 * 4. Ajuste de placas: < 35 placas = R$ 350 fixos; ≥ 35 placas = nº placas × R$/placa (R$ 9 padrão editável)
 * 5. Parcela de visita = Ajuste de placas + Deslocamento (custo de 1 visita/lavagem)
 */
export function calcularDetalhesBaseOM(params?: ParametrosCalculoPlanoOM): DetalheCalculoBaseOM {
  const { baseBruta, baseComPiso, pisoAplicado } = calcularBasePlanoOM(
    params?.geracaoMensalKwh,
    params?.valorKwh,
  )
  const custoDeslocamento = calcularDeslocamentoOM(params?.distanciaKm, params?.valorKm)
  const { custo: custoAjustePlacas, valorPorPlacaEfetivo } = calcularAjustePlacasOM(
    params?.numeroModulos,
    params?.valorPorPlaca,
  )
  const parcelaVisita = Math.round((custoAjustePlacas + custoDeslocamento) * 100) / 100

  return {
    baseBruta,
    baseComPiso,
    pisoAplicado,
    custoAjustePlacas,
    custoDeslocamento,
    parcelaVisita,
    valorPorPlacaEfetivo,
  }
}

/**
 * Calcula o valor mensal e anual de um plano O&M conforme regras exatas do usuário:
 *
 * 1. Base (comum aos 3 planos) = (Geração média mensal em kWh × valor do kWh) ÷ 60.
 * 2. Piso: se Base < R$ 49,90 → Base = R$ 49,90. O piso vale nos 3 planos (sobre a Base).
 * 3. Essencial = Base (com piso). Permanece exatamente como está.
 * 4. Inspeção = Base (com piso) + (ajuste de placas + deslocamento) ÷ 12.
 *    (O custo de 1 lavagem/inspeção anual é rateado em 12 meses para compor a mensalidade).
 * 5. Completo = Base (com piso) + ((ajuste de placas + deslocamento) × 2) ÷ 12.
 *    (O custo de 2 lavagens anuais é rateado em 12 meses para compor a mensalidade).
 *
 * Além do valor calculado, se houver um valor negociado para a chave (valoresNegociados[chave]),
 * este é assumido como o valor mensal final (persistido no banco e repassado ao contrato).
 */
export function calcularValorPlanoOM(
  chave: PlanoOMChave,
  params?: ParametrosCalculoPlanoOM,
): ValoresCalculadosPlanoOM {
  const def = PLANOS_OM_CATALOGO[chave] || PLANOS_OM_CATALOGO.Essencial
  const detalhes = calcularDetalhesBaseOM(params)

  let valorMensalFormula = detalhes.baseComPiso
  if (chave === 'Essencial') {
    valorMensalFormula = detalhes.baseComPiso
  } else if (chave === 'Inspeção') {
    valorMensalFormula = detalhes.baseComPiso + detalhes.parcelaVisita / 12
  } else if (chave === 'Completo') {
    valorMensalFormula = detalhes.baseComPiso + (detalhes.parcelaVisita * 2) / 12
  }

  const mensalCalculadoFormula = Math.round(valorMensalFormula * 100) / 100
  const anualCalculadoFormula = Math.round(mensalCalculadoFormula * 12 * 100) / 100

  // Verifica se há valor customizado/negociado
  const negociadoRaw = params?.valoresNegociados?.[chave]
  const isNegociado =
    negociadoRaw !== undefined &&
    negociadoRaw !== null &&
    !isNaN(Number(negociadoRaw)) &&
    Number(negociadoRaw) > 0

  const mensal = isNegociado ? Math.round(Number(negociadoRaw) * 100) / 100 : mensalCalculadoFormula
  const anual = Math.round(mensal * 12 * 100) / 100

  return {
    chave: def.chave,
    nome: def.nome,
    mensal,
    anual,
    mensalCalculadoFormula,
    anualCalculadoFormula,
    isNegociado,
    custoDeslocamento: detalhes.custoDeslocamento,
    custoAjustePlacas: detalhes.custoAjustePlacas,
    baseMensal: detalhes.baseComPiso,
    bullets: [...def.bullets],
    recomendadoDelfos: def.recomendadoDelfos,
  }
}

/**
 * Calcula todos os 3 planos simultaneamente com os mesmos parâmetros.
 */
export function calcularTodosPlanosOM(
  params?: ParametrosCalculoPlanoOM,
): Record<PlanoOMChave, ValoresCalculadosPlanoOM> {
  return {
    Essencial: calcularValorPlanoOM('Essencial', params),
    Inspeção: calcularValorPlanoOM('Inspeção', params),
    Completo: calcularValorPlanoOM('Completo', params),
  }
}

/**
 * Tabela canônica de valores base estáticos (deslocamento zero km),
 * preservando compatibilidade com qualquer código legado que acesse a constante.
 */
export const PLANOS_OM_VALORES_BASE: Record<PlanoOMChave, { mensal: number; anual: number }> = {
  Essencial: { mensal: 49.9, anual: 49.9 * 12 },
  Inspeção: { mensal: 74.9, anual: 74.9 * 12 },
  Completo: { mensal: 99.9, anual: 99.9 * 12 },
}
