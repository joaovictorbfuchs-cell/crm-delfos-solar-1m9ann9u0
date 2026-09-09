migrate(
  (app) => {
    // 1. Atualizar os dados existentes na tabela clientes via raw SQL antes/depois da alteração do schema
    // Mapeamento:
    // 'Lead' -> 'Novo Lead'
    // 'Orçamento Enviado' -> 'Orçamento'
    // 'Proposta' -> 'Orçamento'
    // 'Perdido' -> 'Contato Futuro'
    app.db().newQuery("UPDATE clientes SET status = 'Novo Lead' WHERE status = 'Lead'").execute()
    app
      .db()
      .newQuery(
        "UPDATE clientes SET status = 'Orçamento' WHERE status IN ('Orçamento Enviado', 'Proposta')",
      )
      .execute()
    app
      .db()
      .newQuery("UPDATE clientes SET status = 'Contato Futuro' WHERE status = 'Perdido'")
      .execute()

    // 2. Atualizar a definição do campo select status na coleção clientes
    const col = app.findCollectionByNameOrId('clientes')
    const statusField = col.fields.getByName('status')

    const newValues = [
      'Novo Lead',
      'Levantamento',
      'Orçamento',
      'Negociação',
      'Fechado',
      'Contato Futuro',
    ]

    if (statusField) {
      statusField.values = newValues
      statusField.maxSelect = 1
    } else {
      col.fields.add(
        new SelectField({
          name: 'status',
          values: newValues,
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    // Reverter valores do campo status
    const col = app.findCollectionByNameOrId('clientes')
    const statusField = col.fields.getByName('status')

    const oldValues = ['Lead', 'Orçamento Enviado', 'Proposta', 'Negociação', 'Fechado', 'Perdido']

    if (statusField) {
      statusField.values = oldValues
      statusField.maxSelect = 1
      app.save(col)
    }

    // Reverter dados
    app.db().newQuery("UPDATE clientes SET status = 'Lead' WHERE status = 'Novo Lead'").execute()
    app
      .db()
      .newQuery("UPDATE clientes SET status = 'Perdido' WHERE status = 'Contato Futuro'")
      .execute()
  },
)
