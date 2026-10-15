migrate(
  (app) => {
    const proposta = app.findCollectionByNameOrId('propostas_om')
    const propostaFields = [
      new TextField({ name: 'link_token_hash' }),
      new DateField({ name: 'link_expira_em' }),
      new TextField({ name: 'aceite_cliente_nome' }),
      new TextField({ name: 'aceite_cliente_documento' }),
      new DateField({ name: 'aceite_cliente_em' }),
    ]
    for (const field of propostaFields) {
      if (!proposta.fields.getByName(field.name)) proposta.fields.add(field)
    }
    app.save(proposta)

    const clientes = app.findCollectionByNameOrId('clientes')
    if (!clientes.fields.getByName('proposta_om_id')) {
      clientes.fields.add(new TextField({ name: 'proposta_om_id' }))
      app.save(clientes)
    }
  },
  (app) => {
    const proposta = app.findCollectionByNameOrId('propostas_om')
    for (const name of [
      'link_token_hash',
      'link_expira_em',
      'aceite_cliente_nome',
      'aceite_cliente_documento',
      'aceite_cliente_em',
    ]) {
      if (proposta.fields.getByName(name)) proposta.fields.removeByName(name)
    }
    app.save(proposta)

    const clientes = app.findCollectionByNameOrId('clientes')
    if (clientes.fields.getByName('proposta_om_id')) {
      clientes.fields.removeByName('proposta_om_id')
      app.save(clientes)
    }
  },
)
