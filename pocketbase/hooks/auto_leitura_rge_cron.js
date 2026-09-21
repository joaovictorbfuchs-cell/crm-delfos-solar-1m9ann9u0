// Hook de processamento de Cronograma de Auto Leitura - RGE
// Em PocketBase JSVM (goja), callbacks de cronAdd e routerAdd são isolados em VM pools distintas.
// Logo, toda lógica de execução fica inline dentro de cada handler.

// 1. Cron diário às 08:00 (cronAdd com 'auto_leitura_rge_cron' e '0 8 * * *')
cronAdd('auto_leitura_rge_cron', '0 8 * * *', () => {
  console.log(
    '[AUTO_LEITURA_RGE_CRON] Iniciando varredura diária de cronogramas de Auto Leitura RGE...',
  )
  try {
    const atvCol = $app.findCollectionByNameOrId('atividades')
    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')

    const atividadesAutoLeitura = $app.findRecordsByFilter(
      atvCol.id,
      "tipo = 'auto_leitura_rge'",
      '-created',
      500,
      0,
    )

    const hoje = new Date()
    hoje.setUTCHours(0, 0, 0, 0)
    const hojeStr = hoje.toISOString().slice(0, 10)

    for (let i = 0; i < atividadesAutoLeitura.length; i++) {
      const atv = atividadesAutoLeitura[i]
      const clienteId = atv.getString('cliente_id')
      if (!clienteId) continue

      let datas = []
      try {
        const rawDatas = atv.get('cronograma_datas')
        if (Array.isArray(rawDatas)) {
          datas = rawDatas
        } else if (typeof rawDatas === 'string' && rawDatas.trim().startsWith('[')) {
          datas = JSON.parse(rawDatas)
        }
      } catch (e) {
        continue
      }

      if (!datas || datas.length === 0) continue

      let clienteRec = null
      try {
        clienteRec = $app.findFirstRecordByData('clientes', 'id', clienteId)
      } catch (_) {}

      let nomeUsinaOuCliente = clienteRec ? clienteRec.getString('nome') : 'Cliente'
      let numeroInstalacao = clienteRec
        ? clienteRec.getString('uc') || 'Não informada'
        : 'Não informada'
      let enderecoInstalacao = clienteRec
        ? clienteRec.getString('usina_endereco') ||
          clienteRec.getString('endereco') ||
          'Não informado'
        : 'Não informado'

      const usinaId = atv.getString('usina_id')
      if (usinaId) {
        try {
          const usinaRec = $app.findFirstRecordByData('usinas', 'id', usinaId)
          if (usinaRec) {
            nomeUsinaOuCliente = usinaRec.getString('nome') || nomeUsinaOuCliente
            if (usinaRec.getString('numero_uc')) {
              numeroInstalacao = usinaRec.getString('numero_uc')
            }
            if (usinaRec.getString('endereco')) {
              enderecoInstalacao = usinaRec.getString('endereco')
            }
          }
        } catch (_) {}
      }

      // No CRM Delfos Solar o WhatsApp é o número autoritativo do cliente: fallback para telefone
      let telefoneDestino = ''
      if (clienteRec) {
        telefoneDestino = (
          clienteRec.getString('whatsapp') ||
          clienteRec.getString('telefone') ||
          ''
        ).trim()
      }

      for (let j = 0; j < datas.length; j++) {
        const item = datas[j]
        if (!item || !item.data) continue

        // Excluir as datas onde o Responsável é "Distribuidora" — essas não geram lembrete
        const responsavel = (item.responsavel || '').trim()
        if (responsavel.toLowerCase() === 'distribuidora') {
          continue
        }

        // Responsável é "Cliente"
        const dataPrevistaStr = String(item.data).slice(0, 10)
        const parts = dataPrevistaStr.split('-').map(Number)
        if (parts.length < 3) continue
        const anoP = parts[0]
        const mesP = parts[1]
        const diaP = parts[2]
        if (!anoP || !mesP || !diaP) continue

        const dataPrevista = new Date(Date.UTC(anoP, mesP - 1, diaP))
        const dataLembrete = new Date(dataPrevista.getTime())
        dataLembrete.setUTCDate(dataLembrete.getUTCDate() - 2)

        const dataLembreteStr = dataLembrete.toISOString().slice(0, 10)
        const dataFormatadaBr = `${String(diaP).padStart(2, '0')}/${String(mesP).padStart(2, '0')}/${anoP}`
        const tituloLembrete = `Lembrete Auto Leitura RGE - ${dataFormatadaBr}`

        // Verificação sem duplicatas para a mesma data
        const lembretesExistentes = $app.findRecordsByFilter(
          atvCol.id,
          `cliente_id = '${clienteId}' && titulo = '${tituloLembrete}'`,
          '-created',
          1,
          0,
        )

        const ehDiaDeDisparo =
          hojeStr === dataLembreteStr ||
          (hoje.getTime() >= dataLembrete.getTime() && hoje.getTime() <= dataPrevista.getTime())

        if (lembretesExistentes.length === 0) {
          const novoLembrete = new Record(atvCol)
          novoLembrete.set('cliente_id', clienteId)
          novoLembrete.set('tipo', 'auto_leitura_rge')
          novoLembrete.set('titulo', tituloLembrete)
          novoLembrete.set('status', 'pendente')
          novoLembrete.set('data', dataLembrete.toISOString())
          novoLembrete.set('autor', 'Sistema Delfos (Cronograma)')
          novoLembrete.set(
            'descricao',
            `Lembrete automático de Auto Leitura RGE agendado para 2 dias antes da leitura prevista (${dataFormatadaBr}). Responsável pela leitura: Cliente.`,
          )
          if (atv.getString('responsavel_id')) {
            novoLembrete.set('responsavel_id', atv.getString('responsavel_id'))
            novoLembrete.set('responsavel_nome', atv.getString('responsavel_nome'))
          }
          if (usinaId) {
            novoLembrete.set('usina_id', usinaId)
          }
          $app.save(novoLembrete)
        }

        // Disparar mensagem via Z-API existente 2 dias antes
        if (ehDiaDeDisparo && telefoneDestino) {
          const refMsg = `auto_leitura_${clienteId}_${dataPrevistaStr}`
          const msgJaEnviada = $app.findRecordsByFilter(
            msgsCol.id,
            `referencia_id = '${refMsg}' && (status = 'enviada' || status = 'entregue' || status = 'lida')`,
            '-created',
            1,
            0,
          )

          if (msgJaEnviada.length === 0) {
            // Texto EXATO da mensagem exigido pela especificação:
            const textoMensagem = `Olá, boa tarde!
Chegou o momento da leitura do seu medidor de energia na instalação da ${nomeUsinaOuCliente}.
Instalação consumidora: ${numeroInstalacao} Endereço: ${enderecoInstalacao}

Para garantirmos o correto envio das informações à RGE, pedimos que nos encaminhe um vídeo ou fotos do medidor, onde apareçam claramente as seguintes grandezas:
• 03 – Energia consumida (kWh)
• 103 – Energia injetada (kWh)

Após o envio das imagens, pedimos também que nos informe por escrito os valores das grandezas 03 e 103, para conferência e validação dos dados antes do envio à RGE.`

            const novaMsg = new Record(msgsCol)
            novaMsg.set('cliente_id', clienteId)
            novaMsg.set('telefone_destino', telefoneDestino)
            novaMsg.set('conteudo_final', textoMensagem)
            novaMsg.set('tipo_disparo', 'automatico_auto_leitura')
            novaMsg.set('direcao', 'enviada')
            novaMsg.set('referencia_id', refMsg)

            let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim()
            let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim()

            let cleanPhone = telefoneDestino.replace(/\D/g, '')
            if (
              cleanPhone.length >= 10 &&
              cleanPhone.length <= 11 &&
              !cleanPhone.startsWith('55')
            ) {
              cleanPhone = '55' + cleanPhone
            }

            if (!rawApiUrl) {
              novaMsg.set('status', 'falha')
              novaMsg.set('log_erro', 'Gateway WhatsApp não configurado nos Secrets do backend')
              $app.save(novaMsg)
            } else {
              try {
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
                    targetUrl = `${baseWithoutSuffix}/send-text`
                  }
                  if (apiKey) {
                    headers['Client-Token'] = apiKey
                  }
                  payloadGateway = {
                    phone: cleanPhone,
                    message: textoMensagem,
                  }
                } else {
                  if (apiKey) {
                    headers['apikey'] = apiKey
                    headers['Authorization'] = 'Bearer ' + apiKey
                  }
                  payloadGateway = {
                    number: cleanPhone,
                    phone: cleanPhone,
                    message: textoMensagem,
                    text: textoMensagem,
                  }
                }

                const res = $http.send({
                  url: targetUrl,
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(payloadGateway),
                  timeout: 15,
                })

                if (res.statusCode >= 200 && res.statusCode < 300) {
                  let externalId = ''
                  try {
                    if (res.json && (res.json.messageId || res.json.id || res.json.zaapId)) {
                      externalId = String(res.json.messageId || res.json.id || res.json.zaapId)
                    }
                  } catch (_) {}

                  novaMsg.set('status', 'enviada')
                  novaMsg.set('enviado_em', new Date().toISOString())
                  if (externalId) novaMsg.set('id_externo_gateway', externalId)
                  novaMsg.set('log_erro', '')
                  $app.save(novaMsg)
                } else {
                  const errText = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
                  novaMsg.set('status', 'falha')
                  novaMsg.set('log_erro', `Erro gateway (${res.statusCode}): ${errText}`)
                  $app.save(novaMsg)
                }
              } catch (httpErr) {
                novaMsg.set('status', 'falha')
                novaMsg.set(
                  'log_erro',
                  `Exceção ao disparar: ${httpErr.message || String(httpErr)}`,
                )
                $app.save(novaMsg)
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.log('[AUTO_LEITURA_RGE_CRON ERRO GERAL]:', err)
  }
})

// 2. Rota manual sob demanda para acionamento pelo frontend
routerAdd('POST', '/backend/v1/auto-leitura/gerar-lembretes', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const atividadeId = body.atividade_id || ''

    const atvCol = $app.findCollectionByNameOrId('atividades')
    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')

    let filter = "tipo = 'auto_leitura_rge'"
    if (atividadeId) {
      filter += ` && id = '${atividadeId}'`
    }

    const atividadesAutoLeitura = $app.findRecordsByFilter(atvCol.id, filter, '-created', 50, 0)

    const hoje = new Date()
    hoje.setUTCHours(0, 0, 0, 0)
    const hojeStr = hoje.toISOString().slice(0, 10)
    let lembretesCriados = 0

    for (let i = 0; i < atividadesAutoLeitura.length; i++) {
      const atv = atividadesAutoLeitura[i]
      const clienteId = atv.getString('cliente_id')
      if (!clienteId) continue

      let datas = []
      try {
        const rawDatas = atv.get('cronograma_datas')
        if (Array.isArray(rawDatas)) {
          datas = rawDatas
        } else if (typeof rawDatas === 'string' && rawDatas.trim().startsWith('[')) {
          datas = JSON.parse(rawDatas)
        }
      } catch (_) {
        continue
      }

      if (!datas || datas.length === 0) continue

      let clienteRec = null
      try {
        clienteRec = $app.findFirstRecordByData('clientes', 'id', clienteId)
      } catch (_) {}

      let nomeUsinaOuCliente = clienteRec ? clienteRec.getString('nome') : 'Cliente'
      let numeroInstalacao = clienteRec
        ? clienteRec.getString('uc') || 'Não informada'
        : 'Não informada'
      let enderecoInstalacao = clienteRec
        ? clienteRec.getString('usina_endereco') ||
          clienteRec.getString('endereco') ||
          'Não informado'
        : 'Não informado'

      const usinaId = atv.getString('usina_id')
      if (usinaId) {
        try {
          const usinaRec = $app.findFirstRecordByData('usinas', 'id', usinaId)
          if (usinaRec) {
            nomeUsinaOuCliente = usinaRec.getString('nome') || nomeUsinaOuCliente
            if (usinaRec.getString('numero_uc')) numeroInstalacao = usinaRec.getString('numero_uc')
            if (usinaRec.getString('endereco')) enderecoInstalacao = usinaRec.getString('endereco')
          }
        } catch (_) {}
      }

      let telefoneDestino = clienteRec
        ? (clienteRec.getString('whatsapp') || clienteRec.getString('telefone') || '').trim()
        : ''

      for (let j = 0; j < datas.length; j++) {
        const item = datas[j]
        if (!item || !item.data) continue

        // Excluir as datas onde o Responsável é "Distribuidora" — essas não geram lembrete
        const responsavel = (item.responsavel || '').trim()
        if (responsavel.toLowerCase() === 'distribuidora') {
          continue
        }

        const dataPrevistaStr = String(item.data).slice(0, 10)
        const parts = dataPrevistaStr.split('-').map(Number)
        if (parts.length < 3) continue
        const anoP = parts[0]
        const mesP = parts[1]
        const diaP = parts[2]
        if (!anoP || !mesP || !diaP) continue

        const dataPrevista = new Date(Date.UTC(anoP, mesP - 1, diaP))
        const dataLembrete = new Date(dataPrevista.getTime())
        dataLembrete.setUTCDate(dataLembrete.getUTCDate() - 2)

        const dataLembreteStr = dataLembrete.toISOString().slice(0, 10)
        const dataFormatadaBr = `${String(diaP).padStart(2, '0')}/${String(mesP).padStart(2, '0')}/${anoP}`
        const tituloLembrete = `Lembrete Auto Leitura RGE - ${dataFormatadaBr}`

        const lembretesExistentes = $app.findRecordsByFilter(
          atvCol.id,
          `cliente_id = '${clienteId}' && titulo = '${tituloLembrete}'`,
          '-created',
          1,
          0,
        )

        if (lembretesExistentes.length === 0) {
          const novoLembrete = new Record(atvCol)
          novoLembrete.set('cliente_id', clienteId)
          novoLembrete.set('tipo', 'auto_leitura_rge')
          novoLembrete.set('titulo', tituloLembrete)
          novoLembrete.set('status', 'pendente')
          novoLembrete.set('data', dataLembrete.toISOString())
          novoLembrete.set('autor', 'Sistema Delfos (Cronograma)')
          novoLembrete.set(
            'descricao',
            `Lembrete automático de Auto Leitura RGE agendado para 2 dias antes da leitura prevista (${dataFormatadaBr}). Responsável pela leitura: Cliente.`,
          )
          if (atv.getString('responsavel_id')) {
            novoLembrete.set('responsavel_id', atv.getString('responsavel_id'))
            novoLembrete.set('responsavel_nome', atv.getString('responsavel_nome'))
          }
          if (usinaId) {
            novoLembrete.set('usina_id', usinaId)
          }
          $app.save(novoLembrete)
          lembretesCriados++
        }
      }
    }

    return e.json(200, {
      ok: true,
      message: `Processamento concluído. ${lembretesCriados} novo(s) lembrete(s) gerado(s).`,
      lembretesCriados,
    })
  } catch (err) {
    return e.json(500, { ok: false, error: err.message || String(err) })
  }
})
