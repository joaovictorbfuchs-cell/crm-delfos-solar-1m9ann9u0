migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('knowledge_articles')
      const existingField = col.fields.getByName('embedding')
      if (!existingField) {
        col.fields.add(
          new JSONField({
            name: 'embedding',
            required: false,
          }),
        )
        app.save(col)
      }
    } catch (err) {
      console.log('[MIGRATION] Erro ao adicionar campo embedding a knowledge_articles:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('knowledge_articles')
      col.fields.removeByName('embedding')
      app.save(col)
    } catch (_) {}
  },
)
