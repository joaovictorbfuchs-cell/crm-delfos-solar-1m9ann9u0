import pb from '@/lib/pocketbase/client'
import type { NotificacaoInterna } from '@/types/crm'

export const notificacoesService = {
  /**
   * Lista todas as notificações internas ativas (não resolvidas) ou recentes
   */
  async listar(limit = 100): Promise<NotificacaoInterna[]> {
    try {
      const records = await pb
        .collection('notificacoes_internas')
        .getList<NotificacaoInterna>(1, limit, {
          sort: '-created',
          expand: 'cliente_id,atividade_id',
        })
      return records.items
    } catch (err) {
      console.warn('Erro ao listar notificações internas:', err)
      return []
    }
  },

  /**
   * Dispara a sincronização/varredura de atividades atrasadas no backend
   */
  async sincronizar(): Promise<{
    ok: boolean
    criadas?: number
    atualizadas?: number
    resolvidas?: number
    totalAtrasadas?: number
  }> {
    try {
      const res = await pb.send<{
        ok: boolean
        criadas?: number
        atualizadas?: number
        resolvidas?: number
        totalAtrasadas?: number
      }>('/backend/v1/notificacoes/sync', { method: 'POST' })
      return res
    } catch (err) {
      console.warn('Falha na chamada da rota de sincronização:', err)
      return { ok: false }
    }
  },

  /**
   * Marca uma notificação como lida
   */
  async marcarComoLida(id: string): Promise<boolean> {
    try {
      await pb.collection('notificacoes_internas').update(id, {
        lida: true,
        lida_em: new Date().toISOString(),
      })
      return true
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err)
      return false
    }
  },

  /**
   * Marca todas as notificações não lidas como lidas
   */
  async marcarTodasComoLidas(): Promise<boolean> {
    try {
      const naoLidas = await pb
        .collection('notificacoes_internas')
        .getFullList<NotificacaoInterna>({
          filter: 'lida = false',
        })

      const now = new Date().toISOString()
      await Promise.all(
        naoLidas.map((item) =>
          pb.collection('notificacoes_internas').update(item.id, {
            lida: true,
            lida_em: now,
          }),
        ),
      )
      return true
    } catch (err) {
      console.error('Erro ao marcar todas as notificações como lidas:', err)
      return false
    }
  },

  /**
   * Resolve uma notificação associada a uma atividade
   */
  async resolverPorAtividade(atividadeId: string): Promise<boolean> {
    try {
      const items = await pb.collection('notificacoes_internas').getFullList<NotificacaoInterna>({
        filter: `atividade_id = "${atividadeId}" && status = "ativa"`,
      })

      const now = new Date().toISOString()
      await Promise.all(
        items.map((item) =>
          pb.collection('notificacoes_internas').update(item.id, {
            status: 'resolvida',
            resolvida_em: now,
          }),
        ),
      )
      return true
    } catch (err) {
      console.error('Erro ao resolver notificação por atividade:', err)
      return false
    }
  },
}
