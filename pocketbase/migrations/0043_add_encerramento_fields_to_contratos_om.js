migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contratos_om')

    // 1. Atualizar select de status para incluir 'Encerrado' caso não contenha
    const statusField = col.fields.getByName('status')
    if (statusField) {
      const vals = statusField.values || []
      if (!vals.includes('Encerrado')) {
        statusField.values = [...vals, 'Encerrado']
      }
    }

    // 2. Adicionar campos de encerramento
    if (!col.fields.getByName('status_encerramento')) {
      col.fields.add(
        new SelectField({
          name: 'status_encerramento',
          values: ['vigente', 'encerrado'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('motivo_encerramento')) {
      col.fields.add(
        new SelectField({
          name: 'motivo_encerramento',
          values: ['Não renovação', 'Rescisão por inadimplemento', 'Encerramento por conveniência'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('data_encerramento')) {
      col.fields.add(
        new DateField({
          name: 'data_encerramento',
        }),
      )
    }

    if (!col.fields.getByName('observacoes_encerramento')) {
      col.fields.add(
        new TextField({
          name: 'observacoes_encerramento',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('contratos_om')
      if (col.fields.getByName('observacoes_encerramento')) {
        col.fields.removeByName('observacoes_encerramento')
      }
      if (col.fields.getByName('data_encerramento')) {
        col.fields.removeByName('data_encerramento')
      }
      if (col.fields.getByName('motivo_encerramento')) {
        col.fields.removeByName('motivo_encerramento')
      }
      if (col.fields.getByName('status_encerramento')) {
        col.fields.removeByName('status_encerramento')
      }
      app.save(col)
    } catch (_) {}
  },
)
