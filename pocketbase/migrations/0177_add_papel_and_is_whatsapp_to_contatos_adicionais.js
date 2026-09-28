migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contatos_adicionais')

    // Campo papel: valores sugeridos pelo usuário (principal, financeiro, técnico, responsável) + outro
    if (!col.fields.getByName('papel')) {
      col.fields.add(
        new SelectField({
          name: 'papel',
          values: ['principal', 'financeiro', 'tecnico', 'responsavel', 'outro'],
          maxSelect: 1,
        }),
      )
    }

    // Campo is_whatsapp: booleano indicando se o número é o WhatsApp autoritativo/contato WhatsApp
    if (!col.fields.getByName('is_whatsapp')) {
      col.fields.add(
        new BoolField({
          name: 'is_whatsapp',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('contatos_adicionais')
    const papelField = col.fields.getByName('papel')
    if (papelField) {
      col.fields.removeByName('papel')
    }
    const isWhatsappField = col.fields.getByName('is_whatsapp')
    if (isWhatsappField) {
      col.fields.removeByName('is_whatsapp')
    }
    app.save(col)
  },
)
