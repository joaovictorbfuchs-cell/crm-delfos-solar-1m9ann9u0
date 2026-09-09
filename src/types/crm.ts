import type { RecordModel } from 'pocketbase'

export type ClienteStatus =
  | 'Novo Lead'
  | 'Levantamento'
  | 'Orçamento'
  | 'Negociação'
  | 'Fechado'
  | 'Contato Futuro'

export type TelhadoTipo = 'ceramico' | 'metalico' | 'laje' | 'fibrocimento'

export type ManutencaoTipo = 'Limpeza' | 'Revisão Elétrica' | 'Troca de Inversor'

export type ManutencaoStatus = 'Agendado' | 'Em andamento' | 'Concluído'

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
  created: string
  updated: string
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
  data: string
  descricao: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}
