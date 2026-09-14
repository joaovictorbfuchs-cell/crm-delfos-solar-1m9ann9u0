migrate(
  (app) => {
    // 0072: Transfere todos os clientes que estão como 'Novo Lead' no funil comercial para clientes regulares
    try {
      const agora = new Date().toISOString()
      const atividadesCol = app.findCollectionByNameOrId('atividades')

      // Busca todos os clientes com status 'Novo Lead' e transferido_pos_vendas = false
      const leads = app.findRecordsByFilter(
        'clientes',
        "status = 'Novo Lead' && transferido_pos_vendas = false",
        '-created',
        0,
        0,
      )

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i]

        // Marca como transferido e preenche dados para que saia do funil comercial e figure como cliente regular
        lead.set('transferido_pos_vendas', true)
        lead.set('data_transferencia_pos_vendas', agora)
        lead.set('origem_pos_vendas', 'funil_comercial')
        if (!lead.getString('data_fechamento')) {
          lead.set('data_fechamento', agora)
        }
        app.save(lead)

        // Registra atividade na timeline do cliente para rastreabilidade
        try {
          const ativ = new Record(atividadesCol)
          ativ.set('cliente_id', lead.id)
          ativ.set('tipo', 'mudanca_estagio')
          ativ.set('titulo', 'Cliente transferido do funil comercial')
          ativ.set(
            'descricao',
            'Cliente cadastrado a partir do funil comercial e integrado à base de clientes.',
          )
          ativ.set('data', agora)
          ativ.set('status', 'concluida')
          ativ.set('autor', 'CRM Delfos Solar')
          ativ.set('responsavel_nome', 'CRM Delfos Solar')
          app.save(ativ)
        } catch (ativErr) {
          console.warn('Erro ao criar atividade para cliente transferido:', lead.id, ativErr)
        }
      }
    } catch (err) {
      console.warn('Erro ao transferir Novo Lead na migration 0072:', err)
      throw err
    }
  },
  (app) => {
    // Rollback: desfaz a marcação de transferência se necessário
    try {
      app
        .db()
        .newQuery(
          "UPDATE clientes SET transferido_pos_vendas = false, data_transferencia_pos_vendas = '' WHERE status = 'Novo Lead' AND origem_pos_vendas = 'funil_comercial'",
        )
        .execute()
    } catch (err) {
      console.warn('Erro no rollback da migration 0072:', err)
    }
  },
)
