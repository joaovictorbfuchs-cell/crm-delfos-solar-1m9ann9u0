migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('usinas')

    // 1. Localização da Instalação
    if (!col.fields.getByName('cidade')) {
      col.fields.add(new TextField({ name: 'cidade' }))
    }
    if (!col.fields.getByName('estado')) {
      col.fields.add(new TextField({ name: 'estado' }))
    }
    if (!col.fields.getByName('cep')) {
      col.fields.add(new TextField({ name: 'cep' }))
    }
    if (!col.fields.getByName('bairro')) {
      col.fields.add(new TextField({ name: 'bairro' }))
    }
    if (!col.fields.getByName('numero')) {
      col.fields.add(new TextField({ name: 'numero' }))
    }
    if (!col.fields.getByName('complemento')) {
      col.fields.add(new TextField({ name: 'complemento' }))
    }

    // 2. Titular / Responsável pela Unidade Consumidora da Usina
    if (!col.fields.getByName('titular_nome')) {
      col.fields.add(new TextField({ name: 'titular_nome' }))
    }
    if (!col.fields.getByName('titular_cpf')) {
      col.fields.add(new TextField({ name: 'titular_cpf' }))
    }
    if (!col.fields.getByName('titular_telefone')) {
      col.fields.add(new TextField({ name: 'titular_telefone' }))
    }
    if (!col.fields.getByName('titular_email')) {
      col.fields.add(new TextField({ name: 'titular_email' }))
    }

    // 3. Concessionária de Energia
    if (!col.fields.getByName('tipo_fornecimento')) {
      col.fields.add(new TextField({ name: 'tipo_fornecimento' }))
    }
    if (!col.fields.getByName('consumo_kwh_mes')) {
      col.fields.add(new NumberField({ name: 'consumo_kwh_mes' }))
    }
    if (!col.fields.getByName('consumo_anual_kwh')) {
      col.fields.add(new NumberField({ name: 'consumo_anual_kwh' }))
    }
    if (!col.fields.getByName('consumo_medio_diario_kwh')) {
      col.fields.add(new NumberField({ name: 'consumo_medio_diario_kwh' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('usinas')
    const fieldsToRemove = [
      'cidade',
      'estado',
      'cep',
      'bairro',
      'numero',
      'complemento',
      'titular_nome',
      'titular_cpf',
      'titular_telefone',
      'titular_email',
      'tipo_fornecimento',
      'consumo_kwh_mes',
      'consumo_anual_kwh',
      'consumo_medio_diario_kwh',
    ]
    fieldsToRemove.forEach((f) => {
      col.fields.removeByName(f)
    })
    app.save(col)
  },
)
