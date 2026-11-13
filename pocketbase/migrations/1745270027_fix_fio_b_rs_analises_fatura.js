// Corretiva: a 1745270026 consta como aplicada mas o campo fio_b_rs não chegou
// ao schema live (mesmo padrão da dupla-aplicação das migrações 1745270020-24).
// Idempotente: adiciona o campo só se ele ainda não existir.
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
      return // já existe — no-op
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
