/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('knowledge_articles')
    const textoExtraidoField = col.fields.getByName('texto_extraido')
    if (textoExtraidoField) {
      textoExtraidoField.max = 200000
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('knowledge_articles')
      const textoExtraidoField = col.fields.getByName('texto_extraido')
      if (textoExtraidoField) {
        textoExtraidoField.max = 5000
      }
      app.save(col)
    } catch (_) {}
  },
)
