migrate(
  (app) => {
    // 1. os_templates
    const osTemplatesCol = new Collection({
      name: 'os_templates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tipo_servico',
          type: 'select',
          required: true,
          values: ['Limpeza', 'Manutenção', 'Instalação', 'Garantia', 'Configuração de Datalogger'],
          maxSelect: 1,
        },
        {
          name: 'instrucoes',
          type: 'text',
          required: false,
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
      indexes: ['CREATE UNIQUE INDEX idx_os_templates_tipo ON os_templates (tipo_servico)'],
    })
    app.save(osTemplatesCol)

    // 2. ordens_servico
    const clientesColId = app.findCollectionByNameOrId('clientes').id

    let profissionaisColId = null
    try {
      profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    } catch (_) {}

    const osFields = [
      {
        name: 'cliente_id',
        type: 'relation',
        required: true,
        collectionId: clientesColId,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: 'tipo_servico',
        type: 'select',
        required: true,
        values: ['Limpeza', 'Manutenção', 'Instalação', 'Garantia', 'Configuração de Datalogger'],
        maxSelect: 1,
      },
      {
        name: 'endereco',
        type: 'text',
        required: false,
      },
      {
        name: 'data_agendada',
        type: 'date',
        required: true,
      },
      {
        name: 'status',
        type: 'select',
        required: true,
        values: ['pendente', 'concluida', 'cancelada'],
        maxSelect: 1,
      },
      {
        name: 'atribuida_a',
        type: 'text',
        required: false,
      },
      {
        name: 'instrucoes',
        type: 'text',
        required: false,
      },
      {
        name: 'checklist',
        type: 'json',
        required: false,
      },
      {
        name: 'detalhes_execucao',
        type: 'text',
        required: false,
      },
      {
        name: 'fotos',
        type: 'file',
        maxSelect: 20,
        maxSize: 15728640, // 15MB
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
      },
      {
        name: 'concluida_em',
        type: 'date',
        required: false,
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
    ]

    if (profissionaisColId) {
      osFields.splice(6, 0, {
        name: 'profissional_id',
        type: 'relation',
        required: false,
        collectionId: profissionaisColId,
        cascadeDelete: false,
        maxSelect: 1,
      })
    }

    const ordensServicoCol = new Collection({
      name: 'ordens_servico',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: osFields,
      indexes: [],
    })
    app.save(ordensServicoCol)
  },
  (app) => {
    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      app.delete(osCol)
    } catch (_) {}

    try {
      const tmplCol = app.findCollectionByNameOrId('os_templates')
      app.delete(tmplCol)
    } catch (_) {}
  },
)
