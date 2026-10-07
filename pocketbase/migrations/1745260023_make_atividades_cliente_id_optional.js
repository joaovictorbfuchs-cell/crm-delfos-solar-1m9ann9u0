migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')

    // Permitir anotações e atividades vinculadas a usina mesmo sem cliente_id direto ou tornando cliente_id opcional
    const clienteField = col.fields.getByName('cliente_id')
    if (clienteField) {
      clienteField.required = false
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atividades')
      const clienteField = col.fields.getByName('cliente_id')
      if (clienteField) {
        clienteField.required = true
      }
      app.save(col)
    } catch (_) {}
  },
)
