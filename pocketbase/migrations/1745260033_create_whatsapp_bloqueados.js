migrate(
  (app) => {
    let bloqueadosCol
    try {
      bloqueadosCol = app.findCollectionByNameOrId('whatsapp_bloqueados')
    } catch (_) {
      bloqueadosCol = new Collection({
        name: 'whatsapp_bloqueados',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'numero', type: 'text', required: true },
          { name: 'data_bloqueio', type: 'date', required: false },
          { name: 'usuario_bloqueou_id', type: 'text', required: false },
          { name: 'usuario_bloqueou_nome', type: 'text', required: false },
          { name: 'motivo', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_whatsapp_bloqueados_numero ON whatsapp_bloqueados (numero)'],
      })
      app.save(bloqueadosCol)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('whatsapp_bloqueados')
      app.delete(col)
    } catch (_) {}
  },
)
