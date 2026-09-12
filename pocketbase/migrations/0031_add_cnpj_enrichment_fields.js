migrate(
  (app) => {
    // 1. Coleção clientes: adicionar cnae_principal e situacao_cadastral se não existirem
    const clientes = app.findCollectionByNameOrId('clientes')
    if (!clientes.fields.getByName('cnae_principal')) {
      clientes.fields.add(new TextField({ name: 'cnae_principal' }))
    }
    if (!clientes.fields.getByName('situacao_cadastral')) {
      clientes.fields.add(new TextField({ name: 'situacao_cadastral' }))
    }
    app.save(clientes)

    // 2. Coleção fornecedores: adicionar cnae_principal, situacao_cadastral, razao_social, nome_fantasia, cep, cidade, estado, bairro, numero, complemento se não existirem
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    if (!fornecedores.fields.getByName('cnae_principal')) {
      fornecedores.fields.add(new TextField({ name: 'cnae_principal' }))
    }
    if (!fornecedores.fields.getByName('situacao_cadastral')) {
      fornecedores.fields.add(new TextField({ name: 'situacao_cadastral' }))
    }
    if (!fornecedores.fields.getByName('razao_social')) {
      fornecedores.fields.add(new TextField({ name: 'razao_social' }))
    }
    if (!fornecedores.fields.getByName('nome_fantasia')) {
      fornecedores.fields.add(new TextField({ name: 'nome_fantasia' }))
    }
    if (!fornecedores.fields.getByName('cep')) {
      fornecedores.fields.add(new TextField({ name: 'cep' }))
    }
    if (!fornecedores.fields.getByName('cidade')) {
      fornecedores.fields.add(new TextField({ name: 'cidade' }))
    }
    if (!fornecedores.fields.getByName('estado')) {
      fornecedores.fields.add(new TextField({ name: 'estado' }))
    }
    if (!fornecedores.fields.getByName('bairro')) {
      fornecedores.fields.add(new TextField({ name: 'bairro' }))
    }
    if (!fornecedores.fields.getByName('numero')) {
      fornecedores.fields.add(new TextField({ name: 'numero' }))
    }
    if (!fornecedores.fields.getByName('complemento')) {
      fornecedores.fields.add(new TextField({ name: 'complemento' }))
    }
    if (!fornecedores.fields.getByName('data_abertura')) {
      fornecedores.fields.add(new TextField({ name: 'data_abertura' }))
    }
    app.save(fornecedores)
  },
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    if (clientes.fields.getByName('cnae_principal')) {
      clientes.fields.removeByName('cnae_principal')
    }
    if (clientes.fields.getByName('situacao_cadastral')) {
      clientes.fields.removeByName('situacao_cadastral')
    }
    app.save(clientes)

    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    const fieldsToRemove = [
      'cnae_principal',
      'situacao_cadastral',
      'razao_social',
      'nome_fantasia',
      'cep',
      'cidade',
      'estado',
      'bairro',
      'numero',
      'complemento',
      'data_abertura',
    ]
    for (let i = 0; i < fieldsToRemove.length; i++) {
      const f = fieldsToRemove[i]
      if (fornecedores.fields.getByName(f)) {
        fornecedores.fields.removeByName(f)
      }
    }
    app.save(fornecedores)
  },
)
