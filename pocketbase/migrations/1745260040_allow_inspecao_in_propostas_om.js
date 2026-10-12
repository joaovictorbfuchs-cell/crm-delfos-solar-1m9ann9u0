migrate(
  (app) => {
    // 1. Atualizar a coleção propostas_om permitindo os valores ['Essencial', 'Inspeção', 'Completo', 'Prevenção']
    // para permitir 'Inspeção' e manter compatibilidade com 'Prevenção'
    try {
      const col = app.findCollectionByNameOrId('propostas_om')
      const planoField = col.fields.getByName('plano_escolhido')
      if (planoField) {
        planoField.values = ['Essencial', 'Inspeção', 'Completo', 'Prevenção']
      }
      app.save(col)
    } catch (e) {
      console.log('Aviso ao atualizar selectValues de propostas_om:', e)
    }

    // 2. Atualizar registros antigos com plano_escolhido = 'Prevenção' para 'Inspeção'
    try {
      app
        .db()
        .newQuery(
          "UPDATE propostas_om SET plano_escolhido = 'Inspeção' WHERE plano_escolhido = 'Prevenção'",
        )
        .execute()
    } catch (e) {
      console.log('Aviso ao migrar plano_escolhido Prevenção -> Inspeção em propostas_om:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('propostas_om')
      const planoField = col.fields.getByName('plano_escolhido')
      if (planoField) {
        planoField.values = ['Essencial', 'Prevenção', 'Completo']
      }
      app.save(col)
    } catch (_) {}
  },
)
