migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contatos_adicionais')
    if (!col.fields.getByName('is_principal')) {
      col.fields.add(
        new BoolField({
          name: 'is_principal',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('contatos_adicionais')
    const field = col.fields.getByName('is_principal')
    if (field) {
      col.fields.removeByName('is_principal')
      app.save(col)
    }
  },
)
