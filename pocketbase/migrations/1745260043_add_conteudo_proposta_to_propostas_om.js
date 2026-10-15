migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('propostas_om')
    collection.fields.add(
      new JSONField({
        name: 'conteudo_proposta',
        required: false,
      }),
    )
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('propostas_om')
    collection.fields.removeByName('conteudo_proposta')
    app.save(collection)
  },
)
