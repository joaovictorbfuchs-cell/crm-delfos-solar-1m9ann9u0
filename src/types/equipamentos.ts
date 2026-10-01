import type { Fornecedor } from './crm'

export type TipoEquipamento = 'inversor' | 'modulo_fv' | 'outro'

export interface Equipamento {
  id: string
  collectionId: string
  collectionName: string
  tipo: TipoEquipamento
  marca: string
  modelo: string
  potencia_w: number
  descricao_padrao?: string
  garantia_anos?: number | null
  foto?: string
  datasheet_pdf?: string
  datasheet_url?: string
  datalogger_url?: string
  fornecedor_id?: string
  telefone_suporte_fornecedor?: string
  created: string
  updated: string
  expand?: {
    fornecedor_id?: Fornecedor
  }
}

export interface SalvarEquipamentoDados {
  tipo: TipoEquipamento
  marca: string
  modelo: string
  potencia_w: number
  descricao_padrao?: string
  garantia_anos?: number | null
  datasheet_pdf?: string
  datasheet_url?: string
  datalogger_url?: string
  fornecedor_id?: string
  telefone_suporte_fornecedor?: string
}

export interface UsinaEquipamentoAtivo {
  id: string
  collectionId: string
  collectionName: string
  usina_id: string
  equipamento_id: string
  quantidade?: number | null
  numero_serie?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    equipamento_id?: Equipamento
    usina_id?: any
  }
}

export interface SalvarUsinaEquipamentoDados {
  usina_id: string
  equipamento_id: string
  quantidade?: number | null
  numero_serie?: string
  observacoes?: string
}
