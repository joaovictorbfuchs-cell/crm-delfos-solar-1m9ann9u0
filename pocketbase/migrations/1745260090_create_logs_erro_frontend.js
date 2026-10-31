migrate(
  (app) => {
    try {
      const existing = app.findCollectionByNameOrId('logs_erro_frontend')
      if (existing) {
        return // idempotente: já existe
      }
    } catch (e) {
      // coleção ainda não existe, prosseguir com criação
    }

    const collection = new Collection({
      name: 'logs_erro_frontend',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      createRule: '', // create ABERTO para logs de crash do frontend mesmo com sessão quebrada
      updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: 'message',
          type: 'text',
          required: false,
        },
        {
          name: 'stack',
          type: 'text',
          required: false,
        },
        {
          name: 'component_stack',
          type: 'text',
          required: false,
        },
        {
          name: 'rota',
          type: 'text',
          required: false,
        },
        {
          name: 'user_agent',
          type: 'text',
          required: false,
        },
        {
          name: 'versao_app',
          type: 'text',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_logs_erro_frontend_created ON logs_erro_frontend (created)',
        'CREATE INDEX idx_logs_erro_frontend_rota ON logs_erro_frontend (rota)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('logs_erro_frontend')
      if (collection) {
        app.delete(collection)
      }
    } catch (e) {
      // no-op se não existir
    }
  },
)
