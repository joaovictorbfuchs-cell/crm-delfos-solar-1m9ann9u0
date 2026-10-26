import pb from '@/lib/pocketbase/client'
import { WhatsAppTemplateCategoria, WhatsAppTemplateEtapa, WhatsAppTemplate } from '@/types/crm'

/**
 * Serviço de acesso a dados para Categorias e Etapas de Templates de WhatsApp
 * Coleções no PocketBase:
 * - whatsapp_template_categorias
 * - whatsapp_template_etapas
 * - whatsapp_templates
 */

export const whatsappTemplateTaxonomiaService = {
  // -------------------------------------------------------------
  // CATEGORIAS
  // -------------------------------------------------------------
  async listarCategorias(): Promise<WhatsAppTemplateCategoria[]> {
    return await pb
      .collection('whatsapp_template_categorias')
      .getFullList<WhatsAppTemplateCategoria>({
        sort: 'ordem,created',
      })
  },

  async criarCategoria(dados: {
    nome: string
    ordem?: number
    cor?: string
    descricao?: string
    ativo?: boolean
  }): Promise<WhatsAppTemplateCategoria> {
    return await pb.collection('whatsapp_template_categorias').create<WhatsAppTemplateCategoria>({
      nome: dados.nome.trim(),
      ordem: dados.ordem ?? 999,
      cor: dados.cor || 'emerald',
      descricao: dados.descricao?.trim() || '',
      ativo: dados.ativo ?? true,
    })
  },

  async atualizarCategoria(
    id: string,
    dados: Partial<{
      nome: string
      ordem: number
      cor: string
      descricao: string
      ativo: boolean
    }>,
  ): Promise<WhatsAppTemplateCategoria> {
    return await pb
      .collection('whatsapp_template_categorias')
      .update<WhatsAppTemplateCategoria>(id, dados)
  },

  /**
   * Renomeia categoria e propaga em cascata para todos os templates de WhatsApp que a utilizam
   */
  async renomearCategoriaCascata(
    id: string,
    novoNome: string,
    nomeAntigo: string,
  ): Promise<{ categoria: WhatsAppTemplateCategoria; templatesAtualizados: number }> {
    const nomeLimpo = novoNome.trim()
    if (!nomeLimpo) {
      throw new Error('O nome da categoria não pode ficar vazio.')
    }

    // 1. Atualizar registro da categoria
    const categoria = await pb
      .collection('whatsapp_template_categorias')
      .update<WhatsAppTemplateCategoria>(id, {
        nome: nomeLimpo,
      })

    // 2. Cascata para templates com a categoria anterior
    let templatesAtualizados = 0
    if (nomeAntigo && nomeAntigo !== nomeLimpo) {
      try {
        const templates = await pb.collection('whatsapp_templates').getFullList<WhatsAppTemplate>({
          filter: `categoria = "${nomeAntigo}"`,
        })
        for (const tpl of templates) {
          await pb.collection('whatsapp_templates').update(tpl.id, {
            categoria: nomeLimpo,
          })
          templatesAtualizados++
        }
      } catch (err) {
        console.error('Erro na cascata de renomeação de categoria:', err)
      }
    }

    return { categoria, templatesAtualizados }
  },

  /**
   * Reordena uma lista de categorias persistindo o campo 'ordem'
   */
  async reordenarCategorias(
    categoriasOrdenadas: Array<{ id: string; ordem: number }>,
  ): Promise<void> {
    for (const item of categoriasOrdenadas) {
      try {
        await pb.collection('whatsapp_template_categorias').update(item.id, {
          ordem: item.ordem,
        })
      } catch (err) {
        console.error(`Erro ao reordenar categoria ${item.id}:`, err)
      }
    }
  },

  /**
   * Conta quantos templates utilizam a categoria pelo nome
   */
  async contarTemplatesPorCategoria(nomeCategoria: string): Promise<number> {
    try {
      const templates = await pb.collection('whatsapp_templates').getList(1, 1, {
        filter: `categoria = "${nomeCategoria}"`,
      })
      return templates.totalItems
    } catch (_) {
      return 0
    }
  },

  /**
   * Exclui categoria com proteção: se houver templates vinculados, exige destino para migração.
   */
  async excluirCategoria(
    id: string,
    nomeCategoria: string,
    migrarParaNome?: string,
  ): Promise<{ templatesMigrados: number }> {
    let templatesMigrados = 0

    // Se houver destino fornecido, mover os modelos antes de excluir
    if (migrarParaNome && migrarParaNome !== nomeCategoria) {
      const templates = await pb.collection('whatsapp_templates').getFullList<WhatsAppTemplate>({
        filter: `categoria = "${nomeCategoria}"`,
      })
      for (const tpl of templates) {
        await pb.collection('whatsapp_templates').update(tpl.id, {
          categoria: migrarParaNome,
        })
        templatesMigrados++
      }
    } else {
      // Sem destino: verificar se algum modelo usa. Se sim, rejeitar
      const totalUso = await this.contarTemplatesPorCategoria(nomeCategoria)
      if (totalUso > 0) {
        throw new Error(
          `Não é possível excluir: existem ${totalUso} modelo(s) usando a categoria "${nomeCategoria}". Escolha uma categoria de destino para mover os modelos.`,
        )
      }
    }

    // Excluir a categoria no banco
    await pb.collection('whatsapp_template_categorias').delete(id)
    return { templatesMigrados }
  },

  // -------------------------------------------------------------
  // ETAPAS
  // -------------------------------------------------------------
  async listarEtapas(): Promise<WhatsAppTemplateEtapa[]> {
    return await pb.collection('whatsapp_template_etapas').getFullList<WhatsAppTemplateEtapa>({
      sort: 'ordem,created',
    })
  },

  async criarEtapa(dados: {
    nome: string
    ordem?: number
    cor?: string
    descricao?: string
    ativo?: boolean
  }): Promise<WhatsAppTemplateEtapa> {
    return await pb.collection('whatsapp_template_etapas').create<WhatsAppTemplateEtapa>({
      nome: dados.nome.trim(),
      ordem: dados.ordem ?? 999,
      cor: dados.cor || '',
      descricao: dados.descricao?.trim() || '',
      ativo: dados.ativo ?? true,
    })
  },

  async atualizarEtapa(
    id: string,
    dados: Partial<{
      nome: string
      ordem: number
      cor: string
      descricao: string
      ativo: boolean
    }>,
  ): Promise<WhatsAppTemplateEtapa> {
    return await pb.collection('whatsapp_template_etapas').update<WhatsAppTemplateEtapa>(id, dados)
  },

  /**
   * Renomeia etapa e propaga em cascata para todos os templates de WhatsApp que a utilizam
   */
  async renomearEtapaCascata(
    id: string,
    novoNome: string,
    nomeAntigo: string,
  ): Promise<{ etapa: WhatsAppTemplateEtapa; templatesAtualizados: number }> {
    const nomeLimpo = novoNome.trim()
    if (!nomeLimpo) {
      throw new Error('O nome da etapa não pode ficar vazio.')
    }

    // 1. Atualizar registro da etapa
    const etapa = await pb
      .collection('whatsapp_template_etapas')
      .update<WhatsAppTemplateEtapa>(id, {
        nome: nomeLimpo,
      })

    // 2. Cascata para templates com a etapa anterior
    let templatesAtualizados = 0
    if (nomeAntigo && nomeAntigo !== nomeLimpo) {
      try {
        const templates = await pb.collection('whatsapp_templates').getFullList<WhatsAppTemplate>({
          filter: `etapa = "${nomeAntigo}"`,
        })
        for (const tpl of templates) {
          await pb.collection('whatsapp_templates').update(tpl.id, {
            etapa: nomeLimpo,
          })
          templatesAtualizados++
        }
      } catch (err) {
        console.error('Erro na cascata de renomeação de etapa:', err)
      }
    }

    return { etapa, templatesAtualizados }
  },

  /**
   * Reordena uma lista de etapas persistindo o campo 'ordem'
   */
  async reordenarEtapas(etapasOrdenadas: Array<{ id: string; ordem: number }>): Promise<void> {
    for (const item of etapasOrdenadas) {
      try {
        await pb.collection('whatsapp_template_etapas').update(item.id, {
          ordem: item.ordem,
        })
      } catch (err) {
        console.error(`Erro ao reordenar etapa ${item.id}:`, err)
      }
    }
  },

  /**
   * Conta quantos templates utilizam a etapa pelo nome
   */
  async contarTemplatesPorEtapa(nomeEtapa: string): Promise<number> {
    try {
      const templates = await pb.collection('whatsapp_templates').getList(1, 1, {
        filter: `etapa = "${nomeEtapa}"`,
      })
      return templates.totalItems
    } catch (_) {
      return 0
    }
  },

  /**
   * Exclui etapa com proteção: se houver templates vinculados, exige destino para migração.
   */
  async excluirEtapa(
    id: string,
    nomeEtapa: string,
    migrarParaNome?: string,
  ): Promise<{ templatesMigrados: number }> {
    let templatesMigrados = 0

    // Se houver destino fornecido, mover os modelos antes de excluir
    if (migrarParaNome && migrarParaNome !== nomeEtapa) {
      const templates = await pb.collection('whatsapp_templates').getFullList<WhatsAppTemplate>({
        filter: `etapa = "${nomeEtapa}"`,
      })
      for (const tpl of templates) {
        await pb.collection('whatsapp_templates').update(tpl.id, {
          etapa: migrarParaNome,
        })
        templatesMigrados++
      }
    } else {
      // Sem destino: verificar se algum modelo usa. Se sim, rejeitar
      const totalUso = await this.contarTemplatesPorEtapa(nomeEtapa)
      if (totalUso > 0) {
        throw new Error(
          `Não é possível excluir: existem ${totalUso} modelo(s) usando a etapa "${nomeEtapa}". Escolha uma etapa de destino para mover os modelos.`,
        )
      }
    }

    // Excluir a etapa no banco
    await pb.collection('whatsapp_template_etapas').delete(id)
    return { templatesMigrados }
  },
}
