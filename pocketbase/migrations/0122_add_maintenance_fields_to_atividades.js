migrate(
  (app) => {
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    const fornecedoresCol = app.findCollectionByNameOrId('fornecedores')

    // 1. Adicionar campos em `atividades` para suportar Atividades de Manutenção e serviços:
    // - valor_servico (number)
    // - fornecedor_id (relation para fornecedores)
    // - equipe_nome (text)

    if (!atividadesCol.fields.getByName('valor_servico')) {
      atividadesCol.fields.add(
        new NumberField({
          name: 'valor_servico',
          required: false,
        }),
      )
    }

    if (!atividadesCol.fields.getByName('fornecedor_id')) {
      atividadesCol.fields.add(
        new RelationField({
          name: 'fornecedor_id',
          required: false,
          collectionId: fornecedoresCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    if (!atividadesCol.fields.getByName('equipe_nome')) {
      atividadesCol.fields.add(
        new TextField({
          name: 'equipe_nome',
          required: false,
        }),
      )
    }

    // Expandir valores permitidos de status em `atividades` para incluir 'agendada' e 'em_execucao'
    const statusField = atividadesCol.fields.getByName('status')
    if (statusField) {
      const allowed = new Set(statusField.values || [])
      allowed.add('pendente')
      allowed.add('agendada')
      allowed.add('em_execucao')
      allowed.add('concluida')
      allowed.add('cancelada')
      statusField.values = Array.from(allowed)
    }

    app.save(atividadesCol)

    // 2. Semear tipos de atividades de manutenção padrão na tabela `tipos_atividades_custom`
    const tiposCustomCol = app.findCollectionByNameOrId('tipos_atividades_custom')
    const tiposParaSemear = [
      {
        nome: 'Limpeza e Lavagem de Placas',
        categoria: 'manutencao',
        cor: '#0284C7',
        icone: 'Droplets',
        descricao: 'Lavagem técnica com água desmineralizada e remoção de sujidades',
        is_padrao: true,
      },
      {
        nome: 'Revisão Elétrica e Reaperto',
        categoria: 'manutencao',
        cor: '#F59E0B',
        icone: 'Zap',
        descricao: 'Revisão de quadros elétricos, reaperto de bornes e inspeção termográfica',
        is_padrao: true,
      },
      {
        nome: 'Manutenção Preventiva',
        categoria: 'manutencao',
        cor: '#16A34A',
        icone: 'Wrench',
        descricao: 'Inspeção geral de cabos, conectores MC4 e estrutura de fixação',
        is_padrao: true,
      },
      {
        nome: 'Manutenção Corretiva / Inversor',
        categoria: 'manutencao',
        cor: '#DC2626',
        icone: 'Settings',
        descricao: 'Diagnóstico de falhas, substituição de fusíveis/DPS ou troca de inversor',
        is_padrao: true,
      },
      {
        nome: 'Configuração e Teste de Datalogger',
        categoria: 'manutencao',
        cor: '#4F46E5',
        icone: 'Wifi',
        descricao: 'Alinhamento de telemetria, sinal Wi-Fi e sincronização no monitoramento',
        is_padrao: true,
      },
      {
        nome: 'Vistoria Técnica In Loco',
        categoria: 'manutencao',
        cor: '#059669',
        icone: 'ShieldCheck',
        descricao: 'Vistoria presencial pós-instalação ou para auditoria de desempenho',
        is_padrao: true,
      },
    ]

    for (const t of tiposParaSemear) {
      try {
        const found = app.findRecordsByFilter(
          'tipos_atividades_custom',
          `nome = "${t.nome.replace(/"/g, '\\"')}"`,
          '',
          1,
          0,
        )
        if (!found || found.length === 0) {
          const rec = new Record(tiposCustomCol)
          rec.set('nome', t.nome)
          rec.set('categoria', t.categoria)
          rec.set('cor', t.cor)
          rec.set('icone', t.icone)
          rec.set('descricao', t.descricao)
          rec.set('is_padrao', true)
          app.save(rec)
        }
      } catch (err) {
        console.log('Erro ao semear tipo de atividade:', t.nome, err)
      }
    }

    // 3. Semear 2 a 3 atividades de manutenção de demonstração para o cliente Geison Luis Rigo
    try {
      let geison = null
      try {
        const listGeison = app.findRecordsByFilter(
          'clientes',
          'nome ~ "Geison" || nome ~ "Rigo"',
          'created',
          2,
          0,
        )
        if (listGeison.length > 0) {
          geison = listGeison[0]
        }
      } catch (_) {}

      // Buscar primeiro fornecedor para vincular equipe
      let primeiroFornecedor = null
      try {
        const listForn = app.findRecordsByFilter('fornecedores', '', 'created', 1, 0)
        if (listForn.length > 0) {
          primeiroFornecedor = listForn[0]
        }
      } catch (_) {}

      if (geison) {
        const seedAtividadesManutencao = [
          {
            cliente_id: geison.id,
            tipo: 'limpeza_manutencao',
            titulo: 'Limpeza e Lavagem de Placas',
            descricao:
              'Lavagem técnica dos 13 módulos Canadian Solar com água desmineralizada e verificação de sombreamento.',
            data: '2026-04-10 09:00:00.000Z',
            status: 'pendente',
            valor_servico: 450,
            autor: 'Pós-Venda Delfos',
            responsavel_nome: 'Equipe Delfos O&M',
          },
          {
            cliente_id: geison.id,
            tipo: 'limpeza_manutencao',
            titulo: 'Revisão Elétrica e Reaperto',
            descricao:
              'Reaperto preventivo de conexões elétricas nos quadros CC/CA e verificação de aterramento da carcaça do inversor Deye.',
            data: '2026-04-15 14:00:00.000Z',
            status: 'agendada',
            valor_servico: 680,
            fornecedor_id: primeiroFornecedor ? primeiroFornecedor.id : null,
            equipe_nome: primeiroFornecedor
              ? primeiroFornecedor.getString('nome_empresa') ||
                primeiroFornecedor.getString('razao_social')
              : 'Sol tecno Distribuidora',
            autor: 'Engenharia Delfos',
            responsavel_nome: primeiroFornecedor
              ? primeiroFornecedor.getString('nome_empresa') || 'Fornecedor Terceirizado'
              : 'Equipe Técnica',
          },
          {
            cliente_id: geison.id,
            tipo: 'limpeza_manutencao',
            titulo: 'Configuração e Teste de Datalogger',
            descricao:
              'Reconexão de antena Wi-Fi e calibração de porta de comunicação RS485 com o medidor bidirecional.',
            data: '2026-03-01 11:00:00.000Z',
            status: 'concluida',
            valor_servico: 250,
            fornecedor_id: primeiroFornecedor ? primeiroFornecedor.id : null,
            equipe_nome: primeiroFornecedor
              ? primeiroFornecedor.getString('nome_empresa') ||
                primeiroFornecedor.getString('razao_social')
              : 'Sol tecno Distribuidora',
            autor: 'Suporte Delfos',
            responsavel_nome: 'João Silva',
          },
        ]

        for (const item of seedAtividadesManutencao) {
          try {
            const check = app.findRecordsByFilter(
              'atividades',
              `cliente_id = "${item.cliente_id}" && titulo = "${item.titulo.replace(/"/g, '\\"')}"`,
              '',
              1,
              0,
            )
            if (!check || check.length === 0) {
              const rec = new Record(atividadesCol)
              rec.set('cliente_id', item.cliente_id)
              rec.set('tipo', item.tipo)
              rec.set('titulo', item.titulo)
              rec.set('descricao', item.descricao)
              rec.set('data', item.data)
              rec.set('status', item.status)
              rec.set('valor_servico', item.valor_servico)
              if (item.fornecedor_id) rec.set('fornecedor_id', item.fornecedor_id)
              if (item.equipe_nome) rec.set('equipe_nome', item.equipe_nome)
              rec.set('autor', item.autor)
              rec.set('responsavel_nome', item.responsavel_nome)
              app.save(rec)
            }
          } catch (seedErr) {
            console.log('Erro ao semear atividade demo:', item.titulo, seedErr)
          }
        }
      }
    } catch (geisonErr) {
      console.log('Erro ao buscar Geison para semear atividades:', geisonErr)
    }
  },
  (app) => {
    try {
      const atividadesCol = app.findCollectionByNameOrId('atividades')
      const vf = atividadesCol.fields.getByName('valor_servico')
      if (vf) atividadesCol.fields.remove(vf)
      const ff = atividadesCol.fields.getByName('fornecedor_id')
      if (ff) atividadesCol.fields.remove(ff)
      const ef = atividadesCol.fields.getByName('equipe_nome')
      if (ef) atividadesCol.fields.remove(ef)
      app.save(atividadesCol)
    } catch (_) {}
  },
)
