migrate(
  (app) => {
    // Desativar/remover cron settings da rotina auto_leitura_rge_cron se existir
    try {
      const cronSettings = app.findFirstRecordByData(
        '_cron_settings',
        'job',
        'auto_leitura_rge_cron',
      )
      cronSettings.set('disabled', true)
      app.save(cronSettings)
    } catch (_) {
      // Ignora se não existir
    }

    // Desativar ou remover qualquer regra de automação no banco relacionada a auto leitura
    try {
      const automacoesCol = app.findCollectionByNameOrId('automacoes')
      const regrasAutoLeitura = app.findRecordsByFilter(
        automacoesCol.id,
        "nome ~ 'Auto Leitura' || nome ~ 'auto leitura' || configuracao_acao ~ 'auto_leitura_rge'",
        '-created',
        100,
        0,
      )
      for (let i = 0; i < regrasAutoLeitura.length; i++) {
        const regra = regrasAutoLeitura[i]
        regra.set('ativa', false)
        app.save(regra)
      }
    } catch (_) {}

    // Se houver algum lembrete pendente criado para o cliente de teste (Delfos Engenharia Ltda, cliente_id 50vyppm3qwwuz62), remover
    try {
      const atvCol = app.findCollectionByNameOrId('atividades')
      const lembretesTeste = app.findRecordsByFilter(
        atvCol.id,
        "cliente_id = '50vyppm3qwwuz62' && titulo ~ 'Lembrete Auto Leitura'",
        '-created',
        50,
        0,
      )
      for (let j = 0; j < lembretesTeste.length; j++) {
        app.delete(lembretesTeste[j])
      }
    } catch (_) {}
  },
  (app) => {
    // rollbacknoop
  },
)
