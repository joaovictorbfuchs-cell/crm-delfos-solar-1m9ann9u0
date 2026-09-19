import pb from '@/lib/pocketbase/client'
import { Automacao, AutomacaoExecucao, SalvarAutomacaoInput } from '@/types/automacoes'

/**
 * Busca todas as automações cadastradas, ordenadas por data de criação desc
 */
export async function fetchAutomacoes(): Promise<Automacao[]> {
  try {
    const records = await pb.collection('automacoes').getFullList<Automacao>({
      sort: '-created',
      expand: 'cliente_especifico_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar automações:', err)
    throw err
  }
}

/**
 * Cria uma nova automação
 */
export async function createAutomacao(data: SalvarAutomacaoInput): Promise<Automacao> {
  try {
    const record = await pb.collection('automacoes').create<Automacao>({
      ...data,
      ativa: data.ativa ?? true,
    })
    return record
  } catch (err) {
    console.error('Erro ao criar automação:', err)
    throw err
  }
}

/**
 * Atualiza uma automação existente
 */
export async function updateAutomacao(
  id: string,
  data: Partial<SalvarAutomacaoInput>,
): Promise<Automacao> {
  try {
    const record = await pb.collection('automacoes').update<Automacao>(id, data)
    return record
  } catch (err) {
    console.error('Erro ao atualizar automação:', err)
    throw err
  }
}

/**
 * Alterna status ativo/pausado de uma automação
 */
export async function toggleAtivaAutomacao(id: string, ativa: boolean): Promise<Automacao> {
  return updateAutomacao(id, { ativa })
}

/**
 * Exclui uma automação
 */
export async function deleteAutomacao(id: string): Promise<boolean> {
  try {
    await pb.collection('automacoes').delete(id)
    return true
  } catch (err) {
    console.error('Erro ao excluir automação:', err)
    throw err
  }
}

/**
 * Busca histórico de execuções de uma automação específica ou de todas
 */
export async function fetchAutomacoesExecucoes(
  automacaoId?: string,
  page = 1,
  perPage = 20,
): Promise<{ items: AutomacaoExecucao[]; totalItems: number; totalPages: number }> {
  try {
    const filter = automacaoId ? `automacao = "${automacaoId}"` : ''
    const result = await pb
      .collection('automacoes_execucoes')
      .getList<AutomacaoExecucao>(page, perPage, {
        filter,
        sort: '-data_execucao',
        expand: 'automacao,cliente',
      })
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    }
  } catch (err) {
    console.error('Erro ao buscar histórico de execuções:', err)
    return { items: [], totalItems: 0, totalPages: 0 }
  }
}

/**
 * Dispara execução manual ou de teste de uma automação via endpoint do backend
 */
export async function runAutomacaoManual(
  automacaoId: string,
  clienteId?: string,
  force = true,
): Promise<{ ok: boolean; sucesso?: boolean; mensagem?: string; skipped?: boolean }> {
  try {
    const res = await pb.send('/backend/v1/automacoes/run', {
      method: 'POST',
      body: {
        automacao_id: automacaoId,
        cliente_id: clienteId,
        force,
      },
    })
    return res as { ok: boolean; sucesso?: boolean; mensagem?: string; skipped?: boolean }
  } catch (err) {
    console.error('Erro ao executar automação manualmente:', err)
    throw err
  }
}

/**
 * Helpers para labels amigáveis de Gatilhos e Ações
 */
export function getGatilhoDescricaoFormatada(automacao: Automacao): string {
  const g = automacao.gatilho
  const cfg = automacao.configuracao_gatilho || {}

  switch (g) {
    case 'status_mudou':
      return `Quando o status do cliente mudar para "${cfg.status_alvo || 'qualquer status'}"`
    case 'instalacao_concluida':
      return 'Quando uma instalação for concluída'
    case 'atividade_concluida':
      return cfg.tipo_atividade
        ? `Quando uma atividade do tipo "${cfg.tipo_atividade}" for concluída`
        : 'Quando qualquer atividade for concluída'
    case 'data_especifica':
      return `Todo dia ${cfg.dia_mes || 1} do mês`
    case 'dias_apos_evento': {
      const dias = cfg.dias ?? 7
      const evento =
        cfg.evento_base === 'ultima_atividade'
          ? 'última atividade do cliente'
          : 'instalação concluída'
      return `${dias} ${dias === 1 ? 'dia' : 'dias'} após ${evento}`
    }
    default:
      return g
  }
}

export function getAcaoDescricaoFormatada(automacao: Automacao): string {
  const a = automacao.acao
  const cfg = automacao.configuracao_acao || {}

  switch (a) {
    case 'criar_atividade':
      return `Criar atividade "${cfg.titulo || 'Nova atividade'}"`
    case 'enviar_whatsapp':
      return 'Enviar mensagem no WhatsApp'
    case 'enviar_email':
      return `Enviar e-mail: "${cfg.assunto || 'Contato'}"`
    case 'mudar_status':
      return `Mudar status do cliente para "${cfg.novo_status || 'Novo status'}"`
    default:
      return a
  }
}

export function getDestinoDescricaoFormatada(automacao: Automacao): string {
  const d = automacao.destino
  switch (d) {
    case 'cliente_evento':
      return 'Cliente vinculado ao evento'
    case 'responsavel_empresa':
      return 'Responsável da empresa (atendente)'
    case 'cliente_especifico':
      return automacao.expand?.cliente_especifico_id?.nome
        ? `Cliente específico: ${automacao.expand.cliente_especifico_id.nome}`
        : 'Cliente específico selecionado'
    default:
      return d
  }
}

/**
 * Função pura para interpolação de variáveis simples: {{cliente_nome}}, {{empresa_nome}}
 */
export function formatarTextoTemplate(
  template: string,
  variaveis: { cliente_nome?: string; empresa_nome?: string },
): string {
  if (!template) return ''
  const clienteNome = variaveis.cliente_nome || 'Cliente'
  const empresaNome = variaveis.empresa_nome || 'Delfos Solar'

  return template
    .replace(/\{\{cliente_nome\}\}/g, clienteNome)
    .replace(/\{\{nome_cliente\}\}/g, clienteNome)
    .replace(/\{\{empresa_nome\}\}/g, empresaNome)
}
