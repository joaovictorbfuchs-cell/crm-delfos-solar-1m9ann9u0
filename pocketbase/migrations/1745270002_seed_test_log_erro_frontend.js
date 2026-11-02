migrate(
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('logs_erro_frontend')
      if (!collection) return

      const testRecord = new Record(collection)
      testRecord.set(
        'mensagem',
        '[Teste Verificação v0.0.1545] Registro de prova de telemetria frontend',
      )
      testRecord.set(
        'message',
        '[Teste Verificação v0.0.1545] Registro de prova de telemetria frontend',
      )
      testRecord.set(
        'stack',
        'Error: Teste\n    at ErrorBoundary (src/components/ErrorBoundary.tsx:75)',
      )
      testRecord.set('component_stack', '\n    in ExecucaoOS\n    in ErrorBoundary')
      testRecord.set('rota', '/servicos-campo')
      testRecord.set('usuario_id', 'sistema_qa')
      testRecord.set('usuario_email', 'admin@delfos.eng.br')
      testRecord.set('userAgent', 'Mozilla/5.0 QA Engine')
      testRecord.set('user_agent', 'Mozilla/5.0 QA Engine')
      testRecord.set('versao_app', '1.0.0')
      testRecord.set('metadata', {
        origem: 'teste_validacao_schema',
        timestamp: new Date().toISOString(),
      })

      app.save(testRecord)
      console.log('Registro de teste criado em logs_erro_frontend com id:', testRecord.id)
    } catch (e) {
      console.log('Erro ao criar registro de teste em logs_erro_frontend:', e)
    }
  },
  (app) => {
    // no-op down
  },
)
