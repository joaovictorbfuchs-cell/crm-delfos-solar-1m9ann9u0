migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')

    // Campos específicos para Auto Leitura - RGE e Cronograma
    if (!col.fields.getByName('cronograma_arquivo')) {
      col.fields.add(
        new FileField({
          name: 'cronograma_arquivo',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
        }),
      )
    }

    if (!col.fields.getByName('cronograma_datas')) {
      col.fields.add(
        new JSONField({
          name: 'cronograma_datas',
          maxSize: 2097152,
        }),
      )
    }

    // Requisitos de conclusão:
    // (a) cliente enviou fotos/vídeos
    // (b) valores 03 e 103 informados
    // (c) protocolo na RGE realizado
    // (d) campo de texto para registrar as informações
    if (!col.fields.getByName('auto_leitura_dados')) {
      col.fields.add(
        new JSONField({
          name: 'auto_leitura_dados',
          maxSize: 2097152,
        }),
      )
    }

    if (!col.fields.getByName('auto_leitura_obs')) {
      col.fields.add(
        new TextField({
          name: 'auto_leitura_obs',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const f1 = col.fields.getByName('cronograma_arquivo')
    if (f1) col.fields.remove(f1)
    const f2 = col.fields.getByName('cronograma_datas')
    if (f2) col.fields.remove(f2)
    const f3 = col.fields.getByName('auto_leitura_dados')
    if (f3) col.fields.remove(f3)
    const f4 = col.fields.getByName('auto_leitura_obs')
    if (f4) col.fields.remove(f4)
    app.save(col)
  },
)
