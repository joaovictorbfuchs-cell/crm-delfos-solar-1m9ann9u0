// Corretiva 2: as migrações 1745270026 e 1745270027 constam como aplicadas,
// mas o campo fio_b_rs não chegou ao schema live de analises_fatura (mesmo
// padrão da dupla-aplicação das 1745270020-24). Idempotente: adiciona o campo
// só se ele ainda não existir e faz backfill do valor a partir de
// dados_completos.fio_b.fio_b_rs (fonte da verdade do cálculo determinístico).
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('analises_fatura')
    } catch (e) {
      return
    }
    let temCampo = true
    try {
      col.fields.getByName('fio_b_rs')
    } catch (e) {
      temCampo = false
    }
    if (!temCampo) {
      col.fields.add(new NumberField({ name: 'fio_b_rs', onlyInt: false }))
      app.save(col)
    }

    // Backfill idempotente: fio_b_rs = dados_completos.fio_b.fio_b_rs
    const colFinal = app.findCollectionByNameOrId('analises_fatura')
    const registros = app.findRecordsByFilter(colFinal.id, '', '', 0, 0)
    for (const rec of registros) {
      try {
        const dadosJson = rec.getString('dados_completos')
        if (!dadosJson) continue
        const dados = JSON.parse(dadosJson)
        const fioB = dados && (dados.fio_b || (dados.indicadores && dados.indicadores.fio_b))
        const valor =
          fioB && fioB.fio_b_rs !== undefined && fioB.fio_b_rs !== null
            ? parseFloat(fioB.fio_b_rs) || 0
            : 0
        if (Math.abs(rec.getFloat('fio_b_rs') - valor) > 0.005) {
          rec.set('fio_b_rs', valor)
          app.save(rec)
        }
      } catch (e) {
        // registro sem dados_completos parseável: deixa como está
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('analises_fatura')
      // reverso: apenas zera os valores, mantém o campo (histórico de outros runs)
      const registros = app.findRecordsByFilter(col.id, 'fio_b_rs > 0', '', 0, 0)
      for (const rec of registros) {
        rec.set('fio_b_rs', 0)
        app.save(rec)
      }
    } catch (e) {}
  },
)
