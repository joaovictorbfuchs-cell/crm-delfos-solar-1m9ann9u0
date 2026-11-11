// Histórico de vigência das distribuições de percentuais das beneficiárias.
// Cada salvamento no modal de percentuais cria uma versão nova por usina geradora:
// versao sequencial por usina, vigência, tipo (inicial/alteração) e itens (resumo).
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('rge_beneficiarias_versoes')
    } catch (e) {
      col = null
    }
    if (col) return

    col = new Collection({
      name: 'rge_beneficiarias_versoes',
      type: 'base',
      fields: [
        {
          name: 'usina_id',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: 'pbc_3535928899',
          cascadeDelete: true,
        },
        {
          name: 'credencial_id',
          type: 'relation',
          maxSelect: 1,
          collectionId: 'pbc_2639473316',
        },
        { name: 'versao', type: 'number' },
        { name: 'vigencia_inicio', type: 'date' },
        { name: 'vigencia_fim', type: 'date' },
        { name: 'tipo', type: 'text' },
        { name: 'itens', type: 'json' },
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: [
        'CREATE INDEX idx_rge_ben_ver_usina ON rge_beneficiarias_versoes (usina_id, versao)',
      ],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('rge_beneficiarias_versoes'))
    } catch (e) {}
  },
)
