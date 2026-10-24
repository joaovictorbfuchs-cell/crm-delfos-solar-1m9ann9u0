migrate(
  (app) => {
    try {
      const existing = app.findCollectionByNameOrId('listas_envio')
      if (existing) {
        return
      }
    } catch {
      // Coleção ainda não existe
    }

    let usersCollectionId = ''
    try {
      const usersCol = app.findCollectionByNameOrId('users')
      if (usersCol) {
        usersCollectionId = usersCol.id
      }
    } catch {
      // Ignora se não encontrar
    }

    const fields = [
      { name: 'nome', type: 'text', required: true },
      { name: 'segmento', type: 'text' },
      { name: 'filtros', type: 'json' },
    ]

    if (usersCollectionId) {
      fields.push({
        name: 'criado_por',
        type: 'relation',
        collectionId: usersCollectionId,
        maxSelect: 1,
      })
    } else {
      fields.push({
        name: 'criado_por',
        type: 'text',
      })
    }

    fields.push(
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    )

    const collection = new Collection({
      name: 'listas_envio',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields,
      indexes: [],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('listas_envio')
      if (collection) {
        app.delete(collection)
      }
    } catch {
      // Já excluído ou não existe
    }
  },
)
