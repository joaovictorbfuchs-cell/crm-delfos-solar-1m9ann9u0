migrate(
  (app) => {
    // Fase 4 dos fluxos de follow-up: adicionar campos de ramificação de resposta em etapas_follow_up
    // resposta_acao: 'encerrar' (padrão) | 'fluxo_alternativo'
    // resposta_fluxo_id: relation para fluxos_follow_up
    try {
      const etapasCol = app.findCollectionByNameOrId('etapas_follow_up')
      if (etapasCol) {
        let hasRespostaAcao = false
        let hasRespostaFluxoId = false

        for (let i = 0; i < etapasCol.fields.length; i++) {
          const fName = etapasCol.fields[i].name
          if (fName === 'resposta_acao') hasRespostaAcao = true
          if (fName === 'resposta_fluxo_id') hasRespostaFluxoId = true
        }

        if (!hasRespostaAcao) {
          etapasCol.fields.add(
            new SelectField({
              name: 'resposta_acao',
              values: ['encerrar', 'fluxo_alternativo'],
              maxSelect: 1,
              required: false,
            }),
          )
        }

        if (!hasRespostaFluxoId) {
          let fluxosColId = ''
          try {
            const fCol = app.findCollectionByNameOrId('fluxos_follow_up')
            if (fCol) fluxosColId = fCol.id
          } catch (_) {}

          if (fluxosColId) {
            etapasCol.fields.add(
              new RelationField({
                name: 'resposta_fluxo_id',
                collectionId: fluxosColId,
                maxSelect: 1,
                required: false,
              }),
            )
          } else {
            etapasCol.fields.add(
              new TextField({
                name: 'resposta_fluxo_id',
                required: false,
              }),
            )
          }
        }

        app.save(etapasCol)
      }
    } catch (errEtapas) {
      console.log('[MIGRATION 1745260068] Erro ao adicionar campos em etapas_follow_up:', errEtapas)
    }
  },
  (app) => {
    try {
      const etapasCol = app.findCollectionByNameOrId('etapas_follow_up')
      if (etapasCol) {
        etapasCol.fields.removeByName('resposta_acao')
        etapasCol.fields.removeByName('resposta_fluxo_id')
        app.save(etapasCol)
      }
    } catch (_) {}
  },
)
