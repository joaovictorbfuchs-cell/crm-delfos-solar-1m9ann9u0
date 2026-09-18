migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')

    if (!col.fields.getByName('iof_financiamento_banco1')) {
      col.fields.add(
        new NumberField({
          name: 'iof_financiamento_banco1',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('iof_financiamento_banco2')) {
      col.fields.add(
        new NumberField({
          name: 'iof_financiamento_banco2',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')

    const fieldsToRemove = ['iof_financiamento_banco1', 'iof_financiamento_banco2']

    fieldsToRemove.forEach((fieldName) => {
      if (col.fields.getByName(fieldName)) {
        col.fields.removeByName(fieldName)
      }
    })

    app.save(col)
  },
)
