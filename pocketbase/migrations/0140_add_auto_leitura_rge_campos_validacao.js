migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')

    // 1. protocolo_rge (texto)
    if (!col.fields.getByName('protocolo_rge')) {
      col.fields.add(
        new TextField({
          name: 'protocolo_rge',
          required: false,
        }),
      )
    }

    // 2. valor_grandeza_03 (texto)
    if (!col.fields.getByName('valor_grandeza_03')) {
      col.fields.add(
        new TextField({
          name: 'valor_grandeza_03',
          required: false,
        }),
      )
    }

    // 3. valor_grandeza_103 (texto)
    if (!col.fields.getByName('valor_grandeza_103')) {
      col.fields.add(
        new TextField({
          name: 'valor_grandeza_103',
          required: false,
        }),
      )
    }

    // 4. data_leitura (data)
    if (!col.fields.getByName('data_leitura')) {
      col.fields.add(
        new DateField({
          name: 'data_leitura',
          required: false,
        }),
      )
    }

    // 5. lembrete_whatsapp_enviado_em (data)
    if (!col.fields.getByName('lembrete_whatsapp_enviado_em')) {
      col.fields.add(
        new DateField({
          name: 'lembrete_whatsapp_enviado_em',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const f1 = col.fields.getByName('protocolo_rge')
    if (f1) col.fields.remove(f1)
    const f2 = col.fields.getByName('valor_grandeza_03')
    if (f2) col.fields.remove(f2)
    const f3 = col.fields.getByName('valor_grandeza_103')
    if (f3) col.fields.remove(f3)
    const f4 = col.fields.getByName('data_leitura')
    if (f4) col.fields.remove(f4)
    const f5 = col.fields.getByName('lembrete_whatsapp_enviado_em')
    if (f5) col.fields.remove(f5)
    app.save(col)
  },
)
