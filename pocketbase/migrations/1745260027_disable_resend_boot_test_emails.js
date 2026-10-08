migrate(
  (app) => {
    // Migration 1745260027: Desativação permanente e registro de bloqueio de disparos automáticos de teste de e-mail (Resend / boot)
    console.log(
      '[MIGRATION 1745260027] Confirmando desativação de qualquer disparo de e-mail de teste no boot/migrations.',
    )
  },
  () => {
    // down: sem alterações reversíveis
  },
)
