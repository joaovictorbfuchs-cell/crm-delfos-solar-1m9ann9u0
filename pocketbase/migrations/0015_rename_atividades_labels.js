migrate(
  (app) => {
    // 1. "Entrar em contato - Ligação" -> "Entrar em contato"
    app
      .db()
      .newQuery(
        "UPDATE atividades SET titulo = {:novoTitulo} WHERE tipo = 'contato_ligacao' AND titulo = {:antigoTitulo}",
      )
      .bind({
        novoTitulo: 'Entrar em contato',
        antigoTitulo: 'Entrar em contato - Ligação',
      })
      .execute()

    // 2. "Fazer Relatório Solarview" -> "Relatório Solarview"
    app
      .db()
      .newQuery(
        "UPDATE atividades SET titulo = {:novoTitulo} WHERE tipo = 'relatorio_solarview' AND titulo = {:antigoTitulo}",
      )
      .bind({
        novoTitulo: 'Relatório Solarview',
        antigoTitulo: 'Fazer Relatório Solarview',
      })
      .execute()

    // 3. "Contato para Reativação" -> "Reativar Cliente"
    app
      .db()
      .newQuery(
        "UPDATE atividades SET titulo = {:novoTitulo} WHERE tipo = 'contato_reativacao' AND titulo = {:antigoTitulo}",
      )
      .bind({
        novoTitulo: 'Reativar Cliente',
        antigoTitulo: 'Contato para Reativação',
      })
      .execute()
  },
  (app) => {
    // Rollback para os títulos anteriores
    app
      .db()
      .newQuery(
        "UPDATE atividades SET titulo = {:antigoTitulo} WHERE tipo = 'contato_ligacao' AND titulo = {:novoTitulo}",
      )
      .bind({
        novoTitulo: 'Entrar em contato',
        antigoTitulo: 'Entrar em contato - Ligação',
      })
      .execute()

    app
      .db()
      .newQuery(
        "UPDATE atividades SET titulo = {:antigoTitulo} WHERE tipo = 'relatorio_solarview' AND titulo = {:novoTitulo}",
      )
      .bind({
        novoTitulo: 'Relatório Solarview',
        antigoTitulo: 'Fazer Relatório Solarview',
      })
      .execute()

    app
      .db()
      .newQuery(
        "UPDATE atividades SET titulo = {:antigoTitulo} WHERE tipo = 'contato_reativacao' AND titulo = {:novoTitulo}",
      )
      .bind({
        novoTitulo: 'Reativar Cliente',
        antigoTitulo: 'Contato para Reativação',
      })
      .execute()
  },
)
