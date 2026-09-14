migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // Garantir que manageRule permita que qualquer usuário autenticado (ou com perfil admin)
    // gerencie contas de usuários (necessário no PocketBase v0.23+ para criar com verified,
    // redefinir senhas e gerenciar dados de outros colaboradores)
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    usersCol.createRule = "@request.auth.id != ''"
    usersCol.updateRule = "@request.auth.id != ''"
    usersCol.deleteRule = "@request.auth.id != ''"
    usersCol.manageRule = "@request.auth.id != ''"

    app.save(usersCol)
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.manageRule = null
      app.save(usersCol)
    } catch (_) {}
  },
)
