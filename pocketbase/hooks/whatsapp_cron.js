// Job periódico (a cada 2 minutos) que:
// 1. Processa fila de mensagens agendadas com data/hora vencida
// 2. Dispara lembretes de visitas técnicas agendadas para o dia seguinte (se não enviadas)
// 3. Dispara follow-up pós-venda para instalações concluídas há mais de 7 dias (se não enviadas)
cronAdd('whatsapp_worker', '*/2 * * * *', () => {
  try {
    const now = new Date()
    const nowIso = now.toISOString()
    const apiUrl = $os.getenv('WHATSAPP_API_URL') || ''
    const apiKey = $os.getenv('WHATSAPP_API_KEY') || ''
    const originNumber = $os.getenv('WHATSAPP_ORIGIN_NUMBER') || ''

    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')
    const tplsCol = $app.findCollectionByNameOrId('whatsapp_templates')

    // -------------------------------------------------------------
    // PARTE 1: PROCESSAR FILA DE MENSAGENS AGENDADAS
    // -------------------------------------------------------------
    try {
      // Buscar mensagens agendadas cuja data agendada <= now
      const filterAgendadas = `status = 'agendada' && agendado_para <= '${nowIso}'`
      const agendadas = $app.findRecordsByFilter(
        msgsCol.id,
        filterAgendadas,
        'agendado_para',
        20,
        0,
      )

      for (let i = 0; i < agendadas.length; i++) {
        const msg = agendadas[i]
        const dest = (msg.getString('telefone_destino') || '').trim()
        const texto = msg.getString('conteudo_final') || ''

        if (!dest || !texto) {
          msg.set('status', 'falha')
          msg.set('log_erro', 'Telefone ou mensagem vazia na fila agendada')
          $app.save(msg)
          continue
        }

        if (!apiUrl) {
          msg.set('status', 'falha')
          msg.set(
            'log_erro',
            'Gateway não configurado no envio agendado (defina WHATSAPP_API_URL nos Secrets).',
          )
          $app.save(msg)
          continue
        }

        let cleanPhone = dest.replace(/\D/g, '')
        if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }

        try {
          const headers = { 'Content-Type': 'application/json' }
          if (apiKey) {
            headers['apikey'] = apiKey
            headers['Authorization'] = 'Bearer ' + apiKey
            headers['X-Api-Key'] = apiKey
          }

          let targetUrl = apiUrl
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl
          }

          const res = $http.send({
            url: targetUrl,
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              number: cleanPhone,
              phone: cleanPhone,
              message: texto,
              text: texto,
              sender: originNumber,
            }),
            timeout: 15,
          })

          if (res.statusCode >= 200 && res.statusCode < 300) {
            let externalId = ''
            try {
              if (res.json && res.json.id) externalId = String(res.json.id)
              else if (res.json && res.json.key && res.json.key.id)
                externalId = String(res.json.key.id)
            } catch (_) {}

            msg.set('status', 'enviada')
            msg.set('enviado_em', new Date().toISOString())
            if (externalId) msg.set('id_externo_gateway', externalId)
            msg.set('log_erro', '')
            $app.save(msg)
          } else {
            const errStr = res.raw ? res.raw.substring(0, 200) : `HTTP ${res.statusCode}`
            msg.set('status', 'falha')
            msg.set('log_erro', `Gateway erro HTTP ${res.statusCode}: ${errStr}`)
            $app.save(msg)
          }
        } catch (httpErr) {
          const errStr = httpErr && httpErr.message ? httpErr.message : String(httpErr)
          msg.set('status', 'falha')
          msg.set('log_erro', `Falha de rede ao disparar agendado: ${errStr}`)
          $app.save(msg)
        }
      }
    } catch (errFila) {
      console.log('Erro ao processar fila agendada WhatsApp:', errFila)
    }

    // -------------------------------------------------------------
    // PARTE 2: DISPARO AUTOMÁTICO DE LEMBRETE DE VISITA TÉCNICA
    // Atividades do tipo 'visita_tecnica' agendadas para amanhã
    // -------------------------------------------------------------
    try {
      // Obter template de lembrete
      let tplLembrete = null
      try {
        tplLembrete = $app.findFirstRecordByData(
          'whatsapp_templates',
          'slug',
          'lembrete_visita_tecnica',
        )
      } catch (_) {}

      if (tplLembrete && tplLembrete.getBool('ativo') !== false) {
        // Calcular janela de amanhã (entre agora + 12h e agora + 36h)
        const amanhaInicio = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()
        const amanhaFim = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString()

        const filterVisitas = `tipo = 'visita_tecnica' && status = 'pendente' && data >= '${amanhaInicio}' && data <= '${amanhaFim}'`
        const visitas = $app.findRecordsByFilter('atividades', filterVisitas, 'data', 20, 0)

        for (let j = 0; j < visitas.length; j++) {
          const atv = visitas[j]
          const clienteId = atv.getString('cliente_id')
          const refKey = 'visita_' + atv.id

          // Verificar idempotência: já existe mensagem disparada para essa atividade?
          try {
            const jaEnviado = $app.findRecordsByFilter(
              msgsCol.id,
              `referencia_id = '${refKey}'`,
              '',
              1,
              0,
            )
            if (jaEnviado && jaEnviado.length > 0) {
              continue // Idempotente: já disparado
            }
          } catch (_) {}

          let clienteRec = null
          try {
            clienteRec = $app.findCollectionByNameOrId('clientes')
            clienteRec = $app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)[0]
          } catch (_) {}

          if (!clienteRec) continue

          const telCliente = (
            clienteRec.getString('whatsapp') ||
            clienteRec.getString('telefone') ||
            ''
          ).trim()
          if (!telCliente) continue

          // Formatar data da visita
          let dataVisitaStr = atv.getString('data')
          try {
            const d = new Date(dataVisitaStr)
            dataVisitaStr =
              d.toLocaleDateString('pt-BR') +
              ' às ' +
              d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          } catch (_) {}

          const enderecoCliente =
            [
              clienteRec.getString('endereco'),
              clienteRec.getString('numero'),
              clienteRec.getString('bairro'),
              clienteRec.getString('cidade'),
            ]
              .filter(Boolean)
              .join(', ') || 'endereço cadastrado'

          let tplTexto = tplLembrete.getString('conteudo')
          tplTexto = tplTexto
            .replace(/\{\{nome_cliente\}\}/g, clienteRec.getString('nome'))
            .replace(/\{\{data\}\}/g, dataVisitaStr)
            .replace(/\{\{endereco\}\}/g, enderecoCliente)

          // Criar registro de mensagem com tipo_disparo = lembrete_visita
          const novaMsg = new Record(msgsCol)
          novaMsg.set('cliente_id', clienteId)
          novaMsg.set('template_id', tplLembrete.id)
          novaMsg.set('telefone_destino', telCliente)
          novaMsg.set('conteudo_final', tplTexto)
          novaMsg.set('tipo_disparo', 'lembrete_visita')
          novaMsg.set('referencia_id', refKey)

          if (!apiUrl) {
            novaMsg.set('status', 'falha')
            novaMsg.set('log_erro', 'Gateway não configurado nos Secrets do backend')
            $app.save(novaMsg)
            continue
          }

          // Enviar via HTTP
          let cleanPhone = telCliente.replace(/\D/g, '')
          if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone
          }

          try {
            const headers = { 'Content-Type': 'application/json' }
            if (apiKey) {
              headers['apikey'] = apiKey
              headers['Authorization'] = 'Bearer ' + apiKey
              headers['X-Api-Key'] = apiKey
            }
            let targetUrl = apiUrl
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
              targetUrl = 'https://' + targetUrl
            }
            const res = $http.send({
              url: targetUrl,
              method: 'POST',
              headers: headers,
              body: JSON.stringify({
                number: cleanPhone,
                phone: cleanPhone,
                message: tplTexto,
                text: tplTexto,
                sender: originNumber,
              }),
              timeout: 15,
            })

            if (res.statusCode >= 200 && res.statusCode < 300) {
              let extId = ''
              try {
                if (res.json && res.json.id) extId = String(res.json.id)
              } catch (_) {}
              novaMsg.set('status', 'enviada')
              novaMsg.set('enviado_em', new Date().toISOString())
              if (extId) novaMsg.set('id_externo_gateway', extId)
              novaMsg.set('log_erro', '')
            } else {
              novaMsg.set('status', 'falha')
              novaMsg.set('log_erro', `Gateway HTTP ${res.statusCode}`)
            }
          } catch (sendErr) {
            novaMsg.set('status', 'falha')
            novaMsg.set('log_erro', String(sendErr))
          }

          $app.save(novaMsg)
        }
      }
    } catch (errVisita) {
      console.log('Erro ao checar lembretes de visita técnica:', errVisita)
    }

    // -------------------------------------------------------------
    // PARTE 3: DISPARO AUTOMÁTICO DE FOLLOW-UP PÓS-VENDA
    // Instalações concluídas há mais de 7 dias (clientes ou sistemas com data_instalacao <= now - 7 dias)
    // -------------------------------------------------------------
    try {
      let tplFollowup = null
      try {
        tplFollowup = $app.findFirstRecordByData('whatsapp_templates', 'slug', 'followup_pos_venda')
      } catch (_) {}

      if (tplFollowup && tplFollowup.getBool('ativo') !== false) {
        // Data limite: 7 dias atrás
        const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

        // Buscar clientes com data_instalacao preenchida <= seteDiasAtras
        const filterInstalados = `data_instalacao != '' && data_instalacao != null && data_instalacao <= '${seteDiasAtras}'`
        const instalados = $app.findRecordsByFilter(
          'clientes',
          filterInstalados,
          '-data_instalacao',
          30,
          0,
        )

        for (let k = 0; k < instalados.length; k++) {
          const cliente = instalados[k]
          const refKey = 'followup_' + cliente.id

          // Verificar idempotência
          try {
            const jaEnviado = $app.findRecordsByFilter(
              msgsCol.id,
              `referencia_id = '${refKey}'`,
              '',
              1,
              0,
            )
            if (jaEnviado && jaEnviado.length > 0) {
              continue // Já recebeu follow-up
            }
          } catch (_) {}

          const telCliente = (
            cliente.getString('whatsapp') ||
            cliente.getString('telefone') ||
            ''
          ).trim()
          if (!telCliente) continue

          const enderecoCliente =
            [
              cliente.getString('endereco'),
              cliente.getString('numero'),
              cliente.getString('bairro'),
              cliente.getString('cidade'),
            ]
              .filter(Boolean)
              .join(', ') || 'seu endereço'

          let tplTexto = tplFollowup.getString('conteudo')
          tplTexto = tplTexto
            .replace(/\{\{nome_cliente\}\}/g, cliente.getString('nome'))
            .replace(/\{\{endereco\}\}/g, enderecoCliente)
            .replace(/\{\{data\}\}/g, new Date().toLocaleDateString('pt-BR'))

          const novaMsg = new Record(msgsCol)
          novaMsg.set('cliente_id', cliente.id)
          novaMsg.set('template_id', tplFollowup.id)
          novaMsg.set('telefone_destino', telCliente)
          novaMsg.set('conteudo_final', tplTexto)
          novaMsg.set('tipo_disparo', 'followup_posvenda')
          novaMsg.set('referencia_id', refKey)

          if (!apiUrl) {
            novaMsg.set('status', 'falha')
            novaMsg.set('log_erro', 'Gateway não configurado nos Secrets do backend')
            $app.save(novaMsg)
            continue
          }

          let cleanPhone = telCliente.replace(/\D/g, '')
          if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone
          }

          try {
            const headers = { 'Content-Type': 'application/json' }
            if (apiKey) {
              headers['apikey'] = apiKey
              headers['Authorization'] = 'Bearer ' + apiKey
              headers['X-Api-Key'] = apiKey
            }
            let targetUrl = apiUrl
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
              targetUrl = 'https://' + targetUrl
            }
            const res = $http.send({
              url: targetUrl,
              method: 'POST',
              headers: headers,
              body: JSON.stringify({
                number: cleanPhone,
                phone: cleanPhone,
                message: tplTexto,
                text: tplTexto,
                sender: originNumber,
              }),
              timeout: 15,
            })

            if (res.statusCode >= 200 && res.statusCode < 300) {
              let extId = ''
              try {
                if (res.json && res.json.id) extId = String(res.json.id)
              } catch (_) {}
              novaMsg.set('status', 'enviada')
              novaMsg.set('enviado_em', new Date().toISOString())
              if (extId) novaMsg.set('id_externo_gateway', extId)
              novaMsg.set('log_erro', '')
            } else {
              novaMsg.set('status', 'falha')
              novaMsg.set('log_erro', `Gateway HTTP ${res.statusCode}`)
            }
          } catch (sendErr) {
            novaMsg.set('status', 'falha')
            novaMsg.set('log_erro', String(sendErr))
          }

          $app.save(novaMsg)
        }
      }
    } catch (errFollowup) {
      console.log('Erro ao checar follow-ups pós-venda:', errFollowup)
    }
  } catch (errGeral) {
    console.log('Erro no cron whatsapp_worker:', errGeral)
  }
})
