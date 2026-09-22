migrate(
  (app) => {
    // 1. Adicionar campo tipo_venda na coleção 'negocios' se ainda não existir
    const negociosCol = app.findCollectionByNameOrId('negocios')
    if (!negociosCol.fields.getByName('tipo_venda')) {
      negociosCol.fields.add(
        new SelectField({
          name: 'tipo_venda',
          required: false,
          values: [
            'Energia Solar',
            'O&M (Operação e Manutenção)',
            'Baterias',
            'Carregadores Veículos Elétricos',
          ],
          maxSelect: 1,
        }),
      )
      app.save(negociosCol)
    }

    // 2. Adicionar campo tipo_venda na coleção 'clientes' se ainda não existir (para funil baseado em clientes)
    const clientesCol = app.findCollectionByNameOrId('clientes')
    if (!clientesCol.fields.getByName('tipo_venda')) {
      clientesCol.fields.add(
        new SelectField({
          name: 'tipo_venda',
          required: false,
          values: [
            'Energia Solar',
            'O&M (Operação e Manutenção)',
            'Baterias',
            'Carregadores Veículos Elétricos',
          ],
          maxSelect: 1,
        }),
      )
      app.save(clientesCol)
    }

    const atvCol = app.findCollectionByNameOrId('atividades')

    // 3. Preencher tipo_venda padrão ('Energia Solar') para os registros já existentes sem quebrar dados
    try {
      app
        .db()
        .newQuery(
          "UPDATE clientes SET tipo_venda = 'Energia Solar' WHERE (tipo_venda IS NULL OR tipo_venda = '') AND (status IS NOT NULL AND status != '')",
        )
        .execute()
    } catch (_) {}

    try {
      app
        .db()
        .newQuery(
          "UPDATE negocios SET tipo_venda = 'Energia Solar' WHERE tipo_venda IS NULL OR tipo_venda = ''",
        )
        .execute()
    } catch (_) {}

    // 4. Configurar os 6 cards de exemplo solicitados com os 4 tipos de venda:
    // - Arthur Paulo Medeiros: Energia Solar, R$ 42.000, Erechim/RS
    // - João Silva: O&M (Operação e Manutenção), R$ 3.500/mês, Passo Fundo/RS
    // - Maria Oliveira: Baterias, R$ 18.000, Erechim/RS
    // - Carlos Santos: Carregadores Veículos Elétricos, R$ 12.000, Passo Fundo/RS
    // + 2 cards variados para preencher as 5 etapas do funil:
    // - Padaria & Confeitaria Sabor Real (ou Cooperativa Agrícola Esperança): Energia Solar, R$ 56.000, Getúlio Vargas/RS
    // - Transportes Rápido Gaúcho: Carregadores Veículos Elétricos (ou O&M), R$ 28.000, Erechim/RS

    const cardsExemplo = [
      {
        obsKey: 'SEED-TIPO-VENDA-01',
        nome: 'Arthur Paulo Medeiros',
        tipo_venda: 'Energia Solar',
        valor_estimado: 42000,
        cidade: 'Erechim/RS',
        status: 'Novo Lead',
        proximaAcao: {
          tipo: 'contato_ligacao',
          titulo: 'Ligar para qualificar consumo solar',
          data: '2026-09-24 14:00:00.000Z',
        },
      },
      {
        obsKey: 'SEED-TIPO-VENDA-02',
        nome: 'João Silva',
        tipo_venda: 'O&M (Operação e Manutenção)',
        valor_estimado: 3500,
        cidade: 'Passo Fundo/RS',
        status: 'Levantamento',
        proximaAcao: {
          tipo: 'visita_tecnica',
          titulo: 'Vistoria técnica de usina para O&M',
          data: '2026-09-25 10:30:00.000Z',
        },
      },
      {
        obsKey: 'SEED-TIPO-VENDA-03',
        nome: 'Maria Oliveira',
        tipo_venda: 'Baterias',
        valor_estimado: 18000,
        cidade: 'Erechim/RS',
        status: 'Orçamento',
        proximaAcao: {
          tipo: 'proposta',
          titulo: 'Apresentar proposta de sistema de baterias',
          data: '2026-09-26 15:00:00.000Z',
        },
      },
      {
        obsKey: 'SEED-TIPO-VENDA-04',
        nome: 'Carlos Santos',
        tipo_venda: 'Carregadores Veículos Elétricos',
        valor_estimado: 12000,
        cidade: 'Passo Fundo/RS',
        status: 'Negociação',
        proximaAcao: {
          tipo: 'reuniao_presencial',
          titulo: 'Negociar instalação de wallbox veicular',
          data: '2026-09-27 16:30:00.000Z',
        },
      },
      {
        obsKey: 'SEED-TIPO-VENDA-05',
        nome: 'Cooperativa Agrícola Esperança',
        tipo_venda: 'Energia Solar',
        valor_estimado: 68000,
        cidade: 'Getúlio Vargas/RS',
        status: 'Contato Futuro',
        proximaAcao: {
          tipo: 'follow_up',
          titulo: 'Retomar contato após safra de grãos',
          data: '2026-10-15 09:00:00.000Z',
        },
      },
      {
        obsKey: 'SEED-TIPO-VENDA-06',
        nome: 'Transportes Rápido Gaúcho',
        tipo_venda: 'Carregadores Veículos Elétricos',
        valor_estimado: 24000,
        cidade: 'Erechim/RS',
        status: 'Orçamento',
        proximaAcao: null, // Lead frio demonstrativo
      },
    ]

    for (const item of cardsExemplo) {
      let cli = null
      try {
        cli = app.findFirstRecordByData('clientes', 'nome', item.nome)
      } catch (_) {}

      if (!cli) {
        cli = new Record(clientesCol)
        cli.set('nome', item.nome)
        cli.set('telefone', '(54) 99876-1234')
        cli.set('whatsapp', '(54) 99876-1234')
      }

      // Preserva e atualiza campos do card comercial
      cli.set('tipo_venda', item.tipo_venda)
      cli.set('valor_estimado', item.valor_estimado)
      cli.set('cidade', item.cidade)
      cli.set('status', item.status)
      cli.set('transferido_pos_vendas', false)
      cli.set('arquivado', false)

      const obsAtual = cli.getString('observacoes') || ''
      if (!obsAtual.includes(item.obsKey)) {
        cli.set(
          'observacoes',
          obsAtual
            ? `${obsAtual} • [${item.obsKey}] Exemplo funil comercial tipo de venda`
            : `[${item.obsKey}] Exemplo funil comercial tipo de venda`,
        )
      }

      app.save(cli)

      // Atualiza ou cria negócio correspondente na tabela 'negocios'
      try {
        let neg = null
        try {
          const negs = app.findRecordsByFilter(
            'negocios',
            `cliente_id = "${cli.id}"`,
            '-created',
            1,
            0,
          )
          if (negs && negs.length > 0) {
            neg = negs[0]
          }
        } catch (_) {}

        if (!neg) {
          neg = new Record(negociosCol)
          neg.set('cliente_id', cli.id)
        }

        neg.set('tipo_venda', item.tipo_venda)
        neg.set('valor_estimado', item.valor_estimado)
        neg.set('status', 'em andamento')

        const etapaMap = {
          'Novo Lead': 'novo lead',
          Levantamento: 'qualificado',
          Orçamento: 'proposta enviada',
          Negociação: 'negociação',
          'Contato Futuro': 'novo lead',
        }
        neg.set('etapa_funil', etapaMap[item.status] || 'novo lead')
        app.save(neg)
      } catch (_) {}

      // Atividade associada (próxima ação do card)
      if (item.proximaAcao) {
        try {
          const existingAtvs = app.findRecordsByFilter(
            'atividades',
            `cliente_id = "${cli.id}" && status = "pendente"`,
            '-created',
            1,
            0,
          )
          if (!existingAtvs || existingAtvs.length === 0) {
            const atv = new Record(atvCol)
            atv.set('cliente_id', cli.id)
            atv.set('tipo', item.proximaAcao.tipo)
            atv.set('titulo', item.proximaAcao.titulo)
            atv.set('descricao', `Atividade comercial: ${item.proximaAcao.titulo}`)
            atv.set('data', item.proximaAcao.data)
            atv.set('status', 'pendente')
            atv.set('autor', 'CRM Delfos Solar')
            atv.set('responsavel_nome', 'Arthur Consultor')
            app.save(atv)
          }
        } catch (_) {}
      }
    }
  },
  (app) => {
    try {
      const cliCol = app.findCollectionByNameOrId('clientes')
      const cliField = cliCol.fields.getByName('tipo_venda')
      if (cliField) {
        cliCol.fields.removeByName('tipo_venda')
        app.save(cliCol)
      }
    } catch (_) {}

    try {
      const negCol = app.findCollectionByNameOrId('negocios')
      const negField = negCol.fields.getByName('tipo_venda')
      if (negField) {
        negCol.fields.removeByName('tipo_venda')
        app.save(negCol)
      }
    } catch (_) {}
  },
)
