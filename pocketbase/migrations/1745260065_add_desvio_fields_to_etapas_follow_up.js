migrate(
  (app) => {
    // 1. Adicionar campos de desvio na coleção etapas_follow_up
    try {
      const etapasCol = app.findCollectionByNameOrId('etapas_follow_up')
      if (etapasCol) {
        let hasDesvioAcao = false
        let hasDesvioDias = false
        let hasDesvioFluxoId = false

        for (let i = 0; i < etapasCol.fields.length; i++) {
          const fName = etapasCol.fields[i].name
          if (fName === 'desvio_acao') hasDesvioAcao = true
          if (fName === 'desvio_dias') hasDesvioDias = true
          if (fName === 'desvio_fluxo_id') hasDesvioFluxoId = true
        }

        if (!hasDesvioAcao) {
          etapasCol.fields.add(
            new SelectField({
              name: 'desvio_acao',
              values: ['nenhuma', 'fluxo_alternativo', 'arquivar'],
              maxSelect: 1,
              required: false,
            }),
          )
        }

        if (!hasDesvioDias) {
          etapasCol.fields.add(
            new NumberField({
              name: 'desvio_dias',
              required: false,
            }),
          )
        }

        if (!hasDesvioFluxoId) {
          let fluxosColId = ''
          try {
            const fCol = app.findCollectionByNameOrId('fluxos_follow_up')
            if (fCol) fluxosColId = fCol.id
          } catch (_) {}

          if (fluxosColId) {
            etapasCol.fields.add(
              new RelationField({
                name: 'desvio_fluxo_id',
                collectionId: fluxosColId,
                maxSelect: 1,
                required: false,
              }),
            )
          } else {
            etapasCol.fields.add(
              new TextField({
                name: 'desvio_fluxo_id',
                required: false,
              }),
            )
          }
        }

        app.save(etapasCol)
      }
    } catch (errEtapas) {
      console.log('[MIGRATION 1745260065] Erro ao adicionar campos em etapas_follow_up:', errEtapas)
    }

    // 2. Criar coleção ou verificar suporte no backend para persistência
    // Destinatários ficam guardados como JSON em disparos_massa.destinatarios
  },
  (app) => {
    // Reversão segura se necessário
    try {
      const etapasCol = app.findCollectionByNameOrId('etapas_follow_up')
      if (etapasCol) {
        etapasCol.fields.removeByName('desvio_acao')
        etapasCol.fields.removeByName('desvio_dias')
        etapasCol.fields.removeByName('desvio_fluxo_id')
        app.save(etapasCol)
      }
    } catch (_) {}
  },
)
