migrate(
  (app) => {
    const atividades = app.findCollectionByNameOrId('atividades')

    // 1. Adicionar campos tipo, titulo, autor à coleção atividades caso não existam
    if (!atividades.fields.getByName('tipo')) {
      atividades.fields.add(
        new SelectField({
          name: 'tipo',
          values: [
            'anotacao',
            'ligacao',
            'reuniao',
            'proposta',
            'visita_tecnica',
            'mudanca_estagio',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!atividades.fields.getByName('titulo')) {
      atividades.fields.add(
        new TextField({
          name: 'titulo',
        }),
      )
    }

    if (!atividades.fields.getByName('autor')) {
      atividades.fields.add(
        new TextField({
          name: 'autor',
        }),
      )
    }

    app.save(atividades)

    // Atualizar atividades antigas sem tipo para terem um tipo padrão coerente
    const oldActivities = app.findRecordsByFilter('atividades', '', 'created', 100, 0)
    for (const act of oldActivities) {
      if (!act.get('tipo')) {
        const desc = (act.get('descricao') || '').toLowerCase()
        if (desc.includes('proposta')) {
          act.set('tipo', 'proposta')
          act.set('titulo', 'Envio de Proposta')
        } else if (desc.includes('visita')) {
          act.set('tipo', 'visita_tecnica')
          act.set('titulo', 'Visita Técnica')
        } else if (desc.includes('limpeza') || desc.includes('revisão')) {
          act.set('tipo', 'visita_tecnica')
          act.set('titulo', 'Ordem de Serviço / Manutenção')
        } else if (desc.includes('contato')) {
          act.set('tipo', 'ligacao')
          act.set('titulo', 'Ligação / Contato')
        } else {
          act.set('tipo', 'anotacao')
          act.set('titulo', 'Anotação de Acompanhamento')
        }
        if (!act.get('autor')) {
          act.set('autor', 'João Silva')
        }
        app.save(act)
      }
    }

    // 2. Semear atividades ricas e variadas para pelo menos 3 clientes principais
    // Clientes principais:
    // c1: pp4572amhvqgm81 (Maria Santos - Mercado Santos & Filhos)
    // c2: v339t6jz7wy93df (João Pedro Oliveira - Residencial Oliveira)
    // c3: vtszbseb345heif (Carlos Alberto Lima - Frigorífico Lima)
    // c4: 82wz5urzbk1qkp4 (Empresa Delfos Agroindustrial)

    const seedItems = [
      // Cliente 1 - Maria Santos (pp4572amhvqgm81)
      {
        cliente_id: 'pp4572amhvqgm81',
        tipo: 'ligacao',
        titulo: 'Primeiro contato telefônico com a cliente',
        descricao:
          'Conversado com a sra. Maria Santos sobre alto custo de energia do mercado (~R$ 2.400/mês). Ela demonstrou grande interesse em financiar sistema fotovoltaico.',
        data: '2025-05-10 10:30:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'pp4572amhvqgm81',
        tipo: 'mudanca_estagio',
        titulo: 'Mudança de estágio: Novo Lead → Levantamento',
        descricao:
          'Lead qualificado após conversa inicial. Passado para etapa de Levantamento técnico.',
        data: '2025-05-12 14:00:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'pp4572amhvqgm81',
        tipo: 'visita_tecnica',
        titulo: 'Visita técnica no telhado do Mercado Santos',
        descricao:
          'Vistoria in loco: telhado metálico trapezoidal em excelente estado com boa inclinação para o norte. Coletadas fotos da entrada de energia e disjuntor geral de 50A.',
        data: '2025-05-18 09:00:00.000Z',
        autor: 'Carlos Engenharia',
      },
      {
        cliente_id: 'pp4572amhvqgm81',
        tipo: 'anotacao',
        titulo: 'Detalhes da fatura RGE e restrições de instalação',
        descricao:
          'Cliente solicitou que os inversores fiquem na área interna de depósito por segurança. Conta de luz possui demanda contratada estável.',
        data: '2025-05-22 16:15:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'pp4572amhvqgm81',
        tipo: 'proposta',
        titulo: 'Envio da proposta comercial nº 2025/084',
        descricao:
          'Elaborada proposta de 12 kWp com 30 placas Canadian Solar e inversor Fronius Symo 12kW. Valor total de R$ 58.500,00 com retorno estimado em 3 anos.',
        data: '2025-05-28 11:00:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'pp4572amhvqgm81',
        tipo: 'reuniao',
        titulo: 'Reunião presencial para apresentação técnica',
        descricao:
          'Reunião com a sra. Maria e o sócio para explicar simulação de economia e parcelas do Sicredi. Ficaram muito satisfeitos com a garantia de 10 anos.',
        data: '2025-06-02 15:30:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'pp4572amhvqgm81',
        tipo: 'anotacao',
        titulo: 'Aguardando aprovação de crédito bancário',
        descricao:
          'Documentação enviada para a agência Sicredi Erechim Centro. Gerente prevê aprovação até quinta-feira.',
        data: '2025-06-04 17:00:00.000Z',
        autor: 'João Silva',
      },

      // Cliente 2 - João Pedro Oliveira (v339t6jz7wy93df)
      {
        cliente_id: 'v339t6jz7wy93df',
        tipo: 'ligacao',
        titulo: 'Contato via WhatsApp e chamada telefônica',
        descricao:
          'Sr. João Pedro entrou em contato pelo site solicitando estudo para residência em Passo Fundo. Consumo médio de 480 kWh/mês.',
        data: '2025-05-15 11:20:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'v339t6jz7wy93df',
        tipo: 'mudanca_estagio',
        titulo: 'Mudança de estágio: Novo Lead → Levantamento',
        descricao: 'Coletadas fotos da conta de energia e do telhado cerâmico.',
        data: '2025-05-16 09:30:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'v339t6jz7wy93df',
        tipo: 'proposta',
        titulo: 'Proposta preliminar 5 kWp enviada',
        descricao:
          'Proposta com 12 módulos Trina Solar 445W e inversor Growatt MIN 5000TL-X por R$ 24.900,00.',
        data: '2025-05-24 14:10:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'v339t6jz7wy93df',
        tipo: 'mudanca_estagio',
        titulo: 'Mudança de estágio: Orçamento → Negociação',
        descricao: 'Cliente gostou dos valores e pediu condições para entrada + 36 parcelas.',
        data: '2025-06-01 10:00:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'v339t6jz7wy93df',
        tipo: 'reuniao',
        titulo: 'Visita presencial e medição de sombreamento',
        descricao:
          'Confirmada ausência de sombreamento no telhado cerâmico face norte. Alinhado prazo de entrega das placas para julho.',
        data: '2025-06-06 16:00:00.000Z',
        autor: 'Carlos Engenharia',
      },
      {
        cliente_id: 'v339t6jz7wy93df',
        tipo: 'anotacao',
        titulo: 'Anotação sobre preferência de fiação embutida',
        descricao:
          'Cliente exige que a descida do eletroduto seja embutida na alvenaria externa para não comprometer a estética da fachada.',
        data: '2025-06-08 18:00:00.000Z',
        autor: 'João Silva',
      },

      // Cliente 3 - Carlos Alberto Lima / Frigorífico Lima (vtszbseb345heif)
      {
        cliente_id: 'vtszbseb345heif',
        tipo: 'ligacao',
        titulo: 'Contato inicial com diretor comercial',
        descricao:
          'Primeiro contato com o sr. Carlos Alberto para projeto industrial fotovoltaico de 75 kWp no frigorífico em Chapecó.',
        data: '2025-04-10 09:00:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'vtszbseb345heif',
        tipo: 'visita_tecnica',
        titulo: 'Inspeção de laje técnica e subestação',
        descricao:
          'Realizado levantamento da laje maciça com capacidade estrutural validada por laudo mecânico. Ponto de conexão em 380V na subestação interna.',
        data: '2025-04-22 14:00:00.000Z',
        autor: 'Carlos Engenharia',
      },
      {
        cliente_id: 'vtszbseb345heif',
        tipo: 'proposta',
        titulo: 'Apresentação da Proposta Executiva Turn-Key',
        descricao:
          'Proposta fechada no valor de R$ 312.000,00 com 200 módulos JA Solar e inversor Huawei SUN2000-75KTL.',
        data: '2025-05-02 11:30:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'vtszbseb345heif',
        tipo: 'mudanca_estagio',
        titulo: 'Mudança de estágio: Negociação → Fechado',
        descricao:
          'Contrato assinado em Chapecó! Homologação iniciada junto à Celesc e emissão de ART de execução.',
        data: '2025-05-15 16:30:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: 'vtszbseb345heif',
        tipo: 'anotacao',
        titulo: 'Anotação sobre protocolo de acesso Celesc',
        descricao:
          'Parecer de acesso Celesc aprovado sem restrições. Vistoria de ligação agendada para início de julho.',
        data: '2025-06-03 10:15:00.000Z',
        autor: 'João Silva',
      },

      // Cliente 4 - Empresa Delfos Agroindustrial (82wz5urzbk1qkp4)
      {
        cliente_id: '82wz5urzbk1qkp4',
        tipo: 'visita_tecnica',
        titulo: 'Auditoria técnica no pavilhão de silos',
        descricao:
          'Levantamento aéreo por drone para mapeamento de 340 placas no telhado metálico do pavilhão de grãos.',
        data: '2025-05-05 08:30:00.000Z',
        autor: 'Carlos Engenharia',
      },
      {
        cliente_id: '82wz5urzbk1qkp4',
        tipo: 'proposta',
        titulo: 'Proposta de Usina 150 kWp entregue',
        descricao:
          'Investimento total de R$ 615.000,00 com financiamento via Pronaf Agro e inversor SMA de ponta.',
        data: '2025-05-18 10:00:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: '82wz5urzbk1qkp4',
        tipo: 'mudanca_estagio',
        titulo: 'Mudança de estágio: Negociação → Fechado',
        descricao: 'Fechamento com a diretoria da cooperativa Delfos Agroindustrial.',
        data: '2025-05-29 17:00:00.000Z',
        autor: 'João Silva',
      },
      {
        cliente_id: '82wz5urzbk1qkp4',
        tipo: 'anotacao',
        titulo: 'Anotação sobre cronograma de entrega dos módulos',
        descricao:
          'Previsão de chegada da carreta com 340 módulos Trina Solar no dia 20 de junho no Distrito Industrial.',
        data: '2025-06-05 14:00:00.000Z',
        autor: 'João Silva',
      },
    ]

    for (const item of seedItems) {
      // Evitar duplicatas verificando titulo e cliente_id
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
        const record = new Record(atividades)
        record.set('cliente_id', item.cliente_id)
        record.set('tipo', item.tipo)
        record.set('titulo', item.titulo)
        record.set('descricao', item.descricao)
        record.set('data', item.data)
        record.set('autor', item.autor)
        app.save(record)
      } catch (e) {
        console.log('Error inserting seed atividade:', e)
      }
    }
  },
  (app) => {
    try {
      const atividades = app.findCollectionByNameOrId('atividades')
      const fieldsToRemove = ['tipo', 'titulo', 'autor']
      for (const f of fieldsToRemove) {
        const fld = atividades.fields.getByName(f)
        if (fld) atividades.fields.remove(fld)
      }
      app.save(atividades)
    } catch (_) {}
  },
)
