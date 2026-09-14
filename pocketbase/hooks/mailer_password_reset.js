onMailerRecordPasswordResetSend((e) => {
  // Configurar assunto e corpo do email de redefinição de senha para Delfos Solar
  const siteUrl = $os.getenv('SITE_URL') || ''
  const token = e.meta && e.meta.token ? e.meta.token : ''

  // URL da tela de redefinição no app
  const resetUrl = siteUrl
    ? siteUrl.replace(/\/$/, '') + '/redefinir-senha?token=' + encodeURIComponent(token)
    : ''

  e.message.subject = 'Redefinição de Senha - Delfos Solar CRM'

  const userName = e.record.getString('name') || 'Colaborador'
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #166534; margin: 0; font-size: 24px;">Delfos Engenharia & Energia Solar</h2>
        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">CRM & Gestão Operacional</p>
      </div>
      <p style="font-size: 16px; color: #1f2937;">Olá, <strong>${userName}</strong>,</p>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">
        Recebemos uma solicitação para redefinir sua senha de acesso ao CRM Delfos Solar.
      </p>
      ${
        resetUrl
          ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background-color: #16A34A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
          Redefinir Minha Senha
        </a>
      </div>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">
        Se o botão não funcionar, copie e cole o link a seguir no seu navegador:<br/>
        <a href="${resetUrl}" style="color: #16A34A;">${resetUrl}</a>
      </p>
      `
          : ''
      }
      <p style="font-size: 13px; color: #6b7280; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
        Se você não fez essa solicitação, por favor ignore este e-mail. Sua senha permanecerá inalterada.
      </p>
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
        Delfos Engenharia — Erechim / RS
      </p>
    </div>
  `

  e.message.html = htmlBody
  e.next()
})
