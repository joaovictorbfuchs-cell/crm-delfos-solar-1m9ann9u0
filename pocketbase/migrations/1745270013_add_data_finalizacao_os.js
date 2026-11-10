// Adiciona campo data_finalizacao (DateField) nas coleções atividades e ordens_servico (idempotente)
migrate(
  (app) => {
    // 1. atividades
    const ativCol = app.findCollectionByNameOrId('atividades')
    if (ativCol) {
      if (!ativCol.fields.getByName('data_finalizacao')) {
        ativCol.fields.add(
          new DateField({
            name: 'data_finalizacao',
            required: false,
          }),
        )
        app.save(ativCol)
      }
    }

    // 2. ordens_servico
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      if (!osCol.fields.getByName('data_finalizacao')) {
        osCol.fields.add(
          new DateField({
            name: 'data_finalizacao',
            required: false,
          }),
        )
        app.save(osCol)
      }
    }
  },
  (app) => {
    const ativCol = app.findCollectionByNameOrId('atividades')
    if (ativCol) {
      const f = ativCol.fields.getByName('data_finalizacao')
      if (f) {
        ativCol.fields.remove(f)
        app.save(ativCol)
      }
    }

    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      const f = osCol.fields.getByName('data_finalizacao')
      if (f) {
        osCol.fields.remove(f)
        app.save(osCol)
      }
    }
  },
)
