migrate(
  (app) => {
    // Restaurar as conversas que foram indevidamente resolvidas pelo usuário ou teste
    // para status 'em_atendimento', com resolvida_em limpo
    const conversasIds = ['fell002rtx0rrgi', '6xsert52iote5t2', '4yc6gc2w29qcli2']

    for (const id of conversasIds) {
      try {
        const record = app.findFirstRecordByData('whatsapp_conversas', 'id', id)
        if (record && record.getString('status') === 'resolvido') {
          record.set('status', 'em_atendimento')
          record.set('resolvida_em', '')
          app.save(record)
        }
      } catch (err) {
        console.log('Conversa ' + id + ' não encontrada ou erro ao restaurar:', err)
      }
    }
  },
  (app) => {
    // Reverter caso necessário
  },
)
