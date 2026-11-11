// Campo ultimo_erro na beneficiária: o robô registra aqui quando NÃO conseguiu
// baixar a conta de uma UC beneficiária (ex.: "UC não encontrada em nenhum
// titular deste login") e segue para as demais — o loop não quebra.
// Versão refeita: o backend live já tinha uma migração de MESMO NOME aplicada
// (1745270022) mas o campo nunca chegou à coleção — o nome duplicado fazia o
// runner pular a nova; por isso esta tem nome distinto.
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
    col.fields.add(new TextField({ name: 'ultimo_erro' }))
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
