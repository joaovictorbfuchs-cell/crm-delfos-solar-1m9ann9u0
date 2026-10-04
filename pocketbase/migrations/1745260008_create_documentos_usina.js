migrate(
  (app) => {
    const usinasCol = app.findCollectionByNameOrId('usinas')

    const documentosUsinaCol = new Collection({
      name: 'documentos_usina',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'usina_id',
          type: 'relation',
          collectionId: usinasCol.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: 'arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 20971520, // 20MB
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          required: true,
        },
        {
          name: 'nome_original',
          type: 'text',
          required: false,
        },
        {
          name: 'descricao',
          type: 'text',
          required: false,
        },
        {
          name: 'ativo',
          type: 'bool',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_docs_usina_usina_id ON documentos_usina (usina_id)',
        'CREATE INDEX idx_docs_usina_ativo ON documentos_usina (ativo)',
      ],
    })

    app.save(documentosUsinaCol)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('documentos_usina')
      app.delete(col)
    } catch (_) {}
  },
)
