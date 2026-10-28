/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const helper = require(`${__hooks}/whatsapp_reenvio_helper.js`)
      if (helper && typeof helper.reconciliarRespostasDisparosMassa === 'function') {
        const resultado = helper.reconciliarRespostasDisparosMassa(app, {})
        console.log(
          `[MIGRATION 1745260075] Reconciliação executada com sucesso. Total reconciliados: ${resultado.totalReconciliados}`,
        )
      } else {
        console.log(
          '[MIGRATION 1745260075] Helper whatsapp_reenvio_helper não encontrado ou sem a função.',
        )
      }
    } catch (err) {
      console.log('[MIGRATION 1745260075] Erro durante reconciliação retroativa:', err)
    }
  },
  (app) => {
    // Reconciliação é idempotente e retroativa; nada a desfazer
  },
)
