migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const fieldExists = col.fields.getByName('checklist')
    if (!fieldExists) {
      col.fields.add(
        new JSONField({
          name: 'checklist',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const fieldExists = col.fields.getByName('checklist')
    if (fieldExists) {
      col.fields.removeByName('checklist')
      app.save(col)
    }
  },
)
