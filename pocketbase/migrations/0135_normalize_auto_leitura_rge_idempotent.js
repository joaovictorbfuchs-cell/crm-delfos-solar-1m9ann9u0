migrate(
  (app) => {
    // Normalização idempotente de todas as atividades cujo título ou tipo refiram a auto leitura / RGE
    try {
      app
        .db()
        .newQuery(
          "UPDATE atividades SET tipo = 'auto_leitura_rge' WHERE (LOWER(titulo) LIKE '%auto leitura%' OR LOWER(titulo) LIKE '%auto-leitura%' OR LOWER(titulo) LIKE '%autoleitura%' OR LOWER(tipo) LIKE '%auto_leitura%' OR LOWER(tipo) LIKE '%autoleitura%') AND tipo != 'auto_leitura_rge'",
        )
        .execute()
    } catch (err) {
      console.log(
        '[0135_normalize_auto_leitura_rge_idempotent] Erro ao atualizar tipo via SQL:',
        err,
      )
    }
  },
  (app) => {
    // Sem rollback destrutivo
  },
)
