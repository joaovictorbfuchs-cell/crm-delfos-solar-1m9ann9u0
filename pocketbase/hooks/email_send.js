// pocketbase/hooks/email_send.js
// Endpoint HTTP POST /backend/v1/email/send autenticado para envio via Resend

routerAdd('POST', '/backend/v1/email/send', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const helper = require(`${__hooks}/email_send_helper.js`)

    const body = e.requestInfo().body || {}
    const to = body.to
    const subject = body.subject
    const html = body.html
    const attachment = body.attachment
    const attachments = body.attachments
    const from = body.from

    if (!to) {
      return e.json(400, { error: 'Campo "to" (destinatário) é obrigatório', ok: false })
    }
    if (!subject) {
      return e.json(400, { error: 'Campo "subject" (assunto) é obrigatório', ok: false })
    }
    if (!html) {
      return e.json(400, { error: 'Campo "html" (corpo) é obrigatório', ok: false })
    }

    const result = helper.sendEmailWithResend({
      to: to,
      subject: subject,
      html: html,
      attachment: attachment,
      attachments: attachments,
      from: from,
    })

    return e.json(200, {
      ok: true,
      id: result.id,
      message: 'E-mail enviado com sucesso',
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
