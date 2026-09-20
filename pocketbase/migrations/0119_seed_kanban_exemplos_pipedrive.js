migrate(
  (app) => {
    const cliCol = app.findCollectionByNameOrId('clientes')
    const atvCol = app.findCollectionByNameOrId('atividades')

    // 8 Clientes de exemplo idempotentes
    // Distribuídos em 3 etapas do funil: Novo Lead, Orçamento ("Proposta Enviada"), Negociação
    // Valores de R$ 11.000 a R$ 75.000
    // Origens variadas: Instagram, Indicação, Google, WhatsApp, Facebook
    // Alguns com próxima ação agendada e alguns sem (para demonstrar lead frio e > 7 dias)
    const seedKanbanData = [
      // --- ETAPA: Novo Lead ---
      {
        obsKey: 'SEED-KANBAN-01',
        nome: 'Padaria & Confeitaria Sabor Real',
        valor_estimado: 38000,
        cidade: 'Erechim/RS',
        potencia_kwp: 7.2,
        origem_lead: 'Instagram',
        status: 'Novo Lead',
        // Criado há 12 dias (tempo na etapa > 7 dias)
        created: '2026-09-08 10:00:00.000Z',
        // Com próxima ação agendada
        proximaAcao: {
          tipo: 'contato_ligacao',
          titulo: 'Ligar para agendar visita',
          textoCurto: 'Ligar',
          data: '2026-09-22 14:00:00.000Z',
        },
      },
      {
        obsKey: 'SEED-KANBAN-02',
        nome: 'Supermercado Nova Esperança',
        valor_estimado: 75000,
        cidade: 'Passo Fundo/RS',
        potencia_kwp: 18.4,
        origem_lead: 'Google',
        status: 'Novo Lead',
        // Criado há 9 dias (> 7 dias) e SEM próxima ação agendada (LEAD FRIO)
        created: '2026-09-11 15:30:00.000Z',
        proximaAcao: null,
      },
      {
        obsKey: 'SEED-KANBAN-03',
        nome: 'Dr. Lucas Silveira Odontologia',
        valor_estimado: 24500,
        cidade: 'Getúlio Vargas/RS',
        potencia_kwp: 5.1,
        origem_lead: 'Indicação',
        status: 'Novo Lead',
        // Criado há 3 dias (< 7 dias)
        created: '2026-09-17 09:15:00.000Z',
        // Próxima ação
        proximaAcao: {
          tipo: 'follow_up',
          titulo: 'Qualificar perfil de consumo',
          textoCurto: 'Qualificar',
          data: '2026-09-21 10:30:00.000Z',
        },
      },

      // --- ETAPA: Orçamento (Proposta Enviada) ---
      {
        obsKey: 'SEED-KANBAN-04',
        nome: 'Agropecuária Bela Vista',
        valor_estimado: 64000,
        cidade: 'Barão de Cotegipe/RS',
        potencia_kwp: 15.6,
        origem_lead: 'Indicação',
        status: 'Orçamento',
        // Criado há 15 dias (> 7 dias)
        created: '2026-09-05 11:00:00.000Z',
        // Próxima ação
        proximaAcao: {
          tipo: 'proposta',
          titulo: 'Apresentar proposta comercial',
          textoCurto: 'Apresentar Proposta',
          data: '2026-09-23 16:00:00.000Z',
        },
      },
      {
        obsKey: 'SEED-KANBAN-05',
        nome: 'Academia Corpo & Energia',
        valor_estimado: 45000,
        cidade: 'Erechim/RS',
        potencia_kwp: 8.54,
        origem_lead: 'Instagram',
        status: 'Orçamento',
        // Criado há 10 dias (> 7 dias) e SEM atividade (LEAD FRIO)
        created: '2026-09-10 14:00:00.000Z',
        proximaAcao: null,
      },
      {
        obsKey: 'SEED-KANBAN-06',
        nome: 'Marcos Vinícius Resende',
        valor_estimado: 18900,
        cidade: 'Marau/RS',
        potencia_kwp: 4.2,
        origem_lead: 'Google',
        status: 'Orçamento',
        // Criado há 4 dias (< 7 dias)
        created: '2026-09-16 11:20:00.000Z',
        proximaAcao: {
          tipo: 'follow_up',
          titulo: 'Enviar comparativo de economia',
          textoCurto: 'Follow-up',
          data: '2026-09-21 15:00:00.000Z',
        },
      },

      // --- ETAPA: Negociação ---
      {
        obsKey: 'SEED-KANBAN-07',
        nome: 'Metalúrgica Alto Uruguai Ltda',
        valor_estimado: 72000,
        cidade: 'Erechim/RS',
        potencia_kwp: 19.8,
        origem_lead: 'Indicação',
        status: 'Negociação',
        // Criado há 5 dias (< 7 dias)
        created: '2026-09-15 13:45:00.000Z',
        proximaAcao: {
          tipo: 'reuniao_presencial',
          titulo: 'Reunião de fechamento com diretores',
          textoCurto: 'Reunião',
          data: '2026-09-22 09:30:00.000Z',
        },
      },
      {
        obsKey: 'SEED-KANBAN-08',
        nome: 'Clínica Veterinária Vida Animal',
        valor_estimado: 11000,
        cidade: 'Tapejara/RS',
        potencia_kwp: 2.8,
        origem_lead: 'Google',
        status: 'Negociação',
        // Criado há 14 dias (> 7 dias) e SEM atividade agendada (LEAD FRIO)
        created: '2026-09-06 08:30:00.000Z',
        proximaAcao: null,
      },
    ]

    for (const item of seedKanbanData) {
      let clienteRecord = null
      try {
        clienteRecord = app.findFirstRecordByData('clientes', 'nome', item.nome)
      } catch (_) {}

      if (!clienteRecord) {
        clienteRecord = new Record(cliCol)
      }

      clienteRecord.set('nome', item.nome)
      clienteRecord.set('valor_estimado', item.valor_estimado)
      clienteRecord.set('cidade', item.cidade)
      clienteRecord.set('potencia_kwp', item.potencia_kwp)
      clienteRecord.set('origem_lead', item.origem_lead)
      clienteRecord.set('status', item.status)
      clienteRecord.set('produto', 'Energia Solar')
      clienteRecord.set('tipo_pessoa', 'fisica')
      clienteRecord.set(
        'observacoes',
        `[${item.obsKey}] Seed idempotente do Funil Kanban Pipedrive style.`,
      )
      clienteRecord.set('transferido_pos_vendas', false)
      clienteRecord.set('arquivado', false)

      app.save(clienteRecord)

      // Atualizar timestamps raw para manter o tempo na etapa realístico
      try {
        app
          .db()
          .newQuery(
            `UPDATE clientes SET created = {:created}, updated = {:created} WHERE id = {:id}`,
          )
          .bind({ created: item.created, id: clienteRecord.id })
          .execute()
      } catch (_) {}

      // Gerar atividade pendente se proximaAcao existir
      if (item.proximaAcao) {
        let atvExistente = null
        try {
          const atvs = app.findRecordsByFilter(
            'atividades',
            `cliente_id = '${clienteRecord.id}' && status = 'pendente'`,
            '-created',
            1,
            0,
          )
          if (atvs && atvs.length > 0) {
            atvExistente = atvs[0]
          }
        } catch (_) {}

        if (!atvExistente) {
          const atv = new Record(atvCol)
          atv.set('cliente_id', clienteRecord.id)
          atv.set('tipo', item.proximaAcao.tipo)
          atv.set('titulo', item.proximaAcao.titulo)
          atv.set(
            'descricao',
            `Atividade agendada no funil de vendas: ${item.proximaAcao.textoCurto}`,
          )
          atv.set('data', item.proximaAcao.data)
          atv.set('status', 'pendente')
          atv.set('autor', 'CRM Delfos Solar')
          atv.set('responsavel_nome', 'João Silva')
          app.save(atv)
        }
      }
    }
  },
  (app) => {
    // Reversão limpa
    try {
      app.db().newQuery("DELETE FROM clientes WHERE observacoes LIKE '%[SEED-KANBAN-%'").execute()
    } catch (_) {}
  },
)
