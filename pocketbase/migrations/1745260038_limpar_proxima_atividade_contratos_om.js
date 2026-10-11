migrate(
  (app) => {
    // Limpar os campos de "Próxima atividade" gerados por seed/migração/PDF nos contratos O&M existentes,
    // mantendo as colunas no modelo/schema para novos agendamentos reais do usuário.
    app
      .db()
      .newQuery(
        `UPDATE contratos_om SET proxima_atividade_titulo = '', tipo_proxima_atividade = '', proxima_atividade_data = ''`,
      )
      .execute()
  },
  (app) => {
    // Reversão defensiva (não re-semeia dados falsos)
  },
)
