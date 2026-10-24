import type { TipoNegocioSelect, TipoVendaSelect } from '@/types/crm'

export interface TipoNegocioConfig {
  value: TipoNegocioSelect
  label: string
  nome: string
  categoria: string
  tipoVenda: TipoVendaSelect
  tipoVendaPadrao: TipoVendaSelect
  tipoNegocioSchema: TipoNegocioSelect
}

/**
 * Lista canônica dos tipos de negócio do CRM.
 * Cada tipo aparece uma única vez com label padronizada:
 * "Nome Limpo (Categoria)"
 */
export const TIPOS_NEGOCIO_OPCOES: TipoNegocioConfig[] = [
  {
    value: 'venda usina',
    nome: 'Venda de Usina Fotovoltaica',
    categoria: 'Energia Solar',
    tipoVenda: 'Energia Solar',
    tipoVendaPadrao: 'Energia Solar',
    tipoNegocioSchema: 'venda usina',
    label: 'Venda de Usina Fotovoltaica (Energia Solar)',
  },
  {
    value: 'creditos_energia',
    nome: 'Créditos de Energia',
    categoria: 'Energia Solar',
    tipoVenda: 'Créditos de energia',
    tipoVendaPadrao: 'Créditos de energia',
    tipoNegocioSchema: 'creditos_energia',
    label: 'Créditos de Energia (Energia Solar)',
  },
  {
    value: 'bateria',
    nome: 'Bateria Solar',
    categoria: 'Baterias',
    tipoVenda: 'Baterias',
    tipoVendaPadrao: 'Baterias',
    tipoNegocioSchema: 'bateria',
    label: 'Bateria Solar (Baterias)',
  },
  {
    value: 'venda bateria',
    nome: 'Venda de Bateria Avulsa',
    categoria: 'Baterias',
    tipoVenda: 'Baterias',
    tipoVendaPadrao: 'Baterias',
    tipoNegocioSchema: 'venda bateria',
    label: 'Venda de Bateria Avulsa (Baterias)',
  },
  {
    value: 'expansão',
    nome: 'Expansão de Usina Existente',
    categoria: 'Energia Solar',
    tipoVenda: 'Energia Solar',
    tipoVendaPadrao: 'Energia Solar',
    tipoNegocioSchema: 'expansão',
    label: 'Expansão de Usina Existente (Energia Solar)',
  },
  {
    value: 'renovação',
    nome: 'Plano de O&M / Manutenção',
    categoria: 'O&M',
    tipoVenda: 'O&M (Operação e Manutenção)',
    tipoVendaPadrao: 'O&M (Operação e Manutenção)',
    tipoNegocioSchema: 'renovação',
    label: 'Plano de O&M / Manutenção (O&M)',
  },
  {
    value: 'serviço',
    nome: 'Carregadores de Veículos Elétricos',
    categoria: 'Carregadores',
    tipoVenda: 'Carregadores Veículos Elétricos',
    tipoVendaPadrao: 'Carregadores Veículos Elétricos',
    tipoNegocioSchema: 'serviço',
    label: 'Carregadores de Veículos Elétricos (Carregadores)',
  },
]

/**
 * Localiza a configuração canônica de um tipo de negócio pelo valor do enum ou variações legadas.
 */
export function getTipoNegocioConfig(valor?: string | null): TipoNegocioConfig | undefined {
  if (!valor || typeof valor !== 'string') return undefined
  const v = valor.trim().toLowerCase()

  // Match exato por value
  const exato = TIPOS_NEGOCIO_OPCOES.find((t) => t.value.toLowerCase() === v)
  if (exato) return exato

  // Match por label ou nome
  const matchNomeOuLabel = TIPOS_NEGOCIO_OPCOES.find(
    (t) => t.nome.toLowerCase() === v || t.label.toLowerCase() === v,
  )
  if (matchNomeOuLabel) return matchNomeOuLabel

  // Mapeamentos legados
  if (v.includes('venda bateria') || v.includes('bateria avulsa')) {
    return TIPOS_NEGOCIO_OPCOES.find((t) => t.value === 'venda bateria')
  }
  if (v.includes('bateria') || v.includes('storage') || v.includes('armazenamento')) {
    return TIPOS_NEGOCIO_OPCOES.find((t) => t.value === 'bateria')
  }
  if (
    v.includes('crédito') ||
    v.includes('credito') ||
    v.includes('compensação') ||
    v.includes('compensacao')
  ) {
    return TIPOS_NEGOCIO_OPCOES.find((t) => t.value === 'creditos_energia')
  }
  if (v.includes('expans')) {
    return TIPOS_NEGOCIO_OPCOES.find((t) => t.value === 'expansão')
  }
  if (v.includes('o&m') || v.includes('manuten') || v.includes('renov')) {
    return TIPOS_NEGOCIO_OPCOES.find((t) => t.value === 'renovação')
  }
  if (
    v.includes('carregador') ||
    v.includes('veículo') ||
    v.includes('veiculo') ||
    v.includes('servi')
  ) {
    return TIPOS_NEGOCIO_OPCOES.find((t) => t.value === 'serviço')
  }
  if (v.includes('usina') || v.includes('solar')) {
    return TIPOS_NEGOCIO_OPCOES.find((t) => t.value === 'venda usina')
  }

  return undefined
}

/**
 * Retorna o label formatado e limpo com a categoria entre parênteses:
 * Ex: "Venda de Usina Fotovoltaica (Energia Solar)"
 */
export function getTipoNegocioLabel(valor?: string | null): string {
  const cfg = getTipoNegocioConfig(valor)
  if (cfg) return cfg.label
  if (!valor || !valor.trim()) return 'Negócio Comercial'
  return valor.trim()
}

/**
 * Retorna o nome limpo sem categoria entre parênteses:
 * Ex: "Venda de Usina Fotovoltaica"
 */
export function getTipoNegocioNome(valor?: string | null): string {
  const cfg = getTipoNegocioConfig(valor)
  if (cfg) return cfg.nome
  if (!valor || !valor.trim()) return 'Negócio'
  return valor.trim()
}
