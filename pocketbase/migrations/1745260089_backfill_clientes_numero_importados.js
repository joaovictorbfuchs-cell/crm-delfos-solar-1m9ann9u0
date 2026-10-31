migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')
    if (!clientesCol) return

    // Buscar todos os clientes que estão com o campo numero vazio
    // Idempotente: só preenche quando vazio, nunca sobrescreve
    const records = app.findRecordsByFilter(
      clientesCol.id,
      "numero = '' || numero = null",
      'created',
      5000,
      0,
    )

    let atualizados = 0

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const numeroAtual = (record.getString('numero') || '').trim()
      if (numeroAtual) continue

      // Obter dados_importados
      let dadosImportados = record.get('dados_importados')
      if (!dadosImportados) continue

      if (typeof dadosImportados === 'string') {
        try {
          dadosImportados = JSON.parse(dadosImportados)
        } catch (_) {
          continue
        }
      }

      if (typeof dadosImportados !== 'object' || dadosImportados === null) {
        continue
      }

      // Buscar chave que represente Número (ex: "Número", "numero", "Numero", "Nº", "Num")
      let rawNumero = ''
      const chaves = Object.keys(dadosImportados)
      for (let k = 0; k < chaves.length; k++) {
        const chave = chaves[k]
        const chaveNorm = chave
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
        if (
          chave === 'Número' ||
          chave === 'Numero' ||
          chaveNorm === 'numero' ||
          chaveNorm === 'no' ||
          chaveNorm === 'num'
        ) {
          const val = dadosImportados[chave]
          if (val !== undefined && val !== null) {
            rawNumero = String(val).trim()
            if (rawNumero) break
          }
        }
      }

      if (!rawNumero) continue

      // Extrair dígitos do valor encontrado (ex: "nº 78" -> "78", "43" -> "43", "nº 1885" -> "1885", "1098" -> "1098")
      // Se for "S/N" ou não tiver dígitos, não preencher
      const digitsMatch = rawNumero.match(/\d+/)
      if (digitsMatch && digitsMatch[0]) {
        const numeroFinal = digitsMatch[0]
        record.set('numero', numeroFinal)
        app.save(record)
        atualizados++
      }
    }

    console.log(
      `[MIGRATION BACKFILL NUMERO] Atualizados ${atualizados} clientes com campo numero preenchido a partir de dados_importados.`,
    )
  },
  (app) => {
    // Revert: não há reversão destrutiva necessária
  },
)
