// Campo ultimo_erro na beneficiária: o robô registra aqui quando NÃO conseguiu
// baixar a conta de uma UC beneficiária (ex.: "UC não encontrada em nenhum
// titular deste login") e segue para as demais — o loop não quebra.
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('rge_beneficiarias')
    } catch (e) {
      return
    }
    try {
      col.fields.getByName('ultimo_erro')
      return // já existe
    } catch (e) {}
    const f = new TextField({ name: 'ultimo_erro' })
    col.fields.add(f)
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('rge_beneficiarias')
      col.fields.removeByName('ultimo_erro')
      app.save(col)
    } catch (e) {}
  },
)
