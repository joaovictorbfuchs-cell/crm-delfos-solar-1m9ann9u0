/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('documentos_cliente')
    collection.fields.add(
      new JSONField({
        name: 'dados_documento',
        required: false,
      }),
    )
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('documentos_cliente')
    collection.fields.removeByName('dados_documento')
    app.save(collection)
  },
)
