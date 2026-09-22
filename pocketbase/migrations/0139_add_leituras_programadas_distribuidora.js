migrate((app) => {
  const col = app.findCollectionByNameOrId('atividades')
  if (!col.fields.getByName('leituras_programadas_distribuidora')) {
    col.fields.add(
      new JSONField({
        name: 'leituras_programadas_distribuidora',
        required: false,
      }),
    )
    app.save(col)
  }
}, (app) => {
  const col = app.findCollectionByNameOrId('atividades')
  const f = col.fields.getByName('leituras_programadas_distribuidora')
  if (f) {
    col.fields.removeByName('leituras_programadas_distribuidora')
    app.save(col)
  }
})
