migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')

    // Cartão de crédito
    if (!orcCol.fields.getByName('parcelas_cartao')) {
      orcCol.fields.add(new NumberField({ name: 'parcelas_cartao', onlyInt: true }))
    }
    if (!orcCol.fields.getByName('juros_cartao')) {
      orcCol.fields.add(new NumberField({ name: 'juros_cartao' }))
    }

    // Financiamento Banco 1
    if (!orcCol.fields.getByName('parcelas_financiamento_banco1')) {
      orcCol.fields.add(new NumberField({ name: 'parcelas_financiamento_banco1', onlyInt: true }))
    }
    if (!orcCol.fields.getByName('juros_financiamento_banco1')) {
      orcCol.fields.add(new NumberField({ name: 'juros_financiamento_banco1' }))
    }

    // Financiamento Banco 2
    if (!orcCol.fields.getByName('parcelas_financiamento_banco2')) {
      orcCol.fields.add(new NumberField({ name: 'parcelas_financiamento_banco2', onlyInt: true }))
    }
    if (!orcCol.fields.getByName('juros_financiamento_banco2')) {
      orcCol.fields.add(new NumberField({ name: 'juros_financiamento_banco2' }))
    }

    app.save(orcCol)
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    const fieldsToRemove = [
      'parcelas_cartao',
      'juros_cartao',
      'parcelas_financiamento_banco1',
      'juros_financiamento_banco1',
      'parcelas_financiamento_banco2',
      'juros_financiamento_banco2',
    ]

    fieldsToRemove.forEach((fieldName) => {
      if (orcCol.fields.getByName(fieldName)) {
        orcCol.fields.removeByName(fieldName)
      }
    })

    app.save(orcCol)
  },
)
