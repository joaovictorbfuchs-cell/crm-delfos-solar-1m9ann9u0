// Campo ultimo_erro na beneficiária: o robô registra aqui quando NÃO conseguiu
// baixar a conta de uma UC beneficiária (ex.: "UC não encontrada em nenhum
// titular deste login") e segue para as demais — o loop não quebra.
// Contexto: 1745270022/23/24 constam como aplicadas mas o campo nunca chegou à
// coleção (duplicidade de nomes/ordenação) — o filtro `ultimo_erro != ''` na
// aba Gestão de Beneficiárias dava 400 e derrubava /servicos-campo.
// Nome distinto de todas as anteriores para não colidir.
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
