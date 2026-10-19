// Adicionar campo fotos_metadados (json) em ordens_servico e atividades
// para permitir vincular fotos a itens específicos do checklist da OS (100% aditivo).
migrate(
  (app) => {
    // 1. ordens_servico: fotos_metadados
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      if (!osCol.fields.getByName('fotos_metadados')) {
        osCol.fields.add(
          new JSONField({
            name: 'fotos_metadados',
            required: false,
          }),
        )
        app.save(osCol)
      }
    }

    // 2. atividades: fotos_metadados (para manutenções executadas via atividades)
    const ativCol = app.findCollectionByNameOrId('atividades')
    if (ativCol) {
      if (!ativCol.fields.getByName('fotos_metadados')) {
        ativCol.fields.add(
          new JSONField({
            name: 'fotos_metadados',
            required: false,
          }),
        )
        app.save(ativCol)
      }
    }
  },
  (app) => {
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      const f = osCol.fields.getByName('fotos_metadados')
      if (f) osCol.fields.remove(f)
      app.save(osCol)
    }

    const ativCol = app.findCollectionByNameOrId('atividades')
    if (ativCol) {
      const f = ativCol.fields.getByName('fotos_metadados')
      if (f) ativCol.fields.remove(f)
      app.save(ativCol)
    }
  },
)
