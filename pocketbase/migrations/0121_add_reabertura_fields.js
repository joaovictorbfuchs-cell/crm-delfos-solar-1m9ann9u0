migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    if (!clientes.fields.getByName('reabertura')) {
      clientes.fields.add(new BoolField({ name: 'reabertura' }))
    }

    if (!clientes.fields.getByName('motivo_reabertura')) {
      clientes.fields.add(new TextField({ name: 'motivo_reabertura' }))
    }

    if (!clientes.fields.getByName('descricao_reabertura')) {
      clientes.fields.add(new TextField({ name: 'descricao_reabertura' }))
    }

    if (!clientes.fields.getByName('valor_reabertura')) {
      clientes.fields.add(new NumberField({ name: 'valor_reabertura' }))
    }

    if (!clientes.fields.getByName('data_reabertura')) {
      clientes.fields.add(new TextField({ name: 'data_reabertura' }))
    }

    app.save(clientes)
  },
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    const r = clientes.fields.getByName('reabertura')
    if (r) clientes.fields.removeById(r.id)

    const mr = clientes.fields.getByName('motivo_reabertura')
    if (mr) clientes.fields.removeById(mr.id)

    const dr = clientes.fields.getByName('descricao_reabertura')
    if (dr) clientes.fields.removeById(dr.id)

    const vr = clientes.fields.getByName('valor_reabertura')
    if (vr) clientes.fields.removeById(vr.id)

    const dtr = clientes.fields.getByName('data_reabertura')
    if (dtr) clientes.fields.removeById(dtr.id)

    app.save(clientes)
  },
)
