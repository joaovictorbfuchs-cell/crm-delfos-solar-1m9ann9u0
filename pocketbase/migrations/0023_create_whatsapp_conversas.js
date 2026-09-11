migrate(
  (app) => {
    const clientesColId = app.findCollectionByNameOrId('clientes').id

    // 1. Criar collection whatsapp_conversas
    let conversasCol
    try {
      conversasCol = app.findCollectionByNameOrId('whatsapp_conversas')
    } catch (_) {
      conversasCol = new Collection({
        name: 'whatsapp_conversas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'numero', type: 'text', required: true },
          {
            name: 'cliente_id',
            type: 'relation',
            required: false,
            collectionId: clientesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['novo', 'em_atendimento', 'aguardando_cliente', 'resolvido'],
            maxSelect: 1,
          },
          { name: 'atendente', type: 'text', required: false },
          { name: 'atendente_id', type: 'text', required: false },
          { name: 'ultima_mensagem_preview', type: 'text', required: false },
          { name: 'ultima_mensagem_em', type: 'date', required: false },
          { name: 'nao_lidas', type: 'number', required: false, min: 0 },
          { name: 'vinculada_em', type: 'date', required: false },
          { name: 'resolvida_em', type: 'date', required: false },
          { name: 'reaberta_em', type: 'date', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_conversas_numero ON whatsapp_conversas (numero)',
          'CREATE INDEX idx_conversas_status ON whatsapp_conversas (status)',
          'CREATE INDEX idx_conversas_cliente ON whatsapp_conversas (cliente_id)',
          'CREATE INDEX idx_conversas_ultima_msg ON whatsapp_conversas (ultima_mensagem_em DESC)',
        ],
      })
      app.save(conversasCol)
    }

    const conversasColId = app.findCollectionByNameOrId('whatsapp_conversas').id

    // 2. Estender collection whatsapp_mensagens
    // Tornar cliente_id opcional (pois mensagens de números desconhecidos chegam sem cliente_id ainda)
    // Adicionar: conversa_id (relation para whatsapp_conversas), direcao (select: 'enviada' | 'recebida')
    const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')

    const clienteField = msgsCol.fields.getByName('cliente_id')
    if (clienteField && clienteField.required) {
      clienteField.required = false
    }

    if (!msgsCol.fields.getByName('conversa_id')) {
      msgsCol.fields.add(
        new RelationField({
          name: 'conversa_id',
          required: false,
          collectionId: conversasColId,
          cascadeDelete: true,
          maxSelect: 1,
        }),
      )
    }

    if (!msgsCol.fields.getByName('direcao')) {
      msgsCol.fields.add(
        new SelectField({
          name: 'direcao',
          required: false,
          values: ['enviada', 'recebida'],
          maxSelect: 1,
        }),
      )
    }

    app.save(msgsCol)

    // Adicionar índices em whatsapp_mensagens para conversa_id e direcao
    try {
      msgsCol.addIndex('idx_whatsapp_mensagens_conversa', false, 'conversa_id', '')
      msgsCol.addIndex('idx_whatsapp_mensagens_direcao', false, 'direcao', '')
      app.save(msgsCol)
    } catch (_) {}

    // Migrar mensagens antigas existentes: marcar como 'enviada' por padrão
    try {
      app
        .db()
        .newQuery(
          "UPDATE whatsapp_mensagens SET direcao = 'enviada' WHERE direcao IS NULL OR direcao = ''",
        )
        .execute()
    } catch (_) {}

    // Vincular mensagens antigas que já possuem cliente_id a uma conversa do cliente se houver telefone
    try {
      const records = app.findRecordsByFilter(
        'whatsapp_mensagens',
        "conversa_id = '' || conversa_id = null",
        'created',
        200,
        0,
      )
      const convRecCol = app.findCollectionByNameOrId('whatsapp_conversas')

      for (let i = 0; i < records.length; i++) {
        const msg = records[i]
        const dest = (msg.getString('telefone_destino') || '').trim()
        const clienteId = msg.getString('cliente_id')
        if (!dest) continue

        let cleanPhone = dest.replace(/\D/g, '')
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }

        // Achar ou criar conversa para esse número
        let convRec = null
        try {
          const found = app.findRecordsByFilter(
            'whatsapp_conversas',
            `numero = '${cleanPhone}'`,
            '-created',
            1,
            0,
          )
          if (found && found.length > 0) {
            convRec = found[0]
          }
        } catch (_) {}

        if (!convRec) {
          convRec = new Record(convRecCol)
          convRec.set('numero', cleanPhone)
          if (clienteId) {
            convRec.set('cliente_id', clienteId)
            convRec.set('vinculada_em', new Date().toISOString())
          }
          convRec.set('status', 'resolvido')
          convRec.set('atendente', 'João Silva')
          convRec.set('ultima_mensagem_preview', msg.getString('conteudo_final').substring(0, 80))
          convRec.set('ultima_mensagem_em', msg.getString('created'))
          convRec.set('nao_lidas', 0)
          app.save(convRec)
        }

        msg.set('conversa_id', convRec.id)
        app.save(msg)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
      if (msgsCol.fields.getByName('conversa_id')) {
        msgsCol.fields.removeByName('conversa_id')
      }
      if (msgsCol.fields.getByName('direcao')) {
        msgsCol.fields.removeByName('direcao')
      }
      app.save(msgsCol)
    } catch (_) {}

    try {
      const conversasCol = app.findCollectionByNameOrId('whatsapp_conversas')
      app.delete(conversasCol)
    } catch (_) {}
  },
)
