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

    const respondidos = dests.filter(
      (d) => d && (d.status === 'respondido' || d.marcacao_resposta === 'respondeu'),
    ).length
    const pendentes = dests.filter(
      (d) =>
        d &&
        (d.status === 'pendente' ||
          d.status === 'reenvio_1_agendado' ||
          d.status === 'reenvio_2_agendado'),
    ).length
    const atendidos = dests.filter((d) => d && d.status === 'atendido').length
    const bloqueados = dests.filter(
      (d) => d && (d.status === 'bloqueado' || d.status === 'sem_whatsapp'),
    ).length
    const finalizados = dests.filter(
      (d) =>
        d && (d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe'),
    ).length

    const stats = {
      total: dests.length,
      pendentes: pendentes,
      respondidos: respondidos,
      atendidos: atendidos,
      bloqueados: bloqueados,
      finalizados: finalizados,
      reenvios_1_enviados: 0,
      reenvios_2_enviados: 0,
      ultima_verificacao: new Date().toISOString(),
    }

    lote.set('estatisticas', stats)
    if (pendentes === 0) {
      lote.set('status', 'concluido')
    }
    app.save(lote)
    console.log(
      `[MIGRATION 1745260083] Lote ${loteId} estatisticas corrigidas: respondidos=${respondidos}, total=${dests.length}`,
    )
  },
  (app) => {},
)
