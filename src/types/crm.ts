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
