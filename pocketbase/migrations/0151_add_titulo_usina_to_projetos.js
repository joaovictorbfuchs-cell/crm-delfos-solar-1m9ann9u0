/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('projetos')
    if (!col.fields.getByName('titulo_usina')) {
      col.fields.add(
        new TextField({
          name: 'titulo_usina',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('projetos')
      const field = col.fields.getByName('titulo_usina')
      if (field) {
        col.fields.removeByName('titulo_usina')
        app.save(col)
      }
    } catch (_) {
      // Ignorar se campo já não existir
    }
  },
)
