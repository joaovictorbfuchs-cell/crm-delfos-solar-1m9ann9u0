/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const lote = app.findRecordById('disparos_massa', 'gmjaha28owikvvh')
      if (!lote) {
        console.log('[MIGRATION 1745260079] Lote gmjaha28owikvvh não encontrado.')
        return
      }

      // 1. Obter todas as mensagens enviadas no disparo deste lote (entre 17:13:00 e 17:13:50 de 2026-10-27)
      // Como visto na auditoria, foram exatamente 23 mensagens enviadas com tipo_disparo='massa'
      const msgsEnviadas = app.findRecordsByFilter(
        'whatsapp_mensagens',
        "tipo_disparo = 'massa' && created >= '2026-10-27 17:13:00' && created <= '2026-10-27 17:14:00'",
        'created',
        100,
        0,
      )

      console.log(`[MIGRATION 1745260079] Mensagens do lote encontradas: ${msgsEnviadas.length}`)

      const agoraIso = new Date().toISOString()
      const fluxoIdLote = lote.getString('fluxo_id') || 'j8jvs41gncsyduh'

      const destsCorrigidos = []
      const clienteIdsVistos = new Set()

      for (let i = 0; i < msgsEnviadas.length; i++) {
        const msg = msgsEnviadas[i]
        const cliId = msg.getString('cliente_id')
        if (!cliId || clienteIdsVistos.has(cliId)) continue
        clienteIdsVistos.add(cliId)

        let nomeCli = 'Cliente'
        try {
          const cliRec = app.findRecordById('clientes', cliId)
          if (cliRec) {
            nomeCli = cliRec.getString('nome') || cliRec.getString('razao_social') || 'Cliente'
          }
        } catch (_) {}

        const telLimpo = (msg.getString('telefone_destino') || '').replace(/\D/g, '')
        const dataEnvioMsg =
          msg.getString('enviado_em') || msg.getString('created') || '2026-10-27T17:13:46.295Z'

        // Verificar se é Alexandre Guarnieri ou André Martinovski (ou se tem resposta recebida)
        let isAlexandre = cliId === 'pzy47u5ohezsr2i'
        let isAndre = cliId === 'mnk5er2gjae567d'

        let statusItem = 'pendente'
        let marcacaoResp = undefined
        let marcacaoData = undefined
        let respondidoEm = undefined
        let motivoSaida = undefined
        let trilha = [
          {
            fluxo_id: fluxoIdLote,
            fluxo_nome: 'Fluxo Pós-Vendas',
            origem_entrada: 'por_disparo',
            motivo: 'Incluído no disparo em lote → Fluxo "Fluxo Pós-Vendas"',
            data: dataEnvioMsg,
          },
        ]

        if (isAlexandre) {
          const respData = '2026-10-27T17:15:00.718Z'
          statusItem = 'respondido'
          marcacaoResp = 'respondeu'
          marcacaoData = respData
          respondidoEm = respData
          motivoSaida = 'Resposta detectada retroativamente via WhatsApp'
          trilha.push({
            fluxo_id: fluxoIdLote,
            fluxo_nome: 'Fluxo Pós-Vendas',
            motivo: 'Resposta detectada retroativamente via WhatsApp',
            resposta_detectada: true,
            preview_mensagem: 'Boa tarde',
            data: respData,
          })
        } else if (isAndre) {
          const respData = '2026-10-27T19:04:39.904Z'
          statusItem = 'respondido'
          marcacaoResp = 'respondeu'
          marcacaoData = respData
          respondidoEm = respData
          motivoSaida = 'Resposta detectada retroativamente via WhatsApp'
          trilha.push({
            fluxo_id: fluxoIdLote,
            fluxo_nome: 'Fluxo Pós-Vendas',
            motivo: 'Resposta detectada retroativamente via WhatsApp',
            resposta_detectada: true,
            preview_mensagem: 'Tudo nova instalei agora somente ano que vem',
            data: respData,
          })
        }

        destsCorrigidos.push({
          cliente_id: cliId,
          nome: nomeCli,
          telefone: telLimpo,
          status: statusItem,
          data_envio_inicial: dataEnvioMsg,
          fluxo_atual_id: fluxoIdLote,
          origem_entrada: 'por_disparo',
          marcacao_resposta: marcacaoResp,
          marcacao_data: marcacaoData,
          respondido_em: respondidoEm,
          motivo_saida: motivoSaida,
          trilha: trilha,
        })
      }

      console.log(`[MIGRATION 1745260079] Destinatários estruturados: ${destsCorrigidos.length}`)

      const totalDests = destsCorrigidos.length
      const respondidos = destsCorrigidos.filter((d) => d.status === 'respondido').length
      const pendentes = destsCorrigidos.filter(
        (d) =>
          d.status === 'pendente' ||
          d.status === 'reenvio_1_agendado' ||
          d.status === 'reenvio_2_agendado',
      ).length
      const atendidos = destsCorrigidos.filter((d) => d.status === 'atendido').length
      const bloqueados = destsCorrigidos.filter(
        (d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp',
      ).length
      const finalizados = destsCorrigidos.filter(
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

      lote.set('total_destinatarios', totalDests)
      lote.set('destinatarios', destsCorrigidos)
      lote.set('estatisticas', stats)
      app.save(lote)

      console.log(
        `[MIGRATION 1745260079] Lote gmjaha28owikvvh atualizado com sucesso! Total: ${totalDests}, Respondidos: ${respondidos}, Pendentes: ${pendentes}`,
      )
    } catch (err) {
      console.log('[MIGRATION 1745260079] Erro ao corrigir lote gmjaha28owikvvh:', err)
      throw err
    }
  },
  (app) => {},
)
