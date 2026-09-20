// pocketbase/hooks/notificacoes_atividades_atrasadas.js
// Varredura automática periódica e gatilhos para atividades atrasadas e notificações internas

// 1. CRON AGENDADO (mesmo padrão do automacoes_worker: a cada hora)
cronAdd('notificacoes_atividades_worker', '0 * * * *', () => {
  try {
    const agora = new Date()
    const hojeYmd = agora.toISOString().substring(0, 10)
    const agoraTimestamp = agora.getTime()

    let countCriadas = 0
    let countAtualizadas = 0
    let countResolvidas = 0

    const notifCol = $app.findCollectionByNameOrId('notificacoes_internas')

    // Buscar atividades em aberto
    const filterPendentes = "(status = 'pendente' || status = 'agendada' || status = 'em_execucao')"
    const atividadesAbertas = $app.findRecordsByFilter('atividades', filterPendentes, '', 500, 0)

    const atividadesAtrasadasMap = {}

    for (let i = 0; i < atividadesAbertas.length; i++) {
      const atv = atividadesAbertas[i]
      const dataStr = atv.getString('data') || atv.getString('created')
      if (!dataStr) continue

      const dataPrev = new Date(dataStr)
      const prevTimestamp = dataPrev.getTime()
      if (isNaN(prevTimestamp)) continue

      const prevYmd = dataStr.substring(0, 10)

      if (prevYmd < hojeYmd || agoraTimestamp - prevTimestamp > 24 * 60 * 60 * 1000) {
        const diffMs = agoraTimestamp - prevTimestamp
        const diasAtraso = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
        atividadesAtrasadasMap[atv.id] = {
          atv: atv,
          diasAtraso: diasAtraso,
          dataPrevista: dataStr,
        }
      }
    }

    const atrasadasIds = Object.keys(atividadesAtrasadasMap)
    for (let j = 0; j < atrasadasIds.length; j++) {
      const atvId = atrasadasIds[j]
      const item = atividadesAtrasadasMap[atvId]
      const atv = item.atv
      const dias = item.diasAtraso
      const cliId = atv.getString('cliente_id')

      let cliNome = ''
      if (cliId) {
        try {
          const cliList = $app.findRecordsByFilter('clientes', `id = '${cliId}'`, '', 1, 0)
          if (cliList && cliList.length > 0) {
            cliNome = cliList[0].getString('nome')
          }
        } catch (_) {}
      }

      const atvTitulo =
        atv.getString('titulo') || atv.getString('tipo') || 'Atividade de Manutenção'
      const tituloNotif = `Atividade atrasada: ${atvTitulo}`
      const mensagemNotif = cliNome
        ? `A atividade "${atvTitulo}" do cliente ${cliNome} está atrasada há ${dias} ${dias === 1 ? 'dia' : 'dias'}.`
        : `A atividade "${atvTitulo}" está atrasada há ${dias} ${dias === 1 ? 'dia' : 'dias'}.`

      let notifExistente = null
      try {
        const listNotif = $app.findRecordsByFilter(
          notifCol.id,
          `atividade_id = '${atvId}'`,
          '-created',
          1,
          0,
        )
        if (listNotif && listNotif.length > 0) {
          notifExistente = listNotif[0]
        }
      } catch (_) {}

      if (notifExistente) {
        const diasAtuais = notifExistente.getInt('dias_atraso')
        const statusAtual = notifExistente.getString('status')
        if (diasAtuais !== dias || statusAtual !== 'ativa') {
          notifExistente.set('dias_atraso', dias)
          notifExistente.set('titulo', tituloNotif)
          notifExistente.set('mensagem', mensagemNotif)
          notifExistente.set('status', 'ativa')
          notifExistente.set('data_prevista', item.dataPrevista)
          if (cliNome) notifExistente.set('cliente_nome', cliNome)
          $app.save(notifExistente)
          countAtualizadas++
        }
      } else {
        const novaNotif = new Record(notifCol)
        novaNotif.set('tipo', 'atividade_atrasada')
        novaNotif.set('titulo', tituloNotif)
        novaNotif.set('mensagem', mensagemNotif)
        novaNotif.set('atividade_id', atvId)
        if (cliId) novaNotif.set('cliente_id', cliId)
        if (cliNome) novaNotif.set('cliente_nome', cliNome)
        novaNotif.set('data_prevista', item.dataPrevista)
        novaNotif.set('dias_atraso', dias)
        novaNotif.set('lida', false)
        novaNotif.set('status', 'ativa')
        $app.save(novaNotif)
        countCriadas++
      }
    }

    try {
      const notifsAtivas = $app.findRecordsByFilter(
        notifCol.id,
        "tipo = 'atividade_atrasada' && status = 'ativa'",
        '',
        200,
        0,
      )

      for (let k = 0; k < notifsAtivas.length; k++) {
        const nRec = notifsAtivas[k]
        const linkedAtvId = nRec.getString('atividade_id')
        if (!linkedAtvId) continue

        if (!atividadesAtrasadasMap[linkedAtvId]) {
          try {
            const atvList = $app.findRecordsByFilter(
              'atividades',
              `id = '${linkedAtvId}'`,
              '',
              1,
              0,
            )
            const atvFound = atvList && atvList.length > 0 ? atvList[0] : null
            const atvStatus = atvFound ? atvFound.getString('status') : 'concluida'

            if (!atvFound || atvStatus === 'concluida' || atvStatus === 'cancelada') {
              nRec.set('status', 'resolvida')
              nRec.set('resolvida_em', agora.toISOString())
              $app.save(nRec)
              countResolvidas++
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    console.log(
      '[NOTIFICACOES CRON ATIVIDADES ATRASADAS] Criadas:',
      countCriadas,
      'Atualizadas:',
      countAtualizadas,
      'Resolvidas:',
      countResolvidas,
    )
  } catch (err) {
    console.log('[NOTIFICACOES CRON ERRO GERAL]', err)
  }
})

// 2. TRIGGER ON RECORD AFTER UPDATE EM ATIVIDADES
// Quando uma atividade for concluída ou cancelada, resolve a notificação correspondente
onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record
    if (record.collection().name === 'atividades') {
      const novoStatus = record.getString('status')
      const statusAnterior = record.original().getString('status')

      if (
        (novoStatus === 'concluida' || novoStatus === 'cancelada') &&
        statusAnterior !== novoStatus
      ) {
        try {
          const notifCol = $app.findCollectionByNameOrId('notificacoes_internas')
          const notifs = $app.findRecordsByFilter(
            notifCol.id,
            `atividade_id = '${record.id}' && status = 'ativa'`,
            '',
            10,
            0,
          )
          for (let i = 0; i < notifs.length; i++) {
            const notif = notifs[i]
            notif.set('status', 'resolvida')
            notif.set('resolvida_em', new Date().toISOString())
            $app.save(notif)
          }
        } catch (errResolv) {
          console.log('[NOTIFICACOES TRIGGER ERRO AO RESOLVER]', errResolv)
        }
      }
    }
  } catch (_) {}
  return e.next()
})

// 3. ENDPOINT HTTP PARA SINCRONIZAÇÃO INSTANTÂNEA AO CARREGAR O APP OU APÓS AÇÕES
// POST /backend/v1/notificacoes/sync
routerAdd('POST', '/backend/v1/notificacoes/sync', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const agora = new Date()
    const hojeYmd = agora.toISOString().substring(0, 10)
    const agoraTimestamp = agora.getTime()

    let countCriadas = 0
    let countAtualizadas = 0
    let countResolvidas = 0

    const notifCol = $app.findCollectionByNameOrId('notificacoes_internas')

    // Buscar atividades em aberto
    const filterPendentes = "(status = 'pendente' || status = 'agendada' || status = 'em_execucao')"
    const atividadesAbertas = $app.findRecordsByFilter('atividades', filterPendentes, '', 500, 0)

    const atividadesAtrasadasMap = {}

    for (let i = 0; i < atividadesAbertas.length; i++) {
      const atv = atividadesAbertas[i]
      const dataStr = atv.getString('data') || atv.getString('created')
      if (!dataStr) continue

      const dataPrev = new Date(dataStr)
      const prevTimestamp = dataPrev.getTime()
      if (isNaN(prevTimestamp)) continue

      const prevYmd = dataStr.substring(0, 10)

      if (prevYmd < hojeYmd || agoraTimestamp - prevTimestamp > 24 * 60 * 60 * 1000) {
        const diffMs = agoraTimestamp - prevTimestamp
        const diasAtraso = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
        atividadesAtrasadasMap[atv.id] = {
          atv: atv,
          diasAtraso: diasAtraso,
          dataPrevista: dataStr,
        }
      }
    }

    const atrasadasIds = Object.keys(atividadesAtrasadasMap)
    for (let j = 0; j < atrasadasIds.length; j++) {
      const atvId = atrasadasIds[j]
      const item = atividadesAtrasadasMap[atvId]
      const atv = item.atv
      const dias = item.diasAtraso
      const cliId = atv.getString('cliente_id')

      let cliNome = ''
      if (cliId) {
        try {
          const cliList = $app.findRecordsByFilter('clientes', `id = '${cliId}'`, '', 1, 0)
          if (cliList && cliList.length > 0) {
            cliNome = cliList[0].getString('nome')
          }
        } catch (_) {}
      }

      const atvTitulo =
        atv.getString('titulo') || atv.getString('tipo') || 'Atividade de Manutenção'
      const tituloNotif = `Atividade atrasada: ${atvTitulo}`
      const mensagemNotif = cliNome
        ? `A atividade "${atvTitulo}" do cliente ${cliNome} está atrasada há ${dias} ${dias === 1 ? 'dia' : 'dias'}.`
        : `A atividade "${atvTitulo}" está atrasada há ${dias} ${dias === 1 ? 'dia' : 'dias'}.`

      let notifExistente = null
      try {
        const listNotif = $app.findRecordsByFilter(
          notifCol.id,
          `atividade_id = '${atvId}'`,
          '-created',
          1,
          0,
        )
        if (listNotif && listNotif.length > 0) {
          notifExistente = listNotif[0]
        }
      } catch (_) {}

      if (notifExistente) {
        const diasAtuais = notifExistente.getInt('dias_atraso')
        const statusAtual = notifExistente.getString('status')
        if (diasAtuais !== dias || statusAtual !== 'ativa') {
          notifExistente.set('dias_atraso', dias)
          notifExistente.set('titulo', tituloNotif)
          notifExistente.set('mensagem', mensagemNotif)
          notifExistente.set('status', 'ativa')
          notifExistente.set('data_prevista', item.dataPrevista)
          if (cliNome) notifExistente.set('cliente_nome', cliNome)
          $app.save(notifExistente)
          countAtualizadas++
        }
      } else {
        const novaNotif = new Record(notifCol)
        novaNotif.set('tipo', 'atividade_atrasada')
        novaNotif.set('titulo', tituloNotif)
        novaNotif.set('mensagem', mensagemNotif)
        novaNotif.set('atividade_id', atvId)
        if (cliId) novaNotif.set('cliente_id', cliId)
        if (cliNome) novaNotif.set('cliente_nome', cliNome)
        novaNotif.set('data_prevista', item.dataPrevista)
        novaNotif.set('dias_atraso', dias)
        novaNotif.set('lida', false)
        novaNotif.set('status', 'ativa')
        $app.save(novaNotif)
        countCriadas++
      }
    }

    try {
      const notifsAtivas = $app.findRecordsByFilter(
        notifCol.id,
        "tipo = 'atividade_atrasada' && status = 'ativa'",
        '',
        200,
        0,
      )

      for (let k = 0; k < notifsAtivas.length; k++) {
        const nRec = notifsAtivas[k]
        const linkedAtvId = nRec.getString('atividade_id')
        if (!linkedAtvId) continue

        if (!atividadesAtrasadasMap[linkedAtvId]) {
          try {
            const atvList = $app.findRecordsByFilter(
              'atividades',
              `id = '${linkedAtvId}'`,
              '',
              1,
              0,
            )
            const atvFound = atvList && atvList.length > 0 ? atvList[0] : null
            const atvStatus = atvFound ? atvFound.getString('status') : 'concluida'

            if (!atvFound || atvStatus === 'concluida' || atvStatus === 'cancelada') {
              nRec.set('status', 'resolvida')
              nRec.set('resolvida_em', agora.toISOString())
              $app.save(nRec)
              countResolvidas++
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    return e.json(200, {
      ok: true,
      criadas: countCriadas,
      atualizadas: countAtualizadas,
      resolvidas: countResolvidas,
      totalAtrasadas: atrasadasIds.length,
    })
  } catch (errSync) {
    const msg = errSync && errSync.message ? errSync.message : String(errSync)
    return e.json(500, { error: msg, ok: false })
  }
})
