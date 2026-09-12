import type { Atividade, OrcamentoSolar, PropostaOM } from '@/types/crm'

export type TimelineFilterTipo = 'todas' | 'atividades' | 'propostas' | 'outras'

export type TimelineItemCategory =
  | 'proposta_solar'
  | 'proposta_om'
  | 'atividade'
  | 'anotacao'
  | 'outras'

export interface TimelineUnifiedItem {
  id: string
  categoria: TimelineItemCategory
  tipoFiltro: 'atividades' | 'propostas' | 'outras'
  titulo: string
  subtitulo?: string
  descricao?: string
  data: string
  autor?: string
  responsavelNome?: string
  status?: string
  statusVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  valorPrincipal?: number
  valorSecundario?: string
  dadosTecnicos?: {
    potenciaKwp?: number
    numeroPlacas?: number
    placasMarca?: string
    inversorMarca?: string
    geracaoMensalKwh?: number
    paybackMeses?: number
    tipoEstrutura?: string
    revisaoNumero?: number
    planoEscolhido?: string
  }
  // Referências aos dados originais
  rawAtividade?: Atividade
  rawOrcamentoSolar?: OrcamentoSolar
  rawPropostaOM?: PropostaOM
}
