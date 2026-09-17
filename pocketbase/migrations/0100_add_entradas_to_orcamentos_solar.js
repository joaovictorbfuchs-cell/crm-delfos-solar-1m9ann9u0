migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')

    // Entrada Cartão de Crédito
    if (!orcCol.fields.getByName('entrada_cartao')) {
      orcCol.fields.add(new NumberField({ name: 'entrada_cartao' }))
    }

    // Entrada Financiamento Banco 1
    if (!orcCol.fields.getByName('entrada_financiamento_banco1')) {
      orcCol.fields.add(new NumberField({ name: 'entrada_financiamento_banco1' }))
    }

    // Entrada Financiamento Banco 2
    if (!orcCol.fields.getByName('entrada_financiamento_banco2')) {
      orcCol.fields.add(new NumberField({ name: 'entrada_financiamento_banco2' }))
    }

    app.save(orcCol)
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    const fieldsToRemove = [
      'entrada_cartao',
      'entrada_financiamento_banco1',
      'entrada_financiamento_banco2',
    ]

    fieldsToRemove.forEach((fieldName) => {
      if (orcCol.fields.getByName(fieldName)) {
        orcCol.fields.removeByName(fieldName)
      }
    })

    app.save(orcCol)
  },
)
