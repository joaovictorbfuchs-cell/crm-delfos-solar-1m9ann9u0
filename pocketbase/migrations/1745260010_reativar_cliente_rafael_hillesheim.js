migrate(
  (app) => {
    // Reativação pontual do cliente RAFAEL HILLESHEIM (id: i1bbhshkiuqjm6q)
    // para que seu negócio recém-criado 'Negócio - RAFAEL HILLESHEIM' (id: udyq4z2hg7ooxkq)
    // passe a aparecer imediatamente no Funil Comercial (/comercial).
    try {
      const record = app.findRecordById('clientes', 'i1bbhshkiuqjm6q')
      if (record) {
        record.set('transferido_pos_vendas', false)
        record.set('arquivado', false)
        // Se o status estava 'Fechado' ou 'Perdido', volta para o status inicial de funil 'Novo Lead'
        const statusAtual = record.getString('status')
        if (!statusAtual || statusAtual === 'Fechado' || statusAtual === 'Perdido') {
          record.set('status', 'Novo Lead')
        }
        app.save(record)
        console.log(
          '[1745260010] Cliente RAFAEL HILLESHEIM reativado com sucesso para o Funil Comercial.',
        )
      }
    } catch (err) {
      console.warn('[1745260010] Aviso ao reativar RAFAEL HILLESHEIM via record:', err)
      // Fallback via SQL direto caso o findRecordById tenha qualquer inconsistência
      try {
        app
          .db()
          .newQuery(
            "UPDATE clientes SET transferido_pos_vendas = 0, arquivado = 0, status = 'Novo Lead' WHERE id = 'i1bbhshkiuqjm6q'",
          )
          .execute()
        console.log('[1745260010] Cliente RAFAEL HILLESHEIM reativado via SQL.')
      } catch (sqlErr) {
        console.error('[1745260010] Erro ao executar fallback SQL:', sqlErr)
      }
    }
  },
  (app) => {
    // Reversão opcional (não destrutiva)
    try {
      const record = app.findRecordById('clientes', 'i1bbhshkiuqjm6q')
      if (record) {
        record.set('transferido_pos_vendas', true)
        record.set('status', 'Fechado')
        app.save(record)
      }
    } catch {
      // noop
    }
  },
)
