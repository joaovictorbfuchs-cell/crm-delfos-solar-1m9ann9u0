migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('tipos_atividades_custom')
    if (col && !col.fields.getByName('usina_obrigatoria')) {
      col.fields.add(
        new BoolField({
          name: 'usina_obrigatoria',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('tipos_atividades_custom')
    if (col && col.fields.getByName('usina_obrigatoria')) {
      col.fields.removeByName('usina_obrigatoria')
      app.save(col)
    }
  },
)
