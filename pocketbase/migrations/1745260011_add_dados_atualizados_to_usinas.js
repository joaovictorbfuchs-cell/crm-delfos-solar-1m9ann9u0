migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('usinas')

    if (!collection.fields.getByName('dados_atualizados')) {
      collection.fields.add(
        new BoolField({
          name: 'dados_atualizados',
          required: false,
        }),
      )
      app.save(collection)
    }

    // Preencher registros legados existentes como dados_atualizados = true
    // para evitar bloqueio inesperado de fluxos legados já em andamento.
    // Novos registros nascem com default false (ou null/false) conforme o usuário pediu.
    try {
      app
        .db()
        .newQuery(
          'UPDATE usinas SET dados_atualizados = TRUE WHERE dados_atualizados IS NULL OR dados_atualizados = FALSE',
        )
        .execute()
    } catch (err) {
      console.log(
        '[migration 1745260011] Aviso ao atualizar dados_atualizados em usinas legadas:',
        err,
      )
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('usinas')
    const field = collection.fields.getByName('dados_atualizados')
    if (field) {
      collection.fields.removeByName('dados_atualizados')
      app.save(collection)
    }
  },
)
