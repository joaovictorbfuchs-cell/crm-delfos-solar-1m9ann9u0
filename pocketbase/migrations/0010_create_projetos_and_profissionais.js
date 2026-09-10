migrate(
  (app) => {
    // 1. Coleção profissionais
    const profissionais = new Collection({
      name: 'profissionais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        {
          name: 'especialidade',
          type: 'select',
          required: true,
          values: ['Instalação', 'Manutenção', 'Limpeza', 'Projeto Elétrico', 'Almoxarifado'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_profissionais_nome ON profissionais (nome)',
        'CREATE INDEX idx_profissionais_especialidade ON profissionais (especialidade)',
      ],
    })
    app.save(profissionais)

    const clientesColId = app.findCollectionByNameOrId('clientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id

    // 2. Coleção projetos
    const projetos = new Collection({
      name: 'projetos',
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
          name: 'etapa',
          type: 'select',
          required: true,
          values: [
            'Levantamento de Informações',
            'Elaboração de Projeto',
            'Pedido de Compra',
            'Aguardando Material',
            'Instalação',
            'Concluído',
          ],
          maxSelect: 1,
        },
        {
          name: 'potencia_kwp',
          type: 'number',
        },
        {
          name: 'cidade',
          type: 'text',
        },
        {
          name: 'profissional_id',
          type: 'relation',
          collectionId: profissionaisColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'profissional_nome',
          type: 'text',
        },
        {
          name: 'observacoes',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_projetos_cliente ON projetos (cliente_id)',
        'CREATE INDEX idx_projetos_etapa ON projetos (etapa)',
        'CREATE INDEX idx_projetos_profissional ON projetos (profissional_id)',
      ],
    })
    app.save(projetos)

    const projetosColId = app.findCollectionByNameOrId('projetos').id

    // 3. Coleção projeto_eventos (histórico de mudanças de etapa e eventos de projeto)
    const projetoEventos = new Collection({
      name: 'projeto_eventos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'projeto_id',
          type: 'relation',
          required: true,
          collectionId: projetosColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'etapa_anterior',
          type: 'text',
        },
        {
          name: 'etapa_nova',
          type: 'text',
          required: true,
        },
        {
          name: 'profissional_nome',
          type: 'text',
        },
        {
          name: 'autor',
          type: 'text',
        },
        {
          name: 'data',
          type: 'date',
          required: true,
        },
        {
          name: 'descricao',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_projeto_eventos_projeto ON projeto_eventos (projeto_id)',
        'CREATE INDEX idx_projeto_eventos_data ON projeto_eventos (data)',
      ],
    })
    app.save(projetoEventos)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('projeto_eventos')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('projetos')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('profissionais')
      app.delete(col)
    } catch (_) {}
  },
)
