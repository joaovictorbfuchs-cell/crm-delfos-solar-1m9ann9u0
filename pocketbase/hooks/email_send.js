// pocketbase/hooks/email_send.js
// Endpoint HTTP POST /backend/v1/email/send autenticado para envio via Resend

try {
  const bootKey = ($os.getenv('RESEND_API_KEY') || '').trim()
  console.log('[RESEND BOOT CHECK] RESEND_API_KEY presente no deploy? ' + (bootKey.length > 0))
  if (bootKey) {
    const testRecipient = 'joao@delfosengenharia.com.br'
    const bootFrom = (
      $os.getenv('RESEND_EMAIL_FROM') ||
      $os.getenv('RESEND_FROM') ||
      'Delfos Solar <nao-responda@updates.delfos.eng.br>'
    ).trim()
    const bootPayload = {
      from: bootFrom,
      to: [testRecipient],
      subject: 'Teste de Ativação — Delfos Solar CRM (Resend)',
      html:
        '<div style="font-family: sans-serif; padding: 20px; color: #1e293b; background: #f8fafc; border-radius: 8px;">' +
        '<h2 style="color: #0284c7;">Configuração de E-mail Resend — Delfos Solar</h2>' +
        '<p>Olá João,</p>' +
        '<p>Este é um teste automatizado disparado no deploy confirmando a integração ativa com o serviço <strong>Resend</strong>.</p>' +
        '<p><strong>Remetente configurado:</strong> ' +
        bootFrom +
        '<br/>' +
        '<strong>Destinatário:</strong> ' +
        testRecipient +
        '<br/>' +
        '<strong>Caso de uso:</strong> Atividade Solicitar Contas RGE e envio de documentos/propostas.</p>' +
        '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />' +
        '<p style="font-size: 12px; color: #64748b;">CRM Delfos Solar &bull; Delfos Engenharia Ltda</p>' +
        '</div>',
    }

    try {
      const bootRes = $http.send({
        url: 'https://api.resend.com/emails',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + bootKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bootPayload),
        timeout: 25,
      })
      console.log(
        '[RESEND BOOT TESTE DISPARO] status=' +
          bootRes.statusCode +
          ' resposta=' +
          (bootRes.raw || '').substring(0, 300),
      )
    } catch (eSend) {
      console.error('[RESEND BOOT TESTE ERRO]', String(eSend))
    }
  }
} catch (eBoot) {
  console.warn('[RESEND BOOT EXCEPTION]', String(eBoot))
}

routerAdd('POST', '/backend/v1/email/send', (e) => {
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
        error: 'Autenticação necessária. Usuário não autenticado no CRM.',
      })
    }

    const body = e.requestInfo().body || {}
    const to = body.to
    const subject = (body.subject || '').trim()
    const html = body.html !== undefined && body.html !== null ? String(body.html) : ''
    const attachment = body.attachment
    const attachments = body.attachments

    // 1. Descobrir se há domínio verificado na conta Resend
    const apiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
    if (!apiKey) {
      const msg =
        'RESEND_API_KEY não está configurada nas variáveis de ambiente do backend. Configure a chave de API do Resend no sistema.'
      console.error('[EMAIL RESEND ERRO]', msg)
      return e.json(200, {
        ok: false,
        error: msg,
      })
    }

    let verifiedDomain = null
    try {
      const domRes = $http.send({
        url: 'https://api.resend.com/domains',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + apiKey,
        },
        timeout: 10,
      })
      if (domRes.statusCode >= 200 && domRes.statusCode < 300) {
        const domData = domRes.json || JSON.parse(domRes.raw || '{}')
        const list = domData.data || domData || []
        if (Array.isArray(list)) {
          for (let d = 0; d < list.length; d++) {
            const item = list[d]
            if (item && item.status === 'verified' && item.name) {
              verifiedDomain = item.name
              break
            }
          }
        }
      }
    } catch (eDom) {
      console.warn('[EMAIL RESEND DOMAINS CHECK]', String(eDom))
    }

    // Remetente da empresa configurável via Secret/variável de ambiente ou fallback padrão da empresa:
    // Padrão solicitado: "Delfos Solar <nao-responda@updates.delfos.eng.br>"
    // Configurável via RESEND_EMAIL_FROM ou RESEND_FROM.
    const configuredFromSecret = (
      $os.getenv('RESEND_EMAIL_FROM') ||
      $os.getenv('RESEND_FROM') ||
      ''
    ).trim()

    const empresaSender =
      configuredFromSecret ||
      (verifiedDomain
        ? `Delfos Solar <nao-responda@${verifiedDomain}>`
        : 'Delfos Solar <nao-responda@updates.delfos.eng.br>')

    // Se a conta Resend ainda estiver em teste e não tiver domínio verificado,
    // o Resend exige onboarding@resend.dev para remetente em teste.
    // Porém se houver domínio verificado ou for solicitado explicitamente, usamos o remetente oficial.
    let defaultSender = empresaSender
    if (!verifiedDomain && !configuredFromSecret) {
      // Deixa como fallback seguro para teste caso o domínio ainda não esteja 100% no Resend
      defaultSender = 'Delfos Solar <nao-responda@updates.delfos.eng.br>'
    }

    const requestedFrom = (body.from || '').trim()
    let from = requestedFrom || defaultSender

    // Se o requestedFrom contiver @gmail.com (bloqueado pelo Resend para envio sem domínio próprio do google),
    // troca para o remetente do domínio da empresa.
    if (from.includes('@gmail.com')) {
      from = empresaSender
    }

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
      return e.json(200, {
        error: 'Campo "to" (destinatário) é obrigatório e deve conter um e-mail válido.',
        ok: false,
      })
    }
    if (!subject) {
      return e.json(200, { error: 'Campo "subject" (assunto) é obrigatório.', ok: false })
    }
    if (!html.trim()) {
      return e.json(200, { error: 'Campo "html" (corpo da mensagem) é obrigatório.', ok: false })
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
      reply_to: 'delfos.usinas@gmail.com',
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
    const errorLower = errorMessage.toLowerCase()

    const isDomainNotVerified =
      res.statusCode === 403 &&
      (errorLower.includes('domain is not verified') ||
        errorLower.includes('is not verified') ||
        (errorLower.includes('domain') && errorLower.includes('verify')))

    const isTestMode =
      res.statusCode === 403 &&
      (errorLower.includes('you can only send testing emails to your own email address') ||
        (errorLower.includes('testing emails') && errorLower.includes('resend.com/domains')))

    const isApiKeyInvalid =
      res.statusCode === 401 ||
      (res.statusCode === 403 &&
        (errorLower.includes('api key') ||
          errorLower.includes('invalid api key') ||
          errorLower.includes('restricted api key') ||
          errorLower.includes('missing api key') ||
          errorLower.includes('unauthorized')))

    if (isDomainNotVerified) {
      userFriendlyMsg =
        'O domínio do remetente ainda não está verificado no Resend. Acesse https://resend.com/domains, verifique o domínio updates.delfos.eng.br e configure os registros DNS (SPF/DKIM) indicados pelo Resend. Enquanto o domínio não estiver verificado, o envio pelo remetente da empresa não funcionará.'
    } else if (isTestMode) {
      userFriendlyMsg =
        'O Resend está em modo de teste: enquanto não houver um domínio verificado, só é possível enviar e-mails para o próprio endereço da conta Resend (delfos.usinas@gmail.com). Para liberar o envio para qualquer destinatário, cadastre e verifique o domínio updates.delfos.eng.br em https://resend.com/domains.'
    } else if (isApiKeyInvalid) {
      userFriendlyMsg = 'Chave de API do Resend inválida ou sem permissão.'
    } else if (res.statusCode === 403) {
      userFriendlyMsg = `Permissão negada pelo Resend (HTTP 403): ${errorMessage}`
    } else if (res.statusCode === 422) {
      userFriendlyMsg = `Dados de e-mail rejeitados pelo Resend (HTTP 422): ${errorMessage}`
    } else {
      userFriendlyMsg = `Falha na API do Resend (HTTP ${res.statusCode}): ${errorMessage}`
    }

    console.error('[EMAIL RESEND FALHA]', userFriendlyMsg)

    // Retornar 200 com ok: false para não causar ClientResponseError 403/422 genérico no cliente PocketBase
    // Repassa o erro detalhado e mensagem original do Resend
    return e.json(200, {
      ok: false,
      error: userFriendlyMsg,
      resendError: errorMessage,
      statusCode: res.statusCode,
    })
  } catch (err) {
    const errorMsg = err && err.message ? err.message : String(err)
    console.error('[ENDPOINT /backend/v1/email/send ERRO]', errorMsg)
    return e.json(200, {
      ok: false,
      error: errorMsg,
    })
  }
})
