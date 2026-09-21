migrate(
  (app) => {
    // Migração 0129: Copiar telefone para whatsapp para todos os clientes onde telefone está preenchido
    // Apenas quando whatsapp estiver vazio ou diferente de telefone.
    // Utiliza app.findRecordsByFilter e app.save para respeitar hooks e regras de records.

    let totalAtualizados = 0
    let offset = 0
    const batchSize = 200

    while (true) {
      // Filtra registros que possuem telefone não vazio
      const records = app.findRecordsByFilter(
        'clientes',
        "telefone != '' && telefone != null",
        'created',
        batchSize,
        offset,
      )

      if (!records || records.length === 0) {
        break
      }

      for (let i = 0; i < records.length; i++) {
        const cliente = records[i]
        const tel = cliente.getString('telefone')
        const wpp = cliente.getString('whatsapp')

        // Se telefone preenchido e whatsapp diferente
        if (tel && tel.trim() !== '' && tel !== wpp) {
          cliente.set('whatsapp', tel)
          app.save(cliente)
          totalAtualizados++
        }
      }

      if (records.length < batchSize) {
        break
      }
      offset += batchSize
    }

    console.log(
      '0129_sync_telefone_para_whatsapp_clientes: Atualizados ' +
        totalAtualizados +
        ' clientes com whatsapp = telefone.',
    )
  },
  (app) => {
    // Rollback não obrigatório
  },
)
