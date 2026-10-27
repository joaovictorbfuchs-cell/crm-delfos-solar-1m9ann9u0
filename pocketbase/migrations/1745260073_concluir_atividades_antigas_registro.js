migrate(
  (app) => {
    // Migração idempotente para converter atividades antigas de registro que ficaram pendentes para concluídas.
    // Tipos contemplados:
    // 1. 'solicitar_contas_rge': APENAS quando prazo_conclusao_rge NÃO está preenchido (ou é vazio/null)
    // 2. 'gerar_procuracao'
    // 3. 'oferecer_limpeza_avulsa'
    // Condição estrita: status = 'pendente'.
    // Atividades com prazo_conclusao_rge preenchido NUNCA são alteradas (permanecem como pendência com prazo).

    const pageSize = 200
    let page = 0
    let countAtualizados = 0

    while (true) {
      // Busca atividades pendentes dos 3 tipos
      const filter =
        "status = 'pendente' && (tipo = 'solicitar_contas_rge' || tipo = 'gerar_procuracao' || tipo = 'oferecer_limpeza_avulsa')"

      const records = app.findRecordsByFilter(
        'atividades',
        filter,
        'created',
        pageSize,
        page * pageSize,
      )

      if (!records || records.length === 0) {
        break
      }

      for (let i = 0; i < records.length; i++) {
        const atv = records[i]
        const tipo = atv.getString('tipo')
        const prazoRge = atv.getString('prazo_conclusao_rge') || ''

        // Se for solicitar_contas_rge e tiver prazo_conclusao_rge preenchido, pula
        if (tipo === 'solicitar_contas_rge' && prazoRge.trim() !== '') {
          continue
        }

        // Determina a data da atividade (ou created)
        const dataAtividade =
          atv.getString('data') || atv.getString('created') || new Date().toISOString()

        atv.set('status', 'concluida')
        if (dataAtividade) {
          atv.set('data', dataAtividade)
        }

        app.save(atv)
        countAtualizados++
      }

      // Se a página retornou menos que o pageSize, acabaram os registros
      if (records.length < pageSize) {
        break
      }

      page++
    }

    console.log(
      `[MIGRAÇÃO ATIVIDADES REGISTRO] Concluída: ${countAtualizados} atividades atualizadas de pendente para concluída.`,
    )
  },
  (app) => {
    // Reversão não é necessária para dados backfill idempotent
  },
)
