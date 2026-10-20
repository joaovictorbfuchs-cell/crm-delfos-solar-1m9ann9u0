migrate(
  (app) => {
    const clientesCollection = app.findCollectionByNameOrId('clientes')
    const negociosCollection = app.findCollectionByNameOrId('negocios')

    const collection = new Collection({
      name: 'propostas_carregador',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'numero_proposta', type: 'text' },
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesCollection.id,
          maxSelect: 1,
        },
        { name: 'negocio_id', type: 'relation', collectionId: negociosCollection.id, maxSelect: 1 },
        { name: 'data_emissao', type: 'date' },
        { name: 'validade_dias', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['Em elaboração', 'Enviado ao cliente', 'Aprovado', 'Rejeitado'],
        },
        { name: 'autor', type: 'text' },

        // Dados do cliente e instalação
        { name: 'cliente_nome', type: 'text' },
        { name: 'cliente_documento', type: 'text' },
        { name: 'cliente_contato', type: 'text' },
        { name: 'endereco_instalacao', type: 'text' },
        { name: 'responsavel_acompanhante', type: 'text' },
        { name: 'tipo_local', type: 'text' },

        // Projeção de economia
        { name: 'custo_proprio_min', type: 'number' },
        { name: 'custo_proprio_max', type: 'number' },
        { name: 'custo_publico_min', type: 'number' },
        { name: 'custo_publico_max', type: 'number' },

        // Opções de carregador
        { name: 'opcao_selecionada', type: 'text' }, // "opcao_01" | "opcao_02" | "ambas"
        { name: 'opcao1_titulo', type: 'text' },
        { name: 'opcao1_potencia', type: 'text' },
        { name: 'opcao1_tensao', type: 'text' },
        { name: 'opcao1_tempo_recarga', type: 'text' },
        { name: 'opcao1_valor', type: 'number' },

        { name: 'opcao2_titulo', type: 'text' },
        { name: 'opcao2_potencia', type: 'text' },
        { name: 'opcao2_tensao', type: 'text' },
        { name: 'opcao2_tempo_recarga', type: 'text' },
        { name: 'opcao2_valor', type: 'number' },

        // Investimento e Condições Comerciais
        { name: 'valor_estacao_materiais', type: 'number' },
        { name: 'valor_servicos_engenharia', type: 'number' },
        { name: 'valor_total', type: 'number' },
        { name: 'condicoes_pagamento', type: 'text' },

        // Prazos, Garantia & Engenheiro Responsável
        { name: 'prazo_execucao', type: 'text' },
        { name: 'garantias', type: 'text' },
        { name: 'premissas_orcamento_previo', type: 'text' },
        { name: 'engenheiro_nome', type: 'text' },
        { name: 'engenheiro_crea', type: 'text' },

        // Observações livres ou JSON extra
        { name: 'observacoes', type: 'text' },
        { name: 'dados_json', type: 'json' },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_prop_carregador_cli ON propostas_carregador (cliente_id)',
        'CREATE INDEX idx_prop_carregador_num ON propostas_carregador (numero_proposta)',
        'CREATE INDEX idx_prop_carregador_status ON propostas_carregador (status)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('propostas_carregador')
    if (collection) {
      app.delete(collection)
    }
  },
)
