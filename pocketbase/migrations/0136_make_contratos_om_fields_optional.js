migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contratos_om')

    // Campos da collection contratos_om que devem ser opcionais para prevenir erro HTTP 400
    // caso o formulário ou chamadas externas enviem valores nulos/vazios
    const camposOpcionais = ['valor_mensal', 'valor_anual', 'data_inicio', 'data_vencimento']

    for (const nome of camposOpcionais) {
      const field = col.fields.getByName(nome)
      if (field) {
        field.required = false
      }
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('contratos_om')
      const camposObrig = ['valor_mensal', 'valor_anual', 'data_inicio', 'data_vencimento']
      for (const nome of camposObrig) {
        const field = col.fields.getByName(nome)
        if (field) {
          field.required = true
        }
      }
      app.save(col)
    } catch (_) {}
  },
)
