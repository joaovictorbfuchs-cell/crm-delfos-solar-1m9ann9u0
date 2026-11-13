// Fio B (Lei 14.300/2022): resumo do valor de Fio B da análise de fatura.
// O detalhe completo fica em dados_completos.fio_b; fio_b_rs guarda só o
// valor em R$ do ciclo para listagem/ordenação e uso no relatório.
// Nome novo (não reutiliza ordinais antigos — ver contexto da 1745270025).
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('analises_fatura')
    } catch (e) {
      return
    }
    try {
      col.fields.getByName('fio_b_rs')
      return // já existe
    } catch (e) {}
    col.fields.add(new NumberField({ name: 'fio_b_rs', onlyInt: false }))
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('analises_fatura')
      col.fields.removeByName('fio_b_rs')
      app.save(col)
    } catch (e) {}
  },
)
