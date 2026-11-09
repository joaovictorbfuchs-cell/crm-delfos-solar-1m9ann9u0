// Guarda a UC no formato ANTIGO (codigo de instalacao, 10 digitos) quando a RGE
// trocou a numeracao. O campo `uc` passa a ter a UC nova (11 ou 12 digitos).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('rge_credenciais')
    if (!col.fields.getByName('uc_antiga')) {
      col.fields.add(new TextField({ name: 'uc_antiga' }))
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('rge_credenciais')
      col.fields.removeByName('uc_antiga')
      app.save(col)
    } catch (e) {}
  },
)
