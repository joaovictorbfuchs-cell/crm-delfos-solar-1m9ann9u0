import type {
  DefinicaoCampo,
  ModuloFiltro,
  OperadorCondicao,
  TipoCampoFiltro,
} from '@/types/filtros'
import { TIPOS_VENDA_OPTIONS } from '@/constants/tipoVenda'

export const ETAPAS_FUNIL_LISTA: { id: string; label: string }[] = [
  { id: 'novo lead', label: '1 - Novo Lead' },
  { id: 'qualificado', label: '2 - Levantamento' },
  { id: 'proposta enviada', label: '3 - Orçamento' },
  { id: 'negociação', label: '4 - Negociação' },
  { id: 'contato_futuro', label: '5 - Contato Futuro' },
  { id: 'contrato assinado', label: 'Fechado' },
]

export interface DescricaoOperador {
  valor: OperadorCondicao
  label: string
  requerValor: boolean
  requerSegundoValor?: boolean
}

export const OPERADORES_POR_TIPO: Record<TipoCampoFiltro, DescricaoOperador[]> = {
  texto: [
    { valor: 'contem', label: 'contém', requerValor: true },
    { valor: 'nao_contem', label: 'não contém', requerValor: true },
    { valor: 'e', label: 'é exatamente', requerValor: true },
    { valor: 'nao_e', label: 'não é', requerValor: true },
    { valor: 'comeca_com', label: 'começa com', requerValor: true },
    { valor: 'esta_vazio', label: 'está vazio', requerValor: false },
    { valor: 'nao_esta_vazio', label: 'não está vazio', requerValor: false },
  ],
  numero: [
    { valor: 'igual', label: 'é igual a', requerValor: true },
    { valor: 'diferente', label: 'é diferente de', requerValor: true },
    { valor: 'maior', label: 'é maior que', requerValor: true },
    { valor: 'maior_igual', label: 'é maior ou igual a', requerValor: true },
    { valor: 'menor', label: 'é menor que', requerValor: true },
    { valor: 'menor_igual', label: 'é menor ou igual a', requerValor: true },
    { valor: 'entre', label: 'está entre', requerValor: true, requerSegundoValor: true },
    { valor: 'esta_vazio', label: 'está vazio', requerValor: false },
    { valor: 'nao_esta_vazio', label: 'não está vazio', requerValor: false },
  ],
  data: [
    { valor: 'e', label: 'é na data', requerValor: true },
    { valor: 'antes_de', label: 'é antes de', requerValor: true },
    { valor: 'depois_de', label: 'é depois de', requerValor: true },
    { valor: 'entre', label: 'está entre', requerValor: true, requerSegundoValor: true },
    { valor: 'ultimos_dias', label: 'nos últimos N dias', requerValor: true },
    { valor: 'proximos_dias', label: 'nos próximos N dias', requerValor: true },
    { valor: 'esta_vazio', label: 'está vazio', requerValor: false },
    { valor: 'nao_esta_vazio', label: 'não está vazio', requerValor: false },
  ],
  lista: [
    { valor: 'e', label: 'é', requerValor: true },
    { valor: 'nao_e', label: 'não é', requerValor: true },
    { valor: 'e_um_de', label: 'é um de (múltipla escolha)', requerValor: true },
    { valor: 'nao_e_um_de', label: 'não é um de', requerValor: true },
    { valor: 'esta_vazio', label: 'está vazio', requerValor: false },
    { valor: 'nao_esta_vazio', label: 'não está vazio', requerValor: false },
  ],
  booleano: [
    { valor: 'e_verdadeiro', label: 'é verdadeiro (Sim)', requerValor: false },
    { valor: 'e_falso', label: 'é falso (Não)', requerValor: false },
  ],
}

/**
 * Catálogo de campos filtráveis do módulo CLIENTES
 */
export const CAMPOS_CLIENTES: DefinicaoCampo[] = [
  {
    id: 'nome',
    label: 'Nome do Cliente / Razão Social',
    tipo: 'texto',
    modulo: 'clientes',
    categoria: 'Dados Básicos',
    placeholder: 'Ex: João Silva ou Delfos',
  },
  {
    id: 'cidade',
    label: 'Cidade',
    tipo: 'texto',
    modulo: 'clientes',
    categoria: 'Localização',
    placeholder: 'Ex: Erechim, Passo Fundo...',
  },
  {
    id: 'estado',
    label: 'Estado (UF)',
    tipo: 'texto',
    modulo: 'clientes',
    categoria: 'Localização',
    placeholder: 'Ex: RS, SC...',
  },
  {
    id: 'concessionaria',
    label: 'Concessionária',
    tipo: 'lista',
    modulo: 'clientes',
    categoria: 'Energia',
    opcoes: [
      { label: 'RGE', value: 'RGE' },
      { label: 'CPFL', value: 'CPFL' },
      { label: 'Celesc', value: 'Celesc' },
      { label: 'Copel', value: 'Copel' },
      { label: 'Enel', value: 'Enel' },
      { label: 'Outra', value: 'Outra' },
    ],
  },
  {
    id: 'tipo_cliente',
    label: 'Tipo de Cliente',
    tipo: 'lista',
    modulo: 'clientes',
    categoria: 'Classificação',
    opcoes: [
      { label: 'Residencial', value: 'residencial' },
      { label: 'Comercial', value: 'comercial' },
      { label: 'Industrial', value: 'industrial' },
      { label: 'Rural', value: 'rural' },
      { label: 'Investidor', value: 'investidor' },
    ],
  },
  {
    id: 'tipo_pessoa',
    label: 'Tipo de Pessoa',
    tipo: 'lista',
    modulo: 'clientes',
    categoria: 'Classificação',
    opcoes: [
      { label: 'Pessoa Física (PF)', value: 'fisica' },
      { label: 'Pessoa Jurídica (PJ)', value: 'juridica' },
    ],
  },
  {
    id: 'status',
    label: 'Etapa / Status Comercial',
    tipo: 'lista',
    modulo: 'clientes',
    categoria: 'Comercial',
    opcoes: [
      { label: '1 - Novo Lead', value: 'Novo Lead' },
      { label: '2 - Levantamento', value: 'Levantamento' },
      { label: '3 - Proposta Enviada', value: 'Orçamento' },
      { label: '4 - Negociação', value: 'Negociação' },
      { label: '5 - Contato Futuro', value: 'Contato Futuro' },
      { label: 'Fechado (Ganho)', value: 'Fechado' },
      { label: 'Perdido', value: 'Perdido' },
    ],
  },
  {
    id: 'tipo_venda',
    label: 'Tipo de Venda / Sistema',
    tipo: 'lista',
    modulo: 'clientes',
    categoria: 'Comercial',
    opcoes: TIPOS_VENDA_OPTIONS.map((t) => ({ label: t, value: t })),
  },
  {
    id: 'tem_whatsapp',
    label: 'Possui WhatsApp cadastrado',
    tipo: 'booleano',
    modulo: 'clientes',
    categoria: 'Contato',
  },
  {
    id: 'tem_telefone',
    label: 'Possui Telefone ou WhatsApp',
    tipo: 'booleano',
    modulo: 'clientes',
    categoria: 'Contato',
  },
  {
    id: 'tem_contrato_om',
    label: 'Possui Contrato de O&M',
    tipo: 'booleano',
    modulo: 'clientes',
    categoria: 'O&M',
  },
  {
    id: 'total_usinas',
    label: 'Quantidade de Usinas',
    tipo: 'numero',
    modulo: 'clientes',
    categoria: 'Usinas',
    placeholder: 'Ex: 1, 2, 5...',
  },
  {
    id: 'potencia_kwp',
    label: 'Potência Total (kWp)',
    tipo: 'numero',
    modulo: 'clientes',
    categoria: 'Energia',
    placeholder: 'Ex: 10.5',
  },
  {
    id: 'valor_estimado',
    label: 'Valor Estimado (R$)',
    tipo: 'numero',
    modulo: 'clientes',
    categoria: 'Comercial',
    placeholder: 'Ex: 25000',
  },
  {
    id: 'consumo_kwh_mes',
    label: 'Consumo Médio (kWh/mês)',
    tipo: 'numero',
    modulo: 'clientes',
    categoria: 'Energia',
    placeholder: 'Ex: 650',
  },
  {
    id: 'data_criacao',
    label: 'Data de Cadastro',
    tipo: 'data',
    modulo: 'clientes',
    categoria: 'Datas',
  },
  {
    id: 'origem_registro',
    label: 'Origem do Registro',
    tipo: 'lista',
    modulo: 'clientes',
    categoria: 'Classificação',
    opcoes: [
      { label: 'Cliente da Base', value: 'cliente' },
      { label: 'Outro Contato', value: 'outro_contato' },
    ],
  },
]

/**
 * Catálogo de campos filtráveis do módulo NEGÓCIOS
 */
export const CAMPOS_NEGOCIOS: DefinicaoCampo[] = [
  {
    id: 'titulo',
    label: 'Título / Nome do Negócio',
    tipo: 'texto',
    modulo: 'negocios',
    categoria: 'Dados Básicos',
    placeholder: 'Ex: Usina Residencial 8kWp',
  },
  {
    id: 'nome_cliente',
    label: 'Nome do Cliente',
    tipo: 'texto',
    modulo: 'negocios',
    categoria: 'Dados Básicos',
    placeholder: 'Ex: Maria Oliveira',
  },
  {
    id: 'cidade',
    label: 'Cidade do Cliente',
    tipo: 'texto',
    modulo: 'negocios',
    categoria: 'Localização',
    placeholder: 'Ex: Erechim',
  },
  {
    id: 'etapa_funil',
    label: 'Etapa do Funil',
    tipo: 'lista',
    modulo: 'negocios',
    categoria: 'Funil',
    opcoes: ETAPAS_FUNIL_LISTA.map((e) => ({ label: e.label, value: e.id })),
  },
  {
    id: 'status',
    label: 'Status do Negócio',
    tipo: 'lista',
    modulo: 'negocios',
    categoria: 'Funil',
    opcoes: [
      { label: 'Em andamento', value: 'em andamento' },
      { label: 'Ganho', value: 'ganho' },
      { label: 'Perdido', value: 'perdido' },
    ],
  },
  {
    id: 'tipo_venda',
    label: 'Tipo de Venda',
    tipo: 'lista',
    modulo: 'negocios',
    categoria: 'Comercial',
    opcoes: TIPOS_VENDA_OPTIONS.map((t) => ({ label: t, value: t })),
  },
  {
    id: 'tipo_negocio',
    label: 'Tipo de Negócio',
    tipo: 'lista',
    modulo: 'negocios',
    categoria: 'Comercial',
    opcoes: [
      { label: 'Energia Solar (Venda Usina)', value: 'venda usina' },
      { label: 'Bateria', value: 'bateria' },
      { label: 'Expansão', value: 'expansão' },
      { label: 'Renovação', value: 'renovação' },
      { label: 'Serviço', value: 'serviço' },
      { label: 'Créditos de Energia', value: 'creditos_energia' },
      { label: 'Carregador Veicular', value: 'carregadores veiculares' },
      { label: 'Plano de O&M', value: 'Planos de O&M' },
    ],
  },
  {
    id: 'valor',
    label: 'Valor (R$)',
    tipo: 'numero',
    modulo: 'negocios',
    categoria: 'Valores',
    placeholder: 'Ex: 35000',
  },
  {
    id: 'probabilidade',
    label: 'Probabilidade (%)',
    tipo: 'numero',
    modulo: 'negocios',
    categoria: 'Funil',
    placeholder: 'Ex: 80',
  },
  {
    id: 'recorrencia_mensal',
    label: 'Recorrência Mensal',
    tipo: 'booleano',
    modulo: 'negocios',
    categoria: 'Comercial',
  },
  {
    id: 'reabertura',
    label: 'Negócio Reaberto',
    tipo: 'booleano',
    modulo: 'negocios',
    categoria: 'Comercial',
  },
  {
    id: 'motivo_perda',
    label: 'Motivo da Perda',
    tipo: 'lista',
    modulo: 'negocios',
    categoria: 'Perda',
    opcoes: [
      { label: 'Preço', value: 'preco' },
      { label: 'Concorrente', value: 'concorrente' },
      { label: 'Desistiu', value: 'desistiu' },
      { label: 'Não respondeu', value: 'nao_respondeu' },
      { label: 'Sem crédito / Financiamento reprovado', value: 'sem_credito' },
      { label: 'Outro', value: 'outro' },
    ],
  },
  {
    id: 'data_criacao',
    label: 'Data de Criação',
    tipo: 'data',
    modulo: 'negocios',
    categoria: 'Datas',
  },
  {
    id: 'data_previsao_fechamento',
    label: 'Previsão de Fechamento',
    tipo: 'data',
    modulo: 'negocios',
    categoria: 'Datas',
  },
  {
    id: 'data_fechamento',
    label: 'Data de Fechamento',
    tipo: 'data',
    modulo: 'negocios',
    categoria: 'Datas',
  },
]

/**
 * Catálogo de campos filtráveis do módulo ATIVIDADES
 */
export const CAMPOS_ATIVIDADES: DefinicaoCampo[] = [
  {
    id: 'tipo',
    label: 'Tipo da Atividade',
    tipo: 'lista',
    modulo: 'atividades',
    categoria: 'Dados Básicos',
    opcoes: [
      { label: 'Limpeza', value: 'limpeza' },
      { label: 'Manutenção Preventiva', value: 'manutencao_preventiva' },
      { label: 'Manutenção Corretiva', value: 'manutencao_corretiva' },
      { label: 'Limpeza + Manutenção', value: 'limpeza_manutencao' },
      { label: 'Visita Técnica', value: 'visita_tecnica' },
      { label: 'Reunião', value: 'reuniao' },
      { label: 'Ligação', value: 'ligacao' },
      { label: 'WhatsApp', value: 'whatsapp' },
      { label: 'E-mail', value: 'email' },
      { label: 'Elaboração de Proposta', value: 'elaboracao_proposta' },
      { label: 'Follow-up Comercial', value: 'follow_up' },
      { label: 'Auto Leitura', value: 'auto_leitura' },
      { label: 'Outro', value: 'outro' },
    ],
  },
  {
    id: 'categoria',
    label: 'Categoria',
    tipo: 'lista',
    modulo: 'atividades',
    categoria: 'Classificação',
    opcoes: [
      { label: 'Comercial', value: 'Comercial' },
      { label: 'Manutenção', value: 'Manutenção' },
      { label: 'Administrativas', value: 'Administrativas' },
    ],
  },
  {
    id: 'status',
    label: 'Status',
    tipo: 'lista',
    modulo: 'atividades',
    categoria: 'Execução',
    opcoes: [
      { label: 'Pendente', value: 'pendente' },
      { label: 'Concluída', value: 'concluida' },
      { label: 'Cancelada', value: 'cancelada' },
      { label: 'Em Andamento', value: 'em_andamento' },
    ],
  },
  {
    id: 'responsavel',
    label: 'Responsável',
    tipo: 'texto',
    modulo: 'atividades',
    categoria: 'Atribuição',
    placeholder: 'Nome do responsável...',
  },
  {
    id: 'usina',
    label: 'Usina',
    tipo: 'texto',
    modulo: 'atividades',
    categoria: 'Localização',
    placeholder: 'Nome ou identificador da usina...',
  },
  {
    id: 'data_agendamento',
    label: 'Data de Agendamento',
    tipo: 'data',
    modulo: 'atividades',
    categoria: 'Datas',
  },
  {
    id: 'atrasada',
    label: 'Atrasada',
    tipo: 'booleano',
    modulo: 'atividades',
    categoria: 'Status',
  },
]

/**
 * Catálogo de campos filtráveis do módulo CONTRATOS O&M
 */
export const CAMPOS_CONTRATOS_OM: DefinicaoCampo[] = [
  {
    id: 'plano',
    label: 'Plano',
    tipo: 'lista',
    modulo: 'contratos_om',
    categoria: 'Dados Básicos',
    opcoes: [
      { label: 'Monitoramento', value: 'monitoramento' },
      { label: 'Essencial', value: 'essencial' },
      { label: 'Completo', value: 'completo' },
      { label: 'Personalizado', value: 'personalizado' },
    ],
  },
  {
    id: 'status',
    label: 'Status do Contrato',
    tipo: 'lista',
    modulo: 'contratos_om',
    categoria: 'Situação',
    opcoes: [
      { label: 'Ativo', value: 'ativo' },
      { label: 'Pendente', value: 'pendente' },
      { label: 'Vencendo', value: 'vencendo' },
      { label: 'Vencido', value: 'vencido' },
      { label: 'Cancelado', value: 'cancelado' },
      { label: 'Em renovação', value: 'em_renovacao' },
    ],
  },
  {
    id: 'vencimento',
    label: 'Vencimento',
    tipo: 'data',
    modulo: 'contratos_om',
    categoria: 'Datas',
  },
  {
    id: 'potencia_somada',
    label: 'Potência Somada (kWp)',
    tipo: 'numero',
    modulo: 'contratos_om',
    categoria: 'Capacidade',
    placeholder: 'Ex: 15.5',
  },
  {
    id: 'usinas_vinculadas',
    label: 'Usinas Vinculadas (quantidade)',
    tipo: 'numero',
    modulo: 'contratos_om',
    categoria: 'Capacidade',
    placeholder: 'Ex: 1, 2, 3...',
  },
]

export function getCatalogoPorModulo(modulo: ModuloFiltro): DefinicaoCampo[] {
  switch (modulo) {
    case 'clientes':
      return CAMPOS_CLIENTES
    case 'negocios':
      return CAMPOS_NEGOCIOS
    case 'atividades':
      return CAMPOS_ATIVIDADES
    case 'contratos_om':
      return CAMPOS_CONTRATOS_OM
    default:
      return []
  }
}

export function getCampoPorId(modulo: ModuloFiltro, campoId: string): DefinicaoCampo | undefined {
  const catalogo = getCatalogoPorModulo(modulo)
  return catalogo.find((c) => c.id === campoId)
}
