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

export type OrigemLeadTipo = 'Facebook' | 'Instagram' | 'Indicação' | 'Site' | 'Outro'

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
