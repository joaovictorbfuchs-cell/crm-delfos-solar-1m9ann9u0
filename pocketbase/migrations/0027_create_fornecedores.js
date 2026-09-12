migrate(
  (app) => {
    // 1. Coleção fornecedores
    const fornecedoresCol = new Collection({
      name: 'fornecedores',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome_empresa', type: 'text', required: true },
        { name: 'cnpj', type: 'text' },
        { name: 'contato_nome', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'endereco', type: 'text' },
        {
          name: 'especialidade',
          type: 'select',
          required: true,
          values: ['paineis', 'inversores', 'estruturas', 'acessorios', 'completo'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fornecedores_nome ON fornecedores (nome_empresa)',
        'CREATE INDEX idx_fornecedores_cnpj ON fornecedores (cnpj)',
        'CREATE INDEX idx_fornecedores_especialidade ON fornecedores (especialidade)',
      ],
    })
    app.save(fornecedoresCol)

    const fornecedoresId = app.findCollectionByNameOrId('fornecedores').id

    // Tentar resolver coleções relacionadas se existirem
    let clientesColId = null
    try {
      clientesColId = app.findCollectionByNameOrId('clientes').id
    } catch (_) {}

    let orcamentosColId = null
    try {
      orcamentosColId = app.findCollectionByNameOrId('orcamentos_solar').id
    } catch (_) {}

    const fieldsOrcamento = [
      {
        name: 'fornecedor_id',
        type: 'relation',
        required: false,
        collectionId: fornecedoresId,
        cascadeDelete: false,
        maxSelect: 1,
      },
      { name: 'nome_fornecedor', type: 'text', required: true },
      { name: 'data', type: 'date', required: true },
      { name: 'numero_revisao', type: 'text' },
      { name: 'valor_total', type: 'number', required: true },
      { name: 'modulos', type: 'json' }, // lista de { descricao, quantidade }
      { name: 'inversores', type: 'json' }, // lista de { descricao, quantidade }
      { name: 'acessorios', type: 'json' }, // lista de { descricao, quantidade }
      {
        name: 'arquivo',
        type: 'file',
        maxSelect: 1,
        maxSize: 15728640, // 15MB
        mimeTypes: ['application/pdf'],
      },
      { name: 'observacoes', type: 'text' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    if (clientesColId) {
      fieldsOrcamento.splice(1, 0, {
        name: 'cliente_id',
        type: 'relation',
        required: false,
        collectionId: clientesColId,
        cascadeDelete: false,
        maxSelect: 1,
      })
    }

    if (orcamentosColId) {
      fieldsOrcamento.splice(2, 0, {
        name: 'orcamento_solar_id',
        type: 'relation',
        required: false,
        collectionId: orcamentosColId,
        cascadeDelete: false,
        maxSelect: 1,
      })
    }

    // 2. Coleção fornecedores_orcamentos
    const fornecedoresOrcamentosCol = new Collection({
      name: 'fornecedores_orcamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: fieldsOrcamento,
      indexes: [],
    })
    app.save(fornecedoresOrcamentosCol)
  },
  (app) => {
    try {
      const orcCol = app.findCollectionByNameOrId('fornecedores_orcamentos')
      app.delete(orcCol)
    } catch (_) {}
    try {
      const fornCol = app.findCollectionByNameOrId('fornecedores')
      app.delete(fornCol)
    } catch (_) {}
  },
)
