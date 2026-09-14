migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    // 1. Campo transferido_pos_vendas (bool)
    if (!clientes.fields.getByName('transferido_pos_vendas')) {
      clientes.fields.add(
        new BoolField({
          name: 'transferido_pos_vendas',
          required: false,
        }),
      )
    }

    // 2. Campo data_transferencia_pos_vendas (date)
    if (!clientes.fields.getByName('data_transferencia_pos_vendas')) {
      clientes.fields.add(
        new DateField({
          name: 'data_transferencia_pos_vendas',
          required: false,
        }),
      )
    }

    // 3. Campo origem_pos_vendas (text)
    if (!clientes.fields.getByName('origem_pos_vendas')) {
      clientes.fields.add(
        new TextField({
          name: 'origem_pos_vendas',
          required: false,
        }),
      )
    }

    // 4. Campo data_fechamento (date)
    if (!clientes.fields.getByName('data_fechamento')) {
      clientes.fields.add(
        new DateField({
          name: 'data_fechamento',
          required: false,
        }),
      )
    }

    app.save(clientes)

    // 5. Garantir que os negócios com status "Fechado" tenham data_fechamento preenchida
    // e estejam no funil (transferido_pos_vendas = false) para demonstrar a funcionalidade
    try {
      const fechados = app.findRecordsByFilter('clientes', "status = 'Fechado'", '-created', 50, 0)

      for (const rec of fechados) {
        if (!rec.getString('data_fechamento')) {
          const fallbackDate =
            rec.getString('data_instalacao') || rec.getString('created') || new Date().toISOString()
          rec.set('data_fechamento', fallbackDate)
        }
        rec.set('transferido_pos_vendas', false)
        rec.set('origem_pos_vendas', '')
        rec.set('arquivado', false)
        app.save(rec)
      }
    } catch (err) {
      console.warn('Aviso ao inicializar data_fechamento para fechados existentes:', err)
    }
  },
  (app) => {
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      if (clientes.fields.getByName('transferido_pos_vendas')) {
        clientes.fields.removeByName('transferido_pos_vendas')
      }
      if (clientes.fields.getByName('data_transferencia_pos_vendas')) {
        clientes.fields.removeByName('data_transferencia_pos_vendas')
      }
      if (clientes.fields.getByName('origem_pos_vendas')) {
        clientes.fields.removeByName('origem_pos_vendas')
      }
      if (clientes.fields.getByName('data_fechamento')) {
        clientes.fields.removeByName('data_fechamento')
      }
      app.save(clientes)
    } catch (_) {}
  },
)
