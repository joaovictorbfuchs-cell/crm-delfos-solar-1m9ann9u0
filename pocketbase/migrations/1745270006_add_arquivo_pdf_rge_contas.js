// Adiciona o campo de ARQUIVO para o PDF da conta.
// O campo de texto `pdf_base64` tem limite de 5.000 caracteres e o PDF da conta
// tem ~770 mil, entao o PDF vai como arquivo anexo (a forma correta no PocketBase).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('rge_contas')
    if (!col.fields.getByName('arquivo_pdf')) {
      col.fields.add(
        new FileField({
          name: 'arquivo_pdf',
          maxSelect: 1,
          maxSize: 31457280, // 30 MB
          mimeTypes: ['application/pdf'],
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('rge_contas')
      col.fields.removeByName('arquivo_pdf')
      app.save(col)
    } catch (e) {}
  },
)
