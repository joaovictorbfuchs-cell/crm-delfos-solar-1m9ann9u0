migrate(
  (app) => {
    // Restaurar os valores conhecidos dos 5 fornecedores existentes:
    // Sol tecno Distribuidora -> completo
    // Elétrica Comercial RS -> inversores
    // Estruturas Sul Solar -> estruturas
    // MAXSUL -> completo
    // NAVARINI -> completo
    app
      .db()
      .newQuery(
        "UPDATE fornecedores SET especialidade = 'completo' WHERE nome_empresa = 'Sol tecno Distribuidora' OR especialidade = '' OR especialidade IS NULL",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE fornecedores SET especialidade = 'inversores' WHERE nome_empresa = 'Elétrica Comercial RS'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE fornecedores SET especialidade = 'estruturas' WHERE nome_empresa = 'Estruturas Sul Solar'",
      )
      .execute()
  },
  (app) => {},
)
