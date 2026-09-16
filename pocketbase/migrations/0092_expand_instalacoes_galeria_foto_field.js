/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('instalacoes_galeria')
    const fotoField = col.fields.getByName('foto')
    if (fotoField) {
      fotoField.mimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/pjpeg',
        'image/x-png',
        'image/heic',
        'image/heif',
        'image/avif',
      ]
      // Expandir limite para até 25MB para permitir fotos de alta resolução de drones (ex: DJI) e celulares
      fotoField.maxSize = 26214400 // 25MB
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('instalacoes_galeria')
      const fotoField = col.fields.getByName('foto')
      if (fotoField) {
        fotoField.mimeTypes = ['image/jpeg', 'image/png', 'image/webp']
        fotoField.maxSize = 10485760 // 10MB
        app.save(col)
      }
    } catch (_) {}
  },
)
