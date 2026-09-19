migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')

    // Fonte da geração estimada: 'automatico' | 'solergo'
    if (!orcCol.fields.getByName('geracao_fonte')) {
      orcCol.fields.add(
        new SelectField({
          name: 'geracao_fonte',
          values: ['automatico', 'solergo'],
          maxSelect: 1,
        }),
      )
    }

    // Indicador booleano se o ajuste via Solergo está ativo
    if (!orcCol.fields.getByName('ajuste_solergo_ativo')) {
      orcCol.fields.add(new BoolField({ name: 'ajuste_solergo_ativo' }))
    }

    // 12 valores mensais do Solergo em JSON
    if (!orcCol.fields.getByName('geracao_mensal_solergo_json')) {
      orcCol.fields.add(new JSONField({ name: 'geracao_mensal_solergo_json' }))
    }

    // Imagem do relatório Solergo (opcional para histórico)
    if (!orcCol.fields.getByName('imagem_solergo')) {
      orcCol.fields.add(
        new FileField({
          name: 'imagem_solergo',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        }),
      )
    }

    app.save(orcCol)
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    if (orcCol.fields.getByName('geracao_fonte')) {
      orcCol.fields.removeByName('geracao_fonte')
    }
    if (orcCol.fields.getByName('ajuste_solergo_ativo')) {
      orcCol.fields.removeByName('ajuste_solergo_ativo')
    }
    if (orcCol.fields.getByName('geracao_mensal_solergo_json')) {
      orcCol.fields.removeByName('geracao_mensal_solergo_json')
    }
    if (orcCol.fields.getByName('imagem_solergo')) {
      orcCol.fields.removeByName('imagem_solergo')
    }
    app.save(orcCol)
  },
)
