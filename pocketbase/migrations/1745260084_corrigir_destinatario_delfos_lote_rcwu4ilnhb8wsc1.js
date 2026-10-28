/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const loteId = 'rcwu4ilnhb8wsc1'
    let lote = null
    try {
      lote = app.findRecordById('disparos_massa', loteId)
    } catch (_) {
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
    const agoraIso = new Date().toISOString()
    const dataResp = '2026-10-28 20:27:06.927Z'

    for (let i = 0; i < dests.length; i++) {
      const d = dests[i]
      if (!d) continue
      d.status = 'respondido'
      d.marcacao_resposta = 'respondeu'
      d.marcacao_data = dataResp
      d.respondido_em = dataResp
      d.motivo_saida = 'Resposta detectada automaticamente via WhatsApp'
      d.proximo_envio_data = undefined
      d.proxima_etapa_nome = undefined

      let trilha = d.trilha
      if (typeof trilha === 'string') {
        try {
          trilha = JSON.parse(trilha)
        } catch (_) {
          trilha = []
        }
      }
      if (!Array.isArray(trilha)) trilha = []

      const jaTem = trilha.some(
        (t) => t && (t.mensagem_id === 'xs9269gh01cnfum' || t.resposta_detectada),
      )
      if (!jaTem) {
        trilha.push({
          fluxo_id: d.fluxo_atual_id || lote.getString('fluxo_id') || 'j8jvs41gncsyduh',
          fluxo_nome: 'Fluxo Follow-up 1',
          motivo: 'Resposta detectada automaticamente',
          resposta_detectada: true,
          mensagem_id: 'xs9269gh01cnfum',
          preview_mensagem: 'Ok',
          data: dataResp,
        })
      }
      d.trilha = trilha
    }

    const stats = {
      total: dests.length,
      pendentes: 0,
      respondidos: dests.length,
      atendidos: 0,
      bloqueados: 0,
      finalizados: 0,
      reenvios_1_enviados: 0,
      reenvios_2_enviados: 0,
      ultima_verificacao: agoraIso,
    }

    lote.set('destinatarios', dests)
    lote.set('estatisticas', stats)
    lote.set('status', 'concluido')
    app.save(lote)

    console.log(
      `[MIGRATION 1745260084] Lote ${loteId} atualizado: destinatário 0 status = ${dests[0].status}, respondidos = ${stats.respondidos}`,
    )
  },
  (app) => {},
)
