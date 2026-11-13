// Corretiva 4: as migrações 1745270026-29 constam como aplicadas, mas o campo
// fio_b_rs NÃO chegou ao schema live de analises_fatura. Suspeita: neste
// build do PocketBase, col.fields.getByName() NÃO lança erro para campo
// inexistente (retorna undefined) — o early-return "já existe" era falso
// positivo. Aqui a presença é verificada por ITERAÇÃO sobre o lista de fields
// (mesma técnica que funcionou na 1745270025 para ultimo_erro).
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('analises_fatura')
    } catch (e) {
      return
    }

    let temCampo = false
    try {
      const fields = col.fields.all ? col.fields.all() : []
      for (const f of fields) {
        if (f && f.name === 'fio_b_rs') {
          temCampo = true
          break
        }
      }
    } catch (e) {
      temCampo = true // não conseguiu listar: assume que existe, não toca
    }

    if (!temCampo) {
      col.fields.add(new NumberField({ name: 'fio_b_rs', onlyInt: false }))
      app.save(col)
    }

    // Backfill idempotente: fio_b_rs = dados_completos.fio_b.fio_b_rs
    let registros = []
    try {
      registros = app.findRecordsByFilter('analises_fatura', '', '', 0, 0)
    } catch (e) {
      return
    }
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
      const registros = app.findRecordsByFilter('analises_fatura', 'fio_b_rs > 0', '', 0, 0)
      for (const rec of registros) {
        rec.set('fio_b_rs', 0)
        app.save(rec)
      }
    } catch (e) {}
  },
)
