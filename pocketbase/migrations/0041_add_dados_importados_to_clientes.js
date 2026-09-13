/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    if (!clientes.fields.getByName('dados_importados')) {
      clientes.fields.add(
        new JSONField({
          name: 'dados_importados',
          required: false,
        }),
      )
      app.save(clientes)
    }
  },
  (app) => {
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      if (clientes.fields.getByName('dados_importados')) {
        clientes.fields.removeByName('dados_importados')
        app.save(clientes)
      }
    } catch (_) {}
  },
)
