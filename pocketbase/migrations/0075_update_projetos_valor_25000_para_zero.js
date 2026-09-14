migrate(
  (app) => {
    // Atualiza no banco todos os clientes/projetos onde valor_estimado é exatamente 25000 para 0
    app
      .db()
      .newQuery(`
    UPDATE clientes
    SET valor_estimado = 0
    WHERE valor_estimado = 25000
  `)
      .execute()

    // Defensivo caso exista em orcamentos_solar
    try {
      app
        .db()
        .newQuery(`
      UPDATE orcamentos_solar
      SET valor_investimento = 0
      WHERE valor_investimento = 25000
    `)
        .execute()
    } catch (_) {}

    // Defensivo caso exista em fornecedores_orcamentos
    try {
      app
        .db()
        .newQuery(`
      UPDATE fornecedores_orcamentos
      SET valor_total = 0
      WHERE valor_total = 25000
    `)
        .execute()
    } catch (_) {}
  },
  (app) => {
    // Reversão opcional (não estritamente necessária restaurar 25000, mas pode retornar)
  },
)
