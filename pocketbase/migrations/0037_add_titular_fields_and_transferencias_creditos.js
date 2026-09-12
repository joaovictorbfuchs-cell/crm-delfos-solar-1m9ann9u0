migrate(
  (app) => {
    // 1. Adicionar campos de Titular/Responsável pela Unidade Consumidora na coleção clientes
    const clientesCol = app.findCollectionByNameOrId('clientes')

    if (!clientesCol.fields.getByName('titular_nome')) {
      clientesCol.fields.add(
        new TextField({
          name: 'titular_nome',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('titular_cpf')) {
      clientesCol.fields.add(
        new TextField({
          name: 'titular_cpf',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('titular_telefone')) {
      clientesCol.fields.add(
        new TextField({
          name: 'titular_telefone',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('titular_email')) {
      clientesCol.fields.add(
        new TextField({
          name: 'titular_email',
          required: false,
        }),
      )
    }

    app.save(clientesCol)

    // 2. Criar coleção transferencias_creditos
    const clientesColId = clientesCol.id

    const transferenciasCol = new Collection({
      name: 'transferencias_creditos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'cliente_origem_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'cliente_origem_nome',
          type: 'text',
          required: false,
        },
        {
          name: 'cliente_destino_id',
          type: 'relation',
          required: false,
          collectionId: clientesColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'cliente_destino_nome',
          type: 'text',
          required: true,
        },
        {
          name: 'uc_destino',
          type: 'text',
          required: false,
        },
        {
          name: 'quantidade_creditos',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'data_solicitacao',
          type: 'date',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Pendente', 'Em análise', 'Homologada', 'Rejeitada'],
          maxSelect: 1,
        },
        {
          name: 'observacoes',
          type: 'text',
          required: false,
        },
        {
          name: 'protocolo_concessionaria',
          type: 'text',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_transf_cred_origem ON transferencias_creditos (cliente_origem_id)',
        'CREATE INDEX idx_transf_cred_status ON transferencias_creditos (status)',
        'CREATE INDEX idx_transf_cred_data ON transferencias_creditos (data_solicitacao)',
      ],
    })

    app.save(transferenciasCol)
  },
  (app) => {
    try {
      const tc = app.findCollectionByNameOrId('transferencias_creditos')
      app.delete(tc)
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('clientes')
      if (col.fields.getByName('titular_nome')) col.fields.removeByName('titular_nome')
      if (col.fields.getByName('titular_cpf')) col.fields.removeByName('titular_cpf')
      if (col.fields.getByName('titular_telefone')) col.fields.removeByName('titular_telefone')
      if (col.fields.getByName('titular_email')) col.fields.removeByName('titular_email')
      app.save(col)
    } catch (_) {}
  },
)
