migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ativos')

    // 1. Tornar usina_id opcional (pois registros de cliente_inversores sem usina podem ser importados como ativo sem usina, guardando o cliente na observação)
    const usinaField = col.fields.getByName('usina_id')
    if (usinaField) {
      usinaField.required = false
    }

    // 2. Adicionar chave_importacao (texto) para idempotência aditiva perfeita (ex: "cliente_inversores:<id>")
    if (!col.fields.getByName('chave_importacao')) {
      col.fields.add(new TextField({ name: 'chave_importacao', required: false }))
    }

    // 3. Adicionar cliente_inversor_id (texto) para rastreabilidade direta do ID de origem
    if (!col.fields.getByName('cliente_inversor_id')) {
      col.fields.add(new TextField({ name: 'cliente_inversor_id', required: false }))
    }

    app.save(col)

    // Índice na chave_importacao para evitar duplicatas e buscas instantâneas
    try {
      col.addIndex('idx_ativos_chave_importacao', false, 'chave_importacao', '')
      app.save(col)
    } catch (e) {
      console.log('Aviso ao adicionar índice idx_ativos_chave_importacao:', e)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('ativos')
    try {
      col.removeIndex('idx_ativos_chave_importacao')
    } catch (e) {}

    if (col.fields.getByName('cliente_inversor_id')) {
      col.fields.removeByName('cliente_inversor_id')
    }
    if (col.fields.getByName('chave_importacao')) {
      col.fields.removeByName('chave_importacao')
    }
    app.save(col)
  },
)
