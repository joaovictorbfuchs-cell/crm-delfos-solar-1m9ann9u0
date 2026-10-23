migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    try {
      col.addIndex('idx_atividades_tipo', false, 'tipo', '')
    } catch (e) {
      // Se índice já existir, ignora
    }
    try {
      col.addIndex('idx_atividades_tipo_data', false, 'tipo, data', '')
    } catch (e) {
      // Se índice já existir, ignora
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    try {
      col.removeIndex('idx_atividades_tipo_data')
    } catch (e) {}
    try {
      col.removeIndex('idx_atividades_tipo')
    } catch (e) {}
    app.save(col)
  },
)
