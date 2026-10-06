migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const tipoField = col.fields.getByName('tipo')

    if (tipoField) {
      const currentValues = tipoField.values || []
      const neededValues = ['limpeza', 'manutencao_preventiva', 'manutencao_corretiva']
      const mergedValues = [...currentValues]

      for (const val of neededValues) {
        if (!mergedValues.includes(val)) {
          mergedValues.push(val)
        }
      }

      tipoField.values = mergedValues
      if (tipoField.maxSelect < 1) {
        tipoField.maxSelect = 1
      }
    }

    // Campo opcional tipo_custom_id (relation para tipos_atividades_custom ou text)
    // Adicionamos como relation se possivel ou text seguro
    if (!col.fields.getByName('tipo_custom_id')) {
      try {
        const customCol = app.findCollectionByNameOrId('tipos_atividades_custom')
        col.fields.add(
          new RelationField({
            name: 'tipo_custom_id',
            collectionId: customCol.id,
            cascadeDelete: false,
            maxSelect: 1,
            required: false,
          }),
        )
      } catch {
        col.fields.add(
          new TextField({
            name: 'tipo_custom_id',
            required: false,
          }),
        )
      }
    }

    app.save(col)

    // 4. Correção dos registros existentes errados (migration de dados):
    // atualizar as atividades cujo titulo é exatamente 'Manutenção Corretiva' e tipo='limpeza_manutencao' para tipo='manutencao_corretiva'
    // titulo 'Manutenção Preventiva' com tipo='limpeza_manutencao' -> 'manutencao_preventiva'
    try {
      app
        .db()
        .newQuery(
          "UPDATE atividades SET tipo = 'manutencao_corretiva' WHERE titulo = 'Manutenção Corretiva' AND tipo = 'limpeza_manutencao'",
        )
        .execute()
    } catch (err) {
      console.log('Erro ao atualizar Manutenção Corretiva:', err)
    }

    try {
      app
        .db()
        .newQuery(
          "UPDATE atividades SET tipo = 'manutencao_preventiva' WHERE titulo = 'Manutenção Preventiva' AND tipo = 'limpeza_manutencao'",
        )
        .execute()
    } catch (err) {
      console.log('Erro ao atualizar Manutenção Preventiva:', err)
    }
  },
  (app) => {
    // rollback seguro
    const col = app.findCollectionByNameOrId('atividades')
    if (col.fields.getByName('tipo_custom_id')) {
      col.fields.removeByName('tipo_custom_id')
      app.save(col)
    }
  },
)
