migrate(
  (app) => {
    // 1. Criar a coleção equipamentos
    const collection = new Collection({
      name: 'equipamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['inversor', 'modulo_fv'],
          maxSelect: 1,
        },
        {
          name: 'marca',
          type: 'text',
          required: true,
        },
        {
          name: 'modelo',
          type: 'text',
          required: true,
        },
        {
          name: 'potencia_w',
          type: 'number',
          required: true,
        },
        {
          name: 'descricao_padrao',
          type: 'text',
        },
        {
          name: 'garantia_anos',
          type: 'number',
        },
        {
          name: 'foto',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
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
      indexes: [
        'CREATE INDEX idx_equipamentos_tipo ON equipamentos (tipo)',
        'CREATE INDEX idx_equipamentos_marca ON equipamentos (marca)',
        'CREATE INDEX idx_equipamentos_modelo ON equipamentos (modelo)',
      ],
    })
    app.save(collection)

    // 2. Inserir os 6 equipamentos de exemplo (seed)
    const seedEquipamentos = [
      {
        tipo: 'inversor',
        marca: 'Huawei',
        modelo: 'SUN2000-6KTL-L1',
        potencia_w: 6000,
        garantia_anos: 5,
        descricao_padrao: 'Inversor híbrido monofásico com 2 MPPTs e monitoramento inteligente',
      },
      {
        tipo: 'inversor',
        marca: 'Growatt',
        modelo: 'MIN 5000TL-X',
        potencia_w: 5000,
        garantia_anos: 10,
        descricao_padrao:
          'Inversor string monofásico com duplo MPPT, Wi-Fi integrado e alta eficiência de conversão',
      },
      {
        tipo: 'inversor',
        marca: 'Fronius',
        modelo: 'Primo 5.0-1',
        potencia_w: 5000,
        garantia_anos: 10,
        descricao_padrao:
          'Inversor string monofásico com tecnologia SnapINvert, monitoramento via WLAN e classe de eficiência A',
      },
      {
        tipo: 'modulo_fv',
        marca: 'JA Solar',
        modelo: 'JAM66D45LB',
        potencia_w: 610,
        garantia_anos: 12,
        descricao_padrao:
          'Módulo fotovoltaico bifacial N-Type de 610W com células TOPOCon, garantia de produto de 12 anos e 30 anos de performance',
      },
      {
        tipo: 'modulo_fv',
        marca: 'Canadian Solar',
        modelo: 'CS6W-550MS',
        potencia_w: 550,
        garantia_anos: 12,
        descricao_padrao:
          'Módulo fotovoltaico monocristalino HiKu de 550W com células PERC de meia-corte e alta performance em baixa irradiância',
      },
      {
        tipo: 'modulo_fv',
        marca: 'Longi',
        modelo: 'LR5-72HPH-580M',
        potencia_w: 580,
        garantia_anos: 12,
        descricao_padrao:
          'Módulo fotovoltaico Hi-MO 5 de 580W com células bifaciais PERC e garantia linear de performance de 25 anos',
      },
    ]

    const equipamentosCol = app.findCollectionByNameOrId('equipamentos')
    for (const item of seedEquipamentos) {
      try {
        app.findFirstRecordByData('equipamentos', 'modelo', item.modelo)
      } catch (_) {
        const record = new Record(equipamentosCol)
        record.set('tipo', item.tipo)
        record.set('marca', item.marca)
        record.set('modelo', item.modelo)
        record.set('potencia_w', item.potencia_w)
        record.set('garantia_anos', item.garantia_anos)
        record.set('descricao_padrao', item.descricao_padrao)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('equipamentos')
      app.delete(collection)
    } catch (_) {}
  },
)
