migrate(
  (app) => {
    // 1. Adicionar campo 'whatsapp' à collection 'clientes'
    const clientesCol = app.findCollectionByNameOrId('clientes')
    if (!clientesCol.fields.getByName('whatsapp')) {
      clientesCol.fields.add(
        new TextField({
          name: 'whatsapp',
          required: false,
        }),
      )
      app.save(clientesCol)
    }

    const clientesColId = app.findCollectionByNameOrId('clientes').id

    // 2. Criar collection whatsapp_templates
    let templatesCol
    try {
      templatesCol = app.findCollectionByNameOrId('whatsapp_templates')
    } catch (_) {
      templatesCol = new Collection({
        name: 'whatsapp_templates',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'titulo', type: 'text', required: true },
          { name: 'slug', type: 'text', required: true },
          { name: 'conteudo', type: 'text', required: true },
          { name: 'tipo_gatilho', type: 'text', required: false }, // proposta_aprovada | lembrete_visita | followup_posvenda | manual
          { name: 'variaveis_disponiveis', type: 'json' },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_whatsapp_templates_slug ON whatsapp_templates (slug)'],
      })
      app.save(templatesCol)
    }

    // 3. Criar collection whatsapp_mensagens
    const templatesColId = app.findCollectionByNameOrId('whatsapp_templates').id
    let mensagensCol
    try {
      mensagensCol = app.findCollectionByNameOrId('whatsapp_mensagens')
    } catch (_) {
      mensagensCol = new Collection({
        name: 'whatsapp_mensagens',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'cliente_id',
            type: 'relation',
            required: true,
            collectionId: clientesColId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'template_id',
            type: 'relation',
            required: false,
            collectionId: templatesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'telefone_destino', type: 'text', required: true },
          { name: 'conteudo_final', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['pendente', 'agendada', 'enviada', 'entregue', 'falha'],
            maxSelect: 1,
          },
          { name: 'agendado_para', type: 'date', required: false },
          { name: 'enviado_em', type: 'date', required: false },
          { name: 'tipo_disparo', type: 'text', required: false }, // manual | proposta_aprovada | lembrete_visita | followup_posvenda
          { name: 'referencia_id', type: 'text', required: false }, // ID do orcamento, atividade ou cliente para idempotencia
          { name: 'id_externo_gateway', type: 'text', required: false },
          { name: 'log_erro', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_whatsapp_mensagens_cliente ON whatsapp_mensagens (cliente_id)',
          'CREATE INDEX idx_whatsapp_mensagens_status ON whatsapp_mensagens (status)',
          'CREATE INDEX idx_whatsapp_mensagens_agendado ON whatsapp_mensagens (agendado_para)',
          'CREATE INDEX idx_whatsapp_mensagens_ref ON whatsapp_mensagens (referencia_id)',
        ],
      })
      app.save(mensagensCol)
    }

    // 4. Semear os 3 templates padrão solicitados
    const templatesRecCol = app.findCollectionByNameOrId('whatsapp_templates')

    const seedTemplates = [
      {
        slug: 'confirmacao_proposta',
        titulo: 'Confirmação de Proposta',
        tipo_gatilho: 'proposta_aprovada',
        conteudo:
          'Olá, {{nome_cliente}}! Temos uma excelente notícia da Delfos Solar: sua proposta de energia solar fotovoltaica no valor de {{valor_proposta}} foi aprovada com sucesso! Em breve nossa equipe entrará em contato para os próximos passos da homologação e projeto técnico no endereço {{endereco}}. Qualquer dúvida estamos à disposição!',
        variaveis: ['nome_cliente', 'data', 'valor_proposta', 'endereco'],
      },
      {
        slug: 'lembrete_visita_tecnica',
        titulo: 'Lembrete de Visita Técnica',
        tipo_gatilho: 'lembrete_visita',
        conteudo:
          'Olá, {{nome_cliente}}! Passando para lembrar da sua visita técnica com o time de engenharia da Delfos Solar, agendada para {{data}} no endereço {{endereco}}. Nossa equipe técnica estará no local para vistoria e levantamento das medidas do telhado. Confirmamos sua presença?',
        variaveis: ['nome_cliente', 'data', 'endereco'],
      },
      {
        slug: 'followup_pos_venda',
        titulo: 'Follow-up Pós-Venda',
        tipo_gatilho: 'followup_posvenda',
        conteudo:
          'Olá, {{nome_cliente}}! Tudo bem? Já se passaram alguns dias desde a conclusão da instalação do seu sistema solar fotovoltaico em {{endereco}}. Como tem sido sua experiência com a geração de energia limpa da Delfos Solar? Se precisar de suporte, esclarecimento ou configuração do monitoramento pelo aplicativo, nossa equipe está pronta para te atender!',
        variaveis: ['nome_cliente', 'data', 'endereco'],
      },
    ]

    for (const tpl of seedTemplates) {
      try {
        app.findFirstRecordByData('whatsapp_templates', 'slug', tpl.slug)
      } catch (_) {
        const record = new Record(templatesRecCol)
        record.set('slug', tpl.slug)
        record.set('titulo', tpl.titulo)
        record.set('tipo_gatilho', tpl.tipo_gatilho)
        record.set('conteudo', tpl.conteudo)
        record.set('variaveis_disponiveis', JSON.stringify(tpl.variaveis))
        record.set('ativo', true)
        app.save(record)
      }
    }

    // 5. Popular campo whatsapp nos clientes existentes com base no telefone atual se whatsapp estiver vazio
    try {
      const records = app.findRecordsByFilter(
        'clientes',
        "whatsapp = '' || whatsapp = null",
        '',
        100,
        0,
      )
      for (const c of records) {
        const tel = c.getString('telefone')
        if (tel) {
          c.set('whatsapp', tel)
          app.save(c)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const msgs = app.findCollectionByNameOrId('whatsapp_mensagens')
      app.delete(msgs)
    } catch (_) {}

    try {
      const tpls = app.findCollectionByNameOrId('whatsapp_templates')
      app.delete(tpls)
    } catch (_) {}

    try {
      const clientesCol = app.findCollectionByNameOrId('clientes')
      if (clientesCol.fields.getByName('whatsapp')) {
        clientesCol.fields.removeByName('whatsapp')
        app.save(clientesCol)
      }
    } catch (_) {}
  },
)
