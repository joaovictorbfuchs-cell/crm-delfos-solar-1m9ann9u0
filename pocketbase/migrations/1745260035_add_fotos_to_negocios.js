/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('negocios')
    if (!col.fields.getByName('fotos')) {
      col.fields.add(
        new FileField({
          name: 'fotos',
          maxSelect: 25,
          maxSize: 15728640, // 15MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('negocios')
      const field = col.fields.getByName('fotos')
      if (field) {
        col.fields.removeByName('fotos')
        app.save(col)
      }
    } catch (_) {}
  },
)
