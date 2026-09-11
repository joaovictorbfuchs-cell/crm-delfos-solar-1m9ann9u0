migrate(
  (app) => {
    // Criar collection outros_contatos
    let outrosContatosCol
    try {
      outrosContatosCol = app.findCollectionByNameOrId('outros_contatos')
    } catch (_) {
      outrosContatosCol = new Collection({
        name: 'outros_contatos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'telefone', type: 'text', required: true },
          {
            name: 'tipo_contato',
            type: 'select',
            required: true,
            values: ['fornecedor', 'instalador', 'parceiro', 'outro'],
            maxSelect: 1,
          },
          { name: 'observacao', type: 'text', required: false },
          { name: 'conversa_id', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_outros_contatos_telefone ON outros_contatos (telefone)',
          'CREATE INDEX idx_outros_contatos_tipo ON outros_contatos (tipo_contato)',
        ],
      })
      app.save(outrosContatosCol)
    }
  },
  (app) => {
    try {
      const outrosContatosCol = app.findCollectionByNameOrId('outros_contatos')
      app.delete(outrosContatosCol)
    } catch (_) {}
  },
)
