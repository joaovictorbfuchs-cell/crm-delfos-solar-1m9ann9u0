// Helper compartilhado para execução de verificação de reenvio de disparos em massa
// No PocketBase pb_hooks, módulos require() mantêm isolamento por pool de VM.
// Suporta fluxos de follow-up dinâmicos com etapas configuráveis e fallback para +3d/+90d fixos.

function carregarEtapasDoFluxo(app, fluxoId) {
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
      etapas.push({
        id: rec.id,
        ordem: rec.getInt('ordem') || i + 1,
        nome: rec.getString('nome') || `Etapa ${i + 1}`,
        dias_apos: rec.getInt('dias_apos') || 1,
        mensagem: rec.getString('mensagem') || '',
      })
    }
    // Ordena garantindo ordem crescente
    etapas.sort((a, b) => a.ordem - b.ordem)
    return etapas
  } catch (err) {
    console.log('[REENVIO MASSA] Erro ao carregar etapas do fluxo:', err)
    return []
  }
}

function carregarFluxoPadraoId(app) {
  try {
    const padraoRecs = app.findRecordsByFilter(
      'fluxos_follow_up',
      'is_padrao = true && ativo = true',
      '-created',
      1,
      0,
    )
    if (padraoRecs && padraoRecs.length > 0) {
      return padraoRecs[0].id
    }
  } catch (_) {}
  return ''
}

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
  const fluxoPadraoFallbackId = carregarFluxoPadraoId(app)

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

    const fluxoId = lote.getString('fluxo_id') || fluxoPadraoFallbackId
    let etapasAtivas = carregarEtapasDoFluxo(app, fluxoId)

    // Se o lote não tem etapas cadastradas no fluxo vinculado, monta etapas virtuais
    // baseadas nos campos texto_reenvio_1 e texto_reenvio_2 existentes para 100% de compatibilidade
    const textoReenvio1 = lote.getString('texto_reenvio_1') || ''
    const textoReenvio2 = lote.getString('texto_reenvio_2') || ''
    if (etapasAtivas.length === 0 && (textoReenvio1 || textoReenvio2)) {
      if (textoReenvio1) {
        etapasAtivas.push({
          id: 'etapa_compat_1',
          ordem: 1,
          nome: '1º Reenvio (+3d)',
          dias_apos: 3,
          mensagem: textoReenvio1,
        })
      }
      if (textoReenvio2) {
        etapasAtivas.push({
          id: 'etapa_compat_2',
          ordem: 2,
          nome: '2º Reenvio (+90d)',
          dias_apos: 90,
          mensagem: textoReenvio2,
        })
      }
    }

    const intervaloSegundos = Math.max(5, lote.getInt('intervalo_segundos') || 60)
    const intervalMs = intervaloSegundos * 1000

    // Data de base do disparo inicial
    const dataDisparoStr = lote.getString('data_disparo') || lote.getString('created')
    const dataDisparoMs = new Date(dataDisparoStr).getTime()

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
        item.proximo_envio_data = undefined
        loteModificado = true
        continue
      }

      // 2. CHECAGEM SE FOI ATENDIDO NA CENTRAL
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
        item.proximo_envio_data = undefined
        loteModificado = true
        continue
      }

      // Se não há etapas no fluxo, finaliza
      if (etapasAtivas.length === 0) {
        item.status = 'finalizado'
        item.motivo_saida = 'Nenhuma etapa ativa configurada no fluxo'
        item.proximo_envio_data = undefined
        loteModificado = true
        continue
      }

      // Inicializa estrutura de etapas_executadas se não existir
      if (!Array.isArray(item.etapas_executadas)) {
        item.etapas_executadas = []
        // Migra histórico legado se já existia reenvio_1 / reenvio_2
        if (item.reenvio_1_data) {
          item.etapas_executadas.push({
            ordem: 1,
            nome: '1º Reenvio (+3d)',
            enviado_em: item.reenvio_1_data,
            mensagem_id: item.reenvio_1_msg_id,
          })
        }
        if (item.reenvio_2_data) {
          item.etapas_executadas.push({
            ordem: 2,
            nome: '2º Reenvio (+90d)',
            enviado_em: item.reenvio_2_data,
            mensagem_id: item.reenvio_2_msg_id,
          })
        }
      }

      // Descobre a última ordem executada
      let ultimaOrdemExecutada = 0
      let dataUltimoEnvioMs = dataDisparoMs

      if (item.etapas_executadas.length > 0) {
        const ultimaExec = item.etapas_executadas[item.etapas_executadas.length - 1]
        ultimaOrdemExecutada = ultimaExec.ordem
        if (ultimaExec.enviado_em) {
          dataUltimoEnvioMs = new Date(ultimaExec.enviado_em).getTime()
        }
      } else if (item.reenvio_2_data) {
        ultimaOrdemExecutada = 2
        dataUltimoEnvioMs = new Date(item.reenvio_2_data).getTime()
      } else if (item.reenvio_1_data) {
        ultimaOrdemExecutada = 1
        dataUltimoEnvioMs = new Date(item.reenvio_1_data).getTime()
      }

      // Encontra a próxima etapa ativa cuja ordem seja superior a ultimaOrdemExecutada
      let proximaEtapa = null
      for (let e = 0; e < etapasAtivas.length; e++) {
        if (etapasAtivas[e].ordem > ultimaOrdemExecutada) {
          proximaEtapa = etapasAtivas[e]
          break
        }
      }

      // Se não há mais etapas no fluxo
      if (!proximaEtapa) {
        // Se já passou 7 dias da última etapa sem resposta, marca como finalizado
        if (agora.getTime() - dataUltimoEnvioMs >= 7 * 24 * 60 * 60 * 1000) {
          item.status = 'finalizado'
          item.motivo_saida = 'Concluídas todas as etapas do fluxo sem resposta'
          item.proximo_envio_data = undefined
          loteModificado = true
        }
        continue
      }

      // Calcula o prazo para a próxima etapa: dias_apos contados do último envio (ou disparo inicial)
      const prazoDias = Math.max(1, proximaEtapa.dias_apos || 1)
      const prazoMs = prazoDias * 24 * 60 * 60 * 1000
      const dataPrevistaEnvioMs = dataUltimoEnvioMs + prazoMs
      const dataPrevistaIso = new Date(dataPrevistaEnvioMs).toISOString()

      item.proximo_envio_data = dataPrevistaIso
      item.proxima_etapa_nome = proximaEtapa.nome
      if (!item.etapa_atual_nome) {
        item.etapa_atual_nome =
          ultimaOrdemExecutada > 0 ? `Etapa ${ultimaOrdemExecutada}` : 'Início'
      }

      // Verifica se o prazo venceu
      if (agora.getTime() >= dataPrevistaEnvioMs) {
        if (!proximaEtapa.mensagem) {
          // Pula etapa sem mensagem
          ultimaOrdemExecutada = proximaEtapa.ordem
          continue
        }

        // Agendar envio da etapa
        const agendadoParaIso = new Date(
          agendamentoBaseMs + reenviosAgendadosLote * intervalMs,
        ).toISOString()
        reenviosAgendadosLote++
        totalReenviosAgendados++

        // Substituição de placeholders consistente
        let textoFinal = proximaEtapa.mensagem
        textoFinal = textoFinal.replace(/\[nome do cliente\]/gi, item.nome || 'Cliente')
        textoFinal = textoFinal.replace(/\[nome da empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\[empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\{\{nome_cliente\}\}/g, item.nome || 'Cliente')

        let cleanPhone = telefoneLimpo
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }

        // Criar registro na fila de whatsapp_mensagens
        const novaMsg = new Record(msgsCol)
        if (item.cliente_id && !item.cliente_id.startsWith('demo_')) {
          novaMsg.set('cliente_id', item.cliente_id)
        }
        novaMsg.set('telefone_destino', cleanPhone)
        novaMsg.set('conteudo_final', textoFinal)
        novaMsg.set('status', 'agendada')
        novaMsg.set('agendado_para', agendadoParaIso)
        novaMsg.set('tipo_disparo', `massa_fluxo_etapa_${proximaEtapa.ordem}`)
        novaMsg.set(
          'referencia_id',
          `lote_${lote.id}_e${proximaEtapa.ordem}_${item.cliente_id || cleanPhone}`,
        )
        app.save(novaMsg)

        // Atualizar estado do destinatário
        item.etapas_executadas.push({
          ordem: proximaEtapa.ordem,
          etapa_id: proximaEtapa.id,
          nome: proximaEtapa.nome,
          enviado_em: agendadoParaIso,
          mensagem_id: novaMsg.id,
        })

        item.etapa_atual_ordem = proximaEtapa.ordem
        item.etapa_atual_nome = proximaEtapa.nome

        // Retrocompatibilidade com reenvio_1 / reenvio_2 existentes
        if (proximaEtapa.ordem === 1) {
          item.status = 'reenvio_1_agendado'
          item.reenvio_1_data = agendadoParaIso
          item.reenvio_1_msg_id = novaMsg.id
        } else if (proximaEtapa.ordem === 2) {
          item.status = 'reenvio_2_agendado'
          item.reenvio_2_data = agendadoParaIso
          item.reenvio_2_msg_id = novaMsg.id
        } else {
          item.status = 'pendente'
        }

        // Próximo envio se houver mais etapas
        let subsequente = null
        for (let nextIdx = 0; nextIdx < etapasAtivas.length; nextIdx++) {
          if (etapasAtivas[nextIdx].ordem > proximaEtapa.ordem) {
            subsequente = etapasAtivas[nextIdx]
            break
          }
        }
        if (subsequente) {
          const proxPrazoMs = (subsequente.dias_apos || 1) * 24 * 60 * 60 * 1000
          item.proximo_envio_data = new Date(agora.getTime() + proxPrazoMs).toISOString()
          item.proxima_etapa_nome = subsequente.nome
        } else {
          item.proximo_envio_data = undefined
          item.proxima_etapa_nome = undefined
        }

        loteModificado = true
        logs.push(
          `Lote ${lote.id}: Etapa "${proximaEtapa.nome}" agendada para ${item.nome} (${cleanPhone}) para ${agendadoParaIso}`,
        )
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
      reenvios_1_enviados: destinatarios.filter(
        (d) =>
          Boolean(d.reenvio_1_data) || (d.etapas_executadas && d.etapas_executadas.length >= 1),
      ).length,
      reenvios_2_enviados: destinatarios.filter(
        (d) =>
          Boolean(d.reenvio_2_data) || (d.etapas_executadas && d.etapas_executadas.length >= 2),
      ).length,
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
