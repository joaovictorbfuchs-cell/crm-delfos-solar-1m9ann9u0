migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('usinas')

    if (!collection.fields.getByName('portal_login')) {
      collection.fields.add(
        new TextField({
          name: 'portal_login',
          required: false,
        }),
      )
    }

    if (!collection.fields.getByName('portal_senha')) {
      collection.fields.add(
        new TextField({
          name: 'portal_senha',
          required: false,
        }),
      )
    }

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('usinas')
    const fLogin = collection.fields.getByName('portal_login')
    if (fLogin) {
      collection.fields.removeByName('portal_login')
    }
    const fSenha = collection.fields.getByName('portal_senha')
    if (fSenha) {
      collection.fields.removeByName('portal_senha')
    }
    app.save(collection)
  },
)
