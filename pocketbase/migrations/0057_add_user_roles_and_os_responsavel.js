migrate(
  (app) => {
    // 1. Atualizar a coleção users: adicionar campos role e ativo
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['admin', 'instalador'],
          maxSelect: 1,
        }),
      )
    }

    if (!usersCol.fields.getByName('ativo')) {
      usersCol.fields.add(
        new BoolField({
          name: 'ativo',
          required: false,
        }),
      )
    }

    app.save(usersCol)

    // Atualizar usuários existentes para role 'admin' e ativo true
    app.db().newQuery("UPDATE users SET role = 'admin' WHERE role IS NULL OR role = ''").execute()
    app.db().newQuery('UPDATE users SET ativo = 1 WHERE ativo IS NULL').execute()

    // 2. Atualizar ordens_servico: adicionar relação com users (responsavel_usuario_id)
    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      if (!osCol.fields.getByName('responsavel_usuario_id')) {
        osCol.fields.add(
          new RelationField({
            name: 'responsavel_usuario_id',
            required: false,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
        app.save(osCol)
      }
    } catch (e) {
      console.log('Erro ao adicionar campo responsavel_usuario_id em ordens_servico:', e)
    }
  },
  (app) => {
    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      const respField = osCol.fields.getByName('responsavel_usuario_id')
      if (respField) {
        osCol.fields.removeByName('responsavel_usuario_id')
        app.save(osCol)
      }
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('role')) {
        usersCol.fields.removeByName('role')
      }
      if (usersCol.fields.getByName('ativo')) {
        usersCol.fields.removeByName('ativo')
      }
      app.save(usersCol)
    } catch (_) {}
  },
)
