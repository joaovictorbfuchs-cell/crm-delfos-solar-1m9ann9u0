migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    if (!col.fields.getByName('tipo_negocio')) {
      col.fields.add(
        new TextField({
          name: 'tipo_negocio',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    const field = col.fields.getByName('tipo_negocio')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)
