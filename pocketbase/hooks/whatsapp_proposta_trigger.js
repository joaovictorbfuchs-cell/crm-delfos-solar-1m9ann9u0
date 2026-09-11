// Hook disparado após atualizar ou criar um orçamento solar
// Quando o status mudar para 'Aprovado', envia automaticamente o template de Confirmação de Proposta
onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record
    const collectionName = record.collection().name

    if (collectionName !== 'orcamentos_solar') {
      return e.next()
    }

    const novoStatus = record.getString('status')
    const statusAnterior = record.original().getString('status')

    // Disparar somente se o status acabou de mudar para 'Aprovado'
    if (novoStatus === 'Aprovado' && statusAnterior !== 'Aprovado') {
      const orcamentoId = record.id
      const clienteId = record.getString('cliente_id')
      const refKey = 'prop_aprovada_' + orcamentoId

      const msgsCol = $app.findCollectionByNameOrId('whatsapp_mensagens')

      // Verificar idempotência: já foi enviado para este orçamento?
      try {
        const jaEnviado = $app.findRecordsByFilter(
          msgsCol.id,
          `referencia_id = '${refKey}'`,
          '',
          1,
          0,
        )
        if (jaEnviado && jaEnviado.length > 0) {
          return e.next()
        }
      } catch (_) {}

      // Obter template de confirmação de proposta
      let tpl = null
      try {
        tpl = $app.findFirstRecordByData('whatsapp_templates', 'slug', 'confirmacao_proposta')
      } catch (_) {}

      let clienteRec = null
      try {
        clienteRec = $app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)[0]
      } catch (_) {}

      if (!clienteRec) {
        return e.next()
      }

      const telCliente = (
        clienteRec.getString('whatsapp') ||
        clienteRec.getString('telefone') ||
        ''
      ).trim()
      if (!telCliente) {
        return e.next()
      }

      const valorInvestimento = record.getFloat('valor_investimento') || 0
      const valorFormatado =
        'R$ ' +
        valorInvestimento.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })

      const enderecoCliente =
        [
          clienteRec.getString('endereco'),
          clienteRec.getString('numero'),
          clienteRec.getString('bairro'),
          clienteRec.getString('cidade'),
        ]
          .filter(Boolean)
          .join(', ') || 'endereço do projeto'

      let conteudo =
        tpl && tpl.getString('conteudo')
          ? tpl.getString('conteudo')
          : 'Olá, {{nome_cliente}}! Sua proposta solar de {{valor_proposta}} foi Aprovada com sucesso! Em breve entraremos em contato para os próximos passos.'

      conteudo = conteudo
        .replace(/\{\{nome_cliente\}\}/g, clienteRec.getString('nome'))
        .replace(/\{\{valor_proposta\}\}/g, valorFormatado)
        .replace(/\{\{endereco\}\}/g, enderecoCliente)
        .replace(/\{\{data\}\}/g, new Date().toLocaleDateString('pt-BR'))

      const novaMsg = new Record(msgsCol)
      novaMsg.set('cliente_id', clienteId)
      if (tpl) novaMsg.set('template_id', tpl.id)
      novaMsg.set('telefone_destino', telCliente)
      novaMsg.set('conteudo_final', conteudo)
      novaMsg.set('tipo_disparo', 'proposta_aprovada')
      novaMsg.set('referencia_id', refKey)

      const rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim()
      const apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim()
      const originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim()

      if (!rawApiUrl) {
        novaMsg.set('status', 'falha')
        novaMsg.set('log_erro', 'Gateway não configurado nos Secrets do backend')
        $app.save(novaMsg)
        return e.next()
      }

      let cleanPhone = telCliente.replace(/\D/g, '')
      if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone
      }

      try {
        let baseUrl = rawApiUrl.replace(/\/+$/, '')
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
          baseUrl = 'https://' + baseUrl
        }

        const isZApi =
          baseUrl.toLowerCase().indexOf('z-api.com') !== -1 ||
          baseUrl.toLowerCase().indexOf('z-api.io') !== -1
        let targetUrl = baseUrl
        let payloadGateway = {}
        const headers = { 'Content-Type': 'application/json' }

        if (isZApi) {
          if (targetUrl.toLowerCase().endsWith('/send-text')) {
            // OK
          } else {
            targetUrl = targetUrl + '/send-text'
          }
          if (apiKey) {
            headers['Client-Token'] = apiKey
          }
          payloadGateway = {
            phone: cleanPhone,
            message: conteudo,
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
            message: conteudo,
            text: conteudo,
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

    return e.next()
  } catch (err) {
    console.log('Erro no hook onRecordAfterUpdateSuccess (orcamentos_solar):', err)
    return e.next()
  }
})
