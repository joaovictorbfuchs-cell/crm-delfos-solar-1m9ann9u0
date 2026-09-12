migrate(
  (app) => {
    // 1. Criar coleção atividades_setor para atividades pré-cadastradas e dinâmicas
    let atividadesSetor
    try {
      atividadesSetor = app.findCollectionByNameOrId('atividades_setor')
    } catch (_) {
      atividadesSetor = new Collection({
        name: 'atividades_setor',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(atividadesSetor)
    }

    // Seed das 7 atividades pré-cadastradas do setor de energia solar
    const opcoesPadrao = [
      'Instalador',
      'Fornecedor de Equipamentos',
      'Engenharia',
      'Consultoria',
      'Manutenção',
      'Financiamento',
      'Outros',
    ]

    const colAtiv = app.findCollectionByNameOrId('atividades_setor')
    for (let i = 0; i < opcoesPadrao.length; i++) {
      const nomeOpcao = opcoesPadrao[i]
      try {
        app.findFirstRecordByData('atividades_setor', 'nome', nomeOpcao)
      } catch (_) {
        const rec = new Record(colAtiv)
        rec.set('nome', nomeOpcao)
        app.save(rec)
      }
    }

    // 2. Atualizar coleção clientes com novos campos se não existirem
    const clientes = app.findCollectionByNameOrId('clientes')
    if (!clientes.fields.getByName('tipo_pessoa')) {
      clientes.fields.add(new TextField({ name: 'tipo_pessoa' })) // 'fisica' | 'juridica'
    }
    if (!clientes.fields.getByName('telefone_secundario')) {
      clientes.fields.add(new TextField({ name: 'telefone_secundario' }))
    }
    if (!clientes.fields.getByName('contato_principal')) {
      clientes.fields.add(new TextField({ name: 'contato_principal' }))
    }
    if (!clientes.fields.getByName('atividade_principal')) {
      clientes.fields.add(new TextField({ name: 'atividade_principal' }))
    }
    if (!clientes.fields.getByName('observacoes')) {
      clientes.fields.add(new TextField({ name: 'observacoes' }))
    }
    if (!clientes.fields.getByName('como_conheceu')) {
      clientes.fields.add(new TextField({ name: 'como_conheceu' }))
    }
    if (!clientes.fields.getByName('data_abertura')) {
      clientes.fields.add(new TextField({ name: 'data_abertura' }))
    }
    app.save(clientes)

    // 3. Atualizar coleção fornecedores com novos campos se não existirem
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    if (!fornecedores.fields.getByName('tipo_pessoa')) {
      fornecedores.fields.add(new TextField({ name: 'tipo_pessoa' })) // 'fisica' | 'juridica'
    }
    if (!fornecedores.fields.getByName('cpf')) {
      fornecedores.fields.add(new TextField({ name: 'cpf' }))
    }
    if (!fornecedores.fields.getByName('telefone_secundario')) {
      fornecedores.fields.add(new TextField({ name: 'telefone_secundario' }))
    }
    if (!fornecedores.fields.getByName('contato_principal')) {
      fornecedores.fields.add(new TextField({ name: 'contato_principal' }))
    }
    if (!fornecedores.fields.getByName('atividade_principal')) {
      fornecedores.fields.add(new TextField({ name: 'atividade_principal' }))
    }
    if (!fornecedores.fields.getByName('como_conheceu')) {
      fornecedores.fields.add(new TextField({ name: 'como_conheceu' }))
    }
    app.save(fornecedores)
  },
  (app) => {
    // Reverter campos
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      const clientFields = [
        'tipo_pessoa',
        'telefone_secundario',
        'contato_principal',
        'atividade_principal',
        'observacoes',
        'como_conheceu',
        'data_abertura',
      ]
      for (let i = 0; i < clientFields.length; i++) {
        if (clientes.fields.getByName(clientFields[i])) {
          clientes.fields.removeByName(clientFields[i])
        }
      }
      app.save(clientes)
    } catch (_) {}

    try {
      const fornecedores = app.findCollectionByNameOrId('fornecedores')
      const fornFields = [
        'tipo_pessoa',
        'cpf',
        'telefone_secundario',
        'contato_principal',
        'atividade_principal',
        'como_conheceu',
      ]
      for (let i = 0; i < fornFields.length; i++) {
        if (fornecedores.fields.getByName(fornFields[i])) {
          fornecedores.fields.removeByName(fornFields[i])
        }
      }
      app.save(fornecedores)
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('atividades_setor')
      app.delete(col)
    } catch (_) {}
  },
)
