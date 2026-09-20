migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    if (!clientes.fields.getByName('valor_final')) {
      clientes.fields.add(new NumberField({ name: 'valor_final' }))
    }

    if (!clientes.fields.getByName('condicao_pagamento')) {
      clientes.fields.add(new TextField({ name: 'condicao_pagamento' }))
    }

    if (!clientes.fields.getByName('observacoes_perda')) {
      clientes.fields.add(new TextField({ name: 'observacoes_perda' }))
    }

    app.save(clientes)
  },
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const vf = clientes.fields.getByName('valor_final')
    if (vf) clientes.fields.removeById(vf.id)
    const cp = clientes.fields.getByName('condicao_pagamento')
    if (cp) clientes.fields.removeById(cp.id)
    const op = clientes.fields.getByName('observacoes_perda')
    if (op) clientes.fields.removeById(op.id)
    app.save(clientes)
  },
)
