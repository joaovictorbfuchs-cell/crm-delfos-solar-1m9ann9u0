migrate(
  (app) => {
    const clientesColId = app.findCollectionByNameOrId('clientes').id

    // Coleção servicos_avulsos
    const servicosAvulsos = new Collection({
      name: 'servicos_avulsos',
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
        {
          name: 'data_servico',
          type: 'date',
          required: true,
        },
        {
          name: 'tipo_servico',
          type: 'select',
          required: true,
          values: ['limpeza', 'troca_equipamento', 'visita_tecnica', 'reaperto', 'outro'],
          maxSelect: 1,
        },
        {
          name: 'valor_cobrado',
          type: 'number',
          min: 0,
        },
        {
          name: 'observacoes_tecnicas',
          type: 'text',
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['agendado', 'em_andamento', 'concluido'],
          maxSelect: 1,
        },
        {
          name: 'observacoes_equipe',
          type: 'text',
        },
        {
          name: 'fotos',
          type: 'file',
          maxSelect: 10,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_servicos_avulsos_cliente ON servicos_avulsos (cliente_id)',
        'CREATE INDEX idx_servicos_avulsos_status ON servicos_avulsos (status)',
        'CREATE INDEX idx_servicos_avulsos_data ON servicos_avulsos (data_servico DESC)',
      ],
    })

    app.save(servicosAvulsos)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('servicos_avulsos')
      app.delete(col)
    } catch (_) {}
  },
)
