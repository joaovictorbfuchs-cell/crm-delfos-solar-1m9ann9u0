migrate(
  (app) => {
    const negociosCol = app.findCollectionByNameOrId('negocios')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar campo 'titulo' (text, opcional)
    if (!negociosCol.fields.getByName('titulo')) {
      negociosCol.fields.add(
        new TextField({
          name: 'titulo',
          required: false,
        }),
      )
    }

    // 2. Adicionar campo 'valor' (number, opcional)
    if (!negociosCol.fields.getByName('valor')) {
      negociosCol.fields.add(
        new NumberField({
          name: 'valor',
          required: false,
        }),
      )
    }

    // 3. Adicionar campo 'consultor_responsavel' (relation -> users, opcional)
    if (!negociosCol.fields.getByName('consultor_responsavel')) {
      negociosCol.fields.add(
        new RelationField({
          name: 'consultor_responsavel',
          collectionId: usersCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // 4. Adicionar 'venda bateria' ao select tipo_negocio mantendo as opções existentes
    const tipoNegocioField = negociosCol.fields.getByName('tipo_negocio')
    if (tipoNegocioField) {
      const currentValues = tipoNegocioField.values || [
        'venda usina',
        'bateria',
        'expansão',
        'renovação',
        'serviço',
      ]
      if (!currentValues.includes('venda bateria')) {
        tipoNegocioField.values = [...currentValues, 'venda bateria']
        tipoNegocioField.maxSelect = 1
      }
    }

    app.save(negociosCol)

    // 5. Preencher 'valor' a partir de 'valor_final' ou 'valor_estimado' e 'titulo' padrão para registros existentes se vazios
    try {
      app
        .db()
        .newQuery(
          'UPDATE negocios SET valor = COALESCE(NULLIF(valor_final, 0), valor_estimado, 0) WHERE valor IS NULL OR valor = 0',
        )
        .execute()
    } catch (_) {}

    try {
      app
        .db()
        .newQuery(
          "UPDATE negocios SET titulo = CASE WHEN tipo_negocio IS NOT NULL AND tipo_negocio != '' THEN 'Negócio - ' || tipo_negocio ELSE 'Negócio Comercial' END WHERE titulo IS NULL OR titulo = ''",
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const negociosCol = app.findCollectionByNameOrId('negocios')

      if (negociosCol.fields.getByName('titulo')) {
        negociosCol.fields.removeByName('titulo')
      }
      if (negociosCol.fields.getByName('valor')) {
        negociosCol.fields.removeByName('valor')
      }
      if (negociosCol.fields.getByName('consultor_responsavel')) {
        negociosCol.fields.removeByName('consultor_responsavel')
      }

      const tipoNegocioField = negociosCol.fields.getByName('tipo_negocio')
      if (tipoNegocioField && tipoNegocioField.values) {
        tipoNegocioField.values = tipoNegocioField.values.filter((v) => v !== 'venda bateria')
      }

      app.save(negociosCol)
    } catch (_) {}
  },
)
