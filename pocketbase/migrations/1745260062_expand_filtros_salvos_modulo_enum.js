migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('filtros_salvos')
    } catch {
      // Banco vazio ou coleção não criada ainda — no-op seguro
      return
    }

    if (!col) return

    const moduloField = col.fields.getByName('modulo')
    if (moduloField) {
      const currentValues = Array.isArray(moduloField.values) ? moduloField.values : []
      const novosValores = ['clientes', 'negocios', 'atividades', 'contratos_om']

      const mergedValues = [...currentValues]
      for (const val of novosValores) {
        if (!mergedValues.includes(val)) {
          mergedValues.push(val)
        }
      }

      moduloField.values = mergedValues
      if (moduloField.maxSelect < 1) {
        moduloField.maxSelect = 1
      }

      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('filtros_salvos')
      if (!col) return
      const moduloField = col.fields.getByName('modulo')
      if (moduloField) {
        moduloField.values = ['clientes', 'negocios']
        app.save(col)
      }
    } catch {
      // rollback no-op se não existir
    }
  },
)
