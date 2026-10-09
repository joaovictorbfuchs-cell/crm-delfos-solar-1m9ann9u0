migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('usinas')

    if (!collection.fields.getByName('beneficiarias')) {
      collection.fields.add(
        new JSONField({
          name: 'beneficiarias',
          required: false,
        }),
      )
      app.save(collection)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('usinas')
    const field = collection.fields.getByName('beneficiarias')
    if (field) {
      collection.fields.removeByName('beneficiarias')
      app.save(collection)
    }
  },
)
