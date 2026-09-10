migrate(
  (app) => {
    // Atualiza registros existentes que possuam o título antigo
    app
      .db()
      .newQuery(
        "UPDATE atividades SET titulo = {:novoTitulo} WHERE tipo = 'ligar_indicacao' AND titulo = {:antigoTitulo}",
      )
      .bind({
        novoTitulo: 'Solicitar indicação',
        antigoTitulo: 'Ligar para solicitar Indicação',
      })
      .execute()
  },
  (app) => {
    // Rollback para o título anterior
    app
      .db()
      .newQuery(
        "UPDATE atividades SET titulo = {:antigoTitulo} WHERE tipo = 'ligar_indicacao' AND titulo = {:novoTitulo}",
      )
      .bind({
        novoTitulo: 'Solicitar indicação',
        antigoTitulo: 'Ligar para solicitar Indicação',
      })
      .execute()
  },
)
