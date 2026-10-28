/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const lote = app.findRecordById('disparos_massa', 'gmjaha28owikvvh')
      if (!lote) {
        throw new Error('Lote gmjaha28owikvvh não encontrado')
      }

      let dests = []
      const raw = lote.get('destinatarios')
      dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []

      const agoraIso = new Date().toISOString()
      let modificados = 0

      for (let i = 0; i < dests.length; i++) {
        const item = dests[i]
        if (!item) continue

        // Alexandre Guarnieri: pzy47u5ohezsr2i
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
          modificados++
        }

        // André Martinovski: mnk5er2gjae567d
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
          modificados++
        }
      }

      const stats = {
        total: dests.length,
        pendentes: dests.filter(
          (d) =>
            d.status === 'pendente' ||
            d.status === 'reenvio_1_agendado' ||
            d.status === 'reenvio_2_agendado',
        ).length,
        respondidos: dests.filter((d) => d.status === 'respondido').length,
        atendidos: dests.filter((d) => d.status === 'atendido').length,
        bloqueados: dests.filter((d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp')
          .length,
        finalizados: dests.filter(
          (d) =>
            d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe',
        ).length,
        reenvios_1_enviados: dests.filter(
          (d) =>
            Boolean(d.reenvio_1_data) || (d.etapas_executadas && d.etapas_executadas.length >= 1),
        ).length,
        reenvios_2_enviados: dests.filter(
          (d) =>
            Boolean(d.reenvio_2_data) || (d.etapas_executadas && d.etapas_executadas.length >= 2),
        ).length,
        ultima_verificacao: agoraIso,
      }

      lote.set('destinatarios', dests)
      lote.set('estatisticas', stats)
      app.save(lote)
    } catch (err) {
      throw err
    }
  },
  (app) => {},
)
