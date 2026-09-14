migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Campo responsavel_id (relation para users)
    if (!clientes.fields.getByName('responsavel_id')) {
      clientes.fields.add(
        new RelationField({
          name: 'responsavel_id',
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // 2. Campo responsavel_nome (texto denormalizado)
    if (!clientes.fields.getByName('responsavel_nome')) {
      clientes.fields.add(
        new TextField({
          name: 'responsavel_nome',
          required: false,
        }),
      )
    }

    // 3. Campo data_previsao_fechamento (date)
    if (!clientes.fields.getByName('data_previsao_fechamento')) {
      clientes.fields.add(
        new DateField({
          name: 'data_previsao_fechamento',
          required: false,
        }),
      )
    }

    // 4. Campo arquivado (bool)
    if (!clientes.fields.getByName('arquivado')) {
      clientes.fields.add(
        new BoolField({
          name: 'arquivado',
          required: false,
        }),
      )
    }

    app.save(clientes)

    // 5. Atualizar registros existentes com dados de exemplo realistas de responsáveis e previsão de fechamento
    // e garantir pelo menos 8 negócios distribuídos pelas diferentes etapas do funil
    try {
      let joaoUser = null
      let carlosUser = null
      let andersonUser = null

      try {
        joaoUser = app.findAuthRecordByEmail('_pb_users_auth_', 'joao@delfosengenharia.com.br')
      } catch (_) {}
      try {
        carlosUser = app.findAuthRecordByEmail(
          '_pb_users_auth_',
          'carlos.instalador@delfosengenharia.com.br',
        )
      } catch (_) {}
      try {
        andersonUser = app.findAuthRecordByEmail(
          '_pb_users_auth_',
          'anderson.instalador@delfosengenharia.com.br',
        )
      } catch (_) {}

      const joaoId = joaoUser ? joaoUser.id : ''
      const joaoNome = joaoUser
        ? joaoUser.getString('name') || 'João Victor Bagetti Fuchs'
        : 'João Fuchs'
      const carlosId = carlosUser ? carlosUser.id : ''
      const carlosNome = carlosUser
        ? carlosUser.getString('name') || 'Carlos Silva'
        : 'Carlos Silva'
      const andersonId = andersonUser ? andersonUser.id : ''
      const andersonNome = andersonUser
        ? andersonUser.getString('name') || 'Anderson Pereira'
        : 'Anderson Pereira'

      // Previsões de datas futuras relativas
      const d1 = new Date(Date.now() + 7 * 86400000).toISOString()
      const d2 = new Date(Date.now() + 15 * 86400000).toISOString()
      const d3 = new Date(Date.now() + 25 * 86400000).toISOString()
      const d4 = new Date(Date.now() + 40 * 86400000).toISOString()
      const d5 = new Date(Date.now() - 5 * 86400000).toISOString() // Já fechado recentemente
      const d6 = new Date(Date.now() + 60 * 86400000).toISOString()

      // Amostra de negócios a enriquecer com previsões, valores e responsáveis
      const seedsUpdates = [
        {
          matchName: 'Mariana de Oliveira Silveira',
          status: 'Levantamento',
          valor: 26800,
          pot: 6.5,
          cidade: 'Passo Fundo/RS',
          respId: joaoId,
          respNome: joaoNome,
          previsao: d2,
        },
        {
          matchName: 'Fernanda Ribeiro',
          status: 'Orçamento',
          valor: 38200,
          pot: 8.0,
          cidade: 'Erechim/RS',
          respId: carlosId,
          respNome: carlosNome,
          previsao: d1,
        },
        {
          matchName: 'Ana Paula Martins',
          status: 'Orçamento',
          valor: 72800,
          pot: 15.0,
          cidade: 'Chapecó/SC',
          respId: joaoId,
          respNome: joaoNome,
          previsao: d3,
        },
        {
          matchName: 'João Pedro Oliveira',
          status: 'Negociação',
          valor: 24900,
          pot: 5.0,
          cidade: 'Passo Fundo/RS',
          respId: andersonId,
          respNome: andersonNome,
          previsao: d1,
        },
        {
          matchName: 'Solar do Alto Vale',
          status: 'Negociação',
          valor: 295000,
          pot: 75.0,
          cidade: 'Erechim/RS',
          respId: joaoId,
          respNome: joaoNome,
          previsao: d2,
        },
        {
          matchName: 'Ricardo Alves',
          status: 'Contato Futuro',
          valor: 47300,
          pot: 10.0,
          cidade: 'Erechim/RS',
          respId: carlosId,
          respNome: carlosNome,
          previsao: d6,
        },
        {
          matchName: 'Maria Santos',
          status: 'Fechado',
          valor: 58500,
          pot: 12.0,
          cidade: 'Erechim/RS',
          respId: joaoId,
          respNome: joaoNome,
          previsao: d5,
        },
        {
          matchName: 'Marcelo Becker',
          status: 'Fechado',
          valor: 125000,
          pot: 43.5,
          cidade: 'Passo Fundo/RS',
          respId: andersonId,
          respNome: andersonNome,
          previsao: d5,
        },
        {
          matchName: 'Master ATS Supermercados',
          status: 'Novo Lead',
          valor: 85000,
          pot: 22.0,
          cidade: 'Erechim/RS',
          respId: joaoId,
          respNome: joaoNome,
          previsao: d4,
        },
        {
          matchName: 'Academia Pro Gym',
          status: 'Novo Lead',
          valor: 42000,
          pot: 11.5,
          cidade: 'Erechim/RS',
          respId: carlosId,
          respNome: carlosNome,
          previsao: d3,
        },
        {
          matchName: 'PATRICK RECH RAMOS',
          status: 'Levantamento',
          valor: 31500,
          pot: 7.2,
          cidade: 'Passo Fundo/RS',
          respId: andersonId,
          respNome: andersonNome,
          previsao: d2,
        },
      ]

      for (const item of seedsUpdates) {
        try {
          const records = app.findRecordsByFilter(
            'clientes',
            `nome ~ '${item.matchName}'`,
            '-created',
            1,
            0,
          )
          if (records.length > 0) {
            const rec = records[0]
            if (item.status) rec.set('status', item.status)
            if (item.valor) rec.set('valor_estimado', item.valor)
            if (item.pot) rec.set('potencia_kwp', item.pot)
            if (item.cidade) rec.set('cidade', item.cidade)
            if (item.respId) rec.set('responsavel_id', item.respId)
            if (item.respNome) rec.set('responsavel_nome', item.respNome)
            if (item.previsao) rec.set('data_previsao_fechamento', item.previsao)
            rec.set('arquivado', false)
            app.save(rec)
          }
        } catch (e) {
          console.warn('Erro ao atualizar seed cliente comercial:', e)
        }
      }
    } catch (seedErr) {
      console.warn('Aviso geral na seed de campos comerciais:', seedErr)
    }
  },
  (app) => {
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      if (clientes.fields.getByName('responsavel_id'))
        clientes.fields.removeByName('responsavel_id')
      if (clientes.fields.getByName('responsavel_nome'))
        clientes.fields.removeByName('responsavel_nome')
      if (clientes.fields.getByName('data_previsao_fechamento'))
        clientes.fields.removeByName('data_previsao_fechamento')
      if (clientes.fields.getByName('arquivado')) clientes.fields.removeByName('arquivado')
      app.save(clientes)
    } catch (_) {}
  },
)
