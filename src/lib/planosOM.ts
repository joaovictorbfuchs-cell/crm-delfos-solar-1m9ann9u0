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

export interface ParametrosCalculoPlanoOM {
  distanciaKm?: number
  valorKm?: number
  numeroModulos?: number
  geracaoMensalKwh?: number
  valorKwh?: number
}

export interface ValoresCalculadosPlanoOM {
  chave: PlanoOMChave
  nome: string
  mensal: number
  anual: number
  custoDeslocamentoMensal: number
  custoModulosMensal: number
  baseMensal: number
  bullets: string[]
  recomendadoDelfos?: boolean
}

/**
 * Calcula o valor mensal e anual de um plano O&M de forma dinâmica:
 *
 * 1. Base mensal de referência:
 *    - Essencial: R$ 49,90/mês
 *    - Inspeção: R$ 74,90/mês (visitasAnuais = 1)
 *    - Completo: R$ 99,90/mês (visitasAnuais = 2)
 *
 * 2. Custo adicional de deslocamento quando fora de Erechim (distanciaKm > 0):
 *    - Aplicável a planos com visita presencial (Inspeção e Completo).
 *    - Custo por viagem técnica (ida e volta): distanciaKm × valorKm
 *    - Rateio mensal: (distanciaKm × valorKm × visitasAnuais) / 12
 *    - Para o caso de Erechim (distanciaKm = 0), acréscimo é zero (reproduzindo exatamente 49,90 / 74,90 / 99,90).
 *
 * 3. Módulos adicionais acima da franquia residencial base (15 módulos da planilha de referência):
 *    - Planos com lavagem/inspeção de placas (Inspeção e Completo).
 *    - Para módulos acima de 15: acréscimo proporcional de mão de obra e insumos de limpeza/inspeção por módulo extra.
 *    - Fórmula suave e proporcional por placa excedente por limpeza/ano: (modulosExtras × taxaPorPlaca × limpezasAnuais) / 12.
 *    - Quando numeroModulos <= 15 (ou não informado), acréscimo é zero.
 */
export function calcularValorPlanoOM(
  chave: PlanoOMChave,
  params?: ParametrosCalculoPlanoOM,
): ValoresCalculadosPlanoOM {
  const def = PLANOS_OM_CATALOGO[chave] || PLANOS_OM_CATALOGO.Essencial
  const distanciaKm = Math.max(0, Number(params?.distanciaKm) || 0)
  const valorKm = Math.max(0, Number(params?.valorKm) || 0)
  const numeroModulos = Math.max(0, Number(params?.numeroModulos) || 0)

  // 1. Custo de deslocamento anual rateado em 12 parcelas mensais
  // Para distância = 0 (ex.: Erechim), custoDeslocamentoMensal = 0
  const custoDeslocamentoAnual = distanciaKm * valorKm * def.visitasAnuais
  const custoDeslocamentoMensal = custoDeslocamentoAnual / 12

  // 2. Ajuste para usinas de grande porte (módulos excedentes à franquia base de 15 módulos)
  // R$ 5,00 por módulo extra por lavagem anual rateado em 12 meses (quando houver lavagem inclusa)
  const FRANQUIA_MODULOS_BASE = 15
  const CUSTO_EXTRA_POR_MODULO = 5.0
  const modulosExcedentes = Math.max(0, numeroModulos - FRANQUIA_MODULOS_BASE)
  const custoModulosAnual =
    def.limpezasAnuais > 0 ? modulosExcedentes * CUSTO_EXTRA_POR_MODULO * def.limpezasAnuais : 0
  const custoModulosMensal = custoModulosAnual / 12

  // Valor mensal total arredondado em 2 casas decimais
  const valorMensalExato = def.valorBaseMensal + custoDeslocamentoMensal + custoModulosMensal
  const mensal = Math.round(valorMensalExato * 100) / 100
  const anual = Math.round(mensal * 12 * 100) / 100

  return {
    chave: def.chave,
    nome: def.nome,
    mensal,
    anual,
    custoDeslocamentoMensal: Math.round(custoDeslocamentoMensal * 100) / 100,
    custoModulosMensal: Math.round(custoModulosMensal * 100) / 100,
    baseMensal: def.valorBaseMensal,
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
