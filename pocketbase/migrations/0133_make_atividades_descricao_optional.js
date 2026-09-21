migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const descricaoField = col.fields.getByName('descricao')
    if (descricaoField) {
      descricaoField.required = false
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atividades')
      const descricaoField = col.fields.getByName('descricao')
      if (descricaoField) {
        descricaoField.required = true
      }
      app.save(col)
    } catch (_) {}
  },
)
