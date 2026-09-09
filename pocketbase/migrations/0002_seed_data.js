migrate(
  (app) => {
    // 1. Seed user joao@delfosengenharia.com.br
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let joaoUser
    try {
      joaoUser = app.findAuthRecordByEmail('_pb_users_auth_', 'joao@delfosengenharia.com.br')
    } catch (_) {
      joaoUser = new Record(users)
      joaoUser.setEmail('joao@delfosengenharia.com.br')
      joaoUser.setPassword('Skip@Pass')
      joaoUser.setVerified(true)
      joaoUser.set('name', 'João Silva')
      app.save(joaoUser)
    }

    const clientesCol = app.findCollectionByNameOrId('clientes')
    const manutencoesCol = app.findCollectionByNameOrId('manutencoes')
    const atividadesCol = app.findCollectionByNameOrId('atividades')

    // Helper to upsert client
    const upsertCliente = (clientData) => {
      let rec
      try {
        rec = app.findFirstRecordByData('clientes', 'uc', clientData.uc)
      } catch (_) {
        rec = new Record(clientesCol)
      }
      for (const key in clientData) {
        rec.set(key, clientData[key])
      }
      app.save(rec)
      return rec
    }

    // Seed 7 clients
    // 1. Maria Santos — Erechim/RS — 12 kWp — R$ 58.500 — Negociação
    const c1 = upsertCliente({
      nome: 'Maria Santos',
      telefone: '(54) 99812-3456',
      endereco: 'Rua Itália, 450, Centro',
      uc: '3012847561',
      cidade: 'Erechim/RS',
      potencia_kwp: 12,
      valor_estimado: 58500,
      status: 'Negociação',
      data_instalacao: '2024-03-15 10:00:00.000Z',
      inversor_marca: 'Fronius',
      inversor_modelo: 'Fronius Symo 12.0-3-M',
      placas_qtd: 30,
      placas_marca: 'Canadian Solar 400W',
      telhado_tipo: 'metalico',
    })

    // 2. João Pedro Oliveira — Passo Fundo/RS — 5 kWp — R$ 24.900 — Orçamento Enviado
    const c2 = upsertCliente({
      nome: 'João Pedro Oliveira',
      telefone: '(54) 99123-7890',
      endereco: 'Av. Brasil Oeste, 1280, Boqueirão',
      uc: '4029318756',
      cidade: 'Passo Fundo/RS',
      potencia_kwp: 5,
      valor_estimado: 24900,
      status: 'Orçamento Enviado',
      data_instalacao: '2024-11-22 10:00:00.000Z',
      inversor_marca: 'Growatt',
      inversor_modelo: 'Growatt MIN 5000TL-X',
      placas_qtd: 12,
      placas_marca: 'Trina Solar 445W',
      telhado_tipo: 'ceramico',
    })

    // 3. Carlos Alberto Lima — Chapecó/SC — 75 kWp — R$ 312.000 — Fechado
    const c3 = upsertCliente({
      nome: 'Carlos Alberto Lima',
      telefone: '(49) 99934-5678',
      endereco: 'Av. Getúlio Vargas, 2100, Centro',
      uc: '5832947610',
      cidade: 'Chapecó/SC',
      potencia_kwp: 75,
      valor_estimado: 312000,
      status: 'Fechado',
      data_instalacao: '2025-02-08 10:00:00.000Z',
      inversor_marca: 'Huawei',
      inversor_modelo: 'Huawei SUN2000-75KTL-M3',
      placas_qtd: 200,
      placas_marca: 'JA Solar 375W',
      telhado_tipo: 'laje',
    })

    // 4. Fernanda Ribeiro — Erechim/RS — 8 kWp — R$ 38.200 — Proposta
    const c4 = upsertCliente({
      nome: 'Fernanda Ribeiro',
      telefone: '(54) 99654-3210',
      endereco: 'Rua Valentim Zambonatto, 310, Fátima',
      uc: '6791283450',
      cidade: 'Erechim/RS',
      potencia_kwp: 8,
      valor_estimado: 38200,
      status: 'Proposta',
      data_instalacao: '2024-04-30 10:00:00.000Z',
      inversor_marca: 'Fronius',
      inversor_modelo: 'Fronius Primo 8.0-1',
      placas_qtd: 20,
      placas_marca: 'Hanwha Q Cells 400W',
      telhado_tipo: 'fibrocimento',
    })

    // 5. Empresa Delfos Agroindustrial — Passo Fundo/RS — 150 kWp — R$ 615.000 — Fechado
    const c5 = upsertCliente({
      nome: 'Empresa Delfos Agroindustrial',
      telefone: '(54) 3311-8899',
      endereco: 'Rodovia RS 153, Km 5, Distrito Industrial',
      uc: '8901234567',
      cidade: 'Passo Fundo/RS',
      potencia_kwp: 150,
      valor_estimado: 615000,
      status: 'Fechado',
      data_instalacao: '2025-01-17 10:00:00.000Z',
      inversor_marca: 'SMA',
      inversor_modelo: 'SMA Sunny Tripower 15000TL',
      placas_qtd: 340,
      placas_marca: 'Trina Solar 440W',
      telhado_tipo: 'metalico',
    })

    // 6. Ana Paula Martins — Chapecó/SC — 15 kWp — R$ 72.800 — Lead
    const c6 = upsertCliente({
      nome: 'Ana Paula Martins',
      telefone: '(49) 98877-6655',
      endereco: 'Rua Fernando Machado, 890, Santa Maria',
      uc: '1098765432',
      cidade: 'Chapecó/SC',
      potencia_kwp: 15,
      valor_estimado: 72800,
      status: 'Lead',
      data_instalacao: '2024-09-21 10:00:00.000Z',
      inversor_marca: 'Growatt',
      inversor_modelo: 'Growatt MID 15KTL3-X',
      placas_qtd: 36,
      placas_marca: 'Canadian Solar 415W',
      telhado_tipo: 'ceramico',
    })

    // 7. Ricardo Alves — Erechim/RS — 10 kWp — R$ 47.300 — Perdido
    const c7 = upsertCliente({
      nome: 'Ricardo Alves',
      telefone: '(54) 99188-4422',
      endereco: 'Rua Marechal Floriano, 750, Bela Vista',
      uc: '9081726354',
      cidade: 'Erechim/RS',
      potencia_kwp: 10,
      valor_estimado: 47300,
      status: 'Perdido',
      data_instalacao: '2024-06-03 10:00:00.000Z',
      inversor_marca: 'Huawei',
      inversor_modelo: 'Huawei SUN2000-10KTL-M1',
      placas_qtd: 24,
      placas_marca: 'JA Solar 410W',
      telhado_tipo: 'laje',
    })

    // Add Manutenções
    const addManutencao = (clienteId, data, tipo, status, tecnico, descricao) => {
      try {
        const existing = app.findRecordsByFilter(
          'manutencoes',
          `cliente_id = "${clienteId}" && tipo = "${tipo}" && data ~ "${data.slice(0, 10)}"`,
          '-created',
          1,
          0,
        )
        if (existing.length > 0) return existing[0]
      } catch (_) {}

      const rec = new Record(manutencoesCol)
      rec.set('cliente_id', clienteId)
      rec.set('data', data)
      rec.set('tipo', tipo)
      rec.set('status', status)
      rec.set('tecnico', tecnico)
      rec.set('descricao', descricao)
      app.save(rec)
      return rec
    }

    // Carlos Alberto Lima (c3): Revisão elétrica semestral (Concluída, Rafael Souza)
    addManutencao(
      c3.id,
      '2025-05-10 14:00:00.000Z',
      'Revisão Elétrica',
      'Concluído',
      'Rafael Souza',
      'Verificação de conexões, torque em parafusos e limpeza de contatos',
    )

    // Delfos Agroindustrial (c5): Troca de inversor (Concluída, Marcos Lima)
    addManutencao(
      c5.id,
      '2025-04-18 09:30:00.000Z',
      'Troca de Inversor',
      'Concluído',
      'Marcos Lima',
      'Substituição do inversor principal por falha no display',
    )

    // Ricardo Alves (c7): Limpeza de placas (Em andamento, Rafael Souza)
    addManutencao(
      c7.id,
      '2025-06-02 11:00:00.000Z',
      'Limpeza',
      'Em andamento',
      'Rafael Souza',
      'Limpeza de acúmulo de poeira e verificação de sujeira sob placas',
    )

    // Historical / scheduled maintenances for other clients (so every client has realistic maintenance history)
    addManutencao(
      c1.id,
      '2024-09-12 10:00:00.000Z',
      'Revisão Elétrica',
      'Concluído',
      'Marcos Lima',
      'Inspeção técnica preventiva pós-instalação e aferição de geração nominal',
    )

    addManutencao(
      c2.id,
      '2025-06-15 08:30:00.000Z',
      'Limpeza',
      'Agendado',
      'Rafael Souza',
      'Limpeza periódica de inverno para remoção de fuligem e detritos',
    )

    addManutencao(
      c4.id,
      '2024-10-05 15:00:00.000Z',
      'Limpeza',
      'Concluído',
      'Rafael Souza',
      'Lavagem com água deionizada e inspeção visual da estrutura de fixação',
    )

    addManutencao(
      c6.id,
      '2025-06-20 14:00:00.000Z',
      'Revisão Elétrica',
      'Agendado',
      'Marcos Lima',
      'Vistoria do padrão de entrada e compatibilidade com rede distribuidora RGE',
    )

    // Add Atividades
    const addAtividade = (clienteId, data, descricao) => {
      try {
        const existing = app.findRecordsByFilter(
          'atividades',
          `cliente_id = "${clienteId}" && descricao = "${descricao}"`,
          '-created',
          1,
          0,
        )
        if (existing.length > 0) return existing[0]
      } catch (_) {}

      const rec = new Record(atividadesCol)
      rec.set('cliente_id', clienteId)
      rec.set('data', data)
      rec.set('descricao', descricao)
      app.save(rec)
      return rec
    }

    addAtividade(c1.id, '2025-06-05 09:00:00.000Z', 'Proposta final enviada, aguardando assinatura')
    addAtividade(c2.id, '2025-06-10 14:00:00.000Z', 'Agendar visita técnica de pré-instalação')
    addAtividade(c3.id, '2025-06-18 10:00:00.000Z', 'Limpeza de placas trimestral')
    addAtividade(
      c4.id,
      '2025-06-07 11:30:00.000Z',
      'Enviar proposta revisada com condições de pagamento',
    )
    addAtividade(c5.id, '2025-07-12 08:00:00.000Z', 'Revisão elétrica anual')
    addAtividade(
      c6.id,
      '2025-06-09 16:00:00.000Z',
      'Primeiro contato realizado, agendar apresentação comercial',
    )
    addAtividade(c7.id, '2025-06-11 13:30:00.000Z', 'Retorno comercial após proposta recusada')
  },
  (app) => {
    // down migration
    try {
      const clientes = app.findRecordsByFilter('clientes', '1=1', '-created', 100, 0)
      for (const c of clientes) {
        app.delete(c)
      }
    } catch (_) {}
  },
)
