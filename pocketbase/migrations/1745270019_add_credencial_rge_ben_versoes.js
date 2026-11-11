// Corretiva: adiciona credencial_id em rge_beneficiarias_versoes (a coleção
// foi criada na v0.0.1671 sem o campo antes deste patch).
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('rge_beneficiarias_versoes')
    } catch (e) {
      return
    }
    try {
      col.fields.getByName('credencial_id')
      return // já existe
    } catch (e) {}

    let credColId = ''
    try {
      credColId = app.findCollectionByNameOrId('rge_credenciais').id
    } catch (e2) {
      try {
        const ben = app.findCollectionByNameOrId('rge_beneficiarias')
        const f = ben.fields.getByName('credencial_id')
        credColId = String(f.collectionId)
      } catch (e3) {
        credColId = ''
      }
    }

    const f = new RelationField({
      name: 'credencial_id',
      collectionId: credColId,
      maxSelect: 1,
    })
    col.fields.add(f)
    app.save(col)
  },
  (app) => {},
)
