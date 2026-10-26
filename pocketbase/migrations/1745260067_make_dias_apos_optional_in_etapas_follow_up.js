migrate(
  (app) => {
    // 1. Tornar dias_apos e desvio_dias opcionais (required = false) na coleção etapas_follow_up
    // No PocketBase v0.36, campos marcados como 'required' rejeitam o valor numérico 0 como se fosse blank.
    // Como a 1ª etapa permite legitimamente 0 ("Imediato") e desvios desativados usam 0,
    // a validação de obrigatoriedade/regras de negócio é garantida pela aplicação/frontend/serviços.
    try {
      const etapasCol = app.findCollectionByNameOrId('etapas_follow_up')
      if (etapasCol) {
        const diasAposField = etapasCol.fields.getByName('dias_apos')
        if (diasAposField) {
          diasAposField.required = false
        }

        const desvioDiasField = etapasCol.fields.getByName('desvio_dias')
        if (desvioDiasField) {
          desvioDiasField.required = false
        }

        app.save(etapasCol)
      }
    } catch (errEtapas) {
      console.log('[MIGRATION 1745260067] Erro ao atualizar campos em etapas_follow_up:', errEtapas)
      throw errEtapas
    }
  },
  (app) => {
    try {
      const etapasCol = app.findCollectionByNameOrId('etapas_follow_up')
      if (etapasCol) {
        const diasAposField = etapasCol.fields.getByName('dias_apos')
        if (diasAposField) {
          diasAposField.required = true
        }
        app.save(etapasCol)
      }
    } catch (_) {}
  },
)
