migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('fornecedores')
    // Substituir o campo select especialidade por text field para permitir especialidades customizadas
    if (col.fields.getByName('especialidade')) {
      col.fields.removeByName('especialidade')
    }

    col.fields.add(
      new TextField({
        name: 'especialidade',
        required: true,
      }),
    )

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('fornecedores')
    if (col.fields.getByName('especialidade')) {
      col.fields.removeByName('especialidade')
    }

    col.fields.add(
      new SelectField({
        name: 'especialidade',
        required: true,
        values: ['paineis', 'inversores', 'estruturas', 'acessorios', 'completo'],
        maxSelect: 1,
      }),
    )

    app.save(col)
  },
)
