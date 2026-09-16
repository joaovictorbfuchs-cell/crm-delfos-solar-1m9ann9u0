migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')

    // Geração pretendida anual informada pelo usuário (kWh/ano)
    if (!orcCol.fields.getByName('geracao_pretendida_kwh_ano')) {
      orcCol.fields.add(new NumberField({ name: 'geracao_pretendida_kwh_ano' }))
    }

    app.save(orcCol)
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    if (orcCol.fields.getByName('geracao_pretendida_kwh_ano')) {
      orcCol.fields.removeByName('geracao_pretendida_kwh_ano')
    }
    app.save(orcCol)
  },
)
