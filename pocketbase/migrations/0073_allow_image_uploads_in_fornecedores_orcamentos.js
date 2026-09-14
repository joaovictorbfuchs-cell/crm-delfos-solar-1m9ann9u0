/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('fornecedores_orcamentos')
    const arquivoField = col.fields.getByName('arquivo')
    if (arquivoField) {
      arquivoField.mimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/pjpeg',
        'image/x-png',
      ]
      // Garantir limite de tamanho de até 25MB para arquivos e screenshots de alta resolução
      arquivoField.maxSize = 26214400 // 25MB
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('fornecedores_orcamentos')
      const arquivoField = col.fields.getByName('arquivo')
      if (arquivoField) {
        arquivoField.mimeTypes = ['application/pdf']
        arquivoField.maxSize = 15728640 // 15MB
        app.save(col)
      }
    } catch (_) {}
  },
)
