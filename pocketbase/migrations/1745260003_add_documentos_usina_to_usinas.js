migrate(
  (app) => {
    const usinasCol = app.findCollectionByNameOrId('usinas')

    if (!usinasCol.fields.getByName('documentos_usina')) {
      usinasCol.fields.add(
        new JSONField({
          name: 'documentos_usina',
          required: false,
        }),
      )
      app.save(usinasCol)
    }
  },
  (app) => {
    // 100% aditivo — down hook defensivo sem remoção de dados
  },
)
