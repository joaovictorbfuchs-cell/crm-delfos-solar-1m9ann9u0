migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    // 1. Adicionar campos cadastrais que faltam na coleção clientes
    const newTextFields = [
      'nome_fantasia',
      'razao_social',
      'cnpj',
      'cpf',
      'inscricao_estadual',
      'email',
      'cep',
      'estado',
      'bairro',
      'numero',
      'complemento',
      'contato',
      'data_nascimento_fundacao',
      'rg',
    ]

    for (const fieldName of newTextFields) {
      if (!clientes.fields.getByName(fieldName)) {
        clientes.fields.add(new TextField({ name: fieldName }))
      }
    }

    app.save(clientes)

    // 2. Criar a coleção 'sistemas' vinculada ao cliente
    const clientesColId = app.findCollectionByNameOrId('clientes').id

    let sistemas
    try {
      sistemas = app.findCollectionByNameOrId('sistemas')
    } catch (_) {
      sistemas = new Collection({
        name: 'sistemas',
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
          // Geração média mensal (destaque no início de dados técnicos)
          { name: 'geracao_media_mensal_kwh', type: 'number', min: 0 },
          // Dados de instalação existentes migrados
          { name: 'data_instalacao', type: 'date' },
          { name: 'potencia_total_kwp', type: 'number', min: 0 },
          { name: 'quantidade_placas', type: 'number', min: 0 },
          { name: 'marca_placas', type: 'text' },
          {
            name: 'tipo_telhado',
            type: 'select',
            values: ['ceramico', 'metalico', 'laje', 'fibrocimento'],
            maxSelect: 1,
          },
          { name: 'numero_uc', type: 'text' },
          // Localização geográfica
          { name: 'latitude', type: 'number' },
          { name: 'longitude', type: 'number' },
          // Concessionária
          { name: 'padrao_entrada', type: 'text' }, // ex: "RIC BT Categoria A2"
          {
            name: 'tipo_atendimento',
            type: 'select',
            values: ['aéreo', 'subterrâneo'],
            maxSelect: 1,
          },
          {
            name: 'numero_fases',
            type: 'select',
            values: ['monofásico', 'bifásico', 'trifásico'],
            maxSelect: 1,
          },
          { name: 'secao_cabos', type: 'text' }, // ex: "16 mm²"
          { name: 'tipo_caixa_medicao', type: 'text' }, // ex: "caixa de medição instalada em poste"
          { name: 'amperagem_disjuntor', type: 'text' }, // ex: "40 A"
          // Equipamentos
          { name: 'quantidade_modulos', type: 'number', min: 0 },
          { name: 'fabricante_modulos', type: 'text' },
          { name: 'modelo_modulos', type: 'text' },
          { name: 'fabricante_inversores', type: 'text' },
          { name: 'modelo_inversores', type: 'text' },
          { name: 'potencia_pico_modulos_kwp', type: 'number', min: 0 },
          { name: 'potencia_pico_inversores_kwp', type: 'number', min: 0 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_sistemas_cliente_id ON sistemas (cliente_id)'],
      })
      app.save(sistemas)
    }

    // 3. Migrar dados técnicos existentes de 'clientes' para 'sistemas'
    // Para cada cliente existente, se ainda não tiver sistema, criar um
    const existingClients = app.findRecordsByFilter('clientes', '', 'created', 1000, 0)
    for (const c of existingClients) {
      const cId = c.get('id')
      let hasSistema = false
      try {
        app.findFirstRecordByData('sistemas', 'cliente_id', cId)
        hasSistema = true
      } catch (_) {
        hasSistema = false
      }

      if (!hasSistema) {
        const potencia = Number(c.get('potencia_kwp')) || 0
        const placasQtd = Number(c.get('placas_qtd')) || 0
        const geracaoMedia = potencia > 0 ? Math.round(potencia * 125) : 0

        const sisRecord = new Record(app.findCollectionByNameOrId('sistemas'))
        sisRecord.set('cliente_id', cId)
        sisRecord.set('geracao_media_mensal_kwh', geracaoMedia)
        sisRecord.set('data_instalacao', c.get('data_instalacao') || '')
        sisRecord.set('potencia_total_kwp', potencia)
        sisRecord.set('quantidade_placas', placasQtd)
        sisRecord.set('marca_placas', c.get('placas_marca') || '')
        sisRecord.set('tipo_telhado', c.get('telhado_tipo') || 'ceramico')
        sisRecord.set('numero_uc', c.get('uc') || '')
        sisRecord.set('quantidade_modulos', placasQtd)
        sisRecord.set('fabricante_modulos', c.get('placas_marca') || '')
        sisRecord.set('fabricante_inversores', c.get('inversor_marca') || '')
        sisRecord.set('modelo_inversores', c.get('inversor_modelo') || '')
        sisRecord.set('potencia_pico_modulos_kwp', potencia)
        sisRecord.set('potencia_pico_inversores_kwp', potencia)
        sisRecord.set('padrao_entrada', 'RIC BT Categoria A2')
        sisRecord.set('tipo_atendimento', 'aéreo')
        sisRecord.set('numero_fases', potencia > 10 ? 'trifásico' : 'bifásico')
        sisRecord.set('secao_cabos', potencia > 10 ? '16 mm²' : '10 mm²')
        sisRecord.set('tipo_caixa_medicao', 'Caixa de medição instalada em poste')
        sisRecord.set('amperagem_disjuntor', potencia > 10 ? '50 A' : '40 A')

        app.save(sisRecord)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('sistemas')
      app.delete(col)
    } catch (_) {}

    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      const fieldsToRemove = [
        'nome_fantasia',
        'razao_social',
        'cnpj',
        'cpf',
        'inscricao_estadual',
        'email',
        'cep',
        'estado',
        'bairro',
        'numero',
        'complemento',
        'contato',
        'data_nascimento_fundacao',
        'rg',
      ]
      for (const f of fieldsToRemove) {
        const fld = clientes.fields.getByName(f)
        if (fld) clientes.fields.remove(fld)
      }
      app.save(clientes)
    } catch (_) {}
  },
)
