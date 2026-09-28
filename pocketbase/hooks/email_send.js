// pocketbase/hooks/email_send.js
// Endpoint HTTP POST /backend/v1/email/send autenticado para envio via Resend

routerAdd('POST', '/backend/v1/email/send', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const defaultSender = 'Delfos Solar <delfos.usinas@gmail.com>'

    const body = e.requestInfo().body || {}
    const to = body.to
    const subject = (body.subject || '').trim()
    const html = body.html !== undefined && body.html !== null ? String(body.html) : ''
    const attachment = body.attachment
    const attachments = body.attachments
    const from = (body.from || '').trim() || defaultSender

    let toList = []
    if (Array.isArray(to)) {
      toList = to
        .map(function (item) {
          return String(item).trim()
        })
        .filter(function (item) {
          return item.length > 0
        })
    } else if (typeof to === 'string') {
      toList = to
        .split(/[,;]/)
        .map(function (item) {
          return item.trim()
        })
        .filter(function (item) {
          return item.length > 0
        })
    }

    if (toList.length === 0) {
      return e.json(400, {
        error: 'Campo "to" (destinatário) é obrigatório e deve conter um e-mail válido.',
        ok: false,
      })
    }
    if (!subject) {
      return e.json(400, { error: 'Campo "subject" (assunto) é obrigatório.', ok: false })
    }
    if (!html.trim()) {
      return e.json(400, { error: 'Campo "html" (corpo da mensagem) é obrigatório.', ok: false })
    }

    const apiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
    if (!apiKey) {
      const msg =
        'RESEND_API_KEY não está configurada nas variáveis de ambiente do backend. Configure a chave de API do Resend no sistema.'
      console.error('[EMAIL RESEND ERRO]', msg)
      return e.json(500, {
        ok: false,
        error: msg,
      })
    }

    const attachmentsList = []
    const rawAttachments = attachments || (attachment ? [attachment] : [])
    if (Array.isArray(rawAttachments)) {
      for (let i = 0; i < rawAttachments.length; i++) {
        const att = rawAttachments[i]
        if (!att) continue
        const filename = (att.filename || att.name || 'anexo').trim()
        const content = att.content || att.contentBase64 || att.base64 || ''
        if (content) {
          attachmentsList.push({
            filename: filename,
            content: content,
          })
        }
      }
    }

    const payload = {
      from: from,
      to: toList,
      subject: subject,
      html: html,
    }

    if (attachmentsList.length > 0) {
      payload.attachments = attachmentsList
    }

    console.log(
      '[EMAIL RESEND DISPARO]',
      JSON.stringify({
        from: from,
        to: toList,
        subject: subject,
        attachmentsCount: attachmentsList.length,
      }),
    )

    const res = $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 30,
    })

    let parsed = null
    try {
      if (res.json) {
        parsed = res.json
      } else if (res.raw) {
        parsed = JSON.parse(res.raw)
      }
    } catch (_) {}

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const emailId = (parsed && parsed.id) || (parsed && parsed.data && parsed.data.id) || ''
      console.log(
        '[EMAIL RESEND SUCESSO]',
        JSON.stringify({
          id: emailId,
          to: toList,
          statusCode: res.statusCode,
        }),
      )
      return e.json(200, {
        ok: true,
        id: emailId,
        message: 'E-mail enviado com sucesso',
      })
    }

    let errorMessage = ''
    if (parsed) {
      errorMessage =
        parsed.message || parsed.error || (parsed.name ? parsed.name + ': ' + parsed.message : '')
    }
    if (!errorMessage && res.raw) {
      errorMessage = res.raw.substring(0, 300)
    }
    if (!errorMessage) {
      errorMessage = 'HTTP ' + res.statusCode
    }

    let userFriendlyMsg = errorMessage
    if (res.statusCode === 403 || res.statusCode === 401) {
      userFriendlyMsg = `Chave de API do Resend inválida ou sem permissão (HTTP ${res.statusCode}): ${errorMessage}`
    } else if (res.statusCode === 422) {
      userFriendlyMsg = `Dados de e-mail rejeitados pelo Resend (HTTP 422): ${errorMessage}`
    } else {
      userFriendlyMsg = `Falha na API do Resend (HTTP ${res.statusCode}): ${errorMessage}`
    }

    console.error('[EMAIL RESEND FALHA]', userFriendlyMsg)

    return e.json(res.statusCode >= 400 && res.statusCode < 500 ? res.statusCode : 500, {
      ok: false,
      error: userFriendlyMsg,
    })
  } catch (err) {
    const errorMsg = err && err.message ? err.message : String(err)
    console.error('[ENDPOINT /backend/v1/email/send ERRO]', errorMsg)
    return e.json(500, {
      ok: false,
      error: errorMsg,
    })
  }
})
