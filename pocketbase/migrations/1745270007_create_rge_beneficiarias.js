// Beneficiárias de uma UC geradora (rateio de créditos).
// A UC geradora baixa a conta; as beneficiárias recebem o percentual.
// O robô usa o MESMO login da credencial para baixar a conta de cada beneficiária.
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('rge_beneficiarias')
    } catch (e) {
      col = null
    }
    if (col) return

    col = new Collection({
      name: 'rge_beneficiarias',
      type: 'base',
      fields: [
        {
          name: 'credencial_id',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: 'pbc_2639473316',
          cascadeDelete: true,
        },
        { name: 'uc', type: 'text', required: true },
        { name: 'rotulo', type: 'text' },
        { name: 'percentual', type: 'number', min: 0, max: 100 },
        { name: 'cliente_id', type: 'relation', maxSelect: 1, collectionId: 'pbc_279994318' },
        { name: 'usina_id', type: 'relation', maxSelect: 1, collectionId: 'pbc_3535928899' },
        { name: 'ativo', type: 'bool' },
        { name: 'observacao', type: 'text' },
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: [
        'CREATE UNIQUE INDEX idx_rge_benef_cred_uc ON rge_beneficiarias (credencial_id, uc)',
      ],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('rge_beneficiarias'))
    } catch (e) {}
  },
)
