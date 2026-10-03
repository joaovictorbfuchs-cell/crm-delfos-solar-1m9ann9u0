migrate(
  (app) => {
    // 1. Criar a coleção configuracoes_monitoramento
    const configuracoesCol = new Collection({
      name: 'configuracoes_monitoramento',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'marca',
          type: 'text',
          required: true,
        },
        {
          name: 'titulo',
          type: 'text',
          required: false,
        },
        {
          name: 'tipo_procedimento',
          type: 'select',
          required: false,
          values: ['pdf', 'link'],
          maxSelect: 1,
        },
        {
          name: 'arquivo_pdf',
          type: 'file',
          maxSelect: 1,
          maxSize: 20971520, // 20MB
          mimeTypes: ['application/pdf'],
          required: false,
        },
        {
          name: 'link_procedimento',
          type: 'url',
          required: false,
        },
        {
          name: 'instrucoes',
          type: 'text',
          required: false,
        },
        {
          name: 'ativo',
          type: 'bool',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: ['CREATE INDEX idx_cfg_monitoramento_marca ON configuracoes_monitoramento (marca)'],
    })
    app.save(configuracoesCol)

    // 2. Adicionar configuracao_monitoramento_id à coleção equipamentos
    const equipamentosCol = app.findCollectionByNameOrId('equipamentos')
    if (!equipamentosCol.fields.getByName('configuracao_monitoramento_id')) {
      equipamentosCol.fields.add(
        new RelationField({
          name: 'configuracao_monitoramento_id',
          collectionId: configuracoesCol.id,
          maxSelect: 1,
          required: false,
          cascadeDelete: false,
        }),
      )
      app.save(equipamentosCol)
    }

    // 3. Seed inicial opcional com base nas marcas conhecidas (Huawei, Growatt, Fronius, Deye, Solis)
    const seed = [
      {
        marca: 'Huawei',
        titulo: 'Configuração Datalogger / FusionSolar - Huawei',
        tipo_procedimento: 'link',
        link_procedimento: 'https://intl.fusionsolar.huawei.com',
        instrucoes:
          'Acessar portal FusionSolar ou conectar no Wi-Fi interno do SmartLogger / Dongle SDongleA-05.',
        ativo: true,
      },
      {
        marca: 'Growatt',
        titulo: 'Procedimento Datalogger ShineWiFi - Growatt',
        tipo_procedimento: 'link',
        link_procedimento: 'http://192.168.10.100',
        instrucoes: 'Acessar o IP local 192.168.10.100 ou parear via Bluetooth no app ShinePhone.',
        ativo: true,
      },
      {
        marca: 'Fronius',
        titulo: 'Configuração Datamanager / Solar.web - Fronius',
        tipo_procedimento: 'link',
        link_procedimento: 'http://192.168.250.181',
        instrucoes:
          'Pressionar o botão no Datamanager para ativar ponto de acesso Wi-Fi do inversor Fronius.',
        ativo: true,
      },
      {
        marca: 'Deye',
        titulo: 'Procedimento Datalogger / SOLARMAN - Deye',
        tipo_procedimento: 'link',
        link_procedimento: 'http://10.10.100.254',
        instrucoes:
          'Conectar à rede Wi-Fi AP do Datalogger Deye e configurar a rede do cliente pelo IP 10.10.100.254.',
        ativo: true,
      },
      {
        marca: 'SolarEdge',
        titulo: 'Configuração SetApp / mySolarEdge - SolarEdge',
        tipo_procedimento: 'link',
        link_procedimento: 'https://www.solaredge.com/setapp-help',
        instrucoes:
          'Conectar ao Wi-Fi local do inversor ou utilizar o aplicativo SetApp via QR Code.',
        ativo: true,
      },
      {
        marca: 'Solis',
        titulo: 'Procedimento Datalogger SolisCloud - Solis',
        tipo_procedimento: 'link',
        link_procedimento: 'https://www.soliscloud.com',
        instrucoes: 'Conectar ao ponto de acesso AP do datalogger Solis ou via app SolisCloud.',
        ativo: true,
      },
    ]

    for (const item of seed) {
      try {
        const record = new Record(configuracoesCol)
        record.set('marca', item.marca)
        record.set('titulo', item.titulo)
        record.set('tipo_procedimento', item.tipo_procedimento)
        record.set('link_procedimento', item.link_procedimento)
        record.set('instrucoes', item.instrucoes)
        record.set('ativo', item.ativo)
        app.save(record)
      } catch (err) {
        console.warn('Erro ao inserir seed de configuracao_monitoramento:', err)
      }
    }
  },
  (app) => {
    try {
      const equipamentosCol = app.findCollectionByNameOrId('equipamentos')
      if (equipamentosCol.fields.getByName('configuracao_monitoramento_id')) {
        equipamentosCol.fields.removeByName('configuracao_monitoramento_id')
        app.save(equipamentosCol)
      }
    } catch (_) {}

    try {
      const configuracoesCol = app.findCollectionByNameOrId('configuracoes_monitoramento')
      app.delete(configuracoesCol)
    } catch (_) {}
  },
)
