migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    if (!col.fields.getByName('negocio_id')) {
      const negociosCol = app.findCollectionByNameOrId('negocios')
      col.fields.add(
        new RelationField({
          name: 'negocio_id',
          collectionId: negociosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
      col.addIndex('idx_orcamentos_solar_negocio', false, 'negocio_id', '')
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    col.removeIndex('idx_orcamentos_solar_negocio')
    const field = col.fields.getByName('negocio_id')
    if (field) {
      col.fields.removeById(field.id)
    }
    app.save(col)
  },
)
