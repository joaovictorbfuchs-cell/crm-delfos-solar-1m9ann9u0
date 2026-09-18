migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')

    // Flags booleanas para modo manual (false = auto, true = manual)
    if (!col.fields.getByName('manual_administracao')) {
      col.fields.add(new BoolField({ name: 'manual_administracao' }))
    }
    if (!col.fields.getByName('manual_comissao')) {
      col.fields.add(new BoolField({ name: 'manual_comissao' }))
    }
    if (!col.fields.getByName('manual_indicacao')) {
      col.fields.add(new BoolField({ name: 'manual_indicacao' }))
    }

    // Valores manuais digitados em R$ (quando em modo manual)
    if (!col.fields.getByName('valor_manual_administracao')) {
      col.fields.add(new NumberField({ name: 'valor_manual_administracao' }))
    }
    if (!col.fields.getByName('valor_manual_comissao')) {
      col.fields.add(new NumberField({ name: 'valor_manual_comissao' }))
    }
    if (!col.fields.getByName('valor_manual_indicacao')) {
      col.fields.add(new NumberField({ name: 'valor_manual_indicacao' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')

    const fieldsToRemove = [
      'manual_administracao',
      'manual_comissao',
      'manual_indicacao',
      'valor_manual_administracao',
      'valor_manual_comissao',
      'valor_manual_indicacao',
    ]

    for (const fieldName of fieldsToRemove) {
      if (col.fields.getByName(fieldName)) {
        col.fields.removeByName(fieldName)
      }
    }

    app.save(col)
  },
)
