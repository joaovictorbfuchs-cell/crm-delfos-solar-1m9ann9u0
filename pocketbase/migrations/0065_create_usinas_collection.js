migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const contratosCol = app.findCollectionByNameOrId('contratos_om')

    // 1. Criar coleção usinas
    const usinasCol = new Collection({
      name: 'usinas',
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
          name: 'endereco',
          type: 'text',
          required: false,
        },
        {
          name: 'potencia_kwp',
          type: 'number',
          required: false,
        },
        {
          name: 'qtd_modulos',
          type: 'number',
          required: false,
        },
        {
          name: 'inversores_info',
          type: 'text',
          required: false,
        },
        {
          name: 'tipo_estrutura',
          type: 'select',
          required: false,
          values: ['solo', 'telhado'],
          maxSelect: 1,
        },
        {
          name: 'contrato_id',
          type: 'relation',
          required: false,
          collectionId: contratosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_usinas_cliente ON usinas (cliente_id)',
        'CREATE INDEX idx_usinas_contrato ON usinas (contrato_id)',
      ],
    })

    app.save(usinasCol)

    // 2. Migração retrocompatível: para cada cliente com dados de usina preenchidos
    // criar registro "Usina Principal - [Nome]" preservando endereço, potência, módulos e inversores;
    // vincular contrato O&M existente quando houver.
    try {
      const allClientes = app.findRecordsByFilter('clientes', 'id != ""', 'created', 1000, 0)
      for (const cli of allClientes) {
        // Ignorar clientes especiais de demonstração que serão configurados na migration seguinte
        if (
          cli.getString('nome').includes('Maria Santos') ||
          cli.getString('nome').includes('Marcelo Becker') ||
          cli.getString('nome').includes('Roberto Almeida')
        ) {
          continue
        }

        const pot = cli.getInt('potencia_kwp') || cli.get('potencia_kwp') || 0
        const endereco = (cli.getString('usina_endereco') || cli.getString('endereco') || '').trim()
        const qtdModulos = cli.getInt('placas_qtd') || 0
        const inversorMarca = (cli.getString('inversor_marca') || '').trim()
        const inversorModelo = (cli.getString('inversor_modelo') || '').trim()
        const inversoresInfo = [inversorMarca, inversorModelo].filter(Boolean).join(' ')
        const telhadoTipo = (cli.getString('telhado_tipo') || '').trim()
        const tipoEstrutura = telhadoTipo === 'solo' ? 'solo' : 'telhado'

        // Verificar se tem algum dado técnico de usina
        if (pot > 0 || qtdModulos > 0 || inversoresInfo || endereco) {
          const usinaRec = new Record(usinasCol)
          usinaRec.set('cliente_id', cli.id)
          usinaRec.set('nome', `Usina Principal - ${cli.getString('nome') || 'Cliente'}`)
          usinaRec.set('endereco', endereco)
          usinaRec.set('potencia_kwp', Number(pot) || 0)
          usinaRec.set('qtd_modulos', qtdModulos)
          usinaRec.set('inversores_info', inversoresInfo)
          usinaRec.set('tipo_estrutura', tipoEstrutura)

          // Buscar se o cliente possui contrato O&M
          try {
            const contratos = app.findRecordsByFilter(
              'contratos_om',
              `cliente_id = "${cli.id}"`,
              '-created',
              1,
              0,
            )
            if (contratos.length > 0) {
              usinaRec.set('contrato_id', contratos[0].id)
            }
          } catch (_) {}

          app.save(usinaRec)
        }
      }
    } catch (err) {
      console.warn('Aviso na migração retrocompatível de usinas:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('usinas')
      app.delete(col)
    } catch (_) {}
  },
)
