migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')

    // 1. tipo_unificado (texto, opcional)
    if (!col.fields.getByName('tipo_unificado')) {
      col.fields.add(new TextField({ name: 'tipo_unificado', required: false }))
    }

    // 2. subtipo (texto, opcional)
    if (!col.fields.getByName('subtipo')) {
      col.fields.add(new TextField({ name: 'subtipo', required: false }))
    }

    // 3. origem (texto, opcional — "atividade", "ordem_servico", "servico_avulso", "timeline_om", "anomalia_om", "manutencao")
    if (!col.fields.getByName('origem')) {
      col.fields.add(new TextField({ name: 'origem', required: false }))
    }

    // 4. chave_importacao (texto, opcional — chave de idempotência para migração de registros)
    if (!col.fields.getByName('chave_importacao')) {
      col.fields.add(new TextField({ name: 'chave_importacao', required: false }))
    }

    // Salvar campos antes do índice
    app.save(col)

    // Índice na chave_importacao para buscas rápidas e garantia de unicidade
    try {
      col.addIndex('idx_atividades_chave_importacao', false, 'chave_importacao', '')
      app.save(col)
    } catch (e) {
      console.log('Aviso ao criar índice em chave_importacao:', e)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    try {
      col.removeIndex('idx_atividades_chave_importacao')
    } catch (e) {
      // Ignora se não existir
    }
    if (col.fields.getByName('chave_importacao')) {
      col.fields.removeByName('chave_importacao')
    }
    if (col.fields.getByName('origem')) {
      col.fields.removeByName('origem')
    }
    if (col.fields.getByName('subtipo')) {
      col.fields.removeByName('subtipo')
    }
    if (col.fields.getByName('tipo_unificado')) {
      col.fields.removeByName('tipo_unificado')
    }
    app.save(col)
  },
)
