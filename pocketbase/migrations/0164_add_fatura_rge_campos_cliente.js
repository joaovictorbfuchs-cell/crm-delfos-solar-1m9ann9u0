migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    if (!clientes.fields.getByName('grupo_subgrupo')) {
      clientes.fields.add(
        new TextField({
          name: 'grupo_subgrupo',
          required: false,
        }),
      )
    }

    if (!clientes.fields.getByName('tipo_fornecimento')) {
      clientes.fields.add(
        new TextField({
          name: 'tipo_fornecimento',
          required: false,
        }),
      )
    }

    if (!clientes.fields.getByName('tensao_nominal')) {
      clientes.fields.add(
        new TextField({
          name: 'tensao_nominal',
          required: false,
        }),
      )
    }

    if (!clientes.fields.getByName('historico_consumo_fatura')) {
      clientes.fields.add(
        new JSONField({
          name: 'historico_consumo_fatura',
          required: false,
        }),
      )
    }

    if (!clientes.fields.getByName('consumo_anual_kwh')) {
      clientes.fields.add(
        new NumberField({
          name: 'consumo_anual_kwh',
          required: false,
        }),
      )
    }

    if (!clientes.fields.getByName('consumo_medio_diario_kwh')) {
      clientes.fields.add(
        new NumberField({
          name: 'consumo_medio_diario_kwh',
          required: false,
        }),
      )
    }

    app.save(clientes)

    // Também adiciona na collection usinas se couber
    try {
      const usinas = app.findCollectionByNameOrId('usinas')
      if (!usinas.fields.getByName('grupo_subgrupo')) {
        usinas.fields.add(new TextField({ name: 'grupo_subgrupo', required: false }))
      }
      if (!usinas.fields.getByName('tensao_nominal')) {
        usinas.fields.add(new TextField({ name: 'tensao_nominal', required: false }))
      }
      app.save(usinas)
    } catch (_) {}
  },
  (app) => {
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      if (clientes.fields.getByName('grupo_subgrupo'))
        clientes.fields.removeByName('grupo_subgrupo')
      if (clientes.fields.getByName('tipo_fornecimento'))
        clientes.fields.removeByName('tipo_fornecimento')
      if (clientes.fields.getByName('tensao_nominal'))
        clientes.fields.removeByName('tensao_nominal')
      if (clientes.fields.getByName('historico_consumo_fatura'))
        clientes.fields.removeByName('historico_consumo_fatura')
      if (clientes.fields.getByName('consumo_anual_kwh'))
        clientes.fields.removeByName('consumo_anual_kwh')
      if (clientes.fields.getByName('consumo_medio_diario_kwh'))
        clientes.fields.removeByName('consumo_medio_diario_kwh')
      app.save(clientes)
    } catch (_) {}
  },
)
