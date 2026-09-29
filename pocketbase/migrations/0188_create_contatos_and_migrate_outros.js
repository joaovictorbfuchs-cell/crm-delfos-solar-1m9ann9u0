migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const clientesColId = clientesCol.id

    let negociosColId = null
    try {
      negociosColId = app.findCollectionByNameOrId('negocios').id
    } catch (e) {
      // se nao achar, continua null
    }

    // 1. Criar colecao 'contatos' se ainda nao existir
    let contatosCol
    try {
      contatosCol = app.findCollectionByNameOrId('contatos')
    } catch (e) {
      const fields = [
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'whatsapp', type: 'text' },
        { name: 'email', type: 'email' },
        {
          name: 'papel',
          type: 'select',
          values: [
            'cliente',
            'lead',
            'fornecedor',
            'tecnico',
            'parceiro',
            'familiar',
            'responsavel',
            'financeiro',
            'outro',
          ],
          maxSelect: 1,
        },
        { name: 'cargo', type: 'text' },
        { name: 'observacoes', type: 'text' },
        {
          name: 'clientes_vinculados',
          type: 'relation',
          collectionId: clientesColId,
          cascadeDelete: false,
          maxSelect: 200,
        },
        { name: 'conversa_id', type: 'text' },
        { name: 'origem_registro', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ]

      if (negociosColId) {
        fields.splice(8, 0, {
          name: 'negocios_vinculados',
          type: 'relation',
          collectionId: negociosColId,
          cascadeDelete: false,
          maxSelect: 200,
        })
      }

      contatosCol = new Collection({
        name: 'contatos',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: fields,
        indexes: [],
      })
      app.save(contatosCol)
    }

    // 2. Migrar registros de outros_contatos para contatos (se ainda nao migrados)
    try {
      const outros = app.findAllExternal('outros_contatos')
      const contatosCadastrados = app.findAllExternal('contatos')
      const nomesTelefonesExistentes = new Set()
      for (let i = 0; i < contatosCadastrados.length; i++) {
        const c = contatosCadastrados[i]
        const chave = ((c.get('nome') || '') + '|' + (c.get('whatsapp') || c.get('telefone') || ''))
          .toLowerCase()
          .trim()
        nomesTelefonesExistentes.add(chave)
      }

      const contatosColRef = app.findCollectionByNameOrId('contatos')

      for (let i = 0; i < outros.length; i++) {
        const oc = outros[i]
        const nome = (oc.get('nome') || '').trim() || 'Contato sem nome'
        const tel = (oc.get('telefone') || '').trim()
        const tipo = (oc.get('tipo_contato') || 'outro').toLowerCase()

        // Mapear papel
        let papel = 'outro'
        if (tipo === 'fornecedor') papel = 'fornecedor'
        else if (tipo === 'instalador') papel = 'tecnico'
        else if (tipo === 'parceiro') papel = 'parceiro'

        const obs = oc.get('observacao') || ''
        const conversaId = oc.get('conversa_id') || ''

        // Regra WhatsApp autoritativo: se tem telefone que nao seja 00000000000, salva como whatsapp e telefone
        const isTelValido = tel && tel !== '00000000000'
        const whatsapp = isTelValido ? tel : ''
        const telefone = isTelValido ? tel : ''

        const chave = (nome + '|' + (whatsapp || telefone)).toLowerCase().trim()
        if (!nomesTelefonesExistentes.has(chave)) {
          const record = new Record(contatosColRef)
          record.set('nome', nome)
          record.set('telefone', telefone)
          record.set('whatsapp', whatsapp)
          record.set('papel', papel)
          record.set('observacoes', obs)
          record.set('conversa_id', conversaId)
          record.set('origem_registro', 'migracao_outros_contatos')
          app.save(record)
          nomesTelefonesExistentes.add(chave)
        }
      }
    } catch (err) {
      console.log('Erro na migracao de outros_contatos:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('contatos')
      app.delete(col)
    } catch (e) {
      // ok
    }
  },
)
