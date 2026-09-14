migrate(
  (app) => {
    try {
      // Usar SQL direto para preencher data_fechamento caso esteja vazia
      app
        .db()
        .newQuery(`
        UPDATE clientes 
        SET data_fechamento = CASE 
          WHEN data_instalacao IS NOT NULL AND data_instalacao != '' THEN data_instalacao
          ELSE created
        END
        WHERE status = 'Fechado' AND (data_fechamento IS NULL OR data_fechamento = '')
      `)
        .execute()
    } catch (e) {
      console.warn('Erro ao atualizar data_fechamento via SQL:', e)
    }
  },
  (app) => {},
)
