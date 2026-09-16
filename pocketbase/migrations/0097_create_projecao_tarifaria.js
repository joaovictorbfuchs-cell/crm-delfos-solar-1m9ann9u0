migrate(
  (app) => {
    const collection = new Collection({
      name: 'projecao_tarifaria',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'ano', type: 'number', required: true, onlyInt: true },
        {
          name: 'tipo_cliente',
          type: 'select',
          required: true,
          values: ['residencial', 'comercial'],
          maxSelect: 1,
        },
        { name: 'tarifa_kwh', type: 'number' },
        { name: 'fio_b_kwh', type: 'number' },
        { name: 'fs', type: 'number' }, // Fator de simultaneidade (ex: 0.3 ou 0.7)
        { name: 'gd_eco_liquida', type: 'number' },
        { name: 'economia_acumulada', type: 'number' },
        { name: 'gasto_acumulado', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_projecao_tarifaria_tipo_ano ON projecao_tarifaria (tipo_cliente, ano)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('projecao_tarifaria')
      app.delete(collection)
    } catch (_) {}
  },
)
