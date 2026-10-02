/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('projetos')
    if (!col.fields.getByName('status')) {
      col.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['ativo', 'finalizado'],
          maxSelect: 1,
        }),
      )
      app.save(col)
    }

    // Inicializar projetos existentes com status 'ativo' se estiverem vazios
    try {
      app
        .db()
        .newQuery("UPDATE projetos SET status = 'ativo' WHERE status IS NULL OR status = ''")
        .execute()
    } catch (e) {
      console.warn('Erro ao atualizar status padrão dos projetos existentes:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('projetos')
      const field = col.fields.getByName('status')
      if (field) {
        col.fields.removeByName('status')
        app.save(col)
      }
    } catch (_) {
      // Ignorar se já removido
    }
  },
)
