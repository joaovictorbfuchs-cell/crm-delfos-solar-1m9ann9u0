migrate(
  (app) => {
    const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')

    if (!msgsCol.fields.getByName('arquivo')) {
      msgsCol.fields.add(
        new FileField({
          name: 'arquivo',
          required: false,
          maxSelect: 1,
          maxSize: 52428800, // 50MB para suportar imagens, vídeos curtos e PDFs
          mimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/mp4',
            'video/3gpp',
            'video/quicktime',
            'audio/ogg',
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/aac',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
          ],
        }),
      )
    }

    if (!msgsCol.fields.getByName('motivo_falha_midia')) {
      msgsCol.fields.add(
        new TextField({
          name: 'motivo_falha_midia',
          required: false,
        }),
      )
    }

    app.save(msgsCol)
  },
  (app) => {
    try {
      const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
      if (msgsCol.fields.getByName('arquivo')) {
        msgsCol.fields.removeByName('arquivo')
      }
      if (msgsCol.fields.getByName('motivo_falha_midia')) {
        msgsCol.fields.removeByName('motivo_falha_midia')
      }
      app.save(msgsCol)
    } catch (_) {}
  },
)
