migrate(
  (app) => {
    const usinasCol = app.findCollectionByNameOrId('usinas')

    const collection = new Collection({
      name: 'ativos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'usina_id',
          type: 'relation',
          required: true,
          collectionId: usinasCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['inversor', 'placa_solar', 'bateria', 'string_box', 'outros'],
          maxSelect: 1,
        },
        {
          name: 'tipo_outro_descricao',
          type: 'text',
        },
        {
          name: 'fabricante',
          type: 'text',
          required: true,
        },
        {
          name: 'modelo',
          type: 'text',
          required: true,
        },
        {
          name: 'numero_serie',
          type: 'text',
        },
        {
          name: 'data_instalacao',
          type: 'date',
        },
        {
          name: 'data_fim_garantia',
          type: 'date',
        },
        {
          name: 'responsavel_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'observacoes',
          type: 'text',
        },
        {
          name: 'status_operacional',
          type: 'select',
          values: ['operacional', 'em_alerta', 'manutencao', 'desativado'],
          maxSelect: 1,
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
        'CREATE INDEX idx_ativos_usina ON ativos (usina_id)',
        'CREATE INDEX idx_ativos_tipo ON ativos (tipo)',
        'CREATE INDEX idx_ativos_num_serie ON ativos (numero_serie)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('ativos')
    app.delete(collection)
  },
)
