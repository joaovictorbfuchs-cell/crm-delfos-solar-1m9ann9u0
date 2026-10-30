// pocketbase/migrations/1745260087_reconciliar_respostas_lotes_30_outubro.js
/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  function gerarVariacoesTelefone(tel) {
    if (!tel) return []
    let s = String(tel).split('@')[0].split(':')[0].trim()
    let d = s.replace(/\D/g, '')
    while (d.startsWith('00')) d = d.slice(2)
    if (d.startsWith('0') && (d.length === 11 || d.length === 12)) {
      d = d.slice(1)
    }

    let nacional = d
    if (nacional.startsWith('55') && (nacional.length === 12 || nacional.length === 13)) {
      nacional = nacional.slice(2)
    }

    if (nacional.length === 8 || nacional.length === 9) {
      nacional = '54' + nacional
    }

    const variacoes = new Set()
    if (d) variacoes.add(d)
    if (nacional) variacoes.add(nacional)

    if (nacional.length === 10) {
      const ddd = nacional.slice(0, 2)
      const resto8 = nacional.slice(2)
      const com9 = ddd + '9' + resto8

      variacoes.add(nacional)
      variacoes.add('55' + nacional)
      variacoes.add(com9)
      variacoes.add('55' + com9)
      variacoes.add(resto8)
    } else if (nacional.length === 11) {
      const ddd = nacional.slice(0, 2)
      const digito9 = nacional.charAt(2)
      const resto = nacional.slice(3)
      variacoes.add(nacional)
      variacoes.add('55' + nacional)

      if (digito9 === '9') {
        const sem9 = ddd + resto
        variacoes.add(sem9)
        variacoes.add('55' + sem9)
      }
      variacoes.add(nacional.slice(2))
      variacoes.add(resto)
    }

    if (nacional.length >= 8) {
      variacoes.add(nacional.slice(-8))
    }

    return Array.from(variacoes)
  }

  function telefonesCasamBidirecional(telA, telB) {
    if (!telA || !telB) return false
    const limpoA = String(telA).replace(/\D/g, '')
    const limpoB = String(telB).replace(/\D/g, '')
    if (!limpoA || !limpoB) return false
    if (limpoA === limpoB) return true

    const varsA = gerarVariacoesTelefone(telA)
    const setB = new Set(gerarVariacoesTelefone(telB))

    for (let i = 0; i < varsA.length; i++) {
      const v = varsA[i]
      if (setB.has(v)) {
        if (v.length === 8) {
          const dddA =
            limpoA.length >= 10
              ? limpoA.startsWith('55')
                ? limpoA.slice(2, 4)
                : limpoA.slice(0, 2)
              : ''
          const dddB =
            limpoB.length >= 10
              ? limpoB.startsWith('55')
                ? limpoB.slice(2, 4)
                : limpoB.slice(0, 2)
              : ''
          if (dddA && dddB && dddA !== dddB) {
            continue
          }
        }
        return true
      }
    }

    if (limpoA.length >= 8 && limpoB.length >= 8) {
      const last8A = limpoA.slice(-8)
      const last8B = limpoB.slice(-8)
      if (last8A === last8B) {
        const dddA =
          limpoA.length >= 10
            ? limpoA.startsWith('55')
              ? limpoA.slice(2, 4)
              : limpoA.slice(0, 2)
            : ''
        const dddB =
          limpoB.length >= 10
            ? limpoB.startsWith('55')
              ? limpoB.slice(2, 4)
              : limpoB.slice(0, 2)
            : ''
        if (!dddA || !dddB || dddA === dddB) {
          return true
        }
      }
    }

    return false
  }

  const agoraIso = new Date().toISOString()
  const lotesAlvo = ['unfwmml8rkq2u96', 'vh679ctdd9wyr31']

  for (let li = 0; li < lotesAlvo.length; li++) {
    const loteId = lotesAlvo[li]
    let lote = null
    try {
      lote = app.findRecordById('disparos_massa', loteId)
    } catch (_) {}

    if (!lote) continue

    let dests = []
    try {
      let raw = lote.get('destinatarios')
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw)
        } catch (_) {
          raw = []
        }
      }
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw)
        } catch (_) {
          raw = []
        }
      }
      dests = Array.isArray(raw) ? raw : []
    } catch (_) {
      dests = []
    }

    dests = dests.filter((d) => d && typeof d === 'object')
    if (dests.length === 0) continue

    const dataDisparoStr = lote.getString('data_disparo') || lote.getString('created')
    const dataDisparoMs = new Date(dataDisparoStr).getTime()
    const dataInicioBuscaIso = new Date(Math.max(0, dataDisparoMs - 10 * 60 * 1000))
      .toISOString()
      .replace('T', ' ')

    let loteModificado = false

    for (let d = 0; d < dests.length; d++) {
      const item = dests[d]
      if (!item) continue

      if (item.status === 'respondido' || item.marcacao_resposta === 'respondeu') {
        continue
      }

      const telItem = (item.telefone || '').replace(/\D/g, '')
      const cliId = item.cliente_id || ''

      let msgRecebida = null

      if (cliId && !cliId.startsWith('demo_')) {
        try {
          const msgsCli = app.findRecordsByFilter(
            'whatsapp_mensagens',
            `direcao = 'recebida' && created >= '${dataInicioBuscaIso}' && cliente_id = '${cliId}'`,
            'created',
            5,
            0,
          )
          if (msgsCli && msgsCli.length > 0) {
            msgRecebida = msgsCli[0]
          }
        } catch (_) {}
      }

      if (!msgRecebida && telItem && telItem.length >= 8) {
        try {
          const ult8 = telItem.slice(-8)
          const msgsTel = app.findRecordsByFilter(
            'whatsapp_mensagens',
            `direcao = 'recebida' && created >= '${dataInicioBuscaIso}' && (telefone_destino ~ '${ult8}' || cliente_id = '${cliId}')`,
            'created',
            20,
            0,
          )
          for (let m = 0; m < msgsTel.length; m++) {
            const cand = msgsTel[m]
            const destTel = cand.getString('telefone_destino') || ''
            const candCli = cand.getString('cliente_id') || ''
            if (
              (candCli && candCli === cliId) ||
              telefonesCasamBidirecional(destTel, telItem) ||
              (ult8 && destTel.replace(/\D/g, '').endsWith(ult8))
            ) {
              msgRecebida = cand
              break
            }
          }
        } catch (_) {}
      }

      if (msgRecebida) {
        const dataMsgIso =
          msgRecebida.getString('enviado_em') || msgRecebida.getString('created') || agoraIso

        item.status = 'respondido'
        item.marcacao_resposta = 'respondeu'
        item.marcacao_data = dataMsgIso
        item.respondido_em = dataMsgIso
        item.motivo_saida = 'Resposta de cliente no WhatsApp reconciliada'
        item.proximo_envio_data = undefined
        item.proxima_etapa_nome = undefined

        let trilhaArr = []
        if (typeof item.trilha === 'string') {
          try {
            trilhaArr = JSON.parse(item.trilha)
          } catch (_) {
            trilhaArr = []
          }
        } else if (Array.isArray(item.trilha)) {
          trilhaArr = item.trilha
        }
        trilhaArr = trilhaArr.filter((t) => t && typeof t === 'object')
        trilhaArr.push({
          fluxo_id: item.fluxo_atual_id || lote.getString('fluxo_id'),
          motivo: 'Resposta de cliente reconciliada via WhatsApp',
          resposta_detectada: true,
          preview_mensagem: (msgRecebida.getString('conteudo_final') || '').substring(0, 80),
          data: dataMsgIso,
        })
        item.trilha = trilhaArr

        loteModificado = true
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
      ultima_verificacao: agoraIso,
    }

    lote.set('destinatarios', dests)
    lote.set('estatisticas', stats)
    app.save(lote)
    console.log(
      `[MIGRATION 1745260087] Lote ${loteId} atualizado com respondidos=${stats.respondidos}, modificado=${loteModificado}`,
    )
  }
})
