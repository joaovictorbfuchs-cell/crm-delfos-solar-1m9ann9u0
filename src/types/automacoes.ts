export type AutomacaoGatilhoTipo =
  | 'status_mudou'
  | 'instalacao_concluida'
  | 'atividade_concluida'
  | 'data_especifica'
  | 'dias_apos_evento'

export type AutomacaoAcaoTipo =
  | 'criar_atividade'
  | 'enviar_whatsapp'
  | 'enviar_email'
  | 'mudar_status'

export type AutomacaoDestinoTipo = 'cliente_evento' | 'responsavel_empresa' | 'cliente_especifico'

export interface ConfiguracaoGatilho {
  // Para status_mudou:
  status_alvo?: string
  // Para atividade_concluida:
  tipo_atividade?: string
  // Para data_especifica:
  dia_mes?: number
  // Para dias_apos_evento:
  dias?: number
  evento_base?: 'instalacao_concluida' | 'ultima_atividade'
}

export interface ConfiguracaoAcao {
  // Para criar_atividade:
  titulo?: string
  descricao?: string
  tipo_atividade?: string
  // Para enviar_whatsapp:
  mensagem?: string
  // Para enviar_email:
  assunto?: string
  corpo?: string
  // Para mudar_status:
  novo_status?: string
}

export interface Automacao {
  id: string
  nome: string
  gatilho: AutomacaoGatilhoTipo
  configuracao_gatilho: ConfiguracaoGatilho
  acao: AutomacaoAcaoTipo
  configuracao_acao: ConfiguracaoAcao
  destino: AutomacaoDestinoTipo
  cliente_especifico_id?: string
  ativa: boolean
  created: string
  updated: string
  expand?: {
    cliente_especifico_id?: {
      id: string
      nome: string
      telefone?: string
      email?: string
    }
  }
}

export interface AutomacaoExecucao {
  id: string
  automacao: string
  data_execucao: string
  sucesso: boolean
  mensagem: string
  referencia_registro?: string
  cliente?: string
  dados_execucao?: {
    gatilho?: string
    payload?: Record<string, unknown>
    contexto?: Record<string, unknown>
  }
  created: string
  updated: string
  expand?: {
    automacao?: Automacao
    cliente?: {
      id: string
      nome: string
      telefone?: string
      whatsapp?: string
      status?: string
      email?: string
    }
  }
}

export interface SalvarAutomacaoInput {
  nome: string
  gatilho: AutomacaoGatilhoTipo
  configuracao_gatilho: ConfiguracaoGatilho
  acao: AutomacaoAcaoTipo
  configuracao_acao: ConfiguracaoAcao
  destino: AutomacaoDestinoTipo
  cliente_especifico_id?: string
  ativa?: boolean
}
