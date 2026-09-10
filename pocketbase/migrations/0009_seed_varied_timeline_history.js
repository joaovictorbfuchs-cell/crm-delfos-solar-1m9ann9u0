migrate(
  (app) => {
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    const clients = app.findRecordsByFilter('clientes', '', 'created', 5, 0)
    if (clients.length === 0) return

    const c1 = clients[0].id
    const c2 = clients.length > 1 ? clients[1].id : c1
    const c3 = clients.length > 2 ? clients[2].id : c1

    // Buscar usuários para os responsáveis
    let joaoId = ''
    let carlosId = ''
    let fernandaId = ''

    try {
      joaoId = app.findAuthRecordByEmail('_pb_users_auth_', 'joao@delfosengenharia.com.br').id
    } catch (_) {}
    try {
      carlosId = app.findAuthRecordByEmail('_pb_users_auth_', 'carlos@delfosengenharia.com.br').id
    } catch (_) {}
    try {
      fernandaId = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'fernanda@delfosengenharia.com.br',
      ).id
    } catch (_) {}

    const seedItems = [
      // Cliente 1 (Maria Santos) - anotação recente e atividade futura
      {
        cliente_id: c1,
        tipo: 'anotacao',
        titulo: 'Anotação interna: Validação de crédito aprovada',
        descricao:
          'Gerente da agência Sicredi ligou confirmando aprovação do financiamento solar em 60x com carência de 90 dias. Cliente já está ciente.',
        responsavel_id: joaoId,
        responsavel_nome: 'João Delfos',
        status: 'pendente',
        data: '2026-09-09T18:30:00.000Z',
        autor: 'João Delfos',
      },
      // Cliente 2 (João Pedro Oliveira) - anotações e atividades
      {
        cliente_id: c2,
        tipo: 'anotacao',
        titulo: 'Anotação de atendimento: Preferência de horário para vistoria',
        descricao:
          'Cliente informou que só estará disponível no local aos sábados pela manhã ou durante a semana após as 18h.',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        status: 'pendente',
        data: '2026-09-08T17:45:00.000Z',
        autor: 'Carlos Mendes',
      },
      // Cliente 3 (Carlos Alberto Lima - Frigorífico Lima) - anotação sobre subestação e próxima atividade
      {
        cliente_id: c3,
        tipo: 'anotacao',
        titulo: 'Anotação técnica: Medição do transformador de acoplamento',
        descricao:
          'Subestação própria opera em 380V / 220V com transformador de 150 kVA. Cabos de saída suportam os 75 kWp previstos sem necessidade de troca.',
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        status: 'pendente',
        data: '2026-09-09T11:20:00.000Z',
        autor: 'Fernanda Lima',
      },
      {
        cliente_id: c3,
        tipo: 'reuniao_presencial',
        titulo: 'Reunião Presencial',
        descricao:
          'Reunião com a diretoria do Frigorífico para apresentação do cronograma executivo de entrega dos módulos e início da montagem mecânica.',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        status: 'pendente',
        data: '2026-09-10T09:00:00.000Z',
        autor: 'Carlos Mendes',
      },
    ]

    for (const item of seedItems) {
      try {
        const found = app.findRecordsByFilter(
          'atividades',
          `cliente_id='${item.cliente_id}' && titulo='${item.titulo.replace(/'/g, "\\'")}'`,
          'created',
          1,
          0,
        )
        if (found && found.length > 0) continue
      } catch (_) {}

      try {
        const record = new Record(atividadesCol)
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
        console.log('Erro ao semear registro de histórico:', item.titulo, err)
      }
    }
  },
  (app) => {
    // Reversão opcional se necessário
  },
)
