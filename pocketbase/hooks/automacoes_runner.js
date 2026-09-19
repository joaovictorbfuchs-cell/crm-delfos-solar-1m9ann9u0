// pocketbase/hooks/automacoes_runner.js
// Execução periódica e acionamento de automações

// CRON DIÁRIO / PERIÓDICO (a cada hora)
cronAdd('automacoes_worker', '0 * * * *', () => {
  try {
    const now = new Date()
    const diaAtual = now.getDate()
    const todayYmd = now.toISOString().substring(0, 10)

    const autoCol = $app.findCollectionByNameOrId('automacoes')
    const execCol = $app.findCollectionByNameOrId('automacoes_execucoes')
    const automacoesAtivas = $app.findRecordsByFilter(
      autoCol.id,
      "ativa = true && (gatilho = 'data_especifica' || gatilho = 'dias_apos_evento')",
      '',
      100,
      0,
    )

    for (let i = 0; i < automacoesAtivas.length; i++) {
      const automacaoRec = automacoesAtivas[i]
      const automacaoId = automacaoRec.id
      const gatilho = automacaoRec.getString('gatilho')
      let configGatilho = {}
      try {
        const rawG = automacaoRec.get('configuracao_gatilho')
        configGatilho = typeof rawG === 'string' ? JSON.parse(rawG) : rawG || {}
      } catch (_) {}

      const destinoTipo = automacaoRec.getString('destino')
      const clienteEspecificoId = automacaoRec.getString('cliente_especifico_id')

      let targets = [] // Array de { clienteRec, refKey, dadosContexto }

      if (gatilho === 'data_especifica') {
        const diaConfig = parseInt(configGatilho.dia_mes || configGatilho.dia, 10)
        if (diaConfig === diaAtual) {
          const refMesAno = `data_esp_${automacaoId}_${todayYmd.substring(0, 7)}`
          if (destinoTipo === 'cliente_especifico' && clienteEspecificoId) {
            try {
              const cli = $app.findRecordsByFilter(
                'clientes',
                `id = '${clienteEspecificoId}'`,
                '',
                1,
                0,
              )[0]
              if (cli) {
                targets.push({
                  clienteRec: cli,
                  refKey: `${refMesAno}_cli_${cli.id}`,
                  dadosContexto: { gatilho: 'data_especifica', dia: diaConfig },
                })
              }
            } catch (_) {}
          } else {
            try {
              const clientes = $app.findRecordsByFilter(
                'clientes',
                "status != 'Perdido'",
                'nome',
                50,
                0,
              )
              for (let c = 0; c < clientes.length; c++) {
                const cli = clientes[c]
                targets.push({
                  clienteRec: cli,
                  refKey: `${refMesAno}_cli_${cli.id}`,
                  dadosContexto: { gatilho: 'data_especifica', dia: diaConfig },
                })
              }
            } catch (_) {}
          }
        }
      } else if (gatilho === 'dias_apos_evento') {
        const dias = parseInt(configGatilho.dias, 10) || 7
        const eventoBase = configGatilho.evento_base || 'instalacao_concluida'

        if (eventoBase === 'instalacao_concluida') {
          const targetDate = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000)
          const targetYmd = targetDate.toISOString().substring(0, 10)
          try {
            const filterInstalados = `data_instalacao >= '${targetYmd} 00:00:00.000Z' && data_instalacao <= '${targetYmd} 23:59:59.999Z'`
            const instalados = $app.findRecordsByFilter('clientes', filterInstalados, '', 50, 0)
            for (let k = 0; k < instalados.length; k++) {
              const cli = instalados[k]
              targets.push({
                clienteRec: cli,
                refKey: `auto_${automacaoId}_instal_${cli.id}`,
                dadosContexto: {
                  gatilho: 'dias_apos_evento',
                  evento_base: 'instalacao_concluida',
                  dias: dias,
                },
              })
            }
          } catch (_) {}
        } else if (eventoBase === 'ultima_atividade') {
          const targetDate = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000)
          const targetYmd = targetDate.toISOString().substring(0, 10)
          try {
            const filterAtv = `data >= '${targetYmd} 00:00:00.000Z' && data <= '${targetYmd} 23:59:59.999Z'`
            const atvs = $app.findRecordsByFilter('atividades', filterAtv, '', 50, 0)
            for (let m = 0; m < atvs.length; m++) {
              const atv = atvs[m]
              const cliId = atv.getString('cliente_id')
              if (!cliId) continue
              try {
                const cli = $app.findRecordsByFilter('clientes', `id = '${cliId}'`, '', 1, 0)[0]
                if (cli) {
                  targets.push({
                    clienteRec: cli,
                    refKey: `auto_${automacaoId}_atv_${atv.id}`,
                    dadosContexto: {
                      gatilho: 'dias_apos_evento',
                      evento_base: 'ultima_atividade',
                      atividade_id: atv.id,
                    },
                  })
                }
              } catch (_) {}
            }
          } catch (_) {}
        }
      }

      // Executar ações para os alvos encontrados
      for (let t = 0; t < targets.length; t++) {
        const item = targets[t]
        const clienteRec = item.clienteRec
        const refKey = item.refKey

        // Idempotência
        if (refKey) {
          try {
            const jaExec = $app.findRecordsByFilter(
              execCol.id,
              `automacao = '${automacaoId}' && referencia_registro = '${refKey}'`,
              '',
              1,
              0,
            )
            if (jaExec && jaExec.length > 0) continue
          } catch (_) {}
        }

        const acao = automacaoRec.getString('acao')
        let configAcao = {}
        try {
          const rawA = automacaoRec.get('configuracao_acao')
          configAcao = typeof rawA === 'string' ? JSON.parse(rawA) : rawA || {}
        } catch (_) {}

        const clienteNome = clienteRec ? clienteRec.getString('nome') : 'Cliente'
        const empresaNome = 'Delfos Solar'
        const formatTexto = (str) => {
          if (!str) return ''
          return String(str)
            .replace(/\{\{cliente_nome\}\}/g, clienteNome)
            .replace(/\{\{nome_cliente\}\}/g, clienteNome)
            .replace(/\{\{empresa_nome\}\}/g, empresaNome)
        }

        let sucesso = false
        let mensagemResultado = ''
        let payloadGravado = {}

        try {
          if (acao === 'criar_atividade') {
            const atvCol = $app.findCollectionByNameOrId('atividades')
            const novaAtv = new Record(atvCol)
            if (clienteRec) novaAtv.set('cliente_id', clienteRec.id)
            const tituloFinal = formatTexto(configAcao.titulo || automacaoRec.getString('nome'))
            const descFinal = formatTexto(
              configAcao.descricao || 'Atividade gerada por automação Delfos Solar',
            )
            const tipoFinal = configAcao.tipo_atividade || configAcao.tipo || 'follow_up'

            novaAtv.set('titulo', tituloFinal)
            novaAtv.set('descricao', descFinal)
            novaAtv.set('tipo', tipoFinal)
            novaAtv.set('status', 'pendente')
            novaAtv.set('data', new Date().toISOString())
            novaAtv.set('autor', 'Automação Delfos')
            if (clienteRec && clienteRec.getString('responsavel_id')) {
              novaAtv.set('responsavel_id', clienteRec.getString('responsavel_id'))
              novaAtv.set('responsavel_nome', clienteRec.getString('responsavel_nome'))
            }
            $app.save(novaAtv)
            sucesso = true
            mensagemResultado = `Atividade criada: "${tituloFinal}" (ID: ${novaAtv.id})`
            payloadGravado = { atividade_id: novaAtv.id, titulo: tituloFinal, tipo: tipoFinal }
          } else if (acao === 'enviar_whatsapp') {
            const telDestino = clienteRec
              ? (clienteRec.getString('whatsapp') || clienteRec.getString('telefone') || '').trim()
              : ''
            if (!telDestino) {
              sucesso = false
              mensagemResultado = 'Cliente sem telefone/WhatsApp cadastrado para envio'
            } else {
              const textoFinal = formatTexto(
                configAcao.mensagem || 'Mensagem automática Delfos Solar',
              )
              const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
              const novaMsg = new Record(msgsCol)
              if (clienteRec) novaMsg.set('cliente_id', clienteRec.id)
              novaMsg.set('telefone_destino', telDestino)
              novaMsg.set('conteudo_final', textoFinal)
              novaMsg.set('tipo_disparo', 'automacao_' + gatilho)
              novaMsg.set('direcao', 'enviada')
              if (refKey) novaMsg.set('referencia_id', refKey)

              let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim()
              let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim()
              let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim()

              if (!rawApiUrl) {
                novaMsg.set('status', 'falha')
                novaMsg.set('log_erro', 'Gateway WhatsApp não configurado nos Secrets do backend')
                $app.save(novaMsg)
                sucesso = false
                mensagemResultado =
                  'Falha: Gateway WhatsApp não configurado nos Secrets (WHATSAPP_API_URL)'
              } else {
                let cleanPhone = telDestino.replace(/\D/g, '')
                if (
                  cleanPhone.length >= 10 &&
                  cleanPhone.length <= 11 &&
                  !cleanPhone.startsWith('55')
                ) {
                  cleanPhone = '55' + cleanPhone
                }
                let cleanUrl = rawApiUrl.replace(/\/+$/, '')
                if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                  cleanUrl = 'https://' + cleanUrl
                }
                const lowerUrl = cleanUrl.toLowerCase()
                const isZApi =
                  lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1
                let targetUrl = cleanUrl
                let payloadGateway = {}
                const headers = { 'Content-Type': 'application/json' }

                if (isZApi) {
                  let baseWithoutSuffix = cleanUrl
                    .replace(/\/+send-text\/?$/i, '')
                    .replace(/\/+$/, '')
                  const zapiMatch = baseWithoutSuffix.match(
                    /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
                  )
                  if (zapiMatch) {
                    targetUrl = `${zapiMatch[1]}/instances/${zapiMatch[2]}/token/${zapiMatch[3]}/send-text`
                  } else {
                    targetUrl = baseWithoutSuffix + '/send-text'
                  }
                  if (apiKey) headers['Client-Token'] = apiKey
                  payloadGateway = { phone: cleanPhone, message: textoFinal }
                } else {
                  if (apiKey) {
                    headers['apikey'] = apiKey
                    headers['Authorization'] = 'Bearer ' + apiKey
                    headers['X-Api-Key'] = apiKey
                  }
                  payloadGateway = {
                    number: cleanPhone,
                    phone: cleanPhone,
                    message: textoFinal,
                    text: textoFinal,
                    sender: originNumber,
                  }
                }

                try {
                  const res = $http.send({
                    url: targetUrl,
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payloadGateway),
                    timeout: 15,
                  })
                  if (res.statusCode >= 200 && res.statusCode < 300) {
                    let extId = ''
                    try {
                      if (res.json) {
                        if (res.json.messageId) extId = String(res.json.messageId)
                        else if (res.json.id) extId = String(res.json.id)
                        else if (res.json.zaapId) extId = String(res.json.zaapId)
                      }
                    } catch (_) {}
                    novaMsg.set('status', 'enviada')
                    novaMsg.set('enviado_em', new Date().toISOString())
                    if (extId) novaMsg.set('id_externo_gateway', extId)
                    novaMsg.set('log_erro', '')
                    $app.save(novaMsg)
                    sucesso = true
                    mensagemResultado = `WhatsApp enviado para ${cleanPhone}`
                    payloadGravado = { telefone: cleanPhone, gateway_id: extId }
                  } else {
                    const errStr = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
                    novaMsg.set('status', 'falha')
                    novaMsg.set('log_erro', `Gateway HTTP ${res.statusCode}: ${errStr}`)
                    $app.save(novaMsg)
                    sucesso = false
                    mensagemResultado = `Erro no envio WhatsApp (${res.statusCode}): ${errStr}`
                  }
                } catch (httpErr) {
                  const errStr = httpErr && httpErr.message ? httpErr.message : String(httpErr)
                  novaMsg.set('status', 'falha')
                  novaMsg.set('log_erro', `Erro de conexão: ${errStr}`)
                  $app.save(novaMsg)
                  sucesso = false
                  mensagemResultado = `Exceção WhatsApp: ${errStr}`
                }
              }
            }
          } else if (acao === 'enviar_email') {
            const assuntoFinal = formatTexto(configAcao.assunto || 'Contato Delfos Solar')
            const corpoFinal = formatTexto(configAcao.corpo || 'Mensagem automática Delfos Solar')
            const emailDestino = clienteRec ? clienteRec.getString('email') : ''
            if (!emailDestino) {
              sucesso = false
              mensagemResultado = 'Cliente sem e-mail cadastrado'
            } else {
              let emailEnviado = false
              try {
                const mailClient = $app.newMailClient()
                if (mailClient) {
                  const message = new MailerMessage({
                    from: {
                      address:
                        $app.settings().meta.senderAddress || 'contato@delfosengenharia.com.br',
                      name: $app.settings().meta.senderName || 'Delfos Solar',
                    },
                    to: [{ address: emailDestino }],
                    subject: assuntoFinal,
                    html: corpoFinal,
                  })
                  mailClient.send(message)
                  emailEnviado = true
                  sucesso = true
                  mensagemResultado = `E-mail enviado para ${emailDestino} com sucesso`
                }
              } catch (_) {}
              if (!emailEnviado) {
                sucesso = false
                mensagemResultado =
                  'Falha no envio: servidor de e-mail (SMTP) não configurado na plataforma'
              }
            }
            payloadGravado = { assunto: assuntoFinal, destinatario: emailDestino }
          } else if (acao === 'mudar_status') {
            const novoStatus = configAcao.novo_status || configAcao.status
            if (!clienteRec) {
              sucesso = false
              mensagemResultado = 'Nenhum cliente associado para alteração de status'
            } else if (!novoStatus) {
              sucesso = false
              mensagemResultado = 'Status de destino não definido na ação'
            } else {
              const statusAnterior = clienteRec.getString('status')
              clienteRec.set('status', novoStatus)
              $app.save(clienteRec)
              sucesso = true
              mensagemResultado = `Status do cliente alterado de "${statusAnterior}" para "${novoStatus}"`
              payloadGravado = { status_anterior: statusAnterior, novo_status: novoStatus }
            }
          }
        } catch (errExecAcao) {
          sucesso = false
          mensagemResultado = `Erro na execução da ação: ${errExecAcao && errExecAcao.message ? errExecAcao.message : String(errExecAcao)}`
        }

        // Gravar histórico
        try {
          const novaExec = new Record(execCol)
          novaExec.set('automacao', automacaoId)
          novaExec.set('data_execucao', new Date().toISOString())
          novaExec.set('sucesso', sucesso)
          novaExec.set('mensagem', mensagemResultado)
          if (refKey) novaExec.set('referencia_registro', refKey)
          if (clienteRec) novaExec.set('cliente', clienteRec.id)
          novaExec.set('dados_execucao', {
            payload: payloadGravado,
            contexto: item.dadosContexto || {},
          })
          $app.save(novaExec)
        } catch (errSaveExec) {
          console.log('[AUTOMACOES CRON ERRO AO SALVAR EXEC]', errSaveExec)
        }
      }
    }
  } catch (errGeralCron) {
    console.log('[AUTOMACOES WORKER CRON ERRO GERAL]', errGeralCron)
  }
})

// ENDPOINT MANUAL: POST /backend/v1/automacoes/run
routerAdd('POST', '/backend/v1/automacoes/run', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const automacaoId = (body.automacao_id || '').trim()
    const clienteId = (body.cliente_id || '').trim()
    const force = Boolean(body.force)

    if (!automacaoId) {
      return e.json(400, { error: 'automacao_id é obrigatório para execução manual', ok: false })
    }

    const autoRec = $app.findRecordsByFilter('automacoes', `id = '${automacaoId}'`, '', 1, 0)[0]
    if (!autoRec) {
      return e.json(404, { error: 'Automação não encontrada', ok: false })
    }

    let clienteRec = null
    if (clienteId) {
      clienteRec = $app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)[0]
    } else {
      const cliList = $app.findRecordsByFilter('clientes', '', '-created', 1, 0)
      if (cliList && cliList.length > 0) clienteRec = cliList[0]
    }

    const refKey = force
      ? `manual_force_${automacaoId}_${new Date().getTime()}`
      : `manual_run_${automacaoId}_${clienteRec ? clienteRec.id : 'none'}`

    const execCol = $app.findCollectionByNameOrId('automacoes_execucoes')

    if (!force && refKey) {
      try {
        const jaExec = $app.findRecordsByFilter(
          execCol.id,
          `automacao = '${automacaoId}' && referencia_registro = '${refKey}'`,
          '',
          1,
          0,
        )
        if (jaExec && jaExec.length > 0) {
          return e.json(200, {
            ok: true,
            skipped: true,
            mensagem:
              'Automação já foi executada para este contexto (idempotente). Use force: true para repetir teste.',
          })
        }
      } catch (_) {}
    }

    const acao = autoRec.getString('acao')
    let configAcao = {}
    try {
      const rawA = autoRec.get('configuracao_acao')
      configAcao = typeof rawA === 'string' ? JSON.parse(rawA) : rawA || {}
    } catch (_) {}

    const clienteNome = clienteRec ? clienteRec.getString('nome') : 'Cliente'
    const empresaNome = 'Delfos Solar'
    const formatTexto = (str) => {
      if (!str) return ''
      return String(str)
        .replace(/\{\{cliente_nome\}\}/g, clienteNome)
        .replace(/\{\{nome_cliente\}\}/g, clienteNome)
        .replace(/\{\{empresa_nome\}\}/g, empresaNome)
    }

    let sucesso = false
    let mensagemResultado = ''
    let payloadGravado = {}

    try {
      if (acao === 'criar_atividade') {
        const atvCol = $app.findCollectionByNameOrId('atividades')
        const novaAtv = new Record(atvCol)
        if (clienteRec) novaAtv.set('cliente_id', clienteRec.id)
        const tituloFinal = formatTexto(configAcao.titulo || autoRec.getString('nome'))
        const descFinal = formatTexto(
          configAcao.descricao || 'Atividade gerada por automação Delfos Solar',
        )
        const tipoFinal = configAcao.tipo_atividade || configAcao.tipo || 'follow_up'

        novaAtv.set('titulo', tituloFinal)
        novaAtv.set('descricao', descFinal)
        novaAtv.set('tipo', tipoFinal)
        novaAtv.set('status', 'pendente')
        novaAtv.set('data', new Date().toISOString())
        novaAtv.set('autor', 'Automação Delfos')
        if (clienteRec && clienteRec.getString('responsavel_id')) {
          novaAtv.set('responsavel_id', clienteRec.getString('responsavel_id'))
          novaAtv.set('responsavel_nome', clienteRec.getString('responsavel_nome'))
        }
        $app.save(novaAtv)
        sucesso = true
        mensagemResultado = `Atividade criada: "${tituloFinal}" (ID: ${novaAtv.id})`
        payloadGravado = { atividade_id: novaAtv.id, titulo: tituloFinal, tipo: tipoFinal }
      } else if (acao === 'enviar_whatsapp') {
        const telDestino = clienteRec
          ? (clienteRec.getString('whatsapp') || clienteRec.getString('telefone') || '').trim()
          : ''
        if (!telDestino) {
          sucesso = false
          mensagemResultado = 'Cliente sem telefone/WhatsApp cadastrado para envio'
        } else {
          const textoFinal = formatTexto(configAcao.mensagem || 'Mensagem automática Delfos Solar')
          const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
          const novaMsg = new Record(msgsCol)
          if (clienteRec) novaMsg.set('cliente_id', clienteRec.id)
          novaMsg.set('telefone_destino', telDestino)
          novaMsg.set('conteudo_final', textoFinal)
          novaMsg.set('tipo_disparo', 'automacao_manual')
          novaMsg.set('direcao', 'enviada')
          novaMsg.set('referencia_id', refKey)

          let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim()
          let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim()
          let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim()

          if (!rawApiUrl) {
            novaMsg.set('status', 'falha')
            novaMsg.set('log_erro', 'Gateway WhatsApp não configurado nos Secrets do backend')
            $app.save(novaMsg)
            sucesso = false
            mensagemResultado =
              'Falha: Gateway WhatsApp não configurado nos Secrets (WHATSAPP_API_URL)'
          } else {
            let cleanPhone = telDestino.replace(/\D/g, '')
            if (
              cleanPhone.length >= 10 &&
              cleanPhone.length <= 11 &&
              !cleanPhone.startsWith('55')
            ) {
              cleanPhone = '55' + cleanPhone
            }
            let cleanUrl = rawApiUrl.replace(/\/+$/, '')
            if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
              cleanUrl = 'https://' + cleanUrl
            }
            const lowerUrl = cleanUrl.toLowerCase()
            const isZApi =
              lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1
            let targetUrl = cleanUrl
            let payloadGateway = {}
            const headers = { 'Content-Type': 'application/json' }

            if (isZApi) {
              let baseWithoutSuffix = cleanUrl.replace(/\/+send-text\/?$/i, '').replace(/\/+$/, '')
              const zapiMatch = baseWithoutSuffix.match(
                /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
              )
              if (zapiMatch) {
                targetUrl = `${zapiMatch[1]}/instances/${zapiMatch[2]}/token/${zapiMatch[3]}/send-text`
              } else {
                targetUrl = baseWithoutSuffix + '/send-text'
              }
              if (apiKey) headers['Client-Token'] = apiKey
              payloadGateway = { phone: cleanPhone, message: textoFinal }
            } else {
              if (apiKey) {
                headers['apikey'] = apiKey
                headers['Authorization'] = 'Bearer ' + apiKey
                headers['X-Api-Key'] = apiKey
              }
              payloadGateway = {
                number: cleanPhone,
                phone: cleanPhone,
                message: textoFinal,
                text: textoFinal,
                sender: originNumber,
              }
            }

            try {
              const res = $http.send({
                url: targetUrl,
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payloadGateway),
                timeout: 15,
              })
              if (res.statusCode >= 200 && res.statusCode < 300) {
                let extId = ''
                try {
                  if (res.json) {
                    if (res.json.messageId) extId = String(res.json.messageId)
                    else if (res.json.id) extId = String(res.json.id)
                    else if (res.json.zaapId) extId = String(res.json.zaapId)
                  }
                } catch (_) {}
                novaMsg.set('status', 'enviada')
                novaMsg.set('enviado_em', new Date().toISOString())
                if (extId) novaMsg.set('id_externo_gateway', extId)
                novaMsg.set('log_erro', '')
                $app.save(novaMsg)
                sucesso = true
                mensagemResultado = `WhatsApp enviado para ${cleanPhone}`
                payloadGravado = { telefone: cleanPhone, gateway_id: extId }
              } else {
                const errStr = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
                novaMsg.set('status', 'falha')
                novaMsg.set('log_erro', `Gateway HTTP ${res.statusCode}: ${errStr}`)
                $app.save(novaMsg)
                sucesso = false
                mensagemResultado = `Erro no gateway WhatsApp (${res.statusCode}): ${errStr}`
              }
            } catch (httpErr) {
              const errStr = httpErr && httpErr.message ? httpErr.message : String(httpErr)
              novaMsg.set('status', 'falha')
              novaMsg.set('log_erro', `Erro de conexão: ${errStr}`)
              $app.save(novaMsg)
              sucesso = false
              mensagemResultado = `Exceção WhatsApp: ${errStr}`
            }
          }
        }
      } else if (acao === 'enviar_email') {
        const assuntoFinal = formatTexto(configAcao.assunto || 'Contato Delfos Solar')
        const corpoFinal = formatTexto(configAcao.corpo || 'Mensagem automática Delfos Solar')
        const emailDestino = clienteRec ? clienteRec.getString('email') : ''
        if (!emailDestino) {
          sucesso = false
          mensagemResultado = 'Cliente sem e-mail cadastrado'
        } else {
          let emailEnviado = false
          try {
            const mailClient = $app.newMailClient()
            if (mailClient) {
              const message = new MailerMessage({
                from: {
                  address: $app.settings().meta.senderAddress || 'contato@delfosengenharia.com.br',
                  name: $app.settings().meta.senderName || 'Delfos Solar',
                },
                to: [{ address: emailDestino }],
                subject: assuntoFinal,
                html: corpoFinal,
              })
              mailClient.send(message)
              emailEnviado = true
              sucesso = true
              mensagemResultado = `E-mail enviado para ${emailDestino} com sucesso`
            }
          } catch (_) {}
          if (!emailEnviado) {
            sucesso = false
            mensagemResultado =
              'Falha no envio: servidor de e-mail (SMTP) não configurado na plataforma'
          }
        }
        payloadGravado = { assunto: assuntoFinal, destinatario: emailDestino }
      } else if (acao === 'mudar_status') {
        const novoStatus = configAcao.novo_status || configAcao.status
        if (!clienteRec) {
          sucesso = false
          mensagemResultado = 'Nenhum cliente associado para alteração de status'
        } else if (!novoStatus) {
          sucesso = false
          mensagemResultado = 'Status de destino não definido na ação'
        } else {
          const statusAnterior = clienteRec.getString('status')
          clienteRec.set('status', novoStatus)
          $app.save(clienteRec)
          sucesso = true
          mensagemResultado = `Status do cliente alterado de "${statusAnterior}" para "${novoStatus}"`
          payloadGravado = { status_anterior: statusAnterior, novo_status: novoStatus }
        }
      }
    } catch (errExecManual) {
      sucesso = false
      mensagemResultado = `Erro na execução manual: ${errExecManual && errExecManual.message ? errExecManual.message : String(errExecManual)}`
    }

    try {
      const novaExec = new Record(execCol)
      novaExec.set('automacao', automacaoId)
      novaExec.set('data_execucao', new Date().toISOString())
      novaExec.set('sucesso', sucesso)
      novaExec.set('mensagem', mensagemResultado)
      novaExec.set('referencia_registro', refKey)
      if (clienteRec) novaExec.set('cliente', clienteRec.id)
      novaExec.set('dados_execucao', {
        payload: payloadGravado,
        contexto: {
          disparado_por: authUser.getString('name') || authUser.getString('email') || 'Usuário',
          origem: 'manual_run',
        },
      })
      $app.save(novaExec)
    } catch (errSaveExec) {
      console.log('[AUTOMACOES RUN SALVAR EXEC ERRO]', errSaveExec)
    }

    return e.json(200, {
      ok: true,
      sucesso: sucesso,
      mensagem: mensagemResultado,
      automacao: autoRec.getString('nome'),
      cliente: clienteRec ? clienteRec.getString('nome') : null,
    })
  } catch (errEndpoint) {
    const msg = errEndpoint && errEndpoint.message ? errEndpoint.message : String(errEndpoint)
    return e.json(500, { error: msg, ok: false })
  }
})
