migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')

    // Geração simulada anual digitada manualmente pelo usuário (kWh/ano)
    if (!orcCol.fields.getByName('geracao_simulada_kwh_ano')) {
      orcCol.fields.add(new NumberField({ name: 'geracao_simulada_kwh_ano' }))
    }

    app.save(orcCol)
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    if (orcCol.fields.getByName('geracao_simulada_kwh_ano')) {
      orcCol.fields.removeByName('geracao_simulada_kwh_ano')
    }
    app.save(orcCol)
  },
)
