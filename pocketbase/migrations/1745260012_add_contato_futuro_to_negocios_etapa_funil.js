migrate(
  (app) => {
    const negociosCol = app.findCollectionByNameOrId('negocios')

    const etapaFunilField = negociosCol.fields.getByName('etapa_funil')
    if (etapaFunilField) {
      const currentValues = etapaFunilField.values || [
        'novo lead',
        'qualificado',
        'proposta enviada',
        'negociação',
        'contrato assinado',
      ]
      if (!currentValues.includes('contato_futuro')) {
        etapaFunilField.values = [...currentValues, 'contato_futuro']
        etapaFunilField.maxSelect = 1
      }
    }

    app.save(negociosCol)
  },
  (app) => {
    try {
      const negociosCol = app.findCollectionByNameOrId('negocios')
      const etapaFunilField = negociosCol.fields.getByName('etapa_funil')
      if (etapaFunilField && etapaFunilField.values) {
        etapaFunilField.values = etapaFunilField.values.filter((v) => v !== 'contato_futuro')
      }
      app.save(negociosCol)
    } catch (_) {}
  },
)
