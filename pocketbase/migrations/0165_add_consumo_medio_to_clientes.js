migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    if (!clientes.fields.getByName('consumo_medio')) {
      clientes.fields.add(
        new NumberField({
          name: 'consumo_medio',
          min: 0,
          required: false,
        }),
      )
    }

    app.save(clientes)

    // Também adiciona na collection usinas se couber
    try {
      const usinas = app.findCollectionByNameOrId('usinas')
      if (!usinas.fields.getByName('consumo_medio')) {
        usinas.fields.add(
          new NumberField({
            name: 'consumo_medio',
            min: 0,
            required: false,
          }),
        )
      }
      app.save(usinas)
    } catch (_) {}
  },
  (app) => {
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      if (clientes.fields.getByName('consumo_medio')) {
        clientes.fields.removeByName('consumo_medio')
      }
      app.save(clientes)
    } catch (_) {}

    try {
      const usinas = app.findCollectionByNameOrId('usinas')
      if (usinas.fields.getByName('consumo_medio')) {
        usinas.fields.removeByName('consumo_medio')
      }
      app.save(usinas)
    } catch (_) {}
  },
)
