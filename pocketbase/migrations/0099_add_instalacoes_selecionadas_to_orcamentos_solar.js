migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')

    if (!orcCol.fields.getByName('instalacoes_selecionadas')) {
      orcCol.fields.add(
        new JSONField({
          name: 'instalacoes_selecionadas',
        }),
      )
    }

    app.save(orcCol)
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')

    if (orcCol.fields.getByName('instalacoes_selecionadas')) {
      orcCol.fields.removeByName('instalacoes_selecionadas')
    }

    app.save(orcCol)
  },
)
