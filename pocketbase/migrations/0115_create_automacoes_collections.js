migrate(
  (app) => {
    // 1. Criar a coleção automacoes
    const automacoesCol = new Collection({
      name: 'automacoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'nome',
          type: 'text',
          required: true,
        },
        {
          name: 'gatilho',
          type: 'select',
          required: true,
          values: [
            'status_mudou',
            'instalacao_concluida',
            'atividade_concluida',
            'data_especifica',
            'dias_apos_evento',
          ],
          maxSelect: 1,
        },
        {
          name: 'configuracao_gatilho',
          type: 'json',
        },
        {
          name: 'acao',
          type: 'select',
          required: true,
          values: ['criar_atividade', 'enviar_whatsapp', 'enviar_email', 'mudar_status'],
          maxSelect: 1,
        },
        {
          name: 'configuracao_acao',
          type: 'json',
        },
        {
          name: 'destino',
          type: 'select',
          required: true,
          values: ['cliente_evento', 'responsavel_empresa', 'cliente_especifico'],
          maxSelect: 1,
        },
        {
          name: 'cliente_especifico_id',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('clientes').id,
          maxSelect: 1,
        },
        {
          name: 'ativa',
          type: 'bool',
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
        'CREATE INDEX idx_automacoes_gatilho ON automacoes (gatilho)',
        'CREATE INDEX idx_automacoes_acao ON automacoes (acao)',
        'CREATE INDEX idx_automacoes_ativa ON automacoes (ativa)',
      ],
    })
    app.save(automacoesCol)

    // Obter IDs para as relações da coleção automacoes_execucoes
    const automacoesSaved = app.findCollectionByNameOrId('automacoes')
    const clientesSaved = app.findCollectionByNameOrId('clientes')

    // 2. Criar a coleção automacoes_execucoes
    const execucoesCol = new Collection({
      name: 'automacoes_execucoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'automacao',
          type: 'relation',
          required: true,
          collectionId: automacoesSaved.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'data_execucao',
          type: 'date',
          required: true,
        },
        {
          name: 'sucesso',
          type: 'bool',
        },
        {
          name: 'mensagem',
          type: 'text',
        },
        {
          name: 'referencia_registro',
          type: 'text',
        },
        {
          name: 'cliente',
          type: 'relation',
          collectionId: clientesSaved.id,
          maxSelect: 1,
        },
        {
          name: 'dados_execucao',
          type: 'json',
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
        'CREATE INDEX idx_auto_exec_automacao ON automacoes_execucoes (automacao)',
        'CREATE INDEX idx_auto_exec_data ON automacoes_execucoes (data_execucao)',
        'CREATE INDEX idx_auto_exec_ref ON automacoes_execucoes (referencia_registro)',
        'CREATE INDEX idx_auto_exec_cliente ON automacoes_execucoes (cliente)',
      ],
    })
    app.save(execucoesCol)

    // 3. Seeds de demonstração requeridos na especificação:
    // 1. "Feedback pós-instalação": gatilho "Dias após um evento" — 7 dias após instalação concluída → ação "Enviar mensagem WhatsApp" com texto de feedback
    // 2. "Follow-up vendas": gatilho "Dias após um evento" — 3 dias após última atividade → ação "Criar atividade" com título "Follow-up de vendas" e descrição de retomar o contato comercial
    // 3. "Auto leitura RGE": gatilho "Data específica" — todo dia 10 → ação "Criar atividade" com título "Enviar auto leitura RGE" e descrição orientando o cliente

    const seedAutomacoes = [
      {
        nome: 'Feedback pós-instalação',
        gatilho: 'dias_apos_evento',
        configuracao_gatilho: {
          dias: 7,
          evento_base: 'instalacao_concluida',
        },
        acao: 'enviar_whatsapp',
        configuracao_acao: {
          mensagem:
            'Olá {{cliente_nome}}! Sua usina solar está em operação há uma semana. Como está sendo sua experiência com a Delfos Solar?',
        },
        destino: 'cliente_evento',
        ativa: true,
      },
      {
        nome: 'Follow-up vendas',
        gatilho: 'dias_apos_evento',
        configuracao_gatilho: {
          dias: 3,
          evento_base: 'ultima_atividade',
        },
        acao: 'criar_atividade',
        configuracao_acao: {
          titulo: 'Follow-up de vendas',
          descricao:
            'Retomar o contato comercial com {{cliente_nome}} para checar o andamento da proposta solar.',
          tipo_atividade: 'follow_up',
        },
        destino: 'responsavel_empresa',
        ativa: true,
      },
      {
        nome: 'Auto leitura RGE',
        gatilho: 'data_especifica',
        configuracao_gatilho: {
          dia_mes: 10,
        },
        acao: 'criar_atividade',
        configuracao_acao: {
          titulo: 'Enviar auto leitura RGE',
          descricao:
            'Orientar o cliente {{cliente_nome}} sobre a auto leitura na RGE e conferência de créditos solares.',
          tipo_atividade: 'auto_leitura_rge',
        },
        destino: 'responsavel_empresa',
        ativa: true,
      },
    ]

    for (const seed of seedAutomacoes) {
      try {
        app.findFirstRecordByData('automacoes', 'nome', seed.nome)
      } catch (_) {
        const record = new Record(automacoesSaved)
        record.set('nome', seed.nome)
        record.set('gatilho', seed.gatilho)
        record.set('configuracao_gatilho', seed.configuracao_gatilho)
        record.set('acao', seed.acao)
        record.set('configuracao_acao', seed.configuracao_acao)
        record.set('destino', seed.destino)
        record.set('ativa', seed.ativa)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const execCol = app.findCollectionByNameOrId('automacoes_execucoes')
      app.delete(execCol)
    } catch (_) {}

    try {
      const autoCol = app.findCollectionByNameOrId('automacoes')
      app.delete(autoCol)
    } catch (_) {}
  },
)
