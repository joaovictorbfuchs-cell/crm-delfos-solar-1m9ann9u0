/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    if (!col.fields.getByName('retornos_rge')) {
      col.fields.add(
        new JSONField({
          name: 'retornos_rge',
          maxSize: 2000000,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atividades')
      const field = col.fields.getByName('retornos_rge')
      if (field) {
        col.fields.removeByName('retornos_rge')
        app.save(col)
      }
    } catch (_) {}
  },
)
