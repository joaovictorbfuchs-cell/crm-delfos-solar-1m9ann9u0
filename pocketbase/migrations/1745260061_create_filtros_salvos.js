migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      name: 'filtros_salvos',
      type: 'base',
      listRule: "@request.auth.id != '' && (visibilidade = 'shared' || dono = @request.auth.id)",
      viewRule: "@request.auth.id != '' && (visibilidade = 'shared' || dono = @request.auth.id)",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && dono = @request.auth.id",
      deleteRule: "@request.auth.id != '' && dono = @request.auth.id",
      fields: [
        {
          name: 'nome',
          type: 'text',
          required: true,
        },
        {
          name: 'modulo',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['clientes', 'negocios'],
        },
        {
          name: 'condicoes',
          type: 'json',
          required: true,
        },
        {
          name: 'visibilidade',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['private', 'shared'],
        },
        {
          name: 'dono',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          cascadeDelete: false,
          maxSelect: 1,
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
        'CREATE INDEX idx_filtros_salvos_modulo ON filtros_salvos (modulo)',
        'CREATE INDEX idx_filtros_salvos_dono ON filtros_salvos (dono)',
        'CREATE INDEX idx_filtros_salvos_visibilidade ON filtros_salvos (visibilidade)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('filtros_salvos')
      if (collection) {
        app.delete(collection)
      }
    } catch (e) {
      // collection may not exist
    }
  },
)
