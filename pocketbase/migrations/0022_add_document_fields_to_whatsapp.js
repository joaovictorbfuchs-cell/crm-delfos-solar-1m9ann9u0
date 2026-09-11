migrate(
  (app) => {
    const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')

    if (!msgsCol.fields.getByName('tipo_mensagem')) {
      msgsCol.fields.add(
        new TextField({
          name: 'tipo_mensagem',
          required: false,
        }),
      )
    }

    if (!msgsCol.fields.getByName('nome_arquivo')) {
      msgsCol.fields.add(
        new TextField({
          name: 'nome_arquivo',
          required: false,
        }),
      )
    }

    if (!msgsCol.fields.getByName('documento_url')) {
      msgsCol.fields.add(
        new TextField({
          name: 'documento_url',
          required: false,
        }),
      )
    }

    app.save(msgsCol)
  },
  (app) => {
    try {
      const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
      if (msgsCol.fields.getByName('tipo_mensagem')) {
        msgsCol.fields.removeByName('tipo_mensagem')
      }
      if (msgsCol.fields.getByName('nome_arquivo')) {
        msgsCol.fields.removeByName('nome_arquivo')
      }
      if (msgsCol.fields.getByName('documento_url')) {
        msgsCol.fields.removeByName('documento_url')
      }
      app.save(msgsCol)
    } catch (_) {}
  },
)
