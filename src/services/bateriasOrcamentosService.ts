import pb from '@/lib/pocketbase/client'
import type { BateriaOrcamento, Cliente } from '@/types/crm'

export interface SalvarBateriaOrcamentoInput {
  id?: string
  numero_proposta?: string
  cliente_id: string
  negocio_id?: string
  data_orcamento?: string
  validade_dias?: number
  status?: BateriaOrcamento['status']
  numero_revisao?: number
  autor?: string
  tipo_cliente?: string

  // Dimensionamento
  tipo_aplicacao?: string
  capacidade_kwh?: number
  capacidade_util_kwh?: number
  potencia_inversor_kw?: number
  tensao_banco_v?: number
  autonomia_horas?: number
  consumo_critico_kwh_dia?: number
  tipo_bateria?: string
  profundidade_descarga_dod?: number
  ciclos_vida_estimados?: number

  // Equipamentos
  marca_bateria?: string
  modelo_bateria?: string
  quantidade_baterias?: number
  marca_inversor_carregador?: string
  modelo_inversor_carregador?: string
  fornecedor_selecionado_id?: string
  equipamento_id?: string

  // Formação de Custos
  custo_materiais_equipamentos?: number
  custo_materiais_extras?: number
  custo_mao_de_obra?: number
  custo_risco_engenharia?: number
  custo_frete_guincho?: number
  custo_subestacao?: number
  custo_terceirizacao?: number
  custo_marketing_combustivel?: number
  custo_administracao?: number
  custo_comissao_comercial?: number
  custo_indicacao?: number
  custo_impostos?: number
  opcao_imposto?: number
  desconto?: number
  desconto_percentual?: number
  percentual_administracao_auto?: number
  percentual_indicacao_auto?: number
  manual_administracao?: boolean
  manual_comissao?: boolean
  manual_indicacao?: boolean
  valor_manual_administracao?: number
  valor_manual_comissao?: number
  valor_manual_indicacao?: number
  valor_total_custos?: number
  valor_investimento?: number

  // Condições de pagamento
  condicoes_pagamento?: string
  parcela_a_vista?: number
  parcelas_cartao?: number
  juros_cartao?: number
  entrada_cartao?: number
  parcela_cartao?: number
  parcelas_financiamento?: number
  juros_financiamento?: number
  entrada_financiamento?: number
  parcela_financiamento?: number

  // Garantias e Prazos
  garantia_baterias_anos?: number
  garantia_inversor_anos?: number
  garantia_instalacao_anos?: number
  prazo_instalacao_dias?: number

  // Metadados
  observacoes?: string
  conteudo_proposta?: Record<string, unknown>
  dados_json?: Record<string, unknown>
}

/**
 * Retorna todos os orçamentos de baterias ordenados por data de criação decrescente
 */
export async function getBateriasOrcamentos(): Promise<BateriaOrcamento[]> {
  try {
    return await pb.collection('baterias_orcamentos').getFullList<BateriaOrcamento>({
      sort: '-created',
      expand: 'cliente_id,negocio_id',
    })
  } catch (err) {
    console.error('Erro ao buscar orçamentos de baterias:', err)
    return []
  }
}

/**
 * Busca um orçamento de baterias específico por ID
 */
export async function getBateriaOrcamentoById(id: string): Promise<BateriaOrcamento | null> {
  try {
    return await pb.collection('baterias_orcamentos').getOne<BateriaOrcamento>(id, {
      expand: 'cliente_id,negocio_id',
    })
  } catch (err) {
    console.error(`Erro ao buscar orçamento de bateria ${id}:`, err)
    return null
  }
}

/**
 * Cria ou atualiza um orçamento de baterias no PocketBase
 */
export async function salvarBateriaOrcamento(
  input: SalvarBateriaOrcamentoInput,
): Promise<BateriaOrcamento> {
  const { id, ...dadosBrutos } = input

  // Gera número sequencial de proposta se ausente
  if (!dadosBrutos.numero_proposta) {
    const ano = new Date().getFullYear()
    const rand = Math.floor(100 + Math.random() * 900)
    dadosBrutos.numero_proposta = `BAT-${ano}-${rand}`
  }

  if (!dadosBrutos.status) {
    dadosBrutos.status = 'Em elaboração'
  }

  if (!dadosBrutos.data_orcamento) {
    dadosBrutos.data_orcamento = new Date().toISOString().split('T')[0]
  }

  if (id) {
    return await pb.collection('baterias_orcamentos').update<BateriaOrcamento>(id, dadosBrutos, {
      expand: 'cliente_id,negocio_id',
    })
  }

  return await pb.collection('baterias_orcamentos').create<BateriaOrcamento>(dadosBrutos, {
    expand: 'cliente_id,negocio_id',
  })
}

/**
 * Altera rapidamente o status de um orçamento de baterias
 */
export async function updateStatusBateriaOrcamento(
  id: string,
  novoStatus: BateriaOrcamento['status'],
): Promise<BateriaOrcamento> {
  return await pb
    .collection('baterias_orcamentos')
    .update<BateriaOrcamento>(id, { status: novoStatus }, { expand: 'cliente_id,negocio_id' })
}

/**
 * Exclui um orçamento de bateria
 */
export async function deleteBateriaOrcamento(id: string): Promise<boolean> {
  try {
    await pb.collection('baterias_orcamentos').delete(id)
    return true
  } catch (err) {
    console.error('Erro ao excluir orçamento de bateria:', err)
    throw err
  }
}

/**
 * Gera os valores iniciais recomendados para uma nova proposta de bateria
 */
export function gerarValoresIniciaisBateria(
  cliente?: Cliente | null,
  autorNome: string = 'João Victor Bagetti Fuchs',
  percentualAdminPadrao: number = 15.0,
): SalvarBateriaOrcamentoInput {
  const ano = new Date().getFullYear()
  const rand = Math.floor(100 + Math.random() * 900)

  return {
    numero_proposta: `BAT-${ano}-${rand}`,
    cliente_id: cliente?.id || '',
    negocio_id: '',
    data_orcamento: new Date().toISOString().split('T')[0],
    validade_dias: 10,
    status: 'Em elaboração',
    numero_revisao: 1,
    autor: autorNome,
    tipo_cliente: cliente?.tipo_cliente || 'residencial',

    // Dimensionamento
    tipo_aplicacao: 'backup',
    capacidade_kwh: 10.24,
    capacidade_util_kwh: 9.2, // ~90% DOD
    potencia_inversor_kw: 5.0,
    tensao_banco_v: 51.2,
    autonomia_horas: 12,
    consumo_critico_kwh_dia: 10.0,
    tipo_bateria: 'lifepo4',
    profundidade_descarga_dod: 90,
    ciclos_vida_estimados: 6000,

    // Equipamentos sugeridos
    marca_bateria: 'Deye',
    modelo_bateria: 'Bateria LiFePO4 5.12 kWh / 100Ah 51.2V',
    quantidade_baterias: 2,
    marca_inversor_carregador: 'Deye',
    modelo_inversor_carregador: 'Inversor Híbrido 5kW Monofásico/Bifásico',
    fornecedor_selecionado_id: '',
    equipamento_id: '',

    // Custos iniciais zerados/padrão
    custo_materiais_equipamentos: 28000,
    custo_materiais_extras: 1800,
    custo_mao_de_obra: 2500,
    custo_risco_engenharia: 600,
    custo_frete_guincho: 450,
    custo_subestacao: 0,
    custo_terceirizacao: 0,
    custo_marketing_combustivel: 200,
    custo_administracao: 0,
    custo_comissao_comercial: 0,
    custo_indicacao: 0,
    custo_impostos: 0,
    opcao_imposto: 2,
    desconto: 0,
    desconto_percentual: 0,
    percentual_administracao_auto: percentualAdminPadrao / 100,
    percentual_indicacao_auto: 0,
    manual_administracao: false,
    manual_comissao: false,
    manual_indicacao: false,
    valor_manual_administracao: 0,
    valor_manual_comissao: 0,
    valor_manual_indicacao: 0,
    valor_total_custos: 0,
    valor_investimento: 0,

    // Pagamento
    condicoes_pagamento:
      'À vista com 5% de desconto via TED/Pix, ou parcelado em até 18x no cartão de crédito ou até 60x via financiamento bancário solar/baterias.',
    parcelas_cartao: 12,
    juros_cartao: 1.49,
    entrada_cartao: 0,
    parcelas_financiamento: 60,
    juros_financiamento: 1.39,
    entrada_financiamento: 0,

    // Garantias
    garantia_baterias_anos: 10,
    garantia_inversor_anos: 5,
    garantia_instalacao_anos: 1,
    prazo_instalacao_dias: 15,

    observacoes: '',
  }
}
