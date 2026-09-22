migrate(
  (app) => {
    // Normalização de registros existentes de atividades com título contendo 'Auto Leitura' ou 'auto-leitura'
    // mas gravados com tipo diferente (ex: contato_ligacao, anotacao, etc.)
    try {
      app
        .db()
        .newQuery(
          "UPDATE atividades SET tipo = 'auto_leitura_rge' WHERE (LOWER(titulo) LIKE '%auto leitura%' OR LOWER(titulo) LIKE '%auto-leitura%' OR LOWER(tipo) LIKE '%auto_leitura%') AND tipo != 'auto_leitura_rge'",
        )
        .execute()
    } catch (err) {
      console.log('[0134_normalize_auto_leitura_tipo] Erro ao atualizar tipo via SQL:', err)
    }
  },
  (app) => {
    // Reversão opcional (não-destrutiva)
  },
)
