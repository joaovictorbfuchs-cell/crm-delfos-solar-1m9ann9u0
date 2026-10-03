migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('clientes')
    let changed = false

    if (!collection.fields.getByName('latitude')) {
      collection.fields.add(
        new NumberField({
          name: 'latitude',
          required: false,
        }),
      )
      changed = true
    }

    if (!collection.fields.getByName('longitude')) {
      collection.fields.add(
        new NumberField({
          name: 'longitude',
          required: false,
        }),
      )
      changed = true
    }

    if (changed) {
      app.save(collection)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('clientes')
    let changed = false

    const latField = collection.fields.getByName('latitude')
    if (latField) {
      collection.fields.removeByName('latitude')
      changed = true
    }

    const lngField = collection.fields.getByName('longitude')
    if (lngField) {
      collection.fields.removeByName('longitude')
      changed = true
    }

    if (changed) {
      app.save(collection)
    }
  },
)
