/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('whatsapp_mensagens')
    if (!collection) return

    let changed = false

    // Campo autor (texto descritivo do usuário que enviou a mensagem, ex: 'Daniel Rotava')
    if (!collection.fields.getByName('autor')) {
      collection.fields.add(
        new TextField({
          name: 'autor',
          required: false,
        }),
      )
      changed = true
    }

    // Campo autor_id (relação com users)
    if (!collection.fields.getByName('autor_id')) {
      const usersCol = app.findCollectionByNameOrId('users')
      if (usersCol) {
        collection.fields.add(
          new RelationField({
            name: 'autor_id',
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
            required: false,
          }),
        )
        changed = true
      }
    }

    if (changed) {
      app.save(collection)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('whatsapp_mensagens')
    if (!collection) return

    let changed = false
    if (collection.fields.getByName('autor')) {
      collection.fields.removeByName('autor')
      changed = true
    }
    if (collection.fields.getByName('autor_id')) {
      collection.fields.removeByName('autor_id')
      changed = true
    }
    if (changed) {
      app.save(collection)
    }
  },
)
