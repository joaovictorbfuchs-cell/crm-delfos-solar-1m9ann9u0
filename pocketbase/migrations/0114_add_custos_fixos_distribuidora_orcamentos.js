migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')

    // 1. Disponibilidade mínima em kWh (30 mono, 50 bi, 100 tri)
    if (!orcCol.fields.getByName('disponibilidade_minima_kwh')) {
      orcCol.fields.add(
        new NumberField({
          name: 'disponibilidade_minima_kwh',
          min: 0,
        }),
      )
    }

    // 2. Iluminação pública em R$/mês
    if (!orcCol.fields.getByName('iluminacao_publica')) {
      orcCol.fields.add(
        new NumberField({
          name: 'iluminacao_publica',
          min: 0,
        }),
      )
    }

    // 3. Contribuição de Iluminação Pública (CIP) em R$/mês
    if (!orcCol.fields.getByName('cip')) {
      orcCol.fields.add(
        new NumberField({
          name: 'cip',
          min: 0,
        }),
      )
    }

    app.save(orcCol)
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    if (orcCol.fields.getByName('disponibilidade_minima_kwh')) {
      orcCol.fields.removeByName('disponibilidade_minima_kwh')
    }
    if (orcCol.fields.getByName('iluminacao_publica')) {
      orcCol.fields.removeByName('iluminacao_publica')
    }
    if (orcCol.fields.getByName('cip')) {
      orcCol.fields.removeByName('cip')
    }
    app.save(orcCol)
  },
)
