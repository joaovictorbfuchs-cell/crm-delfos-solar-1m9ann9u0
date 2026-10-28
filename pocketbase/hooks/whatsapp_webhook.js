// Webhook público para receber mensagens do WhatsApp (Z-API / On-Message-Received)
// Endpoint: POST /backend/v1/whatsapp/webhook
// Também atende GET /backend/v1/whatsapp/webhook para verificação/ping de conformidade
// Validação e homologação v0.0.848 Delfos Solar
routerAdd('POST', '/backend/v1/whatsapp/webhook', (e) => {
  // ============================================================================
  // FUNÇÕES AUTOCONTIDAS DE FOLLOW-UP / FASE 4 (DENTRO DO CORPO DO CALLBACK)
  // ============================================================================

  function gerarVariacoesTelefoneWebhook(tel) {
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

  function telefonesCasamBidirecionalWebhook(telA, telB) {
    if (!telA || !telB) return false
    const limpoA = String(telA).replace(/\D/g, '')
    const limpoB = String(telB).replace(/\D/g, '')
    if (!limpoA || !limpoB) return false
    if (limpoA === limpoB) return true

    const varsA = gerarVariacoesTelefoneWebhook(telA)
    const setB = new Set(gerarVariacoesTelefoneWebhook(telB))

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

  function carregarEtapasDoFluxoWebhook(app, fluxoId) {
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
      console.log('[WHATSAPP WEBHOOK] Erro ao carregar etapas do fluxo:', err)
      return []
    }
  }

  function carregarNomeFluxoWebhook(app, fluxoId) {
    if (!fluxoId) return ''
    try {
      const fRec = app.findRecordById('fluxos_follow_up', fluxoId)
      if (fRec) return fRec.getString('nome') || ''
    } catch (_) {}
    return ''
  }

  function carregarFluxoPadraoIdWebhook(app) {
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

  function processarRespostaAutomaticaClienteWebhook(app, params) {
    const clienteId = params.clienteId || ''
    const telefoneRecebido = (params.telefone || '').replace(/\D/g, '')
    const mensagemRecebida = params.mensagem || ''
    const agora = new Date()
    const agoraIso = agora.toISOString()

    if (!clienteId && (!telefoneRecebido || telefoneRecebido.length < 8)) {
      return { processado: false, motivo: 'Sem identificador de cliente ou telefone' }
    }

    const telCurto = telefoneRecebido.startsWith('55')
      ? telefoneRecebido.substring(2)
      : telefoneRecebido
    const last8 = telefoneRecebido.slice(-8)

    const sessentaDiasAtras = new Date(agora.getTime() - 60 * 24 * 60 * 60 * 1000)
    const dataMinimaLotesIso = sessentaDiasAtras.toISOString().replace('T', ' ')

    let lotesRecentes = []
    try {
      lotesRecentes = app.findRecordsByFilter(
        'disparos_massa',
        `status != 'cancelado' && created >= '${dataMinimaLotesIso}'`,
        '-created',
        100,
        0,
      )
    } catch (errBusca) {
      console.log('[WHATSAPP WEBHOOK] Erro ao buscar lotes de disparos_massa:', errBusca)
      return { processado: false, error: String(errBusca) }
    }

    if (!lotesRecentes || lotesRecentes.length === 0) {
      return { processado: false, motivo: 'Nenhum lote recente encontrado' }
    }

    const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
    let matchesEncontrados = 0

    for (let l = 0; l < lotesRecentes.length; l++) {
      const lote = lotesRecentes[l]
      let dests = []
      try {
        const raw = lote.get('destinatarios')
        dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
      } catch (_) {
        dests = []
      }

      if (!Array.isArray(dests) || dests.length === 0) continue

      let loteModificado = false

      for (let d = 0; d < dests.length; d++) {
        const item = dests[d]
        if (!item) continue

        const itemTelLimpo = (item.telefone || '').replace(/\D/g, '')
        const matchClienteId = clienteId && item.cliente_id && item.cliente_id === clienteId
        const matchTelefone =
          itemTelLimpo &&
          (itemTelLimpo === telefoneRecebido ||
            telefonesCasamBidirecionalWebhook(itemTelLimpo, telefoneRecebido) ||
            (last8 && itemTelLimpo.endsWith(last8)) ||
            (telCurto && itemTelLimpo.includes(telCurto)))

        if (!matchClienteId && !matchTelefone) {
          continue
        }

        const statusAtual = item.status || 'pendente'
        if (
          statusAtual === 'respondido' ||
          statusAtual === 'atendido' ||
          statusAtual === 'finalizado' ||
          statusAtual === 'arquivado' ||
          statusAtual === 'bloqueado' ||
          statusAtual === 'sem_whatsapp' ||
          statusAtual === 'nao_perturbe' ||
          item.marcacao_resposta === 'respondeu' ||
          item.marcacao_resposta === 'interessado'
        ) {
          continue
        }

        const fluxoAtualId =
          item.fluxo_atual_id || lote.getString('fluxo_id') || carregarFluxoPadraoIdWebhook(app)
        const nomeFluxoAtual = carregarNomeFluxoWebhook(app, fluxoAtualId) || 'Fluxo Atual'
        const etapasAtuais = carregarEtapasDoFluxoWebhook(app, fluxoAtualId)

        let etapaAtualObj = null
        if (item.etapas_executadas && item.etapas_executadas.length > 0) {
          const ultExec = item.etapas_executadas[item.etapas_executadas.length - 1]
          if (ultExec && ultExec.etapa_id) {
            etapaAtualObj = etapasAtuais.find((e) => e.id === ultExec.etapa_id)
          }
          if (!etapaAtualObj && ultExec) {
            etapaAtualObj = etapasAtuais.find((e) => e.ordem === ultExec.ordem)
          }
        }
        if (!etapaAtualObj && etapasAtuais.length > 0) {
          etapaAtualObj = etapasAtuais[0]
        }

        item.status = 'respondido'
        item.marcacao_resposta = 'respondeu'
        item.marcacao_data = agoraIso
        item.respondido_em = agoraIso
        item.motivo_saida = 'Resposta detectada automaticamente via WhatsApp'

        if (!Array.isArray(item.trilha)) {
          item.trilha = []
        }

        const etapaNomeDesc = etapaAtualObj
          ? etapaAtualObj.nome
          : item.etapa_atual_nome || 'Follow-up'

        item.trilha.push({
          fluxo_id: fluxoAtualId,
          fluxo_nome: nomeFluxoAtual,
          etapa_origem_id: etapaAtualObj ? etapaAtualObj.id : undefined,
          etapa_origem_nome: etapaNomeDesc,
          motivo: 'Resposta detectada automaticamente',
          resposta_detectada: true,
          preview_mensagem: mensagemRecebida.substring(0, 80),
          data: agoraIso,
        })

        const temRamificacao =
          etapaAtualObj &&
          etapaAtualObj.resposta_acao === 'fluxo_alternativo' &&
          etapaAtualObj.resposta_fluxo_id &&
          etapaAtualObj.resposta_fluxo_id !== fluxoAtualId

        if (temRamificacao) {
          const novoFluxoId = etapaAtualObj.resposta_fluxo_id
          const nomeNovoFluxo = carregarNomeFluxoWebhook(app, novoFluxoId) || 'Fluxo de Resposta'

          const vezesPassou = item.trilha.filter((t) => t.fluxo_id === novoFluxoId).length
          if (vezesPassou < 2) {
            item.fluxo_atual_id = novoFluxoId
            item.fluxo_origem_id = fluxoAtualId
            item.fluxo_origem_nome = nomeFluxoAtual
            item.status = 'pendente'
            item.motivo_saida = `Ramificação de resposta: entrou no fluxo "${nomeNovoFluxo}"`

            item.trilha.push({
              fluxo_id: novoFluxoId,
              fluxo_nome: nomeNovoFluxo,
              fluxo_anterior_id: fluxoAtualId,
              fluxo_anterior_nome: nomeFluxoAtual,
              motivo: `Resposta detectada automaticamente → Entrou no fluxo alternativo "${nomeNovoFluxo}"`,
              data: agoraIso,
            })

            const etapasNovoFluxo = carregarEtapasDoFluxoWebhook(app, novoFluxoId)
            if (etapasNovoFluxo.length > 0) {
              const primeiraEtapaNova = etapasNovoFluxo[0]
              item.etapa_atual_ordem = primeiraEtapaNova.ordem
              item.etapa_atual_nome = primeiraEtapaNova.nome

              if (primeiraEtapaNova.dias_apos === 0) {
                const agendadoParaIso = agoraIso
                let textoFinal = primeiraEtapaNova.mensagem || ''
                textoFinal = textoFinal.replace(/\[nome do cliente\]/gi, item.nome || 'Cliente')
                textoFinal = textoFinal.replace(/\[nome da empresa\]/gi, 'Delfos Solar')
                textoFinal = textoFinal.replace(/\[empresa\]/gi, 'Delfos Solar')
                textoFinal = textoFinal.replace(/\{\{nome_cliente\}\}/g, item.nome || 'Cliente')

                let cleanPhone = itemTelLimpo || telefoneRecebido
                if (
                  cleanPhone.length >= 10 &&
                  cleanPhone.length <= 11 &&
                  !cleanPhone.startsWith('55')
                ) {
                  cleanPhone = '55' + cleanPhone
                }

                if (textoFinal) {
                  const novaMsg = new Record(msgsCol)
                  if (item.cliente_id && !item.cliente_id.startsWith('demo_')) {
                    novaMsg.set('cliente_id', item.cliente_id)
                  }
                  novaMsg.set('telefone_destino', cleanPhone)
                  novaMsg.set('conteudo_final', textoFinal)
                  novaMsg.set('status', 'agendada')
                  novaMsg.set('agendado_para', agendadoParaIso)
                  novaMsg.set(
                    'tipo_disparo',
                    `massa_fluxo_resposta_imediata_${primeiraEtapaNova.ordem}`,
                  )
                  novaMsg.set(
                    'referencia_id',
                    `lote_${lote.id}_resp_f${novoFluxoId}_e${primeiraEtapaNova.ordem}_${item.cliente_id || cleanPhone}`,
                  )
                  app.save(novaMsg)

                  if (!Array.isArray(item.etapas_executadas)) {
                    item.etapas_executadas = []
                  }
                  item.etapas_executadas.push({
                    ordem: primeiraEtapaNova.ordem,
                    etapa_id: primeiraEtapaNova.id,
                    fluxo_id: novoFluxoId,
                    nome: primeiraEtapaNova.nome,
                    enviado_em: agendadoParaIso,
                    mensagem_id: novaMsg.id,
                  })
                }

                const subsequente = etapasNovoFluxo.find((e) => e.ordem > primeiraEtapaNova.ordem)
                if (subsequente) {
                  const proxDias = Math.max(1, subsequente.dias_apos || 1)
                  item.proximo_envio_data = new Date(
                    agora.getTime() + proxDias * 24 * 60 * 60 * 1000,
                  ).toISOString()
                  item.proxima_etapa_nome = subsequente.nome
                } else {
                  item.proximo_envio_data = undefined
                  item.proxima_etapa_nome = undefined
                }
              } else {
                const proxDias = Math.max(1, primeiraEtapaNova.dias_apos || 1)
                item.proximo_envio_data = new Date(
                  agora.getTime() + proxDias * 24 * 60 * 60 * 1000,
                ).toISOString()
                item.proxima_etapa_nome = primeiraEtapaNova.nome
              }
            }
          }
        } else {
          item.proximo_envio_data = undefined
          item.proxima_etapa_nome = undefined
        }

        loteModificado = true
        matchesEncontrados++
        console.log(
          `[WHATSAPP WEBHOOK FOLLOW-UP] Resposta detectada automaticamente para ${item.nome} (${itemTelLimpo}). Lote ${lote.id}, fluxo ${fluxoAtualId}. Ramificou: ${Boolean(temRamificacao)}`,
        )
      }

      if (loteModificado) {
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
        if (stats.pendentes === 0) {
          lote.set('status', 'concluido')
        }
        app.save(lote)
      }
    }

    return {
      processado: true,
      matchesEncontrados,
    }
  }

  try {
    const body = e.requestInfo().body || {}

    // Tolerância com payloads vazios ou pings de verificação de webhook
    if (!body || Object.keys(body).length === 0) {
      return e.json(200, { ok: true, message: 'Ping recebido com sucesso' })
    }

    // Ignorar mensagens de grupos ou broadcast se não for chat direto
    if (body.isGroup === true || body.isNewsletter === true) {
      return e.json(200, { ok: true, ignored: true, reason: 'group_or_newsletter' })
    }

    // Se for notificação de envio próprio (fromMe: true), ignorar para evitar loop
    if (body.fromMe === true) {
      return e.json(200, { ok: true, ignored: true, reason: 'from_me' })
    }

    // Função auxiliar para detecção de LID (14 dígitos iniciado por 24, ex: "24446987407395")
    function isWhatsAppLid(val) {
      if (!val) return false
      const d = val.toString().split('@')[0].split(':')[0].replace(/\D/g, '')
      return d.length === 14 && d.startsWith('24')
    }

    // Normalizar telefone com regras flexíveis de DDI, prefixo e dígitos essenciais
    function normalizarTelefoneCru(raw) {
      if (!raw) return ''
      let s = raw.toString().split('@')[0].split(':')[0].trim()
      let d = s.replace(/\D/g, '')
      while (d.startsWith('00')) d = d.slice(2)
      if (d.startsWith('0') && (d.length === 11 || d.length === 12)) {
        d = d.slice(1)
      }
      if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
        d = d.slice(2)
      }
      if (d.length === 8 || d.length === 9) {
        d = '54' + d
      }
      return d
    }

    // Comparação flexível simétrica ignorando 9º dígito:
    // Trata ambos os sentidos: número recebido sem 9 e cadastro com 9 (ex: 5491942664 vs 54991942664)
    // ou número recebido com 9 e cadastro sem 9 (ex: 54991942664 vs 5491942664).
    function compararFlexivel(telA, telB) {
      const a = normalizarTelefoneCru(telA)
      const b = normalizarTelefoneCru(telB)
      if (!a || !b || a.length < 8 || b.length < 8) return 'nenhum'
      if (a === b) return 'exato'

      const ultA = a.slice(-8)
      const ultB = b.slice(-8)
      if (ultA === ultB) {
        const dddA = a.length >= 10 ? a.slice(0, 2) : ''
        const dddB = b.length >= 10 ? b.slice(0, 2) : ''
        if (dddA && dddB) {
          if (dddA === dddB) return 'tolerante_nono_digito'
          return 'nenhum'
        }
        return 'tolerante_nono_digito'
      }
      return 'nenhum'
    }

    // Extrair telefone do remetente
    // Z-API manda `phone` (ex: "5544999999999" ou "554499999999") ou `connectedPhone`
    // Quando o usuário oculta o número, `phone` vem com o LID (14 dígitos iniciado em 24).
    // Inspecionar se o payload traz o número real em outros campos alternativos:
    // senderPhone, phone_real, realPhone, participantPhone, myPhone, sender, authorPhone etc.
    const rawPhoneOriginal = (body.phone || body.connectedPhone || body.sender || '')
      .toString()
      .trim()
    const candidatosTelefone = [
      body.senderPhone,
      body.phone_real,
      body.realPhone,
      body.participantPhone,
      body.participant,
      body.authorPhone,
      body.author,
      body.myPhone,
      body.userPhone,
      body.phone,
      body.connectedPhone,
      body.sender,
    ]

    let rawPhone = ''
    let lidEncontrado = ''

    // Se rawPhoneOriginal for LID, guardá-lo
    if (isWhatsAppLid(rawPhoneOriginal)) {
      lidEncontrado = rawPhoneOriginal.replace(/\D/g, '')
    }

    // 1. Priorizar encontrar número real (que NÃO seja LID)
    for (let c = 0; c < candidatosTelefone.length; c++) {
      const cand = (candidatosTelefone[c] || '').toString().trim()
      if (!cand) continue
      const candDigits = cand.split('@')[0].split(':')[0].replace(/\D/g, '')
      if (isWhatsAppLid(candDigits)) {
        if (!lidEncontrado) lidEncontrado = candDigits
        continue
      }
      // Um número de telefone válido tem entre 8 e 13 dígitos
      if (candDigits.length >= 8 && candDigits.length <= 13) {
        rawPhone = cand
        break
      }
    }

    // 2. Se nenhum número real foi encontrado, usar o LID como identificador da conversa
    if (!rawPhone) {
      if (lidEncontrado) {
        rawPhone = lidEncontrado
      } else if (rawPhoneOriginal) {
        rawPhone = rawPhoneOriginal
      }
    }

    if (!rawPhone) {
      return e.json(200, { ok: true, ignored: true, reason: 'phone_not_found' })
    }

    const isLidApenas = isWhatsAppLid(rawPhone)
    const normPhone = isLidApenas ? '' : normalizarTelefoneCru(rawPhone)
    let cleanPhone = rawPhone.replace(/\D/g, '')
    if (
      !isLidApenas &&
      cleanPhone.length >= 10 &&
      cleanPhone.length <= 11 &&
      !cleanPhone.startsWith('55')
    ) {
      cleanPhone = '55' + cleanPhone
    }

    // Extrair foto de perfil do contato (se presente no payload) para salvar no contato/avatar,
    // mas NUNCA tratar como mídia da mensagem
    const senderPhoto = (
      body.senderPhoto ||
      body.photo ||
      body.profilePic ||
      body.profilePictureUrl ||
      body.avatarUrl ||
      ''
    )
      .toString()
      .trim()

    // 0. Extrair texto preliminar (se houver em body.text, body.message, etc.)
    let rawTextFromPayload = ''
    if (body.text && typeof body.text === 'object') {
      rawTextFromPayload = body.text.message || body.text.title || ''
    } else if (typeof body.text === 'string') {
      rawTextFromPayload = body.text
    } else if (body.message && typeof body.message === 'string') {
      rawTextFromPayload = body.message
    } else if (body.buttonsResponseMessage && typeof body.buttonsResponseMessage === 'object') {
      rawTextFromPayload = body.buttonsResponseMessage.message || '[Resposta de Botão]'
    } else if (body.listResponseMessage && typeof body.listResponseMessage === 'object') {
      rawTextFromPayload = body.listResponseMessage.message || '[Resposta de Lista]'
    } else if (body.caption) {
      rawTextFromPayload = body.caption
    }
    rawTextFromPayload = (rawTextFromPayload || '').trim()

    // Extrair texto da mensagem e detectar tipo de mídia
    let messageText = rawTextFromPayload
    let tipoMensagem = 'texto'
    let nomeArquivo = ''
    let documentoUrl = ''

    // Função auxiliar para inspecionar se uma URL ou nome tem extensão de vídeo
    const isVideoExtension = (str) => {
      if (!str || typeof str !== 'string') return false
      const s = str.split('?')[0].split('#')[0].toLowerCase()
      return (
        s.endsWith('.mp4') ||
        s.endsWith('.mov') ||
        s.endsWith('.3gp') ||
        s.endsWith('.mkv') ||
        s.endsWith('.avi') ||
        s.endsWith('.webm')
      )
    }

    // Função auxiliar para inspecionar se uma URL ou nome tem extensão de áudio
    const isAudioExtension = (str) => {
      if (!str || typeof str !== 'string') return false
      const s = str.split('?')[0].split('#')[0].toLowerCase()
      return (
        s.endsWith('.ogg') ||
        s.endsWith('.opus') ||
        s.endsWith('.mp3') ||
        s.endsWith('.wav') ||
        s.endsWith('.m4a') ||
        s.endsWith('.aac')
      )
    }

    // Função auxiliar para inspecionar se uma URL ou nome tem extensão de imagem
    const isImageExtension = (str) => {
      if (!str || typeof str !== 'string') return false
      const s = str.split('?')[0].split('#')[0].toLowerCase()
      return (
        s.endsWith('.jpg') ||
        s.endsWith('.jpeg') ||
        s.endsWith('.png') ||
        s.endsWith('.webp') ||
        s.endsWith('.gif')
      )
    }

    // 1. Objeto 'video' direto
    if (body.video && typeof body.video === 'object') {
      tipoMensagem = 'video'
      documentoUrl = body.video.videoUrl || body.video.url || body.video.link || ''
      nomeArquivo = body.video.fileName || ''
      const cap = (body.video.caption || body.caption || '').trim()
      messageText = cap || '[Vídeo]'
    }
    // 2. Objeto 'ptv' (Push To Video / Pre-recorded Transfer Video / Mensagem de vídeo instantânea / bolha de vídeo)
    else if (body.ptv && typeof body.ptv === 'object') {
      tipoMensagem = 'video'
      documentoUrl = body.ptv.videoUrl || body.ptv.url || body.ptv.link || ''
      nomeArquivo = body.ptv.fileName || ''
      const cap = (body.ptv.caption || body.caption || '').trim()
      messageText = cap || '[Vídeo]'
    }
    // 3. String direta em body.video (URL ou data-url enviada em body.video)
    else if (typeof body.video === 'string' && body.video.trim()) {
      tipoMensagem = 'video'
      documentoUrl = body.video.trim()
      nomeArquivo = body.fileName || ''
      const cap = (body.caption || '').trim()
      messageText = cap || '[Vídeo]'
    }
    // 4. body.videoUrl direto
    else if (body.videoUrl) {
      tipoMensagem = 'video'
      documentoUrl = body.videoUrl
      nomeArquivo = body.fileName || ''
      messageText = (body.caption || '').trim() || '[Vídeo]'
    }
    // 5. Template hydrated com header de vídeo
    else if (
      body.hydratedTemplate &&
      body.hydratedTemplate.header &&
      body.hydratedTemplate.header.video
    ) {
      tipoMensagem = 'video'
      const v = body.hydratedTemplate.header.video
      documentoUrl = v.videoUrl || v.url || ''
      const cap = (v.caption || body.hydratedTemplate.message || '').trim()
      messageText = cap || '[Vídeo]'
    }
    // 6. Flag isVideo: true no payload da Z-API
    else if (body.isVideo === true) {
      tipoMensagem = 'video'
      documentoUrl =
        body.videoUrl ||
        body.url ||
        (body.document && (body.document.documentUrl || body.document.url)) ||
        ''
      nomeArquivo = body.fileName || (body.document && body.document.fileName) || ''
      const cap = (
        body.caption ||
        (body.document && (body.document.title || body.document.caption)) ||
        ''
      ).trim()
      messageText = cap || '[Vídeo]'
    }
    // 7. Imagem (objeto image)
    else if (body.image && typeof body.image === 'object') {
      tipoMensagem = 'imagem'
      documentoUrl = body.image.imageUrl || body.image.url || body.image.thumbnailUrl || ''
      nomeArquivo = body.image.fileName || ''
      const cap = (body.image.caption || body.caption || '').trim()
      messageText = cap || '[Imagem]'
    }
    // 8. String direta em body.image
    else if (typeof body.image === 'string' && body.image.trim()) {
      tipoMensagem = 'imagem'
      documentoUrl = body.image.trim()
      nomeArquivo = body.fileName || ''
      const cap = (body.caption || '').trim()
      messageText = cap || '[Imagem]'
    }
    // 9. Template hydrated com imagem
    else if (
      body.hydratedTemplate &&
      body.hydratedTemplate.header &&
      body.hydratedTemplate.header.image
    ) {
      tipoMensagem = 'imagem'
      const im = body.hydratedTemplate.header.image
      documentoUrl = im.imageUrl || im.url || ''
      const cap = (im.caption || body.hydratedTemplate.message || '').trim()
      messageText = cap || '[Imagem]'
    }
    // 10. Imagem via imageUrl isolado (NUNCA usar body.photo / senderPhoto aqui!)
    else if (
      body.imageUrl &&
      typeof body.imageUrl === 'string' &&
      body.imageUrl.trim() &&
      !body.imageUrl.includes('pps.whatsapp.net')
    ) {
      tipoMensagem = 'imagem'
      documentoUrl = body.imageUrl.trim()
      messageText = (body.caption || rawTextFromPayload || '').trim() || '[Imagem]'
    }
    // 11. Áudio (objeto audio)
    else if (body.audio && typeof body.audio === 'object') {
      tipoMensagem = 'audio'
      documentoUrl = body.audio.audioUrl || body.audio.url || ''
      nomeArquivo = body.audio.fileName || ''
      messageText = '[Áudio]'
    }
    // 12. String direta em body.audio ou body.audioUrl
    else if ((typeof body.audio === 'string' && body.audio.trim()) || body.audioUrl) {
      tipoMensagem = 'audio'
      documentoUrl = (typeof body.audio === 'string' && body.audio.trim()) || body.audioUrl
      nomeArquivo = body.fileName || ''
      messageText = '[Áudio]'
    }
    // 13. Documento estruturado: verificar se o mimeType ou extensão é na verdade vídeo ou áudio ou imagem
    else if (body.document && typeof body.document === 'object') {
      const mime = (body.document.mimeType || '').toLowerCase()
      const docUrl = body.document.documentUrl || body.document.url || ''
      const docName = body.document.fileName || ''

      if (mime.startsWith('video/') || isVideoExtension(docUrl) || isVideoExtension(docName)) {
        tipoMensagem = 'video'
        documentoUrl = docUrl
        nomeArquivo = docName
        const cap = (body.document.caption || body.document.title || body.caption || '').trim()
        messageText = cap || '[Vídeo]'
      } else if (
        mime.startsWith('audio/') ||
        isAudioExtension(docUrl) ||
        isAudioExtension(docName)
      ) {
        tipoMensagem = 'audio'
        documentoUrl = docUrl
        nomeArquivo = docName
        messageText = '[Áudio]'
      } else if (
        mime.startsWith('image/') ||
        isImageExtension(docUrl) ||
        isImageExtension(docName)
      ) {
        tipoMensagem = 'imagem'
        documentoUrl = docUrl
        nomeArquivo = docName
        const cap = (body.document.caption || body.document.title || body.caption || '').trim()
        messageText = cap || '[Imagem]'
      } else {
        tipoMensagem = 'documento'
        nomeArquivo = docName || 'documento.pdf'
        documentoUrl = docUrl
        messageText = body.document.title || body.document.caption || `[Documento: ${nomeArquivo}]`
      }
    }
    // 14. Documento via documentUrl direto (verificar se é vídeo/áudio disfarçado)
    else if (body.documentUrl) {
      const docUrl = body.documentUrl
      const docName = body.fileName || ''
      if (isVideoExtension(docUrl) || isVideoExtension(docName)) {
        tipoMensagem = 'video'
        documentoUrl = docUrl
        nomeArquivo = docName
        messageText = (body.title || body.caption || '').trim() || '[Vídeo]'
      } else if (isAudioExtension(docUrl) || isAudioExtension(docName)) {
        tipoMensagem = 'audio'
        documentoUrl = docUrl
        nomeArquivo = docName
        messageText = '[Áudio]'
      } else if (isImageExtension(docUrl) || isImageExtension(docName)) {
        tipoMensagem = 'imagem'
        documentoUrl = docUrl
        nomeArquivo = docName
        messageText = (body.title || body.caption || '').trim() || '[Imagem]'
      } else {
        tipoMensagem = 'documento'
        documentoUrl = docUrl
        nomeArquivo = docName || 'documento.pdf'
        messageText = body.title || body.caption || `[Documento: ${nomeArquivo}]`
      }
    }
    // 15. Figurinha (sticker)
    else if (body.sticker && typeof body.sticker === 'object') {
      tipoMensagem = 'imagem'
      documentoUrl = body.sticker.stickerUrl || body.sticker.url || ''
      messageText = '[Figurinha]'
    }
    // 16. Localização
    else if (body.location && typeof body.location === 'object') {
      tipoMensagem = 'texto'
      const lat = body.location.latitude || ''
      const lng = body.location.longitude || ''
      messageText = `[Localização: ${lat}, ${lng}]`
    }
    // 17. Contato compartilhado
    else if (body.contact && typeof body.contact === 'object') {
      tipoMensagem = 'texto'
      const cNome = body.contact.displayName || body.contact.name || 'Contato'
      const cTel = body.contact.phone || body.contact.vcard || ''
      messageText = `[Contato: ${cNome} - ${cTel}]`
    }

    if (!messageText) {
      messageText = '[Mensagem sem texto]'
    }

    // 1. Localizar ou atualizar o cliente pelo telefone
    // Heurística de Correspondência de Telefone (3 níveis):
    // Nível 1: Exato (comparação direta de dígitos e formato nacional com DDD)
    // Nível 2: Tolerante ao 9º dígito (mesmo DDD e últimos 8 dígitos iguais)
    // Nível 3: Apenas últimos 8 dígitos (quando o DDD não puder ser determinado)
    let clienteEncontrado = null
    let tipoCasamentoCliente = 'nenhum'

    if (!isLidApenas && normPhone && normPhone.length >= 8) {
      const ultimos8 = normPhone.slice(-8)
      try {
        const candidatos = $app.findRecordsByFilter(
          'clientes',
          `whatsapp ~ '${ultimos8}' || telefone ~ '${ultimos8}' || telefone_secundario ~ '${ultimos8}' || titular_telefone ~ '${ultimos8}'`,
          '-updated',
          25,
          0,
        )

        // Classificar candidatos por nível de casamento
        let melhorCandidatoExato = null
        let melhorCandidatoNonoDigito = null
        let melhorCandidatoUltimos8 = null

        for (let i = 0; i < candidatos.length; i++) {
          const c = candidatos[i]
          const camposTelefone = [
            c.getString('whatsapp'),
            c.getString('telefone'),
            c.getString('telefone_secundario'),
            c.getString('titular_telefone'),
          ]

          for (let f = 0; f < camposTelefone.length; f++) {
            const rawCampo = camposTelefone[f]
            if (!rawCampo) continue

            const match = compararFlexivel(rawPhone, rawCampo)
            if (match === 'exato' && !melhorCandidatoExato) {
              melhorCandidatoExato = c
              break
            } else if (match === 'tolerante_nono_digito' && !melhorCandidatoNonoDigito) {
              melhorCandidatoNonoDigito = c
            } else if (match === 'nenhum') {
              const dCampo = normalizarTelefoneCru(rawCampo)
              if (dCampo && dCampo.slice(-8) === ultimos8 && !melhorCandidatoUltimos8) {
                melhorCandidatoUltimos8 = c
              }
            }
          }

          if (melhorCandidatoExato) break
        }

        if (melhorCandidatoExato) {
          clienteEncontrado = melhorCandidatoExato
          tipoCasamentoCliente = 'exato'
        } else if (melhorCandidatoNonoDigito) {
          clienteEncontrado = melhorCandidatoNonoDigito
          tipoCasamentoCliente = 'tolerante_nono_digito'
        } else if (melhorCandidatoUltimos8) {
          clienteEncontrado = melhorCandidatoUltimos8
          tipoCasamentoCliente = 'ultimos_8_digitos'
        }
      } catch (errBuscaCliente) {
        console.log('[WHATSAPP WEBHOOK ERRO BUSCA CLIENTE]', errBuscaCliente)
      }
    }

    // Se o cliente foi encontrado via telefone real e a conversa atual é LID,
    // fazer o vínculo retrospectivo suave: NÃO sobrescrever o número LID da conversa,
    // apenas gravar cliente_id para unificar a ficha!
    const convCol = $app.findCollectionByNameOrId('whatsapp_conversas')
    let conversaRecord = null

    // 2. Localizar conversa existente
    // Regra crítica para evitar duplicar conversa ao receber LID e número normal:
    // a) Se temos clienteEncontrado, priorizar conversa com esse cliente_id
    if (clienteEncontrado) {
      try {
        const clientConvs = $app.findRecordsByFilter(
          convCol.id,
          `cliente_id = '${clienteEncontrado.id}'`,
          '-updated',
          1,
          0,
        )
        if (clientConvs && clientConvs.length > 0) {
          conversaRecord = clientConvs[0]
        }
      } catch (errConvCliente) {
        console.log('[WHATSAPP WEBHOOK ERRO CONV POR CLIENTE]', errConvCliente)
      }
    }

    // b) Se não achou por cliente, procurar pelo número ou LID
    if (!conversaRecord) {
      try {
        let filterConversa = ''
        if (isLidApenas) {
          // Busca estrita por LID
          filterConversa = `numero = '${rawPhone}'`
        } else if (cleanPhone && cleanPhone.length >= 8) {
          const last8 = cleanPhone.slice(-8)
          filterConversa = `numero ~ '${last8}'`
        }

        if (filterConversa) {
          const convList = $app.findRecordsByFilter(convCol.id, filterConversa, '-updated', 10, 0)
          if (convList && convList.length > 0) {
            if (isLidApenas) {
              conversaRecord = convList[0]
            } else {
              // Validar número completo ou tolerância do 9º dígito
              for (let i = 0; i < convList.length; i++) {
                const cNum = convList[i].getString('numero') || ''
                if (compararFlexivel(cleanPhone, cNum) !== 'nenhum') {
                  conversaRecord = convList[i]
                  break
                }
              }
              if (!conversaRecord) {
                conversaRecord = convList[0]
              }
            }
          }
        }
      } catch (errConvNum) {
        console.log('[WHATSAPP WEBHOOK ERRO CONV POR NUMERO]', errConvNum)
      }
    }

    const senderName =
      (body.senderName || body.pushName || body.name || body.contactName || '').trim() ||
      (clienteEncontrado ? clienteEncontrado.getString('nome') : '') ||
      cleanPhone

    const nowIso = new Date().toISOString()
    const previewTexto = messageText.substring(0, 100)

    // Se a conversa já existia, atualizar campos
    if (conversaRecord) {
      if (clienteEncontrado && !conversaRecord.getString('cliente_id')) {
        conversaRecord.set('cliente_id', clienteEncontrado.id)
        conversaRecord.set('vinculada_em', nowIso)
      }
      conversaRecord.set('ultima_mensagem_preview', previewTexto)
      conversaRecord.set('ultima_mensagem_em', nowIso)
      const currentUnread = conversaRecord.getInt('nao_lidas') || 0
      conversaRecord.set('nao_lidas', currentUnread + 1)
      conversaRecord.set('status', 'aguardando_atendente')

      // Atualizar foto de perfil se não tiver e recebemos uma no payload
      if (senderPhoto && !conversaRecord.getString('foto_perfil')) {
        conversaRecord.set('foto_perfil', senderPhoto)
      }

      $app.save(conversaRecord)
    } else {
      // Criar nova conversa
      conversaRecord = new Record(convCol)
      conversaRecord.set('numero', cleanPhone)
      if (clienteEncontrado) {
        conversaRecord.set('cliente_id', clienteEncontrado.id)
        conversaRecord.set('vinculada_em', nowIso)
      }
      conversaRecord.set('nome_contato', senderName)
      conversaRecord.set('status', 'aguardando_atendente')
      conversaRecord.set('ultima_mensagem_preview', previewTexto)
      conversaRecord.set('ultima_mensagem_em', nowIso)
      conversaRecord.set('nao_lidas', 1)
      if (senderPhoto) {
        conversaRecord.set('foto_perfil', senderPhoto)
      }
      $app.save(conversaRecord)
    }

    // 3. Salvar a mensagem na coleção `whatsapp_mensagens`
    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    const msgRecord = new Record(msgsCol)

    if (clienteEncontrado) {
      msgRecord.set('cliente_id', clienteEncontrado.id)
    }
    msgRecord.set('conversa_id', conversaRecord.id)
    msgRecord.set('telefone_destino', cleanPhone)
    msgRecord.set('conteudo_final', messageText)
    msgRecord.set('tipo_disparo', 'manual')
    msgRecord.set('status', 'enviada') // Mensagem recebida é marcada como 'enviada'/'recebida'
    msgRecord.set('enviado_em', nowIso)
    msgRecord.set('direcao', 'recebida')
    msgRecord.set('autor', senderName)
    msgRecord.set('tipo_mensagem', tipoMensagem)

    // Se Z-API enviou messageId, gravar como id_externo_gateway para idempotência
    const externalId = (body.messageId || body.id || body.zaapId || '').toString().trim()
    if (externalId) {
      msgRecord.set('id_externo_gateway', externalId)
    }

    // 4. Se for mídia (imagem, vídeo, áudio, documento) e tiver URL, fazer download seguro e persistir no campo `arquivo`
    const isMidia =
      tipoMensagem === 'imagem' ||
      tipoMensagem === 'video' ||
      tipoMensagem === 'audio' ||
      tipoMensagem === 'documento'
    if (isMidia && documentoUrl) {
      try {
        let fileToSave = null

        // Tentar baixar via fileFromURL padrão primeiro
        try {
          fileToSave = $filesystem.fileFromURL(documentoUrl)
        } catch (downloadErr) {
          console.log(
            '[WHATSAPP WEBHOOK] fileFromURL direto falhou, tentando com headers Z-API:',
            downloadErr,
          )
        }

        // Se falhou ou precisa de headers específicos (Client-Token)
        if (!fileToSave) {
          const lowerUrl = documentoUrl.toLowerCase()
          const isZApi =
            lowerUrl.indexOf('z-api.io') !== -1 ||
            lowerUrl.indexOf('z-api.com') !== -1 ||
            lowerUrl.indexOf('plugzapi.com') !== -1

          const apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')
          const headers = { 'User-Agent': 'DelfosSolar-CRM/1.0' }
          if (isZApi && apiKey) {
            headers['Client-Token'] = apiKey
          }

          const httpRes = $http.send({
            url: documentoUrl,
            method: 'GET',
            headers: headers,
            timeout: 30,
          })

          if (httpRes.statusCode >= 200 && httpRes.statusCode < 300) {
            let fname = nomeArquivo
            if (!fname) {
              const cleanPart = documentoUrl.split('?')[0].split('#')[0]
              const parts = cleanPart.split('/')
              fname = parts[parts.length - 1] || 'media_whatsapp'
            }
            if (!fname.includes('.')) {
              if (tipoMensagem === 'imagem') fname += '.jpg'
              else if (tipoMensagem === 'video') fname += '.mp4'
              else if (tipoMensagem === 'audio') fname += '.ogg'
              else if (tipoMensagem === 'documento') fname += '.pdf'
            }
            fileToSave = $filesystem.fileFromBytes(httpRes.body || httpRes.raw, fname)
          } else {
            msgRecord.set(
              'motivo_falha_midia',
              `HTTP ${httpRes.statusCode} ao baixar mídia original`,
            )
          }
        }

        if (fileToSave) {
          msgRecord.set('arquivo', fileToSave)
        }
      } catch (saveMediaErr) {
        const errDesc =
          saveMediaErr && saveMediaErr.message ? saveMediaErr.message : String(saveMediaErr)
        console.log('[WHATSAPP WEBHOOK ERRO PERSISTIR MIDIA]', errDesc)
        msgRecord.set('motivo_falha_midia', errDesc)
      }
    } else if (isMidia && !documentoUrl) {
      msgRecord.set('motivo_falha_midia', 'URL de mídia não fornecida no payload da mensagem')
    }

    $app.save(msgRecord)

    // FASE 4: Detecção automática de resposta em fluxos de follow-up (idempotente)
    // Aciona a detecção se o cliente ou número estiver em acompanhamento de follow-up ativo
    let respostaFollowUpProcessada = false
    try {
      const resFollowUp = processarRespostaAutomaticaClienteWebhook($app, {
        clienteId: clienteEncontrado ? clienteEncontrado.id : '',
        telefone: cleanPhone,
        mensagem: messageText,
      })
      if (resFollowUp && resFollowUp.matchesEncontrados > 0) {
        respostaFollowUpProcessada = true
      }
    } catch (errFollowUp) {
      console.log('[WHATSAPP WEBHOOK] Aviso ao processar follow-up Fase 4:', errFollowUp)
    }

    console.log(
      '[WHATSAPP WEBHOOK RECEBIDO]',
      JSON.stringify({
        phone: cleanPhone,
        hasClient: Boolean(clienteEncontrado),
        conversaId: conversaRecord.id,
        statusConversa: conversaRecord.getString('status'),
        followUpResposta: respostaFollowUpProcessada,
        messagePreview: messageText.substring(0, 50),
      }),
    )

    return e.json(200, {
      ok: true,
      conversaId: conversaRecord.id,
      conversaStatus: conversaRecord.getString('status'),
      hasCliente: Boolean(clienteEncontrado),
      msgId: msgRecord.id,
      followUpResposta: respostaFollowUpProcessada,
    })
  } catch (err) {
    let msg = 'Erro ao processar webhook do WhatsApp'
    if (err && err.message) msg = err.message
    console.log('[WHATSAPP WEBHOOK ERRO]', msg)
    return e.json(500, { ok: false, error: msg })
  }
})

// Suporte a requisição GET no mesmo endpoint para testes e verificação de URL
routerAdd('GET', '/backend/v1/whatsapp/webhook', (e) => {
  return e.json(200, {
    ok: true,
    status: 'online',
    endpoint: '/backend/v1/whatsapp/webhook',
    method: 'POST',
    description: 'Endpoint Webhook para recebimento de mensagens WhatsApp Z-API',
  })
})
