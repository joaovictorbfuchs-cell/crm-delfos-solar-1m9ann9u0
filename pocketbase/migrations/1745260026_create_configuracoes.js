migrate(
  (app) => {
    // 1. Criar a coleção configuracoes (chave/valor genérica)
    let collection
    try {
      collection = app.findCollectionByNameOrId('configuracoes')
    } catch (_) {
      collection = new Collection({
        name: 'configuracoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'chave', type: 'text', required: true },
          { name: 'valor', type: 'text' },
          { name: 'dados', type: 'json' },
          { name: 'descricao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_configuracoes_chave ON configuracoes (chave)'],
      })
      app.save(collection)
    }

    // 2. Seed inicial da configuração de valor por placa (R$ 8,00)
    try {
      const targetCol = app.findCollectionByNameOrId('configuracoes')
      const records = app.findRecordsByFilter('configuracoes', "chave = 'valor_limpeza_por_placa'")
      if (!records || records.length === 0) {
        const rec = new Record(targetCol)
        rec.set('chave', 'valor_limpeza_por_placa')
        rec.set('valor', '8.00')
        rec.set('dados', { valor_por_placa: 8.0 })
        rec.set('descricao', 'Valor padrão comercial cobrado por placa na limpeza avulsa (R$)')
        app.save(rec)
      }
    } catch (err) {
      console.warn('Aviso ao semear configuracoes:', err)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('configuracoes')
      app.delete(collection)
    } catch (_) {}
  },
)
