migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const atividadesCol = app.findCollectionByNameOrId('atividades')

    // 1. Criar coleção notificacoes_internas
    const notificacoesCol = new Collection({
      name: 'notificacoes_internas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['atividade_atrasada', 'lembrete', 'sistema'],
          maxSelect: 1,
        },
        {
          name: 'titulo',
          type: 'text',
          required: true,
        },
        {
          name: 'mensagem',
          type: 'text',
        },
        {
          name: 'atividade_id',
          type: 'relation',
          collectionId: atividadesCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientesCol.id,
          maxSelect: 1,
        },
        {
          name: 'cliente_nome',
          type: 'text',
        },
        {
          name: 'data_prevista',
          type: 'date',
        },
        {
          name: 'dias_atraso',
          type: 'number',
        },
        {
          name: 'lida',
          type: 'bool',
        },
        {
          name: 'lida_em',
          type: 'date',
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativa', 'resolvida', 'arquivada'],
          maxSelect: 1,
        },
        {
          name: 'resolvida_em',
          type: 'date',
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
        'CREATE INDEX idx_notif_tipo ON notificacoes_internas (tipo)',
        'CREATE INDEX idx_notif_atividade_id ON notificacoes_internas (atividade_id)',
        'CREATE INDEX idx_notif_cliente_id ON notificacoes_internas (cliente_id)',
        'CREATE INDEX idx_notif_status ON notificacoes_internas (status)',
        'CREATE INDEX idx_notif_lida ON notificacoes_internas (lida)',
      ],
    })
    app.save(notificacoesCol)

    // 2. Garantir atividade atrasada de exemplo para demonstração (Geison Luis Rigo com data prevista passada e status pendente)
    let geison = null
    try {
      const listGeison = app.findRecordsByFilter(
        'clientes',
        'nome ~ "Geison Luis Rigo" || nome ~ "Geison"',
        'created',
        1,
        0,
      )
      if (listGeison.length > 0) {
        geison = listGeison[0]
      }
    } catch (_) {}

    if (geison) {
      // Data prevista atrasada: 5 dias atrás
      const now = new Date()
      const dataAtrasada = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const tituloDemo = 'Limpeza e Lavagem de Placas (Atrasada)'

      let atvDemo = null
      try {
        const checkAtv = app.findRecordsByFilter(
          'atividades',
          `cliente_id = "${geison.id}" && titulo = "${tituloDemo}"`,
          '',
          1,
          0,
        )
        if (checkAtv.length > 0) {
          atvDemo = checkAtv[0]
        }
      } catch (_) {}

      if (!atvDemo) {
        const novaAtv = new Record(atividadesCol)
        novaAtv.set('cliente_id', geison.id)
        novaAtv.set('tipo', 'limpeza_manutencao')
        novaAtv.set('titulo', tituloDemo)
        novaAtv.set(
          'descricao',
          'Lavagem técnica dos 13 módulos Canadian Solar com água desmineralizada e verificação de sombreamento.',
        )
        novaAtv.set('data', dataAtrasada)
        novaAtv.set('status', 'pendente')
        novaAtv.set('valor_servico', 450)
        novaAtv.set('autor', 'Pós-Venda Delfos')
        novaAtv.set('responsavel_nome', 'Equipe Delfos O&M')
        app.save(novaAtv)
        atvDemo = novaAtv
      }

      // Criar a notificação inicial persistida correspondente se não existir
      if (atvDemo) {
        try {
          const checkNotif = app.findRecordsByFilter(
            'notificacoes_internas',
            `atividade_id = "${atvDemo.id}"`,
            '',
            1,
            0,
          )
          if (!checkNotif || checkNotif.length === 0) {
            const savedNotifCol = app.findCollectionByNameOrId('notificacoes_internas')
            const notif = new Record(savedNotifCol)
            notif.set('tipo', 'atividade_atrasada')
            notif.set('titulo', `Atividade atrasada: ${atvDemo.getString('titulo')}`)
            notif.set(
              'mensagem',
              `A atividade "${atvDemo.getString('titulo')}" do cliente ${geison.getString('nome')} está atrasada há 5 dias.`,
            )
            notif.set('atividade_id', atvDemo.id)
            notif.set('cliente_id', geison.id)
            notif.set('cliente_nome', geison.getString('nome'))
            notif.set('data_prevista', dataAtrasada)
            notif.set('dias_atraso', 5)
            notif.set('lida', false)
            notif.set('status', 'ativa')
            app.save(notif)
          }
        } catch (notifErr) {
          console.log('Erro ao semear notificação inicial:', notifErr)
        }
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('notificacoes_internas')
      app.delete(col)
    } catch (_) {}
  },
)
