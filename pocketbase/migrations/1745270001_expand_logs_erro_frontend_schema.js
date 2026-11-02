migrate(
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('logs_erro_frontend')
      if (!collection) return

      // Garantir que createRule seja aberta (qualquer usuário/anônimo reportando erro do frontend)
      collection.createRule = ''

      // Garantir que os campos mensagem, stack, component_stack, rota, usuario_id, usuario_email, userAgent, metadata existam
      const camposDesejados = [
        { name: 'mensagem', type: 'text' },
        { name: 'stack', type: 'text' },
        { name: 'component_stack', type: 'text' },
        { name: 'rota', type: 'text' },
        { name: 'usuario_id', type: 'text' },
        { name: 'usuario_email', type: 'text' },
        { name: 'userAgent', type: 'text' },
        { name: 'metadata', type: 'json' },
      ]

      for (const campo of camposDesejados) {
        const fieldName = campo.name
        if (!collection.fields.getByName(fieldName)) {
          if (campo.type === 'json') {
            collection.fields.add(
              new JSONField({
                name: fieldName,
                required: false,
              }),
            )
          } else {
            collection.fields.add(
              new TextField({
                name: fieldName,
                required: false,
              }),
            )
          }
        }
      }

      app.save(collection)
    } catch (err) {
      console.log('Erro ao atualizar schema logs_erro_frontend:', err)
    }
  },
  (app) => {
    // no-op down
  },
)
