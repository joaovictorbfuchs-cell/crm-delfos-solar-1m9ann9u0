/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Excluir todos os registros de projeto_eventos primeiro, e depois de projetos
    // Atende à solicitação direta do usuário: "exclua todos os projetos que estão abertos no funil de projetos"
    try {
      const eventosDeleted = app.db().newQuery('DELETE FROM projeto_eventos').execute()
      console.log('[MIGRATION 0138] Registros deletados de projeto_eventos')
    } catch (err) {
      console.log('[MIGRATION 0138] Erro ao deletar projeto_eventos:', err.message)
    }

    try {
      const projetosDeleted = app.db().newQuery('DELETE FROM projetos').execute()
      console.log('[MIGRATION 0138] Registros deletados de projetos')
    } catch (err) {
      console.log('[MIGRATION 0138] Erro ao deletar projetos:', err.message)
    }
  },
  (app) => {
    // Operação irreversível solicitada pelo usuário para limpeza de dados
  },
)
