migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')

    // Custo de materiais / equipamentos vindo do fornecedor (mas editável)
    if (!orcCol.fields.getByName('custo_materiais_equipamentos')) {
      orcCol.fields.add(new NumberField({ name: 'custo_materiais_equipamentos' }))
    }

    app.save(orcCol)

    // Backfill para orçamentos existentes: se já possui custo_materiais_extras e não tem custo_materiais_equipamentos,
    // copia para custo_materiais_equipamentos e zera custo_materiais_extras
    try {
      app
        .db()
        .newQuery(`
        UPDATE orcamentos_solar
        SET custo_materiais_equipamentos = custo_materiais_extras,
            custo_materiais_extras = 0
        WHERE custo_materiais_extras > 0
          AND (custo_materiais_equipamentos IS NULL OR custo_materiais_equipamentos = 0)
      `)
        .execute()
    } catch (err) {
      console.log('Aviso ao migrar dados de materiais em orcamentos_solar:', err)
    }
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    if (orcCol.fields.getByName('custo_materiais_equipamentos')) {
      orcCol.fields.removeByName('custo_materiais_equipamentos')
    }
    app.save(orcCol)
  },
)
