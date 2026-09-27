// pocketbase/hooks/email_send_helper.js
// Módulo reutilizável para envio de emails via API do Resend
// Pode ser carregado em qualquer hook/callback via:
// const { sendEmailWithResend } = require(`${__hooks}/email_send_helper.js`)

const DEFAULT_SENDER = 'Delfos Solar <delfos.usinas@gmail.com>'

function sendEmailWithResend(options) {
  options = options || {}

  const apiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
  if (!apiKey) {
    const msg = 'RESEND_API_KEY não está configurada nas variáveis de ambiente/secrets do backend.'
    console.error('[EMAIL RESEND ERRO]', msg)
    throw new Error(msg)
  }

  let toList = []
  if (Array.isArray(options.to)) {
    toList = options.to
      .map(function (item) {
        return String(item).trim()
      })
      .filter(function (item) {
        return item.length > 0
      })
  } else if (typeof options.to === 'string') {
    toList = options.to
      .split(/[,;]/)
      .map(function (item) {
        return item.trim()
      })
      .filter(function (item) {
        return item.length > 0
      })
  }

  if (toList.length === 0) {
    const msg = 'Destinatário (to) inválido ou não fornecido.'
    console.error('[EMAIL RESEND ERRO]', msg)
    throw new Error(msg)
  }

  const subject = (options.subject || '').trim()
  if (!subject) {
    const msg = 'Assunto (subject) do e-mail é obrigatório.'
    console.error('[EMAIL RESEND ERRO]', msg)
    throw new Error(msg)
  }

  const html = options.html !== undefined && options.html !== null ? String(options.html) : ''
  if (!html.trim()) {
    const msg = 'Corpo HTML (html) do e-mail é obrigatório.'
    console.error('[EMAIL RESEND ERRO]', msg)
    throw new Error(msg)
  }

  const fromSender = (options.from || '').trim() || DEFAULT_SENDER

  const attachmentsList = []
  const rawAttachments = options.attachments || (options.attachment ? [options.attachment] : [])
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
    from: fromSender,
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
      from: fromSender,
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
    return {
      id: emailId,
      ok: true,
      statusCode: res.statusCode,
    }
  }

  const errorMessage =
    (parsed &&
      (parsed.message || parsed.error || (parsed.name && parsed.name + ': ' + parsed.message))) ||
    (res.raw ? res.raw.substring(0, 300) : 'HTTP ' + res.statusCode)

  const fullErrorMsg = 'Falha na API do Resend (' + res.statusCode + '): ' + errorMessage
  console.error('[EMAIL RESEND FALHA]', fullErrorMsg)
  throw new Error(fullErrorMsg)
}

module.exports = {
  sendEmailWithResend: sendEmailWithResend,
  DEFAULT_SENDER: DEFAULT_SENDER,
}
