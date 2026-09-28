migrate(
  (app) => {
    const contratosCol = app.findCollectionByNameOrId('contratos_om')
    const usinasCol = app.findCollectionByNameOrId('usinas')

    // 1. Criar coleção contratos_usinas (relação N:N com histórico temporal)
    const contratosUsinasCol = new Collection({
      name: 'contratos_usinas',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'contrato_id',
          type: 'relation',
          required: true,
          collectionId: contratosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'usina_id',
          type: 'relation',
          required: true,
          collectionId: usinasCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'ativo',
          type: 'bool',
          required: false,
        },
        {
          name: 'data_vinculo',
          type: 'date',
          required: false,
        },
        {
          name: 'data_desvinculo',
          type: 'date',
          required: false,
        },
        {
          name: 'observacoes',
          type: 'text',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contratos_usinas_contrato ON contratos_usinas (contrato_id)',
        'CREATE INDEX idx_contratos_usinas_usina ON contratos_usinas (usina_id)',
        'CREATE INDEX idx_contratos_usinas_ativo ON contratos_usinas (ativo)',
        'CREATE INDEX idx_contratos_usinas_par ON contratos_usinas (contrato_id, usina_id)',
      ],
    })

    app.save(contratosUsinasCol)

    // 2. Migração retrocompatível e aditiva:
    // Para todas as usinas que já possuem contrato_id preenchido,
    // criar o registro inicial na nova tabela de vínculo contratos_usinas mantendo ativo = true
    try {
      const usinasComContrato = app.findRecordsByFilter(
        'usinas',
        'contrato_id != "" && contrato_id != null',
        'created',
        2000,
        0,
      )

      for (const usina of usinasComContrato) {
        const cId = usina.getString('contrato_id')
        if (!cId) continue

        const vinculo = new Record(contratosUsinasCol)
        vinculo.set('contrato_id', cId)
        vinculo.set('usina_id', usina.id)
        vinculo.set('ativo', true)
        vinculo.set('data_vinculo', usina.getString('created') || new Date().toISOString())
        vinculo.set('observacoes', 'Migrado automaticamente a partir do vínculo original da usina')
        app.save(vinculo)
      }
    } catch (err) {
      console.warn('Aviso ao sincronizar usinas existentes para contratos_usinas:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('contratos_usinas')
      app.delete(col)
    } catch (_) {}
  },
)
