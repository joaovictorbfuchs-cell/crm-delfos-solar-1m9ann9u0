import type { UsinaCliente } from './crm'

export type TipoAtivo = 'inversor' | 'placa_solar' | 'bateria' | 'string_box' | 'outros'

export type StatusOperacionalAtivo = 'operacional' | 'em_alerta' | 'manutencao' | 'desativado'

export type StatusGarantia = 'vigente' | 'proxima_vencimento' | 'vencida' | 'nao_informada'

export interface AtivoUsina {
  id: string
  collectionId: string
  collectionName: string
  usina_id: string
  tipo: TipoAtivo
  tipo_outro_descricao?: string
  fabricante: string
  modelo: string
  numero_serie?: string
  data_instalacao?: string
  data_fim_garantia?: string
  responsavel_id?: string
  observacoes?: string
  status_operacional?: StatusOperacionalAtivo
  created: string
  updated: string
  expand?: {
    usina_id?: UsinaCliente & {
      expand?: {
        cliente_id?: {
          id: string
          nome: string
          cidade?: string
        }
      }
    }
    responsavel_id?: {
      id: string
      name: string
      email?: string
    }
  }
}

export interface SalvarAtivoDados {
  usina_id: string
  tipo: TipoAtivo
  tipo_outro_descricao?: string
  fabricante: string
  modelo: string
  numero_serie?: string
  data_instalacao?: string
  data_fim_garantia?: string
  responsavel_id?: string
  observacoes?: string
  status_operacional?: StatusOperacionalAtivo
}

export interface InfoStatusGarantia {
  status: StatusGarantia
  label: string
  descricao: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  badgeClasses: string
  diasRestantes?: number
}
