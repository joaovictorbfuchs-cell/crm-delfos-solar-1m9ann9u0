migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')

    // 1. Criar coleção cliente_inversores
    const clienteInversoresCol = new Collection({
      name: 'cliente_inversores',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'marca_inversor',
          type: 'text',
          required: false,
        },
        {
          name: 'modelo_inversor',
          type: 'text',
          required: false,
        },
        {
          name: 'potencia_kwp',
          type: 'number',
          required: false,
        },
        {
          name: 'numero_serie',
          type: 'text',
          required: false,
        },
        {
          name: 'app_nome',
          type: 'text',
          required: false,
        },
        {
          name: 'login',
          type: 'text',
          required: false,
        },
        {
          name: 'senha',
          type: 'text',
          required: false,
        },
        {
          name: 'datalogger_url',
          type: 'text',
          required: false,
        },
        {
          name: 'observacoes',
          type: 'text',
          required: false,
        },
        {
          name: 'ordem',
          type: 'number',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cliente_inversores_cliente ON cliente_inversores (cliente_id)',
        'CREATE INDEX idx_cliente_inversores_ordem ON cliente_inversores (cliente_id, ordem)',
      ],
    })

    app.save(clienteInversoresCol)

    // 2. Migrar dados existentes dos campos em `clientes` / `sistemas` para o primeiro inversor de cada cliente
    try {
      const allClientes = app.findRecordsByFilter('clientes', 'id != ""', 'created', 1000, 0)
      for (const cli of allClientes) {
        const marca = (cli.getString('inversor_marca') || '').trim()
        const modelo = (cli.getString('inversor_modelo') || '').trim()
        const appNome = (cli.getString('monitoramento_app_nome') || '').trim()
        const login = (cli.getString('monitoramento_login') || '').trim()
        const senha = (cli.getString('monitoramento_senha') || '').trim()
        const dataloggerUrl = (cli.getString('monitoramento_datalogger_url') || '').trim()

        // Se o cliente tem qualquer dado relacionado a inversor ou monitoramento
        if (marca || modelo || appNome || login || senha || dataloggerUrl) {
          const rec = new Record(clienteInversoresCol)
          rec.set('cliente_id', cli.id)
          rec.set('marca_inversor', marca)
          rec.set('modelo_inversor', modelo)
          rec.set('app_nome', appNome)
          rec.set('login', login)
          rec.set('senha', senha)
          rec.set('datalogger_url', dataloggerUrl)
          rec.set('ordem', 1)
          app.save(rec)
        }
      }
    } catch (err) {
      console.warn('Aviso ao migrar dados legados de inversores:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('cliente_inversores')
      app.delete(col)
    } catch (_) {}
  },
)
