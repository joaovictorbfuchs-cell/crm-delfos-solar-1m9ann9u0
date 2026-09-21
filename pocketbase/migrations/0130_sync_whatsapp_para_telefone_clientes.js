migrate(
  (app) => {
    // Migração 0130: Correção de direção na sincronização: copiar WHATSAPP -> TELEFONE
    // O WhatsApp é o número autoritativo/fonte da verdade.
    // Onde whatsapp estiver preenchido e for diferente de telefone, definir telefone = whatsapp.
    // Registros onde whatsapp estiver vazio não são tocados.
    // O valor é copiado exatamente como está, sem reformatar.

    let totalAtualizados = 0
    let offset = 0
    const batchSize = 200
    const nomesAlterados = []

    while (true) {
      // Filtra registros que possuem whatsapp preenchido
      const records = app.findRecordsByFilter(
        'clientes',
        "whatsapp != '' && whatsapp != null",
        'created',
        batchSize,
        offset,
      )

      if (!records || records.length === 0) {
        break
      }

      for (let i = 0; i < records.length; i++) {
        const cliente = records[i]
        const wpp = cliente.getString('whatsapp')
        const tel = cliente.getString('telefone')

        // Se whatsapp preenchido e telefone diferente de whatsapp
        if (wpp && wpp.trim() !== '' && wpp !== tel) {
          cliente.set('telefone', wpp)
          app.save(cliente)
          totalAtualizados++
          if (nomesAlterados.length < 50) {
            nomesAlterados.push(cliente.getString('nome') || cliente.id)
          }
        }
      }

      if (records.length < batchSize) {
        break
      }
      offset += batchSize
    }

    console.log(
      '0130_sync_whatsapp_para_telefone_clientes: Atualizados ' +
        totalAtualizados +
        ' clientes com telefone = whatsapp. Exemplos: ' +
        JSON.stringify(nomesAlterados),
    )
  },
  (app) => {
    // Rollback não obrigatório
  },
)
