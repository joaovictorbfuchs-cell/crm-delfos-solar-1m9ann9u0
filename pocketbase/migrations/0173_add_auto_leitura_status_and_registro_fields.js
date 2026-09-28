migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')

    // 1. Atualizar valores do campo select 'status' para incluir novos estados
    const statusField = col.fields.getByName('status')
    if (statusField && statusField.values && Array.isArray(statusField.values)) {
      const novosStatus = ['enviado', 'dados_registrados']
      for (const st of novosStatus) {
        if (!statusField.values.includes(st)) {
          statusField.values.push(st)
        }
      }
    }

    // 2. Campo dados_leitura_registrados: campo de texto único para registrar número da leitura, protocolo, data de envio, observações (formato livre)
    if (!col.fields.getByName('dados_leitura_registrados')) {
      col.fields.add(
        new TextField({
          name: 'dados_leitura_registrados',
          required: false,
        }),
      )
    }

    // 3. Campo foto_medidor: arquivo para foto do medidor
    if (!col.fields.getByName('foto_medidor')) {
      col.fields.add(
        new FileField({
          name: 'foto_medidor',
          maxSelect: 1,
          maxSize: 15728640, // 15MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const fDados = col.fields.getByName('dados_leitura_registrados')
    if (fDados) col.fields.remove(fDados)
    const fFoto = col.fields.getByName('foto_medidor')
    if (fFoto) col.fields.remove(fFoto)
    app.save(col)
  },
)
