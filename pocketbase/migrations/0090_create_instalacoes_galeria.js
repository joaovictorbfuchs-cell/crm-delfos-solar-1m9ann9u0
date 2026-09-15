migrate(
  (app) => {
    const collection = new Collection({
      name: 'instalacoes_galeria',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'cidade', type: 'text' },
        { name: 'potencia_kwp', type: 'number' },
        {
          name: 'foto',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        { name: 'foto_url', type: 'text' }, // Permite fallback de URL CDN se foto não tiver upload de arquivo direto
        { name: 'ordem', type: 'number' },
        { name: 'destaque', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_instalacoes_galeria_ordem ON instalacoes_galeria (ordem)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('instalacoes_galeria')
    app.delete(collection)
  },
)
