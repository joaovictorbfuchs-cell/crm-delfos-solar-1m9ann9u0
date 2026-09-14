migrate(
  (app) => {
    // 0076: Transferência de todos os Novo Lead para clientes regulares na área de Clientes
    try {
      const agora = new Date().toISOString()
      const atividadesCol = app.findCollectionByNameOrId('atividades')

      // 1. Atualizar via SQL para garantir eficiência e consistência em todos os registros relevantes
      // Todos os que estão como 'Novo Lead' ou que tiveram origem_pos_vendas = 'funil_comercial'
      app
        .db()
        .newQuery(`
        UPDATE clientes
        SET 
          status = 'Cliente',
          transferido_pos_vendas = false,
          origem_pos_vendas = '',
          data_transferencia_pos_vendas = '',
          data_fechamento = CASE 
            WHEN data_fechamento IS NULL OR data_fechamento = '' THEN created
            ELSE data_fechamento
          END
        WHERE status = 'Novo Lead' OR origem_pos_vendas = 'funil_comercial'
      `)
        .execute()
    } catch (err) {
      console.warn('Erro na migration 0076:', err)
      throw err
    }
  },
  (app) => {
    // Rollback não estritamente necessário
  },
)
