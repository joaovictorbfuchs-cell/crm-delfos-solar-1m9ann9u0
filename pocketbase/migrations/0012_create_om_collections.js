migrate(
  (app) => {
    const clientesColId = app.findCollectionByNameOrId('clientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id

    // 1. Coleção contratos_om
    const contratosOm = new Collection({
      name: 'contratos_om',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'plano',
          type: 'select',
          required: true,
          values: ['Essencial', 'Prevenção', 'Completo'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Ativo', 'Vencendo em 30 dias', 'Vencido', 'Cancelado'],
          maxSelect: 1,
        },
        { name: 'valor_mensal', type: 'number', required: true },
        { name: 'valor_anual', type: 'number', required: true },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'data_vencimento', type: 'date', required: true },
        { name: 'proxima_atividade_data', type: 'date' },
        { name: 'proxima_atividade_titulo', type: 'text' },
        { name: 'servicos_realizados', type: 'json' },
        { name: 'servicos_agendados', type: 'json' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contratos_om_cliente ON contratos_om (cliente_id)',
        'CREATE INDEX idx_contratos_om_status ON contratos_om (status)',
        'CREATE INDEX idx_contratos_om_plano ON contratos_om (plano)',
      ],
    })
    app.save(contratosOm)

    const contratosOmColId = app.findCollectionByNameOrId('contratos_om').id

    // 2. Coleção anomalias_om
    const anomaliasOm = new Collection({
      name: 'anomalias_om',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'contrato_id',
          type: 'relation',
          collectionId: contratosOmColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'codigo', type: 'text' },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'etapa',
          type: 'select',
          required: true,
          values: [
            'Detecção',
            'Solicitação de Informações',
            'Triagem Remota',
            'Diagnóstico In Loco',
            'Execução',
            'Faturamento',
          ],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Aberto', 'Em análise', 'Em execução', 'Resolvido', 'Cancelado'],
          maxSelect: 1,
        },
        {
          name: 'severidade',
          type: 'select',
          values: ['Baixa', 'Média', 'Alta', 'Crítica'],
          maxSelect: 1,
        },
        { name: 'data_abertura', type: 'date', required: true },
        { name: 'data_resolucao', type: 'date' },
        {
          name: 'tecnico_id',
          type: 'relation',
          collectionId: profissionaisColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'tecnico_nome', type: 'text' },
        { name: 'solucao_adotada', type: 'text' },
        { name: 'valor_faturamento', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_anomalias_om_cliente ON anomalias_om (cliente_id)',
        'CREATE INDEX idx_anomalias_om_etapa ON anomalias_om (etapa)',
        'CREATE INDEX idx_anomalias_om_status ON anomalias_om (status)',
      ],
    })
    app.save(anomaliasOm)

    // 3. Coleção servicos_adicionais_om
    const servicosAdicionaisOm = new Collection({
      name: 'servicos_adicionais_om',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'contrato_id',
          type: 'relation',
          collectionId: contratosOmColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'diagnostico_tecnico',
            'manutencao_corretiva',
            'inspecao_termografica',
            'limpeza_avulsa',
            'testes_inversor',
            'substituicao_inversor',
            'relatorio_seguradora',
            'configuracao_datalogger',
            'gestao_rateio',
            'auditoria_faturamento',
            'manutencao_ativos',
          ],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'em execução', 'faturado', 'cancelado'],
          maxSelect: 1,
        },
        {
          name: 'tecnico_id',
          type: 'relation',
          collectionId: profissionaisColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'tecnico_nome', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_servicos_adic_cliente ON servicos_adicionais_om (cliente_id)',
        'CREATE INDEX idx_servicos_adic_status ON servicos_adicionais_om (status)',
      ],
    })
    app.save(servicosAdicionaisOm)

    // 4. Coleção timeline_om (histórico cronológico de interações, anomalias, serviços e relatórios)
    const timelineOm = new Collection({
      name: 'timeline_om',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'contrato_id',
          type: 'relation',
          collectionId: contratosOmColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'anomalia',
            'servico_plano',
            'servico_adicional',
            'relatorio',
            'interacao',
            'inspecao',
          ],
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'data', type: 'date', required: true },
        { name: 'autor', type: 'text' },
        { name: 'status_tag', type: 'text' },
        { name: 'referencia_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_timeline_om_cliente ON timeline_om (cliente_id)',
        'CREATE INDEX idx_timeline_om_data ON timeline_om (data)',
      ],
    })
    app.save(timelineOm)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('timeline_om')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('servicos_adicionais_om')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('anomalias_om')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('contratos_om')
      app.delete(col)
    } catch (_) {}
  },
)
