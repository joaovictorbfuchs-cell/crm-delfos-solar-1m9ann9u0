// pocketbase/hooks/automacoes_triggers.js
// Disparos automáticos por eventos em tempo real para clientes, atividades e projetos

onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record
    const collectionName = record.collection().name

    let tipoGatilho = ''
    let clienteRec = null
    let refBase = ''
    let dadosContexto = {}
    let deveProcessar = false
    let matchConfigFn = (cfg) => true

    if (collectionName === 'clientes') {
      const novoStatus = record.getString('status')
      const statusAnterior = record.original().getString('status')
      const novaDataInst = record.getString('data_instalacao')
      const dataInstAnterior = record.original().getString('data_instalacao')

      if (novoStatus && novoStatus !== statusAnterior) {
        tipoGatilho = 'status_mudou'
        clienteRec = record
        refBase = `status_mudou_${record.id}_${statusAnterior}_to_${novoStatus}`
        dadosContexto = { status_anterior: statusAnterior, novo_status: novoStatus }
        deveProcessar = true
        matchConfigFn = (cfg) => {
          if (!cfg.status_alvo) return true
          return cfg.status_alvo === novoStatus
        }
      } else if (novaDataInst && !dataInstAnterior) {
        tipoGatilho = 'instalacao_concluida'
        clienteRec = record
        refBase = `instal_concluida_cli_${record.id}`
        dadosContexto = { data_instalacao: novaDataInst }
        deveProcessar = true
      }
    } else if (collectionName === 'atividades') {
      const novoStatus = record.getString('status')
      const statusAnterior = record.original().getString('status')
      const tipoAtividade = record.getString('tipo')

      if (novoStatus === 'concluida' && statusAnterior !== 'concluida') {
        tipoGatilho = 'atividade_concluida'
        const clienteId = record.getString('cliente_id')
        if (clienteId) {
          try {
            clienteRec = $app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)[0]
          } catch (_) {}
        }
        refBase = `atv_concluida_${record.id}`
        dadosContexto = {
          atividade_id: record.id,
          tipo_atividade: tipoAtividade,
          titulo: record.getString('titulo'),
        }
        deveProcessar = true
        matchConfigFn = (cfg) => {
          if (!cfg.tipo_atividade) return true
          return cfg.tipo_atividade === tipoAtividade
        }
      }
    } else if (collectionName === 'projetos') {
      const novaEtapa = record.getString('etapa')
      const etapaAnterior = record.original().getString('etapa')

      if (novaEtapa === 'Concluído' && etapaAnterior !== 'Concluído') {
        tipoGatilho = 'instalacao_concluida'
        const clienteId = record.getString('cliente_id')
        if (clienteId) {
          try {
            clienteRec = $app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)[0]
          } catch (_) {}
        }
        refBase = `proj_concluido_${record.id}`
        dadosContexto = { projeto_id: record.id, etapa: novaEtapa }
        deveProcessar = true
      }
    }

    if (!deveProcessar || !tipoGatilho) {
      return e.next()
    }

    let automacoes = []
    try {
      const autoCol = $app.findCollectionByNameOrId('automacoes')
      automacoes = $app.findRecordsByFilter(
        autoCol.id,
        `ativa = true && gatilho = '${tipoGatilho}'`,
        '',
        50,
        0,
      )
    } catch (errBusca) {
      console.log('[AUTOMACOES HOOK ERRO AO BUSCAR]', errBusca)
      return e.next()
    }

    const execCol = $app.findCollectionByNameOrId('automacoes_execucoes')

    for (let i = 0; i < automacoes.length; i++) {
      const automacao = automacoes[i]
      let configGatilho = {}
      try {
        const raw = automacao.get('configuracao_gatilho')
        configGatilho = typeof raw === 'string' ? JSON.parse(raw) : raw || {}
      } catch (_) {}

      if (!matchConfigFn(configGatilho)) {
        continue
      }

      const refKey = `${refBase}_auto_${automacao.id}`

      // Idempotência
      try {
        const jaExec = $app.findRecordsByFilter(
          execCol.id,
          `automacao = '${automacao.id}' && referencia_registro = '${refKey}'`,
          '',
          1,
          0,
        )
        if (jaExec && jaExec.length > 0) continue
      } catch (_) {}

      const acao = automacao.getString('acao')
      let configAcao = {}
      try {
        const rawAcao = automacao.get('configuracao_acao')
        configAcao = typeof rawAcao === 'string' ? JSON.parse(rawAcao) : rawAcao || {}
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
          const tituloFinal = formatTexto(configAcao.titulo || automacao.getString('nome'))
          const descFinal = formatTexto(
            configAcao.descricao || 'Atividade gerada automaticamente por evento',
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
          mensagemResultado = `Atividade criada: "${tituloFinal}"`
          payloadGravado = { atividade_id: novaAtv.id, titulo: tituloFinal }
        } else if (acao === 'enviar_whatsapp') {
          const telDestino = clienteRec
            ? (clienteRec.getString('whatsapp') || clienteRec.getString('telefone') || '').trim()
            : ''
          if (!telDestino) {
            sucesso = false
            mensagemResultado = 'Cliente sem telefone/WhatsApp para envio'
          } else {
            const textoFinal = formatTexto(
              configAcao.mensagem || 'Mensagem automática Delfos Solar',
            )
            const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
            const novaMsg = new Record(msgsCol)
            if (clienteRec) novaMsg.set('cliente_id', clienteRec.id)
            novaMsg.set('telefone_destino', telDestino)
            novaMsg.set('conteudo_final', textoFinal)
            novaMsg.set('tipo_disparo', 'automacao_' + tipoGatilho)
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
                  mensagemResultado = `Erro no gateway WhatsApp (${res.statusCode}): ${errStr}`
                }
              } catch (httpErr) {
                const errStr = httpErr && httpErr.message ? httpErr.message : String(httpErr)
                novaMsg.set('status', 'falha')
                novaMsg.set('log_erro', `Erro de conexão: ${errStr}`)
                $app.save(novaMsg)
                sucesso = false
                mensagemResultado = `Exceção ao disparar WhatsApp: ${errStr}`
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
      } catch (errExec) {
        sucesso = false
        mensagemResultado = `Erro na execução da ação: ${errExec && errExec.message ? errExec.message : String(errExec)}`
      }

      // Gravar histórico
      try {
        const novaExec = new Record(execCol)
        novaExec.set('automacao', automacao.id)
        novaExec.set('data_execucao', new Date().toISOString())
        novaExec.set('sucesso', sucesso)
        novaExec.set('mensagem', mensagemResultado)
        novaExec.set('referencia_registro', refKey)
        if (clienteRec) novaExec.set('cliente', clienteRec.id)
        novaExec.set('dados_execucao', {
          gatilho: tipoGatilho,
          payload: payloadGravado,
          contexto: dadosContexto || {},
        })
        $app.save(novaExec)
      } catch (errSave) {
        console.log('[AUTOMACOES TRIGGER GRAVAR EXEC ERRO]', errSave)
      }
    }
  } catch (errHook) {
    console.log('[AUTOMACOES HOOK TRIGGER ERRO GERAL]', errHook)
  }

  return e.next()
})
