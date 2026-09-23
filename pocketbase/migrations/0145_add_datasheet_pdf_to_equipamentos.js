migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('equipamentos')
    if (!col.fields.getByName('datasheet_pdf')) {
      col.fields.add(
        new FileField({
          name: 'datasheet_pdf',
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
      const col = app.findCollectionByNameOrId('equipamentos')
      if (col.fields.getByName('datasheet_pdf')) {
        col.fields.removeByName('datasheet_pdf')
        app.save(col)
      }
    } catch (_) {}
  },
)
