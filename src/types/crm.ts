import type { RecordModel } from 'pocketbase'

export type ClienteStatus =
  | 'Novo Lead'
  | 'Levantamento'
  | 'Orçamento'
  | 'Negociação'
  | 'Fechado'
  | 'Contato Futuro'

export type ProdutoTipo =
  | 'Energia Solar'
  | 'Manutenção avulsa'
  | 'Plano de O&M'
  | 'Sistemas Híbridos'
  | 'Carregadores veiculares'
  | 'residencial'
  | 'comercial'
  | 'industrial'
  | 'rural'
  | 'investidor'

export type OrigemLeadTipo = 'Facebook' | 'Instagram' | 'Indicação' | 'Site' | 'WhatsApp' | 'Outro'

export type TelhadoTipo = 'ceramico' | 'metalico' | 'laje' | 'fibrocimento'

export type TipoAtendimento = 'aéreo' | 'subterrâneo'

export type NumeroFases = 'monofásico' | 'bifásico' | 'trifásico'

export type ManutencaoTipo = 'Limpeza' | 'Revisão Elétrica' | 'Troca de Inversor'

export type ManutencaoStatus = 'Agendado' | 'Em andamento' | 'Concluído'

export type AtividadeTipo =
  // Os 12 tipos oficiais solicitados:
  | 'contato_ligacao'
  | 'reuniao_presencial'
  | 'follow_up'
  | 'instalacao'
  | 'proposta'
  | 'limpeza_manutencao'
  | 'auto_leitura_rge'
  | 'ligar_indicacao'
  | 'configuracao_datalogger'
  | 'garantia_equipamento'
  | 'relatorio_solarview'
  | 'contato_reativacao'
  // Tipos legados mantidos para retrocompatibilidade
  | 'anotacao'
  | 'ligacao'
  | 'reuniao'
  | 'visita_tecnica'
  | 'mudanca_estagio'

export type AtividadeStatus = 'pendente' | 'concluida' | 'cancelada'

export interface SistemaUsuario {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface Cliente extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  nome: string
  telefone: string
  endereco: string
  uc: string
  cidade: string
  potencia_kwp: number
  valor_estimado: number
  status: ClienteStatus
  data_instalacao: string
  inversor_marca: string
  inversor_modelo: string
  placas_qtd: number
  placas_marca: string
  telhado_tipo: TelhadoTipo
  produto?: ProdutoTipo
  consumo_kwh_mes?: number
  origem_lead?: OrigemLeadTipo
  // Proposta O&M ID
  proposta_om_id?: string
  // Novos campos cadastrais
  nome_fantasia?: string
  razao_social?: string
  cnpj?: string
  cpf?: string
  inscricao_estadual?: string
  email?: string
  cep?: string
  estado?: string
  bairro?: string
  numero?: string
  complemento?: string
  contato?: string
  data_nascimento_fundacao?: string
  rg?: string
  // Campos de consumo / concessionária adicionados
  tarifa?: number
  classe_consumo?: string
  concessionaria?: string
  whatsapp?: string
  created: string
  updated: string
}

// -------------------------------------------------------------
// Tipos para Integração com WhatsApp
// -------------------------------------------------------------

export type WhatsAppMensagemStatus =
  | 'pendente'
  | 'agendada'
  | 'enviada'
  | 'entregue'
  | 'lida'
  | 'falha'
export type WhatsAppTipoDisparo =
  | 'manual'
  | 'proposta_aprovada'
  | 'lembrete_visita'
  | 'followup_posvenda'
  | 'webhook'

export type WhatsAppConversaStatus = 'novo' | 'em_atendimento' | 'aguardando_cliente' | 'resolvido'

export interface WhatsAppConversa extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  numero: string
  cliente_id?: string
  status: WhatsAppConversaStatus
  atendente?: string
  atendente_id?: string
  ultima_mensagem_preview?: string
  ultima_mensagem_em?: string
  nao_lidas?: number
  vinculada_em?: string
  resolvida_em?: string
  reaberta_em?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}

export interface WhatsAppTemplate extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  titulo: string
  slug: string
  conteudo: string
  tipo_gatilho?: string
  variaveis_disponiveis?: string[] | string
  ativo?: boolean
  created: string
  updated: string
}

export interface WhatsAppMensagem extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id?: string
  conversa_id?: string
  template_id?: string
  telefone_destino: string
  conteudo_final: string
  status: WhatsAppMensagemStatus
  direcao?: 'enviada' | 'recebida'
  agendado_para?: string
  enviado_em?: string
  tipo_disparo?: WhatsAppTipoDisparo | string
  tipo_mensagem?: 'texto' | 'documento' | 'imagem' | 'audio' | string
  nome_arquivo?: string
  documento_url?: string
  referencia_id?: string
  id_externo_gateway?: string
  log_erro?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    conversa_id?: WhatsAppConversa
    template_id?: WhatsAppTemplate
  }
}

export interface WhatsAppConfigStatus {
  ok: boolean
  configured: boolean
  hasApiUrl: boolean
  apiUrlPreview?: string
  apiUrlMasked?: string
  isZApi?: boolean
  isEvolution?: boolean
  isUrlWellFormed?: boolean
  formatHint?: string
  provider?: string
  hasApiKey: boolean
  apiKeyMasked?: string
  originNumber?: string
  webhookUrl?: string
  webhookStatusUrl?: string
  secretsRequired: string[]
}

// -------------------------------------------------------------
// Outros Contatos (fornecedor, instalador, parceiro, outro)
// -------------------------------------------------------------

export type OutroContatoTipo = 'fornecedor' | 'instalador' | 'parceiro' | 'outro'

export interface OutroContato extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  nome: string
  telefone: string
  tipo_contato: OutroContatoTipo
  observacao?: string
  conversa_id?: string
  created: string
  updated: string
}

export interface Sistema extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  // Destaque inicial
  geracao_media_mensal_kwh?: number
  // Instalação
  data_instalacao?: string
  potencia_total_kwp?: number
  quantidade_placas?: number
  marca_placas?: string
  tipo_telhado?: TelhadoTipo
  numero_uc?: string
  // Localização
  latitude?: number
  longitude?: number
  // Concessionária
  concessionaria?: string
  tarifa?: number
  classe_consumo?: string
  padrao_entrada?: string
  tipo_atendimento?: TipoAtendimento
  numero_fases?: NumeroFases
  secao_cabos?: string
  tipo_caixa_medicao?: string
  amperagem_disjuntor?: string
  // Equipamentos
  quantidade_modulos?: number
  fabricante_modulos?: string
  modelo_modulos?: string
  fabricante_inversores?: string
  modelo_inversores?: string
  potencia_pico_modulos_kwp?: number
  potencia_pico_inversores_kwp?: number
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}

export interface Manutencao extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  data: string
  tipo: ManutencaoTipo
  status: ManutencaoStatus
  tecnico: string
  descricao: string
  fotos: string[]
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}

export interface Atividade extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  tipo: AtividadeTipo
  titulo?: string
  descricao?: string
  data: string
  autor?: string
  status?: AtividadeStatus
  responsavel_id?: string
  responsavel_nome?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    responsavel_id?: SistemaUsuario
  }
}

export type ProfissionalEspecialidade =
  | 'Instalação'
  | 'Manutenção'
  | 'Limpeza'
  | 'Projeto Elétrico'
  | 'Almoxarifado'

export interface Profissional extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  nome: string
  telefone: string
  especialidade: ProfissionalEspecialidade
  created: string
  updated: string
}

export type ProjetoEtapa =
  | 'Levantamento de Informações'
  | 'Elaboração de Projeto'
  | 'Pedido de Compra'
  | 'Aguardando Material'
  | 'Instalação'
  | 'Concluído'

export interface Projeto extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  etapa: ProjetoEtapa
  potencia_kwp?: number
  cidade?: string
  profissional_id?: string
  profissional_nome?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    profissional_id?: Profissional
  }
}

export interface ProjetoEvento extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  projeto_id: string
  etapa_anterior?: string
  etapa_nova: ProjetoEtapa | string
  profissional_nome?: string
  autor?: string
  data: string
  descricao?: string
  created: string
  updated: string
}

// -------------------------------------------------------------
// Tipos para Gestão de O&M (Operação e Manutenção)
// -------------------------------------------------------------

export type OMPlanoTipo = 'Essencial' | 'Prevenção' | 'Completo'

export type OMStatusPlano = 'Ativo' | 'Vencendo em 30 dias' | 'Vencido' | 'Cancelado'

export type OMAnomaliaEtapa =
  | 'Detecção'
  | 'Solicitação de Informações'
  | 'Triagem Remota'
  | 'Diagnóstico In Loco'
  | 'Execução'
  | 'Faturamento'

export type OMAnomaliaStatus = 'Aberto' | 'Em análise' | 'Em execução' | 'Resolvido' | 'Cancelado'

export type OMAnomaliaSeveridade = 'Baixa' | 'Média' | 'Alta' | 'Crítica'

export type OMServicoAdicionalTipo =
  | 'diagnostico_tecnico'
  | 'manutencao_corretiva'
  | 'inspecao_termografica'
  | 'limpeza_avulsa'
  | 'testes_inversor'
  | 'substituicao_inversor'
  | 'relatorio_seguradora'
  | 'configuracao_datalogger'
  | 'gestao_rateio'
  | 'auditoria_faturamento'
  | 'manutencao_ativos'

export type OMServicoAdicionalStatus = 'pendente' | 'em execução' | 'faturado' | 'cancelado'

export type OMTimelineTipo =
  | 'anomalia'
  | 'servico_plano'
  | 'servico_adicional'
  | 'relatorio'
  | 'interacao'
  | 'inspecao'

export interface ContratoOM extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  plano: OMPlanoTipo
  status: OMStatusPlano
  valor_mensal: number
  valor_anual: number
  data_inicio: string
  data_vencimento: string
  proxima_atividade_data?: string
  proxima_atividade_titulo?: string
  servicos_realizados?: string[]
  servicos_agendados?: string[]
  observacoes?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}

export interface AnomaliaOM extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  contrato_id?: string
  cliente_id: string
  codigo?: string
  titulo: string
  descricao?: string
  etapa: OMAnomaliaEtapa
  status: OMAnomaliaStatus
  severidade?: OMAnomaliaSeveridade
  data_abertura: string
  data_resolucao?: string
  tecnico_id?: string
  tecnico_nome?: string
  solucao_adotada?: string
  valor_faturamento?: number
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    tecnico_id?: Profissional
  }
}

export interface ServicoAdicionalOM extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  contrato_id?: string
  cliente_id: string
  data: string
  tipo: OMServicoAdicionalTipo
  descricao: string
  valor: number
  status: OMServicoAdicionalStatus
  tecnico_id?: string
  tecnico_nome?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    tecnico_id?: Profissional
  }
}

export interface TimelineOM extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  contrato_id?: string
  tipo: OMTimelineTipo
  titulo: string
  descricao?: string
  data: string
  autor?: string
  status_tag?: string
  referencia_id?: string
  created: string
  updated: string
}

// -------------------------------------------------------------
// Tipos para Propostas de O&M
// -------------------------------------------------------------

export interface PropostaOM extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  plano_escolhido?: OMPlanoTipo | ''
  potencia_kwp: number
  geracao_mensal_kwh: number
  marca_inversores?: string
  tipo_instalacao?: string
  numero_modulos?: number
  valor_kwh: number
  distancia_km?: number
  valor_km?: number
  valor_ativo_protegido: number
  perda_15_ano: number
  perda_20_ano: number
  prejuizo_20_dias: number
  prejuizo_30_dias: number
  valor_mensal_plano?: number
  valor_anual_plano?: number
  data_proposta: string
  autor?: string
  status?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}

// -------------------------------------------------------------
// Tipos para Orçamentos de Energia Solar Fotovoltaica
// -------------------------------------------------------------

export type OrcamentoSolarStatus = 'Em elaboração' | 'Enviado ao cliente' | 'Aprovado' | 'Rejeitado'
export type OrcamentoTipoCliente = 'residencial' | 'comercial' | 'industrial' | 'rural'
export type OrcamentoTipoEstrutura = 'ceramico' | 'metalico' | 'laje' | 'fibrocimento' | 'solo'
export type OrcamentoOrientacaoTelhado = 'leste' | 'oeste' | 'norte' | 'sul'

export interface OrcamentoSolar extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  status: OrcamentoSolarStatus
  tipo_cliente: OrcamentoTipoCliente
  consumo_kwh_mes: number
  tarifa_kwh: number
  potencia_kwp: number
  numero_placas: number
  potencia_placa_wp: number
  marca_painel: string
  marca_inversor: string
  quantidade_inversores: number
  tipo_estrutura: OrcamentoTipoEstrutura
  orientacao_telhado: OrcamentoOrientacaoTelhado
  area_necessaria_m2: number
  codigo_finame?: string
  valor_investimento: number
  // Custos
  custo_mao_de_obra?: number
  custo_materiais_extras?: number
  custo_frete_guincho?: number
  custo_subestacao?: number
  custo_terceirizacao?: number
  custo_administracao?: number
  custo_marketing_combustivel?: number
  custo_risco_engenharia?: number
  custo_comissao_comercial?: number
  custo_indicacao?: number
  custo_impostos?: number
  valor_total_custos?: number
  custo_por_kwp?: number
  // Cálculos solares
  geracao_anual_kwh?: number
  geracao_mensal_kwh?: number
  geracao_detalhada_json?: unknown
  economia_1_mes?: number
  economia_1_ano?: number
  economia_5_anos?: number
  economia_10_anos?: number
  economia_25_anos?: number
  gasto_sem_solar_1_ano?: number
  gasto_sem_solar_5_anos?: number
  gasto_sem_solar_10_anos?: number
  gasto_sem_solar_25_anos?: number
  conta_primeiro_mes_com_solar?: number
  conta_4_anos_reajuste?: number
  conta_10_anos_reajuste?: number
  payback_meses?: number
  // Parcelas
  parcela_a_vista?: number
  parcela_cartao_18x?: number
  parcela_financiamento_banco1?: number
  parcela_financiamento_banco2?: number
  // Metadados
  data_orcamento: string
  validade_dias?: number
  autor?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}
