migrate(
  (app) => {
    // Testar atualização: transferir a OS teste 'jgk4c5ufxxjudvu' para Carlos Silva (75jdtcrywf6gsn2 / phone: 54999990001)
    try {
      const os = app.findFirstRecordByData('ordens_servico', 'id', 'jgk4c5ufxxjudvu')
      os.set('responsavel_usuario_id', '75jdtcrywf6gsn2') // Carlos Silva
      os.set('atribuida_a', 'Carlos Silva')
      app.save(os)
      console.log('OS teste transferida para Carlos Silva com sucesso')
    } catch (err) {
      console.log('Erro ao atualizar OS teste:', err)
    }
  },
  (app) => {},
)
