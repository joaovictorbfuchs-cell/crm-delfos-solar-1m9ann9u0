import type { Fornecedor } from './crm'

export type TipoEquipamento = 'inversor' | 'modulo_fv' | 'outro'

export type TipoProcedimentoMonitoramento = 'pdf' | 'link' | 'ambos'

export interface ConfiguracaoMonitoramento {
  id: string
  collectionId: string
  collectionName: string
  marca: string
  titulo?: string
  tipo_procedimento?: TipoProcedimentoMonitoramento
  arquivo_pdf?: string
  link_procedimento?: string
  instrucoes?: string
  ativo?: boolean
  created: string
  updated: string
}

export interface SalvarConfiguracaoMonitoramentoDados {
  marca: string
  titulo?: string
  tipo_procedimento?: TipoProcedimentoMonitoramento
  link_procedimento?: string
  instrucoes?: string
  ativo?: boolean
}

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
  configuracao_monitoramento_id?: string
  fornecedor_id?: string
  telefone_suporte_fornecedor?: string
  created: string
  updated: string
  expand?: {
    fornecedor_id?: Fornecedor
    configuracao_monitoramento_id?: ConfiguracaoMonitoramento
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
  configuracao_monitoramento_id?: string
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
