migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')

    // 1. Criar coleção contatos_adicionais
    let contatosAdicionaisCol
    try {
      contatosAdicionaisCol = app.findCollectionByNameOrId('contatos_adicionais')
    } catch (_) {
      contatosAdicionaisCol = new Collection({
        name: 'contatos_adicionais',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          {
            name: 'cliente',
            type: 'relation',
            required: true,
            collectionId: clientesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'nome',
            type: 'text',
            required: true,
          },
          {
            name: 'cargo',
            type: 'text',
            required: false,
          },
          {
            name: 'telefone',
            type: 'text',
            required: false,
          },
          {
            name: 'email',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_contatos_adicionais_cliente ON contatos_adicionais (cliente)',
          'CREATE INDEX idx_contatos_adicionais_nome ON contatos_adicionais (nome)',
        ],
      })
      app.save(contatosAdicionaisCol)
    }

    // 2. Seed / Demonstração:
    // Identificar um cliente de demonstração (ex.: Marcelo Becker ou Solar do Alto Vale ou Maria Santos)
    // Se o cliente não possuir contato_principal ou contato definido, preenchemos para que o contato principal fique visível.
    // E criamos 2 contatos adicionais vinculados:
    // 1) Dono / Diretor Geral
    // 2) Pessoa do Financeiro
    try {
      let clienteAlvo = null
      try {
        clienteAlvo = app.findFirstRecordByData('clientes', 'id', '9ozpqdm9sgwmdzr') // Marcelo Becker
      } catch (_) {
        try {
          clienteAlvo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
        } catch (_) {
          const allCli = app.findRecordsByFilter('clientes', 'id != ""', 'created', 1, 0)
          if (allCli && allCli.length > 0) {
            clienteAlvo = allCli[0]
          }
        }
      }

      if (clienteAlvo) {
        // Garantir que os dados do contato principal estejam claros e completos
        if (!clienteAlvo.getString('contato_principal')) {
          clienteAlvo.set('contato_principal', 'Marcelo Becker')
        }
        if (!clienteAlvo.getString('contato')) {
          clienteAlvo.set('contato', 'Marcelo Becker (Proprietário)')
        }
        if (!clienteAlvo.getString('email')) {
          clienteAlvo.set('email', 'marcelo.becker@fazenda3palmeiras.com.br')
        }
        if (!clienteAlvo.getString('telefone')) {
          clienteAlvo.set('telefone', '(54) 99712-8844')
        }
        app.save(clienteAlvo)

        const col = app.findCollectionByNameOrId('contatos_adicionais')

        // 1º Contato Adicional: Dono / Sócio-Diretor
        try {
          app.findFirstRecordByData('contatos_adicionais', 'nome', 'Rodrigo Becker')
        } catch (_) {
          const c1 = new Record(col)
          c1.set('cliente', clienteAlvo.id)
          c1.set('nome', 'Rodrigo Becker')
          c1.set('cargo', 'Sócio Proprietário / Dono')
          c1.set('telefone', '(54) 99841-2233')
          c1.set('email', 'rodrigo.becker@fazenda3palmeiras.com.br')
          app.save(c1)
        }

        // 2º Contato Adicional: Pessoa do Financeiro
        try {
          app.findFirstRecordByData('contatos_adicionais', 'nome', 'Juliana Moreira')
        } catch (_) {
          const c2 = new Record(col)
          c2.set('cliente', clienteAlvo.id)
          c2.set('nome', 'Juliana Moreira')
          c2.set('cargo', 'Gerente Financeira / Contas a Pagar')
          c2.set('telefone', '(54) 99188-4455')
          c2.set('email', 'financeiro@fazenda3palmeiras.com.br')
          app.save(c2)
        }
      }
    } catch (seedErr) {
      console.warn('Aviso ao semear contatos adicionais de exemplo:', seedErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('contatos_adicionais')
      app.delete(col)
    } catch (_) {}
  },
)
