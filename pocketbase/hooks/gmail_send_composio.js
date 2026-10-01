// pocketbase/hooks/gmail_send_composio.js
// Função backend: "Enviar Email via Gmail"
// Usa a integração do Gmail via Composio (conta delfos.usinas@gmail.com).
// Endpoint: POST /backend/v1/gmail/send

// 1. Execução IMEDIATA no boot/deploy do hook para validar de pronto a chave
try {
  const bootApiKey = ($os.getenv('COMPOSIO_API_KEY') || '').trim()
  let bootFingerprint = 'fingerprint=vazio len=0'
  if (bootApiKey) {
    const bLen = bootApiKey.length
    if (bLen <= 9) {
      bootFingerprint = 'fingerprint=' + bootApiKey.substring(0, 2) + '… len=' + bLen
    } else {
      bootFingerprint =
        'fingerprint=' +
        bootApiKey.substring(0, 5) +
        '…' +
        bootApiKey.substring(bLen - 4) +
        ' len=' +
        bLen
    }
  }

  console.log(
    '[GMAIL TESTE BOOT] Executando validação imediata no deploy. COMPOSIO_API_KEY presente? ' +
      (bootApiKey.length > 0) +
      ' ' +
      bootFingerprint,
  )

  if (!bootApiKey) {
    console.error(
      '[GMAIL TESTE BOOT] FALHA: COMPOSIO_API_KEY não encontrada no ambiente ($os.getenv retornou vazio)',
    )
  } else {
    const bRecipient = 'joao@delfosengenharia.com.br'
    const bSubject = 'Teste — Envio via Gmail (Delfos Solar)'
    const bHtmlBody =
      '<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">' +
      '<h2 style="color: #0284c7;">Teste de Envio — Delfos Solar CRM (Boot)</h2>' +
      '<p>Olá,</p>' +
      '<p>Este é um <strong>teste automatizado no boot/deploy</strong> de envio de e-mail via <strong>Gmail (Composio)</strong> a partir da conta <em>delfos.usinas@gmail.com</em>.</p>' +
      '<p>Se você recebeu esta mensagem, a integração do Composio com o Gmail está funcionando perfeitamente no backend.</p>' +
      '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />' +
      '<p style="font-size: 12px; color: #64748b;">Enviado automaticamente pelo CRM Delfos Solar.</p>' +
      '</div>'

    let bConnectedAccountId = ($os.getenv('GMAIL_CONNECTED_ACCOUNT_ID') || '').trim()
    let bComposioUserId = ($os.getenv('COMPOSIO_USER_ID') || 'delfos.usinas@gmail.com').trim()

    if (!bConnectedAccountId) {
      try {
        const accsRes = $http.send({
          url: 'https://backend.composio.dev/api/v3/connected_accounts?toolkit_slugs=gmail&limit=10',
          method: 'GET',
          headers: {
            'x-api-key': bootApiKey,
          },
          timeout: 10,
        })
        if (accsRes.statusCode >= 200 && accsRes.statusCode < 300) {
          const accsData = accsRes.json || JSON.parse(accsRes.raw || '{}')
          const items = accsData.items || accsData.data || accsData || []
          if (Array.isArray(items)) {
            for (let a = 0; a < items.length; a++) {
              const it = items[a]
              if (it && (it.status === 'ACTIVE' || it.status === 'CONNECTED' || !it.is_disabled)) {
                bConnectedAccountId = it.id || ''
                if (it.user_id) bComposioUserId = it.user_id
                break
              }
            }
            if (!bConnectedAccountId && items.length > 0 && items[0].id) {
              bConnectedAccountId = items[0].id
              if (items[0].user_id) bComposioUserId = items[0].user_id
            }
          }
        }
      } catch (eAcc) {
        console.warn('[GMAIL TESTE BOOT ACC LOOKUP]', String(eAcc))
      }
    }

    const bPayload = {
      arguments: {
        recipient_email: bRecipient,
        subject: bSubject,
        body: bHtmlBody,
      },
      user_id: bComposioUserId,
    }
    if (bConnectedAccountId) {
      bPayload.connected_account_id = bConnectedAccountId
    }

    console.log(
      '[GMAIL TESTE BOOT DISPARO]',
      JSON.stringify({
        recipient: bRecipient,
        subject: bSubject,
        connectedAccountId: bConnectedAccountId || 'auto/none',
        composioUserId: bComposioUserId,
      }),
    )

    const compRes = $http.send({
      url: 'https://backend.composio.dev/api/v3/tools/execute/GMAIL_SEND_EMAIL',
      method: 'POST',
      headers: {
        'x-api-key': bootApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bPayload),
      timeout: 40,
    })

    let compData = null
    try {
      if (compRes.json) compData = compRes.json
      else if (compRes.raw) compData = JSON.parse(compRes.raw)
    } catch (_) {}

    if (compRes.statusCode >= 200 && compRes.statusCode < 300) {
      const isSuccess =
        compData && (compData.successful === true || compData.success === true || !compData.error)
      if (isSuccess) {
        const externalId =
          (compData.data &&
            (compData.data.id || compData.data.message_id || compData.data.run_id)) ||
          compData.log_id ||
          'composio-gmail-ok'
        console.log('[GMAIL TESTE BOOT] SUCESSO id=' + externalId + ' to=' + bRecipient)
      } else {
        let errMsg = compData ? JSON.stringify(compData) : 'HTTP ' + compRes.statusCode
        console.error('[GMAIL TESTE BOOT] FALHA: status=' + compRes.statusCode + ' corpo=' + errMsg)
      }
    } else {
      let errMsg = ''
      if (compData) {
        if (typeof compData.error === 'string') errMsg = compData.error
        else if (typeof compData.message === 'string') errMsg = compData.message
        else if (compData.data && typeof compData.data.error === 'string')
          errMsg = compData.data.error
        else errMsg = JSON.stringify(compData)
      }
      if (!errMsg) errMsg = compRes.raw || 'HTTP ' + compRes.statusCode
      console.error('[GMAIL TESTE BOOT] FALHA: status=' + compRes.statusCode + ' corpo=' + errMsg)
    }
  }
} catch (eBoot) {
  console.error('[GMAIL TESTE BOOT ERRO]', String(eBoot))
}

// 2. Job agendado TEMPORÁRIO de teste teste_gmail_composio_temporario desativado/removido
// conforme solicitação do usuário devido a 401 "Invalid API key" do Composio.
// Parâmetros:
//   - to / recipient_email / destinatario (string ou array)
//   - subject / assunto (string)
//   - body / html / corpo / message (string)
//   - attachments / anexos (opcional: lista de { filename/name, content/contentBase64/base64 })
//   - user_id / account_id (opcional)

routerAdd('POST', '/backend/v1/gmail/send', (e) => {
  try {
    const authUser = e.auth
    let userId = authUser ? authUser.id : null

    if (!userId) {
      try {
        const usersCol = $app.findCollectionByNameOrId('users')
        const firstUser = $app.findRecordsByFilter(usersCol.id, '', 'created', 1, 0)
        if (firstUser && firstUser.length > 0) {
          userId = firstUser[0].id
        }
      } catch (_) {}
    }

    if (!userId) {
      return e.json(200, {
        ok: false,
        sucesso: false,
        error: 'Autenticação necessária. Usuário não autenticado no CRM.',
      })
    }

    const body = e.requestInfo().body || {}
    const rawTo = body.to || body.recipient_email || body.destinatario || body.recipient
    const subject = (body.subject || body.assunto || '').trim()
    const contentBody =
      body.body !== undefined && body.body !== null
        ? String(body.body)
        : body.html !== undefined && body.html !== null
          ? String(body.html)
          : body.corpo !== undefined && body.corpo !== null
            ? String(body.corpo)
            : body.message !== undefined && body.message !== null
              ? String(body.message)
              : ''

    let toList = []
    if (Array.isArray(rawTo)) {
      toList = rawTo
        .map(function (item) {
          return String(item).trim()
        })
        .filter(function (item) {
          return item.length > 0
        })
    } else if (typeof rawTo === 'string') {
      toList = rawTo
        .split(/[,;]/)
        .map(function (item) {
          return item.trim()
        })
        .filter(function (item) {
          return item.length > 0
        })
    }

    if (toList.length === 0) {
      return e.json(200, {
        ok: false,
        sucesso: false,
        error: 'Destinatário (email) é obrigatório.',
      })
    }

    if (!subject) {
      return e.json(200, {
        ok: false,
        sucesso: false,
        error: 'Assunto é obrigatório.',
      })
    }

    if (!contentBody.trim()) {
      return e.json(200, {
        ok: false,
        sucesso: false,
        error: 'Corpo da mensagem (texto ou HTML) é obrigatório.',
      })
    }

    // Normalizar anexos
    const attachmentsList = []
    const rawAttachments =
      body.attachments ||
      body.anexos ||
      (body.attachment ? [body.attachment] : body.anexo ? [body.anexo] : [])
    if (Array.isArray(rawAttachments)) {
      for (let i = 0; i < rawAttachments.length; i++) {
        const att = rawAttachments[i]
        if (!att) continue
        const filename = (att.filename || att.name || att.nome || 'anexo').trim()
        const content = att.content || att.contentBase64 || att.base64 || ''
        if (content) {
          attachmentsList.push({
            filename: filename,
            content: content,
          })
        }
      }
    }

    const primaryRecipient = toList[0]
    const composioApiKey = ($os.getenv('COMPOSIO_API_KEY') || '').trim()

    // 1. Envio via API do Composio (se chave configurada)
    if (composioApiKey) {
      console.log(
        '[GMAIL COMPOSIO DISPARO]',
        JSON.stringify({
          to: primaryRecipient,
          subject: subject,
          attachmentsCount: attachmentsList.length,
          sender: 'delfos.usinas@gmail.com',
        }),
      )

      // Descobrir se há connected_account_id específico para o gmail
      let connectedAccountId = ($os.getenv('GMAIL_CONNECTED_ACCOUNT_ID') || '').trim()
      let composioUserId = ($os.getenv('COMPOSIO_USER_ID') || 'delfos.usinas@gmail.com').trim()

      if (!connectedAccountId) {
        try {
          const accsRes = $http.send({
            url: 'https://backend.composio.dev/api/v3/connected_accounts?toolkit_slugs=gmail&limit=10',
            method: 'GET',
            headers: {
              'x-api-key': composioApiKey,
            },
            timeout: 10,
          })
          if (accsRes.statusCode >= 200 && accsRes.statusCode < 300) {
            const accsData = accsRes.json || JSON.parse(accsRes.raw || '{}')
            const items = accsData.items || accsData.data || accsData || []
            if (Array.isArray(items)) {
              for (let a = 0; a < items.length; a++) {
                const it = items[a]
                if (
                  it &&
                  (it.status === 'ACTIVE' || it.status === 'CONNECTED' || !it.is_disabled)
                ) {
                  connectedAccountId = it.id || ''
                  if (it.user_id) composioUserId = it.user_id
                  break
                }
              }
              if (!connectedAccountId && items.length > 0 && items[0].id) {
                connectedAccountId = items[0].id
                if (items[0].user_id) composioUserId = items[0].user_id
              }
            }
          }
        } catch (eAcc) {
          console.warn('[GMAIL COMPOSIO ACC LOOKUP]', String(eAcc))
        }
      }

      // Preparar argumentos da ferramenta GMAIL_SEND_EMAIL do Composio
      const composioArgs = {
        recipient_email: primaryRecipient,
        subject: subject,
        body: contentBody,
      }

      if (toList.length > 1) {
        composioArgs.cc = toList.slice(1).join(', ')
      }

      // Adicionar anexo se houver
      if (attachmentsList.length > 0) {
        composioArgs.attachments = attachmentsList.map(function (att) {
          return {
            name: att.filename,
            content: att.content,
          }
        })
      }

      const composioPayload = {
        arguments: composioArgs,
        user_id: composioUserId,
      }
      if (connectedAccountId) {
        composioPayload.connected_account_id = connectedAccountId
      }

      try {
        const compRes = $http.send({
          url: 'https://backend.composio.dev/api/v3/tools/execute/GMAIL_SEND_EMAIL',
          method: 'POST',
          headers: {
            'x-api-key': composioApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(composioPayload),
          timeout: 40,
        })

        let compData = null
        try {
          if (compRes.json) compData = compRes.json
          else if (compRes.raw) compData = JSON.parse(compRes.raw)
        } catch (_) {}

        if (compRes.statusCode >= 200 && compRes.statusCode < 300) {
          const isSuccess =
            compData &&
            (compData.successful === true || compData.success === true || !compData.error)
          if (isSuccess) {
            const externalId =
              (compData.data &&
                (compData.data.id || compData.data.message_id || compData.data.run_id)) ||
              compData.log_id ||
              'composio-gmail-ok'
            console.log(
              '[GMAIL COMPOSIO SUCESSO]',
              JSON.stringify({ id: externalId, to: primaryRecipient }),
            )
            return e.json(200, {
              ok: true,
              sucesso: true,
              id: externalId,
              message_id: externalId,
              message: 'E-mail enviado via Gmail (delfos.usinas@gmail.com) com sucesso.',
              provedor: 'composio_gmail',
            })
          }
        }

        const errMsg =
          (compData &&
            (compData.error || compData.message || (compData.data && compData.data.error))) ||
          compRes.raw ||
          'HTTP ' + compRes.statusCode
        console.error('[GMAIL COMPOSIO ERRO RESPOSTA]', errMsg)
        return e.json(200, {
          ok: false,
          sucesso: false,
          error: 'Falha no envio via Gmail (Composio): ' + errMsg,
          statusCode: compRes.statusCode,
          provedor: 'composio_gmail',
        })
      } catch (errCompHttp) {
        console.error('[GMAIL COMPOSIO FALHA REDE]', String(errCompHttp))
        return e.json(200, {
          ok: false,
          sucesso: false,
          error: 'Erro de comunicação ao enviar email via Composio/Gmail: ' + String(errCompHttp),
          provedor: 'composio_gmail',
        })
      }
    }

    // 2. Se COMPOSIO_API_KEY não estiver configurada no ambiente
    // Tenta fallback com Resend ou retorna instrução clara
    const resendApiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
    if (resendApiKey) {
      console.log(
        '[GMAIL HOOK] COMPOSIO_API_KEY ausente. Tentando envio via Resend como fallback...',
      )
      try {
        const resendPayload = {
          from: 'Delfos Solar <delfos.usinas@gmail.com>',
          to: toList,
          subject: subject,
          html: contentBody,
          reply_to: 'delfos.usinas@gmail.com',
        }
        if (attachmentsList.length > 0) {
          resendPayload.attachments = attachmentsList
        }

        const resResend = $http.send({
          url: 'https://api.resend.com/emails',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + resendApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resendPayload),
          timeout: 25,
        })

        let resendData = null
        try {
          if (resResend.json) resendData = resResend.json
          else if (resResend.raw) resendData = JSON.parse(resResend.raw)
        } catch (_) {}

        if (resResend.statusCode >= 200 && resResend.statusCode < 300) {
          const resId = (resendData && resendData.id) || 'resend-ok'
          return e.json(200, {
            ok: true,
            sucesso: true,
            id: resId,
            message_id: resId,
            message: 'E-mail enviado com sucesso (fallback Resend).',
            provedor: 'resend_fallback',
          })
        }

        const resErrMsg =
          (resendData && (resendData.message || resendData.error)) || 'HTTP ' + resResend.statusCode

        return e.json(200, {
          ok: false,
          sucesso: false,
          error:
            'COMPOSIO_API_KEY não está configurada no backend para a integração Gmail (delfos.usinas@gmail.com). Tentativa pelo Resend também falhou: ' +
            resErrMsg,
          provedor: 'none',
        })
      } catch (eResend) {
        return e.json(200, {
          ok: false,
          sucesso: false,
          error:
            'COMPOSIO_API_KEY não configurada no backend e o fallback Resend falhou: ' +
            String(eResend),
          provedor: 'none',
        })
      }
    }

    return e.json(200, {
      ok: false,
      sucesso: false,
      error:
        'COMPOSIO_API_KEY não está configurada nas variáveis de ambiente do backend. Configure a chave COMPOSIO_API_KEY com a conta delfos.usinas@gmail.com conectada.',
      provedor: 'none',
    })
  } catch (err) {
    const errorMsg = err && err.message ? err.message : String(err)
    console.error('[ENDPOINT /backend/v1/gmail/send ERRO]', errorMsg)
    return e.json(200, {
      ok: false,
      sucesso: false,
      error: errorMsg,
    })
  }
})
