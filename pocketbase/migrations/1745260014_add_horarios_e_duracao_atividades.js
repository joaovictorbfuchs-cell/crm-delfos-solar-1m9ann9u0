migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atividades')

      if (!col.fields.getByName('horario_inicio')) {
        col.fields.add(
          new TextField({
            name: 'horario_inicio',
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('horario_fim')) {
        col.fields.add(
          new TextField({
            name: 'horario_fim',
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('duracao_minutos')) {
        col.fields.add(
          new NumberField({
            name: 'duracao_minutos',
            required: false,
            onlyInt: true,
          }),
        )
      }

      app.save(col)
      console.log(
        '[migration 1745260014] Campos horario_inicio, horario_fim e duracao_minutos adicionados à coleção atividades.',
      )
    } catch (e) {
      console.log(
        '[migration 1745260014] Erro ao adicionar campos de horário e duração em atividades:',
        e,
      )
      throw e
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atividades')
      const fInicio = col.fields.getByName('horario_inicio')
      if (fInicio) col.fields.removeByName('horario_inicio')
      const fFim = col.fields.getByName('horario_fim')
      if (fFim) col.fields.removeByName('horario_fim')
      const fDuracao = col.fields.getByName('duracao_minutos')
      if (fDuracao) col.fields.removeByName('duracao_minutos')
      app.save(col)
    } catch (_) {}
  },
)
