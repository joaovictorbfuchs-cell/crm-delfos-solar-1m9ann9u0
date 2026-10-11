// Job periódico (a cada 2 minutos) que:
// 1. Processa fila de mensagens agendadas com data/hora vencida
// 2. Dispara lembretes de visitas técnicas agendadas para o dia seguinte (se não enviadas)
// 3. Dispara follow-up pós-venda para instalações concluídas há mais de 7 dias (se não enviadas)
cronAdd('whatsapp_worker', '*/2 * * * *', () => {
  try {
    const now = new Date()
    // Normalizar formato de data para o padrão do PocketBase (espaço em vez de 'T')
    // para comparação lexicográfica correta contra campos datetime do banco.
    const nowIso = now.toISOString().replace('T', ' ')
    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim()
    rawApiUrl = rawApiUrl.replace(/[\r\n\t]/g, '').trim()

    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim()
    apiKey = apiKey.replace(/[\r\n\t]/g, '').trim()

    let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim()
    originNumber = originNumber.replace(/[\r\n\t]/g, '').trim()

    const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')

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

        if (!rawApiUrl) {
          msg.set('status', 'falha')
          msg.set(
            'log_erro',
            'Gateway não configurado no envio agendado (defina WHATSAPP_API_URL nos Secrets).',
          )
          $app.save(msg)
          continue
        }

        let cleanPhone = dest.replace(/\D/g, '')
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }

        try {
          let cleanUrl = rawApiUrl.replace(/\/+$/, '')
          if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl
          }

          const lowerUrl = cleanUrl.toLowerCase()
          const isZApi = lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1
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

            if (apiKey) {
              headers['Client-Token'] = apiKey
            }
            payloadGateway = {
              phone: cleanPhone,
              message: texto,
            }
          } else {
            if (apiKey) {
              headers['apikey'] = apiKey
              headers['Authorization'] = 'Bearer ' + apiKey
              headers['X-Api-Key'] = apiKey
            }
            payloadGateway = {
              number: cleanPhone,
              phone: cleanPhone,
              message: texto,
              text: texto,
              sender: originNumber,
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
              if (res.json) {
                if (res.json.messageId) externalId = String(res.json.messageId)
                else if (res.json.id) externalId = String(res.json.id)
                else if (res.json.zaapId) externalId = String(res.json.zaapId)
                else if (res.json.key && res.json.key.id) externalId = String(res.json.key.id)
              }
            } catch (_) {}

            msg.set('status', 'enviada')
            msg.set('enviado_em', new Date().toISOString())
            if (externalId) msg.set('id_externo_gateway', externalId)
            msg.set('log_erro', '')
            $app.save(msg)
          } else {
            const errStr = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
            let hint = ''
            if (res.statusCode === 404 && errStr.indexOf('Instance not found') !== -1) {
              hint =
                ' (Instância não encontrada na Z-API: verifique a URL da instância em WHATSAPP_API_URL)'
            }
            msg.set('status', 'falha')
            msg.set('log_erro', `Gateway erro HTTP ${res.statusCode}: ${errStr}${hint}`)
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
    // Destinatários: CLIENTES (não são usuários do Skip).
    // -------------------------------------------------------------
    try {
      // FLAG DE CONTROLE REVERSÍVEL:
      // Desativado por solicitação do usuário para não disparar mensagens automáticas a clientes finais.
      // Para reativar: defina a variável de ambiente MENSAGENS_CLIENTE_ATIVAS=true
      // ou altere o padrão abaixo para true.
      const envFlagMsgCli = ($os.getenv('MENSAGENS_CLIENTE_ATIVAS') || '').trim().toLowerCase()
      const mensagensClienteAtivas = envFlagMsgCli === 'true' || envFlagMsgCli === '1'

      if (!mensagensClienteAtivas) {
        // Disparo inerte/desativado. Apenas registra log caso queira monitorar.
      } else {
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

            if (!rawApiUrl) {
              novaMsg.set('status', 'falha')
              novaMsg.set('log_erro', 'Gateway não configurado nos Secrets do backend')
              $app.save(novaMsg)
              continue
            }

            // Enviar via HTTP
            let cleanPhone = telCliente.replace(/\D/g, '')
            if (
              cleanPhone.length >= 10 &&
              cleanPhone.length <= 11 &&
              !cleanPhone.startsWith('55')
            ) {
              cleanPhone = '55' + cleanPhone
            }

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
                  targetUrl = baseWithoutSuffix + '/send-text'
                }

                if (apiKey) {
                  headers['Client-Token'] = apiKey
                }
                payloadGateway = {
                  phone: cleanPhone,
                  message: tplTexto,
                }
              } else {
                if (apiKey) {
                  headers['apikey'] = apiKey
                  headers['Authorization'] = 'Bearer ' + apiKey
                  headers['X-Api-Key'] = apiKey
                }
                payloadGateway = {
                  number: cleanPhone,
                  phone: cleanPhone,
                  message: tplTexto,
                  text: tplTexto,
                  sender: originNumber,
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
                let extId = ''
                try {
                  if (res.json) {
                    if (res.json.messageId) extId = String(res.json.messageId)
                    else if (res.json.id) extId = String(res.json.id)
                    else if (res.json.zaapId) extId = String(res.json.zaapId)
                    else if (res.json.key && res.json.key.id) extId = String(res.json.key.id)
                  }
                } catch (_) {}
                novaMsg.set('status', 'enviada')
                novaMsg.set('enviado_em', new Date().toISOString())
                if (extId) novaMsg.set('id_externo_gateway', extId)
                novaMsg.set('log_erro', '')
              } else {
                const errStr = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
                novaMsg.set('status', 'falha')
                novaMsg.set('log_erro', `Gateway HTTP ${res.statusCode}: ${errStr}`)
              }
            } catch (sendErr) {
              novaMsg.set('status', 'falha')
              novaMsg.set('log_erro', String(sendErr))
            }

            $app.save(novaMsg)
          }
        }
      } // fim if (mensagensClienteAtivas)
    } catch (errVisita) {
      console.log('Erro ao checar lembretes de visita técnica:', errVisita)
    }

    // -------------------------------------------------------------
    // PARTE 2.5: DISPARO AUTOMÁTICO DE LEMBRETE DE AUTO LEITURA RGE (REGRA 1)
    // Atividades filhas 'lembrete_auto_leitura' (de 'auto_leitura_rge'), com status pendente e data_leitura marcada.
    // Envio 2 DIAS ANTES da data da leitura.
    // Se a data de envio cair em SÁBADO ou DOMINGO, envia na SEXTA-FEIRA anterior (NUNCA no fim de semana).
    // Idempotência: verificar lembrete_whatsapp_enviado_em antes; gravar lembrete_whatsapp_enviado_em = now após sucesso.
    // REGRA 4: envio liberado APENAS para auto leitura (independe de MENSAGENS_CLIENTE_ATIVAS).
    // -------------------------------------------------------------
    try {
      // Helper para obter 'YYYY-MM-DD' em horário de Brasília (UTC-3)
      function getSaoPauloDateStr(d) {
        const utcMs = d.getTime()
        const spOffsetMs = -3 * 60 * 60 * 1000
        const spDate = new Date(utcMs + spOffsetMs)
        const y = spDate.getUTCFullYear()
        const m = String(spDate.getUTCMonth() + 1).padStart(2, '0')
        const day = String(spDate.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }

      function getSaoPauloDayOfWeek(d) {
        const utcMs = d.getTime()
        const spOffsetMs = -3 * 60 * 60 * 1000
        const spDate = new Date(utcMs + spOffsetMs)
        return spDate.getUTCDay() // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
      }

      const hojeSpStr = getSaoPauloDateStr(now)
      const diaSemanaHojeSp = getSaoPauloDayOfWeek(now)

      // Regra: NUNCA disparar no fim de semana (sábado ou domingo)
      const isFimDeSemanaHoje = diaSemanaHojeSp === 0 || diaSemanaHojeSp === 6

      if (!isFimDeSemanaHoje) {
        // Buscar atividades pendentes do tipo lembrete_auto_leitura sem lembrete_whatsapp_enviado_em
        // Observação: filhas têm tipo = 'lembrete_auto_leitura' e parent_id preenchido
        const filtroAutoLeitura =
          "tipo = 'lembrete_auto_leitura' && status != 'concluida' && status != 'cancelada' && lembrete_whatsapp_enviado_em = '' && data_leitura != ''"
        let lembretesPendentes = []
        try {
          lembretesPendentes = $app.findRecordsByFilter(
            'atividades',
            filtroAutoLeitura,
            'data_leitura',
            100,
            0,
          )
        } catch (eBusca) {
          console.log('[AUTO LEITURA CRON] Erro ao buscar lembretes pendentes:', eBusca)
        }

        // Template padrão do banco (se existir)
        let tplAutoLeitura = null
        try {
          tplAutoLeitura = $app.findFirstRecordByData(
            'whatsapp_templates',
            'slug',
            'lembrete_auto_leitura_rge',
          )
        } catch (_) {}

        for (let l = 0; l < lembretesPendentes.length; l++) {
          const atvFilha = lembretesPendentes[l]

          // Dupla verificação de idempotência
          const jaEnviado = atvFilha.getString('lembrete_whatsapp_enviado_em')
          if (jaEnviado) continue

          // Extrair a data da leitura (YYYY-MM-DD)
          const rawDataLeitura = atvFilha.getString('data_leitura')
          if (!rawDataLeitura) continue
          const dataLeituraYmd = rawDataLeitura.substring(0, 10)
          const partesLeitura = dataLeituraYmd.split('-').map(Number)
          if (
            partesLeitura.length !== 3 ||
            !partesLeitura[0] ||
            !partesLeitura[1] ||
            !partesLeitura[2]
          ) {
            continue
          }

          // Data da leitura como Date (meio-dia UTC para evitar trocas de fuso)
          const dtLeitura = new Date(
            Date.UTC(partesLeitura[0], partesLeitura[1] - 1, partesLeitura[2], 12, 0, 0),
          )

          // Calcular data prevista do envio: 2 dias antes
          // Se 2 dias antes cair em sábado (dia 6) ou domingo (dia 0), recuar para sexta-feira anterior
          const dtEnvioAlvo = new Date(dtLeitura.getTime() - 2 * 24 * 60 * 60 * 1000)
          const dowAlvo = dtEnvioAlvo.getUTCDay()
          if (dowAlvo === 0) {
            // Domingo -> recua 2 dias para Sexta
            dtEnvioAlvo.setUTCDate(dtEnvioAlvo.getUTCDate() - 2)
          } else if (dowAlvo === 6) {
            // Sábado -> recua 1 dia para Sexta
            dtEnvioAlvo.setUTCDate(dtEnvioAlvo.getUTCDate() - 1)
          }

          const envioAlvoYmd = dtEnvioAlvo.toISOString().substring(0, 10)

          // Só envia se hoje for >= a data alvo de envio (se já passou ou é hoje, e leitura ainda futura ou hoje)
          if (hojeSpStr < envioAlvoYmd) {
            // Ainda não chegou o dia do envio
            continue
          }

          // Se a data da leitura já passou há dias, não faz sentido enviar aviso de auto leitura futuro
          if (hojeSpStr > dataLeituraYmd) {
            continue
          }

          // Atividade mãe vinculada
          let atvMae = null
          const parentId = atvFilha.getString('parent_id')
          if (parentId) {
            try {
              atvMae = $app.findRecordById('atividades', parentId)
            } catch (_) {}
          }

          // Cliente vinculado
          const clienteId =
            atvFilha.getString('cliente_id') || (atvMae ? atvMae.getString('cliente_id') : '')
          if (!clienteId) continue

          let clienteRec = null
          try {
            clienteRec = $app.findRecordById('clientes', clienteId)
          } catch (_) {}
          if (!clienteRec) continue

          // Resolver telefone/whatsapp do cliente
          let rawTelefone = (clienteRec.getString('whatsapp') || '').trim()
          if (!rawTelefone || rawTelefone.replace(/\D/g, '').length < 10) {
            // Buscar em contatos adicionais com is_whatsapp = true
            try {
              const contatos = $app.findRecordsByFilter(
                'contatos_adicionais',
                `cliente = '${clienteRec.id}' && is_whatsapp = true`,
                '-created',
                5,
                0,
              )
              for (let c = 0; c < contatos.length; c++) {
                const telC = (contatos[c].getString('telefone') || '').trim()
                if (telC.replace(/\D/g, '').length >= 10) {
                  rawTelefone = telC
                  break
                }
              }
            } catch (_) {}
          }
          if (!rawTelefone || rawTelefone.replace(/\D/g, '').length < 10) {
            const telCli = (
              clienteRec.getString('telefone') ||
              clienteRec.getString('telefone_secundario') ||
              ''
            ).trim()
            if (telCli && telCli.replace(/\D/g, '').length >= 10) {
              rawTelefone = telCli
            }
          }
          if (!rawTelefone || rawTelefone.replace(/\D/g, '').length < 10) {
            console.log(
              `[AUTO LEITURA CRON] Cliente ${clienteRec.id} sem telefone válido para lembrete da atividade ${atvFilha.id}`,
            )
            continue
          }

          let cleanPhone = rawTelefone.replace(/\D/g, '')
          if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone
          }

          // Montar data e dia anterior formatados em DD/MM/AAAA
          const diaLeituraStr =
            String(partesLeitura[2]).padStart(2, '0') +
            '/' +
            String(partesLeitura[1]).padStart(2, '0') +
            '/' +
            partesLeitura[0]

          const dtDiaAnterior = new Date(dtLeitura.getTime() - 1 * 24 * 60 * 60 * 1000)
          const diaAntY = dtDiaAnterior.getUTCFullYear()
          const diaAntM = String(dtDiaAnterior.getUTCMonth() + 1).padStart(2, '0')
          const diaAntD = String(dtDiaAnterior.getUTCDate()).padStart(2, '0')
          const diaAnteriorStr = `${diaAntD}/${diaAntM}/${diaAntY}`

          const nomeCliente = (clienteRec.getString('nome') || 'Cliente').trim()

          // Obter texto base:
          // 1. mensagem_cliente da filha
          // 2. mensagem_cliente da mãe
          // 3. template salvo no banco (qvmkpl0mj2pun1i ou slug lembrete_auto_leitura_rge)
          // 4. texto padrão inicial da Regra 2
          const textoBase =
            atvFilha.getString('mensagem_cliente') ||
            (atvMae ? atvMae.getString('mensagem_cliente') : '') ||
            (tplAutoLeitura ? tplAutoLeitura.getString('conteudo') : '') ||
            'Olá, [nome do cliente]! Sua usina está com a auto leitura do medidor agendada para [data]. Pedimos, gentilmente, que nos envie pelo WhatsApp a leitura do medidor até [dia anterior], para mantermos o acompanhamento da sua geração em dia. Qualquer dúvida, estamos à disposição. Atenciosamente, equipe Delfos Engenharia.'

          // Substituições de variáveis: [nome do cliente], [data], [dia anterior]
          let textoFinal = textoBase
            .replace(/\[nome do cliente\]/gi, nomeCliente)
            .replace(/\[data\]/gi, diaLeituraStr)
            .replace(/\[dia anterior\]/gi, diaAnteriorStr)
            // Compatibilidade com possíveis sintaxes de chaves do template do banco
            .replace(/\{\{nome_cliente\}\}/g, nomeCliente)
            .replace(/\{\{data\}\}/g, diaLeituraStr)
            .replace(/\{\{dia_anterior\}\}/g, diaAnteriorStr)

          // Conversa de WhatsApp (CRM)
          let conversaId = ''
          try {
            const helper = require(`${__hooks}/whatsapp_conversa_helper.js`)
            const conv = helper.ensureConversaForMessage(
              $app,
              clienteId,
              cleanPhone,
              textoFinal,
              null,
            )
            if (conv) conversaId = conv.id
          } catch (_) {}

          // Registrar na coleção whatsapp_mensagens
          const msgRecord = new Record(msgsCol)
          msgRecord.set('cliente_id', clienteId)
          if (conversaId) msgRecord.set('conversa_id', conversaId)
          msgRecord.set('telefone_destino', cleanPhone)
          msgRecord.set('conteudo_final', textoFinal)
          msgRecord.set('tipo_disparo', 'lembrete_auto_leitura')
          msgRecord.set('direcao', 'enviada')
          msgRecord.set('referencia_id', atvFilha.id)

          if (!rawApiUrl) {
            msgRecord.set('status', 'falha')
            msgRecord.set(
              'log_erro',
              'Z-API não configurada nos Secrets (WHATSAPP_API_URL/WHATSAPP_API_KEY)',
            )
            $app.save(msgRecord)
            continue
          }

          // Disparo Z-API
          let cleanUrl = rawApiUrl.replace(/\/+$/, '')
          if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl
          }
          const lowerUrl = cleanUrl.toLowerCase()
          const isZApi = lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1

          let targetUrl = cleanUrl
          let payloadGateway = {}
          const headersGateway = { 'Content-Type': 'application/json' }

          if (isZApi) {
            const baseWithoutSuffix = cleanUrl.replace(/\/+send-text\/?$/i, '').replace(/\/+$/, '')
            const zapiMatch = baseWithoutSuffix.match(
              /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
            )
            if (zapiMatch) {
              targetUrl = `${zapiMatch[1]}/instances/${zapiMatch[2]}/token/${zapiMatch[3]}/send-text`
            } else {
              targetUrl = baseWithoutSuffix + '/send-text'
            }
            if (apiKey) {
              headersGateway['Client-Token'] = apiKey
            }
            payloadGateway = {
              phone: cleanPhone,
              message: textoFinal,
            }
          } else {
            if (apiKey) {
              headersGateway['apikey'] = apiKey
              headersGateway['Authorization'] = 'Bearer ' + apiKey
            }
            payloadGateway = {
              phone: cleanPhone,
              message: textoFinal,
            }
          }

          let envioOk = false
          let erroGateway = ''
          try {
            const resZ = $http.send({
              url: targetUrl,
              method: 'POST',
              headers: headersGateway,
              body: JSON.stringify(payloadGateway),
              timeout: 15,
            })

            if (resZ.statusCode >= 200 && resZ.statusCode < 300) {
              envioOk = true
              let extId = ''
              try {
                if (resZ.json) {
                  extId = resZ.json.messageId || resZ.json.id || resZ.json.zaapId || ''
                }
              } catch (_) {}

              msgRecord.set('status', 'enviada')
              msgRecord.set('enviado_em', new Date().toISOString())
              if (extId) msgRecord.set('id_externo_gateway', String(extId))
              msgRecord.set('log_erro', '')
              $app.save(msgRecord)
            } else {
              erroGateway = resZ.raw ? resZ.raw.substring(0, 300) : `HTTP ${resZ.statusCode}`
              msgRecord.set('status', 'falha')
              msgRecord.set('log_erro', `Gateway HTTP ${resZ.statusCode}: ${erroGateway}`)
              $app.save(msgRecord)
            }
          } catch (httpErr) {
            erroGateway = String(httpErr && httpErr.message ? httpErr.message : httpErr)
            msgRecord.set('status', 'falha')
            msgRecord.set('log_erro', erroGateway)
            $app.save(msgRecord)
          }

          // Se sucesso, atualizar a atividade filha gravando lembrete_whatsapp_enviado_em = now
          if (envioOk) {
            const agoraIso = new Date().toISOString()
            atvFilha.set('lembrete_whatsapp_enviado_em', agoraIso)
            atvFilha.set('status', 'enviado')

            // Atualiza em auto_leitura_dados para redundância
            try {
              let ald = atvFilha.get('auto_leitura_dados') || {}
              if (typeof ald === 'string') {
                try {
                  ald = JSON.parse(ald)
                } catch (_) {
                  ald = {}
                }
              }
              ald.lembrete_whatsapp_enviado_em = agoraIso
              atvFilha.set('auto_leitura_dados', ald)
            } catch (_) {}

            $app.save(atvFilha)
            console.log(
              `[AUTO LEITURA CRON] Lembrete enviado com sucesso para ${cleanPhone} (atividade ${atvFilha.id})`,
            )
          } else {
            console.log(
              `[AUTO LEITURA CRON] Falha no envio para ${cleanPhone} (atividade ${atvFilha.id}): ${erroGateway}`,
            )
          }
        }
      } // fim if (!isFimDeSemanaHoje)
    } catch (errAutoLeitura) {
      console.log('[AUTO LEITURA CRON] Erro geral no disparo de auto leitura:', errAutoLeitura)
    }

    // -------------------------------------------------------------
    // PARTE 2.6: ROTINA SEM RETORNO DE AUTO LEITURA (REGRA 3)
    // Atividades de auto leitura cuja data da leitura chegou (<= hoje), sem retorno registrado
    // (grandezas vazias e não concluída) e sem flag sem_retorno_leitura_media:
    // (a) e-mail ao criador via Resend, remetente "Delfos Solar" <solar@updates.delfos.eng.br>,
    //     assunto "[Auto Leitura] Sem retorno do cliente - Realizar leitura por média",
    //     corpo com cliente/UC/usina e instrução de leitura por média;
    // (b) notificação in-app na coleção notificacoes_internas com link para a atividade;
    // (c) gravar sem_retorno_leitura_media = true para não repetir.
    // -------------------------------------------------------------
    try {
      function getSaoPauloDateStr(d) {
        const utcMs = d.getTime()
        const spOffsetMs = -3 * 60 * 60 * 1000
        const spDate = new Date(utcMs + spOffsetMs)
        const y = spDate.getUTCFullYear()
        const m = String(spDate.getUTCMonth() + 1).padStart(2, '0')
        const day = String(spDate.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }

      const hojeSpStrSemRetorno = getSaoPauloDateStr(now)

      // Buscar atividades de auto leitura (tipo = lembrete_auto_leitura) com data_leitura <= hoje
      // sem_retorno_leitura_media != true e status != concluida
      const filtroSemRetorno =
        "tipo = 'lembrete_auto_leitura' && status != 'concluida' && status != 'cancelada' && sem_retorno_leitura_media != true && data_leitura != ''"
      let atvsChecagem = []
      try {
        atvsChecagem = $app.findRecordsByFilter(
          'atividades',
          filtroSemRetorno,
          'data_leitura',
          100,
          0,
        )
      } catch (eFiltro) {
        console.log('[AUTO LEITURA SEM RETORNO] Erro ao buscar atividades:', eFiltro)
      }

      for (let s = 0; s < atvsChecagem.length; s++) {
        const atvItem = atvsChecagem[s]

        // Data da leitura
        const rawDtLeitura = atvItem.getString('data_leitura')
        if (!rawDtLeitura) continue
        const dtLeituraYmd = rawDtLeitura.substring(0, 10)

        // Só processa se a data da leitura já chegou (<= hoje em SP)
        if (dtLeituraYmd > hojeSpStrSemRetorno) {
          continue
        }

        // Verificar se retorno foi registrado (grandezas 03 ou 103 preenchidas ou dados_leitura_registrados)
        const g03 = atvItem.getString('valor_grandeza_03')
        const g103 = atvItem.getString('valor_grandeza_103')
        const dadosReg = atvItem.getString('dados_leitura_registrados')
        if (g03 || g103 || dadosReg) {
          // Já houve preenchimento de leitura, não é sem retorno
          continue
        }

        // Também verificar se a mãe tem retorno preenchido
        let atvMaeItem = null
        const parentId = atvItem.getString('parent_id')
        if (parentId) {
          try {
            atvMaeItem = $app.findRecordById('atividades', parentId)
            if (atvMaeItem) {
              const mg03 = atvMaeItem.getString('valor_grandeza_03')
              const mg103 = atvMaeItem.getString('valor_grandeza_103')
              if (mg03 || mg103) {
                continue
              }
            }
          } catch (_) {}
        }

        // Identificar cliente e dados da usina/UC
        const clienteId =
          atvItem.getString('cliente_id') || (atvMaeItem ? atvMaeItem.getString('cliente_id') : '')
        let clienteRec = null
        if (clienteId) {
          try {
            clienteRec = $app.findRecordById('clientes', clienteId)
          } catch (_) {}
        }

        let usinaRec = null
        const usinaId =
          atvItem.getString('usina_id') || (atvMaeItem ? atvMaeItem.getString('usina_id') : '')
        if (usinaId) {
          try {
            usinaRec = $app.findRecordById('usinas', usinaId)
          } catch (_) {}
        }

        const nomeCliente =
          (clienteRec ? clienteRec.getString('nome') : '') || 'Cliente não identificado'
        const nomeUsina =
          (usinaRec ? usinaRec.getString('nome') : '') ||
          atvItem.getString('usina_nome') ||
          (clienteRec ? clienteRec.getString('nome') : '') ||
          'Usina cadastrada'
        const numeroUc =
          atvItem.getString('numero_uc') ||
          (atvMaeItem ? atvMaeItem.getString('numero_uc') : '') ||
          (usinaRec ? usinaRec.getString('numero_uc') : '') ||
          (clienteRec ? clienteRec.getString('uc') : '') ||
          'Não informada'

        // Formatar data da leitura em DD/MM/AAAA
        const partesL = dtLeituraYmd.split('-')
        const dataLeituraBr =
          partesL.length === 3 ? `${partesL[2]}/${partesL[1]}/${partesL[0]}` : dtLeituraYmd

        // Identificar criador / responsável para envio do e-mail
        // Prioridade: responsavel_id da atividade ou criador
        let emailCriador = ''
        const respId =
          atvItem.getString('responsavel_id') ||
          (atvMaeItem ? atvMaeItem.getString('responsavel_id') : '')
        if (respId) {
          try {
            const respUser = $app.findRecordById('users', respId)
            if (respUser) {
              emailCriador = respUser.getString('email')
            }
          } catch (_) {}
        }

        if (!emailCriador) {
          // Fallback: responsavel_email registrado na atividade
          emailCriador =
            atvItem.getString('responsavel_email') ||
            (atvMaeItem ? atvMaeItem.getString('responsavel_email') : '')
        }

        // Se ainda não encontrou, busca usuário com e-mail corporativo ou admin
        if (!emailCriador) {
          try {
            const adminUsers = $app.findRecordsByFilter(
              'users',
              "role = 'admin' && email != ''",
              'created',
              1,
              0,
            )
            if (adminUsers && adminUsers.length > 0) {
              emailCriador = adminUsers[0].getString('email')
            }
          } catch (_) {}
        }

        // Fallback definitivo
        if (!emailCriador) {
          emailCriador = 'delfos.usinas@gmail.com'
        }

        // (a) Enviar e-mail via Resend
        const resendApiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
        if (resendApiKey) {
          const emailSubject = '[Auto Leitura] Sem retorno do cliente - Realizar leitura por média'
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
              <h2 style="color: #c2410c; margin-top: 0; font-size: 18px; border-bottom: 2px solid #fed7aa; padding-bottom: 8px;">
                Auto Leitura Sem Retorno do Cliente
              </h2>
              <p>A data programada da auto leitura chegou e <strong>não houve retorno</strong> do cliente com as fotos ou valores do medidor.</p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #f97316; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 4px 0;"><strong>Cliente:</strong> ${nomeCliente}</p>
                <p style="margin: 4px 0;"><strong>Usina:</strong> ${nomeUsina}</p>
                <p style="margin: 4px 0;"><strong>Número da UC:</strong> ${numeroUc}</p>
                <p style="margin: 4px 0;"><strong>Data da Leitura:</strong> ${dataLeituraBr}</p>
              </div>

              <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 0; color: #9a3412; font-weight: bold;">⚠️ Ação Recomendada:</p>
                <p style="margin: 6px 0 0 0; color: #7c2d12;">
                  Realizar a <strong>leitura por média</strong> na concessionária (RGE) e registrar as grandezas 03 e 103 manualmente no CRM para manter o acompanhamento da usina atualizado.
                </p>
              </div>

              <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                Disparado automaticamente pelo CRM Delfos Solar.
              </p>
            </div>
          `

          const emailPayload = {
            from: 'Delfos Solar <solar@updates.delfos.eng.br>',
            to: [emailCriador],
            subject: emailSubject,
            html: emailHtml,
            reply_to: 'delfos.usinas@gmail.com',
          }

          try {
            const resResend = $http.send({
              url: 'https://api.resend.com/emails',
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + resendApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(emailPayload),
              timeout: 20,
            })
            console.log(
              `[AUTO LEITURA SEM RETORNO] Resend status ${resResend.statusCode} para ${emailCriador}`,
            )
          } catch (errResend) {
            console.log(`[AUTO LEITURA SEM RETORNO] Erro ao enviar e-mail via Resend:`, errResend)
          }
        } else {
          console.log('[AUTO LEITURA SEM RETORNO] RESEND_API_KEY não configurada nos Secrets')
        }

        // (b) Notificação in-app na coleção notificacoes_internas
        try {
          const notifCol = $app.findCollectionByNameOrId('notificacoes_internas')
          const novaNotif = new Record(notifCol)
          novaNotif.set('tipo', 'lembrete')
          novaNotif.set('titulo', `[Auto Leitura] Sem retorno - ${nomeCliente}`)
          novaNotif.set(
            'mensagem',
            `Auto leitura da UC ${numeroUc} (${nomeUsina}) com data ${dataLeituraBr} sem retorno do cliente. Realizar leitura por média.`,
          )
          novaNotif.set('atividade_id', atvItem.id)
          if (clienteId) novaNotif.set('cliente_id', clienteId)
          novaNotif.set('cliente_nome', nomeCliente)
          novaNotif.set('status', 'ativa')
          novaNotif.set('lida', false)
          $app.save(novaNotif)
          console.log(
            `[AUTO LEITURA SEM RETORNO] Notificação in-app criada para atividade ${atvItem.id}`,
          )
        } catch (errNotif) {
          console.log('[AUTO LEITURA SEM RETORNO] Erro ao criar notificacao interna:', errNotif)
        }

        // (c) Gravar sem_retorno_leitura_media = true para não repetir
        try {
          atvItem.set('sem_retorno_leitura_media', true)
          $app.save(atvItem)
          console.log(
            `[AUTO LEITURA SEM RETORNO] Flag sem_retorno_leitura_media gravada na atividade ${atvItem.id}`,
          )
        } catch (errSaveAtv) {
          console.log(
            '[AUTO LEITURA SEM RETORNO] Erro ao salvar atividade com flag sem retorno:',
            errSaveAtv,
          )
        }
      }
    } catch (errSemRetornoGeral) {
      console.log(
        '[AUTO LEITURA SEM RETORNO] Erro geral na checagem de sem retorno:',
        errSemRetornoGeral,
      )
    }

    // -------------------------------------------------------------
    // PARTE 3: DISPARO AUTOMÁTICO DE FOLLOW-UP PÓS-VENDA
    // Instalações concluídas há mais de 7 dias (clientes ou sistemas com data_instalacao <= now - 7 dias)
    // Destinatários: CLIENTES (não são usuários do Skip).
    // -------------------------------------------------------------
    try {
      // FLAG DE CONTROLE REVERSÍVEL:
      // Desativado por solicitação do usuário para não disparar mensagens automáticas a clientes finais.
      // Para reativar: defina a variável de ambiente MENSAGENS_CLIENTE_ATIVAS=true
      // ou altere o padrão abaixo para true.
      const envFlagFollow = ($os.getenv('MENSAGENS_CLIENTE_ATIVAS') || '').trim().toLowerCase()
      const followUpClienteAtivo = envFlagFollow === 'true' || envFlagFollow === '1'

      if (!followUpClienteAtivo) {
        // Disparo inerte/desativado.
      } else {
        let tplFollowup = null
        try {
          tplFollowup = $app.findFirstRecordByData(
            'whatsapp_templates',
            'slug',
            'followup_pos_venda',
          )
        } catch (_) {}

        if (tplFollowup && tplFollowup.getBool('ativo') !== false) {
          // Data limite: 7 dias atrás
          const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

          // Buscar clientes com data_instalacao preenchida <= seteDiasAtras
          const filterInstalados = `data_instalacao != '' && data_instalacao <= '${seteDiasAtras}'`
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

            if (!rawApiUrl) {
              novaMsg.set('status', 'falha')
              novaMsg.set('log_erro', 'Gateway não configurado nos Secrets do backend')
              $app.save(novaMsg)
              continue
            }

            let cleanPhone = telCliente.replace(/\D/g, '')
            if (
              cleanPhone.length >= 10 &&
              cleanPhone.length <= 11 &&
              !cleanPhone.startsWith('55')
            ) {
              cleanPhone = '55' + cleanPhone
            }

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
                  targetUrl = baseWithoutSuffix + '/send-text'
                }

                if (apiKey) {
                  headers['Client-Token'] = apiKey
                }
                payloadGateway = {
                  phone: cleanPhone,
                  message: tplTexto,
                }
              } else {
                if (apiKey) {
                  headers['apikey'] = apiKey
                  headers['Authorization'] = 'Bearer ' + apiKey
                  headers['X-Api-Key'] = apiKey
                }
                payloadGateway = {
                  number: cleanPhone,
                  phone: cleanPhone,
                  message: tplTexto,
                  text: tplTexto,
                  sender: originNumber,
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
                let extId = ''
                try {
                  if (res.json) {
                    if (res.json.messageId) extId = String(res.json.messageId)
                    else if (res.json.id) extId = String(res.json.id)
                    else if (res.json.zaapId) extId = String(res.json.zaapId)
                    else if (res.json.key && res.json.key.id) extId = String(res.json.key.id)
                  }
                } catch (_) {}
                novaMsg.set('status', 'enviada')
                novaMsg.set('enviado_em', new Date().toISOString())
                if (extId) novaMsg.set('id_externo_gateway', extId)
                novaMsg.set('log_erro', '')
              } else {
                const errStr = res.raw ? res.raw.substring(0, 300) : `HTTP ${res.statusCode}`
                novaMsg.set('status', 'falha')
                novaMsg.set('log_erro', `Gateway HTTP ${res.statusCode}: ${errStr}`)
              }
            } catch (sendErr) {
              novaMsg.set('status', 'falha')
              novaMsg.set('log_erro', String(sendErr))
            }

            $app.save(novaMsg)
          }
        }
      } // fim if (followUpClienteAtivo)
    } catch (errFollowup) {
      console.log('Erro ao checar follow-ups pós-venda:', errFollowup)
    }
  } catch (errGeral) {
    console.log('Erro no cron whatsapp_worker:', errGeral)
  }
})
