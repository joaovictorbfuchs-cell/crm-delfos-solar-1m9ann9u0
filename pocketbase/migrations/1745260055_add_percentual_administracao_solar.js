migrate(
  (app) => {
    // 1. Campo numérico percentual_administracao_auto em orcamentos_solar (fração ou percentual, padrão 0.15 = 15%)
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    if (col && !col.fields.getByName('percentual_administracao_auto')) {
      col.fields.add(
        new NumberField({
          name: 'percentual_administracao_auto',
          required: false,
        }),
      )
      app.save(col)
    }

    // 2. Semear configuração padrão na coleção configuracoes (chave: percentual_administracao_solar_padrao = 15)
    try {
      const cfgCol = app.findCollectionByNameOrId('configuracoes')
      if (cfgCol) {
        const records = app.findRecordsByFilter(
          'configuracoes',
          "chave = 'percentual_administracao_solar_padrao'",
        )
        if (!records || records.length === 0) {
          const rec = new Record(cfgCol)
          rec.set('chave', 'percentual_administracao_solar_padrao')
          rec.set('valor', '15')
          rec.set('dados', { percentual_administracao: 15 })
          rec.set(
            'descricao',
            'Percentual padrão de custos de administração nos orçamentos solares (%)',
          )
          app.save(rec)
        }
      }
    } catch (err) {
      console.warn('Aviso ao semear configuracao de percentual de administracao solar:', err)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos_solar')
    if (col && col.fields.getByName('percentual_administracao_auto')) {
      col.fields.removeByName('percentual_administracao_auto')
      app.save(col)
    }
  },
)
