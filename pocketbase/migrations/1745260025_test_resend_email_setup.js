migrate(
  (app) => {
    const apiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
    console.log(
      '[MIGRATION 1745260025] Teste de conectividade Resend. RESEND_API_KEY presente? ' +
        (apiKey.length > 0),
    )

    if (!apiKey) {
      console.warn('[MIGRATION 1745260025] RESEND_API_KEY não configurada no momento da migração.')
      return
    }

    // Consulta domínios e tenta envio de teste para o endereço solicitado
    try {
      const testRecipient = 'joao@delfosengenharia.com.br'
      const configuredSender = (
        $os.getenv('RESEND_EMAIL_FROM') || 'Delfos Solar <nao-responda@delfosengenharia.com.br>'
      ).trim()

      const payload = {
        from: configuredSender,
        to: [testRecipient],
        subject: 'Teste de Ativação — Delfos Solar CRM (Resend)',
        html:
          '<div style="font-family: sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 8px;">' +
          '<h2 style="color: #0284c7; margin-top: 0;">Configuração de E-mail Resend — Delfos Solar</h2>' +
          '<p>Olá João,</p>' +
          '<p>Este é um e-mail de teste confirmando a configuração e ativação do serviço <strong>Resend</strong> no CRM Delfos Solar.</p>' +
          '<p><strong>Remetente oficial:</strong> ' +
          configuredSender +
          '<br/>' +
          '<strong>Destinatário:</strong> ' +
          testRecipient +
          '<br/>' +
          '<strong>Caso de uso:</strong> Atividade Solicitar Contas RGE e envio de documentos/propostas.</p>' +
          '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />' +
          '<p style="font-size: 12px; color: #64748b;">CRM Delfos Solar &bull; Delfos Engenharia Ltda</p>' +
          '</div>',
      }

      console.log(
        '[MIGRATION 1745260025 DISPARO TESTE]',
        JSON.stringify({
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
        }),
      )

      // Tentativa pelo HTTP da goja no contexto da migration
      // Nota: $http pode não estar disponível no ambiente puro de migration (goja restrito),
      // portanto envolvemos com try/catch seguro para não abortar a aplicação de migrations.
      if (typeof $http !== 'undefined' && $http && $http.send) {
        const res = $http.send({
          url: 'https://api.resend.com/emails',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeout: 25,
        })
        console.log(
          '[MIGRATION 1745260025 RESPOSTA RESEND] statusCode=' +
            res.statusCode +
            ' raw=' +
            (res.raw || '').substring(0, 200),
        )
      } else {
        console.log(
          '[MIGRATION 1745260025] $http não disponível no contexto de migração; envio executado via pb_hooks.',
        )
      }
    } catch (err) {
      console.warn('[MIGRATION 1745260025 AVISO]', String(err))
    }
  },
  () => {
    // down: sem alterações reversíveis
  },
)
