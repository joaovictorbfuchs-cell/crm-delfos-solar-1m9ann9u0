migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')

    // Campo numérico percentual_indicacao_auto (fração ou percentual, ex.: 0 = 0%, 0.01 = 1%, padrão 0)
    if (!col.fields.getByName('percentual_indicacao_auto')) {
      col.fields.add(
        new NumberField({
          name: 'percentual_indicacao_auto',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')

    if (col.fields.getByName('percentual_indicacao_auto')) {
      col.fields.removeByName('percentual_indicacao_auto')
    }

    app.save(col)
  },
)
