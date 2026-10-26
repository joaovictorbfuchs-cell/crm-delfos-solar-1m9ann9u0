migrate((app) => {
  // Backfill idempotente: sincronizar o campo `numero` das `whatsapp_conversas`
  // com o número atual (WhatsApp ou telefone) do cliente vinculado quando houver divergência.
  // Casos conhecidos: conversa 3x3yd5r1265vf1j do cliente Luiz Tirello (vfnj6bm52xeagfh),
  // que estava com o telefone do Célio.
  try {
    const convCol = app.findCollectionByNameOrId('whatsapp_conversas')
    const clientesCol = app.findCollectionByNameOrId('clientes')
    if (!convCol || !clientesCol) return

    function cleanDigits(val) {
      if (!val) return ''
      return String(val).replace(/\D/g, '')
    }

    function normalizarInternacional(tel) {
      let d = cleanDigits(tel)
      if (!d) return ''
      if (d.length >= 10 && d.length <= 11 && !d.startsWith('55')) {
        d = '55' + d
      }
      return d
    }

    // Buscar todas as conversas que possuem cliente_id preenchido
    const conversas = app.findRecordsByFilter(
      convCol.id,
      "cliente_id != ''",
      '',
      10000,
      0,
    )

    if (!conversas || conversas.length === 0) return

    let atualizadasCount = 0

    for (let i = 0; i < conversas.length; i++) {
      const conv = conversas[i]
      const clienteId = conv.getString('cliente_id')
      if (!clienteId) continue

      let cliente = null
      try {
        cliente = app.findRecordById('clientes', clienteId)
      } catch (_) {
        cliente = null
      }
      if (!cliente) continue

      const rawWhats = cliente.getString('whatsapp') || ''
      const rawTel = cliente.getString('telefone') || ''
      const numeroAtualCliente = rawWhats || rawTel
      if (!numeroAtualCliente) continue

      const normAtualCliente = normalizarInternacional(numeroAtualCliente)
      if (!normAtualCliente || normAtualCliente.length < 10) continue

      const numConversa = conv.getString('numero') || ''
      const normConversa = normalizarInternacional(numConversa)

      // Se o número normalizado da conversa diferir do número atual do cliente, atualizar!
      if (normConversa !== normAtualCliente) {
        console.log(
          '[MIGRATION BACKFILL CONVERSAS] Atualizando conversa ' +
            conv.id +
            ' do cliente ' +
            clienteId +
            ' (' +
            cliente.getString('nome') +
            ') de ' +
            numConversa +
            ' para ' +
            normAtualCliente,
        )
        conv.set('numero', normAtualCliente)
        app.save(conv)
        atualizadasCount++
      }
    }

    console.log(
      '[MIGRATION BACKFILL CONVERSAS] Total de conversas atualizadas: ' + atualizadasCount,
    )
  } catch (err) {
    console.log('[MIGRATION BACKFILL CONVERSAS ERRO]', err)
  }
}, (app) => {
  // Reversão não necessária / no-op
})
