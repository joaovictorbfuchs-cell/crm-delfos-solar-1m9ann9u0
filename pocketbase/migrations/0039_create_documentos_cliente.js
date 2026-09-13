migrate(
  (app) => {
    // 1. Obter id da coleção clientes
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const clientesColId = clientesCol.id

    // 2. Criar coleção documentos_cliente se não existir
    let docsCol
    try {
      docsCol = app.findCollectionByNameOrId('documentos_cliente')
    } catch (_) {
      docsCol = new Collection({
        name: 'documentos_cliente',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          {
            name: 'cliente_id',
            type: 'relation',
            required: true,
            collectionId: clientesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: [
              'procuracao',
              'contrato',
              'anexo_e',
              'anexo_f',
              'anexo_g',
              'troca_titularidade',
            ],
            maxSelect: 1,
          },
          {
            name: 'status_assinatura',
            type: 'select',
            required: true,
            values: ['aguardando_assinatura', 'assinado'],
            maxSelect: 1,
          },
          {
            name: 'data_envio',
            type: 'date',
            required: false,
          },
          {
            name: 'data_assinatura',
            type: 'date',
            required: false,
          },
          {
            name: 'canal_envio',
            type: 'text',
            required: false,
          },
          {
            name: 'telefone_envio',
            type: 'text',
            required: false,
          },
          {
            name: 'observacoes',
            type: 'text',
            required: false,
          },
          {
            name: 'autor',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_docs_cli_cliente ON documentos_cliente (cliente_id)',
          'CREATE INDEX idx_docs_cli_tipo ON documentos_cliente (tipo)',
          'CREATE INDEX idx_docs_cli_status ON documentos_cliente (status_assinatura)',
          'CREATE INDEX idx_docs_cli_cliente_tipo ON documentos_cliente (cliente_id, tipo)',
        ],
      })
      app.save(docsCol)
    }

    // 3. Seed de exemplo para o cliente Marcelo Becker (procuração assinada e contrato aguardando assinatura)
    try {
      const marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')

      // Procuração: assinado com data de assinatura
      let procRecord = null
      try {
        const procs = app.findRecordsByFilter(
          'documentos_cliente',
          `cliente_id='${marcelo.id}' && tipo='procuracao'`,
          '-created',
          1,
          0,
        )
        if (procs.length > 0) procRecord = procs[0]
      } catch (_) {}

      if (!procRecord) {
        const rec = new Record(docsCol)
        rec.set('cliente_id', marcelo.id)
        rec.set('tipo', 'procuracao')
        rec.set('status_assinatura', 'assinado')
        rec.set('data_envio', '2026-03-10 14:30:00.000Z')
        rec.set('data_assinatura', '2026-03-12 11:00:00.000Z')
        rec.set('canal_envio', 'whatsapp')
        rec.set('telefone_envio', '(54) 99712-8844')
        rec.set('observacoes', 'Procuração assinada digitalmente e homologada junto à RGE.')
        rec.set('autor', 'Eng. Mateus Fontana')
        app.save(rec)
      }

      // Contrato: aguardando_assinatura
      let contratoRecord = null
      try {
        const contratos = app.findRecordsByFilter(
          'documentos_cliente',
          `cliente_id='${marcelo.id}' && tipo='contrato'`,
          '-created',
          1,
          0,
        )
        if (contratos.length > 0) contratoRecord = contratos[0]
      } catch (_) {}

      if (!contratoRecord) {
        const rec = new Record(docsCol)
        rec.set('cliente_id', marcelo.id)
        rec.set('tipo', 'contrato')
        rec.set('status_assinatura', 'aguardando_assinatura')
        rec.set('data_envio', '2026-03-14 09:15:00.000Z')
        rec.set('canal_envio', 'whatsapp')
        rec.set('telefone_envio', '(54) 99712-8844')
        rec.set(
          'observacoes',
          'Contrato de fornecimento e instalação enviado ao cliente via WhatsApp.',
        )
        rec.set('autor', 'Eng. Mateus Fontana')
        app.save(rec)
      }
    } catch (e) {
      console.log('Erro ao semear documentos para Marcelo Becker:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('documentos_cliente')
      app.delete(col)
    } catch (_) {}
  },
)
