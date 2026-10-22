migrate(
  (app) => {
    const clientesCollection = app.findCollectionByNameOrId('clientes')
    const negociosCollection = app.findCollectionByNameOrId('negocios')

    const collection = new Collection({
      name: 'baterias_orcamentos',
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
        {
          name: 'negocio_id',
          type: 'relation',
          collectionId: negociosCollection.id,
          maxSelect: 1,
        },
        { name: 'data_orcamento', type: 'date' },
        { name: 'validade_dias', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['Em elaboração', 'Enviado ao cliente', 'Aprovado', 'Rejeitado'],
        },
        { name: 'numero_revisao', type: 'number' },
        { name: 'autor', type: 'text' },
        { name: 'tipo_cliente', type: 'text' },

        // Dimensionamento do Sistema de Baterias
        { name: 'tipo_aplicacao', type: 'text' }, // 'backup' | 'peak_shaving' | 'autoconsumo' | 'off_grid'
        { name: 'capacidade_kwh', type: 'number' },
        { name: 'capacidade_util_kwh', type: 'number' },
        { name: 'potencia_inversor_kw', type: 'number' },
        { name: 'tensao_banco_v', type: 'number' },
        { name: 'autonomia_horas', type: 'number' },
        { name: 'consumo_critico_kwh_dia', type: 'number' },
        { name: 'tipo_bateria', type: 'text' }, // 'lifepo4' | 'litio_nmc' | 'chumbo_carbono' | 'outra'
        { name: 'profundidade_descarga_dod', type: 'number' }, // ex: 90 para 90%
        { name: 'ciclos_vida_estimados', type: 'number' }, // ex: 6000

        // Equipamentos e Fornecedor
        { name: 'marca_bateria', type: 'text' },
        { name: 'modelo_bateria', type: 'text' },
        { name: 'quantidade_baterias', type: 'number' },
        { name: 'marca_inversor_carregador', type: 'text' },
        { name: 'modelo_inversor_carregador', type: 'text' },
        { name: 'fornecedor_selecionado_id', type: 'text' },
        { name: 'equipamento_id', type: 'text' },

        // Formação de Custos (padrão Delfos Solar)
        { name: 'custo_materiais_equipamentos', type: 'number' },
        { name: 'custo_materiais_extras', type: 'number' },
        { name: 'custo_mao_de_obra', type: 'number' },
        { name: 'custo_risco_engenharia', type: 'number' },
        { name: 'custo_frete_guincho', type: 'number' },
        { name: 'custo_subestacao', type: 'number' },
        { name: 'custo_terceirizacao', type: 'number' },
        { name: 'custo_marketing_combustivel', type: 'number' },
        { name: 'custo_administracao', type: 'number' },
        { name: 'custo_comissao_comercial', type: 'number' },
        { name: 'custo_indicacao', type: 'number' },
        { name: 'custo_impostos', type: 'number' },
        { name: 'opcao_imposto', type: 'number' },
        { name: 'desconto', type: 'number' },
        { name: 'desconto_percentual', type: 'number' },
        { name: 'percentual_administracao_auto', type: 'number' },
        { name: 'percentual_indicacao_auto', type: 'number' },
        { name: 'manual_administracao', type: 'bool' },
        { name: 'manual_comissao', type: 'bool' },
        { name: 'manual_indicacao', type: 'bool' },
        { name: 'valor_manual_administracao', type: 'number' },
        { name: 'valor_manual_comissao', type: 'number' },
        { name: 'valor_manual_indicacao', type: 'number' },
        { name: 'valor_total_custos', type: 'number' },
        { name: 'valor_investimento', type: 'number' },

        // Condições de Pagamento e Financiamento
        { name: 'condicoes_pagamento', type: 'text' },
        { name: 'parcela_a_vista', type: 'number' },
        { name: 'parcelas_cartao', type: 'number' },
        { name: 'juros_cartao', type: 'number' },
        { name: 'entrada_cartao', type: 'number' },
        { name: 'parcela_cartao', type: 'number' },
        { name: 'parcelas_financiamento', type: 'number' },
        { name: 'juros_financiamento', type: 'number' },
        { name: 'entrada_financiamento', type: 'number' },
        { name: 'parcela_financiamento', type: 'number' },

        // Garantias e Prazos
        { name: 'garantia_baterias_anos', type: 'number' },
        { name: 'garantia_inversor_anos', type: 'number' },
        { name: 'garantia_instalacao_anos', type: 'number' },
        { name: 'prazo_instalacao_dias', type: 'number' },

        // Metadados / JSON
        { name: 'observacoes', type: 'text' },
        { name: 'conteudo_proposta', type: 'json' },
        { name: 'dados_json', type: 'json' },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bat_orc_cliente ON baterias_orcamentos (cliente_id)',
        'CREATE INDEX idx_bat_orc_negocio ON baterias_orcamentos (negocio_id)',
        'CREATE INDEX idx_bat_orc_status ON baterias_orcamentos (status)',
        'CREATE INDEX idx_bat_orc_data ON baterias_orcamentos (data_orcamento)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('baterias_orcamentos')
    if (collection) {
      app.delete(collection)
    }
  },
)
