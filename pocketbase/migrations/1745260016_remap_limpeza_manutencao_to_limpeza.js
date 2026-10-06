migrate(
  (app) => {
    // 1. Remapear os registros de `atividades` com tipo='limpeza_manutencao' para tipo='limpeza'
    // preservando todos os demais campos (horários, valores, durações, vínculos, etc.)
    try {
      app
        .db()
        .newQuery(
          "UPDATE atividades SET tipo = 'limpeza' WHERE tipo = 'limpeza_manutencao' OR id IN ('sp25u0p5qnfzsnh', 'uw0tbiiumbv6ywl', 'tu32awlz35sg6mw', '42gef2wtmctp4oe')",
        )
        .execute()
    } catch (err) {
      console.log('Erro ao remapear atividades de limpeza_manutencao para limpeza:', err)
    }

    // 2. Se houver algum tipo customizado com nome ou chave 'limpeza_manutencao' ou 'Limpeza e Manutenção', remover para evitar duplicatas
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM tipos_atividades_custom WHERE LOWER(TRIM(nome)) = 'limpeza e manutenção' OR LOWER(TRIM(nome)) = 'limpeza e manutencao' OR LOWER(TRIM(nome)) = 'limpeza_manutencao'",
        )
        .execute()
    } catch (err) {
      console.log('Erro ao remover tipos_atividades_custom limpeza e manutencao:', err)
    }
  },
  (app) => {
    // rollback não destrutivo
  },
)
