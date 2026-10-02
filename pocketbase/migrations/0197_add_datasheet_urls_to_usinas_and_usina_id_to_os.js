migrate(
  (app) => {
    const usinasCol = app.findCollectionByNameOrId('usinas')

    // 1. Adicionar datasheet_inversor_url se não existir
    if (!usinasCol.fields.getByName('datasheet_inversor_url')) {
      usinasCol.fields.add(
        new URLField({
          name: 'datasheet_inversor_url',
          required: false,
        }),
      )
    }

    // 2. Adicionar datasheet_modulo_url se não existir
    if (!usinasCol.fields.getByName('datasheet_modulo_url')) {
      usinasCol.fields.add(
        new URLField({
          name: 'datasheet_modulo_url',
          required: false,
        }),
      )
    }

    // 3. Adicionar usina_id na coleção ordens_servico caso ainda não exista
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (!osCol.fields.getByName('usina_id')) {
      osCol.fields.add(
        new RelationField({
          name: 'usina_id',
          collectionId: usinasCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(osCol)
    }

    app.save(usinasCol)
  },
  (app) => {
    // 100% aditivo — down hook defensivo
  },
)
