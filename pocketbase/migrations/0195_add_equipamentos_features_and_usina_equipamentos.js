migrate(
  (app) => {
    // 1. Atualizar a coleção equipamentos adicionando novos campos e opções
    const equipamentosCol = app.findCollectionByNameOrId('equipamentos')
    const fornecedoresCol = app.findCollectionByNameOrId('fornecedores')
    const usinasCol = app.findCollectionByNameOrId('usinas')

    // Atualizar valores do campo select 'tipo' para incluir 'outro' (preservando inversor e modulo_fv)
    const tipoField = equipamentosCol.fields.getByName('tipo')
    if (tipoField) {
      tipoField.values = ['inversor', 'modulo_fv', 'outro']
    }

    // Adicionar datasheet_url se não existir
    if (!equipamentosCol.fields.getByName('datasheet_url')) {
      equipamentosCol.fields.add(
        new URLField({
          name: 'datasheet_url',
          required: false,
        }),
      )
    }

    // Adicionar datalogger_url se não existir
    if (!equipamentosCol.fields.getByName('datalogger_url')) {
      equipamentosCol.fields.add(
        new URLField({
          name: 'datalogger_url',
          required: false,
        }),
      )
    }

    // Adicionar fornecedor_id (relação para fornecedores) se não existir
    if (!equipamentosCol.fields.getByName('fornecedor_id')) {
      equipamentosCol.fields.add(
        new RelationField({
          name: 'fornecedor_id',
          collectionId: fornecedoresCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // Adicionar telefone_suporte_fornecedor se não existir
    if (!equipamentosCol.fields.getByName('telefone_suporte_fornecedor')) {
      equipamentosCol.fields.add(
        new TextField({
          name: 'telefone_suporte_fornecedor',
          required: false,
        }),
      )
    }

    app.save(equipamentosCol)

    // 2. Criar coleção usina_equipamentos (relação aditiva entre usina e equipamentos cadastrados)
    let usinaEquipamentosCol
    try {
      usinaEquipamentosCol = app.findCollectionByNameOrId('usina_equipamentos')
    } catch (_) {
      usinaEquipamentosCol = new Collection({
        name: 'usina_equipamentos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'usina_id',
            type: 'relation',
            collectionId: usinasCol.id,
            maxSelect: 1,
            required: true,
            cascadeDelete: false,
          },
          {
            name: 'equipamento_id',
            type: 'relation',
            collectionId: equipamentosCol.id,
            maxSelect: 1,
            required: true,
            cascadeDelete: false,
          },
          {
            name: 'quantidade',
            type: 'number',
            required: false,
          },
          {
            name: 'numero_serie',
            type: 'text',
            required: false,
          },
          {
            name: 'observacoes',
            type: 'text',
            required: false,
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
          'CREATE INDEX idx_usina_equipamentos_usina ON usina_equipamentos (usina_id)',
          'CREATE INDEX idx_usina_equipamentos_equipamento ON usina_equipamentos (equipamento_id)',
        ],
      })
      app.save(usinaEquipamentosCol)
    }
  },
  (app) => {
    try {
      const usinaEquipamentosCol = app.findCollectionByNameOrId('usina_equipamentos')
      app.delete(usinaEquipamentosCol)
    } catch (_) {}

    try {
      const equipamentosCol = app.findCollectionByNameOrId('equipamentos')
      if (equipamentosCol.fields.getByName('telefone_suporte_fornecedor')) {
        equipamentosCol.fields.removeByName('telefone_suporte_fornecedor')
      }
      if (equipamentosCol.fields.getByName('fornecedor_id')) {
        equipamentosCol.fields.removeByName('fornecedor_id')
      }
      if (equipamentosCol.fields.getByName('datalogger_url')) {
        equipamentosCol.fields.removeByName('datalogger_url')
      }
      if (equipamentosCol.fields.getByName('datasheet_url')) {
        equipamentosCol.fields.removeByName('datasheet_url')
      }
      app.save(equipamentosCol)
    } catch (_) {}
  },
)
