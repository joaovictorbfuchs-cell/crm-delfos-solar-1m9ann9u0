migrate(
  (app) => {
    // 1. Adicionar campos de monitoramento na coleção clientes
    const clientesCol = app.findCollectionByNameOrId('clientes')

    if (!clientesCol.fields.getByName('monitoramento_app_nome')) {
      clientesCol.fields.add(
        new TextField({
          name: 'monitoramento_app_nome',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('monitoramento_login')) {
      clientesCol.fields.add(
        new TextField({
          name: 'monitoramento_login',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('monitoramento_senha')) {
      clientesCol.fields.add(
        new TextField({
          name: 'monitoramento_senha',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('monitoramento_datalogger_url')) {
      clientesCol.fields.add(
        new TextField({
          name: 'monitoramento_datalogger_url',
          required: false,
        }),
      )
    }

    app.save(clientesCol)

    // 2. Adicionar os mesmos campos opcionais na coleção sistemas para consistência
    const sistemasCol = app.findCollectionByNameOrId('sistemas')
    if (!sistemasCol.fields.getByName('monitoramento_app_nome')) {
      sistemasCol.fields.add(
        new TextField({
          name: 'monitoramento_app_nome',
          required: false,
        }),
      )
    }
    if (!sistemasCol.fields.getByName('monitoramento_login')) {
      sistemasCol.fields.add(
        new TextField({
          name: 'monitoramento_login',
          required: false,
        }),
      )
    }
    if (!sistemasCol.fields.getByName('monitoramento_senha')) {
      sistemasCol.fields.add(
        new TextField({
          name: 'monitoramento_senha',
          required: false,
        }),
      )
    }
    if (!sistemasCol.fields.getByName('monitoramento_datalogger_url')) {
      sistemasCol.fields.add(
        new TextField({
          name: 'monitoramento_datalogger_url',
          required: false,
        }),
      )
    }
    app.save(sistemasCol)

    // 3. Criar coleção monitoramento_marcas para armazenar padrões por marca de inversor
    const monitoramentoMarcasCol = new Collection({
      name: 'monitoramento_marcas',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'marca',
          type: 'text',
          required: true,
        },
        {
          name: 'app_nome',
          type: 'text',
          required: false,
        },
        {
          name: 'login_padrao',
          type: 'text',
          required: false,
        },
        {
          name: 'senha_padrao',
          type: 'text',
          required: false,
        },
        {
          name: 'datalogger_url',
          type: 'text',
          required: false,
        },
        {
          name: 'instrucoes',
          type: 'text',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_monitoramento_marcas_marca ON monitoramento_marcas (marca)',
      ],
    })

    app.save(monitoramentoMarcasCol)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('monitoramento_marcas')
      app.delete(col)
    } catch (_) {}

    try {
      const c = app.findCollectionByNameOrId('clientes')
      if (c.fields.getByName('monitoramento_app_nome'))
        c.fields.removeByName('monitoramento_app_nome')
      if (c.fields.getByName('monitoramento_login')) c.fields.removeByName('monitoramento_login')
      if (c.fields.getByName('monitoramento_senha')) c.fields.removeByName('monitoramento_senha')
      if (c.fields.getByName('monitoramento_datalogger_url'))
        c.fields.removeByName('monitoramento_datalogger_url')
      app.save(c)
    } catch (_) {}

    try {
      const s = app.findCollectionByNameOrId('sistemas')
      if (s.fields.getByName('monitoramento_app_nome'))
        s.fields.removeByName('monitoramento_app_nome')
      if (s.fields.getByName('monitoramento_login')) s.fields.removeByName('monitoramento_login')
      if (s.fields.getByName('monitoramento_senha')) s.fields.removeByName('monitoramento_senha')
      if (s.fields.getByName('monitoramento_datalogger_url'))
        s.fields.removeByName('monitoramento_datalogger_url')
      app.save(s)
    } catch (_) {}
  },
)
