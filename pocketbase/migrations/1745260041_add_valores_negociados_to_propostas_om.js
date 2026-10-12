migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('propostas_om')

      // 1. Campo valor_por_placa (número)
      if (!col.fields.getByName('valor_por_placa')) {
        col.fields.addAt(
          col.fields.length,
          new NumberField({
            name: 'valor_por_placa',
            min: 0,
          }),
        )
      }

      // 2. Campo valor_plano_essencial (número)
      if (!col.fields.getByName('valor_plano_essencial')) {
        col.fields.addAt(
          col.fields.length,
          new NumberField({
            name: 'valor_plano_essencial',
            min: 0,
          }),
        )
      }

      // 3. Campo valor_plano_inspecao (número)
      if (!col.fields.getByName('valor_plano_inspecao')) {
        col.fields.addAt(
          col.fields.length,
          new NumberField({
            name: 'valor_plano_inspecao',
            min: 0,
          }),
        )
      }

      // 4. Campo valor_plano_completo (número)
      if (!col.fields.getByName('valor_plano_completo')) {
        col.fields.addAt(
          col.fields.length,
          new NumberField({
            name: 'valor_plano_completo',
            min: 0,
          }),
        )
      }

      // 5. Campo valores_negociados_json (json)
      if (!col.fields.getByName('valores_negociados_json')) {
        col.fields.addAt(
          col.fields.length,
          new JSONField({
            name: 'valores_negociados_json',
            maxSize: 2000000,
          }),
        )
      }

      app.save(col)
    } catch (e) {
      console.log('Erro ao atualizar campos de propostas_om:', e)
      throw e
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('propostas_om')
      const f1 = col.fields.getByName('valor_por_placa')
      if (f1) col.fields.remove(f1)
      const f2 = col.fields.getByName('valor_plano_essencial')
      if (f2) col.fields.remove(f2)
      const f3 = col.fields.getByName('valor_plano_inspecao')
      if (f3) col.fields.remove(f3)
      const f4 = col.fields.getByName('valor_plano_completo')
      if (f4) col.fields.remove(f4)
      const f5 = col.fields.getByName('valores_negociados_json')
      if (f5) col.fields.remove(f5)
      app.save(col)
    } catch (_) {}
  },
)
