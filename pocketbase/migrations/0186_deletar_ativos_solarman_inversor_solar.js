migrate(
  (app) => {
    // 1. Contagem total inicial de ativos
    const todosAtivos = app.findRecordsByFilter('ativos', 'id != ""', 'created', 0, 0)
    const totalInicial = todosAtivos.length

    // 2. Busca estrita dos registros a serem removidos:
    // Critério: fabricante = "Solarman" AND modelo = "Inversor Solar"
    // Mantendo estrito conforme instrução (sem matching amplo, sem tocar em outras marcas/modelos)
    const candidatos = app.findRecordsByFilter(
      'ativos',
      'fabricante = "Solarman" && modelo = "Inversor Solar"',
      'created',
      0,
      0,
    )

    const totalCandidatos = candidatos.length
    const totalRestanteEsperado = totalInicial - totalCandidatos

    console.log(
      '[MIGRATION_0186] INICIANDO LIMPEZA DE ATIVOS "Solarman Inversor Solar":',
      'Total ativos no banco: ' + totalInicial,
      '| Total a ser removido: ' + totalCandidatos,
      '| Total previsto restante: ' + totalRestanteEsperado,
    )

    let deletados = 0
    for (let i = 0; i < candidatos.length; i++) {
      const rec = candidatos[i]
      // Dupla checagem em memória para garantia absoluta
      if (
        rec.getString('fabricante') === 'Solarman' &&
        rec.getString('modelo') === 'Inversor Solar'
      ) {
        app.delete(rec)
        deletados++
      }
    }

    // 3. Verificação pós-deleção
    const ativosRestantes = app.findRecordsByFilter('ativos', 'id != ""', 'created', 0, 0)
    const totalFinal = ativosRestantes.length

    console.log(
      '[MIGRATION_0186] LIMPEZA CONCLUIDA COM SUCESSO:',
      'Total inicial: ' + totalInicial,
      '| Total deletado: ' + deletados,
      '| Total final restante: ' + totalFinal,
    )
  },
  (app) => {
    // Migration de remoção idempotente — não recria dados descartados no down
    console.log('[MIGRATION_0186] Reversão executada (sem recriação de registros descartados).')
  },
)
