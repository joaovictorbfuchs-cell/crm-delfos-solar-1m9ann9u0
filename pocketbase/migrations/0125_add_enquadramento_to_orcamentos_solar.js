migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    if (!col.fields.getByName('enquadramento')) {
      col.fields.add(
        new SelectField({
          name: 'enquadramento',
          values: ['GD_I', 'GD_II'],
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    const field = col.fields.getByName('enquadramento')
    if (field) {
      col.fields.removeByName('enquadramento')
      app.save(col)
    }
  },
)
