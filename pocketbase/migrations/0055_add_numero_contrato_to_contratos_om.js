migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contratos_om')

    if (!col.fields.getByName('numero_contrato')) {
      col.fields.add(
        new TextField({
          name: 'numero_contrato',
          required: false,
        }),
      )
    }

    app.save(col)

    // Adiciona índice não-único em numero_contrato para agilizar deduplicação
    col.addIndex('idx_contratos_om_numero_contrato', false, 'numero_contrato', '')
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('contratos_om')
      col.removeIndex('idx_contratos_om_numero_contrato')
      if (col.fields.getByName('numero_contrato')) {
        col.fields.removeByName('numero_contrato')
      }
      app.save(col)
    } catch (_) {}
  },
)
