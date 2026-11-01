/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('atividades')

    let changed = false

    if (!collection.fields.getByName('tecnicos_ids')) {
      collection.fields.add(
        new Field({
          name: 'tecnicos_ids',
          type: 'json',
          required: false,
        }),
      )
      changed = true
    }

    if (!collection.fields.getByName('tecnicos_nomes')) {
      collection.fields.add(
        new Field({
          name: 'tecnicos_nomes',
          type: 'json',
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
    const collection = app.findCollectionByNameOrId('atividades')
    let changed = false

    const fIds = collection.fields.getByName('tecnicos_ids')
    if (fIds) {
      collection.fields.remove(fIds)
      changed = true
    }

    const fNomes = collection.fields.getByName('tecnicos_nomes')
    if (fNomes) {
      collection.fields.remove(fNomes)
      changed = true
    }

    if (changed) {
      app.save(collection)
    }
  },
)
