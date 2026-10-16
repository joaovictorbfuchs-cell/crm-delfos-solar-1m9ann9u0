migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('propostas_om')
    let colChanged = false

    // 1. Campo numero_proposta
    if (!col.fields.getByName('numero_proposta')) {
      col.fields.add(
        new TextField({
          name: 'numero_proposta',
          required: false,
        }),
      )
      colChanged = true
    }

    // 2. Campo negocio_id
    if (!col.fields.getByName('negocio_id')) {
      const negociosCol = app.findCollectionByNameOrId('negocios')
      col.fields.add(
        new RelationField({
          name: 'negocio_id',
          collectionId: negociosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
      colChanged = true
    }

    if (colChanged) {
      col.addIndex('idx_propostas_om_numero_proposta', false, 'numero_proposta', '')
      col.addIndex('idx_propostas_om_negocio', false, 'negocio_id', '')
      app.save(col)
    }

    // 3. Backfill idempotente de numero_proposta para propostas existentes sem número
    try {
      const records = app.findRecordsByFilter(
        'propostas_om',
        "numero_proposta = '' || numero_proposta = null",
        'created',
        0,
        0,
      )
      if (records && records.length > 0) {
        // Agrupar sequenciais por ano
        const contadoresPorAno = {}

        // Primeiro contabilizar os já existentes com número para não colidir
        try {
          const comNumero = app.findRecordsByFilter(
            'propostas_om',
            "numero_proposta != '' && numero_proposta != null",
            'created',
            0,
            0,
          )
          for (let i = 0; i < comNumero.length; i++) {
            const num = comNumero[i].getString('numero_proposta')
            const match = num.match(/^OM-(\d{4})-(\d+)$/i)
            if (match) {
              const ano = match[1]
              const seq = parseInt(match[2], 10)
              if (!contadoresPorAno[ano] || seq > contadoresPorAno[ano]) {
                contadoresPorAno[ano] = seq
              }
            }
          }
        } catch (_) {}

        for (let i = 0; i < records.length; i++) {
          const rec = records[i]
          const dataRef =
            rec.getString('data_proposta') || rec.getString('created') || new Date().toISOString()
          const ano = dataRef.slice(0, 4) || new Date().getFullYear().toString()
          const proximoSeq = (contadoresPorAno[ano] || 0) + 1
          contadoresPorAno[ano] = proximoSeq
          const numFmt = `OM-${ano}-${String(proximoSeq).padStart(3, '0')}`
          rec.set('numero_proposta', numFmt)

          // Se a proposta não tem negocio_id vinculado, tentar vincular ao único negócio em andamento do cliente
          if (!rec.getString('negocio_id')) {
            const clienteId = rec.getString('cliente_id')
            if (clienteId) {
              try {
                const negociosDoCliente = app.findRecordsByFilter(
                  'negocios',
                  `cliente_id = '${clienteId}' && status = 'em andamento'`,
                  '-created',
                  2,
                  0,
                )
                if (negociosDoCliente && negociosDoCliente.length === 1) {
                  rec.set('negocio_id', negociosDoCliente[0].id)
                }
              } catch (_) {}
            }
          }

          app.save(rec)
        }
      }
    } catch (err) {
      console.log('[MIGRATION 1745260045] Aviso no backfill de propostas_om:', err)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('propostas_om')
    try {
      col.removeIndex('idx_propostas_om_numero_proposta')
      col.removeIndex('idx_propostas_om_negocio')
    } catch (_) {}
    const fieldNum = col.fields.getByName('numero_proposta')
    if (fieldNum) col.fields.removeById(fieldNum.id)
    const fieldNeg = col.fields.getByName('negocio_id')
    if (fieldNeg) col.fields.removeById(fieldNeg.id)
    app.save(col)
  },
)
