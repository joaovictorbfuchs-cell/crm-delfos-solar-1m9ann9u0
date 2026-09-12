migrate(
  (app) => {
    // 1. Adicionar campo 'selecionado' (bool) em fornecedores_orcamentos
    const foCol = app.findCollectionByNameOrId('fornecedores_orcamentos')
    if (!foCol.fields.getByName('selecionado')) {
      foCol.fields.add(
        new BoolField({
          name: 'selecionado',
          required: false,
        }),
      )
      app.save(foCol)
    }

    // 2. Adicionar campos de controle de revisão em orcamentos_solar
    const osCol = app.findCollectionByNameOrId('orcamentos_solar')

    if (!osCol.fields.getByName('numero_revisao')) {
      osCol.fields.add(
        new NumberField({
          name: 'numero_revisao',
          required: false,
          min: 1,
          onlyInt: true,
        }),
      )
    }

    if (!osCol.fields.getByName('revisao_de')) {
      osCol.fields.add(
        new RelationField({
          name: 'revisao_de',
          required: false,
          collectionId: osCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    if (!osCol.fields.getByName('status_revisao')) {
      osCol.fields.add(
        new SelectField({
          name: 'status_revisao',
          required: false,
          values: ['em análise', 'enviada ao cliente', 'aprovada', 'rejeitada'],
          maxSelect: 1,
        }),
      )
    }

    app.save(osCol)
  },
  (app) => {
    try {
      const foCol = app.findCollectionByNameOrId('fornecedores_orcamentos')
      const selField = foCol.fields.getByName('selecionado')
      if (selField) {
        foCol.fields.removeByName('selecionado')
        app.save(foCol)
      }
    } catch (_) {}

    try {
      const osCol = app.findCollectionByNameOrId('orcamentos_solar')
      if (osCol.fields.getByName('numero_revisao')) {
        osCol.fields.removeByName('numero_revisao')
      }
      if (osCol.fields.getByName('revisao_de')) {
        osCol.fields.removeByName('revisao_de')
      }
      if (osCol.fields.getByName('status_revisao')) {
        osCol.fields.removeByName('status_revisao')
      }
      app.save(osCol)
    } catch (_) {}
  },
)
