// pocketbase/hooks/whatsapp_reenvio_massa.js
// Cron periódico e endpoints HTTP para reenvios em massa e follow-ups automáticos.
// Implementação 100% autocontida (sem funções top-level referenciadas em callbacks).

// ============================================================================
// REGISTRO DE CRON E ROTAS HTTP
// ============================================================================

cronAdd('whatsapp_reenvios_massa_worker', '*/10 * * * *', () => {
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
      console.log('[REENVIO MASSA] Erro ao carregar etapas do fluxo:', err)
      return []
    }
  }

  function carregarNomeFluxo(app, fluxoId) {
    if (!fluxoId) return ''
    try {
      const fRec = app.findRecordById('fluxos_follow_up', fluxoId)
      if (fRec) return fRec.getString('nome') || ''
    } catch (_) {}
    return ''
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

  function checarCondicaoSaida(app, item, dataDisparoMs) {
    if (item.marcacao_resposta === 'nao_perturbe' || item.status === 'nao_perturbe') {
      return {
        saiu: true,
        motivo: 'Marcação "Não Perturbe" ativada para o destinatário',
      }
    }

    const clienteId = item.cliente_id
    if (!clienteId || clienteId.startsWith('demo_')) {
      return { saiu: false }
    }

    try {
      const dataMinimaIso = new Date(dataDisparoMs).toISOString().replace('T', ' ')
      const filtroNegocio = `cliente_id = '${clienteId}' && (status = 'ganho' || etapa_funil = 'contrato assinado') && updated >= '${dataMinimaIso}'`
      const negociosFechados = app.findRecordsByFilter('negocios', filtroNegocio, '-updated', 1, 0)
      if (negociosFechados && negociosFechados.length > 0) {
        const neg = negociosFechados[0]
        const tituloNeg = neg.getString('titulo') || 'Negócio'
        return {
          saiu: true,
          motivo: `Negócio fechado/ganho: ${tituloNeg}`,
        }
      }
    } catch (errNeg) {
      console.log('[REENVIO MASSA] Erro ao checar negócios fechados:', errNeg)
    }

    try {
      const dataMinimaIso = new Date(dataDisparoMs).toISOString().replace('T', ' ')
      const filtroAtv = `cliente_id = '${clienteId}' && (status = 'agendada' || status = 'pendente') && created >= '${dataMinimaIso}'`
      const atividadesRecentes = app.findRecordsByFilter('atividades', filtroAtv, '-created', 1, 0)
      if (atividadesRecentes && atividadesRecentes.length > 0) {
        const atv = atividadesRecentes[0]
        const tituloAtv = atv.getString('titulo') || atv.getString('tipo') || 'Atividade'
        return {
          saiu: true,
          motivo: `Atividade agendada recente: ${tituloAtv}`,
        }
      }
    } catch (errAtv) {
      console.log('[REENVIO MASSA] Erro ao checar atividades agendadas:', errAtv)
    }

    return { saiu: false }
  }

  function processarReenviosDisparosMassa(app) {
    const agora = new Date()
    const agoraIso = agora.toISOString()
    const logs = []

    let lotesAtivos = []
    try {
      // Buscar TODOS os lotes ativos (mesmo com reenvio_ativo = false, pois respostas de clientes devem ser detectadas)
      lotesAtivos = app.findRecordsByFilter(
        'disparos_massa',
        "status = 'ativo'",
        '-created',
        100,
        0,
      )
    } catch (err) {
      console.log('[REENVIO MASSA] Erro ao buscar lotes ativos:', err)
      return { error: String(err), lotesProcessados: 0 }
    }

    if (!lotesAtivos || lotesAtivos.length === 0) {
      return { lotesProcessados: 0, mensagem: 'Nenhum lote ativo pendente' }
    }

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
      if (!lote) continue

      let destinatarios = []
      try {
        let rawDest = lote.get('destinatarios')
        if (typeof rawDest === 'string') {
          try {
            rawDest = JSON.parse(rawDest)
          } catch (_) {
            rawDest = []
          }
        }
        if (typeof rawDest === 'string') {
          try {
            rawDest = JSON.parse(rawDest)
          } catch (_) {
            rawDest = []
          }
        }
        destinatarios = Array.isArray(rawDest) ? rawDest : []
      } catch (_) {
        destinatarios = []
      }

      // Filtrar apenas destinatários que sejam de fato objetos válidos
      destinatarios = destinatarios.filter((d) => d && typeof d === 'object')

      if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
        continue
      }

      const fluxoInicialId = lote.getString('fluxo_id') || fluxoPadraoFallbackId
      const intervaloSegundos = Math.max(5, lote.getInt('intervalo_segundos') || 60)
      const intervalMs = intervaloSegundos * 1000

      const dataDisparoStr = lote.getString('data_disparo') || lote.getString('created')
      const dataDisparoMs = new Date(dataDisparoStr).getTime()

      let loteModificado = false
      let reenviosAgendadosLote = 0
      let agendamentoBaseMs = agora.getTime() + 10000

      for (let d = 0; d < destinatarios.length; d++) {
        const item = destinatarios[d]
        if (!item) continue

        const statusAtual = item.status || 'pendente'

        if (
          statusAtual === 'respondido' ||
          statusAtual === 'atendido' ||
          statusAtual === 'finalizado' ||
          statusAtual === 'bloqueado' ||
          statusAtual === 'sem_whatsapp' ||
          statusAtual === 'nao_perturbe' ||
          statusAtual === 'arquivado'
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

        if (
          telefonesBloqueados.has(telefoneLimpo) ||
          telefonesBloqueados.has(telefoneLimpo.replace(/^55/, ''))
        ) {
          item.status = 'bloqueado'
          item.motivo_saida = 'Contato bloqueado no WhatsApp'
          loteModificado = true
          continue
        }

        if (item.marcacao_resposta === 'nao_perturbe') {
          item.status = 'nao_perturbe'
          item.motivo_saida = 'Marcado manualmente como "Não Perturbe"'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        if (item.marcacao_resposta === 'respondeu' || item.marcacao_resposta === 'interessado') {
          item.status = 'respondido'
          item.respondido_em = item.marcacao_data || agoraIso
          item.motivo_saida =
            item.marcacao_resposta === 'interessado'
              ? 'Marcado manualmente: Cliente Interessado'
              : 'Marcado manualmente: Cliente Respondeu'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        const checagemSaida = checarCondicaoSaida(app, item, dataDisparoMs)
        if (checagemSaida.saiu) {
          item.status = 'finalizado'
          item.motivo_saida = checagemSaida.motivo || 'Condição de saída atendida'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        let houveResposta = false
        let respostaData = ''
        try {
          // Tolerância de 10 minutos antes do início do lote para capturar respostas imediatas
          const dataMinimaMs = Math.max(0, dataDisparoMs - 10 * 60 * 1000)
          const dataMinimaIso = new Date(dataMinimaMs).toISOString().replace('T', ' ')
          const variacoesTel = gerarVariacoesTelefone(telefoneLimpo)

          // 1. Detecção por cliente_id
          if (item.cliente_id && !item.cliente_id.startsWith('demo_')) {
            const filtroPorCli = `direcao = 'recebida' && created >= '${dataMinimaIso}' && cliente_id = '${item.cliente_id}'`
            const msgsCli = app.findRecordsByFilter(
              'whatsapp_mensagens',
              filtroPorCli,
              '-created',
              5,
              0,
            )
            if (msgsCli && msgsCli.length > 0) {
              houveResposta = true
              respostaData = msgsCli[0].getString('created')
            }
          }

          // 2. Detecção por telefone/número (mensagens recebidas com tipo_disparo manual sem referencia_id)
          if (!houveResposta && (telefoneLimpo.length >= 8 || variacoesTel.length > 0)) {
            const ult8 = telefoneLimpo.slice(-8)
            const filtroPorTel = `direcao = 'recebida' && created >= '${dataMinimaIso}' && telefone_destino ~ '${ult8}'`
            const msgsTel = app.findRecordsByFilter(
              'whatsapp_mensagens',
              filtroPorTel,
              '-created',
              20,
              0,
            )
            for (let m = 0; m < msgsTel.length; m++) {
              const msgT = msgsTel[m].getString('telefone_destino') || ''
              if (
                telefonesCasamBidirecional(msgT, telefoneLimpo) ||
                (ult8 && msgT.replace(/\D/g, '').endsWith(ult8))
              ) {
                houveResposta = true
                respostaData = msgsTel[m].getString('created')
                break
              }
            }
          }

          // 3. Detecção por conversa associada ao cliente ou telefone
          if (!houveResposta) {
            try {
              const filtroConv =
                item.cliente_id && !item.cliente_id.startsWith('demo_')
                  ? `cliente_id = '${item.cliente_id}' || numero ~ '${telefoneLimpo.slice(-8)}'`
                  : `numero ~ '${telefoneLimpo.slice(-8)}'`
              const convs = app.findRecordsByFilter(
                'whatsapp_conversas',
                filtroConv,
                '-updated',
                5,
                0,
              )
              for (let c = 0; c < convs.length; c++) {
                const convId = convs[c].id
                const msgsConv = app.findRecordsByFilter(
                  'whatsapp_mensagens',
                  `conversa_id = '${convId}' && direcao = 'recebida' && created >= '${dataMinimaIso}'`,
                  '-created',
                  1,
                  0,
                )
                if (msgsConv && msgsConv.length > 0) {
                  houveResposta = true
                  respostaData = msgsConv[0].getString('created')
                  break
                }
              }
            } catch (_) {}
          }
        } catch (errResp) {
          console.log('[REENVIO MASSA] Erro ao checar resposta do cliente:', errResp)
        }

        if (houveResposta) {
          item.status = 'respondido'
          item.respondido_em = respostaData || agoraIso
          item.motivo_saida = 'Cliente respondeu à mensagem no WhatsApp'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

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

        // Se a automação de reenvio deste lote estiver desativada, NÃO agendar novos envios (+3d/+90d),
        // mas o lote continua com destinatários e respostas perfeitamente rastreados.
        if (!lote.getBool('reenvio_ativo')) {
          continue
        }

        // Se a automação de reenvio deste lote estiver desativada, NÃO agendar novos envios (+3d/+90d),
        // mas o lote continua com destinatários e respostas perfeitamente rastreados.
        if (!lote.getBool('reenvio_ativo')) {
          continue
        }

        const fluxoAtualId = item.fluxo_atual_id || fluxoInicialId
        let etapasAtivas = carregarEtapasDoFluxo(app, fluxoAtualId)

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
              desvio_acao: 'nenhuma',
              desvio_dias: 0,
              desvio_fluxo_id: '',
            })
          }
          if (textoReenvio2) {
            etapasAtivas.push({
              id: 'etapa_compat_2',
              ordem: 2,
              nome: '2º Reenvio (+90d)',
              dias_apos: 90,
              mensagem: textoReenvio2,
              desvio_acao: 'nenhuma',
              desvio_dias: 0,
              desvio_fluxo_id: '',
            })
          }
        }

        if (etapasAtivas.length === 0) {
          item.status = 'finalizado'
          item.motivo_saida = 'Nenhuma etapa ativa configurada no fluxo'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        if (typeof item.etapas_executadas === 'string') {
          try {
            item.etapas_executadas = JSON.parse(item.etapas_executadas)
          } catch (_) {
            item.etapas_executadas = []
          }
        }
        if (!Array.isArray(item.etapas_executadas)) {
          item.etapas_executadas = []
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
        item.etapas_executadas = item.etapas_executadas.filter((e) => e && typeof e === 'object')

        if (typeof item.trilha === 'string') {
          try {
            item.trilha = JSON.parse(item.trilha)
          } catch (_) {
            item.trilha = []
          }
        }
        if (!Array.isArray(item.trilha)) {
          item.trilha = []
          const nomeOrigem = carregarNomeFluxo(app, fluxoInicialId) || 'Fluxo Inicial'
          item.trilha.push({
            fluxo_id: fluxoInicialId,
            fluxo_nome: nomeOrigem,
            motivo: 'Entrada inicial no disparo em massa',
            data: item.data_envio_inicial || dataDisparoStr,
          })
        }
        item.trilha = item.trilha.filter((t) => t && typeof t === 'object')

        let ultimaExecucaoFluxoAtual = null
        for (let ex = item.etapas_executadas.length - 1; ex >= 0; ex--) {
          const eExec = item.etapas_executadas[ex]
          if (eExec && (!eExec.fluxo_id || eExec.fluxo_id === fluxoAtualId)) {
            ultimaExecucaoFluxoAtual = eExec
            break
          }
        }

        let ultimaOrdemExecutada = 0
        let dataUltimoEnvioMs = dataDisparoMs
        let ultimaEtapaObj = null

        if (ultimaExecucaoFluxoAtual) {
          ultimaOrdemExecutada = ultimaExecucaoFluxoAtual.ordem
          if (ultimaExecucaoFluxoAtual.enviado_em) {
            dataUltimoEnvioMs = new Date(ultimaExecucaoFluxoAtual.enviado_em).getTime()
          }
          if (ultimaExecucaoFluxoAtual.etapa_id) {
            ultimaEtapaObj = etapasAtivas.find((e) => e.id === ultimaExecucaoFluxoAtual.etapa_id)
          }
        } else if (item.etapas_executadas.length > 0) {
          const ultimaGeral = item.etapas_executadas[item.etapas_executadas.length - 1]
          if (ultimaGeral.enviado_em) {
            dataUltimoEnvioMs = new Date(ultimaGeral.enviado_em).getTime()
          }
        } else if (item.reenvio_2_data) {
          ultimaOrdemExecutada = 2
          dataUltimoEnvioMs = new Date(item.reenvio_2_data).getTime()
        } else if (item.reenvio_1_data) {
          ultimaOrdemExecutada = 1
          dataUltimoEnvioMs = new Date(item.reenvio_1_data).getTime()
        }

        if (
          ultimaEtapaObj &&
          ultimaEtapaObj.desvio_acao &&
          ultimaEtapaObj.desvio_acao !== 'nenhuma' &&
          ultimaEtapaObj.desvio_dias > 0 &&
          (!item.marcacao_resposta || item.marcacao_resposta === 'sem_resposta')
        ) {
          const timeoutMs = ultimaEtapaObj.desvio_dias * 24 * 60 * 60 * 1000
          const tempoDecorridoMs = agora.getTime() - dataUltimoEnvioMs

          if (tempoDecorridoMs >= timeoutMs) {
            if (ultimaEtapaObj.desvio_acao === 'arquivar') {
              item.status = 'arquivado'
              item.motivo_saida = `Desvio da etapa "${ultimaEtapaObj.nome}": arquivado por ausência de resposta após ${ultimaEtapaObj.desvio_dias} dia(s)`
              item.proximo_envio_data = undefined
              item.proxima_etapa_nome = undefined
              loteModificado = true

              item.trilha.push({
                fluxo_id: fluxoAtualId,
                fluxo_nome: carregarNomeFluxo(app, fluxoAtualId),
                etapa_id: ultimaEtapaObj.id,
                etapa_nome: ultimaEtapaObj.nome,
                motivo: `Desvio sem resposta em ${ultimaEtapaObj.desvio_dias}d → Arquivado`,
                data: agoraIso,
              })
              continue
            }

            if (
              ultimaEtapaObj.desvio_acao === 'fluxo_alternativo' &&
              ultimaEtapaObj.desvio_fluxo_id &&
              ultimaEtapaObj.desvio_fluxo_id !== fluxoAtualId
            ) {
              const novoFluxoId = ultimaEtapaObj.desvio_fluxo_id
              const nomeNovoFluxo = carregarNomeFluxo(app, novoFluxoId) || 'Fluxo Alternativo'

              const trilhaArr = Array.isArray(item.trilha) ? item.trilha : []
              const vezesPassou = trilhaArr.filter((t) => t && t.fluxo_id === novoFluxoId).length
              if (vezesPassou >= 2) {
                item.status = 'finalizado'
                item.motivo_saida = `Encerrado para prevenir ciclo circular no fluxo "${nomeNovoFluxo}"`
                item.proximo_envio_data = undefined
                loteModificado = true
                continue
              }

              item.fluxo_atual_id = novoFluxoId
              item.fluxo_origem_id = fluxoAtualId
              item.fluxo_origem_nome = carregarNomeFluxo(app, fluxoAtualId)
              item.desvio_motivo = `Sem resposta após ${ultimaEtapaObj.desvio_dias}d na etapa "${ultimaEtapaObj.nome}"`

              item.trilha.push({
                fluxo_id: novoFluxoId,
                fluxo_nome: nomeNovoFluxo,
                fluxo_anterior_id: fluxoAtualId,
                fluxo_anterior_nome: item.fluxo_origem_nome,
                etapa_origem_id: ultimaEtapaObj.id,
                etapa_origem_nome: ultimaEtapaObj.nome,
                motivo: `Desvio sem resposta após ${ultimaEtapaObj.desvio_dias}d → Entrou em "${nomeNovoFluxo}"`,
                data: agoraIso,
              })

              etapasAtivas = carregarEtapasDoFluxo(app, novoFluxoId)
              ultimaOrdemExecutada = 0
              loteModificado = true
              logs.push(
                `Lote ${lote.id}: Destinatário ${item.nome} desviado do fluxo ${fluxoAtualId} para ${novoFluxoId} ("${nomeNovoFluxo}")`,
              )
            }
          }
        }

        let proximaEtapa = null
        for (let ep = 0; ep < etapasAtivas.length; ep++) {
          if (etapasAtivas[ep].ordem > ultimaOrdemExecutada) {
            proximaEtapa = etapasAtivas[ep]
            break
          }
        }

        if (!proximaEtapa) {
          item.status = 'finalizado'
          item.motivo_saida = 'Todas as etapas do fluxo foram executadas sem resposta'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        const diasApos =
          typeof proximaEtapa.dias_apos === 'number'
            ? Math.max(0, proximaEtapa.dias_apos)
            : proximaEtapa.ordem === 1
              ? 3
              : 90
        const prazoMs = diasApos * 24 * 60 * 60 * 1000
        const tempoDecorridoMs = agora.getTime() - dataUltimoEnvioMs

        if (tempoDecorridoMs < prazoMs) {
          const faltamMs = prazoMs - tempoDecorridoMs
          item.proximo_envio_data = new Date(agora.getTime() + faltamMs).toISOString()
          item.proxima_etapa_nome = proximaEtapa.nome
          continue
        }

        let textoFinal = proximaEtapa.mensagem || ''
        textoFinal = textoFinal.replace(/\[nome do cliente\]/gi, item.nome || 'Cliente')
        textoFinal = textoFinal.replace(/\[nome da empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\[empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\{\{nome_cliente\}\}/g, item.nome || 'Cliente')

        if (!textoFinal.trim()) {
          console.log(
            `[REENVIO MASSA] Aviso: Etapa ${proximaEtapa.ordem} do lote ${lote.id} sem texto. Pulando para próxima.`,
          )
          continue
        }

        let cleanPhone = telefoneLimpo
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }

        const agendadoParaIso = new Date(agendamentoBaseMs).toISOString()
        agendamentoBaseMs += intervalMs
        reenviosAgendadosLote++
        totalReenviosAgendados++

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
          `lote_${lote.id}_f${fluxoAtualId}_e${proximaEtapa.ordem}_${item.cliente_id || cleanPhone}`,
        )
        app.save(novaMsg)

        item.etapas_executadas.push({
          ordem: proximaEtapa.ordem,
          etapa_id: proximaEtapa.id,
          fluxo_id: fluxoAtualId,
          nome: proximaEtapa.nome,
          enviado_em: agendadoParaIso,
          mensagem_id: novaMsg.id,
        })

        item.etapa_atual_ordem = proximaEtapa.ordem
        item.etapa_atual_nome = proximaEtapa.nome

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

        let subsequente = null
        for (let nextIdx = 0; nextIdx < etapasAtivas.length; nextIdx++) {
          if (etapasAtivas[nextIdx].ordem > proximaEtapa.ordem) {
            subsequente = etapasAtivas[nextIdx]
            break
          }
        }
        if (subsequente) {
          const proxPrazoDias = Math.max(
            1,
            typeof subsequente.dias_apos === 'number' ? subsequente.dias_apos : 1,
          )
          const proxPrazoMs = proxPrazoDias * 24 * 60 * 60 * 1000
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

      // ESTATÍSTICAS DO LOTE ATUAL — DENTRO DO LOOP DE LOTES
      const stats = {
        total: Array.isArray(destinatarios) ? destinatarios.length : 0,
        pendentes: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) =>
            d &&
            (d.status === 'pendente' ||
              d.status === 'reenvio_1_agendado' ||
              d.status === 'reenvio_2_agendado'),
        ).length,
        respondidos: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) => d && d.status === 'respondido',
        ).length,
        atendidos: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) => d && d.status === 'atendido',
        ).length,
        bloqueados: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) => d && (d.status === 'bloqueado' || d.status === 'sem_whatsapp'),
        ).length,
        finalizados: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) =>
            d &&
            (d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe'),
        ).length,
        reenvios_1_enviados: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) =>
            d &&
            (Boolean(d.reenvio_1_data) ||
              (Array.isArray(d.etapas_executadas) && d.etapas_executadas.length >= 1)),
        ).length,
        reenvios_2_enviados: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) =>
            d &&
            (Boolean(d.reenvio_2_data) ||
              (Array.isArray(d.etapas_executadas) && d.etapas_executadas.length >= 2)),
        ).length,
        ultima_verificacao: agoraIso,
      }

      const todosFinalizados = stats.pendentes === 0

      // Garantir que as estatísticas do lote (incl. ultima_verificacao) sejam salvas a cada passada, mesmo sem mudanças
      lote.set('destinatarios', destinatarios)
      lote.set('estatisticas', stats)
      if (todosFinalizados) {
        lote.set('status', 'concluido')
      }
      try {
        app.save(lote)
        console.log(
          `[REENVIO MASSA CRON] Lote ${lote.id} ("${lote.getString('titulo')}"): ${stats.pendentes} pendente(s), ${stats.respondidos} respondido(s), ${stats.atendidos} atendido(s), ${stats.finalizados} finalizado(s). Modificado: ${loteModificado}`,
        )
      } catch (errSaveLote) {
        console.log(
          `[REENVIO MASSA CRON] Erro ao salvar estatísticas do lote ${lote.id}:`,
          errSaveLote,
        )
      }
    }
  }

  try {
    const res = processarReenviosDisparosMassa($app)
    if (res && res.reenviosAgendados > 0) {
      console.log(
        `[REENVIO MASSA CRON] Executado com sucesso: ${res.reenviosAgendados} reenvio(s) agendado(s).`,
      )
    }
  } catch (err) {
    console.log('[REENVIO MASSA CRON] Erro no worker:', err)
  }
})

routerAdd('POST', '/backend/v1/delfos/processar-reenvios-massa', (c) => {
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
      console.log('[REENVIO MASSA] Erro ao carregar etapas do fluxo:', err)
      return []
    }
  }

  function carregarNomeFluxo(app, fluxoId) {
    if (!fluxoId) return ''
    try {
      const fRec = app.findRecordById('fluxos_follow_up', fluxoId)
      if (fRec) return fRec.getString('nome') || ''
    } catch (_) {}
    return ''
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

  function checarCondicaoSaida(app, item, dataDisparoMs) {
    if (item.marcacao_resposta === 'nao_perturbe' || item.status === 'nao_perturbe') {
      return {
        saiu: true,
        motivo: 'Marcação "Não Perturbe" ativada para o destinatário',
      }
    }

    const clienteId = item.cliente_id
    if (!clienteId || clienteId.startsWith('demo_')) {
      return { saiu: false }
    }

    try {
      const dataMinimaIso = new Date(dataDisparoMs).toISOString().replace('T', ' ')
      const filtroNegocio = `cliente_id = '${clienteId}' && (status = 'ganho' || etapa_funil = 'contrato assinado') && updated >= '${dataMinimaIso}'`
      const negociosFechados = app.findRecordsByFilter('negocios', filtroNegocio, '-updated', 1, 0)
      if (negociosFechados && negociosFechados.length > 0) {
        const neg = negociosFechados[0]
        const tituloNeg = neg.getString('titulo') || 'Negócio'
        return {
          saiu: true,
          motivo: `Negócio fechado/ganho: ${tituloNeg}`,
        }
      }
    } catch (errNeg) {
      console.log('[REENVIO MASSA] Erro ao checar negócios fechados:', errNeg)
    }

    try {
      const dataMinimaIso = new Date(dataDisparoMs).toISOString().replace('T', ' ')
      const filtroAtv = `cliente_id = '${clienteId}' && (status = 'agendada' || status = 'pendente') && created >= '${dataMinimaIso}'`
      const atividadesRecentes = app.findRecordsByFilter('atividades', filtroAtv, '-created', 1, 0)
      if (atividadesRecentes && atividadesRecentes.length > 0) {
        const atv = atividadesRecentes[0]
        const tituloAtv = atv.getString('titulo') || atv.getString('tipo') || 'Atividade'
        return {
          saiu: true,
          motivo: `Atividade agendada recente: ${tituloAtv}`,
        }
      }
    } catch (errAtv) {
      console.log('[REENVIO MASSA] Erro ao checar atividades agendadas:', errAtv)
    }

    return { saiu: false }
  }

  function processarReenviosDisparosMassa(app) {
    const agora = new Date()
    const agoraIso = agora.toISOString()
    const logs = []

    let lotesAtivos = []
    try {
      // Buscar TODOS os lotes ativos (mesmo com reenvio_ativo = false, pois respostas de clientes devem ser detectadas)
      lotesAtivos = app.findRecordsByFilter(
        'disparos_massa',
        "status = 'ativo'",
        '-created',
        100,
        0,
      )
    } catch (err) {
      console.log('[REENVIO MASSA] Erro ao buscar lotes ativos:', err)
      return { error: String(err), lotesProcessados: 0 }
    }

    if (!lotesAtivos || lotesAtivos.length === 0) {
      return { lotesProcessados: 0, mensagem: 'Nenhum lote ativo pendente' }
    }

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
      if (!lote) continue

      let destinatarios = []
      try {
        let rawDest = lote.get('destinatarios')
        if (typeof rawDest === 'string') {
          try {
            rawDest = JSON.parse(rawDest)
          } catch (_) {
            rawDest = []
          }
        }
        if (typeof rawDest === 'string') {
          try {
            rawDest = JSON.parse(rawDest)
          } catch (_) {
            rawDest = []
          }
        }
        destinatarios = Array.isArray(rawDest) ? rawDest : []
      } catch (_) {
        destinatarios = []
      }

      destinatarios = destinatarios.filter((d) => d && typeof d === 'object')

      if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
        continue
      }

      const fluxoInicialId = lote.getString('fluxo_id') || fluxoPadraoFallbackId
      const intervaloSegundos = Math.max(5, lote.getInt('intervalo_segundos') || 60)
      const intervalMs = intervaloSegundos * 1000

      const dataDisparoStr = lote.getString('data_disparo') || lote.getString('created')
      const dataDisparoMs = new Date(dataDisparoStr).getTime()

      let loteModificado = false
      let reenviosAgendadosLote = 0
      let agendamentoBaseMs = agora.getTime() + 10000

      for (let d = 0; d < destinatarios.length; d++) {
        const item = destinatarios[d]
        if (!item) continue

        const statusAtual = item.status || 'pendente'

        if (
          statusAtual === 'respondido' ||
          statusAtual === 'atendido' ||
          statusAtual === 'finalizado' ||
          statusAtual === 'bloqueado' ||
          statusAtual === 'sem_whatsapp' ||
          statusAtual === 'nao_perturbe' ||
          statusAtual === 'arquivado'
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

        if (
          telefonesBloqueados.has(telefoneLimpo) ||
          telefonesBloqueados.has(telefoneLimpo.replace(/^55/, ''))
        ) {
          item.status = 'bloqueado'
          item.motivo_saida = 'Contato bloqueado no WhatsApp'
          loteModificado = true
          continue
        }

        if (item.marcacao_resposta === 'nao_perturbe') {
          item.status = 'nao_perturbe'
          item.motivo_saida = 'Marcado manualmente como "Não Perturbe"'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        if (item.marcacao_resposta === 'respondeu' || item.marcacao_resposta === 'interessado') {
          item.status = 'respondido'
          item.respondido_em = item.marcacao_data || agoraIso
          item.motivo_saida =
            item.marcacao_resposta === 'interessado'
              ? 'Marcado manualmente: Cliente Interessado'
              : 'Marcado manualmente: Cliente Respondeu'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        const checagemSaida = checarCondicaoSaida(app, item, dataDisparoMs)
        if (checagemSaida.saiu) {
          item.status = 'finalizado'
          item.motivo_saida = checagemSaida.motivo || 'Condição de saída atendida'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        let houveResposta = false
        let respostaData = ''
        try {
          // Tolerância de 10 minutos antes do início do lote para capturar respostas imediatas
          const dataMinimaMs = Math.max(0, dataDisparoMs - 10 * 60 * 1000)
          const dataMinimaIso = new Date(dataMinimaMs).toISOString().replace('T', ' ')
          const variacoesTel = gerarVariacoesTelefone(telefoneLimpo)

          // 1. Detecção por cliente_id
          if (item.cliente_id && !item.cliente_id.startsWith('demo_')) {
            const filtroPorCli = `direcao = 'recebida' && created >= '${dataMinimaIso}' && cliente_id = '${item.cliente_id}'`
            const msgsCli = app.findRecordsByFilter(
              'whatsapp_mensagens',
              filtroPorCli,
              '-created',
              5,
              0,
            )
            if (msgsCli && msgsCli.length > 0) {
              houveResposta = true
              respostaData = msgsCli[0].getString('created')
            }
          }

          // 2. Detecção por telefone/número (mensagens recebidas com tipo_disparo manual sem referencia_id)
          if (!houveResposta && (telefoneLimpo.length >= 8 || variacoesTel.length > 0)) {
            const ult8 = telefoneLimpo.slice(-8)
            const filtroPorTel = `direcao = 'recebida' && created >= '${dataMinimaIso}' && telefone_destino ~ '${ult8}'`
            const msgsTel = app.findRecordsByFilter(
              'whatsapp_mensagens',
              filtroPorTel,
              '-created',
              20,
              0,
            )
            for (let m = 0; m < msgsTel.length; m++) {
              const msgT = msgsTel[m].getString('telefone_destino') || ''
              if (
                telefonesCasamBidirecional(msgT, telefoneLimpo) ||
                (ult8 && msgT.replace(/\D/g, '').endsWith(ult8))
              ) {
                houveResposta = true
                respostaData = msgsTel[m].getString('created')
                break
              }
            }
          }

          // 3. Detecção por conversa associada ao cliente ou telefone
          if (!houveResposta) {
            try {
              const filtroConv =
                item.cliente_id && !item.cliente_id.startsWith('demo_')
                  ? `cliente_id = '${item.cliente_id}' || numero ~ '${telefoneLimpo.slice(-8)}'`
                  : `numero ~ '${telefoneLimpo.slice(-8)}'`
              const convs = app.findRecordsByFilter(
                'whatsapp_conversas',
                filtroConv,
                '-updated',
                5,
                0,
              )
              for (let c = 0; c < convs.length; c++) {
                const convId = convs[c].id
                const msgsConv = app.findRecordsByFilter(
                  'whatsapp_mensagens',
                  `conversa_id = '${convId}' && direcao = 'recebida' && created >= '${dataMinimaIso}'`,
                  '-created',
                  1,
                  0,
                )
                if (msgsConv && msgsConv.length > 0) {
                  houveResposta = true
                  respostaData = msgsConv[0].getString('created')
                  break
                }
              }
            } catch (_) {}
          }
        } catch (errResp) {
          console.log('[REENVIO MASSA] Erro ao checar resposta do cliente:', errResp)
        }

        if (houveResposta) {
          item.status = 'respondido'
          item.respondido_em = respostaData || agoraIso
          item.motivo_saida = 'Cliente respondeu à mensagem no WhatsApp'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

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

        const fluxoAtualId = item.fluxo_atual_id || fluxoInicialId
        let etapasAtivas = carregarEtapasDoFluxo(app, fluxoAtualId)

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
              desvio_acao: 'nenhuma',
              desvio_dias: 0,
              desvio_fluxo_id: '',
            })
          }
          if (textoReenvio2) {
            etapasAtivas.push({
              id: 'etapa_compat_2',
              ordem: 2,
              nome: '2º Reenvio (+90d)',
              dias_apos: 90,
              mensagem: textoReenvio2,
              desvio_acao: 'nenhuma',
              desvio_dias: 0,
              desvio_fluxo_id: '',
            })
          }
        }

        if (etapasAtivas.length === 0) {
          item.status = 'finalizado'
          item.motivo_saida = 'Nenhuma etapa ativa configurada no fluxo'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        if (typeof item.etapas_executadas === 'string') {
          try {
            item.etapas_executadas = JSON.parse(item.etapas_executadas)
          } catch (_) {
            item.etapas_executadas = []
          }
        }
        if (!Array.isArray(item.etapas_executadas)) {
          item.etapas_executadas = []
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
        item.etapas_executadas = item.etapas_executadas.filter((e) => e && typeof e === 'object')

        if (typeof item.trilha === 'string') {
          try {
            item.trilha = JSON.parse(item.trilha)
          } catch (_) {
            item.trilha = []
          }
        }
        if (!Array.isArray(item.trilha)) {
          item.trilha = []
          const nomeOrigem = carregarNomeFluxo(app, fluxoInicialId) || 'Fluxo Inicial'
          item.trilha.push({
            fluxo_id: fluxoInicialId,
            fluxo_nome: nomeOrigem,
            motivo: 'Entrada inicial no disparo em massa',
            data: item.data_envio_inicial || dataDisparoStr,
          })
        }
        item.trilha = item.trilha.filter((t) => t && typeof t === 'object')

        let ultimaExecucaoFluxoAtual = null
        for (let ex = item.etapas_executadas.length - 1; ex >= 0; ex--) {
          const eExec = item.etapas_executadas[ex]
          if (eExec && (!eExec.fluxo_id || eExec.fluxo_id === fluxoAtualId)) {
            ultimaExecucaoFluxoAtual = eExec
            break
          }
        }

        let ultimaOrdemExecutada = 0
        let dataUltimoEnvioMs = dataDisparoMs
        let ultimaEtapaObj = null

        if (ultimaExecucaoFluxoAtual) {
          ultimaOrdemExecutada = ultimaExecucaoFluxoAtual.ordem
          if (ultimaExecucaoFluxoAtual.enviado_em) {
            dataUltimoEnvioMs = new Date(ultimaExecucaoFluxoAtual.enviado_em).getTime()
          }
          if (ultimaExecucaoFluxoAtual.etapa_id) {
            ultimaEtapaObj = etapasAtivas.find((e) => e.id === ultimaExecucaoFluxoAtual.etapa_id)
          }
        } else if (item.etapas_executadas.length > 0) {
          const ultimaGeral = item.etapas_executadas[item.etapas_executadas.length - 1]
          if (ultimaGeral.enviado_em) {
            dataUltimoEnvioMs = new Date(ultimaGeral.enviado_em).getTime()
          }
        } else if (item.reenvio_2_data) {
          ultimaOrdemExecutada = 2
          dataUltimoEnvioMs = new Date(item.reenvio_2_data).getTime()
        } else if (item.reenvio_1_data) {
          ultimaOrdemExecutada = 1
          dataUltimoEnvioMs = new Date(item.reenvio_1_data).getTime()
        }

        if (
          ultimaEtapaObj &&
          ultimaEtapaObj.desvio_acao &&
          ultimaEtapaObj.desvio_acao !== 'nenhuma' &&
          ultimaEtapaObj.desvio_dias > 0 &&
          (!item.marcacao_resposta || item.marcacao_resposta === 'sem_resposta')
        ) {
          const timeoutMs = ultimaEtapaObj.desvio_dias * 24 * 60 * 60 * 1000
          const tempoDecorridoMs = agora.getTime() - dataUltimoEnvioMs

          if (tempoDecorridoMs >= timeoutMs) {
            if (ultimaEtapaObj.desvio_acao === 'arquivar') {
              item.status = 'arquivado'
              item.motivo_saida = `Desvio da etapa "${ultimaEtapaObj.nome}": arquivado por ausência de resposta após ${ultimaEtapaObj.desvio_dias} dia(s)`
              item.proximo_envio_data = undefined
              item.proxima_etapa_nome = undefined
              loteModificado = true

              item.trilha.push({
                fluxo_id: fluxoAtualId,
                fluxo_nome: carregarNomeFluxo(app, fluxoAtualId),
                etapa_id: ultimaEtapaObj.id,
                etapa_nome: ultimaEtapaObj.nome,
                motivo: `Desvio sem resposta em ${ultimaEtapaObj.desvio_dias}d → Arquivado`,
                data: agoraIso,
              })
              continue
            }

            if (
              ultimaEtapaObj.desvio_acao === 'fluxo_alternativo' &&
              ultimaEtapaObj.desvio_fluxo_id &&
              ultimaEtapaObj.desvio_fluxo_id !== fluxoAtualId
            ) {
              const novoFluxoId = ultimaEtapaObj.desvio_fluxo_id
              const nomeNovoFluxo = carregarNomeFluxo(app, novoFluxoId) || 'Fluxo Alternativo'

              const trilhaArr = Array.isArray(item.trilha) ? item.trilha : []
              const vezesPassou = trilhaArr.filter((t) => t && t.fluxo_id === novoFluxoId).length
              if (vezesPassou >= 2) {
                item.status = 'finalizado'
                item.motivo_saida = `Encerrado para prevenir ciclo circular no fluxo "${nomeNovoFluxo}"`
                item.proximo_envio_data = undefined
                loteModificado = true
                continue
              }

              item.fluxo_atual_id = novoFluxoId
              item.fluxo_origem_id = fluxoAtualId
              item.fluxo_origem_nome = carregarNomeFluxo(app, fluxoAtualId)
              item.desvio_motivo = `Sem resposta após ${ultimaEtapaObj.desvio_dias}d na etapa "${ultimaEtapaObj.nome}"`

              item.trilha.push({
                fluxo_id: novoFluxoId,
                fluxo_nome: nomeNovoFluxo,
                fluxo_anterior_id: fluxoAtualId,
                fluxo_anterior_nome: item.fluxo_origem_nome,
                etapa_origem_id: ultimaEtapaObj.id,
                etapa_origem_nome: ultimaEtapaObj.nome,
                motivo: `Desvio sem resposta após ${ultimaEtapaObj.desvio_dias}d → Entrou em "${nomeNovoFluxo}"`,
                data: agoraIso,
              })

              etapasAtivas = carregarEtapasDoFluxo(app, novoFluxoId)
              ultimaOrdemExecutada = 0
              loteModificado = true
              logs.push(
                `Lote ${lote.id}: Destinatário ${item.nome} desviado do fluxo ${fluxoAtualId} para ${novoFluxoId} ("${nomeNovoFluxo}")`,
              )
            }
          }
        }

        let proximaEtapa = null
        for (let ep = 0; ep < etapasAtivas.length; ep++) {
          if (etapasAtivas[ep].ordem > ultimaOrdemExecutada) {
            proximaEtapa = etapasAtivas[ep]
            break
          }
        }

        if (!proximaEtapa) {
          item.status = 'finalizado'
          item.motivo_saida = 'Todas as etapas do fluxo foram executadas sem resposta'
          item.proximo_envio_data = undefined
          loteModificado = true
          continue
        }

        const diasApos =
          typeof proximaEtapa.dias_apos === 'number'
            ? Math.max(0, proximaEtapa.dias_apos)
            : proximaEtapa.ordem === 1
              ? 3
              : 90
        const prazoMs = diasApos * 24 * 60 * 60 * 1000
        const tempoDecorridoMs = agora.getTime() - dataUltimoEnvioMs

        if (tempoDecorridoMs < prazoMs) {
          const faltamMs = prazoMs - tempoDecorridoMs
          item.proximo_envio_data = new Date(agora.getTime() + faltamMs).toISOString()
          item.proxima_etapa_nome = proximaEtapa.nome
          continue
        }

        let textoFinal = proximaEtapa.mensagem || ''
        textoFinal = textoFinal.replace(/\[nome do cliente\]/gi, item.nome || 'Cliente')
        textoFinal = textoFinal.replace(/\[nome da empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\[empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\{\{nome_cliente\}\}/g, item.nome || 'Cliente')

        if (!textoFinal.trim()) {
          console.log(
            `[REENVIO MASSA] Aviso: Etapa ${proximaEtapa.ordem} do lote ${lote.id} sem texto. Pulando para próxima.`,
          )
          continue
        }

        let cleanPhone = telefoneLimpo
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }

        const agendadoParaIso = new Date(agendamentoBaseMs).toISOString()
        agendamentoBaseMs += intervalMs
        reenviosAgendadosLote++
        totalReenviosAgendados++

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
          `lote_${lote.id}_f${fluxoAtualId}_e${proximaEtapa.ordem}_${item.cliente_id || cleanPhone}`,
        )
        app.save(novaMsg)

        item.etapas_executadas.push({
          ordem: proximaEtapa.ordem,
          etapa_id: proximaEtapa.id,
          fluxo_id: fluxoAtualId,
          nome: proximaEtapa.nome,
          enviado_em: agendadoParaIso,
          mensagem_id: novaMsg.id,
        })

        item.etapa_atual_ordem = proximaEtapa.ordem
        item.etapa_atual_nome = proximaEtapa.nome

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

        let subsequente = null
        for (let nextIdx = 0; nextIdx < etapasAtivas.length; nextIdx++) {
          if (etapasAtivas[nextIdx].ordem > proximaEtapa.ordem) {
            subsequente = etapasAtivas[nextIdx]
            break
          }
        }
        if (subsequente) {
          const proxPrazoDias = Math.max(
            1,
            typeof subsequente.dias_apos === 'number' ? subsequente.dias_apos : 1,
          )
          const proxPrazoMs = proxPrazoDias * 24 * 60 * 60 * 1000
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

      const stats = {
        total: Array.isArray(destinatarios) ? destinatarios.length : 0,
        pendentes: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) =>
            d &&
            (d.status === 'pendente' ||
              d.status === 'reenvio_1_agendado' ||
              d.status === 'reenvio_2_agendado'),
        ).length,
        respondidos: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) => d && d.status === 'respondido',
        ).length,
        atendidos: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) => d && d.status === 'atendido',
        ).length,
        bloqueados: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) => d && (d.status === 'bloqueado' || d.status === 'sem_whatsapp'),
        ).length,
        finalizados: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) =>
            d &&
            (d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe'),
        ).length,
        reenvios_1_enviados: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) =>
            d &&
            (Boolean(d.reenvio_1_data) ||
              (Array.isArray(d.etapas_executadas) && d.etapas_executadas.length >= 1)),
        ).length,
        reenvios_2_enviados: (Array.isArray(destinatarios) ? destinatarios : []).filter(
          (d) =>
            d &&
            (Boolean(d.reenvio_2_data) ||
              (Array.isArray(d.etapas_executadas) && d.etapas_executadas.length >= 2)),
        ).length,
        ultima_verificacao: agoraIso,
      }

      const todosFinalizados = stats.pendentes === 0

      // Garantir que as estatísticas do lote (incl. ultima_verificacao) sejam salvas a cada passada, mesmo sem mudanças
      lote.set('destinatarios', destinatarios)
      lote.set('estatisticas', stats)
      if (todosFinalizados) {
        lote.set('status', 'concluido')
      }
      try {
        app.save(lote)
        console.log(
          `[REENVIO MASSA ROTA] Lote ${lote.id} ("${lote.getString('titulo')}"): ${stats.pendentes} pendente(s), ${stats.respondidos} respondido(s), ${stats.atendidos} atendido(s), ${stats.finalizados} finalizado(s). Modificado: ${loteModificado}`,
        )
      } catch (errSaveLote) {
        console.log(
          `[REENVIO MASSA ROTA] Erro ao salvar estatísticas do lote ${lote.id}:`,
          errSaveLote,
        )
      }
    }

    return {
      lotesProcessados: lotesAtivos.length,
      reenviosAgendados: totalReenviosAgendados,
      logs,
    }
  }

  try {
    const authRecord = c.auth
    if (!authRecord) {
      return c.json(401, { error: 'Autenticação necessária' })
    }

    const resultado = processarReenviosDisparosMassa($app)
    return c.json(200, {
      success: true,
      resultado,
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: String(err && err.message ? err.message : err),
    })
  }
})

/**
 * Endpoint para mover manualmente clientes para um fluxo de follow-up a partir do painel
 * POST /backend/v1/delfos/mover-para-fluxo
 * Body: { cliente_ids: string[] | string, fluxo_id: string }
 */
routerAdd('POST', '/backend/v1/delfos/mover-para-fluxo', (c) => {
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
      console.log('[REENVIO MASSA] Erro ao carregar etapas do fluxo:', err)
      return []
    }
  }

  function moverClienteParaFluxoManual(app, params) {
    const clienteId = params.clienteId || ''
    const fluxoId = params.fluxoId || ''
    const operadorNome = params.operadorNome || 'operador'
    const agora = new Date()
    const agoraIso = agora.toISOString()

    if (!clienteId || clienteId.startsWith('demo_')) {
      return { sucesso: false, motivo: 'Cliente inválido' }
    }

    if (!fluxoId) {
      return { sucesso: false, motivo: 'Fluxo não informado' }
    }

    let clienteRec = null
    try {
      clienteRec = app.findRecordById('clientes', clienteId)
    } catch (_) {}

    if (!clienteRec) {
      return { sucesso: false, motivo: 'Cliente não encontrado' }
    }

    const clienteNome = clienteRec.getString('nome') || 'Cliente'
    const telBruto = clienteRec.getString('whatsapp') || clienteRec.getString('telefone') || ''
    const telefoneLimpo = telBruto.replace(/\D/g, '')

    if (!telefoneLimpo || telefoneLimpo.length < 10) {
      return { sucesso: false, motivo: 'Cliente sem telefone/WhatsApp válido' }
    }

    let fluxoRec = null
    try {
      fluxoRec = app.findRecordById('fluxos_follow_up', fluxoId)
    } catch (_) {}

    if (!fluxoRec || !fluxoRec.getBool('ativo')) {
      return { sucesso: false, motivo: 'Fluxo inexistente ou inativo' }
    }

    const fluxoNome = fluxoRec.getString('nome') || 'Fluxo Follow-up'

    let jaAtivoNesseFluxo = false
    try {
      const lotesDoFluxo = app.findRecordsByFilter(
        'disparos_massa',
        `fluxo_id = '${fluxoId}' && status = 'ativo'`,
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
      console.log('[MOVER MANUAL FLUXO] Erro ao checar idempotência do lote:', errCheck)
    }

    if (jaAtivoNesseFluxo) {
      return {
        sucesso: false,
        jaAtivo: true,
        motivo: `O cliente "${clienteNome}" já está em acompanhamento ativo no fluxo "${fluxoNome}".`,
      }
    }

    const etapas = carregarEtapasDoFluxo(app, fluxoId)
    const primeiraEtapa = etapas.length > 0 ? etapas[0] : null
    const isImediata = primeiraEtapa && primeiraEtapa.dias_apos === 0
    const prazoDias = primeiraEtapa
      ? primeiraEtapa.dias_apos === 0
        ? 0
        : Math.max(1, primeiraEtapa.dias_apos || 1)
      : 3
    const dataPrevistaIso = new Date(
      agora.getTime() + prazoDias * 24 * 60 * 60 * 1000,
    ).toISOString()

    const dataFormatadaTrilha = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const novoDestinatario = {
      cliente_id: clienteId,
      nome: clienteNome,
      telefone: telefoneLimpo,
      status: 'pendente',
      origem_entrada: 'movimento_manual',
      data_envio_inicial: agoraIso,
      fluxo_atual_id: fluxoId,
      proximo_envio_data: dataPrevistaIso,
      proxima_etapa_nome: primeiraEtapa ? primeiraEtapa.nome : '1º Follow-up',
      etapas_executadas: [],
      trilha: [
        {
          fluxo_id: fluxoId,
          fluxo_nome: fluxoNome,
          origem_entrada: 'movimento_manual',
          motivo: `Movido manualmente para o fluxo "${fluxoNome}" pelo operador (${operadorNome}) em ${dataFormatadaTrilha}`,
          data: agoraIso,
        },
      ],
    }

    let loteId = ''
    try {
      const disparosCol = app.findCollectionByNameOrId('disparos_massa')
      const filtroLoteManual = `fluxo_id = '${fluxoId}' && origem_entrada = 'movimento_manual' && status = 'ativo'`
      const lotesManual = app.findRecordsByFilter(
        'disparos_massa',
        filtroLoteManual,
        '-created',
        1,
        0,
      )

      let loteParaAtualizar = null
      if (lotesManual && lotesManual.length > 0) {
        loteParaAtualizar = lotesManual[0]
        let dests = []
        try {
          const raw = loteParaAtualizar.get('destinatarios')
          dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
        } catch (_) {}
        dests.push(novoDestinatario)
        loteParaAtualizar.set('destinatarios', dests)
        loteParaAtualizar.set('total_destinatarios', dests.length)
        app.save(loteParaAtualizar)
        loteId = loteParaAtualizar.id
      } else {
        loteParaAtualizar = new Record(disparosCol)
        loteParaAtualizar.set('titulo', `Follow-up Manual: ${fluxoNome}`)
        loteParaAtualizar.set('status', 'ativo')
        loteParaAtualizar.set('segmento', 'movimento_manual')
        loteParaAtualizar.set('total_destinatarios', 1)
        loteParaAtualizar.set('intervalo_segundos', 60)
        loteParaAtualizar.set('data_disparo', agoraIso)
        loteParaAtualizar.set(
          'mensagem_original',
          `Entrada manual no fluxo "${fluxoNome}" realizada pelo operador`,
        )
        loteParaAtualizar.set('reenvio_ativo', true)
        loteParaAtualizar.set('fluxo_id', fluxoId)
        loteParaAtualizar.set('origem_entrada', 'movimento_manual')
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
        loteId = loteParaAtualizar.id
      }
    } catch (errSaveLote) {
      console.log('[MOVER MANUAL FLUXO] Erro ao salvar lote de acompanhamento:', errSaveLote)
      return { sucesso: false, motivo: 'Erro ao gravar lote: ' + String(errSaveLote) }
    }

    let msgAgendadaId = ''
    if (isImediata && primeiraEtapa && primeiraEtapa.mensagem) {
      try {
        const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
        let textoFinal = primeiraEtapa.mensagem || ''
        textoFinal = textoFinal.replace(/\[nome do cliente\]/gi, clienteNome)
        textoFinal = textoFinal.replace(/\[nome da empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\[empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\{\{nome_cliente\}\}/g, clienteNome)

        let cleanPhone = telefoneLimpo
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }

        const novaMsg = new Record(msgsCol)
        novaMsg.set('cliente_id', clienteId)
        novaMsg.set('telefone_destino', cleanPhone)
        novaMsg.set('conteudo_final', textoFinal)
        novaMsg.set('status', 'agendada')
        novaMsg.set('agendado_para', agoraIso)
        novaMsg.set('tipo_disparo', `massa_fluxo_etapa_${primeiraEtapa.ordem}`)
        novaMsg.set(
          'referencia_id',
          `lote_${loteId}_manual_f${fluxoId}_e${primeiraEtapa.ordem}_${clienteId || cleanPhone}`,
        )
        app.save(novaMsg)
        msgAgendadaId = novaMsg.id

        try {
          const loteRec = app.findRecordById('disparos_massa', loteId)
          let dests = []
          try {
            const raw = loteRec.get('destinatarios')
            dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
          } catch (_) {}

          const targetDest = dests.find((d) => d.cliente_id === clienteId)
          if (targetDest) {
            if (!Array.isArray(targetDest.etapas_executadas)) {
              targetDest.etapas_executadas = []
            }
            targetDest.etapas_executadas.push({
              ordem: primeiraEtapa.ordem,
              etapa_id: primeiraEtapa.id,
              fluxo_id: fluxoId,
              nome: primeiraEtapa.nome,
              enviado_em: agoraIso,
              mensagem_id: novaMsg.id,
            })
            targetDest.etapa_atual_ordem = primeiraEtapa.ordem
            targetDest.etapa_atual_nome = primeiraEtapa.nome
            if (primeiraEtapa.ordem === 1) {
              targetDest.status = 'reenvio_1_agendado'
              targetDest.reenvio_1_data = agoraIso
              targetDest.reenvio_1_msg_id = novaMsg.id
            }

            const subsequente = etapas.find((e) => e.ordem > primeiraEtapa.ordem)
            if (subsequente) {
              const proxDias = Math.max(1, subsequente.dias_apos || 1)
              targetDest.proximo_envio_data = new Date(
                agora.getTime() + proxDias * 24 * 60 * 60 * 1000,
              ).toISOString()
              targetDest.proxima_etapa_nome = subsequente.nome
            } else {
              targetDest.proximo_envio_data = undefined
              targetDest.proxima_etapa_nome = undefined
            }

            loteRec.set('destinatarios', dests)
            app.save(loteRec)
          }
        } catch (errUpdateEtapa) {
          console.log(
            '[MOVER MANUAL FLUXO] Aviso ao atualizar etapa imediata no lote:',
            errUpdateEtapa,
          )
        }
      } catch (errMsg) {
        console.log('[MOVER MANUAL FLUXO] Erro ao enfileirar mensagem imediata:', errMsg)
      }
    }

    return {
      sucesso: true,
      loteId,
      clienteId,
      clienteNome,
      fluxoId,
      fluxoNome,
      imediata: isImediata,
      mensagemEnfileirada: Boolean(msgAgendadaId),
    }
  }

  try {
    const authRecord = c.auth
    if (!authRecord) {
      return c.json(401, { error: 'Autenticação necessária' })
    }

    const body = c.requestInfo().body || {}
    const rawClienteIds = body.cliente_ids || body.cliente_id
    const fluxoId = (body.fluxo_id || '').trim()

    if (!fluxoId) {
      return c.json(400, { error: 'fluxo_id é obrigatório' })
    }

    let clienteIds = []
    if (Array.isArray(rawClienteIds)) {
      clienteIds = rawClienteIds.map((id) => String(id).trim()).filter(Boolean)
    } else if (rawClienteIds) {
      clienteIds = [String(rawClienteIds).trim()]
    }

    if (clienteIds.length === 0) {
      return c.json(400, { error: 'Nenhum cliente_id fornecido' })
    }

    const operadorNome = authRecord.getString('name') || authRecord.getString('email') || 'Operador'

    const resultados = []
    let sucessoCount = 0
    let jaAtivoCount = 0
    let erroCount = 0

    for (let i = 0; i < clienteIds.length; i++) {
      const cId = clienteIds[i]
      const res = moverClienteParaFluxoManual($app, {
        clienteId: cId,
        fluxoId: fluxoId,
        operadorNome: operadorNome,
      })

      resultados.push(res)
      if (res.sucesso) {
        sucessoCount++
      } else if (res.jaAtivo) {
        jaAtivoCount++
      } else {
        erroCount++
      }
    }

    return c.json(200, {
      success: sucessoCount > 0,
      total: clienteIds.length,
      sucessoCount,
      jaAtivoCount,
      erroCount,
      resultados,
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: String(err && err.message ? err.message : err),
    })
  }
})

/**
 * BUG 2: Endpoint de reconciliação retroativa de respostas de WhatsApp
 * POST /backend/v1/delfos/reconciliar-respostas-disparos
 * Body opcional: { lote_id?: string }
 */
routerAdd('POST', '/backend/v1/delfos/reconciliar-respostas-disparos', (c) => {
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

  function carregarNomeFluxo(app, fluxoId) {
    if (!fluxoId) return ''
    try {
      const fRec = app.findRecordById('fluxos_follow_up', fluxoId)
      if (fRec) return fRec.getString('nome') || ''
    } catch (_) {}
    return ''
  }

  function reconciliarRespostasDisparosMassa(app, options) {
    const opts = options || {}
    const loteIdFiltro = opts.loteId || ''
    const agora = new Date()
    const agoraIso = agora.toISOString()

    let lotes = []
    try {
      if (loteIdFiltro) {
        try {
          const rec = app.findRecordById('disparos_massa', loteIdFiltro)
          if (rec) lotes = [rec]
        } catch (_) {}
      } else {
        lotes = app.findRecordsByFilter(
          'disparos_massa',
          "status != 'cancelado'",
          '-created',
          200,
          0,
        )
      }
    } catch (errLotes) {
      console.log('[RECONCILIACAO RESPOSTAS] Erro ao buscar lotes:', errLotes)
      return { sucesso: false, error: String(errLotes) }
    }

    const resultados = []
    let totalReconciliados = 0

    for (let l = 0; l < lotes.length; l++) {
      const lote = lotes[l]
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

      if (!Array.isArray(dests) || dests.length === 0) continue

      const dataDisparoStr = lote.getString('data_disparo') || lote.getString('created')
      const dataDisparoMs = new Date(dataDisparoStr).getTime()
      const dataInicioBuscaIso = new Date(Math.max(0, dataDisparoMs - 5 * 60 * 1000))
        .toISOString()
        .replace('T', ' ')

      let loteModificado = false
      let reconciliadosNoLote = 0

      for (let d = 0; d < dests.length; d++) {
        const item = dests[d]
        if (!item) continue

        if (item.status === 'respondido' || item.marcacao_resposta === 'respondeu') {
          continue
        }

        const telItem = (item.telefone || '').replace(/\D/g, '')
        const cliId = item.cliente_id || ''

        let msgRecebidaEncontrada = null

        if (cliId && !cliId.startsWith('demo_')) {
          try {
            const filtroCli = `direcao = 'recebida' && created >= '${dataInicioBuscaIso}' && cliente_id = '${cliId}'`
            const msgsCli = app.findRecordsByFilter(
              'whatsapp_mensagens',
              filtroCli,
              'created',
              1,
              0,
            )
            if (msgsCli && msgsCli.length > 0) {
              msgRecebidaEncontrada = msgsCli[0]
            }
          } catch (_) {}
        }

        if (!msgRecebidaEncontrada && telItem && telItem.length >= 8) {
          try {
            const ult8 = telItem.slice(-8)
            const filtroTel = `direcao = 'recebida' && created >= '${dataInicioBuscaIso}' && (telefone_destino ~ '${ult8}' || cliente_id = '${cliId}')`
            const msgsTel = app.findRecordsByFilter(
              'whatsapp_mensagens',
              filtroTel,
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
                msgRecebidaEncontrada = cand
                break
              }
            }
          } catch (errBuscaTel) {
            console.log('[RECONCILIACAO] Erro ao buscar mensagem por telefone:', errBuscaTel)
          }
        }

        if (msgRecebidaEncontrada) {
          const dataMsgIso =
            msgRecebidaEncontrada.getString('enviado_em') ||
            msgRecebidaEncontrada.getString('created') ||
            agoraIso

          item.status = 'respondido'
          item.marcacao_resposta = 'respondeu'
          item.marcacao_data = dataMsgIso
          item.respondido_em = dataMsgIso
          item.motivo_saida = 'Resposta detectada retroativamente via WhatsApp'
          item.proximo_envio_data = undefined
          item.proxima_etapa_nome = undefined

          if (typeof item.trilha === 'string') {
            try {
              item.trilha = JSON.parse(item.trilha)
            } catch (_) {
              item.trilha = []
            }
          }
          if (!Array.isArray(item.trilha)) {
            item.trilha = []
          }
          item.trilha = item.trilha.filter((t) => t && typeof t === 'object')

          item.trilha.push({
            fluxo_id: item.fluxo_atual_id || lote.getString('fluxo_id'),
            fluxo_nome: carregarNomeFluxo(app, item.fluxo_atual_id || lote.getString('fluxo_id')),
            motivo: 'Resposta detectada retroativamente via WhatsApp',
            resposta_detectada: true,
            preview_mensagem: (msgRecebidaEncontrada.getString('conteudo_final') || '').substring(
              0,
              80,
            ),
            data: dataMsgIso,
          })

          loteModificado = true
          reconciliadosNoLote++
          totalReconciliados++
          console.log(
            `[RECONCILIACAO] Destinatário ${item.nome} (${telItem}) do lote ${lote.id} reconciliado com resposta em ${dataMsgIso}.`,
          )
        }
      }

      if (loteModificado) {
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
              (d.status === 'finalizado' ||
                d.status === 'arquivado' ||
                d.status === 'nao_perturbe'),
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

        resultados.push({
          loteId: lote.id,
          titulo: lote.getString('titulo'),
          reconciliados: reconciliadosNoLote,
          novosRespondidos: stats.respondidos,
          novosPendentes: stats.pendentes,
        })
      }
    }

    return {
      sucesso: true,
      totalReconciliados,
      lotesAfetados: resultados.length,
      detalhes: resultados,
    }
  }

  try {
    const authRecord = c.auth
    if (!authRecord) {
      return c.json(401, { error: 'Autenticação necessária' })
    }

    const body = c.requestInfo().body || {}
    const loteId = (body.lote_id || body.loteId || '').trim()

    const resultado = reconciliarRespostasDisparosMassa($app, {
      loteId: loteId || undefined,
    })

    return c.json(200, {
      success: true,
      resultado,
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: String(err && err.message ? err.message : err),
    })
  }
})

routerAdd('POST', '/reconciliar-respostas-disparos', (c) => {
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

  function carregarNomeFluxo(app, fluxoId) {
    if (!fluxoId) return ''
    try {
      const fRec = app.findRecordById('fluxos_follow_up', fluxoId)
      if (fRec) return fRec.getString('nome') || ''
    } catch (_) {}
    return ''
  }

  function reconciliarRespostasDisparosMassa(app, options) {
    const opts = options || {}
    const loteIdFiltro = opts.loteId || ''
    const agora = new Date()
    const agoraIso = agora.toISOString()

    let lotes = []
    try {
      if (loteIdFiltro) {
        try {
          const rec = app.findRecordById('disparos_massa', loteIdFiltro)
          if (rec) lotes = [rec]
        } catch (_) {}
      } else {
        lotes = app.findRecordsByFilter(
          'disparos_massa',
          "status != 'cancelado'",
          '-created',
          200,
          0,
        )
      }
    } catch (errLotes) {
      console.log('[RECONCILIACAO RESPOSTAS] Erro ao buscar lotes:', errLotes)
      return { sucesso: false, error: String(errLotes) }
    }

    const resultados = []
    let totalReconciliados = 0

    for (let l = 0; l < lotes.length; l++) {
      const lote = lotes[l]
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

      if (!Array.isArray(dests) || dests.length === 0) continue

      const dataDisparoStr = lote.getString('data_disparo') || lote.getString('created')
      const dataDisparoMs = new Date(dataDisparoStr).getTime()
      const dataInicioBuscaIso = new Date(Math.max(0, dataDisparoMs - 5 * 60 * 1000))
        .toISOString()
        .replace('T', ' ')

      let loteModificado = false
      let reconciliadosNoLote = 0

      for (let d = 0; d < dests.length; d++) {
        const item = dests[d]
        if (!item) continue

        if (item.status === 'respondido' || item.marcacao_resposta === 'respondeu') {
          continue
        }

        const telItem = (item.telefone || '').replace(/\D/g, '')
        const cliId = item.cliente_id || ''

        let msgRecebidaEncontrada = null

        if (cliId && !cliId.startsWith('demo_')) {
          try {
            const filtroCli = `direcao = 'recebida' && created >= '${dataInicioBuscaIso}' && cliente_id = '${cliId}'`
            const msgsCli = app.findRecordsByFilter(
              'whatsapp_mensagens',
              filtroCli,
              'created',
              1,
              0,
            )
            if (msgsCli && msgsCli.length > 0) {
              msgRecebidaEncontrada = msgsCli[0]
            }
          } catch (_) {}
        }

        if (!msgRecebidaEncontrada && telItem && telItem.length >= 8) {
          try {
            const ult8 = telItem.slice(-8)
            const filtroTel = `direcao = 'recebida' && created >= '${dataInicioBuscaIso}' && (telefone_destino ~ '${ult8}' || cliente_id = '${cliId}')`
            const msgsTel = app.findRecordsByFilter(
              'whatsapp_mensagens',
              filtroTel,
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
                msgRecebidaEncontrada = cand
                break
              }
            }
          } catch (errBuscaTel) {
            console.log('[RECONCILIACAO] Erro ao buscar mensagem por telefone:', errBuscaTel)
          }
        }

        if (msgRecebidaEncontrada) {
          const dataMsgIso =
            msgRecebidaEncontrada.getString('enviado_em') ||
            msgRecebidaEncontrada.getString('created') ||
            agoraIso

          item.status = 'respondido'
          item.marcacao_resposta = 'respondeu'
          item.marcacao_data = dataMsgIso
          item.respondido_em = dataMsgIso
          item.motivo_saida = 'Resposta detectada retroativamente via WhatsApp'
          item.proximo_envio_data = undefined
          item.proxima_etapa_nome = undefined

          if (typeof item.trilha === 'string') {
            try {
              item.trilha = JSON.parse(item.trilha)
            } catch (_) {
              item.trilha = []
            }
          }
          if (!Array.isArray(item.trilha)) {
            item.trilha = []
          }
          item.trilha = item.trilha.filter((t) => t && typeof t === 'object')

          item.trilha.push({
            fluxo_id: item.fluxo_atual_id || lote.getString('fluxo_id'),
            fluxo_nome: carregarNomeFluxo(app, item.fluxo_atual_id || lote.getString('fluxo_id')),
            motivo: 'Resposta detectada retroativamente via WhatsApp',
            resposta_detectada: true,
            preview_mensagem: (msgRecebidaEncontrada.getString('conteudo_final') || '').substring(
              0,
              80,
            ),
            data: dataMsgIso,
          })

          loteModificado = true
          reconciliadosNoLote++
          totalReconciliados++
          console.log(
            `[RECONCILIACAO] Destinatário ${item.nome} (${telItem}) do lote ${lote.id} reconciliado com resposta em ${dataMsgIso}.`,
          )
        }
      }

      if (loteModificado) {
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
              (d.status === 'finalizado' ||
                d.status === 'arquivado' ||
                d.status === 'nao_perturbe'),
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

        resultados.push({
          loteId: lote.id,
          titulo: lote.getString('titulo'),
          reconciliados: reconciliadosNoLote,
          novosRespondidos: stats.respondidos,
          novosPendentes: stats.pendentes,
        })
      }
    }

    return {
      sucesso: true,
      totalReconciliados,
      lotesAfetados: resultados.length,
      detalhes: resultados,
    }
  }

  try {
    const authRecord = c.auth
    if (!authRecord) {
      return c.json(401, { error: 'Autenticação necessária' })
    }

    const body = c.requestInfo().body || {}
    const loteId = (body.lote_id || body.loteId || '').trim()

    const resultado = reconciliarRespostasDisparosMassa($app, {
      loteId: loteId || undefined,
    })

    return c.json(200, {
      success: true,
      resultado,
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: String(err && err.message ? err.message : err),
    })
  }
})
