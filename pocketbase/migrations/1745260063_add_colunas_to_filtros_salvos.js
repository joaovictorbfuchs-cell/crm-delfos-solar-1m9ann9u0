migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('filtros_salvos')
    } catch {
      return
    }

    if (!col) return

    // Adiciona o campo colunas (json opcional) caso ainda não exista
    const existing = col.fields.getByName('colunas')
    if (!existing) {
      col.fields.add(
        new JSONField({
          name: 'colunas',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('filtros_salvos')
      if (!col) return
      const field = col.fields.getByName('colunas')
      if (field) {
        col.fields.remove(field)
        app.save(col)
      }
    } catch {
      // rollback no-op
    }
  },
)
