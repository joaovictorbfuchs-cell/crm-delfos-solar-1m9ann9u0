migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')

    if (!col.fields.getByName('layout_telhado')) {
      col.fields.add(
        new FileField({
          name: 'layout_telhado',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/png', 'image/jpeg'],
        }),
      )
    }

    if (!col.fields.getByName('layout_telhado_habilitado')) {
      col.fields.add(
        new BoolField({
          name: 'layout_telhado_habilitado',
        }),
      )
    }

    app.save(col)

    // Set default layout_telhado_habilitado = 1 for existing records
    try {
      app
        .db()
        .newQuery(
          'UPDATE orcamentos_solar SET layout_telhado_habilitado = 1 WHERE layout_telhado_habilitado IS NULL',
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    if (col.fields.getByName('layout_telhado')) {
      col.fields.removeByName('layout_telhado')
    }
    if (col.fields.getByName('layout_telhado_habilitado')) {
      col.fields.removeByName('layout_telhado_habilitado')
    }
    app.save(col)
  },
)
