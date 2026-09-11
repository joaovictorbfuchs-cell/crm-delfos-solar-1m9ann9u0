migrate(
  (app) => {
    const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
    const statusField = msgsCol.fields.getByName('status')

    if (statusField) {
      // Atualizar lista de valores aceitos para incluir 'lida'
      // Preservando 'pendente', 'agendada', 'enviada', 'entregue', 'lida', 'falha'
      const currentValues = statusField.values || []
      if (!currentValues.includes('lida')) {
        statusField.values = ['pendente', 'agendada', 'enviada', 'entregue', 'lida', 'falha']
        statusField.maxSelect = 1
        app.save(msgsCol)
      }
    }
  },
  (app) => {
    try {
      const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
      const statusField = msgsCol.fields.getByName('status')
      if (statusField) {
        statusField.values = ['pendente', 'agendada', 'enviada', 'entregue', 'falha']
        app.save(msgsCol)
      }
    } catch (_) {}
  },
)
