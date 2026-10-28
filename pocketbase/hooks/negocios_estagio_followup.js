// pocketbase/hooks/negocios_estagio_followup.js
// Hook de gatilho para entrada automática em fluxos de follow-up ao mudar estágio do negócio (Fase 3)
// 100% autocontido sem require cruzado entre hooks.

onRecordAfterUpdateSuccess((e) => {
  function normalizarEstagioComparacaoNegocios(str) {
    if (!str) return ''
    return String(str)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
  }

  function carregarEtapasDoFluxoNegocios(app, fluxoId) {
    if (!fluxoId) return []
    try {
      const etapasRecs = app.findRecordsByFilter(
        'etapas_follow_up',
        `fluxo_id = '${fluxoId}' && ativa = true`,
        'ordem',
        50,
        0,
      )
      const etapas = []
      for (let i = 0; i < etapasRecs.length; i++) {
        const rec = etapasRecs[i]
        const ordemVal = rec.getInt('ordem') || i + 1
        const rawDiasApos = rec.get('dias_apos')
        const diasAposVal =
          rawDiasApos !== null && rawDiasApos !== undefined && rawDiasApos !== ''
            ? Number(rawDiasApos)
            : ordemVal === 1
              ? 0
              : 1

        etapas.push({
          id: rec.id,
          ordem: ordemVal,
          nome: rec.getString('nome') || `Etapa ${i + 1}`,
          dias_apos: isNaN(diasAposVal) ? (ordemVal === 1 ? 0 : 1) : Math.max(0, diasAposVal),
          mensagem: rec.getString('mensagem') || '',
          desvio_acao: rec.getString('desvio_acao') || 'nenhuma',
          desvio_dias: rec.getInt('desvio_dias') || 0,
          desvio_fluxo_id: rec.getString('desvio_fluxo_id') || '',
          resposta_acao: rec.getString('resposta_acao') || 'encerrar',
          resposta_fluxo_id: rec.getString('resposta_fluxo_id') || '',
        })
      }
      etapas.sort((a, b) => a.ordem - b.ordem)
      return etapas
    } catch (err) {
      console.log('[HOOK NEGOCIOS FOLLOW-UP] Erro ao carregar etapas do fluxo:', err)
      return []
    }
  }

  function avaliarEntradaAutomaticaEstagioNegocios(app, negocioRec, novoEstagio, estagioAnterior) {
    if (!negocioRec || !novoEstagio) return { entrou: false }

    const novoNorm = normalizarEstagioComparacaoNegocios(novoEstagio)
    const anteriorNorm = normalizarEstagioComparacaoNegocios(estagioAnterior)

    if (novoNorm && anteriorNorm && novoNorm === anteriorNorm) {
      return { entrou: false, motivo: 'Estágio não alterado' }
    }

    const clienteId = negocioRec.getString('cliente_id')
    if (!clienteId || clienteId.startsWith('demo_')) {
      return { entrou: false, motivo: 'Sem cliente válido' }
    }

    let clienteRec = null
    try {
      clienteRec = app.findRecordById('clientes', clienteId)
    } catch (_) {}

    if (!clienteRec) {
      return { entrou: false, motivo: 'Cliente não encontrado' }
    }

    const clienteNome = clienteRec.getString('nome') || 'Cliente'
    const telBruto = clienteRec.getString('whatsapp') || clienteRec.getString('telefone') || ''
    const telefoneLimpo = telBruto.replace(/\D/g, '')

    if (!telefoneLimpo || telefoneLimpo.length < 10) {
      return { entrou: false, motivo: 'Cliente sem telefone/WhatsApp válido' }
    }

    let regrasAtivas = []
    try {
      regrasAtivas = app.findRecordsByFilter(
        'regras_entrada_fluxo',
        'ativo = true',
        'created',
        100,
        0,
      )
    } catch (errRegras) {
      console.log('[HOOK NEGOCIOS FOLLOW-UP] Aviso ao buscar regras_entrada_fluxo:', errRegras)
      return { entrou: false, error: String(errRegras) }
    }

    if (!regrasAtivas || regrasAtivas.length === 0) {
      return { entrou: false, motivo: 'Nenhuma regra de entrada ativa configurada' }
    }

    const fluxosCorrespondentesIds = []
    for (let r = 0; r < regrasAtivas.length; r++) {
      const reg = regrasAtivas[r]
      const estRegra = reg.getString('estagio_funil')
      if (normalizarEstagioComparacaoNegocios(estRegra) === novoNorm) {
        const fId = reg.getString('fluxo_id')
        if (fId && !fluxosCorrespondentesIds.includes(fId)) {
          fluxosCorrespondentesIds.push(fId)
        }
      }
    }

    if (fluxosCorrespondentesIds.length === 0) {
      return { entrou: false, motivo: 'Nenhuma regra corresponde ao estágio ' + novoEstagio }
    }

    const agora = new Date()
    const agoraIso = agora.toISOString()
    let entradasRealizadas = 0

    for (let fIdx = 0; fIdx < fluxosCorrespondentesIds.length; fIdx++) {
      const targetFluxoId = fluxosCorrespondentesIds[fIdx]

      let fluxoRec = null
      try {
        fluxoRec = app.findRecordById('fluxos_follow_up', targetFluxoId)
      } catch (_) {}

      if (!fluxoRec || !fluxoRec.getBool('ativo')) {
        continue
      }

      const fluxoNome = fluxoRec.getString('nome') || 'Fluxo Follow-up'

      let jaAtivoNesseFluxo = false
      try {
        const lotesDoFluxo = app.findRecordsByFilter(
          'disparos_massa',
          `fluxo_id = '${targetFluxoId}' && status = 'ativo'`,
          '-created',
          50,
          0,
        )

        for (let l = 0; l < lotesDoFluxo.length; l++) {
          let dests = []
          try {
            const rawD = lotesDoFluxo[l].get('destinatarios')
            dests = typeof rawD === 'string' ? JSON.parse(rawD) : rawD || []
          } catch (_) {}

          const matchDest = dests.find(
            (d) =>
              d.cliente_id === clienteId &&
              d.status !== 'finalizado' &&
              d.status !== 'arquivado' &&
              d.status !== 'respondido' &&
              d.status !== 'atendido' &&
              d.status !== 'nao_perturbe' &&
              d.status !== 'bloqueado' &&
              d.status !== 'sem_whatsapp',
          )

          if (matchDest) {
            jaAtivoNesseFluxo = true
            break
          }
        }
      } catch (errCheck) {
        console.log('[HOOK NEGOCIOS FOLLOW-UP] Erro ao checar idempotência do lote:', errCheck)
      }

      if (jaAtivoNesseFluxo) {
        console.log(
          `[HOOK NEGOCIOS FOLLOW-UP] Cliente ${clienteNome} já possui acompanhamento ativo no fluxo "${fluxoNome}" (${targetFluxoId}). Entrada ignorada.`,
        )
        continue
      }

      const etapas = carregarEtapasDoFluxoNegocios(app, targetFluxoId)
      const primeiraEtapa = etapas.length > 0 ? etapas[0] : null
      const prazoDias = primeiraEtapa
        ? primeiraEtapa.dias_apos === 0
          ? 0
          : Math.max(1, primeiraEtapa.dias_apos || 1)
        : 3
      const dataPrevistaIso = new Date(
        agora.getTime() + prazoDias * 24 * 60 * 60 * 1000,
      ).toISOString()

      const novoDestinatario = {
        cliente_id: clienteId,
        nome: clienteNome,
        telefone: telefoneLimpo,
        status: 'pendente',
        origem_entrada: 'automatica_por_estagio',
        estagio_origem: novoEstagio,
        negocio_id: negocioRec.id,
        data_envio_inicial: agoraIso,
        fluxo_atual_id: targetFluxoId,
        proximo_envio_data: dataPrevistaIso,
        proxima_etapa_nome: primeiraEtapa ? primeiraEtapa.nome : '1º Follow-up',
        etapas_executadas: [],
        trilha: [
          {
            fluxo_id: targetFluxoId,
            fluxo_nome: fluxoNome,
            origem_entrada: 'automatica_por_estagio',
            estagio_gatilho: novoEstagio,
            motivo: `Entrou automaticamente — estágio "${novoEstagio}" → Fluxo "${fluxoNome}"`,
            data: agoraIso,
          },
        ],
      }

      try {
        const disparosCol = app.findCollectionByNameOrId('disparos_massa')
        const filtroLoteAuto = `fluxo_id = '${targetFluxoId}' && origem_entrada = 'automatica_por_estagio' && status = 'ativo'`
        const lotesAuto = app.findRecordsByFilter(
          'disparos_massa',
          filtroLoteAuto,
          '-created',
          1,
          0,
        )

        let loteParaAtualizar = null
        if (lotesAuto && lotesAuto.length > 0) {
          loteParaAtualizar = lotesAuto[0]
          let dests = []
          try {
            const raw = loteParaAtualizar.get('destinatarios')
            dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
          } catch (_) {}
          dests.push(novoDestinatario)
          loteParaAtualizar.set('destinatarios', dests)
          loteParaAtualizar.set('total_destinatarios', dests.length)
          app.save(loteParaAtualizar)
        } else {
          loteParaAtualizar = new Record(disparosCol)
          loteParaAtualizar.set('titulo', `Follow-up Automático por Estágio: ${fluxoNome}`)
          loteParaAtualizar.set('status', 'ativo')
          loteParaAtualizar.set('segmento', 'automatica_por_estagio')
          loteParaAtualizar.set('total_destinatarios', 1)
          loteParaAtualizar.set('intervalo_segundos', 60)
          loteParaAtualizar.set('data_disparo', agoraIso)
          loteParaAtualizar.set(
            'mensagem_original',
            `Entrada automática de contatos com estágio "${novoEstagio}" no fluxo "${fluxoNome}"`,
          )
          loteParaAtualizar.set('reenvio_ativo', true)
          loteParaAtualizar.set('fluxo_id', targetFluxoId)
          loteParaAtualizar.set('origem_entrada', 'automatica_por_estagio')
          loteParaAtualizar.set('destinatarios', [novoDestinatario])
          loteParaAtualizar.set('estatisticas', {
            total: 1,
            pendentes: 1,
            respondidos: 0,
            atendidos: 0,
            bloqueados: 0,
            finalizados: 0,
            reenvios_1_enviados: 0,
            reenvios_2_enviados: 0,
            ultima_verificacao: agoraIso,
          })
          app.save(loteParaAtualizar)
        }

        entradasRealizadas++
        console.log(
          `[HOOK NEGOCIOS FOLLOW-UP] Cliente ${clienteNome} entrou no fluxo "${fluxoNome}" por mudança de estágio para "${novoEstagio}".`,
        )
      } catch (errSaveLote) {
        console.log('[HOOK NEGOCIOS FOLLOW-UP] Erro ao salvar lote de acompanhamento:', errSaveLote)
      }
    }

    return {
      entrou: entradasRealizadas > 0,
      entradasRealizadas,
      estagio: novoEstagio,
    }
  }

  try {
    const record = e.record
    if (!record || record.collection().name !== 'negocios') {
      return e.next()
    }

    const novaEtapa = record.getString('etapa_funil')
    const etapaAnterior = record.original() ? record.original().getString('etapa_funil') : ''

    if (novaEtapa && novaEtapa !== etapaAnterior) {
      try {
        avaliarEntradaAutomaticaEstagioNegocios($app, record, novaEtapa, etapaAnterior)
      } catch (errHelper) {
        console.log('[HOOK NEGOCIOS FOLLOW-UP] Erro ao avaliar regras de estágio:', errHelper)
      }
    }
  } catch (err) {
    console.log('[HOOK NEGOCIOS FOLLOW-UP] Erro geral:', err)
  }

  return e.next()
})

onRecordAfterCreateSuccess((e) => {
  function normalizarEstagioComparacaoNegocios(str) {
    if (!str) return ''
    return String(str)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
  }

  function carregarEtapasDoFluxoNegocios(app, fluxoId) {
    if (!fluxoId) return []
    try {
      const etapasRecs = app.findRecordsByFilter(
        'etapas_follow_up',
        `fluxo_id = '${fluxoId}' && ativa = true`,
        'ordem',
        50,
        0,
      )
      const etapas = []
      for (let i = 0; i < etapasRecs.length; i++) {
        const rec = etapasRecs[i]
        const ordemVal = rec.getInt('ordem') || i + 1
        const rawDiasApos = rec.get('dias_apos')
        const diasAposVal =
          rawDiasApos !== null && rawDiasApos !== undefined && rawDiasApos !== ''
            ? Number(rawDiasApos)
            : ordemVal === 1
              ? 0
              : 1

        etapas.push({
          id: rec.id,
          ordem: ordemVal,
          nome: rec.getString('nome') || `Etapa ${i + 1}`,
          dias_apos: isNaN(diasAposVal) ? (ordemVal === 1 ? 0 : 1) : Math.max(0, diasAposVal),
          mensagem: rec.getString('mensagem') || '',
          desvio_acao: rec.getString('desvio_acao') || 'nenhuma',
          desvio_dias: rec.getInt('desvio_dias') || 0,
          desvio_fluxo_id: rec.getString('desvio_fluxo_id') || '',
          resposta_acao: rec.getString('resposta_acao') || 'encerrar',
          resposta_fluxo_id: rec.getString('resposta_fluxo_id') || '',
        })
      }
      etapas.sort((a, b) => a.ordem - b.ordem)
      return etapas
    } catch (err) {
      console.log('[HOOK NEGOCIOS FOLLOW-UP] Erro ao carregar etapas do fluxo:', err)
      return []
    }
  }

  function avaliarEntradaAutomaticaEstagioNegocios(app, negocioRec, novoEstagio, estagioAnterior) {
    if (!negocioRec || !novoEstagio) return { entrou: false }

    const novoNorm = normalizarEstagioComparacaoNegocios(novoEstagio)
    const anteriorNorm = normalizarEstagioComparacaoNegocios(estagioAnterior)

    if (novoNorm && anteriorNorm && novoNorm === anteriorNorm) {
      return { entrou: false, motivo: 'Estágio não alterado' }
    }

    const clienteId = negocioRec.getString('cliente_id')
    if (!clienteId || clienteId.startsWith('demo_')) {
      return { entrou: false, motivo: 'Sem cliente válido' }
    }

    let clienteRec = null
    try {
      clienteRec = app.findRecordById('clientes', clienteId)
    } catch (_) {}

    if (!clienteRec) {
      return { entrou: false, motivo: 'Cliente não encontrado' }
    }

    const clienteNome = clienteRec.getString('nome') || 'Cliente'
    const telBruto = clienteRec.getString('whatsapp') || clienteRec.getString('telefone') || ''
    const telefoneLimpo = telBruto.replace(/\D/g, '')

    if (!telefoneLimpo || telefoneLimpo.length < 10) {
      return { entrou: false, motivo: 'Cliente sem telefone/WhatsApp válido' }
    }

    let regrasAtivas = []
    try {
      regrasAtivas = app.findRecordsByFilter(
        'regras_entrada_fluxo',
        'ativo = true',
        'created',
        100,
        0,
      )
    } catch (errRegras) {
      console.log('[HOOK NEGOCIOS FOLLOW-UP] Aviso ao buscar regras_entrada_fluxo:', errRegras)
      return { entrou: false, error: String(errRegras) }
    }

    if (!regrasAtivas || regrasAtivas.length === 0) {
      return { entrou: false, motivo: 'Nenhuma regra de entrada ativa configurada' }
    }

    const fluxosCorrespondentesIds = []
    for (let r = 0; r < regrasAtivas.length; r++) {
      const reg = regrasAtivas[r]
      const estRegra = reg.getString('estagio_funil')
      if (normalizarEstagioComparacaoNegocios(estRegra) === novoNorm) {
        const fId = reg.getString('fluxo_id')
        if (fId && !fluxosCorrespondentesIds.includes(fId)) {
          fluxosCorrespondentesIds.push(fId)
        }
      }
    }

    if (fluxosCorrespondentesIds.length === 0) {
      return { entrou: false, motivo: 'Nenhuma regra corresponde ao estágio ' + novoEstagio }
    }

    const agora = new Date()
    const agoraIso = agora.toISOString()
    let entradasRealizadas = 0

    for (let fIdx = 0; fIdx < fluxosCorrespondentesIds.length; fIdx++) {
      const targetFluxoId = fluxosCorrespondentesIds[fIdx]

      let fluxoRec = null
      try {
        fluxoRec = app.findRecordById('fluxos_follow_up', targetFluxoId)
      } catch (_) {}

      if (!fluxoRec || !fluxoRec.getBool('ativo')) {
        continue
      }

      const fluxoNome = fluxoRec.getString('nome') || 'Fluxo Follow-up'

      let jaAtivoNesseFluxo = false
      try {
        const lotesDoFluxo = app.findRecordsByFilter(
          'disparos_massa',
          `fluxo_id = '${targetFluxoId}' && status = 'ativo'`,
          '-created',
          50,
          0,
        )

        for (let l = 0; l < lotesDoFluxo.length; l++) {
          let dests = []
          try {
            const rawD = lotesDoFluxo[l].get('destinatarios')
            dests = typeof rawD === 'string' ? JSON.parse(rawD) : rawD || []
          } catch (_) {}

          const matchDest = dests.find(
            (d) =>
              d.cliente_id === clienteId &&
              d.status !== 'finalizado' &&
              d.status !== 'arquivado' &&
              d.status !== 'respondido' &&
              d.status !== 'atendido' &&
              d.status !== 'nao_perturbe' &&
              d.status !== 'bloqueado' &&
              d.status !== 'sem_whatsapp',
          )

          if (matchDest) {
            jaAtivoNesseFluxo = true
            break
          }
        }
      } catch (errCheck) {
        console.log(
          '[HOOK NEGOCIOS CRIADO FOLLOW-UP] Erro ao checar idempotência do lote:',
          errCheck,
        )
      }

      if (jaAtivoNesseFluxo) {
        console.log(
          `[HOOK NEGOCIOS CRIADO FOLLOW-UP] Cliente ${clienteNome} já possui acompanhamento ativo no fluxo "${fluxoNome}" (${targetFluxoId}). Entrada ignorada.`,
        )
        continue
      }

      const etapas = carregarEtapasDoFluxoNegocios(app, targetFluxoId)
      const primeiraEtapa = etapas.length > 0 ? etapas[0] : null
      const prazoDias = primeiraEtapa
        ? primeiraEtapa.dias_apos === 0
          ? 0
          : Math.max(1, primeiraEtapa.dias_apos || 1)
        : 3
      const dataPrevistaIso = new Date(
        agora.getTime() + prazoDias * 24 * 60 * 60 * 1000,
      ).toISOString()

      const novoDestinatario = {
        cliente_id: clienteId,
        nome: clienteNome,
        telefone: telefoneLimpo,
        status: 'pendente',
        origem_entrada: 'automatica_por_estagio',
        estagio_origem: novoEstagio,
        negocio_id: negocioRec.id,
        data_envio_inicial: agoraIso,
        fluxo_atual_id: targetFluxoId,
        proximo_envio_data: dataPrevistaIso,
        proxima_etapa_nome: primeiraEtapa ? primeiraEtapa.nome : '1º Follow-up',
        etapas_executadas: [],
        trilha: [
          {
            fluxo_id: targetFluxoId,
            fluxo_nome: fluxoNome,
            origem_entrada: 'automatica_por_estagio',
            estagio_gatilho: novoEstagio,
            motivo: `Entrou automaticamente — estágio "${novoEstagio}" → Fluxo "${fluxoNome}"`,
            data: agoraIso,
          },
        ],
      }

      try {
        const disparosCol = app.findCollectionByNameOrId('disparos_massa')
        const filtroLoteAuto = `fluxo_id = '${targetFluxoId}' && origem_entrada = 'automatica_por_estagio' && status = 'ativo'`
        const lotesAuto = app.findRecordsByFilter(
          'disparos_massa',
          filtroLoteAuto,
          '-created',
          1,
          0,
        )

        let loteParaAtualizar = null
        if (lotesAuto && lotesAuto.length > 0) {
          loteParaAtualizar = lotesAuto[0]
          let dests = []
          try {
            const raw = loteParaAtualizar.get('destinatarios')
            dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
          } catch (_) {}
          dests.push(novoDestinatario)
          loteParaAtualizar.set('destinatarios', dests)
          loteParaAtualizar.set('total_destinatarios', dests.length)
          app.save(loteParaAtualizar)
        } else {
          loteParaAtualizar = new Record(disparosCol)
          loteParaAtualizar.set('titulo', `Follow-up Automático por Estágio: ${fluxoNome}`)
          loteParaAtualizar.set('status', 'ativo')
          loteParaAtualizar.set('segmento', 'automatica_por_estagio')
          loteParaAtualizar.set('total_destinatarios', 1)
          loteParaAtualizar.set('intervalo_segundos', 60)
          loteParaAtualizar.set('data_disparo', agoraIso)
          loteParaAtualizar.set(
            'mensagem_original',
            `Entrada automática de contatos com estágio "${novoEstagio}" no fluxo "${fluxoNome}"`,
          )
          loteParaAtualizar.set('reenvio_ativo', true)
          loteParaAtualizar.set('fluxo_id', targetFluxoId)
          loteParaAtualizar.set('origem_entrada', 'automatica_por_estagio')
          loteParaAtualizar.set('destinatarios', [novoDestinatario])
          loteParaAtualizar.set('estatisticas', {
            total: 1,
            pendentes: 1,
            respondidos: 0,
            atendidos: 0,
            bloqueados: 0,
            finalizados: 0,
            reenvios_1_enviados: 0,
            reenvios_2_enviados: 0,
            ultima_verificacao: agoraIso,
          })
          app.save(loteParaAtualizar)
        }

        entradasRealizadas++
        console.log(
          `[HOOK NEGOCIOS CRIADO FOLLOW-UP] Cliente ${clienteNome} entrou no fluxo "${fluxoNome}" por estágio "${novoEstagio}".`,
        )
      } catch (errSaveLote) {
        console.log(
          '[HOOK NEGOCIOS CRIADO FOLLOW-UP] Erro ao salvar lote de acompanhamento:',
          errSaveLote,
        )
      }
    }

    return {
      entrou: entradasRealizadas > 0,
      entradasRealizadas,
      estagio: novoEstagio,
    }
  }

  try {
    const record = e.record
    if (!record || record.collection().name !== 'negocios') {
      return e.next()
    }

    const etapa = record.getString('etapa_funil')
    if (etapa) {
      try {
        avaliarEntradaAutomaticaEstagioNegocios($app, record, etapa, '')
      } catch (errHelper) {
        console.log('[HOOK NEGOCIOS CRIADO FOLLOW-UP] Erro:', errHelper)
      }
    }
  } catch (err) {
    console.log('[HOOK NEGOCIOS CRIADO FOLLOW-UP] Erro geral:', err)
  }

  return e.next()
})
