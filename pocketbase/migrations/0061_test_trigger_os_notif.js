migrate(
  (app) => {
    // Dispara teste: cria uma OS de teste atribuída a Anderson Pereira (t6amwl3tlwy0noq) para testar o hook onRecordAfterCreateSuccess
    // e depois atualiza o responsável de uma OS para testar o hook onRecordAfterUpdateSuccess
    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      const cliente = app.findFirstRecordByData('clientes', 'status', 'Fechado')

      const testOS = new Record(osCol)
      testOS.set('cliente_id', cliente.id)
      testOS.set('tipo_servico', 'Manutenção')
      testOS.set('endereco', 'Rua de Teste Solar, 100, Centro, Erechim/RS')
      testOS.set('data_agendada', new Date().toISOString())
      testOS.set('status', 'pendente')
      testOS.set('responsavel_usuario_id', 't6amwl3tlwy0noq') // Anderson Pereira (phone: 54999990002)
      testOS.set('atribuida_a', 'Anderson Pereira')
      testOS.set('instrucoes', 'OS de validação automática da notificação WhatsApp Z-API.')
      app.save(testOS)

      console.log('OS de teste criada com ID:', testOS.id)
    } catch (err) {
      console.log('Erro ao criar OS de teste na migração:', err)
    }
  },
  (app) => {
    try {
      const osList = app.findRecordsByFilter(
        'ordens_servico',
        "instrucoes ~ 'OS de validação automática'",
        '',
        10,
        0,
      )
      for (const os of osList) {
        app.delete(os)
      }
    } catch (_) {}
  },
)
