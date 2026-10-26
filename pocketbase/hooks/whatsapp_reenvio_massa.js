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

/**
 * Endpoint para mover manualmente clientes para um fluxo de follow-up a partir do painel
 * POST /backend/v1/delfos/mover-para-fluxo
 * Body: { cliente_ids: string[] | string, fluxo_id: string }
 */
routerAdd('POST', '/backend/v1/delfos/mover-para-fluxo', (c) => {
  try {
    const authRecord = c.auth
    if (!authRecord) {
      return c.json(401, { error: 'Autenticação necessária' })
    }

    const body = c.requestInfo().body || {}
    const rawClienteIds = body.cliente_ids || body.cliente_id
    const fluxoId = (body.fluxo_id || '').trim()

    if (!fluxoId) {
      return c.json(400, { error: 'fluxo_id é obrigatório' })
    }

    let clienteIds = []
    if (Array.isArray(rawClienteIds)) {
      clienteIds = rawClienteIds.map((id) => String(id).trim()).filter(Boolean)
    } else if (rawClienteIds) {
      clienteIds = [String(rawClienteIds).trim()]
    }

    if (clienteIds.length === 0) {
      return c.json(400, { error: 'Nenhum cliente_id fornecido' })
    }

    const operadorNome = authRecord.getString('name') || authRecord.getString('email') || 'Operador'
    const helper = require(`${__hooks}/whatsapp_reenvio_helper.js`)

    const resultados = []
    let sucessoCount = 0
    let jaAtivoCount = 0
    let erroCount = 0

    for (let i = 0; i < clienteIds.length; i++) {
      const cId = clienteIds[i]
      const res = helper.moverClienteParaFluxoManual($app, {
        clienteId: cId,
        fluxoId: fluxoId,
        operadorNome: operadorNome,
      })

      resultados.push(res)
      if (res.sucesso) {
        sucessoCount++
      } else if (res.jaAtivo) {
        jaAtivoCount++
      } else {
        erroCount++
      }
    }

    return c.json(200, {
      success: sucessoCount > 0,
      total: clienteIds.length,
      sucessoCount,
      jaAtivoCount,
      erroCount,
      resultados,
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: String(err && err.message ? err.message : err),
    })
  }
})
