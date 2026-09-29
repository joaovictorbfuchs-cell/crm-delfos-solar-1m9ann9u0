migrate(
  (app) => {
    // 1. Contagem total inicial de ativos
    const todosAtivos = app.findRecordsByFilter('ativos', 'id != ""', 'created', 0, 0)
    const totalInicial = todosAtivos.length

    // 2. Busca estrita dos registros a serem removidos:
    // Critério EXATO (restrito, ambos os campos):
    // fabricante = "Deye" AND modelo = "Inversor 6.9 kWp"
    // Registros genéricos da importação de cliente_inversores feita na 0185 (sem número de série).
    // A origem em cliente_inversores NÃO é tocada em absoluto — permanece 100% intacta.
    const candidatos = app.findRecordsByFilter(
      'ativos',
      'fabricante = "Deye" && modelo = "Inversor 6.9 kWp"',
      'created',
      0,
      0,
    )

    const totalCandidatos = candidatos.length
    const totalRestanteEsperado = totalInicial - totalCandidatos

    console.log(
      '[MIGRATION_0187] INICIANDO LIMPEZA DE ATIVOS "Deye Inversor 6.9 kWp":',
      'Total ativos no banco: ' + totalInicial,
      '| Total a ser removido: ' + totalCandidatos,
      '| Total previsto restante: ' + totalRestanteEsperado,
    )

    let deletados = 0
    for (let i = 0; i < candidatos.length; i++) {
      const rec = candidatos[i]
      // Dupla checagem em memória para garantia absoluta
      if (
        rec.getString('fabricante') === 'Deye' &&
        rec.getString('modelo') === 'Inversor 6.9 kWp'
      ) {
        app.delete(rec)
        deletados++
      }
    }

    // 3. Verificação pós-deleção
    const ativosRestantes = app.findRecordsByFilter('ativos', 'id != ""', 'created', 0, 0)
    const totalFinal = ativosRestantes.length

    // Verificação de segurança: confirmar que nenhum registro com esse critério sobrou
    const remanescentes = app.findRecordsByFilter(
      'ativos',
      'fabricante = "Deye" && modelo = "Inversor 6.9 kWp"',
      'created',
      0,
      0,
    )

    console.log(
      '[MIGRATION_0187] LIMPEZA CONCLUIDA COM SUCESSO:',
      'Total inicial: ' + totalInicial,
      '| Total deletado: ' + deletados,
      '| Total final restante: ' + totalFinal,
      '| Remanescentes do critério: ' + remanescentes.length,
    )
  },
  (app) => {
    // Migration de remoção idempotente — não recria dados descartados no down
    console.log('[MIGRATION_0187] Reversão executada (sem recriação de registros descartados).')
  },
)
