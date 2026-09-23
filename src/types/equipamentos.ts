export type TipoEquipamento = 'inversor' | 'modulo_fv'

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
  created: string
  updated: string
}

export interface SalvarEquipamentoDados {
  tipo: TipoEquipamento
  marca: string
  modelo: string
  potencia_w: number
  descricao_padrao?: string
  garantia_anos?: number | null
  datasheet_pdf?: string
}
