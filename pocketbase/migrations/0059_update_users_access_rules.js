migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // Permitir que usuários autenticados (especialmente admins) possam listar e visualizar todos os usuários,
    // e gerenciar (criar, atualizar, deletar) conforme autenticado.
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    usersCol.createRule = "@request.auth.id != ''"
    usersCol.updateRule = "@request.auth.id != ''"
    usersCol.deleteRule = "@request.auth.id != ''"

    app.save(usersCol)

    // Se houver algum usuário órfão ou teste com o email daniel@delfosengenharia.com.br,
    // garantimos limpeza ou atualização defensiva
    try {
      const daniel = app.findAuthRecordByEmail('_pb_users_auth_', 'daniel@delfosengenharia.com.br')
      // Se já existir, garantimos que esteja com role e ativo corretos
      if (!daniel.get('role')) daniel.set('role', 'admin')
      daniel.set('ativo', true)
      app.save(daniel)
    } catch (_) {
      // Não existe no banco ainda — tudo limpo para o usuário cadastrar!
    }
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.listRule = 'id = @request.auth.id'
      usersCol.viewRule = 'id = @request.auth.id'
      usersCol.createRule = ''
      usersCol.updateRule = 'id = @request.auth.id'
      usersCol.deleteRule = 'id = @request.auth.id'
      app.save(usersCol)
    } catch (_) {}
  },
)
