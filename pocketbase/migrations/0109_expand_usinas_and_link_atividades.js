migrate(
  (app) => {
    const usinasCol = app.findCollectionByNameOrId('usinas')
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    const clientesCol = app.findCollectionByNameOrId('clientes')

    // 1. Expandir coleção usinas com os campos técnicos requisitados
    // geracao_estimada_kwh (number)
    if (!usinasCol.fields.getByName('geracao_estimada_kwh')) {
      usinasCol.fields.add(
        new NumberField({
          name: 'geracao_estimada_kwh',
          required: false,
        }),
      )
    }

    // data_instalacao (date)
    if (!usinasCol.fields.getByName('data_instalacao')) {
      usinasCol.fields.add(
        new DateField({
          name: 'data_instalacao',
          required: false,
        }),
      )
    }

    // numero_medidor (text)
    if (!usinasCol.fields.getByName('numero_medidor')) {
      usinasCol.fields.add(
        new TextField({
          name: 'numero_medidor',
          required: false,
        }),
      )
    }

    // status (select: ativo | inativo)
    if (!usinasCol.fields.getByName('status')) {
      usinasCol.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        }),
      )
    }

    // observacoes (text)
    if (!usinasCol.fields.getByName('observacoes')) {
      usinasCol.fields.add(
        new TextField({
          name: 'observacoes',
          required: false,
        }),
      )
    }

    // tipo_usina (select: residencial | comercial | industrial | rural | investidor)
    if (!usinasCol.fields.getByName('tipo_usina')) {
      usinasCol.fields.add(
        new SelectField({
          name: 'tipo_usina',
          required: false,
          values: ['residencial', 'comercial', 'industrial', 'rural', 'investidor'],
          maxSelect: 1,
        }),
      )
    }

    // concessionaria (text)
    if (!usinasCol.fields.getByName('concessionaria')) {
      usinasCol.fields.add(
        new TextField({
          name: 'concessionaria',
          required: false,
        }),
      )
    }

    // numero_uc (text)
    if (!usinasCol.fields.getByName('numero_uc')) {
      usinasCol.fields.add(
        new TextField({
          name: 'numero_uc',
          required: false,
        }),
      )
    }

    app.save(usinasCol)

    // 2. Adicionar campo usina_id na coleção atividades (relação opcional com usinas)
    if (!atividadesCol.fields.getByName('usina_id')) {
      atividadesCol.fields.add(
        new RelationField({
          name: 'usina_id',
          required: false,
          collectionId: usinasCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      atividadesCol.addIndex('idx_atividades_usina_id', false, 'usina_id', '')
      app.save(atividadesCol)
    }

    // 3. Seed: cliente "João da Silva" com 2 usinas e atividades vinculadas
    let joaoCliente = null
    try {
      joaoCliente = app.findFirstRecordByData('clientes', 'nome', 'João da Silva')
    } catch (_) {
      try {
        const res = app.findRecordsByFilter('clientes', 'nome = "João da Silva"', '', 1, 0)
        if (res.length > 0) joaoCliente = res[0]
      } catch (_) {}
    }

    if (!joaoCliente) {
      joaoCliente = new Record(clientesCol)
      joaoCliente.set('nome', 'João da Silva')
      joaoCliente.set('cpf', '012.345.678-90')
      joaoCliente.set('telefone', '(54) 99123-4567')
      joaoCliente.set('whatsapp', '(54) 99123-4567')
      joaoCliente.set('email', 'joao.silva@exemplo.com.br')
      joaoCliente.set('endereco', 'Rua das Flores, 120, Centro')
      joaoCliente.set('bairro', 'Centro')
      joaoCliente.set('cidade', 'Erechim')
      joaoCliente.set('estado', 'RS')
      joaoCliente.set('cep', '99700-000')
      joaoCliente.set('tipo_pessoa', 'fisica')
      joaoCliente.set('tipo_cliente', 'residencial')
      joaoCliente.set('status', 'Fechado')
      joaoCliente.set('produto', 'Energia Solar')
      joaoCliente.set('potencia_kwp', 23.54)
      joaoCliente.set('placas_qtd', 39)
      joaoCliente.set('origem_lead', 'Indicação')
      joaoCliente.set(
        'observacoes',
        'Cliente com múltiplas usinas solares: Usina 1 (Residencial em Erechim/RS) e Usina 2 (Comercial em Passo Fundo/RS).',
      )
      app.save(joaoCliente)
    }

    // Limpar usinas prévias de João da Silva se houver
    try {
      const existUsinas = app.findRecordsByFilter(
        'usinas',
        `cliente_id = "${joaoCliente.id}"`,
        '',
        50,
        0,
      )
      for (const u of existUsinas) {
        app.delete(u)
      }
    } catch (_) {}

    // Usina 1: Residencial, 8,54 kWp, 14 módulos JA Solar, inversor Growatt MIN 8000TL-X, Erechim/RS
    const u1 = new Record(usinasCol)
    u1.set('cliente_id', joaoCliente.id)
    u1.set('nome', 'Usina 1 - Residencial Flores')
    u1.set('endereco', 'Rua das Flores, 120, Centro, Erechim/RS')
    u1.set('potencia_kwp', 8.54)
    u1.set('qtd_modulos', 14)
    u1.set('inversores_info', 'Growatt MIN 8000TL-X (8 kWp)')
    u1.set('tipo_estrutura', 'telhado')
    u1.set('tipo_usina', 'residencial')
    u1.set('geracao_estimada_kwh', 1150)
    u1.set('data_instalacao', '2024-03-15 10:00:00.000Z')
    u1.set('numero_medidor', 'MED-RS-884210')
    u1.set('numero_uc', '1004589231')
    u1.set('concessionaria', 'RGE Sul')
    u1.set('status', 'ativo')
    u1.set(
      'observacoes',
      '14 módulos JA Solar 610W. Sistema operando em pleno rendimento com geração média de 1.150 kWh/mês.',
    )
    app.save(u1)

    // Usina 2: Comercial, 15 kWp, 25 módulos Canadian Solar, inversor Deye SUN-15K-G04, Passo Fundo/RS
    const u2 = new Record(usinasCol)
    u2.set('cliente_id', joaoCliente.id)
    u2.set('nome', 'Usina 2 - Comercial Passo Fundo')
    u2.set('endereco', 'Av. Brasil Oeste, 1450, Boqueirão, Passo Fundo/RS')
    u2.set('potencia_kwp', 15.0)
    u2.set('qtd_modulos', 25)
    u2.set('inversores_info', 'Deye SUN-15K-G04 Trifásico 380V (15 kWp)')
    u2.set('tipo_estrutura', 'telhado')
    u2.set('tipo_usina', 'comercial')
    u2.set('geracao_estimada_kwh', 2050)
    u2.set('data_instalacao', '2024-08-20 10:00:00.000Z')
    u2.set('numero_medidor', 'MED-PF-991204')
    u2.set('numero_uc', '2008741529')
    u2.set('concessionaria', 'RGE Sul')
    u2.set('status', 'ativo')
    u2.set(
      'observacoes',
      '25 módulos Canadian Solar 600W. Conexão trifásica comercial com créditos compartilhados para o escritório.',
    )
    app.save(u2)

    // Limpar atividades prévias de João da Silva para seed consistente
    try {
      const existAtvs = app.findRecordsByFilter(
        'atividades',
        `cliente_id = "${joaoCliente.id}"`,
        '',
        50,
        0,
      )
      for (const a of existAtvs) {
        app.delete(a)
      }
    } catch (_) {}

    // Atividade 1 vinculada à Usina 1
    const atv1 = new Record(atividadesCol)
    atv1.set('cliente_id', joaoCliente.id)
    atv1.set('usina_id', u1.id)
    atv1.set('tipo', 'limpeza_manutencao')
    atv1.set('titulo', 'Limpeza preventiva dos 14 módulos')
    atv1.set(
      'descricao',
      'Limpeza e revisão semestral dos módulos JA Solar na Usina 1 (Erechim/RS). Desempenho pós-limpeza aferido em 100%.',
    )
    atv1.set('data', '2025-01-20 14:00:00.000Z')
    atv1.set('status', 'concluida')
    atv1.set('autor', 'Equipe Técnica Delfos')
    atv1.set('responsavel_nome', 'João Victor Bagetti Fuchs')
    app.save(atv1)

    // Atividade 2 vinculada à Usina 2
    const atv2 = new Record(atividadesCol)
    atv2.set('cliente_id', joaoCliente.id)
    atv2.set('usina_id', u2.id)
    atv2.set('tipo', 'visita_tecnica')
    atv2.set('titulo', 'Termografia e verificação de conexões Deye')
    atv2.set(
      'descricao',
      'Inspeção termográfica e reaperto dos conectores MC4 e quadros de proteção AC/DC da Usina 2 (Passo Fundo/RS).',
    )
    atv2.set('data', '2025-02-10 10:30:00.000Z')
    atv2.set('status', 'concluida')
    atv2.set('autor', 'Equipe Técnica Delfos')
    atv2.set('responsavel_nome', 'Daniel Rotava')
    app.save(atv2)

    // Atividade 3 vinculada à Usina 2 (Pendente)
    const atv3 = new Record(atividadesCol)
    atv3.set('cliente_id', joaoCliente.id)
    atv3.set('usina_id', u2.id)
    atv3.set('tipo', 'relatorio_solarview')
    atv3.set('titulo', 'Auditoria de geração mensal e créditos RGE')
    atv3.set(
      'descricao',
      'Acompanhamento do fechamento da fatura com compensação de créditos entre a Usina Comercial e a unidade consumidora filial.',
    )
    atv3.set('data', '2025-05-15 09:00:00.000Z')
    atv3.set('status', 'pendente')
    atv3.set('autor', 'Equipe Comercial')
    atv3.set('responsavel_nome', 'João Victor Bagetti Fuchs')
    app.save(atv3)

    // Atividade 4 geral do cliente (sem vínculo com usina específica)
    const atv4 = new Record(atividadesCol)
    atv4.set('cliente_id', joaoCliente.id)
    atv4.set('tipo', 'follow_up')
    atv4.set('titulo', 'Reunião anual de alinhamento com cliente')
    atv4.set(
      'descricao',
      'Reunião com João da Silva para apresentar relatório consolidado de economia de todas as suas usinas e planejar expansão.',
    )
    atv4.set('data', '2025-06-01 15:00:00.000Z')
    atv4.set('status', 'pendente')
    atv4.set('autor', 'Comercial Delfos')
    atv4.set('responsavel_nome', 'Daniel Rotava')
    app.save(atv4)
  },
  (app) => {
    // Reverter campos se necessário
    try {
      const atividadesCol = app.findCollectionByNameOrId('atividades')
      atividadesCol.removeIndex('idx_atividades_usina_id')
      const usinaField = atividadesCol.fields.getByName('usina_id')
      if (usinaField) {
        atividadesCol.fields.remove(usinaField)
        app.save(atividadesCol)
      }
    } catch (_) {}
  },
)
