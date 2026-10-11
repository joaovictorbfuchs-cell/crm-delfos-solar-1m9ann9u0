migrate(
  (app) => {
    const contratosCol = app.findCollectionByNameOrId('contratos_om')

    const documentosContratoOMCol = new Collection({
      name: 'documentos_contrato_om',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'contrato_id',
          type: 'relation',
          collectionId: contratosCol.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: 'arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 31457280, // 30MB
          mimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          required: true,
        },
        {
          name: 'nome_original',
          type: 'text',
          required: false,
        },
        {
          name: 'categoria',
          type: 'select',
          values: ['Procuração assinada', 'Contrato assinado', 'Outros'],
          maxSelect: 1,
          required: false,
        },
        {
          name: 'tamanho',
          type: 'number',
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
        'CREATE INDEX idx_docs_contrato_om_contrato_id ON documentos_contrato_om (contrato_id)',
        'CREATE INDEX idx_docs_contrato_om_categoria ON documentos_contrato_om (categoria)',
        'CREATE INDEX idx_docs_contrato_om_ativo ON documentos_contrato_om (ativo)',
      ],
    })

    app.save(documentosContratoOMCol)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('documentos_contrato_om')
      app.delete(col)
    } catch (_) {}
  },
)
