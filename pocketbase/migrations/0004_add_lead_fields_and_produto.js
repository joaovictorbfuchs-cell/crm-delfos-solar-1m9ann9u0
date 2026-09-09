migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')

    // 1. Adicionar campo 'produto' se não existir
    if (!col.fields.getByName('produto')) {
      col.fields.add(
        new SelectField({
          name: 'produto',
          values: [
            'Energia Solar',
            'Manutenção avulsa',
            'Plano de O&M',
            'Sistemas Híbridos',
            'Carregadores veiculares',
          ],
          maxSelect: 1,
        }),
      )
    }

    // 2. Adicionar campo 'consumo_kwh_mes' se não existir
    if (!col.fields.getByName('consumo_kwh_mes')) {
      col.fields.add(
        new NumberField({
          name: 'consumo_kwh_mes',
          min: 0,
        }),
      )
    }

    // 3. Adicionar campo 'origem_lead' se não existir
    if (!col.fields.getByName('origem_lead')) {
      col.fields.add(
        new SelectField({
          name: 'origem_lead',
          values: ['Facebook', 'Instagram', 'Indicação', 'Site', 'Outro'],
          maxSelect: 1,
        }),
      )
    }

    app.save(col)

    // 4. Preencher clientes existentes sem produto com 'Energia Solar'
    app
      .db()
      .newQuery(
        "UPDATE clientes SET produto = 'Energia Solar' WHERE produto IS NULL OR produto = ''",
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')

    const produtoField = col.fields.getByName('produto')
    if (produtoField) {
      col.fields.remove(produtoField)
    }

    const consumoField = col.fields.getByName('consumo_kwh_mes')
    if (consumoField) {
      col.fields.remove(consumoField)
    }

    const origemField = col.fields.getByName('origem_lead')
    if (origemField) {
      col.fields.remove(origemField)
    }

    app.save(col)
  },
)
