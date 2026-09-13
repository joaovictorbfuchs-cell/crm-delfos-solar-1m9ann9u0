migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    const statusField = col.fields.getByName('status')

    const newValues = [
      'Novo Lead',
      'Levantamento',
      'Orçamento',
      'Negociação',
      'Fechado',
      'Contato Futuro',
      'Perdido',
    ]

    if (statusField) {
      statusField.values = newValues
      statusField.maxSelect = 1
    } else {
      col.fields.add(
        new SelectField({
          name: 'status',
          values: newValues,
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    const statusField = col.fields.getByName('status')

    const oldValues = [
      'Novo Lead',
      'Levantamento',
      'Orçamento',
      'Negociação',
      'Fechado',
      'Contato Futuro',
    ]

    if (statusField) {
      statusField.values = oldValues
      statusField.maxSelect = 1
      app.save(col)
    }
  },
)
