/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      let lote = null
      try {
        lote = app.findRecordById('disparos_massa', 'gmjaha28owikvvh')
      } catch (_) {
        return
      }
      if (!lote) return

      let dests = []
      const raw = lote.get('destinatarios')
      if (typeof raw === 'string') {
        try {
          dests = JSON.parse(raw)
        } catch (_) {
          dests = []
        }
      } else if (Array.isArray(raw)) {
        dests = raw
      }

      if (typeof dests === 'string') {
        try {
          dests = JSON.parse(dests)
        } catch (_) {}
      }

      if (!Array.isArray(dests)) {
        dests = []
      }

      const agoraIso = new Date().toISOString()

      for (let i = 0; i < dests.length; i++) {
        const item = dests[i]
        if (!item) continue

        if (item.cliente_id === 'pzy47u5ohezsr2i') {
          const respData = '2026-10-27T17:15:00.718Z'
          item.status = 'respondido'
          item.marcacao_resposta = 'respondeu'
          item.marcacao_data = respData
          item.respondido_em = respData
          item.motivo_saida = 'Resposta detectada retroativamente via WhatsApp'
          item.proximo_envio_data = undefined
          item.proxima_etapa_nome = undefined
          if (!Array.isArray(item.trilha)) item.trilha = []
          item.trilha.push({
            fluxo_id: item.fluxo_atual_id || lote.getString('fluxo_id'),
            fluxo_nome: 'Fluxo Padrão',
            motivo: 'Resposta detectada retroativamente via WhatsApp',
            resposta_detectada: true,
            preview_mensagem: 'Boa tarde / Qual é o valor?',
            data: respData,
          })
        }

        if (item.cliente_id === 'mnk5er2gjae567d') {
          const respData = '2026-10-27T19:04:39.904Z'
          item.status = 'respondido'
          item.marcacao_resposta = 'respondeu'
          item.marcacao_data = respData
          item.respondido_em = respData
          item.motivo_saida = 'Resposta detectada retroativamente via WhatsApp'
          item.proximo_envio_data = undefined
          item.proxima_etapa_nome = undefined
          if (!Array.isArray(item.trilha)) item.trilha = []
          item.trilha.push({
            fluxo_id: item.fluxo_atual_id || lote.getString('fluxo_id'),
            fluxo_nome: 'Fluxo Padrão',
            motivo: 'Resposta detectada retroativamente via WhatsApp',
            resposta_detectada: true,
            preview_mensagem: 'Tudo nova instalei agora somente ano que vem',
            data: respData,
          })
        }
      }

      const totalDests = dests.length
      const respondidos = dests.filter((d) => d.status === 'respondido').length
      const pendentes = dests.filter(
        (d) =>
          d.status === 'pendente' ||
          d.status === 'reenvio_1_agendado' ||
          d.status === 'reenvio_2_agendado',
      ).length
      const atendidos = dests.filter((d) => d.status === 'atendido').length
      const bloqueados = dests.filter(
        (d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp',
      ).length
      const finalizados = dests.filter(
        (d) => d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe',
      ).length

      const stats = {
        total: totalDests,
        pendentes: pendentes,
        respondidos: respondidos,
        atendidos: atendidos,
        bloqueados: bloqueados,
        finalizados: finalizados,
        reenvios_1_enviados: 0,
        reenvios_2_enviados: 0,
        ultima_verificacao: agoraIso,
      }

      lote.set('destinatarios', dests)
      lote.set('estatisticas', stats)
      app.save(lote)
    } catch (_) {}
  },
  (app) => {},
)
