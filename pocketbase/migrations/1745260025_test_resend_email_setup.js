migrate(
  (app) => {
    // Migration 1745260025: Envio de e-mail de teste de setup removido permanentemente.
    console.log('[MIGRATION 1745260025] Disparo de teste Resend desativado.')
  },
  () => {
    // down: sem alterações reversíveis
  },
)
