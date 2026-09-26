migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ordens_servico')
    if (!col.fields.getByName('relatorio_pdf')) {
      col.fields.add(
        new FileField({
          name: 'relatorio_pdf',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['application/pdf'],
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ordens_servico')
      if (col.fields.getByName('relatorio_pdf')) {
        col.fields.removeByName('relatorio_pdf')
        app.save(col)
      }
    } catch (_) {}
  },
)
