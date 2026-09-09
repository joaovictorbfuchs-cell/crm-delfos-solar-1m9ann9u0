migrate(
  (app) => {
    // 1. Atualizar coleção atividades
    const atividades = app.findCollectionByNameOrId('atividades')

    // Atualizar campo 'tipo' para incluir os 12 tipos + os legados (para compatibilidade com dados existentes)
    const existingTipo = atividades.fields.getByName('tipo')
    if (existingTipo) {
      existingTipo.values = [
        'contato_ligacao',
        'reuniao_presencial',
        'follow_up',
        'instalacao',
        'proposta',
        'limpeza_manutencao',
        'auto_leitura_rge',
        'ligar_indicacao',
        'configuracao_datalogger',
        'garantia_equipamento',
        'relatorio_solarview',
        'contato_reativacao',
        'anotacao',
        'ligacao',
        'reuniao',
        'visita_tecnica',
        'mudanca_estagio',
      ]
      existingTipo.maxSelect = 1
    } else {
      atividades.fields.add(
        new SelectField({
          name: 'tipo',
          values: [
            'contato_ligacao',
            'reuniao_presencial',
            'follow_up',
            'instalacao',
            'proposta',
            'limpeza_manutencao',
            'auto_leitura_rge',
            'ligar_indicacao',
            'configuracao_datalogger',
            'garantia_equipamento',
            'relatorio_solarview',
            'contato_reativacao',
            'anotacao',
            'ligacao',
            'reuniao',
            'visita_tecnica',
            'mudanca_estagio',
          ],
          maxSelect: 1,
        }),
      )
    }

    // Adicionar campo 'status' (pendente / concluida)
    if (!atividades.fields.getByName('status')) {
      atividades.fields.add(
        new SelectField({
          name: 'status',
          values: ['pendente', 'concluida', 'cancelada'],
          maxSelect: 1,
        }),
      )
    }

    // Adicionar campo 'responsavel_id' (relação opcional com a coleção users)
    if (!atividades.fields.getByName('responsavel_id')) {
      atividades.fields.add(
        new RelationField({
          name: 'responsavel_id',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    // Adicionar campo 'responsavel_nome' (texto denormalizado para facilidade de exibição)
    if (!atividades.fields.getByName('responsavel_nome')) {
      atividades.fields.add(
        new TextField({
          name: 'responsavel_nome',
        }),
      )
    }

    app.save(atividades)

    // 2. Semear ou atualizar usuários do sistema no _pb_users_auth_
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    const systemUsers = [
      {
        email: 'joao@delfosengenharia.com.br',
        name: 'João Delfos',
        role: 'Comercial & Vendas',
      },
      {
        email: 'carlos@delfosengenharia.com.br',
        name: 'Carlos Mendes',
        role: 'Engenheiro Técnico',
      },
      {
        email: 'fernanda@delfosengenharia.com.br',
        name: 'Fernanda Lima',
        role: 'Pós-Venda & Operações',
      },
    ]

    const userRecords = {}

    for (const u of systemUsers) {
      try {
        const existing = app.findAuthRecordByEmail('_pb_users_auth_', u.email)
        // Se já existe e nome não está preenchido, atualiza o nome
        if (u.name && (!existing.get('name') || existing.get('name') === 'Admin')) {
          existing.set('name', u.name)
          app.save(existing)
        }
        userRecords[u.email] = existing
      } catch (_) {
        // Criar usuário novo
        const record = new Record(usersCol)
        record.setEmail(u.email)
        record.setPassword('Skip@Pass')
        record.setVerified(true)
        record.set('name', u.name)
        app.save(record)
        userRecords[u.email] = record
      }
    }

    // 3. Semear atividades dos 12 tipos distribuídas entre os 3 usuários
    // Buscamos clientes para associar
    const clients = app.findRecordsByFilter('clientes', '', 'created', 10, 0)
    const c1 = clients.length > 0 ? clients[0].id : null
    const c2 = clients.length > 1 ? clients[1].id : c1
    const c3 = clients.length > 2 ? clients[2].id : c1
    const c4 = clients.length > 3 ? clients[3].id : c1

    const joaoId = userRecords['joao@delfosengenharia.com.br']?.id || ''
    const carlosId = userRecords['carlos@delfosengenharia.com.br']?.id || ''
    const fernandaId = userRecords['fernanda@delfosengenharia.com.br']?.id || ''

    // Datas calculadas em torno de hoje
    const now = new Date()
    const formatDateOffset = (days, hours, mins = 0) => {
      const d = new Date(now)
      d.setDate(d.getDate() + days)
      d.setHours(hours, mins, 0, 0)
      return d.toISOString()
    }

    const sampleAtividades = [
      {
        tipo: 'contato_ligacao',
        titulo: 'Entrar em contato - Ligação',
        descricao:
          'Ligar para confirmar dados da fatura RGE e agendar apresentação da proposta de 12 kWp.',
        cliente_id: c1,
        responsavel_id: joaoId,
        responsavel_nome: 'João Delfos',
        status: 'pendente',
        data: formatDateOffset(0, 14, 30), // Hoje à tarde
        autor: 'João Delfos',
      },
      {
        tipo: 'reuniao_presencial',
        titulo: 'Reunião Presencial',
        descricao:
          'Apresentação comercial e simulação financeira de economia para os sócios da empresa.',
        cliente_id: c1,
        responsavel_id: joaoId,
        responsavel_nome: 'João Delfos',
        status: 'pendente',
        data: formatDateOffset(1, 10, 0), // Amanhã
        autor: 'João Delfos',
      },
      {
        tipo: 'follow_up',
        titulo: 'Follow-up',
        descricao: 'Verificar retorno da análise de crédito bancário junto à cooperativa Sicredi.',
        cliente_id: c2,
        responsavel_id: joaoId,
        responsavel_nome: 'João Delfos',
        status: 'pendente',
        data: formatDateOffset(2, 11, 0), // Depois de amanhã
        autor: 'João Delfos',
      },
      {
        tipo: 'instalacao',
        titulo: 'Instalação',
        descricao:
          'Acompanhar início da montagem das estruturas e fixação dos trilhos no telhado metálico.',
        cliente_id: c3,
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        status: 'pendente',
        data: formatDateOffset(3, 8, 30),
        autor: 'Carlos Mendes',
      },
      {
        tipo: 'proposta',
        titulo: 'Proposta',
        descricao:
          'Elaborar e enviar proposta revisada com 24 módulos Trina Solar de 445W e inversor trifásico.',
        cliente_id: c2,
        responsavel_id: joaoId,
        responsavel_nome: 'João Delfos',
        status: 'concluida',
        data: formatDateOffset(-2, 16, 0), // Passada concluída
        autor: 'João Delfos',
      },
      {
        tipo: 'limpeza_manutencao',
        titulo: 'Limpeza e Manutenção',
        descricao:
          'Lavagem com água desmineralizada e verificação de reaperto das conexões MC4 da usina.',
        cliente_id: c4,
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        status: 'pendente',
        data: formatDateOffset(4, 9, 0),
        autor: 'Carlos Mendes',
      },
      {
        tipo: 'auto_leitura_rge',
        titulo: 'Auto Leitura - RGE',
        descricao:
          'Registrar fotos dos medidores bidirecionais da concessionária RGE para conferência de créditos injetados.',
        cliente_id: c3,
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        status: 'concluida',
        data: formatDateOffset(-1, 15, 0), // Passada concluída
        autor: 'Fernanda Lima',
      },
      {
        tipo: 'ligar_indicacao',
        titulo: 'Ligar para solicitar Indicação',
        descricao:
          'Cliente completou 90 dias com o sistema gerando 15% acima da meta estimada. Pedir contato de vizinhos e parceiros.',
        cliente_id: c3,
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        status: 'pendente',
        data: formatDateOffset(1, 14, 0),
        autor: 'Fernanda Lima',
      },
      {
        tipo: 'configuracao_datalogger',
        titulo: 'Configuração Datalogger',
        descricao:
          'Parear o Wi-Fi do inversor Fronius à rede interna e validar leitura de telemetria em tempo real.',
        cliente_id: c1,
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        status: 'concluida',
        data: formatDateOffset(-3, 10, 0),
        autor: 'Carlos Mendes',
      },
      {
        tipo: 'garantia_equipamento',
        titulo: 'Garantia de equipamento',
        descricao:
          'Acionar suporte do fabricante do inversor para RMA de placa de controle com falha de comunicação.',
        cliente_id: c4,
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        status: 'pendente',
        data: formatDateOffset(5, 14, 30),
        autor: 'Carlos Mendes',
      },
      {
        tipo: 'relatorio_solarview',
        titulo: 'Fazer Relatório Solarview',
        descricao:
          'Emitir relatório de performance mensal da usina fotovoltaica e enviar PDF com balanço de economia ao cliente.',
        cliente_id: c4,
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        status: 'pendente',
        data: formatDateOffset(2, 16, 30),
        autor: 'Fernanda Lima',
      },
      {
        tipo: 'contato_reativacao',
        titulo: 'Contato para Reativação',
        descricao:
          'Retomar contato com cliente que havia pausado negociação há 60 dias devido a readequação de orçamento.',
        cliente_id: c2,
        responsavel_id: joaoId,
        responsavel_nome: 'João Delfos',
        status: 'pendente',
        data: formatDateOffset(6, 11, 30),
        autor: 'João Delfos',
      },
    ]

    for (const item of sampleAtividades) {
      if (!item.cliente_id) continue

      // Evita duplicatas verificando titulo e tipo
      try {
        const found = app.findRecordsByFilter(
          'atividades',
          `tipo='${item.tipo}' && titulo='${item.titulo.replace(/'/g, "\\'")}'`,
          'created',
          1,
          0,
        )
        if (found && found.length > 0) continue
      } catch (_) {}

      try {
        const record = new Record(atividades)
        record.set('tipo', item.tipo)
        record.set('titulo', item.titulo)
        record.set('descricao', item.descricao)
        record.set('cliente_id', item.cliente_id)
        if (item.responsavel_id) record.set('responsavel_id', item.responsavel_id)
        if (item.responsavel_nome) record.set('responsavel_nome', item.responsavel_nome)
        record.set('status', item.status)
        record.set('data', item.data)
        record.set('autor', item.autor)
        app.save(record)
      } catch (err) {
        console.log('Erro ao semear atividade:', item.titulo, err)
      }
    }
  },
  (app) => {
    // Reverter campos se necessário
    try {
      const atividades = app.findCollectionByNameOrId('atividades')
      const fields = ['status', 'responsavel_id', 'responsavel_nome']
      for (const f of fields) {
        const fld = atividades.fields.getByName(f)
        if (fld) atividades.fields.remove(fld)
      }
      app.save(atividades)
    } catch (_) {}
  },
)
