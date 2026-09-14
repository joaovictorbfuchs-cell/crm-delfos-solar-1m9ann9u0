migrate(
  (app) => {
    // 0069: Definir data_fechamento para os clientes fechados
    try {
      const fechados = app.findRecordsByFilter('clientes', "status = 'Fechado'", '-created', 50, 0)

      for (const rec of fechados) {
        let dateToSet = rec.getString('data_instalacao')
        if (!dateToSet) {
          const createdStr = rec.getString('created')
          if (createdStr) {
            dateToSet = createdStr
          } else {
            dateToSet = '2026-09-09 12:00:00.000Z'
          }
        }
        rec.set('data_fechamento', dateToSet)
        app.save(rec)
      }
    } catch (err) {
      console.warn('Erro ao atualizar data_fechamento na migration 0069:', err)
    }
  },
  (app) => {
    // Rollback
  },
)
