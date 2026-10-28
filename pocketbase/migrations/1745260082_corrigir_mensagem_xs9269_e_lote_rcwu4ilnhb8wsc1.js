/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const mensagemId = 'xs9269gh01cnfum'
    const clienteCorretoId = '50vyppm3qwwuz62'
    const loteId = 'rcwu4ilnhb8wsc1'
    const dataResposta = '2026-10-28 20:27:06.927Z'

    // 1. Corrigir a mensagem xs9269gh01cnfum para apontar para o cliente correto Delfos Engenharia Ltda
    try {
      const msgRec = app.findRecordById('whatsapp_mensagens', mensagemId)
      if (msgRec) {
        msgRec.set('cliente_id', clienteCorretoId)
        app.save(msgRec)
        console.log(
          `[MIGRATION 1745260082] Mensagem ${mensagemId} atualizada com cliente_id = ${clienteCorretoId}`,
        )
      }
    } catch (err) {
      console.log(`[MIGRATION 1745260082] Mensagem ${mensagemId} não encontrada ou erro:`, err)
    }

    // 2. Reconciliar lote de disparo rcwu4ilnhb8wsc1: marcar Delfos Engenharia Ltda como 'respondido'
    let lote = null
    try {
      lote = app.findRecordById('disparos_massa', loteId)
    } catch (_) {
      console.log(`[MIGRATION 1745260082] Lote ${loteId} não encontrado. Encerrando no-op.`)
      return
    }

    if (!lote) return

    let rawDests = lote.get('destinatarios')
    if (typeof rawDests === 'string') {
      try {
        rawDests = JSON.parse(rawDests)
      } catch (_) {
        rawDests = []
      }
    }
    if (typeof rawDests === 'string') {
      try {
        rawDests = JSON.parse(rawDests)
      } catch (_) {
        rawDests = []
      }
    }

    const dests = Array.isArray(rawDests) ? rawDests : []

    for (let i = 0; i < dests.length; i++) {
      const d = dests[i]
      if (!d || typeof d !== 'object') continue

      if (
        d.cliente_id === clienteCorretoId ||
        String(d.telefone || '')
          .replace(/\D/g, '')
          .endsWith('81108228') ||
        (d.nome && d.nome.includes('Delfos Engenharia'))
      ) {
        d.status = 'respondido'
        d.marcacao_resposta = 'respondeu'
        d.marcacao_data = dataResposta
        d.respondido_em = dataResposta
        d.motivo_saida = 'Resposta detectada automaticamente via WhatsApp'
        d.proximo_envio_data = undefined
        d.proxima_etapa_nome = undefined

        if (typeof d.trilha === 'string') {
          try {
            d.trilha = JSON.parse(d.trilha)
          } catch (_) {
            d.trilha = []
          }
        }
        if (!Array.isArray(d.trilha)) {
          d.trilha = []
        }
        d.trilha = d.trilha.filter((t) => t && typeof t === 'object')

        const jaTemTrilhaResposta = d.trilha.some(
          (t) => t.mensagem_id === mensagemId || t.resposta_detectada,
        )
        if (!jaTemTrilhaResposta) {
          d.trilha.push({
            fluxo_id: d.fluxo_atual_id || lote.getString('fluxo_id') || 'j8jvs41gncsyduh',
            fluxo_nome: 'Fluxo Follow-up 1',
            motivo: 'Resposta detectada automaticamente',
            resposta_detectada: true,
            mensagem_id: mensagemId,
            preview_mensagem: 'Ok',
            data: dataResposta,
          })
        }
      }
    }

    const stats = {
      total: dests.length,
      pendentes: dests.filter(
        (d) =>
          d &&
          (d.status === 'pendente' ||
            d.status === 'reenvio_1_agendado' ||
            d.status === 'reenvio_2_agendado'),
      ).length,
      respondidos: dests.filter((d) => d && d.status === 'respondido').length,
      atendidos: dests.filter((d) => d && d.status === 'atendido').length,
      bloqueados: dests.filter(
        (d) => d && (d.status === 'bloqueado' || d.status === 'sem_whatsapp'),
      ).length,
      finalizados: dests.filter(
        (d) =>
          d &&
          (d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe'),
      ).length,
      reenvios_1_enviados: dests.filter(
        (d) =>
          d &&
          (Boolean(d.reenvio_1_data) ||
            (Array.isArray(d.etapas_executadas) && d.etapas_executadas.length >= 1)),
      ).length,
      reenvios_2_enviados: dests.filter(
        (d) =>
          d &&
          (Boolean(d.reenvio_2_data) ||
            (Array.isArray(d.etapas_executadas) && d.etapas_executadas.length >= 2)),
      ).length,
      ultima_verificacao: new Date().toISOString(),
    }

    lote.set('destinatarios', dests)
    lote.set('estatisticas', stats)
    if (stats.pendentes === 0) {
      lote.set('status', 'concluido')
    }

    app.save(lote)
    console.log(
      `[MIGRATION 1745260082] Lote ${loteId} reconciliado com sucesso: respondidos=${stats.respondidos}, pendentes=${stats.pendentes}.`,
    )
  },
  (app) => {
    // rollback no-op
  },
)
