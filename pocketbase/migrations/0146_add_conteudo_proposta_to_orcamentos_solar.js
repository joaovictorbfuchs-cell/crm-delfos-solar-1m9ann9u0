migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    if (!col.fields.getByName('conteudo_proposta')) {
      col.fields.add(
        new JSONField({
          name: 'conteudo_proposta',
          maxSize: 1048576, // 1MB
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('orcamentos_solar')
      if (col.fields.getByName('conteudo_proposta')) {
        col.fields.removeByName('conteudo_proposta')
        app.save(col)
      }
    } catch (_) {}
  },
)
