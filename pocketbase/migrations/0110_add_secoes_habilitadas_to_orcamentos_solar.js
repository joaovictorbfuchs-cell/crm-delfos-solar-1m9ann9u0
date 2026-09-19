migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    if (!col.fields.getByName('secoes_habilitadas')) {
      col.fields.add(
        new JSONField({
          name: 'secoes_habilitadas',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    const field = col.fields.getByName('secoes_habilitadas')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)
