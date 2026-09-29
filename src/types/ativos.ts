import type { UsinaCliente } from './crm'

export type TipoAtivo = 'inversor' | 'placa_solar' | 'bateria' | 'string_box' | 'outros'

export type StatusOperacionalAtivo = 'operacional' | 'em_alerta' | 'manutencao' | 'desativado'

export type StatusGarantia = 'vigente' | 'proxima_vencimento' | 'vencida' | 'nao_informada'

export interface AtivoUsina {
  id: string
  collectionId: string
  collectionName: string
  usina_id?: string
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
  chave_importacao?: string
  cliente_inversor_id?: string
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
  usina_id?: string
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
  chave_importacao?: string
  cliente_inversor_id?: string
}

export interface InversorIgnoradoInfo {
  id: string
  cliente_id?: string
  cliente_nome?: string
  marca_inversor?: string
  modelo_inversor?: string
  numero_serie?: string
  motivo: string
}

export interface AnaliseImportacaoInversores {
  totalInversores: number
  aptosParaCriar: {
    inversorId: string
    clienteId: string
    clienteNome: string
    usinaId?: string
    usinaNome?: string
    fabricante: string
    modelo: string
    numeroSerie?: string
    observacaoFormatada: string
  }[]
  jaImportados: {
    inversorId: string
    clienteNome?: string
    fabricante: string
    modelo: string
    numeroSerie?: string
    ativoExistenteId: string
  }[]
  foraPorFaltaDados: InversorIgnoradoInfo[]
}

export interface ResultadoExecucaoImportacao {
  criados: number
  jaExistentes: number
  ignoradosPorFaltaDados: number
  detalhesIgnorados: InversorIgnoradoInfo[]
  erros?: { id: string; erro: string }[]
}

export interface InfoStatusGarantia {
  status: StatusGarantia
  label: string
  descricao: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  badgeClasses: string
  diasRestantes?: number
}
