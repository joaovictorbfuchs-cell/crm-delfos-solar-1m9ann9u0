migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    if (!orcCol.fields.getByName('desconto')) {
      orcCol.fields.add(new NumberField({ name: 'desconto' }))
    }
    app.save(orcCol)
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    if (orcCol.fields.getByName('desconto')) {
      orcCol.fields.removeByName('desconto')
    }
    app.save(orcCol)
  },
)
