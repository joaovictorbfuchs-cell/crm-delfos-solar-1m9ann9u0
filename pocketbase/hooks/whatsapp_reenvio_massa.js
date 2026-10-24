// Cron periódico e endpoint HTTP para reenvios em massa
// Carrega a lógica através do helper modular para respeitar o escopo de VM do goja

cronAdd('whatsapp_reenvios_massa_worker', '30 9-18 * * *', () => {
  try {
    const helper = require(`${__hooks}/whatsapp_reenvio_helper.js`)
    const res = helper.processarReenviosDisparosMassa($app)
    if (res && res.reenviosAgendados > 0) {
      console.log(
        `[REENVIO MASSA CRON] Executado com sucesso: ${res.reenviosAgendados} reenvio(s) agendado(s).`,
      )
    }
  } catch (err) {
    console.log('[REENVIO MASSA CRON] Erro no worker:', err)
  }
})

routerAdd('POST', '/backend/v1/delfos/processar-reenvios-massa', (c) => {
  try {
    const authRecord = c.auth
    if (!authRecord) {
      return c.json(401, { error: 'Autenticação necessária' })
    }

    const helper = require(`${__hooks}/whatsapp_reenvio_helper.js`)
    const resultado = helper.processarReenviosDisparosMassa($app)
    return c.json(200, {
      success: true,
      resultado,
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: String(err && err.message ? err.message : err),
    })
  }
})
