/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const descricaoField = col.fields.getByName('descricao')
    if (descricaoField) {
      descricaoField.max = 200000
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atividades')
      const descricaoField = col.fields.getByName('descricao')
      if (descricaoField) {
        descricaoField.max = 5000
      }
      app.save(col)
    } catch (_) {}
  },
)
