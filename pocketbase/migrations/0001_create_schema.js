migrate(
  (app) => {
    // 1. Clientes collection
    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'uc', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'potencia_kwp', type: 'number' },
        { name: 'valor_estimado', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['Lead', 'Orçamento Enviado', 'Proposta', 'Negociação', 'Fechado', 'Perdido'],
          maxSelect: 1,
        },
        { name: 'data_instalacao', type: 'date' },
        { name: 'inversor_marca', type: 'text' },
        { name: 'inversor_modelo', type: 'text' },
        { name: 'placas_qtd', type: 'number' },
        { name: 'placas_marca', type: 'text' },
        {
          name: 'telhado_tipo',
          type: 'select',
          values: ['ceramico', 'metalico', 'laje', 'fibrocimento'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clientes_status ON clientes (status)',
        'CREATE INDEX idx_clientes_cidade ON clientes (cidade)',
      ],
    })
    app.save(clientes)

    const clientesColId = app.findCollectionByNameOrId('clientes').id

    // 2. Manutencoes collection
    const manutencoes = new Collection({
      name: 'manutencoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['Limpeza', 'Revisão Elétrica', 'Troca de Inversor'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Agendado', 'Em andamento', 'Concluído'],
          maxSelect: 1,
        },
        { name: 'tecnico', type: 'text' },
        { name: 'descricao', type: 'text' },
        {
          name: 'fotos',
          type: 'file',
          maxSelect: 5,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_manutencoes_cliente_id ON manutencoes (cliente_id)',
        'CREATE INDEX idx_manutencoes_status ON manutencoes (status)',
      ],
    })
    app.save(manutencoes)

    // 3. Atividades collection
    const atividades = new Collection({
      name: 'atividades',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        { name: 'descricao', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_atividades_cliente_id ON atividades (cliente_id)'],
    })
    app.save(atividades)
  },
  (app) => {
    try {
      const atividades = app.findCollectionByNameOrId('atividades')
      app.delete(atividades)
    } catch (_) {}

    try {
      const manutencoes = app.findCollectionByNameOrId('manutencoes')
      app.delete(manutencoes)
    } catch (_) {}

    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      app.delete(clientes)
    } catch (_) {}
  },
)
