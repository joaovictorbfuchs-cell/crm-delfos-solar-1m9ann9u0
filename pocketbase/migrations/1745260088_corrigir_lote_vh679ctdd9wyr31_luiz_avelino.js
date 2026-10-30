/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const loteId = 'vh679ctdd9wyr31'
      let lote = null
      try {
        lote = app.findRecordById('disparos_massa', loteId)
      } catch (e) {
        console.log(`[MIGRATION 1745260088] Lote ${loteId} não encontrado:`, e)
        return
      }

      if (!lote) {
        console.log(`[MIGRATION 1745260088] Lote ${loteId} não existe.`)
        return
      }

      // Buscar mensagens do disparo em massa enviadas no intervalo do lote (aprox 17:42 a 17:58 UTC de 30/10/2026)
      // O lote foi criado às 17:42:57 UTC e possui 15 destinatários
      const msgsEnviadas = app.findRecordsByFilter(
        'whatsapp_mensagens',
        "tipo_disparo = 'massa' && created >= '2026-10-30 17:42:00' && created <= '2026-10-30 18:05:00'",
        'created',
        100,
        0,
      )

      console.log(
        `[MIGRATION 1745260088] Mensagens enviadas do lote encontradas: ${msgsEnviadas.length}`,
      )

      const agoraIso = new Date().toISOString()
      const fluxoIdLote = lote.getString('fluxo_id') || 'j8jvs41gncsyduh'
      let fluxoNome = 'Fluxo Pós-Vendas'
      try {
        const fluxoRec = app.findRecordById('fluxos_follow_up', fluxoIdLote)
        if (fluxoRec) {
          fluxoNome = fluxoRec.getString('nome') || fluxoNome
        }
      } catch (_) {}

      // Tentar ler destinatários existentes se houver algum recuperável
      let destsOriginais = []
      try {
        let rawDest = lote.get('destinatarios')
        if (typeof rawDest === 'string') {
          try {
            rawDest = JSON.parse(rawDest)
          } catch (_) {}
        }
        if (typeof rawDest === 'string') {
          try {
            rawDest = JSON.parse(rawDest)
          } catch (_) {}
        }
        if (Array.isArray(rawDest)) {
          destsOriginais = rawDest.filter((d) => d && typeof d === 'object')
        }
      } catch (_) {}

      const mapOriginaisPorCliente = new Map()
      const mapOriginaisPorTel = new Map()
      for (let o = 0; o < destsOriginais.length; o++) {
        const itemO = destsOriginais[o]
        if (itemO.cliente_id) mapOriginaisPorCliente.set(itemO.cliente_id, itemO)
        if (itemO.telefone) {
          const tLimpo = String(itemO.telefone).replace(/\D/g, '')
          if (tLimpo) mapOriginaisPorTel.set(tLimpo, itemO)
        }
      }

      const destsReconstruidos = []
      const clienteIdsVistos = new Set()

      // Reconstruir a partir das mensagens enviadas
      for (let i = 0; i < msgsEnviadas.length; i++) {
        const msg = msgsEnviadas[i]
        const cliId = msg.getString('cliente_id')
        const telLimpo = (msg.getString('telefone_destino') || '').replace(/\D/g, '')
        const chaveDeduplicacao = cliId || telLimpo
        if (!chaveDeduplicacao || clienteIdsVistos.has(chaveDeduplicacao)) continue
        clienteIdsVistos.add(chaveDeduplicacao)

        let nomeCli = 'Cliente'
        if (cliId) {
          try {
            const cliRec = app.findRecordById('clientes', cliId)
            if (cliRec) {
              nomeCli = cliRec.getString('nome') || cliRec.getString('razao_social') || 'Cliente'
            }
          } catch (_) {}
        }

        const dataEnvioMsg =
          msg.getString('enviado_em') || msg.getString('created') || '2026-10-30T17:42:57.000Z'

        // Verificar dados existentes prévios
        const orig =
          (cliId ? mapOriginaisPorCliente.get(cliId) : null) ||
          mapOriginaisPorTel.get(telLimpo) ||
          {}

        let statusItem = orig.status || 'pendente'
        let marcacaoResp = orig.marcacao_resposta
        let marcacaoData = orig.marcacao_data
        let respondidoEm = orig.respondido_em
        let motivoSaida = orig.motivo_saida

        let trilha = Array.isArray(orig.trilha) ? orig.trilha : []
        if (trilha.length === 0) {
          trilha.push({
            fluxo_id: fluxoIdLote,
            fluxo_nome: fluxoNome,
            origem_entrada: 'por_disparo',
            motivo: `Incluído no disparo em lote → Fluxo "${fluxoNome}"`,
            data: dataEnvioMsg,
          })
        }

        // Caso específico do Luiz Avelino Nunes Baldez (cliente_id: woqrbo0rblfd18a)
        if (cliId === 'woqrbo0rblfd18a' || telLimpo.endsWith('99874591')) {
          const respData = '2026-10-30T18:24:03.635Z'
          statusItem = 'respondido'
          marcacaoResp = 'respondeu'
          marcacaoData = respData
          respondidoEm = respData
          motivoSaida = 'Cliente respondeu à mensagem no WhatsApp'
          trilha.push({
            fluxo_id: fluxoIdLote,
            fluxo_nome: fluxoNome,
            motivo: 'Cliente respondeu à mensagem no WhatsApp',
            resposta_detectada: true,
            preview_mensagem: 'Ou vcs marcaram',
            data: respData,
          })
        } else {
          // Checar se houve resposta recebida para outros clientes deste lote
          try {
            if (cliId) {
              const msgsRespCli = app.findRecordsByFilter(
                'whatsapp_mensagens',
                `direcao = 'recebida' && created >= '2026-10-30 17:40:00' && cliente_id = '${cliId}'`,
                '-created',
                1,
                0,
              )
              if (msgsRespCli && msgsRespCli.length > 0) {
                const rMsg = msgsRespCli[0]
                const rData = rMsg.getString('created') || agoraIso
                statusItem = 'respondido'
                marcacaoResp = 'respondeu'
                marcacaoData = rData
                respondidoEm = rData
                motivoSaida = 'Cliente respondeu à mensagem no WhatsApp'
                trilha.push({
                  fluxo_id: fluxoIdLote,
                  fluxo_nome: fluxoNome,
                  motivo: 'Cliente respondeu à mensagem no WhatsApp',
                  resposta_detectada: true,
                  preview_mensagem: (rMsg.getString('conteudo_final') || '').slice(0, 80),
                  data: rData,
                })
              }
            }
          } catch (_) {}
        }

        destsReconstruidos.push({
          cliente_id: cliId,
          nome: orig.nome || nomeCli,
          telefone: orig.telefone || telLimpo,
          status: statusItem,
          data_envio_inicial: dataEnvioMsg,
          fluxo_atual_id: orig.fluxo_atual_id || fluxoIdLote,
          origem_entrada: 'por_disparo',
          marcacao_resposta: marcacaoResp,
          marcacao_data: marcacaoData,
          respondido_em: respondidoEm,
          motivo_saida: motivoSaida,
          trilha: trilha,
          proximo_envio_data: statusItem === 'respondido' ? undefined : orig.proximo_envio_data,
          proxima_etapa_nome: statusItem === 'respondido' ? undefined : orig.proxima_etapa_nome,
          etapas_executadas: Array.isArray(orig.etapas_executadas) ? orig.etapas_executadas : [],
        })
      }

      // Se por algum motivo as mensagens não cobrirem os 15 destinatários originais,
      // mesclar destinatários originais restantes que não foram adicionados
      for (let o = 0; o < destsOriginais.length; o++) {
        const itemO = destsOriginais[o]
        const cKey = itemO.cliente_id || (itemO.telefone || '').replace(/\D/g, '')
        if (cKey && !clienteIdsVistos.has(cKey)) {
          clienteIdsVistos.add(cKey)
          destsReconstruidos.push(itemO)
        }
      }

      console.log(
        `[MIGRATION 1745260088] Total de destinatários reconstruídos: ${destsReconstruidos.length}`,
      )

      const totalDests = destsReconstruidos.length
      const respondidos = destsReconstruidos.filter((d) => d.status === 'respondido').length
      const pendentes = destsReconstruidos.filter(
        (d) =>
          d.status === 'pendente' ||
          d.status === 'reenvio_1_agendado' ||
          d.status === 'reenvio_2_agendado',
      ).length
      const atendidos = destsReconstruidos.filter((d) => d.status === 'atendido').length
      const bloqueados = destsReconstruidos.filter(
        (d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp',
      ).length
      const finalizados = destsReconstruidos.filter(
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
      lote.set('destinatarios', destsReconstruidos)
      lote.set('estatisticas', stats)
      app.save(lote)

      console.log(
        `[MIGRATION 1745260088] Lote ${loteId} salvo com sucesso! Total: ${totalDests}, Respondidos: ${respondidos}, Pendentes: ${pendentes}`,
      )
    } catch (err) {
      console.log('[MIGRATION 1745260088] Erro:', err)
      throw err
    }
  },
  (app) => {},
)
