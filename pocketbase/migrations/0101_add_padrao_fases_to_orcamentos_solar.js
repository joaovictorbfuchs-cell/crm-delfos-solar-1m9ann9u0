migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    if (!col.fields.getByName('padrao_fases')) {
      col.fields.add(
        new SelectField({
          name: 'padrao_fases',
          values: ['monofásico', 'bifásico', 'trifásico'],
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    const field = col.fields.getByName('padrao_fases')
    if (field) {
      col.fields.removeByName('padrao_fases')
      app.save(col)
    }
  },
)
