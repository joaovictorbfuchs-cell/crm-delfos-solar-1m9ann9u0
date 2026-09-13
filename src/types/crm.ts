import type { RecordModel } from 'pocketbase'

export type ClienteStatus =
  | 'Novo Lead'
  | 'Levantamento'
  | 'Orçamento'
  | 'Negociação'
  | 'Fechado'
  | 'Contato Futuro'
  | 'Perdido'

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

export type AtividadeCategoriaId = 'comercial' | 'manutencao' | 'administrativo_pos_venda'

export interface TipoAtividadeCustomItem extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  nome: string
  categoria: AtividadeCategoriaId
  cor?: string
  icone?: string
  descricao?: string
  is_padrao?: boolean
  created: string
  updated: string
}

export type AtividadeTipo =
  // 1. Atividades Comerciais:
  | 'contato_ligacao'
  | 'reuniao_presencial'
  | 'follow_up'
  | 'proposta'
  | 'ligar_indicacao'
  | 'contato_reativacao'
  // 2. Atividades de Manutenção:
  | 'instalacao'
  | 'limpeza_manutencao'
  | 'configuracao_datalogger'
  | 'garantia_equipamento'
  // 3. Atividades Administrativas / RGE / Pós-Venda:
  | 'auto_leitura_rge'
  | 'relatorio_solarview'
  | 'anexo_g'
  | 'troca_titularidade'
  | 'transferencia_creditos'
  | 'gerar_procuracao'
  | 'gerar_contrato'
  // Tipos legados mantidos para retrocompatibilidade  | 'anotacao'
  | 'ligacao'
  | 'reuniao'
  | 'visita_tecnica'
  | 'mudanca_estagio'
  // Tipos dinâmicos / personalizados adicionados pelo usuário
  | (string & {})

export type AtividadeStatus = 'pendente' | 'concluida' | 'cancelada'

export interface SistemaUsuario {
  id: string
  name: string
  email: string
  avatar?: string
}

export type ClienteTipo = 'residencial' | 'comercial' | 'industrial' | 'rural' | 'investidor'

export type TipoPessoa = 'fisica' | 'juridica'

export interface AtividadeSetorItem extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  nome: string
  created: string
  updated: string
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
  tipo_cliente?: ClienteTipo
  usina_endereco?: string
  // Proposta O&M ID
  proposta_om_id?: string
  // Novos campos cadastrais
  tipo_pessoa?: TipoPessoa
  nome_fantasia?: string
  razao_social?: string
  cnpj?: string
  cpf?: string
  inscricao_estadual?: string
  email?: string
  telefone_secundario?: string
  contato_principal?: string
  atividade_principal?: string
  observacoes?: string
  como_conheceu?: string
  data_abertura?: string
  cep?: string
  estado?: string
  bairro?: string
  numero?: string
  complemento?: string
  contato?: string
  data_nascimento_fundacao?: string
  rg?: string
  // Campos de consulta CNPJ / Receita Federal
  cnae_principal?: string
  situacao_cadastral?: string
  // Campos de consumo / concessionária adicionados
  tarifa?: number
  classe_consumo?: string
  concessionaria?: string
  whatsapp?: string
  // Dados do Titular / Responsável pela Unidade Consumidora (UC)
  titular_nome?: string
  titular_cpf?: string
  titular_telefone?: string
  titular_email?: string
  dados_importados?: Record<string, string | number | boolean | null> | null
  // Dados de Acesso ao Monitoramento do Inversor
  monitoramento_app_nome?: string
  monitoramento_login?: string
  monitoramento_senha?: string
  monitoramento_datalogger_url?: string
  // Dados de Acesso ao App Solarview
  solarview_login?: string
  solarview_senha?: string
  solarview_link_ios?: string
  solarview_link_android?: string
  solarview_link_texto?: string
  created: string
  updated: string
}

// -------------------------------------------------------------
// Tipos para Monitoramento & Padrões por Marca de Inversor
// -------------------------------------------------------------

export interface MonitoramentoMarca extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  marca: string
  app_nome?: string
  login_padrao?: string
  senha_padrao?: string
  datalogger_url?: string
  instrucoes?: string
  created: string
  updated: string
}

export interface ClienteInversor extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  marca_inversor?: string
  modelo_inversor?: string
  potencia_kwp?: number
  numero_serie?: string
  app_nome?: string
  login?: string
  senha?: string
  datalogger_url?: string
  observacoes?: string
  ordem?: number
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
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

// -------------------------------------------------------------
// Tipos para Gestão de Fornecedores e Orçamentos de Fornecedores
// -------------------------------------------------------------

export type FornecedorEspecialidade =
  | 'paineis'
  | 'inversores'
  | 'estruturas'
  | 'acessorios'
  | 'completo'

export interface FornecedorItemOrcamento {
  descricao: string
  quantidade: number
  valor_unitario?: number
}

export interface Fornecedor extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  nome_empresa: string
  tipo_pessoa?: TipoPessoa
  razao_social?: string
  nome_fantasia?: string
  cnpj?: string
  cpf?: string
  contato_nome?: string
  contato_principal?: string
  telefone?: string
  telefone_secundario?: string
  email?: string
  atividade_principal?: string
  como_conheceu?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  cnae_principal?: string
  situacao_cadastral?: string
  data_abertura?: string
  especialidade: FornecedorEspecialidade
  observacoes?: string
  created: string
  updated: string
  expand?: {
    'fornecedores_orcamentos(fornecedor_id)'?: FornecedorOrcamento[]
  }
}

export interface FornecedorOrcamento extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  fornecedor_id?: string
  cliente_id?: string
  orcamento_solar_id?: string
  nome_fornecedor: string
  data: string
  numero_revisao?: string
  valor_total: number
  modulos?: FornecedorItemOrcamento[]
  inversores?: FornecedorItemOrcamento[]
  acessorios?: FornecedorItemOrcamento[]
  arquivo?: string
  observacoes?: string
  selecionado?: boolean
  created: string
  updated: string
  expand?: {
    fornecedor_id?: Fornecedor
    cliente_id?: Cliente
    orcamento_solar_id?: OrcamentoSolar
  }
}

export interface FornecedorOrcamentoExtraido {
  nome_fornecedor: string
  fornecedor_id?: string
  numero_revisao?: string
  data?: string
  valor_total: number
  modulos: FornecedorItemOrcamento[]
  inversores: FornecedorItemOrcamento[]
  acessorios: FornecedorItemOrcamento[]
  observacoes?: string
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

// -------------------------------------------------------------
// Tipos para Transferência de Créditos de Energia
// -------------------------------------------------------------

// -------------------------------------------------------------
// Tipos para Documentos do Cliente e Controle de Assinatura
// -------------------------------------------------------------

export type DocumentoClienteTipo =
  | 'procuracao'
  | 'contrato'
  | 'anexo_e'
  | 'anexo_f'
  | 'anexo_g'
  | 'troca_titularidade'

export type DocumentoClienteStatusAssinatura = 'aguardando_assinatura' | 'assinado'

export interface DocumentoCliente extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  tipo: DocumentoClienteTipo
  status_assinatura: DocumentoClienteStatusAssinatura
  data_envio?: string
  data_assinatura?: string
  canal_envio?: string
  telefone_envio?: string
  observacoes?: string
  autor?: string
  dados_documento?: Record<string, any> | null
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}

export type TransferenciaCreditoStatus = 'Pendente' | 'Em análise' | 'Homologada' | 'Rejeitada'

export interface TransferenciaCredito extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_origem_id: string
  cliente_origem_nome?: string
  cliente_destino_id?: string
  cliente_destino_nome: string
  uc_destino?: string
  quantidade_creditos: number
  data_solicitacao: string
  status: TransferenciaCreditoStatus
  observacoes?: string
  protocolo_concessionaria?: string
  created: string
  updated: string
  expand?: {
    cliente_origem_id?: Cliente
    cliente_destino_id?: Cliente
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
  monitoramento_app_nome?: string
  monitoramento_login?: string
  monitoramento_senha?: string
  monitoramento_datalogger_url?: string
  // Dados de Acesso ao App Solarview
  solarview_login?: string
  solarview_senha?: string
  solarview_link_ios?: string
  solarview_link_android?: string
  solarview_link_texto?: string
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

export type OMStatusPlano = 'Ativo' | 'Vencendo em 30 dias' | 'Vencido' | 'Cancelado' | 'Encerrado'

export type OMMotivoEncerramento =
  | 'Não renovação'
  | 'Rescisão por inadimplemento'
  | 'Encerramento por conveniência'

export type OMStatusEncerramento = 'vigente' | 'encerrado'

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
  status_encerramento?: OMStatusEncerramento
  motivo_encerramento?: OMMotivoEncerramento
  data_encerramento?: string
  observacoes_encerramento?: string
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

// -------------------------------------------------------------
// Tipos para Serviços Avulsos
// -------------------------------------------------------------

export type ServicoAvulsoTipo =
  | 'limpeza'
  | 'troca_equipamento'
  | 'visita_tecnica'
  | 'reaperto'
  | 'outro'

export type ServicoAvulsoStatus = 'agendado' | 'em_andamento' | 'concluido'

export interface ServicoAvulso extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  data_servico: string
  tipo_servico: ServicoAvulsoTipo
  valor_cobrado?: number
  observacoes_tecnicas?: string
  status: ServicoAvulsoStatus
  observacoes_equipe?: string
  fotos?: string[]
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}

// -------------------------------------------------------------
// Tipos para Execução de Ordens de Serviço (OS) e Templates
// -------------------------------------------------------------

export type OSTipoServico =
  | 'Limpeza'
  | 'Manutenção'
  | 'Instalação'
  | 'Garantia'
  | 'Configuração de Datalogger'

export type OSStatus = 'pendente' | 'concluida' | 'cancelada'

export interface OSChecklistItem {
  id: string
  item: string
  concluido: boolean
}

export interface OSTemplate extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  tipo_servico: OSTipoServico
  instrucoes?: string
  created: string
  updated: string
}

export interface OrdemServico extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  tipo_servico: OSTipoServico
  endereco?: string
  data_agendada: string
  status: OSStatus
  atribuida_a?: string
  profissional_id?: string
  instrucoes?: string
  checklist?: OSChecklistItem[]
  detalhes_execucao?: string
  fotos?: string[]
  concluida_em?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    profissional_id?: Profissional
  }
}

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
export type PropostaRevisaoStatus = 'em análise' | 'enviada ao cliente' | 'aprovada' | 'rejeitada'
export type OrcamentoTipoCliente = 'residencial' | 'comercial' | 'industrial' | 'rural'
export type OrcamentoTipoEstrutura = 'ceramico' | 'metalico' | 'laje' | 'fibrocimento' | 'solo'
export type OrcamentoOrientacaoTelhado = 'leste' | 'oeste' | 'norte' | 'sul'

export interface OrcamentoSolar extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  cliente_id: string
  status: OrcamentoSolarStatus
  numero_revisao?: number
  revisao_de?: string
  status_revisao?: PropostaRevisaoStatus
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
    revisao_de?: OrcamentoSolar
  }
}
