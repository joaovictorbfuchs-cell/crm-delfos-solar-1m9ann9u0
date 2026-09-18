migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')

    // Campo numérico fio_b (tarifa Fio B R$/kWh, padrão 0.2239)
    if (!col.fields.getByName('fio_b')) {
      col.fields.add(
        new NumberField({
          name: 'fio_b',
          required: false,
        }),
      )
    }

    // Campo numérico fator_simultaneidade (ex: 0.3 ou 0.7)
    if (!col.fields.getByName('fator_simultaneidade')) {
      col.fields.add(
        new NumberField({
          name: 'fator_simultaneidade',
          required: false,
        }),
      )
    }

    // Campo numérico gd_eco_liquida (R$/kWh creditado)
    if (!col.fields.getByName('gd_eco_liquida')) {
      col.fields.add(
        new NumberField({
          name: 'gd_eco_liquida',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')

    if (col.fields.getByName('fio_b')) {
      col.fields.removeByName('fio_b')
    }
    if (col.fields.getByName('fator_simultaneidade')) {
      col.fields.removeByName('fator_simultaneidade')
    }
    if (col.fields.getByName('gd_eco_liquida')) {
      col.fields.removeByName('gd_eco_liquida')
    }

    app.save(col)
  },
)
