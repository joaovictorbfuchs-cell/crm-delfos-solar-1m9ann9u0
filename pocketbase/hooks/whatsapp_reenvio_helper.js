// Helper compartilhado para execução de verificação de reenvio de disparos em massa
// No PocketBase pb_hooks, módulos require() mantêm isolamento por pool de VM.

function processarReenviosDisparosMassa(app) {
  const agora = new Date()
  const agoraIso = agora.toISOString()
  const logs = []

  let lotesAtivos = []
  try {
    lotesAtivos = app.findRecordsByFilter(
      'disparos_massa',
      "status = 'ativo' && reenvio_ativo = true",
      'created',
      50,
      0,
    )
  } catch (err) {
    console.log('[REENVIO MASSA] Erro ao buscar lotes ativos:', err)
    return { error: String(err), lotesProcessados: 0 }
  }

  if (!lotesAtivos || lotesAtivos.length === 0) {
    return { lotesProcessados: 0, mensagem: 'Nenhum lote ativo com reenvio pendente' }
  }

  // Carregar lista de telefones bloqueados para exclusão rápida
  const telefonesBloqueados = new Set()
  try {
    const bloqueadosRecs = app.findRecordsByFilter('whatsapp_bloqueados', '', '', 1000, 0)
    for (let b = 0; b < bloqueadosRecs.length; b++) {
      const numB = (bloqueadosRecs[b].getString('numero') || '').replace(/\D/g, '')
      if (numB) {
        telefonesBloqueados.add(numB)
        if (numB.startsWith('55')) {
          telefonesBloqueados.add(numB.substring(2))
        }
      }
    }
  } catch (_) {}

  const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
  let totalReenviosAgendados = 0

  for (let l = 0; l < lotesAtivos.length; l++) {
    const lote = lotesAtivos[l]
    let destinatarios = []
    try {
      const rawDest = lote.get('destinatarios')
      destinatarios = typeof rawDest === 'string' ? JSON.parse(rawDest) : rawDest || []
    } catch (_) {
      destinatarios = []
    }

    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      continue
    }

    const textoReenvio1 = lote.getString('texto_reenvio_1') || ''
    const textoReenvio2 = lote.getString('texto_reenvio_2') || ''
    const intervaloSegundos = Math.max(5, lote.getInt('intervalo_segundos') || 60)
    const intervalMs = intervaloSegundos * 1000

    // Data de base do disparo inicial
    const dataDisparoStr = lote.getString('data_disparo') || lote.getString('created')
    const dataDisparoMs = new Date(dataDisparoStr).getTime()

    // 3 dias em ms = 3 * 24 * 60 * 60 * 1000 = 259200000 ms
    const tresDiasMs = 3 * 24 * 60 * 60 * 1000
    // 90 dias em ms = 90 * 24 * 60 * 60 * 1000 = 7776000000 ms
    const noventaDiasMs = 90 * 24 * 60 * 60 * 1000

    let loteModificado = false
    let reenviosAgendadosLote = 0

    // Hora base para agendar novos reenvios: agora + pequeno buffer
    let agendamentoBaseMs = agora.getTime() + 10000

    for (let d = 0; d < destinatarios.length; d++) {
      const item = destinatarios[d]
      if (!item) continue

      const statusAtual = item.status || 'pendente'

      // Se já foi finalizado, respondido, atendido na central, ou sem whatsapp/bloqueado, pular
      if (
        statusAtual === 'respondido' ||
        statusAtual === 'atendido' ||
        statusAtual === 'finalizado' ||
        statusAtual === 'bloqueado' ||
        statusAtual === 'sem_whatsapp'
      ) {
        continue
      }

      const telefoneLimpo = (item.telefone || '').replace(/\D/g, '')
      if (!telefoneLimpo || telefoneLimpo.length < 10) {
        item.status = 'sem_whatsapp'
        item.motivo_saida = 'Sem WhatsApp ou telefone válido'
        loteModificado = true
        continue
      }

      // Verificar se número está bloqueado
      if (
        telefonesBloqueados.has(telefoneLimpo) ||
        telefonesBloqueados.has(telefoneLimpo.replace(/^55/, ''))
      ) {
        item.status = 'bloqueado'
        item.motivo_saida = 'Contato bloqueado no WhatsApp'
        loteModificado = true
        continue
      }

      // 1. CHECAGEM SE RESPONDEU: existe mensagem recebida (direcao = 'recebida') do cliente após o disparo inicial
      let houveResposta = false
      let respostaData = ''
      try {
        const queryTel =
          telefoneLimpo.length >= 10 && !telefoneLimpo.startsWith('55')
            ? '55' + telefoneLimpo
            : telefoneLimpo
        const queryTelCurto = queryTel.startsWith('55') ? queryTel.substring(2) : queryTel
        const dataMinimaIso = new Date(dataDisparoMs).toISOString().replace('T', ' ')

        // Filtro em whatsapp_mensagens
        const filtroResp = `direcao = 'recebida' && created >= '${dataMinimaIso}' && (telefone_destino ~ '${queryTelCurto}' || cliente_id = '${item.cliente_id}')`
        const msgsRecebidas = app.findRecordsByFilter(
          'whatsapp_mensagens',
          filtroResp,
          '-created',
          1,
          0,
        )
        if (msgsRecebidas && msgsRecebidas.length > 0) {
          houveResposta = true
          respostaData = msgsRecebidas[0].getString('created')
        }
      } catch (errResp) {
        console.log('[REENVIO MASSA] Erro ao checar resposta do cliente:', errResp)
      }

      if (houveResposta) {
        item.status = 'respondido'
        item.respondido_em = respostaData || agoraIso
        item.motivo_saida = 'Cliente respondeu à mensagem'
        loteModificado = true
        continue
      }

      // 2. CHECAGEM SE FOI ATENDIDO NA CENTRAL: conversa do cliente vinculada com status 'em_atendimento' ou 'resolvido'
      let foiAtendidoCentral = false
      try {
        const filtroConv = `cliente_id = '${item.cliente_id}' || numero ~ '${telefoneLimpo.replace(/^55/, '')}'`
        const conversas = app.findRecordsByFilter(
          'whatsapp_conversas',
          filtroConv,
          '-updated',
          5,
          0,
        )
        for (let c = 0; c < conversas.length; c++) {
          const conv = conversas[c]
          const convStatus = conv.getString('status')
          const atendente = conv.getString('atendente')
          const convUpdated = new Date(
            conv.getString('updated') || conv.getString('created'),
          ).getTime()

          // Se a conversa foi movimentada/atendida após o envio inicial
          if (convUpdated >= dataDisparoMs) {
            if (convStatus === 'em_atendimento' || convStatus === 'resolvido' || atendente) {
              foiAtendidoCentral = true
              break
            }
          }
        }
      } catch (errConv) {
        console.log('[REENVIO MASSA] Erro ao checar conversa na Central:', errConv)
      }

      if (foiAtendidoCentral) {
        item.status = 'atendido'
        item.atendido_em = agoraIso
        item.motivo_saida = 'Atendido na Central de Atendimento'
        loteModificado = true
        continue
      }

      // 3. VERIFICAÇÃO DO 1º REENVIO (+3 DIAS SEM RESPOSTA)
      const tempoDecorridoDisparoMs = agora.getTime() - dataDisparoMs
      if (!item.reenvio_1_data) {
        if (tempoDecorridoDisparoMs >= tresDiasMs) {
          if (!textoReenvio1) {
            item.status = 'finalizado'
            item.motivo_saida = 'Sem texto configurado para 1º reenvio'
            loteModificado = true
            continue
          }

          // Agendar 1º reenvio com intervalo escalonado
          const agendadoParaIso = new Date(
            agendamentoBaseMs + reenviosAgendadosLote * intervalMs,
          ).toISOString()
          reenviosAgendadosLote++
          totalReenviosAgendados++

          // Montar texto com substituição básica de [nome do cliente]
          let textoFinalReenvio1 = textoReenvio1.replace(
            /\[nome do cliente\]/gi,
            item.nome || 'Cliente',
          )
          textoFinalReenvio1 = textoFinalReenvio1.replace(
            /\{\{nome_cliente\}\}/g,
            item.nome || 'Cliente',
          )

          let cleanPhone = telefoneLimpo
          if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone
          }

          // Criar registro na fila de whatsapp_mensagens com status 'agendada'
          const novaMsg = new Record(msgsCol)
          if (item.cliente_id && !item.cliente_id.startsWith('demo_')) {
            novaMsg.set('cliente_id', item.cliente_id)
          }
          novaMsg.set('telefone_destino', cleanPhone)
          novaMsg.set('conteudo_final', textoFinalReenvio1)
          novaMsg.set('status', 'agendada')
          novaMsg.set('agendado_para', agendadoParaIso)
          novaMsg.set('tipo_disparo', 'massa_reenvio_1')
          novaMsg.set('referencia_id', `lote_${lote.id}_r1_${item.cliente_id || cleanPhone}`)
          app.save(novaMsg)

          item.status = 'reenvio_1_agendado'
          item.reenvio_1_data = agendadoParaIso
          item.reenvio_1_msg_id = novaMsg.id
          loteModificado = true

          logs.push(
            `Lote ${lote.id}: 1º reenvio agendado para ${item.nome} (${cleanPhone}) para ${agendadoParaIso}`,
          )
          continue
        }
      }

      // 4. VERIFICAÇÃO DO 2º REENVIO (+90 DIAS CONTADOS DO 1º REENVIO)
      if (item.reenvio_1_data && !item.reenvio_2_data) {
        const dataR1Ms = new Date(item.reenvio_1_data).getTime()
        const tempoDecorridoR1Ms = agora.getTime() - dataR1Ms

        if (tempoDecorridoR1Ms >= noventaDiasMs) {
          if (!textoReenvio2) {
            item.status = 'finalizado'
            item.motivo_saida = 'Sem texto configurado para 2º reenvio'
            loteModificado = true
            continue
          }

          const agendadoParaIso = new Date(
            agendamentoBaseMs + reenviosAgendadosLote * intervalMs,
          ).toISOString()
          reenviosAgendadosLote++
          totalReenviosAgendados++

          let textoFinalReenvio2 = textoReenvio2.replace(
            /\[nome do cliente\]/gi,
            item.nome || 'Cliente',
          )
          textoFinalReenvio2 = textoFinalReenvio2.replace(
            /\{\{nome_cliente\}\}/g,
            item.nome || 'Cliente',
          )

          let cleanPhone = telefoneLimpo
          if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone
          }

          const novaMsg2 = new Record(msgsCol)
          if (item.cliente_id && !item.cliente_id.startsWith('demo_')) {
            novaMsg2.set('cliente_id', item.cliente_id)
          }
          novaMsg2.set('telefone_destino', cleanPhone)
          novaMsg2.set('conteudo_final', textoFinalReenvio2)
          novaMsg2.set('status', 'agendada')
          novaMsg2.set('agendado_para', agendadoParaIso)
          novaMsg2.set('tipo_disparo', 'massa_reenvio_2')
          novaMsg2.set('referencia_id', `lote_${lote.id}_r2_${item.cliente_id || cleanPhone}`)
          app.save(novaMsg2)

          item.status = 'reenvio_2_agendado'
          item.reenvio_2_data = agendadoParaIso
          item.reenvio_2_msg_id = novaMsg2.id
          loteModificado = true

          logs.push(
            `Lote ${lote.id}: 2º reenvio agendado para ${item.nome} (${cleanPhone}) para ${agendadoParaIso}`,
          )
          continue
        }
      }

      // Se já passou pelo 2º reenvio e não respondeu após 7 dias adicionais, marca como finalizado
      if (item.reenvio_2_data && item.status === 'reenvio_2_agendado') {
        const dataR2Ms = new Date(item.reenvio_2_data).getTime()
        if (agora.getTime() - dataR2Ms >= 7 * 24 * 60 * 60 * 1000) {
          item.status = 'finalizado'
          item.motivo_saida = 'Concluído o 2º reenvio (+90d) sem resposta do cliente'
          loteModificado = true
        }
      }
    }

    // Recalcular estatísticas do lote
    const stats = {
      total: destinatarios.length,
      pendentes: destinatarios.filter(
        (d) =>
          d.status === 'pendente' ||
          d.status === 'reenvio_1_agendado' ||
          d.status === 'reenvio_2_agendado',
      ).length,
      respondidos: destinatarios.filter((d) => d.status === 'respondido').length,
      atendidos: destinatarios.filter((d) => d.status === 'atendido').length,
      bloqueados: destinatarios.filter(
        (d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp',
      ).length,
      finalizados: destinatarios.filter((d) => d.status === 'finalizado').length,
      reenvios_1_enviados: destinatarios.filter((d) => Boolean(d.reenvio_1_data)).length,
      reenvios_2_enviados: destinatarios.filter((d) => Boolean(d.reenvio_2_data)).length,
      ultima_verificacao: agoraIso,
    }

    const todosFinalizados = stats.pendentes === 0

    if (loteModificado || todosFinalizados) {
      lote.set('destinatarios', destinatarios)
      lote.set('estatisticas', stats)
      if (todosFinalizados) {
        lote.set('status', 'concluido')
      }
      app.save(lote)
    }
  }

  return {
    lotesProcessados: lotesAtivos.length,
    reenviosAgendados: totalReenviosAgendados,
    logs,
  }
}

module.exports = {
  processarReenviosDisparosMassa,
}
